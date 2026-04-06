// Auto-split from js/messaging/sms-and-notify.js (1-690)

// ====== 信息应用（SMS）功能逻辑 ======
(function() {
    // 信息应用独立的数据库（与WeChat聊天共用 chatListDb/contactDb，但界面完全独立）
    // activeSmsContact: 当前信息聊天的联系人
    var activeSmsContact = null;
    var smsIsReplying = false;
    var smsListRenderToken = 0;
    var smsReplyLocks = Object.create(null);

    function _getSmsLockId(target) {
        if (!target) return '';
        return String(typeof target === 'object' ? (target.id || '') : target);
    }

    function _syncSmsReplyFlag() {
        smsIsReplying = Object.keys(smsReplyLocks).length > 0;
    }

    function _isSmsContactReplyLocked(target) {
        var lockId = _getSmsLockId(target);
        return !!(lockId && smsReplyLocks[lockId]);
    }

    function _setSmsContactReplyLocked(target, locked) {
        var lockId = _getSmsLockId(target);
        if (!lockId) return;
        if (locked) smsReplyLocks[lockId] = true;
        else delete smsReplyLocks[lockId];
        _syncSmsReplyFlag();
    }

    async function _getSmsDisplayName(contact, fallback) {
        var displayName = fallback || (contact && contact.roleName) || '联系人';
        if (!contact || !contact.id) return displayName;
        try {
            var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') displayName = remark;
        } catch(e) {}
        return displayName;
    }

    // 获取12小时制时间字符串（与WeChat一致）
    function getSmsTime() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var ampm = h >= 12 ? '下午' : '上午';
        h = h % 12 || 12;
        return ampm + ' ' + h + ':' + (m < 10 ? '0' + m : m);
    }

    async function readSmsCtxLimit(fallback) {
        if (typeof window.readMiniApiContextLimit === 'function') {
            return await window.readMiniApiContextLimit(fallback);
        }
        var raw = await localforage.getItem('miffy_api_ctx');
        var value = parseInt(raw, 10);
        var base = parseInt(fallback, 10);
        if (!isFinite(base) || isNaN(base)) base = 20;
        if (!isFinite(value) || isNaN(value)) value = base;
        if (value < 10) value = 10;
        if (value > 200) value = 200;
        return value;
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
    window.openSmsApp = openSmsApp;

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
        var displayName = await _getSmsDisplayName(contact, contact.roleName || '角色姓名');
        document.getElementById('sms-chat-name').textContent = displayName;
        document.getElementById('sms-chat-sub').textContent = 'TEXT MESSAGE';

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
    window.openSmsConversation = async function(contactId) {
        openSmsApp();
        await enterSmsChat(contactId);
    };

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

            row._smsTs = null;
            row._smsTe = function() {
                if (smsLongPressTimer) { clearTimeout(smsLongPressTimer); smsLongPressTimer = null; }
            };
            row._smsTm = function() {
                if (smsLongPressTimer) { clearTimeout(smsLongPressTimer); smsLongPressTimer = null; }
            };
            row._smsCm = function(e) {
                e.preventDefault();
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
        if (!activeSmsContact || _isSmsContactReplyLocked(activeSmsContact)) return;
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
        if (!lockedContact || _isSmsContactReplyLocked(lockedContact)) return;
        _setSmsContactReplyLocked(lockedContact, true);

        var smsWinCheck = document.getElementById('sms-chat-window');
        var container = document.getElementById('sms-msg-container');
        var typingId = 'sms-typing-indicator-' + lockedContact.id;
        var isCurrentSmsChatActive = smsWinCheck && smsWinCheck.style.display === 'flex' && activeSmsContact && activeSmsContact.id === lockedContact.id;

        // 显示"正在输入"气泡（仅当SMS窗口打开时）
        if (isCurrentSmsChatActive && container) {
            var typingRow = document.createElement('div');
            typingRow.className = 'sms-msg-row sms-role';
            typingRow.id = typingId;
            var typingBubble = document.createElement('div');
            typingBubble.className = 'sms-typing-bubble';
            typingBubble.innerHTML = '<div class="sms-typing-dot"></div><div class="sms-typing-dot"></div><div class="sms-typing-dot"></div>';
            typingRow.appendChild(typingBubble);
            container.appendChild(typingRow);
            container.scrollTop = container.scrollHeight;
        }

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            var ctxLimit = await readSmsCtxLimit(20);

            if (!apiUrl || !apiKey || !model) {
                // 没有配置API，移除输入指示器
                var tipEl = document.getElementById(typingId);
                if (tipEl) tipEl.remove();
                _setSmsContactReplyLocked(lockedContact, false);
                return;
            }

            var rawMessages = await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray();
            var recentMessages = rawMessages.slice(-ctxLimit);

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
                '【语气要求】简洁自然，符合短信风格，不超过50字。';

            if (lockedContact.roleDetail) sysPrompt += '\n角色设定：' + lockedContact.roleDetail;
            if (lockedContact.userDetail) sysPrompt += '\n用户设定：' + lockedContact.userDetail;

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
            } else {
                await chatListDb.chats.add({
                    id: Date.now().toString(),
                    contactId: lockedContact.id,
                    lastTime: replyTimeStr
                });
            }
            renderSmsList();

            // 移除输入指示器
            var tipEl2 = document.getElementById(typingId);
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
                var bannerName = await _getSmsDisplayName(lockedContact, lockedContact.roleName || '短信');
                showNotificationBanner(lockedContact.roleAvatar || '', bannerName, replyText, replyTimeStr, lockedContact.id, 'sms');
            }

        } catch(e) {
            console.error('短信角色回复失败', e);
            var tipEl3 = document.getElementById(typingId);
            if (tipEl3) tipEl3.remove();
        }

        _setSmsContactReplyLocked(lockedContact, false);

        // 角色回复完成后，检查是否要解除对用户的拉黑
        try {
            var apiUrlForUnblock = await localforage.getItem('miffy_api_url');
            var apiKeyForUnblock = await localforage.getItem('miffy_api_key');
            var modelForUnblock = await localforage.getItem('miffy_api_model');
            var tempForUnblock = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            var ctxLimitForUnblock = await readSmsCtxLimit(20);
        await checkRoleUnblockAfterSmsReply(lockedContact, apiUrlForUnblock, apiKeyForUnblock, modelForUnblock, tempForUnblock, ctxLimitForUnblock);
        } catch(eUnblock) { console.error('解除拉黑检查失败', eUnblock); }
    }

})();

