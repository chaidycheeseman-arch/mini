// ====== 信息应用（SMS）功能逻辑 ======
(function() {
    // 信息应用独立的数据库（与WeChat聊天共用 chatListDb/contactDb，但界面完全独立）
    // activeSmsContact: 当前信息聊天的联系人
    var activeSmsContact = null;
    var smsIsReplying = false;
    var smsListRenderToken = 0;

    // 获取12小时制时间字符串（与WeChat一致）
    function getSmsTime() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var ampm = h >= 12 ? '下午' : '上午';
        h = h % 12 || 12;
        return ampm + ' ' + h + ':' + (m < 10 ? '0' + m : m);
    }

    // 打开信息应用
    var smsBtnEl = document.getElementById('app-btn-sms');
    if (smsBtnEl) {
        smsBtnEl.onclick = function(e) {
            e.stopPropagation();
            openSmsApp();
        };
    }

    function openSmsApp() {
        openApp('sms-app');
        // 显示列表页，隐藏聊天页
        document.getElementById('sms-tab-list').style.display = 'flex';
        document.getElementById('sms-chat-window').style.display = 'none';
        renderSmsList();
    }

    window.closeSmsApp = function() {
        document.getElementById('sms-app').style.display = 'none';
    };

    // 渲染信息列表：直接显示所有联系人，不需要手动添加
    // 每个联系人显示其 SMS 消息预览（严格隔离 WeChat 消息）
    async function renderSmsList() {
        var renderToken = ++smsListRenderToken;
        var container = document.getElementById('sms-list-container');
        if (!container) return;
        try {
            // 直接读取所有联系人，不依赖 chats 表过滤
            var contacts = await contactDb.contacts.toArray();
            if (renderToken !== smsListRenderToken) return;

            if (contacts.length === 0) {
                container.innerHTML = '<div id="sms-no-msg-tip" style="color:#bbb; font-size:13px; margin-top:120px; text-align:center;">暂无联系人，请先在 WeChat 中添加</div>';
                return;
            }
            var fragment = document.createDocumentFragment();

            for (var i = 0; i < contacts.length; i++) {
                if (renderToken !== smsListRenderToken) return;
                var contact = contacts[i];
                // 只取 SMS 消息（source === 'sms'）作为预览，严格排除 WeChat 消息
                var allMsgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
                var smsMsgsOnly = allMsgs.filter(function(m) { return m.source === 'sms'; });
                var lastText = '点击发送短信...';
                var lastTime = '';
                if (smsMsgsOnly.length > 0) {
                    var lastMsg = smsMsgsOnly[smsMsgsOnly.length - 1];
                    lastTime = lastMsg.timeStr || '';
                    if (lastMsg.isRecalled) {
                        lastText = '撤回了一条消息';
                    } else {
                        lastText = extractMsgPureText(lastMsg.content);
                    }
                }
                var displayName = contact.roleName || '未命名';
                try {
                    var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
                    if (remark && remark !== '未设置') displayName = remark;
                } catch(e2) {}

                var item = document.createElement('div');
                item.className = 'sms-list-item';
                var isChecked = selectedSmsContactIds.has(contact.id);
                // 多选模式：左侧显示复选框
                var checkboxHtml = smsListMultiSelectMode
                    ? '<div style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (isChecked ? '#007AFF' : '#ccc') + ';background:' + (isChecked ? '#007AFF' : 'transparent') + ';flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-right:10px;">' +
                      (isChecked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>' : '') +
                      '</div>'
                    : '';
                // 头像
                var avatarHtml = contact.roleAvatar
                    ? '<img src="' + contact.roleAvatar + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy" decoding="async">'
                    : '<span style="color:#ccc;font-size:12px;font-weight:500;">' + (displayName.charAt(0) || '?') + '</span>';
                item.innerHTML =
                    checkboxHtml +
                    '<div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0;overflow:hidden;flex-shrink:0;display:flex;justify-content:center;align-items:center;margin-right:12px;">' +
                        avatarHtml +
                    '</div>' +
                    '<div class="sms-list-info">' +
                        '<div class="sms-list-name-row">' +
                            '<span class="sms-list-name">' + displayName + '</span>' +
                            '<span class="sms-list-time">' + lastTime + '</span>' +
                        '</div>' +
                        '<div class="sms-list-preview">' + lastText + '</div>' +
                    '</div>';
                (function(cid) {
                    item.onclick = function() {
                        if (smsListMultiSelectMode) {
                            if (selectedSmsContactIds.has(cid)) {
                                selectedSmsContactIds.delete(cid);
                            } else {
                                selectedSmsContactIds.add(cid);
                            }
                            renderSmsList();
                        } else {
                            enterSmsChat(cid);
                        }
                    };
                })(contact.id);
                fragment.appendChild(item);
            }
            if (renderToken !== smsListRenderToken) return;
            if (!fragment.childNodes.length) {
                container.innerHTML = '<div id="sms-no-msg-tip" style="color:#bbb; font-size:13px; margin-top:120px; text-align:center;">暂无短信</div>';
                return;
            }
            container.replaceChildren(fragment);
        } catch(e) {
            console.error('渲染信息列表失败', e);
        }
    }

    // openSmsNewChatSelect / closeSmsNewChatSelect 保留为空函数，防止 HTML 中已有引用报错
    window.openSmsNewChatSelect = function() {};
    window.closeSmsNewChatSelect = function() {
        var modal = document.getElementById('sms-new-chat-modal');
        if (modal) modal.style.display = 'none';
    };

    // 进入信息聊天窗口
    async function enterSmsChat(contactId) {
        var contact = await contactDb.contacts.get(contactId);
        if (!contact) return;
        activeSmsContact = contact;

        // 显示聊天窗口，隐藏列表
        document.getElementById('sms-tab-list').style.display = 'none';
        var chatWin = document.getElementById('sms-chat-window');
        chatWin.style.display = 'flex';

        // 设置顶部联系人名
        var displayName = contact.roleName || '联系人';
        try {
            var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') displayName = remark;
        } catch(e) {}
        document.getElementById('sms-chat-name').textContent = displayName;
        document.getElementById('sms-chat-sub').textContent = '短信';

        // 渲染历史消息
        var container = document.getElementById('sms-msg-container');
        container.innerHTML = '';
        try {
            // 【聊天隔离】信息聊天窗口只显示 source==='sms' 的消息，绝对不允许WeChat消息出现在SMS窗口
            var allSmsMessages = await chatListDb.messages.where('contactId').equals(contactId).toArray();
            var messages = allSmsMessages.filter(function(m) { return m.source === 'sms'; });
            var lastTimeTip = '';
            messages.forEach(function(msg) {
                if (msg.isRecalled) return;
                // 时间戳（每隔一段时间显示一次）
                if (msg.timeStr && msg.timeStr !== lastTimeTip) {
                    lastTimeTip = msg.timeStr;
                    var tipEl = document.createElement('div');
                    tipEl.className = 'sms-time-tip';
                    tipEl.textContent = msg.timeStr;
                    container.appendChild(tipEl);
                }
                var rowEl = _buildSmsBubble(msg);
                if (rowEl) container.appendChild(rowEl);
            });
        } catch(e) { console.error('加载短信历史失败', e); }

        // 清空输入框
        var inputEl = document.getElementById('sms-input-field');
        if (inputEl) {
            inputEl.value = '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(inputEl);
            else inputEl.style.height = 'auto';
        }

        // 滚动到底部
        requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
        setTimeout(function() { container.scrollTop = container.scrollHeight; }, 200);

        // 绑定长按事件
        _bindSmsBubbleEvents();
        // 重置多选状态
        smsChatMultiSelectMode = false;
        selectedSmsMsgIds.clear();
        var bar = document.getElementById('sms-chat-multiselect-bar');
        if (bar) bar.style.display = 'none';
        var inputArea = document.querySelector('#sms-chat-window > div:last-child');
        if (inputArea) inputArea.style.display = 'flex';
    }

    // ====== 信息应用：聊天气泡多选功能（完全重写） ======
    var smsChatMultiSelectMode = false;
    var selectedSmsMsgIds = new Set();
    var smsLongPressTimer = null;

    // 进入聊天气泡多选模式
    function enterSmsChatMultiSelect(msgId) {
        smsChatMultiSelectMode = true;
        selectedSmsMsgIds.clear();
        if (msgId !== undefined) selectedSmsMsgIds.add(msgId);
        // 显示底部操作栏
        var bar = document.getElementById('sms-chat-multiselect-bar');
        if (bar) bar.style.display = 'flex';
        // 隐藏输入区（最后一个子元素）
        var chatWin = document.getElementById('sms-chat-window');
        if (chatWin) {
            var inputArea = chatWin.lastElementChild;
            if (inputArea && inputArea.id !== 'sms-msg-container' && inputArea.id !== 'sms-chat-multiselect-bar') {
                inputArea.style.display = 'none';
            }
        }
        _updateSmsBubbleSelection();
    }

    // 退出聊天气泡多选模式
    function exitSmsChatMultiSelect() {
        smsChatMultiSelectMode = false;
        selectedSmsMsgIds.clear();
        var bar = document.getElementById('sms-chat-multiselect-bar');
        if (bar) bar.style.display = 'none';
        // 显示输入区
        var chatWin = document.getElementById('sms-chat-window');
        if (chatWin) {
            var inputArea = chatWin.lastElementChild;
            if (inputArea && inputArea.id !== 'sms-msg-container' && inputArea.id !== 'sms-chat-multiselect-bar') {
                inputArea.style.display = 'flex';
            }
        }
        _updateSmsBubbleSelection();
    }

    window.exitSmsChatMultiSelect = exitSmsChatMultiSelect;

    window.smsSelectAllMsgs = async function() {
        if (!activeSmsContact) return;
        var allMsgs = await chatListDb.messages.where('contactId').equals(activeSmsContact.id).toArray();
        var smsMsgs = allMsgs.filter(function(m) { return m.source === 'sms' || !m.source; });
        var visibleIds = smsMsgs.map(function(m) { return m.id; });
        if (selectedSmsMsgIds.size === visibleIds.length) {
            selectedSmsMsgIds.clear();
        } else {
            selectedSmsMsgIds.clear();
            visibleIds.forEach(function(id) { selectedSmsMsgIds.add(id); });
        }
        _updateSmsBubbleSelection();
    };

    window.smsDeleteSelectedMsgs = async function() {
        if (selectedSmsMsgIds.size === 0) return;
        if (!confirm('确定要删除选中的 ' + selectedSmsMsgIds.size + ' 条消息吗？\n（相关记忆总结也将同步删除）')) return;
        try {
            await chatListDb.messages.bulkDelete(Array.from(selectedSmsMsgIds));
        } catch(e) { console.error('删除短信失败', e); }
        // 同步删除该联系人的记忆总结（summary_history）
        if (activeSmsContact) {
            try {
                var memoryKey = 'cd_settings_' + activeSmsContact.id + '_summary_history';
                await localforage.removeItem(memoryKey);
            } catch(e) { console.error('删除记忆总结失败', e); }
        }
        exitSmsChatMultiSelect();
        // 重新渲染聊天窗口
        if (activeSmsContact) {
            var contactId = activeSmsContact.id;
            var container = document.getElementById('sms-msg-container');
            container.innerHTML = '';
            var allSmsMessages = await chatListDb.messages.where('contactId').equals(contactId).toArray();
            // 【聊天隔离】重新渲染时严格只显示 SMS 消息
            var messages = allSmsMessages.filter(function(m) { return m.source === 'sms'; });
            var lastTimeTip = '';
            messages.forEach(function(msg) {
                if (msg.isRecalled) return;
                if (msg.timeStr && msg.timeStr !== lastTimeTip) {
                    lastTimeTip = msg.timeStr;
                    var tipEl = document.createElement('div');
                    tipEl.className = 'sms-time-tip';
                    tipEl.textContent = msg.timeStr;
                    container.appendChild(tipEl);
                }
                var rowEl = _buildSmsBubble(msg);
                if (rowEl) container.appendChild(rowEl);
            });
            _bindSmsBubbleEvents();
        }
    };

    // 更新气泡选中状态（显示/隐藏复选框，更新勾选状态）
    function _updateSmsBubbleSelection() {
        var rows = document.querySelectorAll('#sms-msg-container .sms-msg-row[data-msg-id]');
        rows.forEach(function(row) {
            var id = parseInt(row.getAttribute('data-msg-id'));
            var cb = row.querySelector('.sms-msg-checkbox');
            if (!cb) return;
            if (smsChatMultiSelectMode) {
                // 显示复选框
                cb.style.display = 'flex';
                if (selectedSmsMsgIds.has(id)) {
                    row.classList.add('sms-selected');
                    cb.classList.add('checked');
                } else {
                    row.classList.remove('sms-selected');
                    cb.classList.remove('checked');
                }
            } else {
                // 隐藏复选框
                cb.style.display = 'none';
                row.classList.remove('sms-selected');
                cb.classList.remove('checked');
            }
        });
    }

    // 构建单条短信气泡
    // 复选框位置：用户消息（右对齐）在气泡左侧，角色消息（左对齐）在气泡右侧
    function _buildSmsBubble(msg) {
        if (!msg || msg.isRecalled) return null;
        var isMe = msg.sender === 'me';
        var text = extractMsgPureText(msg.content);
        if (!text) return null;

        var rowEl = document.createElement('div');
        rowEl.className = 'sms-msg-row ' + (isMe ? 'sms-me' : 'sms-role');
        rowEl.setAttribute('data-msg-id', msg.id);

        // 复选框（默认隐藏，多选模式下通过 _updateSmsBubbleSelection 显示）
        var cbEl = document.createElement('div');
        cbEl.className = 'sms-msg-checkbox';
        // 不设 inline style，完全由 CSS 控制

        var bubbleEl = document.createElement('div');
        bubbleEl.className = 'sms-bubble';
        bubbleEl.textContent = text;

        // 用户消息（sms-me，右对齐）：复选框 order:-1 → 在气泡左侧
        // 角色消息（sms-role，左对齐）：复选框 order:1 → 在气泡右侧
        // CSS 中已通过 order 属性控制，这里直接追加即可
        rowEl.appendChild(cbEl);
        rowEl.appendChild(bubbleEl);

        return rowEl;
    }

    // 绑定短信气泡长按事件（长按进入多选，多选模式下点击切换选中）
    function _bindSmsBubbleEvents() {
        var rows = document.querySelectorAll('#sms-msg-container .sms-msg-row[data-msg-id]');
        rows.forEach(function(row) {
            var msgId = parseInt(row.getAttribute('data-msg-id'));
            // 移除旧事件防重复
            row.removeEventListener('touchstart', row._smsTs);
            row.removeEventListener('touchend', row._smsTe);
            row.removeEventListener('touchmove', row._smsTm);
            row.removeEventListener('contextmenu', row._smsCm);
            row.removeEventListener('click', row._smsCk);

            row._smsTs = function(e) {
                if (smsChatMultiSelectMode) return;
                if (smsLongPressTimer) clearTimeout(smsLongPressTimer);
                smsLongPressTimer = setTimeout(function() {
                    smsLongPressTimer = null;
                    enterSmsChatMultiSelect(msgId);
                    _bindSmsBubbleEvents();
                }, 600);
            };
            row._smsTe = function() {
                if (smsLongPressTimer) { clearTimeout(smsLongPressTimer); smsLongPressTimer = null; }
            };
            row._smsTm = function() {
                if (smsLongPressTimer) { clearTimeout(smsLongPressTimer); smsLongPressTimer = null; }
            };
            row._smsCm = function(e) {
                e.preventDefault();
                if (!smsChatMultiSelectMode) {
                    enterSmsChatMultiSelect(msgId);
                    _bindSmsBubbleEvents();
                }
            };
            row._smsCk = function(e) {
                if (!smsChatMultiSelectMode) return;
                e.stopPropagation();
                if (selectedSmsMsgIds.has(msgId)) {
                    selectedSmsMsgIds.delete(msgId);
                } else {
                    selectedSmsMsgIds.add(msgId);
                }
                _updateSmsBubbleSelection();
            };

            row.addEventListener('touchstart', row._smsTs, {passive: true});
            row.addEventListener('touchend', row._smsTe);
            row.addEventListener('touchmove', row._smsTm, {passive: true});
            row.addEventListener('contextmenu', row._smsCm);
            row.addEventListener('click', row._smsCk);
        });
    }

    // ====== 信息应用：列表多选功能 ======
    var smsListMultiSelectMode = false;
    var selectedSmsContactIds = new Set();

    window.toggleSmsListMultiSelect = function() {
        smsListMultiSelectMode = !smsListMultiSelectMode;
        selectedSmsContactIds.clear();
        var bar = document.getElementById('sms-list-multiselect-bar');
        if (bar) bar.style.display = smsListMultiSelectMode ? 'flex' : 'none';
        renderSmsList();
    };

    window.smsListSelectAll = async function() {
        var chats = await chatListDb.chats.toArray();
        if (selectedSmsContactIds.size === chats.length) {
            selectedSmsContactIds.clear();
        } else {
            chats.forEach(function(c) { selectedSmsContactIds.add(c.contactId); });
        }
        renderSmsList();
    };

    window.smsListDeleteSelected = async function() {
        if (selectedSmsContactIds.size === 0) return;
        if (!confirm('确定要删除选中的 ' + selectedSmsContactIds.size + ' 个对话的短信记录吗？')) return;
        try {
            // 【重要】只删除 SMS 消息记录，不删除 chats 表中的聊天条目（WeChat 也在用）
            for (var contactId of selectedSmsContactIds) {
                var msgs = await chatListDb.messages.where('contactId').equals(contactId).toArray();
                var smsMsgIds = msgs.filter(function(m) { return m.source === 'sms'; }).map(function(m) { return m.id; });
                if (smsMsgIds.length > 0) await chatListDb.messages.bulkDelete(smsMsgIds);
            }
        } catch(e) { console.error('删除短信消息失败', e); }
        selectedSmsContactIds.clear();
        smsListMultiSelectMode = false;
        var bar = document.getElementById('sms-list-multiselect-bar');
        if (bar) bar.style.display = 'none';
        renderSmsList();
    };

    // 关闭信息聊天窗口，返回列表
    window.closeSmsChat = function() {
        document.getElementById('sms-chat-window').style.display = 'none';
        document.getElementById('sms-tab-list').style.display = 'flex';
        activeSmsContact = null;
        renderSmsList();
    };

    // 发送短信
    window.smsSendMessage = async function() {
        if (smsIsReplying || !activeSmsContact) return;
        var inputEl = document.getElementById('sms-input-field');
        var content = inputEl ? inputEl.value.trim() : '';
        if (!content) return;

        var timeStr = getSmsTime();
        var container = document.getElementById('sms-msg-container');

        // 存入数据库
        try {
            var newMsgId = await chatListDb.messages.add({
                contactId: activeSmsContact.id,
                sender: 'me',
                content: content,
                timeStr: timeStr,
                quoteText: '',
                source: 'sms'
            });
            // 更新聊天列表时间
            var chat = await chatListDb.chats.where('contactId').equals(activeSmsContact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
            } else {
                await chatListDb.chats.add({
                    id: Date.now().toString(),
                    contactId: activeSmsContact.id,
                    lastTime: timeStr
                });
            }
        } catch(e) { console.error('短信存储失败', e); return; }

        // 渲染气泡
        var timeTip = document.createElement('div');
        timeTip.className = 'sms-time-tip';
        timeTip.textContent = timeStr;
        container.appendChild(timeTip);

        var rowEl = document.createElement('div');
        rowEl.className = 'sms-msg-row sms-me';
        var bubbleEl = document.createElement('div');
        bubbleEl.className = 'sms-bubble';
        bubbleEl.textContent = content;
        rowEl.appendChild(bubbleEl);
        container.appendChild(rowEl);

        // 清空输入框
        if (inputEl) {
            inputEl.value = '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(inputEl);
            else inputEl.style.height = 'auto';
        }
        container.scrollTop = container.scrollHeight;

        // 触发角色回复
        await _smsTriggerRoleReply(activeSmsContact, content, timeStr);
    };

    // 回车发送
    document.addEventListener('DOMContentLoaded', function() {
        var smsInput = document.getElementById('sms-input-field');
        if (smsInput) {
            smsInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.smsSendMessage();
                }
            });
            // 自动调整高度
            smsInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 80) + 'px';
            });
        }
    });

    // 信息应用：触发角色回复（调用API，纯文本，简洁风格）
    // 注意：此函数在 SMS IIFE 内部，仅供外部调度通过 window._smsTriggerRoleReplyExternal 调用
    window._smsTriggerRoleReplyExternal = async function(lockedContact, userText) {
        await _smsTriggerRoleReply(lockedContact, userText, getSmsTime());
    };

    async function _smsTriggerRoleReply(lockedContact, userText, userTimeStr) {
        if (smsIsReplying) return;
        smsIsReplying = true;

        var smsWinCheck = document.getElementById('sms-chat-window');
        var container = document.getElementById('sms-msg-container');

        // 显示"正在输入"气泡（仅当SMS窗口打开时）
        var typingRow = document.createElement('div');
        typingRow.className = 'sms-msg-row sms-role';
        typingRow.id = 'sms-typing-indicator';
        var typingBubble = document.createElement('div');
        typingBubble.className = 'sms-typing-bubble';
        typingBubble.innerHTML = '<div class="sms-typing-dot"></div><div class="sms-typing-dot"></div><div class="sms-typing-dot"></div>';
        typingRow.appendChild(typingBubble);
        container.appendChild(typingRow);
        container.scrollTop = container.scrollHeight;

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            var ctxRaw = await localforage.getItem('miffy_api_ctx');
            var ctxLimit = (ctxRaw !== null && ctxRaw !== '') ? parseInt(ctxRaw) : 10;

            if (!apiUrl || !apiKey || !model) {
                // 没有配置API，移除输入指示器
                var tipEl = document.getElementById('sms-typing-indicator');
                if (tipEl) tipEl.remove();
                smsIsReplying = false;
                return;
            }

            var rawMessages = await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray();
            var recentMessages = (ctxLimit === 0) ? rawMessages : rawMessages.slice(-ctxLimit);
            var recentDigest = recentMessages.map(function(msg) {
                var pure = extractMsgPureText(msg.content);
                if (!pure) return '';
                return (msg.sender === 'me' ? '用户' : '你') + '：' + pure;
            }).filter(Boolean).slice(-8).join('\n');
            var recentNeedles = '';
            try {
                if (typeof buildRecentChatNeedles === 'function') {
                    recentNeedles = buildRecentChatNeedles(lockedContact, rawMessages);
                }
            } catch (e) {}
            var presence = lockedContact.aiPresence || {};
            var moodSnapshot = {};
            try {
                if (typeof getMomentsMoodSnapshot === 'function') {
                    moodSnapshot = await getMomentsMoodSnapshot(lockedContact.id);
                }
            } catch (e) {}

            // 构造真实时间字符串（时间感知）
            var _smsNow = new Date();
            var _smsTimeStr = _smsNow.getFullYear() + '年' +
                (_smsNow.getMonth()+1) + '月' +
                _smsNow.getDate() + '日 ' +
                ['周日','周一','周二','周三','周四','周五','周六'][_smsNow.getDay()] + ' ' +
                String(_smsNow.getHours()).padStart(2,'0') + ':' +
                String(_smsNow.getMinutes()).padStart(2,'0');

            var sysPrompt = '你是一个通过手机短信与用户互动的角色，完全沉浸于角色中。\n' +
                '【时间感知】当前真实时间为：' + _smsTimeStr + '，你能感知现在的时间，并在对话中自然体现时间感。\n' +
                '【格式要求】只输出1条纯文本短信回复，极度简短口语化，像真人发短信一样，不要任何格式标记。\n' +
                '【语气要求】简洁自然，符合短信风格，不超过50字。\n' +
                '【角色红线】先守住人设和已经发生的事实，再开口回复；拿不准时宁可含糊，也不要胡编新设定。';

            if (lockedContact.roleDetail) sysPrompt += '\n角色设定：' + lockedContact.roleDetail;
            if (lockedContact.userDetail) sysPrompt += '\n用户设定：' + lockedContact.userDetail;
            if (recentDigest) sysPrompt += '\n最近短信/聊天重点：\n' + recentDigest;
            if (recentNeedles) sysPrompt += '\n当前最该接住的点：\n' + recentNeedles;
            if (presence.statusText || presence.moodText || presence.location || presence.intent) {
                sysPrompt += '\n上一轮活体状态：\n' +
                    (presence.statusText ? '状态：' + presence.statusText + '\n' : '') +
                    (presence.moodText ? '情绪：' + presence.moodText + '\n' : '') +
                    (presence.location ? '位置：' + presence.location + '\n' : '') +
                    (presence.intent ? '意图：' + presence.intent : '');
            }
            if (moodSnapshot && (moodSnapshot.love !== undefined || moodSnapshot.jealous !== undefined || moodSnapshot.monologue || moodSnapshot.dark)) {
                sysPrompt += '\n情绪快照：\n' +
                    (moodSnapshot.love !== undefined ? '亲密感：' + moodSnapshot.love + '\n' : '') +
                    (moodSnapshot.jealous !== undefined ? '吃醋值：' + moodSnapshot.jealous + '\n' : '') +
                    (moodSnapshot.heartrate !== undefined ? '心率感：' + moodSnapshot.heartrate + '\n' : '') +
                    (moodSnapshot.monologue ? '内心旁白：' + moodSnapshot.monologue + '\n' : '') +
                    (moodSnapshot.dark ? '压抑面：' + moodSnapshot.dark : '');
            }

            var messages = [{ role: 'system', content: sysPrompt }];
            recentMessages.forEach(function(msg) {
                var cleanContent = extractMsgPureText(msg.content);
                messages.push({
                    role: msg.sender === 'me' ? 'user' : 'assistant',
                    content: cleanContent
                });
            });

            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';

            var response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) throw new Error('API请求失败: ' + response.status);

            var data = await response.json();
            var replyText = data.choices[0].message.content.trim();
            // 清理可能的JSON包裹
            try {
                var parsed = JSON.parse(replyText);
                if (parsed.content) replyText = parsed.content;
                else if (Array.isArray(parsed) && parsed[0] && parsed[0].content) replyText = parsed[0].content;
            } catch(e2) {}

            var replyTimeStr = getSmsTime();

            // 存入数据库
            var newRoleMsgId = await chatListDb.messages.add({
                contactId: lockedContact.id,
                sender: 'role',
                content: replyText,
                timeStr: replyTimeStr,
                quoteText: '',
                source: 'sms'
            });
            var chat2 = await chatListDb.chats.where('contactId').equals(lockedContact.id).first();
            if (chat2) {
                await chatListDb.chats.update(chat2.id, { lastTime: replyTimeStr });
            }

            // 移除输入指示器
            var tipEl2 = document.getElementById('sms-typing-indicator');
            if (tipEl2) tipEl2.remove();

            // 检查当前是否还在这个聊天窗口
            var smsWin = document.getElementById('sms-chat-window');
            if (smsWin && smsWin.style.display === 'flex' && activeSmsContact && activeSmsContact.id === lockedContact.id) {
                // 渲染角色回复气泡
                var timeTip2 = document.createElement('div');
                timeTip2.className = 'sms-time-tip';
                timeTip2.textContent = replyTimeStr;
                container.appendChild(timeTip2);

                var roleRow = document.createElement('div');
                roleRow.className = 'sms-msg-row sms-role';
                var roleBubble = document.createElement('div');
                roleBubble.className = 'sms-bubble';
                roleBubble.textContent = replyText;
                roleRow.appendChild(roleBubble);
                container.appendChild(roleRow);
                container.scrollTop = container.scrollHeight;
            } else {
                // 不在窗口内，显示横幅通知
                showNotificationBanner('', lockedContact.roleName || '短信', replyText, replyTimeStr, null);
            }

        } catch(e) {
            console.error('短信角色回复失败', e);
            var tipEl3 = document.getElementById('sms-typing-indicator');
            if (tipEl3) tipEl3.remove();
        }

        smsIsReplying = false;

        // 角色回复完成后，检查是否要解除对用户的拉黑
        try {
            var apiUrlForUnblock = await localforage.getItem('miffy_api_url');
            var apiKeyForUnblock = await localforage.getItem('miffy_api_key');
            var modelForUnblock = await localforage.getItem('miffy_api_model');
            var tempForUnblock = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            var ctxRawForUnblock = await localforage.getItem('miffy_api_ctx');
            var ctxLimitForUnblock = (ctxRawForUnblock !== null && ctxRawForUnblock !== '') ? parseInt(ctxRawForUnblock) : 10;
        await checkRoleUnblockAfterSmsReply(lockedContact, apiUrlForUnblock, apiKeyForUnblock, modelForUnblock, tempForUnblock, ctxLimitForUnblock);
        } catch(eUnblock) { console.error('解除拉黑检查失败', eUnblock); }
    }

})();

