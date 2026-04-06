// Auto-split from js/core/bootstrap.js (1091-1410)

    const wbBtn = document.getElementById('app-btn-worldbook');
    const wbApp = document.getElementById('worldbook-app');
    const wbEditor = document.getElementById('worldbook-editor');
    if(wbBtn) {
        wbBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openApp('worldbook-app');
            renderWorldbooks();
        });
    }
    function closeWorldbookApp() {
        wbApp.style.display = 'none';
    }
    function switchWbCategory(cat) {
        currentWbCategory = cat;
        document.getElementById('tab-global').className = cat === 'global' ? 'wb-tab active' : 'wb-tab';
        document.getElementById('tab-local').className = cat === 'local' ? 'wb-tab active' : 'wb-tab';
        renderWorldbooks();
    }
    async function renderWorldbooks() {
        const listContainer = document.getElementById('wb-list-container');
        listContainer.innerHTML = '';
        try {
            const items = await db.entries.where('category').equals(currentWbCategory).toArray();
            if(items.length === 0) {
                listContainer.innerHTML = '<div class="wb-empty">暂无世界书</div>';
                return;
            }
            const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
            items.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'wb-card';
                const isEnabled = item.enabled !== false;
                const pTagClass = `tag-${item.priority}`;
                const pTagText = item.priority === 'high' ? '高优先级' : (item.priority === 'medium' ? '中优先级' : '低优先级');
                const aTagClass = `tag-${item.activation}`;
                const aTagText = item.activation === 'always' ? '始终生效' : '关键词触发';
                const injectPos = item.injectPosition === 'before' ? '前注入' : (item.injectPosition === 'after' ? '后注入' : '中注入');
                let keywordHtml = '';
                if(item.activation === 'keyword' && item.keywords) {
                    keywordHtml = `<div class="wb-tag" style="background:#f5f5f5; color:#777; font-weight:normal;"> ${item.keywords}</div>`;
                }
                card.innerHTML = `
                    <div class="wb-card-title">${item.title}</div>
                    <div class="wb-card-tags">
                        <div class="wb-tag ${aTagClass}">${aTagText}</div>
                        <div class="wb-tag ${pTagClass}">${pTagText}</div>
                        <div class="wb-tag tag-inject">${injectPos}</div>
                        ${keywordHtml}
                    </div>
                    <div class="wb-card-content">${item.content}</div>
                    <div class="wb-card-actions">
                        <div class="wb-action-icon" onclick="editWorldbook(${item.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div class="wb-action-icon" onclick="deleteWorldbook(${item.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                    </div>
                    <div class="wb-card-toggle-wrap" onclick="event.stopPropagation()">
                        <label class="wb-card-switch">
                            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleWorldbookEnabled(${item.id}, this.checked, event)">
                            <span class="wb-card-switch-slider"></span>
                        </label>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) { listContainer.innerHTML = '<div class="wb-empty">暂无世界书</div>'; }
    }
    function toggleKeywordInput() {
        const isKeyword = document.querySelector('input[name="wb-activation"]:checked').value === 'keyword';
        document.getElementById('wb-keywords-group').style.display = isKeyword ? 'block' : 'none';
    }
    async function openWorldbookEditor(id = null) {
        wbEditor.style.display = 'flex';
        const titleEl = document.getElementById('wb-editor-title');
        if (id) {
            titleEl.textContent = '编辑世界书';
            const item = await db.entries.get(id);
            if(item) {
                document.getElementById('wb-id').value = item.id;
                document.getElementById('wb-title').value = item.title;
                document.querySelector(`input[name="wb-category"][value="${item.category}"]`).checked = true;
                document.querySelector(`input[name="wb-activation"][value="${item.activation}"]`).checked = true;
                document.getElementById('wb-keywords').value = item.keywords || '';
                document.getElementById('wb-priority').value = item.priority;
                document.getElementById('wb-inject-position').value = item.injectPosition || 'middle';
                document.getElementById('wb-content').value = item.content;
            }
        } else {
            titleEl.textContent = '新建世界书';
            document.getElementById('wb-id').value = '';
            document.getElementById('wb-title').value = '';
            document.querySelector(`input[name="wb-category"][value="${currentWbCategory}"]`).checked = true;
            document.querySelector(`input[name="wb-activation"][value="always"]`).checked = true;
            document.getElementById('wb-keywords').value = '';
            document.getElementById('wb-priority').value = 'medium';
            document.getElementById('wb-inject-position').value = 'middle';
            document.getElementById('wb-content').value = '';
        }
        toggleKeywordInput();
    }
    function closeWorldbookEditor() { wbEditor.style.display = 'none'; }
    async function saveWorldbook() {
        const id = document.getElementById('wb-id').value;
        const title = document.getElementById('wb-title').value.trim();
        const category = document.querySelector('input[name="wb-category"]:checked').value;
        const activation = document.querySelector('input[name="wb-activation"]:checked').value;
        const keywords = document.getElementById('wb-keywords').value.trim();
        const priority = document.getElementById('wb-priority').value;
        const injectPosition = document.getElementById('wb-inject-position').value;
        const content = document.getElementById('wb-content').value.trim();
        if (!title || !content) return alert('标题和内容不能为空');
        const data = { title, category, activation, keywords, priority, injectPosition, content, updatedAt: new Date().getTime() };
        try {
            if (id) await db.entries.update(parseInt(id), data);
            else { data.createdAt = new Date().getTime(); data.enabled = true; await db.entries.add(data); }
            closeWorldbookEditor();
            if (currentWbCategory !== category) switchWbCategory(category);
            else renderWorldbooks();
        } catch (error) { alert('保存失败'); }
    }
    async function toggleWorldbookEnabled(id, enabled, event) {
        if (event) {
            event.stopPropagation();
        }
        try {
            await db.entries.update(parseInt(id), { enabled: !!enabled, updatedAt: new Date().getTime() });
        } catch (error) {
            alert('开关保存失败');
            renderWorldbooks();
        }
    }
    async function editWorldbook(id) { await openWorldbookEditor(id); }
    async function deleteWorldbook(id) {
        if (await window.showMiniConfirm('确定要永久删除这条世界书设定吗？')) {
            try { await db.entries.delete(id); renderWorldbooks(); } catch (error) { alert('删除失败'); }
        }
    }
    const wechatBtn = document.getElementById('app-btn-wechat');
    if(wechatBtn) {
        wechatBtn.onclick = (e) => { 
            e.stopPropagation(); 
            openApp('wechat-app');
        };
    }
    function closeWechatApp() { document.getElementById('wechat-app').style.display = 'none'; }
    function switchWechatTab(tabName) {
        document.querySelectorAll('.wechat-tab-page').forEach(page => page.classList.remove('active'));
        document.getElementById('wechat-tab-' + tabName).classList.add('active');
        const btns = document.querySelectorAll('.wechat-dock-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        const indexMap = {'msg': 0, 'contacts': 1, 'moments': 2, 'me': 3};
        btns[indexMap[tabName]].classList.add('active');
        if (tabName === 'contacts' && typeof renderContacts === 'function') {
            renderContacts();
        }
    }
    // 新增：面具预设页面逻辑
    function openMaskPresets() {
        document.getElementById('mask-presets-app').style.display = 'flex';
        renderMaskPresets();
    }
// ====== 资产钱包页面显示逻辑 ======
    function openWalletApp() {
        document.getElementById('wallet-app').style.display = 'flex';
    }
    function closeWalletApp() {
        document.getElementById('wallet-app').style.display = 'none';
    }

// ====== 银行卡页面逻辑 ======
    function openBankCardApp() {
        document.getElementById('bank-card-app').style.display = 'flex';
    }
    function closeBankCardApp() {
        document.getElementById('bank-card-app').style.display = 'none';
        // 退出管理模式
        var list = document.getElementById('bank-card-list');
        if (list) list.classList.remove('bank-card-manage-mode');
        var btn = document.getElementById('bank-card-manage-btn');
        if (btn) btn.querySelector('span').textContent = '管理';
    }

    // 管理模式切换
    function toggleBankCardManage() {
        var list = document.getElementById('bank-card-list');
        var btn = document.getElementById('bank-card-manage-btn');
        var isManage = list.classList.toggle('bank-card-manage-mode');
        btn.querySelector('span').textContent = isManage ? '完成' : '管理';
    }

    // 打开添加银行卡弹窗
    function openAddBankCardModal() {
        var modal = document.getElementById('add-bank-card-modal');
        modal.style.display = 'flex';
        setTimeout(function() {
            document.getElementById('add-bank-card-sheet').style.transform = 'translateY(0)';
        }, 10);
        // 重置表单
        document.getElementById('bank-card-name-input').value = '';
        document.getElementById('bank-card-balance-input').value = '';
        // 重置类型选择
        document.querySelectorAll('.bank-type-btn').forEach(function(btn) { btn.classList.remove('active'); });
        document.querySelector('.bank-type-btn').classList.add('active');
        window._selectedBankCardType = '储蓄卡';
        // 重置颜色选择
        document.querySelectorAll('.bank-color-dot').forEach(function(dot) { dot.classList.remove('active'); });
        document.querySelector('.bank-color-dot').classList.add('active');
        window._selectedBankCardColor = 'linear-gradient(135deg,#667eea,#764ba2)';
    }

    // 关闭添加银行卡弹窗
    function closeAddBankCardModal() {
        document.getElementById('add-bank-card-sheet').style.transform = 'translateY(100%)';
        setTimeout(function() {
            document.getElementById('add-bank-card-modal').style.display = 'none';
        }, 320);
    }

    // 选择银行卡类型
    function selectBankCardType(el, type) {
        document.querySelectorAll('.bank-type-btn').forEach(function(btn) { btn.classList.remove('active'); });
        el.classList.add('active');
        window._selectedBankCardType = type;
    }

    // 选择银行卡颜色
    function selectBankCardColor(el, color) {
        document.querySelectorAll('.bank-color-dot').forEach(function(dot) { dot.classList.remove('active'); });
        el.classList.add('active');
        window._selectedBankCardColor = color;
    }

    // 生成随机卡号（最后四位）
    function _genCardNumber() {
        var groups = [];
        for (var i = 0; i < 4; i++) {
            if (i < 3) {
                groups.push('****');
            } else {
                groups.push(String(Math.floor(Math.random() * 9000) + 1000));
            }
        }
        return groups.join(' ');
    }

    // 确认添加银行卡 (持久化到 walletDb)
    async function confirmAddBankCard() {
        var name = document.getElementById('bank-card-name-input').value.trim();
        var balance = document.getElementById('bank-card-balance-input').value.trim();
        var type = window._selectedBankCardType || '储蓄卡';
        var color = window._selectedBankCardColor || 'linear-gradient(135deg,#667eea,#764ba2)';

        if (!name) {
            document.getElementById('bank-card-name-input').focus();
            return;
        }

        var balanceNum = parseFloat(balance) || 0;
        var balanceStr = balanceNum.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var cardNumber = _genCardNumber();

        // 隐藏空状态提示
        var emptyEl = document.getElementById('bank-card-empty');
        if (emptyEl) emptyEl.style.display = 'none';

        // 持久化银行卡到 IndexedDB
        var cardDbId;
        try {
            cardDbId = await walletDb.bankCards.add({
                name: name,
                type: type,
                color: color,
                balance: balanceNum,
                cardNumber: cardNumber
            });
        } catch(e) { console.error("银行卡持久化失败", e); }

        // 创建仿真银行卡 HTML
        var cardId = 'bank-card-' + (cardDbId || Date.now());
        var cardHtml = '<div class="sim-bank-card" id="' + cardId + '" data-db-id="' + (cardDbId || '') + '" style="background:' + color + ';">' +
            '<div class="sim-card-delete-btn" onclick="deleteBankCard(\'' + cardId + '\')">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</div>' +
            '<div class="sim-card-top">' +
            '<div class="sim-card-bank-name">' + name + '</div>' +
            '<div class="sim-card-type-badge">' + type + '</div>' +
            '</div>' +
            '<div class="sim-card-chip"></div>' +
            '<div class="sim-card-number">' + cardNumber + '</div>' +
            '<div class="sim-card-bottom">' +
            '<div>' +
            '<div class="sim-card-balance-label">当前余额</div>' +
            '<div class="sim-card-balance-amount">¥ ' + balanceStr + '</div>' +
            '</div>' +
            '<div class="sim-card-logo">' +
            '<div class="sim-card-logo-circle" style="background:#eb001b;"></div>' +
            '<div class="sim-card-logo-circle" style="background:#f79e1b; margin-left:-8px;"></div>' +
            '</div>' +
            '</div>' +
            '</div>';

        var list = document.getElementById('bank-card-list');
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHtml;
        list.appendChild(tempDiv.firstChild);

        // 记录账单
        _addBill('bank_card', '添加银行卡', balanceNum, false, name + ' · ' + type);

        closeAddBankCardModal();
    }

    // 删除银行卡 (同步从 walletDb 删除)
    function deleteBankCard(cardId) {
        var card = document.getElementById(cardId);
        if (card) {
            // 从 IndexedDB 删除
            var dbId = card.getAttribute('data-db-id');
            if (dbId) {
                walletDb.bankCards.delete(parseInt(dbId)).catch(function(e) { console.error("删除银行卡失败", e); });
            }
            card.style.transition = 'opacity 0.25s, transform 0.25s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(function() {
                card.remove();
                // 如果没有卡了，显示空状态
                var list = document.getElementById('bank-card-list');
                var cards = list.querySelectorAll('.sim-bank-card');
                if (cards.length === 0) {
                    var emptyEl = document.getElementById('bank-card-empty');
                    if (emptyEl) emptyEl.style.display = 'flex';
                }
            }, 250);
        }
    }
    function closeMaskPresets() {
        document.getElementById('mask-presets-app').style.display = 'none';
    }
