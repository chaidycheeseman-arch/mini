// Auto-split from js/home/home-and-novel.js (4222-4525)

    // ====== 数据管理功能逻辑 ======
    // 图像压缩辅助函数 (使用 Canvas 降低图片分辨率和质量)
    function compressImageBase64(base64Str, maxWidth = 800, quality = 0.6) {
        return new Promise((resolve) => {
            if (!base64Str || !base64Str.startsWith('data:image')) {
                resolve(base64Str);
                return;
            }
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // 判断原图格式，如果是 png 或 gif，则输出 png 以保留透明背景
                const isTransparent = base64Str.startsWith('data:image/png') || base64Str.startsWith('data:image/gif');
                const outType = isTransparent ? 'image/png' : 'image/jpeg';
                // 注意：png 格式忽略 quality 参数，但能保证不黑底
                resolve(canvas.toDataURL(outType, isTransparent ? undefined : quality));
            };
            img.onerror = () => resolve(base64Str);
            img.src = base64Str;

        });
    }
    // 压缩数据库中的所有图片数据
    async function compressData() {
        const btn = document.getElementById('btn-compress-data');
        if (!confirm('此操作将对数据库中的所有图片（头像、背景、聊天图片等）进行画质压缩，以大幅减小文件体积防止导出卡死。压缩后画质会有所降低，确定要继续吗？')) return;
        const originalText = btn.innerText;
        btn.innerText = "正在压缩，请勿进行其他操作...";
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.7";
        await new Promise(r => setTimeout(r, 100)); // 让UI更新
        try {
            // 1. 压缩 imgDb
            const images = await imgDb.images.toArray();
            for (let img of images) {
                if (img.src && img.src.startsWith('data:image')) {
                    img.src = await compressImageBase64(img.src);
                    await imgDb.images.put(img);
                }
            }
            // 2. 压缩 联系人头像
            const contacts = await contactDb.contacts.toArray();
            for (let c of contacts) {
                let updated = false;
                if (c.roleAvatar && c.roleAvatar.startsWith('data:image')) {
                    c.roleAvatar = await compressImageBase64(c.roleAvatar);
                    updated = true;
                }
                if (c.userAvatar && c.userAvatar.startsWith('data:image')) {
                    c.userAvatar = await compressImageBase64(c.userAvatar);
                    updated = true;
                }
                if (updated) await contactDb.contacts.put(c);
            }
            // 3. 压缩 面具预设头像
            const masks = await maskDb.presets.toArray();
            for (let m of masks) {
                if (m.avatar && m.avatar.startsWith('data:image')) {
                    m.avatar = await compressImageBase64(m.avatar);
                    await maskDb.presets.put(m);
                }
            }
            // 4. 压缩 聊天记录中的图片
            const msgs = await chatListDb.messages.toArray();
            for (let msg of msgs) {
                try {
                    const parsed = JSON.parse(msg.content);
                    if (parsed && parsed.type === 'image' && parsed.content && parsed.content.startsWith('data:image')) {
                        parsed.content = await compressImageBase64(parsed.content);
                        msg.content = JSON.stringify(parsed);
                        await chatListDb.messages.put(msg);
                    }
                } catch(e) {}
            }
            alert('图片数据压缩完成！现在可以尝试进行导出。');
        } catch (e) {
            console.error("压缩失败:", e);
            alert('压缩过程中出现错误: ' + e.message);
        } finally {
            btn.innerText = originalText;
            btn.style.pointerEvents = "auto";
            btn.style.opacity = "1";
        }
    }
    function getExportFileName() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `mini-${y}-${m}-${d}_${h}-${min}.json`;
    }
        // 终极极简、绝对兼容的导出逻辑
    async function streamExportData(selectedKeys, btnElement) {
        try {
            const parts = [];
            let buffer = '{\n';
            let isFirstDB = true;
            function flushBuffer() {
                if (buffer.length > 0) {
                    parts.push(buffer);
                    buffer = '';
                }
            }
            function appendText(text) {
                buffer += text;
                if (buffer.length > 1024 * 1024) {
                    flushBuffer();
                }
            }
            function addDBKey(key) {
                if (!isFirstDB) appendText(',\n');
                appendText(`  "${key}": `);
                isFirstDB = false;
            }
            // 1. 导出 localforage
            if (selectedKeys.includes('settings') || selectedKeys.includes('theme') || selectedKeys.includes('contacts')) {
                addDBKey('localforage');
                appendText('{\n');
                const lfKeys = await localforage.keys();
                let isFirstLF = true;
                for (let key of lfKeys) {
                    let shouldExport = false;
                    if (selectedKeys.includes('settings') && key.startsWith('miffy_api_')) shouldExport = true;
                    if (selectedKeys.includes('theme') && (key.startsWith('miffy_text_') || key === 'miffy_global_font')) shouldExport = true;
                    if (selectedKeys.includes('contacts') && key === 'miffy_contact_groups') shouldExport = true;
                    if (shouldExport) {
                        if (!isFirstLF) appendText(',\n');
                        const val = await localforage.getItem(key);
                        appendText(`    "${key}": ${JSON.stringify(val)}`);
                        isFirstLF = false;
                    }
                }
                appendText('\n  }');
            }
            // 2. 导出 Dexie 数据库 (摒弃分页死锁，直接全量拉取后分片转字符串)
            async function exportDexieStore(dbKey, dbInstance, storeNames) {
                addDBKey(dbKey);
                appendText('{\n');
                for (let s = 0; s < storeNames.length; s++) {
                    const storeName = storeNames[s];
                    appendText(`    "${storeName}": [\n`);
                    // 直接获取该表所有数据，避免游标分页引发的浏览器死锁
                    const allItems = await dbInstance[storeName].toArray();
                    for (let i = 0; i < allItems.length; i++) {
                        if (i > 0) appendText(',\n');
                        appendText('      ' + JSON.stringify(allItems[i]));
                    }
                    appendText('\n    ]');
                    if (s < storeNames.length - 1) appendText(',\n');
                }
                appendText('\n  }');
            }
            if (selectedKeys.includes('worldbook')) await exportDexieStore('db', db, ['entries']);
            if (selectedKeys.includes('contacts')) await exportDexieStore('contactDb', contactDb, ['contacts']);
            if (selectedKeys.includes('contacts')) await exportDexieStore('chatListDb', chatListDb, ['chats', 'messages']);
            if (selectedKeys.includes('masks')) await exportDexieStore('maskDb', maskDb, ['presets']);
            if (selectedKeys.includes('emoticons')) await exportDexieStore('emoDb', emoDb, ['groups', 'emoticons']);
            if (selectedKeys.includes('images')) await exportDexieStore('imgDb', imgDb, ['images']);
            if (selectedKeys.includes('wallet')) await exportDexieStore('walletDb', walletDb, ['kv', 'bankCards', 'bills']);
            appendText('\n}');
            flushBuffer();
            // 核心修复：使用 Blob 而不是 File，兼容所有手机浏览器！
            // 只要 a 标签的 download 属性带有 .json，导出的就完美是 JSON 文件！
            const blob = new Blob(parts, { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getExportFileName(); 
            document.body.appendChild(a);
            a.click();
            // 延迟清理，给手机端预留充足的文件写入和弹窗唤起时间
            setTimeout(() => {
                if (document.body.contains(a)) document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 10000); // 改为 10000 毫秒

        } catch (err) {
            console.error("导出过程中发生错误:", err);
            alert("导出失败: " + err.message);
        }
    }
    async function exportAllData() {
        const btns = document.querySelectorAll('.btn-restore');
        let targetBtn = null;
        btns.forEach(b => { if (b.innerText === '导出数据') targetBtn = b; });
        if (targetBtn) {
            targetBtn.innerText = "正在流式打包，请耐心等待...";
            targetBtn.style.pointerEvents = "none";
            targetBtn.style.opacity = "0.7";
        }
        await new Promise(r => setTimeout(r, 50));
        // 全量导出所有的 key
        const allKeys = ['settings', 'theme', 'contacts', 'worldbook', 'masks', 'emoticons', 'images', 'wallet'];
        await streamExportData(allKeys, targetBtn);
        if (targetBtn) {
            targetBtn.innerText = "导出数据";
            targetBtn.style.pointerEvents = "auto";
            targetBtn.style.opacity = "1";
        }
    }
    function openBatchExportModal() {
        document.getElementById('batch-export-modal').style.display = 'flex';
    }
    function closeBatchExportModal() {
        document.getElementById('batch-export-modal').style.display = 'none';
    }
    async function executeBatchExport() {
        const checkboxes = document.querySelectorAll('#export-checkbox-list input[type="checkbox"]:checked:not(:disabled)');
        const selected = Array.from(checkboxes).map(cb => cb.value);
        if (selected.length === 0) return alert('请至少选择一项');
        const confirmBtn = document.querySelector('#batch-export-modal .btn-restore');
        const originalText = confirmBtn ? confirmBtn.innerText : '确认导出';
        if (confirmBtn) {
            confirmBtn.innerText = "正在流式打包，请耐心等待...";
            confirmBtn.style.pointerEvents = "none";
            confirmBtn.style.opacity = "0.7";
        }
        await new Promise(r => setTimeout(r, 50));
        await streamExportData(selected, confirmBtn);
        closeBatchExportModal();
        if (confirmBtn) {
            confirmBtn.innerText = originalText;
            confirmBtn.style.pointerEvents = "auto";
            confirmBtn.style.opacity = "1";
        }
    }
    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm('导入数据将覆盖当前对应的本地数据，确定要继续吗？')) {
                    // 恢复 localforage
                    if (data.localforage) {
                        for (let key in data.localforage) {
                            await localforage.setItem(key, data.localforage[key]);
                        }
                    }
                    // 恢复 Dexie
                    async function restoreDexie(dbInstance, dataObj) {
                        if (!dataObj) return;
                        for (let storeName in dataObj) {
                            await dbInstance[storeName].clear();
                            if (dataObj[storeName].length > 0) {
                                await dbInstance[storeName].bulkAdd(dataObj[storeName]);
                            }
                        }
                    }
                    await restoreDexie(imgDb, data.imgDb);
                    await restoreDexie(db, data.db);
                    await restoreDexie(maskDb, data.maskDb);
                    await restoreDexie(contactDb, data.contactDb);
                    await restoreDexie(emoDb, data.emoDb);
                    await restoreDexie(chatListDb, data.chatListDb);
                    await restoreDexie(walletDb, data.walletDb);
                    alert('导入成功，即将刷新页面应用数据！');
                    location.reload();
                }
            } catch (err) {
                console.error(err);
                alert('导入失败，文件格式可能不正确');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    async function resetAllData() {
        if (confirm('警告：此操作将永久清空所有设置、聊天记录、世界书等全部数据，且不可恢复！\n确定要继续吗？')) {
            if (confirm('最后一次确认，真的要清空所有数据吗？')) {
                try {
                    await localforage.clear();
                    await imgDb.delete();
                    await db.delete();
                    await maskDb.delete();
                    await contactDb.delete();
                    await emoDb.delete();
                    await chatListDb.delete();
                    await walletDb.delete();
                    alert('所有数据已清空，即将刷新页面！');
                    location.reload();
                } catch (e) {
                    console.error(e);
                    alert('重置失败: ' + e.message);
                }
            }
        }
                   }