// ====== 修罗场模式：WeChat账号异地登录劫持系统 ======
(function() {
    'use strict';

    // 用于记录每个联系人上次触发时间，防止重复触发
    var _shuraHijackLastTriggered = {}; // contactId -> timestamp
    // 用于记录已在检测中的联系人，防止并发重复
    var _shuraHijackChecking = {};
    // 当前触发劫持的联系人ID
    var _shuraHijackContactId = null;
    // 当前触发劫持的联系人对象（用于注入上下文防失忆）
    var _shuraHijackContact = null;
    // 对峙对话是否正在生成
    var _shuraConfrontationRunning = false;
    // 记录每个联系人最后一次用户发消息时间（用于判断沉默）
    var _shuraLastUserMsgTime = {}; // contactId -> timestamp
    // 后台沉默检测定时器
    var _shuraSilenceTimers = {}; // contactId -> timer

    // 设备名称随机池
    var _deviceNames = [
        'iPhone 15 Pro', 'iPhone 14', 'iPhone 13 Pro Max',
        'Samsung Galaxy S24', 'Xiaomi 14 Pro', 'OPPO Find X7',
        'Huawei Mate 60 Pro', 'OnePlus 12', 'Vivo X100 Pro',
        'iPad Pro 13寸', 'MacBook Pro 16寸'
    ];

    // 占有欲强关键词（用于判断是否提升触发概率到80%）
    var _possessiveKeywords = [
        '占有欲', '霸道', '偏执', '强势', '独占', '嫉妒', '控制欲', '不允许',
        '只能是我的', '不能离开', '死缠烂打', '执着', '固执', '腹黑', '强占'
    ];

    /**
     * 判断角色是否有占有欲（80%概率触发）
     */
    function _isPossessiveRole(contact) {
        var detail = (contact.roleDetail || '').toLowerCase();
        return _possessiveKeywords.some(function(kw) { return detail.includes(kw); });
    }

    /**
     * 用户发消息时更新沉默计时器
     * 每次用户发消息后，重新启动10分钟沉默检测
     */
    function _shuraResetSilenceTimer(contactId) {
        _shuraLastUserMsgTime[contactId] = Date.now();
        // 清除旧定时器
        if (_shuraSilenceTimers[contactId]) {
            clearTimeout(_shuraSilenceTimers[contactId]);
            delete _shuraSilenceTimers[contactId];
        }
        // 10分钟后检测（如果用户一直没回复）
        _shuraSilenceTimers[contactId] = setTimeout(async function() {
            delete _shuraSilenceTimers[contactId];
            try {
                var fresh = await contactDb.contacts.get(contactId);
                if (!fresh) return;
                var dramaOn = await localforage.getItem('cd_settings_' + contactId + '_toggle_drama');
                if (!dramaOn) return;
                await checkShuraModeHijack(fresh);
            } catch(e) { console.error('[修罗场] 沉默定时器触发失败', e); }
        }, 10 * 60 * 1000); // 10分钟
    }

    /**
     * 角色发消息后启动沉默检测（如果用户此后10分钟不回复则触发）
     */
    function _shuraStartSilenceWatchAfterRoleMsg(contactId) {
        // 如果用户已经超过10分钟没发消息，直接检测
        var lastUserMsg = _shuraLastUserMsgTime[contactId] || 0;
        var silentDuration = Date.now() - lastUserMsg;
        if (lastUserMsg > 0 && silentDuration >= 10 * 60 * 1000) {
            // 用户已经沉默超过10分钟，立即尝试触发
            contactDb.contacts.get(contactId).then(async function(fresh) {
                if (!fresh) return;
                var dramaOn = await localforage.getItem('cd_settings_' + contactId + '_toggle_drama');
                if (!dramaOn) return;
                await checkShuraModeHijack(fresh);
            }).catch(function(e) { console.error('[修罗场] 立即检测失败', e); });
        } else if (lastUserMsg === 0) {
            // 用户从未发过消息（刚开始聊天），也启动10分钟等待
            if (!_shuraSilenceTimers[contactId]) {
                _shuraSilenceTimers[contactId] = setTimeout(async function() {
                    delete _shuraSilenceTimers[contactId];
                    try {
                        var fresh = await contactDb.contacts.get(contactId);
                        if (!fresh) return;
                        var dramaOn = await localforage.getItem('cd_settings_' + contactId + '_toggle_drama');
                        if (!dramaOn) return;
                        await checkShuraModeHijack(fresh);
                    } catch(e) { console.error('[修罗场] 首次沉默检测失败', e); }
                }, 10 * 60 * 1000);
            }
        }
        // 如果用户最近发过消息但还不到10分钟，等待剩余时间
        else {
            var remaining = 10 * 60 * 1000 - silentDuration;
            if (!_shuraSilenceTimers[contactId] && remaining > 0) {
                _shuraSilenceTimers[contactId] = setTimeout(async function() {
                    delete _shuraSilenceTimers[contactId];
                    try {
                        var fresh = await contactDb.contacts.get(contactId);
                        if (!fresh) return;
                        var dramaOn = await localforage.getItem('cd_settings_' + contactId + '_toggle_drama');
                        if (!dramaOn) return;
                        await checkShuraModeHijack(fresh);
                    } catch(e) { console.error('[修罗场] 剩余等待检测失败', e); }
                }, remaining);
            }
        }
    }

    /**
     * 核心入口：修罗场模式下，用户沉默10分钟后触发
     * 普通角色50%概率，占有欲强角色80%概率
     * @param {Object} contact - 当前联系人对象
     */
    async function checkShuraModeHijack(contact) {
        if (!contact || !contact.id) return;
        // 防并发
        if (_shuraHijackChecking[contact.id]) return;
        _shuraHijackChecking[contact.id] = true;

        try {
            // 1. 检查修罗场模式开关是否开启
            var dramaOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_drama');
            if (!dramaOn) return;

            // 2. 防止短时间内重复触发（同一联系人至少间隔30分钟）
            var now = Date.now();
            var lastTriggered = _shuraHijackLastTriggered[contact.id] || 0;
            if (now - lastTriggered < 30 * 60 * 1000) return;

            // 3. 根据角色设定决定触发概率：低占有欲=20%，高占有欲=40%
            var triggerProb = _isPossessiveRole(contact) ? 0.4 : 0.2;
            if (Math.random() >= triggerProb) return;

            // 4. 记录触发时间和联系人
            _shuraHijackLastTriggered[contact.id] = now;
            _shuraHijackContactId = contact.id;
            _shuraHijackContact = contact;

            // 5. 设置设备信息
            var deviceName = _deviceNames[Math.floor(Math.random() * _deviceNames.length)];
            var deviceEl = document.getElementById('hijack-device-name');
            if (deviceEl) deviceEl.textContent = deviceName;
            var timeEl = document.getElementById('hijack-login-time');
            if (timeEl) {
                var nowDate = new Date();
                var hh = String(nowDate.getHours()).padStart(2,'0');
                var mm = String(nowDate.getMinutes()).padStart(2,'0');
                timeEl.textContent = hh + ':' + mm + ' 刚刚登录';
            }

            // 6. 显示面板（带入场动画）
            var overlay = document.getElementById('wechat-login-hijack-overlay');
            var card = document.getElementById('wechat-login-hijack-card');
            if (!overlay || !card) return;
            overlay.style.display = 'flex';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    card.style.transform = 'scale(1)';
                    card.style.opacity = '1';
                });
            });

            // 7. 将登录事件写入聊天记录（让角色知道自己登录了）
            var loginEventContent = JSON.stringify({
                type: 'shura_login_event',
                content: '[系统]' + (contact.roleName || '对方') + ' 刚刚登录了你的WeChat账号，正在查看你的聊天记录。'
            });
            await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: loginEventContent,
                timeStr: getAmPmTime(),
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            renderChatList();

            // 8. 后台：角色查看其他角色对话并生成对峙内容（异步执行，不阻塞面板显示）
            _shuraGenerateConfrontation(contact).catch(function(e) {
                console.error('[修罗场] 对峙生成失败', e);
            });

        } catch(e) {
            console.error('[修罗场] 检测失败', e);
        } finally {
            _shuraHijackChecking[contact.id] = false;
        }
    }

    /**
     * 用户点击"重新登录"按钮
     * - 关闭面板，模拟将角色踢出
     * - 在聊天记录中插入系统提示（灰色，非绿色）
     */
    window.wechatHijackRelogin = async function() {
        var overlay = document.getElementById('wechat-login-hijack-overlay');
        var card = document.getElementById('wechat-login-hijack-card');
        if (card) { card.style.transform = 'scale(0.88) translateY(20px)'; card.style.opacity = '0'; }
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
        }, 380);

        if (!_shuraHijackContactId) return;
        try {
            var contact = await contactDb.contacts.get(_shuraHijackContactId);
            if (!contact) return;
            var roleName = contact.roleName || '对方';
            var timeStr = getAmPmTime();

            // 在聊天记录插入系统提示（灰色，不用绿色）
            var sysContent = JSON.stringify({
                type: 'shura_relogin',
                content: '你已重新登录，' + roleName + ' 的异地登录已被踢出。'
            });
            await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: sysContent,
                timeStr: timeStr,
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            var chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) await chatListDb.chats.update(chat.id, { lastTime: timeStr });
            renderChatList();

            // 如果聊天窗口打开，刷新显示（灰色系统小字，无颜色）
            var chatWin = document.getElementById('chat-window');
            if (chatWin && chatWin.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id) {
                var container = document.getElementById('chat-msg-container');
                if (container) {
                    var tip = document.createElement('div');
                    tip.className = 'msg-recalled-tip';
                    tip.textContent = '你已重新登录，异地设备已被踢出。';
                    container.appendChild(tip);
                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                }
            }

            // 角色知道被踢出后，触发一次回复（角色会基于上下文中的登录事件来回应）
            if (contact && !isReplying) {
                setTimeout(async function() {
                    try {
                        var prevActive = activeChatContact;
                        activeChatContact = contact;
                        isReplying = false;
                        await triggerRoleReply();
                        if (activeChatContact && activeChatContact.id === contact.id) {
                            activeChatContact = prevActive;
                        }
                        isReplying = false;
                    } catch(e) { console.error('[修罗场] 踢出后角色回复失败', e); }
                }, 1500);
            }
        } catch(e) { console.error('[修罗场] 重新登录处理失败', e); }
    };

    /**
     * 用户点击"退出"按钮 - 关闭面板
     */
    window.wechatHijackExit = function() {
        var overlay = document.getElementById('wechat-login-hijack-overlay');
        var card = document.getElementById('wechat-login-hijack-card');
        if (card) { card.style.transform = 'scale(0.88) translateY(20px)'; card.style.opacity = '0'; }
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
        }, 380);
    };

    /**
     * 用户点击"更换密码"按钮 - 关闭面板，插入系统提示
     */
    window.wechatHijackChangePwd = async function() {
        var overlay = document.getElementById('wechat-login-hijack-overlay');
        var card = document.getElementById('wechat-login-hijack-card');
        if (card) { card.style.transform = 'scale(0.88) translateY(20px)'; card.style.opacity = '0'; }
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
        }, 380);

        if (!_shuraHijackContactId) return;
        try {
            var contact = await contactDb.contacts.get(_shuraHijackContactId);
            if (!contact) return;
            var timeStr = getAmPmTime();
            var sysContent = JSON.stringify({
                type: 'shura_pwd_changed',
                content: '你已更换微信密码，异地设备已自动退出登录。'
            });
            await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: sysContent,
                timeStr: timeStr,
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            var chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) await chatListDb.chats.update(chat.id, { lastTime: timeStr });
            renderChatList();

            var chatWin = document.getElementById('chat-window');
            if (chatWin && chatWin.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id) {
                var container = document.getElementById('chat-msg-container');
                if (container) {
                    var tip = document.createElement('div');
                    tip.className = 'msg-recalled-tip';
                    tip.textContent = '你已更换微信密码，异地设备已自动退出登录。';
                    container.appendChild(tip);
                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                }
            }
        } catch(e) { console.error('[修罗场] 更换密码处理失败', e); }
    };

    /**
     * 对外暴露：用户发消息时调用，重置沉默计时器
     */
    window._shuraOnUserSendMsg = function(contactId) {
        if (contactId) _shuraResetSilenceTimer(contactId);
    };

    /**
     * 对外暴露：角色发消息后调用，启动沉默监测
     */
    window._shuraOnRoleSendMsg = function(contactId) {
        if (contactId) _shuraStartSilenceWatchAfterRoleMsg(contactId);
    };

    /**
     * 对外暴露：获取当前触发劫持的联系人（用于在system prompt中注入上下文）
     */
    window._shuraGetHijackContact = function() {
        return _shuraHijackContact;
    };

    /**
     * 核心：角色登录用户WeChat后，查看其他角色的对话内容，
     * 并调用API生成3轮以上的对峙对话，展示在对峙面板中
     * @param {Object} triggerContact - 触发劫持的角色（登录者）
     */
    async function _shuraGenerateConfrontation(triggerContact) {
        if (_shuraConfrontationRunning) return;
        _shuraConfrontationRunning = true;

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.8;
            if (!apiUrl || !apiKey || !model) return;

            // 1. 获取所有联系人
            var allContacts = await contactDb.contacts.toArray();
            // 排除触发者自身
            var otherContacts = allContacts.filter(function(c) { return c.id !== triggerContact.id; });
            if (otherContacts.length === 0) return;

            // 2. 收集其他角色的聊天记录摘要（最多取每个角色最近10条）
            var otherChatsInfo = [];
            for (var i = 0; i < Math.min(otherContacts.length, 3); i++) {
                var oc = otherContacts[i];
                var ocMsgs = await chatListDb.messages.where('contactId').equals(oc.id).toArray();
                var recentOcMsgs = ocMsgs.slice(-10);
                if (recentOcMsgs.length === 0) continue;
                var chatText = recentOcMsgs.map(function(m) {
                    var sender = m.sender === 'me' ? '用户' : (oc.roleName || '角色');
                    return sender + '：' + extractMsgPureText(m.content);
                }).join('\n');
                otherChatsInfo.push({
                    contact: oc,
                    chatText: chatText
                });
            }

            if (otherChatsInfo.length === 0) return;

            // 3. 获取触发者的最近聊天记录
            var triggerMsgs = await chatListDb.messages.where('contactId').equals(triggerContact.id).toArray();
            var recentTriggerMsgs = triggerMsgs.slice(-8);
            var triggerChatText = recentTriggerMsgs.map(function(m) {
                var sender = m.sender === 'me' ? '用户' : (triggerContact.roleName || '角色');
                return sender + '：' + extractMsgPureText(m.content);
            }).join('\n');

            // 4. 获取用户昵称
            var myName = '用户';
            var myNameEl = document.getElementById('text-wechat-me-name');
            if (myNameEl) myName = myNameEl.textContent || '用户';

            // 5. 构建对峙对话生成Prompt
            var otherChatsDesc = otherChatsInfo.map(function(info) {
                return '【与' + (info.contact.roleName || '角色') + '的对话】\n' + info.chatText;
            }).join('\n\n');

            var confrontationPrompt = '【场景背景】\n' +
                (triggerContact.roleName || '角色A') + '（角色设定：' + (triggerContact.roleDetail || '无设定') + '）趁用户不注意，偷偷拿起用户的手机，登录了用户的WeChat账号，查看了用户与其他人的聊天记录。\n\n' +
                '【角色看到的其他聊天记录】\n' + otherChatsDesc + '\n\n' +
                '【角色与用户自己的聊天记录（用于了解两人关系背景）】\n' + triggerChatText + '\n\n' +
                '【用户昵称】' + myName + '\n\n' +
                '现在角色要当面质问用户，请生成角色的发言。要求：\n' +
                '1. 角色是主动质问方，是"偷看了用户手机"的那个人，不是被查手机的人\n' +
                '2. 角色发现用户同时在和别人聊天，情绪激烈地质问用户，充满张力\n' +
                '3. 至少生成4条角色发言，最多8条，每条只包含角色说的话\n' +
                '4. 只生成角色的发言，不要生成用户的回应，用户自己回复\n' +
                '5. 发言要极度真实、口语化，充满情绪，像真实的感情纠纷\n' +
                '6. 必须以JSON数组格式输出，每个元素包含：\n' +
                '   {"speaker": "' + (triggerContact.roleName || '角色') + '", "text": "说的话", "emotion": "情绪标签(愤怒/委屈/冷静/崩溃等)"}\n' +
                '7. 绝对不要输出任何Markdown代码块标记，直接输出纯JSON数组！';

            var messages = [
                { role: 'system', content: confrontationPrompt },
                { role: 'user', content: '请生成修罗场对峙对话。' }
            ];

            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';

            var response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) return;
            var data = await response.json();
            var replyText = data.choices[0].message.content.trim();

            // 6. 解析JSON
            var dialogues = [];
            try {
                var firstBracket = replyText.indexOf('[');
                var lastBracket = replyText.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    replyText = replyText.substring(firstBracket, lastBracket + 1);
                }
                dialogues = JSON.parse(replyText);
                if (!Array.isArray(dialogues)) throw new Error('not array');
            } catch(e) {
                console.warn('[修罗场] 对话JSON解析失败', e);
                return;
            }

            if (dialogues.length < 3) return;

            // 7. 渲染对峙对话面板
            _renderShuraConfrontation(triggerContact, otherChatsInfo, dialogues, myName);

        } catch(e) {
            console.error('[修罗场] 对峙生成出错', e);
        } finally {
            // 修复：无论成功还是失败，必须在 finally 中重置标志位，
            // 否则一旦发生异常，_shuraConfrontationRunning 永远为 true，
            // 后续所有修罗场对峙生成请求都会被静默拦截，功能永久失效。
            _shuraConfrontationRunning = false;
        }
    }

    /**
     * 渲染对峙对话：角色发现用户手机内容后，直接在聊天窗口逐条发送对峙消息给用户
     * 不再使用单独的对峙面板，而是将对话内容作为角色消息直接发到聊天记录中
     */
    async function _renderShuraConfrontation(triggerContact, otherChatsInfo, dialogues, myName) {
        if (!dialogues || dialogues.length === 0) return;

        // 过滤出角色的发言（跳过用户发言）
        var roleLines = dialogues.filter(function(d) {
            if (!d || !d.text) return false;
            var isMe = (d.speaker === myName || d.speaker === '用户' || d.speaker === 'user');
            return !isMe;
        });

        if (roleLines.length === 0) return;

        // 逐条将角色发言作为真实聊天消息发送（带1.8s间隔）
        for (var i = 0; i < roleLines.length; i++) {
            var d = roleLines[i];
            var msgText = d.text;
            // 如有情绪标签，附加到消息末尾（括号内，轻描淡写）
            // 不附加情绪标签，保持消息纯净
            await new Promise(function(res) { setTimeout(res, i === 0 ? 800 : 1800); });
            await appendRoleMessage(msgText, '', triggerContact);
        }
    }

    /**
     * 关闭对峙面板
     */
    window.closeShuraConfrontation = function() {
        var overlay = document.getElementById('shura-confrontation-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    /**
     * 对外暴露检测函数，供外部调度调用
     */
    window._checkShuraModeHijack = checkShuraModeHijack;

})();

