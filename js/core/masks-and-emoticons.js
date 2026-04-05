// Auto-split from js/core/bootstrap.js (1697-2062)

    async function renderMaskPresets() {
        const listContainer = document.getElementById('mask-list-container');
        listContainer.innerHTML = '';
        try {
            const presets = await maskDb.presets.toArray();
            if (presets.length === 0) {
                listContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 40px;">
                        <div class="wb-empty" style="margin-top: 0;">暂无保存的面具预设</div>
                        <div style="font-size: 11px; color: #ccc; margin-top: 10px; text-align: center;">面具可用于快速切换用户设定</div>
                    </div>
                `;
            } else {
                presets.forEach(p => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: #fff; border-radius: 18px; padding: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;';
                    // 头像显示逻辑
                    let avatarHtml = '';
                    if (p.avatar) {
                        avatarHtml = `<img src="${p.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    } else {
                        avatarHtml = `<span style="color: #f0f0f0; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif;">Me</span>`;
                    }
                    item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; overflow: hidden;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: #fdfdfd; border: 1px solid #f0f0f0; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                                ${avatarHtml}
                            </div>
                            <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px;">
                                <div style="font-size: 15px; font-weight: 600; color: #333;">${p.name || '未命名'} <span style="font-size: 11px; color: #999; font-weight: normal; margin-left: 4px; background: #f5f5f5; padding: 2px 6px; border-radius: 8px;">${p.gender || '女'}</span></div>
                                <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.detail || '暂无详细设定'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; flex-shrink: 0; margin-left: 15px;">
                            <div class="wb-action-icon" onclick="openMaskEditor('${p.id}')">
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>
                            <div class="wb-action-icon" onclick="deleteMaskPreset('${p.id}')">
                                <!-- 修改删除按钮不标红，使用 currentColor 与编辑图标颜色保持一致 -->
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </div>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        } catch (e) {
            listContainer.innerHTML = '<div style="color:#999; font-size:12px; text-align:center; margin-top:20px;">加载面具配置失败</div>';
            console.error("加载面具配置失败", e);
        }
    }
    async function openMaskEditor(id = null) {
        const modal = document.getElementById('mask-editor-modal');
        const title = document.getElementById('mask-editor-title');
        const idInput = document.getElementById('mask-edit-id');
        const nameInput = document.getElementById('mask-name');
        const detailInput = document.getElementById('mask-detail');
        const avatarPreview = document.getElementById('mask-avatar-preview');
        const avatarText = document.getElementById('mask-avatar-text');
        modal.style.display = 'flex';
        tempMaskAvatarBase64 = '';
        if (id) {
            title.textContent = '编辑面具设定';
            const p = await maskDb.presets.get(id);
            if (p) {
                idInput.value = p.id;
                nameInput.value = p.name || '';
                detailInput.value = p.detail || '';
                document.querySelector(`input[name="mask-gender"][value="${p.gender || '女'}"]`).checked = true;
                if (p.avatar) {
                    tempMaskAvatarBase64 = p.avatar;
                    avatarPreview.src = p.avatar;
                    avatarPreview.style.display = 'block';
                    avatarText.style.display = 'none';
                } else {
                    avatarPreview.style.display = 'none';
                    avatarText.style.display = 'block';
                }
            }
        } else {
            title.textContent = '添加面具设定';
            idInput.value = '';
            nameInput.value = '';
            detailInput.value = '';
            document.querySelector(`input[name="mask-gender"][value="女"]`).checked = true;
            avatarPreview.style.display = 'none';
            avatarText.style.display = 'block';
        }
    }
    function closeMaskEditor() {
        document.getElementById('mask-editor-modal').style.display = 'none';
        document.getElementById('mask-avatar-input').value = '';
    }
    function handleMaskAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            tempMaskAvatarBase64 = e.target.result;
            const preview = document.getElementById('mask-avatar-preview');
            preview.src = tempMaskAvatarBase64;
            preview.style.display = 'block';
            document.getElementById('mask-avatar-text').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    async function saveMaskPreset() {
        const id = document.getElementById('mask-edit-id').value;
        const name = document.getElementById('mask-name').value.trim();
        const gender = document.querySelector('input[name="mask-gender"]:checked').value;
        const detail = document.getElementById('mask-detail').value.trim();
        if (!name) return alert('请输入用户姓名');
        const data = {
            id: id || Date.now().toString(),
            name,
            gender,
            detail,
            avatar: tempMaskAvatarBase64
        };
        try {
            await maskDb.presets.put(data);
            closeMaskEditor();
            renderMaskPresets();
        } catch (e) {
            alert('保存失败');
            console.error(e);
        }
    }
    async function deleteMaskPreset(id) {
        if (confirm('确定要永久删除这个面具设定吗？')) {
            try {
                await maskDb.presets.delete(id);
                renderMaskPresets();
            } catch (e) {
                alert('删除失败');
                console.error(e);
            }
        }
    }
    // ====== 表情包库功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const emoDb = new Dexie("miniPhoneEmoDB");
    emoDb.version(1).stores({
        groups: 'id, name',
        emoticons: '++id, groupId, desc, url'
    });
    
    let currentEmoGroupId = 'default';
    let emoManageMode = false;
    let selectedEmoIds = new Set();

    async function initEmoticonDB() {
        const defaultGroup = await emoDb.groups.get('default');
        if (!defaultGroup) {
            await emoDb.groups.add({ id: 'default', name: '默认' });
        }
    }

    async function openEmoticonApp() {
        await initEmoticonDB();
        document.getElementById('emoticon-app').style.display = 'flex';
        emoManageMode = false;
        document.getElementById('emoticon-manage-bar').style.display = 'none';
        selectedEmoIds.clear();
        await renderEmoGroups();
    }

    function closeEmoticonApp() {
        document.getElementById('emoticon-app').style.display = 'none';
    }

    async function renderEmoGroups() {
        const container = document.getElementById('emoticon-group-container');
        container.innerHTML = '';
        const groups = await emoDb.groups.toArray();
        
        const defaultGroup = groups.find(g => g.id === 'default');
        const otherGroups = groups.filter(g => g.id !== 'default');
        
        const renderTab = (g) => {
            const tab = document.createElement('div');
            tab.className = `emoticon-group-tag ${g.id === currentEmoGroupId ? 'active' : ''}`;
            tab.textContent = g.name;
            // 非默认分组支持长按删除
            if (g.id !== 'default') {
                let timer;
                tab.addEventListener('touchstart', () => {
                    timer = setTimeout(() => {
                        if (confirm(`确定要删除分组【${g.name}】及其下所有表情包吗？`)) {
                            deleteEmoGroup(g.id);
                        }
                    }, 800);
                }, {passive: true});
                tab.addEventListener('touchend', () => clearTimeout(timer));
                tab.addEventListener('touchmove', () => clearTimeout(timer));
            }
            tab.onclick = () => {
                currentEmoGroupId = g.id;
                renderEmoGroups();
            };
            container.appendChild(tab);
        };
        
        if (defaultGroup) renderTab(defaultGroup);
        otherGroups.forEach(renderTab);
        
        const addBtn = document.createElement('div');
        addBtn.className = 'emo-group-add';
        addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        addBtn.onclick = async () => {
            const name = prompt('请输入新分组名称:');
            if (name && name.trim()) {
                const id = 'group_' + Date.now();
                await emoDb.groups.add({ id, name: name.trim() });
                currentEmoGroupId = id;
                renderEmoGroups();
            }
        };
        container.appendChild(addBtn);
        
        await renderEmoticons();
    }

    async function deleteEmoGroup(groupId) {
        await emoDb.groups.delete(groupId);
        const emos = await emoDb.emoticons.where('groupId').equals(groupId).toArray();
        const emoIds = emos.map(e => e.id);
        await emoDb.emoticons.bulkDelete(emoIds);
        if (currentEmoGroupId === groupId) currentEmoGroupId = 'default';
        renderEmoGroups();
    }

    async function renderEmoticons() {
        const list = document.getElementById('emoticon-list-container');
        list.innerHTML = '';
        const emos = await emoDb.emoticons.where('groupId').equals(currentEmoGroupId).toArray();
        
        if (emos.length === 0) {
            list.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #bbb; font-size: 13px; margin-top: 50px;">该分组暂无表情包</div>';
            return;
        }
        
        emos.reverse().forEach(e => {
            const item = document.createElement('div');
            item.className = `emo-item ${emoManageMode ? 'manage-mode' : ''}`;
            const isChecked = selectedEmoIds.has(e.id) ? 'checked' : '';
            
            item.innerHTML = `
                <div class="emo-checkbox ${isChecked}"></div>
                <img src="${e.url}" loading="lazy" decoding="async">
                <div class="emo-item-desc">${e.desc}</div>
            `;
            
            item.onclick = () => {
                if (emoManageMode) {
                    if (selectedEmoIds.has(e.id)) {
                        selectedEmoIds.delete(e.id);
                    } else {
                        selectedEmoIds.add(e.id);
                    }
                    renderEmoticons();
                }
            };
            list.appendChild(item);
        });
    }

    function toggleEmoticonManageMode() {
        emoManageMode = !emoManageMode;
        selectedEmoIds.clear();
        document.getElementById('emoticon-manage-bar').style.display = emoManageMode ? 'flex' : 'none';
        renderEmoticons();
    }

    async function selectAllEmoticons() {
        const emos = await emoDb.emoticons.where('groupId').equals(currentEmoGroupId).toArray();
        if (selectedEmoIds.size === emos.length) {
            selectedEmoIds.clear();
        } else {
            emos.forEach(e => selectedEmoIds.add(e.id));
        }
        renderEmoticons();
    }

    async function deleteSelectedEmoticons() {
        if (selectedEmoIds.size === 0) return;
        if (confirm(`确定删除选中的 ${selectedEmoIds.size} 个表情包吗？`)) {
            await emoDb.emoticons.bulkDelete(Array.from(selectedEmoIds));
            selectedEmoIds.clear();
            renderEmoticons();
        }
    }

    async function moveSelectedEmoticons() {
        if (selectedEmoIds.size === 0) return;
        const select = document.getElementById('emoticon-move-select');
        select.innerHTML = '';
        const groups = await emoDb.groups.toArray();
        groups.forEach(g => {
            if (g.id !== currentEmoGroupId) {
                select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
            }
        });
        if (select.options.length === 0) {
            alert('没有其他分组可供移动');
            return;
        }
        document.getElementById('emoticon-move-modal').style.display = 'flex';
    }

    function closeMoveEmoticonModal() {
        document.getElementById('emoticon-move-modal').style.display = 'none';
    }
    // 别名：HTML 中 onclick 使用的是 closeEmoticonMoveModal
    function closeEmoticonMoveModal() {
        closeMoveEmoticonModal();
    }

    async function confirmMoveEmoticons() {
        const targetGroupId = document.getElementById('emoticon-move-select').value;
        if (!targetGroupId) return;
        const ids = Array.from(selectedEmoIds);
        for (let id of ids) {
            await emoDb.emoticons.update(id, { groupId: targetGroupId });
        }
        selectedEmoIds.clear();
        closeMoveEmoticonModal();
        renderEmoticons();
        alert('移动成功');
    }

    function openAddEmoticonModal() {
        document.getElementById('emoticon-batch-input').value = '';
        document.getElementById('emoticon-add-modal').style.display = 'flex';
    }
    function closeAddEmoticonModal() {
        document.getElementById('emoticon-add-modal').style.display = 'none';
    }
    
    async function saveBatchEmoticons() {
        const input = document.getElementById('emoticon-batch-input').value.trim();
        if (!input) return;
        
        const lines = input.split('\n');
        let addedCount = 0;
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // 兼容 "描述 URL" 和 "描述：URL" 格式
            const match = line.match(/^(.+?)(?:\s+|:|：)(http.+)$/i);
            if (match) {
                const desc = match[1].trim();
                const url = match[2].trim();
                await emoDb.emoticons.add({
                    groupId: currentEmoGroupId,
                    desc: desc,
                    url: url
                });
                addedCount++;
            }
        }
        
        closeAddEmoticonModal();
        renderEmoticons();
        alert(`成功添加 ${addedCount} 个表情包`);
    }