// ====== 修罗场模式：在用户长时间不回复时触发劫持检测 ======
(function() {
    // 修罗场触发检测：每次角色回复后直接尝试触发
    // 触发条件：修罗场模式开关开启 + 50%概率 + 30分钟冷却
    async function _shuraCheckAfterRoleReply(contact) {
        if (!contact) return;
        try {
            var dramaOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_drama');
            if (!dramaOn) return;

            // 直接调用修罗场劫持检测（内部有50%概率和冷却时间控制）
            if (typeof window._checkShuraModeHijack === 'function') {
                await window._checkShuraModeHijack(contact);
            }
        } catch(e) {
            console.error('[修罗场] 触发检测失败', e);
        }
    }

    // 暴露给外部：角色回复完成后调用此函数
    window._shuraCheckAfterRoleReply = _shuraCheckAfterRoleReply;
})();

// ====== 后台保活 & 主动发消息 & 浏览器通知系统 ======
(function() {
    'use strict';

    var _notifySeq = 0;
    var _keepaliveTimers = {}; // contactId -> timerId | 'PENDING'
    var _proactiveTimers = {}; // contactId -> timerId
    var _bgNotifQueue = []; // { contactId, text }
    var _bgNotifBusy = false;

    // ---- 工具：获取联系人备注显示名 ----
    async function _getDisplayName(contact) {
        try {
            var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') return remark;
        } catch(e) {}
        return contact.roleName || '角色';
    }

    // ---- 工具：判断网页是否可见 ----
    function _isPageVisible() {
        return !document.hidden;
    }

    function _safeInt(raw, fallbackVal) {
        var n = parseInt(raw, 10);
        return isNaN(n) ? fallbackVal : n;
    }

    function _parseClockToMinutes(val, fallbackVal) {
        if (typeof val !== 'string') return fallbackVal;
        var m = /^(\d{1,2}):(\d{1,2})$/.exec(val.trim());
        if (!m) return fallbackVal;
        var hh = parseInt(m[1], 10);
        var mm = parseInt(m[2], 10);
        if (isNaN(hh) || isNaN(mm)) return fallbackVal;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallbackVal;
        return hh * 60 + mm;
    }

    async function _getKeepaliveRangeConfig(contactId) {
        var min = _safeInt(await localforage.getItem('cd_settings_' + contactId + '_keepalive_min'), 5);
        var max = _safeInt(await localforage.getItem('cd_settings_' + contactId + '_keepalive_max'), 20);
        if (min < 1) min = 1;
        if (max < min) max = min;
        return { min: min, max: max };
    }

    async function _isInKeepaliveActiveRange(contactId) {
        var startStr = await localforage.getItem('cd_settings_' + contactId + '_keepalive_active_start');
        var endStr = await localforage.getItem('cd_settings_' + contactId + '_keepalive_active_end');
        var startMin = _parseClockToMinutes(startStr, 0);
        var endMin = _parseClockToMinutes(endStr, 23 * 60 + 59);
        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();

        if (startMin === endMin) return true;
        if (startMin < endMin) return nowMin >= startMin && nowMin <= endMin;
        return nowMin >= startMin || nowMin <= endMin;
    }

    // ====== Web Push 通知：申请权限 & 发送系统推送 ======
    async function _ensureBrowserNotificationPermission() {
        if (!('Notification' in window)) {
            return { ok: false, reason: 'unsupported' };
        }
        if (!window.isSecureContext) {
            return { ok: false, reason: 'insecure_context' };
        }
        if (Notification.permission === 'granted') {
            return { ok: true, reason: 'granted' };
        }
        if (Notification.permission === 'denied') {
            return { ok: false, reason: 'denied' };
        }
        try {
            var result = await Notification.requestPermission();
            if (result === 'granted') return { ok: true, reason: 'granted' };
            return { ok: false, reason: result || 'default' };
        } catch (e) {
            return { ok: false, reason: 'request_failed', error: e && e.message ? e.message : String(e) };
        }
    }

    async function _requestNotificationPermission() {
        var perm = await _ensureBrowserNotificationPermission();
        return !!perm.ok;
    }

    window._getNotificationDebugInfo = function() {
        return {
            secureContext: !!window.isSecureContext,
            notificationSupported: ('Notification' in window),
            notificationPermission: ('Notification' in window) ? Notification.permission : 'unsupported',
            serviceWorkerSupported: ('serviceWorker' in navigator)
        };
    };

    window._ensureBrowserNotificationPermission = async function(options) {
        var opts = options || {};
        var perm = await _ensureBrowserNotificationPermission();
        if (!perm.ok) return perm;
        if (!opts.test) return perm;

        var testTitle = 'Mini 通知测试';
        var testBody = '通知已启用，后台消息会逐条弹出。';
        var testTag = 'mini-notify-test-' + Date.now();
        try {
            if ('serviceWorker' in navigator) {
                var reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.showNotification(testTitle, {
                        body: testBody,
                        icon: 'icon-192.png',
                        tag: testTag,
                        renotify: false,
                        data: { contactId: '', url: window.location.href }
                    });
                    return { ok: true, reason: 'granted' };
                }
            }
            var n = new Notification(testTitle, {
                body: testBody,
                icon: 'icon-192.png',
                tag: testTag,
                renotify: false
            });
            n.onclick = function() {
                window.focus();
                n.close();
            };
            return { ok: true, reason: 'granted' };
        } catch (e2) {
            return { ok: false, reason: 'show_failed', error: e2 && e2.message ? e2.message : String(e2) };
        }
    };

    async function _showOneBackgroundRoleNotification(contact, msgText) {
        if (!contact || !msgText || _isPageVisible()) return;
        var granted = await _requestNotificationPermission();
        if (!granted) return;

        var displayName = await _getDisplayName(contact);
        var avatarSrc = contact.roleAvatar || 'icon-192.png';
        var uniqueTag = 'mini-bgseq-' + contact.id + '-' + Date.now() + '-' + (++_notifySeq);

        if ('serviceWorker' in navigator) {
            try {
                var reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    // 先主动关闭上一条同类通知，避免桌面端需要手动点掉才显示下一条
                    var oldNotifs = await reg.getNotifications();
                    for (var i = 0; i < oldNotifs.length; i++) {
                        var t = oldNotifs[i].tag || '';
                        if (t.indexOf('mini-bgseq-') === 0) {
                            oldNotifs[i].close();
                        }
                    }

                    await reg.showNotification(displayName, {
                        body: msgText,
                        icon: avatarSrc,
                        tag: uniqueTag,
                        renotify: false,
                        data: { contactId: contact.id, url: window.location.href }
                    });

                    // 自动关闭本条，保证后续队列无需点击也能继续
                    setTimeout(async function() {
                        try {
                            var reg2 = await navigator.serviceWorker.getRegistration();
                            if (!reg2) return;
                            var sameTag = await reg2.getNotifications({ tag: uniqueTag });
                            for (var k = 0; k < sameTag.length; k++) {
                                sameTag[k].close();
                            }
                        } catch (eClose) {}
                    }, 2200);
                    return;
                }
            } catch (swErr) {
                console.error('[通知] ServiceWorker showNotification失败', swErr);
            }
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            var notif = new Notification(displayName, {
                body: msgText,
                icon: avatarSrc,
                tag: uniqueTag,
                renotify: false
            });
            notif.onclick = function() {
                window.focus();
                document.getElementById('wechat-app').style.display = 'flex';
                enterChatWindow(contact.id);
                notif.close();
            };
            setTimeout(function() {
                try { notif.close(); } catch (e2) {}
            }, 2200);
        }
    }

    async function _drainBackgroundNotificationQueue() {
        if (_bgNotifBusy) return;
        _bgNotifBusy = true;
        try {
            while (_bgNotifQueue.length > 0) {
                var item = _bgNotifQueue.shift();
                var cid = item.contactId;
                var msgText = item.text;
                var fresh = await contactDb.contacts.get(cid);
                if (fresh && msgText) {
                    await _showOneBackgroundRoleNotification(fresh, msgText);
                }
                // 每条间隔一点时间，避免系统合并或吞通知
                await new Promise(function(res) { setTimeout(res, 900); });
            }
        } finally {
            _bgNotifBusy = false;
            if (_bgNotifQueue.length > 0) {
                _drainBackgroundNotificationQueue().catch(function(e) {
                    console.error('[通知] 后台通知队列重试失败', e);
                });
            }
        }
    }

    // 页面处于后台时发送浏览器系统横幅（串行队列，确保一条不漏）
    async function _sendBackgroundRoleNotification(contact, msgText) {
        if (!contact || !msgText || _isPageVisible()) return;
        _bgNotifQueue.push({ contactId: contact.id, text: msgText });
        _drainBackgroundNotificationQueue().catch(function(e) {
            console.error('[通知] 后台通知队列失败', e);
        });
    }

    // 兼容旧调用：仅后台发送系统通知，前台不发浏览器横幅
    async function _sendNotification(contact, msgText) {
        await _sendBackgroundRoleNotification(contact, msgText);
    }

    // 暴露给 appendRoleMessage：后台每条角色消息都调用一次
    window._sendBackgroundRoleNotification = _sendBackgroundRoleNotification;

    // ====== Service Worker 消息监听：点击通知后打开对应聊天 ======
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'OPEN_CHAT' && event.data.contactId) {
                document.getElementById('wechat-app').style.display = 'flex';
                enterChatWindow(event.data.contactId);
            }
        });
    }

    // ====== 触发 WeChat 角色回复（后台安全调用） ======
    async function _bgTriggerWechatReply(contact) {
        var prevActive = activeChatContact;
        activeChatContact = contact;
        try {
            isReplying = false;
            await triggerRoleReply();
        } catch(e) {
            console.error('[后台触发] WeChat回复失败', e);
        } finally {
            if (activeChatContact && activeChatContact.id === contact.id) {
                activeChatContact = prevActive;
            }
            isReplying = false;
        }
    }

    // ====== 后台保活：按自定义间隔 + 每日活跃范围 ======
    function _startKeepalive(contact) {
        if (_keepaliveTimers[contact.id]) return;
        _keepaliveTimers[contact.id] = 'PENDING';
        _scheduleNextKeepalive(contact).catch(function(e) {
            console.error('[保活] 调度失败', e);
            delete _keepaliveTimers[contact.id];
        });
    }

    function _stopKeepalive(contactId) {
        var timer = _keepaliveTimers[contactId];
        if (timer && timer !== 'PENDING') {
            clearTimeout(timer);
        }
        delete _keepaliveTimers[contactId];
    }

    async function _scheduleNextKeepalive(contact) {
        if (!_keepaliveTimers[contact.id]) return;
        var cfg = await _getKeepaliveRangeConfig(contact.id);
        var delayMin = cfg.min === cfg.max ? cfg.min : (Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min);
        var delayMs = delayMin * 60 * 1000;

        if (!_keepaliveTimers[contact.id]) return;
        _keepaliveTimers[contact.id] = setTimeout(async function() {
            delete _keepaliveTimers[contact.id];
            try {
                var fresh = await contactDb.contacts.get(contact.id);
                if (!fresh) return;
                var keepaliveOn = await localforage.getItem('cd_settings_' + fresh.id + '_toggle_keepalive');
                if (!keepaliveOn) return;

                var inRange = await _isInKeepaliveActiveRange(fresh.id);
                if (inRange) {
                    await _bgTriggerWechatReply(fresh);
                }
            } catch (e) {
                console.error('[保活] 执行失败', e);
            }

            var freshContact = await contactDb.contacts.get(contact.id).catch(function() { return null; });
            if (freshContact) {
                var stillOn = await localforage.getItem('cd_settings_' + freshContact.id + '_toggle_keepalive').catch(function() { return false; });
                if (stillOn) _startKeepalive(freshContact);
            }
        }, delayMs);
    }

    // ====== 主动发消息（proactive） ======
    function _startProactive(contact) {
        if (_proactiveTimers[contact.id]) return;
        _scheduleNextProactive(contact);
    }

    function _stopProactive(contactId) {
        if (_proactiveTimers[contactId]) {
            clearTimeout(_proactiveTimers[contactId]);
            delete _proactiveTimers[contactId];
        }
    }

    function _scheduleNextProactive(contact) {
        // 随机 10~40 分钟
        var delayMs = (Math.floor(Math.random() * 31) + 10) * 60 * 1000;
        _proactiveTimers[contact.id] = setTimeout(async function() {
            delete _proactiveTimers[contact.id];
            try {
                var fresh = await contactDb.contacts.get(contact.id);
                if (!fresh) return;
                var proactiveOn = await localforage.getItem('cd_settings_' + fresh.id + '_toggle_proactive');
                if (!proactiveOn) return;
                await _bgTriggerWechatReply(fresh);
            } catch(e) {
                console.error('[主动发消息] 执行失败', e);
            }
            var freshContact = await contactDb.contacts.get(contact.id).catch(function() { return null; });
            if (freshContact) {
                var stillOn = await localforage.getItem('cd_settings_' + freshContact.id + '_toggle_proactive').catch(function() { return false; });
                if (stillOn) _scheduleNextProactive(freshContact);
            }
        }, delayMs);
    }

    // ====== 监听聊天详情开关变化，动态启停 ======
    var _origCdToggle = window.cdToggle;
    window.cdToggle = async function(name) {
        if (_origCdToggle) await _origCdToggle(name);
        if (!activeChatContact) return;
        var contact = activeChatContact;
        if (name === 'keepalive') {
            var keepaliveOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_keepalive');
            if (keepaliveOn) {
                _startKeepalive(contact);
            } else {
                _stopKeepalive(contact.id);
            }
        } else if (name === 'proactive') {
            var proactiveOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_proactive');
            if (proactiveOn) {
                _startProactive(contact);
            } else {
                _stopProactive(contact.id);
            }
        }
    };

    // 聊天详情页“立即触发一次”调用
    window._manualKeepaliveTrigger = async function(contactId) {
        var cid = parseInt(contactId, 10);
        var fresh = await contactDb.contacts.get(isNaN(cid) ? contactId : cid);
        if (!fresh) return false;
        await _bgTriggerWechatReply(fresh);
        return true;
    };

    // 聊天详情页修改保活配置后，立即重排当前联系人的保活定时器
    window._refreshKeepaliveTimer = async function(contactId) {
        var cid = parseInt(contactId, 10);
        var fresh = await contactDb.contacts.get(isNaN(cid) ? contactId : cid);
        if (!fresh) return;
        _stopKeepalive(fresh.id);
        var keepaliveOn = await localforage.getItem('cd_settings_' + fresh.id + '_toggle_keepalive');
        if (keepaliveOn) _startKeepalive(fresh);
    };

    // ====== 页面加载时恢复所有定时器 ======
    async function _restoreAllTimers() {
        try {
            var contacts = await contactDb.contacts.toArray();
            for (var i = 0; i < contacts.length; i++) {
                var contact = contacts[i];
                var keepaliveOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_keepalive');
                if (keepaliveOn) _startKeepalive(contact);

                var proactiveOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_proactive');
                if (proactiveOn) _startProactive(contact);

                // 打开页面立即发：若开启则在页面加载后随机延迟触发一次
                var proactiveOnOpenOn = await localforage.getItem('cd_settings_' + contact.id + '_toggle_proactive_onopen');
                if (proactiveOnOpenOn) {
                    var openDelay = (Math.floor(Math.random() * 13) + 3) * 1000;
                    (function(c) {
                        setTimeout(async function() {
                            try {
                                var fresh = await contactDb.contacts.get(c.id);
                                if (!fresh) return;
                                var stillOn = await localforage.getItem('cd_settings_' + fresh.id + '_toggle_proactive_onopen');
                                if (!stillOn) return;
                                await _bgTriggerWechatReply(fresh);
                            } catch(e2) {
                                console.error('[打开页面立即发] 失败', e2);
                            }
                        }, openDelay);
                    })(contact);
                }
            }
        } catch(e) {
            console.error('[恢复定时器] 失败', e);
        }
        _requestNotificationPermission().catch(function() {});
    }

    // 页面加载完成后启动
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(_restoreAllTimers, 2000);
    });
})();

