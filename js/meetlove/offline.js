// Auto-split from js/meetlove/meetlove-and-offline.js (933-1791)

// ====== Offline Chat Feature ======
(function() {
    var offlineDb = new Dexie('miniPhoneOfflineDB');
    offlineDb.version(1).stores({ messages: '++id, contactId, sender, content, timestamp' });

    var activeOfflineContact = null;
    var activeOfflineBubbleMsgId = null;
    var activeOfflineEditMsgId = null;
    var offlineReplying = false;
    var activeOfflineTriggerKey = '';
    var queuedOfflineTriggerPayload = null;
    var lastOfflineTriggerKey = '';
    var lastOfflineTriggerAt = 0;
    var OFFLINE_TRIGGER_DEDUPE_MS = 1600;

    function getOfflineSettingsKey(contact) {
        var target = contact || activeOfflineContact;
        return target ? ('offline_settings_' + target.id) : '';
    }

    function applyOfflineMessageBackground(src) {
        var msgBody = document.getElementById('offline-msg-container');
        if (!msgBody) return;
        if (src) {
            msgBody.style.background = 'url(' + src + ') center/cover no-repeat';
        } else {
            msgBody.style.background = '#f0ede8';
        }
    }

    function syncOfflineBackgroundPreview(src) {
        var previewImg = document.getElementById('offline-bg-preview-img');
        if (!previewImg) return;
        if (src) {
            previewImg.src = src;
            previewImg.style.display = 'block';
        } else {
            previewImg.src = '';
            previewImg.style.display = 'none';
        }
    }

    async function applyOfflineContactVisuals(contact) {
        var target = contact || activeOfflineContact;
        if (!target) {
            applyOfflineMessageBackground('');
            syncOfflineBackgroundPreview('');
            _applyOfflineCss('');
            return {};
        }
        var settings = {};
        try {
            settings = await localforage.getItem(getOfflineSettingsKey(target)) || {};
        } catch (e) {
            settings = {};
        }
        var bgImage = (typeof settings.bgImage === 'string' && settings.bgImage) ? settings.bgImage : '';
        applyOfflineMessageBackground(bgImage);
        syncOfflineBackgroundPreview(bgImage);
        _applyOfflineCss(typeof settings.customCss === 'string' ? settings.customCss : '');
        return settings;
    }

    function normalizeOfflineText(text) {
        return String(text || '').replace(/\r\n?/g, '\n');
    }

    function sanitizeOfflineMessageContent(text) {
        var cleaned = normalizeOfflineText(text)
            .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/www\.[^\s]+/gi, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n');

        cleaned = cleaned.split('\n').map(function(line) {
            return line.trim();
        }).join('\n');

        cleaned = cleaned.replace(/\n{2,}/g, '\n');
        return cleaned.trim();
    }

    function dedupeOfflineContentLines(text) {
        var normalized = normalizeOfflineText(text);
        if (!normalized) return '';
        var lines = normalized.split('\n').map(function(line) {
            return line.trim();
        }).filter(function(line) {
            return !!line;
        });
        if (!lines.length) return '';
        var compact = [];
        var prevLine = '';
        lines.forEach(function(line) {
            if (line === prevLine) return;
            compact.push(line);
            prevLine = line;
        });
        return compact.join('\n').trim();
    }

    function buildOfflineTriggerKey(contact, userText, sourceType, sourceMsgId) {
        var contactId = contact && contact.id ? String(contact.id) : '';
        var textSig = sanitizeOfflineMessageContent(userText || '').slice(0, 180);
        return [contactId, String(sourceType || 'send'), String(sourceMsgId || ''), textSig].join('|');
    }

    function createOfflineTextParagraph(line) {
        var normalizedLine = String(line || '').trim();
        if (!normalizedLine) return null;

        var narrationMatch = normalizedLine.match(/^\*([\s\S]+)\*$/);
        if (narrationMatch) {
            var em = document.createElement('em');
            em.className = 'offline-narration';
            em.textContent = narrationMatch[1].trim();
            return em;
        }

        var paragraph = document.createElement('div');
        paragraph.className = 'offline-paragraph';
        var pattern = /\*[^*]+\*|"[^"]*"|“[^”]*”/g;
        var lastIndex = 0;
        var match;

        while ((match = pattern.exec(normalizedLine)) !== null) {
            if (match.index > lastIndex) {
                paragraph.appendChild(document.createTextNode(normalizedLine.slice(lastIndex, match.index)));
            }
            if (match[0].charAt(0) === '*') {
                var narrationInline = document.createElement('em');
                narrationInline.className = 'offline-narration offline-narration-inline';
                narrationInline.textContent = match[0].slice(1, -1).trim();
                paragraph.appendChild(narrationInline);
            } else {
                var dialogue = document.createElement('span');
                dialogue.className = 'offline-dialogue';
                dialogue.textContent = match[0];
                paragraph.appendChild(dialogue);
            }
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < normalizedLine.length) {
            paragraph.appendChild(document.createTextNode(normalizedLine.slice(lastIndex)));
        }

        if (!paragraph.childNodes.length) {
            paragraph.textContent = normalizedLine;
        }

        return paragraph;
    }

    function renderOfflineMessageContent(container, rawContent) {
        if (!container) return;
        container.textContent = '';

        var cleaned = sanitizeOfflineMessageContent(rawContent);
        if (!cleaned) {
            return;
        }

        cleaned.split('\n').forEach(function(line) {
            var paragraph = createOfflineTextParagraph(line);
            if (paragraph) container.appendChild(paragraph);
        });
    }

    function formatOfflineTimestamp(ts) {
        var d = new Date(ts);
        var y = d.getFullYear();
        var mo = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        var h = String(d.getHours()).padStart(2, '0');
        var min = String(d.getMinutes()).padStart(2, '0');
        return y + '\u5e74' + mo + '\u6708' + day + '\u65e5 ' + h + ':' + min;
    }

    window.openOfflineChat = async function() {
        if (!activeChatContact) return;
        activeOfflineContact = activeChatContact;
        hideChatExtPanel();
        var titleEl = document.getElementById('offline-chat-title');
        if (titleEl) {
            var displayName = activeOfflineContact.roleName || '\u7ebf\u4e0b';
            titleEl.textContent = displayName;
            localforage.getItem('cd_settings_' + activeOfflineContact.id + '_remark').then(function(remark) {
                if (remark && remark !== '\u672a\u8bbe\u7f6e') titleEl.textContent = remark;
            }).catch(function() {});
        }
        var app = document.getElementById('offline-chat-app');
        if (app) app.style.display = 'flex';
        await applyOfflineContactVisuals(activeOfflineContact);
        await loadOfflineMessages();
        var input = document.getElementById('offline-input-field');
        if (input) {
            input.value = '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(input);
            else input.style.height = 'auto';
        }
    };

    window.closeOfflineChat = function() {
        var app = document.getElementById('offline-chat-app');
        if (app) app.style.display = 'none';
    };

    function ensureOfflineBubbleActionMenu() {
        var app = document.getElementById('offline-chat-app');
        if (!app) return null;
        var menu = document.getElementById('offline-bubble-action-menu');
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'offline-bubble-action-menu';
        menu.style.cssText = 'display:none;position:absolute;z-index:360;min-width:136px;background:rgba(255,255,255,0.98);border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,0.16);border:1px solid rgba(0,0,0,0.06);overflow:hidden;';
        menu.innerHTML =
            '<div data-action="edit" style="padding:12px 14px;font-size:13px;color:#333;cursor:pointer;border-bottom:1px solid #f2f2f2;">编辑</div>' +
            '<div data-action="delete" style="padding:12px 14px;font-size:13px;color:#d94848;cursor:pointer;border-bottom:1px solid #f2f2f2;">删除</div>' +
            '<div data-action="continue" style="padding:12px 14px;font-size:13px;color:#5b4a3f;cursor:pointer;">续写</div>';
        menu.addEventListener('click', async function(e) {
            var item = e.target && e.target.closest('[data-action]');
            if (!item) return;
            var action = item.getAttribute('data-action');
            if (!activeOfflineBubbleMsgId) return;
            if (action === 'edit') {
                await openOfflineEditModal(activeOfflineBubbleMsgId);
            } else if (action === 'delete') {
                await deleteOfflineMessage(activeOfflineBubbleMsgId);
            } else if (action === 'continue') {
                await continueOfflineMessage(activeOfflineBubbleMsgId);
            }
        });
        app.appendChild(menu);
        return menu;
    }

    function closeOfflineBubbleActionMenu() {
        var menu = document.getElementById('offline-bubble-action-menu');
        if (!menu) return;
        menu.style.display = 'none';
        activeOfflineBubbleMsgId = null;
    }

    function removeOfflineTypingIndicator() {
        var indicator = document.getElementById('offline-typing-indicator');
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    }

    function showOfflineTypingIndicator() {
        var container = document.getElementById('offline-msg-container');
        if (!container || !activeOfflineContact) return;
        removeOfflineTypingIndicator();
        var row = buildOfflineBubble({
            sender: 'role',
            content: '',
            timestamp: Date.now(),
            _typing: true
        });
        row.id = 'offline-typing-indicator';
        row.classList.add('offline-typing-row');
        container.appendChild(row);
        requestAnimationFrame(function() {
            container.scrollTop = container.scrollHeight;
        });
    }

    function showOfflineToast(text) {
        if (!text) return;
        window.showMiniToast(text, { bottom: 100, duration: 1800 });
    }

    function scheduleOfflineReply(contact, userText, sourceType, sourceMsgId) {
        if (!contact || !contact.id) return;
        var triggerKey = buildOfflineTriggerKey(contact, userText, sourceType, sourceMsgId);
        var now = Date.now();
        var dedupeMs = sourceType === 'continue' ? 450 : OFFLINE_TRIGGER_DEDUPE_MS;
        if (triggerKey && lastOfflineTriggerKey === triggerKey && (now - lastOfflineTriggerAt) < dedupeMs) {
            return;
        }
        if (offlineReplying) {
            if (triggerKey && triggerKey === activeOfflineTriggerKey) return;
            queuedOfflineTriggerPayload = {
                contact: contact,
                userText: userText || '',
                sourceType: sourceType || 'send',
                sourceMsgId: sourceMsgId || '',
                triggerKey: triggerKey
            };
            return;
        }
        triggerOfflineRoleReply(contact, userText || '', {
            sourceType: sourceType || 'send',
            sourceMsgId: sourceMsgId || '',
            triggerKey: triggerKey
        });
    }

    function openOfflineBubbleActionMenu(msgId, bubbleEl) {
        var menu = ensureOfflineBubbleActionMenu();
        var app = document.getElementById('offline-chat-app');
        if (!menu || !app || !bubbleEl || !msgId) return;
        activeOfflineBubbleMsgId = msgId;
        menu.style.display = 'block';

        var appRect = app.getBoundingClientRect();
        var bubbleRect = bubbleEl.getBoundingClientRect();
        var menuW = menu.offsetWidth || 136;
        var menuH = menu.offsetHeight || 132;
        var x = bubbleRect.left - appRect.left + (bubbleRect.width / 2) - (menuW / 2);
        var y = bubbleRect.top - appRect.top - menuH - 8;

        if (x < 10) x = 10;
        if (x + menuW > appRect.width - 10) x = appRect.width - menuW - 10;
        if (y < 10) y = bubbleRect.bottom - appRect.top + 8;
        if (y + menuH > appRect.height - 10) y = Math.max(10, appRect.height - menuH - 10);

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }

    function ensureOfflineEditModal() {
        var app = document.getElementById('offline-chat-app');
        if (!app) return null;
        var modal = document.getElementById('offline-edit-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'offline-edit-modal';
        modal.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(0,0,0,0.45);z-index:370;justify-content:center;align-items:flex-end;backdrop-filter:blur(6px);';
        modal.innerHTML =
            '<div id="offline-edit-sheet" style="width:100%;background:#fff;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;transform:translateY(100%);transition:transform 0.26s cubic-bezier(0.4,0,0.2,1);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div style="font-size:16px;font-weight:700;color:#333;">编辑对话</div>' +
                    '<div id="offline-edit-close-btn" style="font-size:20px;color:#bbb;cursor:pointer;line-height:1;">×</div>' +
                '</div>' +
                '<textarea id="offline-edit-textarea" style="width:100%;height:120px;max-height:220px;border:1px solid #eee;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.6;resize:none;outline:none;font-family:inherit;color:#333;background:#fafafa;"></textarea>' +
                '<div style="display:flex;gap:10px;">' +
                    '<button id="offline-edit-cancel-btn" type="button" style="flex:1;height:42px;border:none;border-radius:12px;background:#f3f3f3;color:#666;font-size:14px;cursor:pointer;">取消</button>' +
                    '<button id="offline-edit-save-btn" type="button" style="flex:1;height:42px;border:none;border-radius:12px;background:#6f5f53;color:#fff;font-size:14px;cursor:pointer;">保存</button>' +
                '</div>' +
            '</div>';
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeOfflineEditModal();
        });
        app.appendChild(modal);

        var closeBtn = document.getElementById('offline-edit-close-btn');
        var cancelBtn = document.getElementById('offline-edit-cancel-btn');
        var saveBtn = document.getElementById('offline-edit-save-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeOfflineEditModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeOfflineEditModal);
        if (saveBtn) saveBtn.addEventListener('click', saveOfflineEditedMessage);
        return modal;
    }

    async function openOfflineEditModal(msgId) {
        closeOfflineBubbleActionMenu();
        var modal = ensureOfflineEditModal();
        if (!modal) return;
        var msg = await offlineDb.messages.get(msgId);
        if (!msg) return;
        activeOfflineEditMsgId = msgId;
        var textarea = document.getElementById('offline-edit-textarea');
        if (textarea) {
            textarea.value = msg.content || '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(textarea);
        }
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            var sheet = document.getElementById('offline-edit-sheet');
            if (sheet) sheet.style.transform = 'translateY(0)';
            if (textarea) {
                textarea.focus();
                var textLength = textarea.value.length;
                if (typeof textarea.setSelectionRange === 'function') {
                    textarea.setSelectionRange(textLength, textLength);
                }
            }
        });
    }

    function closeOfflineEditModal() {
        var modal = document.getElementById('offline-edit-modal');
        var sheet = document.getElementById('offline-edit-sheet');
        if (!modal || !sheet) return;
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() {
            modal.style.display = 'none';
            activeOfflineEditMsgId = null;
        }, 260);
    }

    async function saveOfflineEditedMessage() {
        if (!activeOfflineEditMsgId) return;
        var textarea = document.getElementById('offline-edit-textarea');
        var nextText = textarea ? sanitizeOfflineMessageContent(textarea.value) : '';
        if (!nextText || !nextText.trim()) return;
        try {
            await offlineDb.messages.update(activeOfflineEditMsgId, { content: nextText });
            if (textarea) textarea.value = nextText;
            closeOfflineEditModal();
            await loadOfflineMessages();
        } catch (e) {
            console.error('编辑线下消息失败', e);
        }
    }

    async function deleteOfflineMessage(msgId) {
        closeOfflineBubbleActionMenu();
        if (!msgId) return;
        if (!await window.showMiniConfirm('确定要删除这条对话吗？')) return;
        try {
            await offlineDb.messages.delete(msgId);
            await loadOfflineMessages();
        } catch (e) {
            console.error('删除线下消息失败', e);
        }
    }

    async function continueOfflineMessage(msgId) {
        closeOfflineBubbleActionMenu();
        if (!activeOfflineContact) return;
        if (offlineReplying) {
            showOfflineToast('角色正在输入中');
            return;
        }
        try {
            var msg = await offlineDb.messages.get(msgId);
            scheduleOfflineReply(activeOfflineContact, msg ? (msg.content || '') : '', 'continue', msgId);
        } catch (e) {
            console.error('线下续写失败', e);
            removeOfflineTypingIndicator();
            showOfflineToast('续写失败');
        }
    }

    // ====== 线下管理：存档系统（每角色3个槽位）======
    window.openOfflineManage = async function() {
        if (!activeOfflineContact) return;
        var modal = document.getElementById('offline-manage-modal');
        var sheet = document.getElementById('offline-manage-sheet');
        if (!modal || !sheet) return;
        modal.style.display = 'flex';
        requestAnimationFrame(function() { sheet.style.transform = 'translateY(0)'; });
        await renderOfflineSlots();
    };

    window.closeOfflineManage = function() {
        var sheet = document.getElementById('offline-manage-sheet');
        var modal = document.getElementById('offline-manage-modal');
        if (sheet) sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { if (modal) modal.style.display = 'none'; }, 320);
    };

    async function renderOfflineSlots() {
        var listEl = document.getElementById('offline-slot-list');
        if (!listEl || !activeOfflineContact) return;
        listEl.innerHTML = '';
        var contactId = activeOfflineContact.id;
        for (var i = 1; i <= 3; i++) {
            var slotKey = 'offline_slot_' + contactId + '_' + i;
            var slotData = null;
            try { slotData = await localforage.getItem(slotKey); } catch(e) {}
            var slotEl = document.createElement('div');
            slotEl.style.cssText = 'background:#f7f8fa;border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border:1px solid #eee;';
            var leftDiv = document.createElement('div');
            leftDiv.style.cssText = 'display:flex;flex-direction:column;gap:3px;flex:1;overflow:hidden;';
            var slotTitle = document.createElement('div');
            slotTitle.style.cssText = 'font-size:14px;font-weight:600;color:#333;';
            slotTitle.textContent = '存档 ' + i;
            var slotDesc = document.createElement('div');
            slotDesc.style.cssText = 'font-size:11px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            if (slotData) {
                var d = new Date(slotData.savedAt || 0);
                var dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
                    + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                slotDesc.textContent = dStr + ' · ' + (slotData.msgCount || 0) + '条消息';
            } else {
                slotDesc.textContent = '空槽位';
            }
            leftDiv.appendChild(slotTitle);
            leftDiv.appendChild(slotDesc);
            var btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';
            if (slotData) {
                // 读取按钮
                var loadBtn = document.createElement('div');
                loadBtn.style.cssText = 'padding:6px 12px;background:#fff;border:none;border-radius:14px;font-size:12px;color:#555;cursor:pointer;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.08);';
                loadBtn.textContent = '读取';
                (function(idx) {
                    loadBtn.onclick = function() { loadOfflineSlot(idx); };
                })(i);
                btnGroup.appendChild(loadBtn);
            }
            // 存档按钮
            var saveBtn = document.createElement('div');
            saveBtn.style.cssText = 'padding:6px 12px;background:#fff;border:none;border-radius:14px;font-size:12px;color:#555;cursor:pointer;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.08);';
            saveBtn.textContent = '存档';
            (function(idx) {
                saveBtn.onclick = function() { saveOfflineSlot(idx); };
            })(i);
            btnGroup.appendChild(saveBtn);
            slotEl.appendChild(leftDiv);
            slotEl.appendChild(btnGroup);
            listEl.appendChild(slotEl);
        }
    }

    async function saveOfflineSlot(slotIndex) {
        if (!activeOfflineContact) return;
        var contactId = activeOfflineContact.id;
        try {
            var msgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            var slotKey = 'offline_slot_' + contactId + '_' + slotIndex;
            await localforage.setItem(slotKey, {
                messages: msgs,
                savedAt: Date.now(),
                msgCount: msgs.length
            });
            await renderOfflineSlots();
            showOfflineToast('存档 ' + slotIndex + ' 已保存');
        } catch(e) { console.error('存档失败', e); }
    }

    async function loadOfflineSlot(slotIndex) {
        if (!activeOfflineContact) return;
        if (!await window.showMiniConfirm('读取存档 ' + slotIndex + ' 将覆盖当前对话，确定吗？')) return;
        var contactId = activeOfflineContact.id;
        try {
            var slotKey = 'offline_slot_' + contactId + '_' + slotIndex;
            var slotData = await localforage.getItem(slotKey);
            if (!slotData || !slotData.messages) return;
            // 清空当前消息
            var allMsgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            await offlineDb.messages.bulkDelete(allMsgs.map(function(m) { return m.id; }));
            // 写入存档消息（去掉id让IndexedDB自动分配）
            var newMsgs = slotData.messages.map(function(m) {
                return { contactId: m.contactId, sender: m.sender, content: m.content, timestamp: m.timestamp };
            });
            if (newMsgs.length > 0) await offlineDb.messages.bulkAdd(newMsgs);
            closeOfflineManage();
            await loadOfflineMessages();
        } catch(e) { console.error('读取存档失败', e); alert('读取失败: ' + e.message); }
    }

    window.offlineNewChat = async function() {
        if (!activeOfflineContact) return;
        if (!await window.showMiniConfirm('新建对话将清空当前所有消息，确定吗？')) return;
        var contactId = activeOfflineContact.id;
        try {
            var allMsgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            await offlineDb.messages.bulkDelete(allMsgs.map(function(m) { return m.id; }));
            closeOfflineManage();
            var container = document.getElementById('offline-msg-container');
            if (container) container.innerHTML = '';
        } catch(e) { console.error('新建失败', e); }
    };

    // ====== 线下设置侧边栏 ======
    window.openOfflineSettings = async function() {
        if (!activeOfflineContact) return;
        var overlay = document.getElementById('offline-settings-overlay');
        var sidebar = document.getElementById('offline-settings-sidebar');
        if (!overlay || !sidebar) return;
        overlay.style.display = 'block';
        sidebar.style.display = 'flex';
        requestAnimationFrame(function() { sidebar.style.transform = 'translateX(0)'; });
        // 恢复已保存设置
        var contactId = activeOfflineContact.id;
        try {
            var settings = await localforage.getItem('offline_settings_' + contactId) || {};
            var wordMinEl = document.getElementById('offline-word-min');
            var wordMaxEl = document.getElementById('offline-word-max');
            if (wordMinEl) wordMinEl.value = settings.wordMin || 100;
            if (wordMaxEl) wordMaxEl.value = settings.wordMax || 500;
            // 视角
            var perspVal = settings.perspective || 'second';
            var perspEl = document.getElementById('offline-persp-' + perspVal);
            if (perspEl) perspEl.checked = true;
            // 文风
            var styleEl = document.getElementById('offline-writing-style');
            if (styleEl) styleEl.value = settings.writingStyle !== undefined ? settings.writingStyle : '温柔细腻，笔触细腻，情感丰富，如涓涓细流般娓娓道来，充满诗意与温度';
            // 剧情背景
            var plotEl = document.getElementById('offline-plot-bg');
            if (plotEl) plotEl.value = settings.plotBg || '';
            // CSS
            var cssEl = document.getElementById('offline-custom-css');
            if (cssEl) cssEl.value = settings.customCss || '';
            syncOfflineBackgroundPreview(settings.bgImage || '');
            _applyOfflineCss(typeof settings.customCss === 'string' ? settings.customCss : '');
        } catch(e) {}
    };

    window.closeOfflineSettings = function() {
        var overlay = document.getElementById('offline-settings-overlay');
        var sidebar = document.getElementById('offline-settings-sidebar');
        if (sidebar) sidebar.style.transform = 'translateX(100%)';
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
        }, 320);
    };

    window.offlineSaveSettings = async function() {
        if (!activeOfflineContact) return;
        var contactId = activeOfflineContact.id;
        var wordMin = parseInt(document.getElementById('offline-word-min').value) || 100;
        var wordMax = parseInt(document.getElementById('offline-word-max').value) || 500;
        var perspEl = document.querySelector('input[name="offline-perspective"]:checked');
        var perspective = perspEl ? perspEl.value : 'second';
        var writingStyle = document.getElementById('offline-writing-style').value.trim();
        var plotBg = document.getElementById('offline-plot-bg').value.trim();
        var customCss = document.getElementById('offline-custom-css').value.trim();
        // 读取已有设置（保留bgImage）
        var existing = await localforage.getItem('offline_settings_' + contactId) || {};
        var settings = Object.assign(existing, { wordMin, wordMax, perspective, writingStyle, plotBg, customCss });
        await localforage.setItem('offline_settings_' + contactId, settings);
        // 应用CSS
        _applyOfflineCss(customCss);
        closeOfflineSettings();
        showOfflineToast('设置已保存');
    };

    window.offlineChangeBg = async function(event) {
        var file = event.target.files[0];
        if (!file || !activeOfflineContact) return;
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            syncOfflineBackgroundPreview(base64);
            applyOfflineMessageBackground(base64);
            // 持久化
            var settings = await localforage.getItem(getOfflineSettingsKey(activeOfflineContact)) || {};
            settings.bgImage = base64;
            await localforage.setItem(getOfflineSettingsKey(activeOfflineContact), settings);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    window.offlineResetBg = async function() {
        if (!activeOfflineContact) return;
        applyOfflineMessageBackground('');
        syncOfflineBackgroundPreview('');
        var settings = await localforage.getItem(getOfflineSettingsKey(activeOfflineContact)) || {};
        delete settings.bgImage;
        await localforage.setItem(getOfflineSettingsKey(activeOfflineContact), settings);
    };

    window.offlineApplyCss = function() {
        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) _applyOfflineCss(cssEl.value.trim());
    };

    window.offlineResetCss = async function() {
        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) cssEl.value = '';
        _applyOfflineCss('');
        if (activeOfflineContact) {
            var contactId = activeOfflineContact.id;
            var settings = await localforage.getItem('offline_settings_' + contactId) || {};
            settings.customCss = '';
            await localforage.setItem('offline_settings_' + contactId, settings);
        }
    };

    function scopeOfflineCustomCss(css) {
        var raw = String(css || '').trim();
        if (!raw) return '';
        if (raw.indexOf('#offline-chat-app') !== -1) return raw;
        return raw.replace(/(^|})\s*([^@}{][^{}]*)\{/g, function(match, prefix, selectorText) {
            var scopedSelector = selectorText.split(',').map(function(item) {
                var selector = String(item || '').trim();
                if (!selector) return '';
                if (selector.indexOf('#offline-chat-app') !== -1) return selector;
                if (selector === ':root' || selector === 'html' || selector === 'body' || selector === '*') {
                    return '#offline-chat-app';
                }
                return '#offline-chat-app ' + selector;
            }).filter(function(item) {
                return !!item;
            }).join(', ');
            if (!scopedSelector) return match;
            return (prefix || '') + '\n' + scopedSelector + ' {';
        });
    }

    function _applyOfflineCss(css) {
        var styleId = 'offline-custom-style';
        var existing = document.getElementById(styleId);
        if (!existing) {
            existing = document.createElement('style');
            existing.id = styleId;
            document.head.appendChild(existing);
        }
        existing.textContent = scopeOfflineCustomCss(css);
    }

    /* ====== 线下CSS模板提取 ====== */
    window.offlineExtractCssTemplate = function() {
        var template = [
            '/* ====== 线下聊天 CSS 模板 ======',
            '   复制此内容到「自定义页面CSS」中，按需修改后点击「应用」。',
            '   ============================== */',
            '',
            '/* --- 全局背景 --- */',
            '.offline-msg-body {',
            '    background: #f0ede8;          /* 聊天区域背景色 */',
            '    padding: 16px 14px 90px;      /* 内边距 */',
            '    gap: 18px;                    /* 气泡间距 */',
            '}',
            '',
            '/* --- 头像（行外小头像） --- */',
            '.offline-avatar {',
            '    width: 38px;',
            '    height: 38px;',
            '    border-radius: 50%;',
            '    border: 2px solid #fff;',
            '    box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
            '}',
            '',
            '/* --- 气泡包裹器（控制整体宽度） --- */',
            '.offline-bubble-wrap {',
            '    width: 260px;',
            '    min-width: 260px;',
            '    max-width: 260px;',
            '    gap: 4px;',
            '}',
            '',
            '/* --- 气泡头部（内嵌头像+名字+时间戳） --- */',
            '.offline-bubble-header {',
            '    padding: 10px 14px 6px;',
            '    gap: 8px;',
            '}',
            '',
            '/* --- 气泡头部内嵌头像 --- */',
            '.offline-bubble-avatar {',
            '    width: 36px;',
            '    height: 36px;',
            '    border-radius: 50%;',
            '    border: 1.5px solid rgba(255,255,255,0.7);',
            '}',
            '',
            '/* --- 气泡内名字标签 --- */',
            '.offline-bubble-name {',
            '    font-size: 11px;',
            '    font-weight: 600;',
            '    color: rgba(58,48,40,0.6);',
            '}',
            '',
            '/* --- 气泡内时间戳 --- */',
            '.offline-bubble-time {',
            '    font-size: 10px;',
            '    color: rgba(58,48,40,0.4);',
            '}',
            '',
            '/* --- 气泡正文 --- */',
            '.offline-bubble-text {',
            '    padding: 4px 14px 12px;',
            '    font-size: 14px;',
            '    line-height: 1.7;',
            '    color: #3a3028;',
            '}',
            '',
            '/* --- 用户气泡（右侧） --- */',
            '.offline-me .offline-bubble {',
            '    background: #f5f1ec;          /* 右侧气泡背景色 */',
            '    border-radius: 20px;',
            '    box-shadow: 0 2px 12px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 角色气泡（左侧） --- */',
            '.offline-role .offline-bubble {',
            '    background: #ffffff;          /* 左侧气泡背景色 */',
            '    border-radius: 20px;',
            '    box-shadow: 0 2px 12px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 旁白文字（斜体灰色） --- */',
            '.offline-narration {',
            '    color: #9a9088;',
            '    font-style: italic;',
            '    font-size: 13px;',
            '    line-height: 1.7;',
            '}',
            '',
            '/* --- 对话文字（正常加粗） --- */',
            '.offline-dialogue {',
            '    color: #1a1410;',
            '    font-style: normal;',
            '    font-weight: 500;',
            '}',
            '',
            '/* --- 输入框区域 --- */',
            '.offline-input-wrap {',
            '    background: rgba(255,255,255,0.92);',
            '    border-radius: 22px;',
            '    border: 1px solid rgba(255,255,255,0.8);',
            '    box-shadow: 0 4px 20px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 发送按钮 --- */',
            '.offline-send-btn {',
            '    background: #7a6e64;',
            '    box-shadow: 0 3px 10px rgba(122,110,100,0.35);',
            '}',
            '',
            '/* --- 顶部导航栏 --- */',
            '.offline-header {',
            '    background: rgba(240,237,232,0.92);',
            '    border-bottom: 1px solid rgba(0,0,0,0.06);',
            '}',
            '',
            '.offline-header-title {',
            '    font-size: 16px;',
            '    font-weight: 700;',
            '    color: #3a3028;',
            '}',
        ].join('\n');

        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) {
            cssEl.value = template;
            cssEl.focus();
            /* 滚动到顶部方便查看 */
            cssEl.scrollTop = 0;
        }
        /* 提示用户 */
        var btn = document.querySelector('[onclick="offlineExtractCssTemplate()"]');
        if (btn) {
            var orig = btn.textContent;
            btn.textContent = '已填入模板！';
            btn.style.background = '#e8f5e9';
            btn.style.color = '#4caf50';
            btn.style.borderColor = '#c8e6c9';
            setTimeout(function() {
                btn.textContent = orig;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 2000);
        }
    };

    async function loadOfflineMessages() {
        var container = document.getElementById('offline-msg-container');
        if (!container || !activeOfflineContact) return;
        container.innerHTML = '';
        closeOfflineBubbleActionMenu();
        removeOfflineTypingIndicator();
        try {
            var msgs = await offlineDb.messages.where('contactId').equals(activeOfflineContact.id).toArray();
            msgs.forEach(function(msg) { container.appendChild(buildOfflineBubble(msg)); });
            requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
        } catch(e) { console.error('load offline messages failed', e); }
    }

    function buildOfflineBubble(msg) {
        var isTyping = !!(msg && msg._typing);
        var isMe = msg.sender === 'me';
        var contact = activeOfflineContact;
        var userAvatar = contact ? (contact.userAvatar || '') : '';
        var roleAvatar = contact ? (contact.roleAvatar || '') : '';
        var userName = '我';
        var roleName = contact ? (contact.roleName || '角色') : '角色';
        try {
            var myNameEl = document.getElementById('text-wechat-me-name');
            if (myNameEl && myNameEl.textContent) userName = myNameEl.textContent;
        } catch(e) {}

        var avatar = isMe ? userAvatar : roleAvatar;
        var name = isMe ? userName : roleName;
        var rowClass = isMe ? 'offline-msg-row offline-me' : 'offline-msg-row offline-role';
        var tsText = formatOfflineTimestamp(msg.timestamp || Date.now());
        var placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        var row = document.createElement('div');
        row.className = rowClass;

        var wrap = document.createElement('div');
        wrap.className = 'offline-bubble-wrap';

        // 气泡本体（无尖角，头像+名字+时间戳都在气泡内）
        var bubble = document.createElement('div');
        bubble.className = 'offline-bubble';
        if (isTyping) bubble.className += ' offline-bubble-typing';

        // 气泡头部：头像 + 名字 + 时间戳
        var header = document.createElement('div');
        header.className = 'offline-bubble-header';

        var avatarInner = document.createElement('div');
        avatarInner.className = 'offline-bubble-avatar';
        var img = document.createElement('img');
        img.src = avatar || placeholder;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        avatarInner.appendChild(img);

        var meta = document.createElement('div');
        meta.className = 'offline-bubble-meta';

        var nameEl = document.createElement('div');
        nameEl.className = 'offline-bubble-name';
        nameEl.textContent = name;

        var timeEl = document.createElement('div');
        timeEl.className = 'offline-bubble-time';
        timeEl.textContent = tsText;

        meta.appendChild(nameEl);
        meta.appendChild(timeEl);

        header.appendChild(avatarInner);
        header.appendChild(meta);

        // 气泡正文（旁白灰色斜体，对话黑色正体）
        var textEl = document.createElement('div');
        textEl.className = 'offline-bubble-text';
        if (isTyping) {
            textEl.className += ' offline-typing-text';
            textEl.innerHTML = '<span class="offline-typing-label">正在输入...</span>';
        } else {
            renderOfflineMessageContent(textEl, msg.content || '');
        }

        bubble.appendChild(header);
        bubble.appendChild(textEl);
        if (!isTyping && msg && msg.id) {
            bubble.setAttribute('data-msg-id', String(msg.id));
            bubble.style.cursor = 'pointer';
            bubble.addEventListener('click', function(e) {
                e.stopPropagation();
                openOfflineBubbleActionMenu(msg.id, bubble);
            });
        }
        wrap.appendChild(bubble);
        row.appendChild(wrap);
        return row;
    }

    window.offlineSendMessage = async function() {
        var input = document.getElementById('offline-input-field');
        if (!input || !activeOfflineContact) return;
        var content = input.value;
        if (!content || !content.trim()) return;
        var container = document.getElementById('offline-msg-container');
        var ts = Date.now();
        var normalizedContent = sanitizeOfflineMessageContent(content);
        if (!normalizedContent) return;
        try {
            var newId = await offlineDb.messages.add({
                contactId: activeOfflineContact.id,
                sender: 'me',
                content: normalizedContent,
                timestamp: ts
            });
            input.value = '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(input);
            else input.style.height = 'auto';
            var msg = { id: newId, contactId: activeOfflineContact.id, sender: 'me', content: normalizedContent, timestamp: ts };
            container.appendChild(buildOfflineBubble(msg));
            requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
            scheduleOfflineReply(activeOfflineContact, normalizedContent, 'send', newId);
        } catch(e) { console.error('send offline message failed', e); }
    };

    async function triggerOfflineRoleReply(contact, userText, meta) {
        if (!contact || !contact.id) return;
        var triggerMeta = meta || {};
        var triggerKey = triggerMeta.triggerKey || buildOfflineTriggerKey(contact, userText, triggerMeta.sourceType, triggerMeta.sourceMsgId);
        var nowTs = Date.now();
        var triggerDedupeMs = triggerMeta.sourceType === 'continue' ? 450 : OFFLINE_TRIGGER_DEDUPE_MS;
        if (triggerKey && lastOfflineTriggerKey === triggerKey && (nowTs - lastOfflineTriggerAt) < triggerDedupeMs) {
            return;
        }
        if (offlineReplying) {
            if (triggerKey && triggerKey === activeOfflineTriggerKey) return;
            queuedOfflineTriggerPayload = {
                contact: contact,
                userText: userText || '',
                sourceType: triggerMeta.sourceType || 'send',
                sourceMsgId: triggerMeta.sourceMsgId || '',
                triggerKey: triggerKey
            };
            return;
        }

        offlineReplying = true;
        activeOfflineTriggerKey = triggerKey || '';
        lastOfflineTriggerKey = triggerKey || '';
        lastOfflineTriggerAt = nowTs;

        var container = document.getElementById('offline-msg-container');
        showOfflineTypingIndicator();
        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            if (!apiUrl || !apiKey || !model) {
                showOfflineToast('请先配置聊天 API');
                return;
            }

            var ctxLimit = (typeof window.readMiniApiContextLimit === 'function')
                ? await window.readMiniApiContextLimit(20)
                : 20;

            var allMsgs = await offlineDb.messages.where('contactId').equals(contact.id).toArray();
            var recentMsgs = allMsgs.slice(-ctxLimit);

            var allOnlineMsgs = [];
            try {
                allOnlineMsgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
                allOnlineMsgs = allOnlineMsgs.filter(function(m) {
                    return m && m.source !== 'sms' && m.sender !== 'system' && !m.isSystemTip && !m.isRecalled;
                });
            } catch (eOnline) {
                allOnlineMsgs = [];
            }
            var recentOnlineMsgs = allOnlineMsgs.slice(-ctxLimit);

            var offlineSettings = await localforage.getItem('offline_settings_' + contact.id) || {};
            var wordMin = Math.max(50, parseInt(offlineSettings.wordMin, 10) || 100);
            var wordMax = Math.max(wordMin, parseInt(offlineSettings.wordMax, 10) || 500);
            var perspectiveMap = { first: '第一人称', second: '第二人称', third: '第三人称' };
            var perspective = perspectiveMap[offlineSettings.perspective] || '第二人称';
            var writingStyle = String(offlineSettings.writingStyle || '').trim();
            var plotBg = String(offlineSettings.plotBg || '').trim();

            var now = new Date();
            var weeks2 = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d'];
            var timeStr = now.getFullYear() + '\u5e74' + (now.getMonth() + 1) + '\u6708' + now.getDate() + '\u65e5 ' +
                weeks2[now.getDay()] + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

            var onlineMemoryText = '';
            if (typeof buildOnlineCrossModeMemoryText === 'function') {
                onlineMemoryText = await buildOnlineCrossModeMemoryText(contact, ctxLimit, allOnlineMsgs);
            } else if (recentOnlineMsgs.length > 0) {
                var roleNameFallback = contact.roleName || '角色';
                onlineMemoryText = recentOnlineMsgs.map(function(m) {
                    var sender = m.sender === 'me' ? '用户' : roleNameFallback;
                    var text = typeof extractMsgPureText === 'function'
                        ? extractMsgPureText(m.content || '')
                        : String(m.content || '');
                    text = String(text || '').trim();
                    if (!text) return '';
                    return sender + '：' + text;
                }).filter(function(line) {
                    return !!line;
                }).join('\n');
            }

            var memorySummaryText = '';
            if (typeof getContactSummaryHistoryText === 'function') {
                memorySummaryText = await getContactSummaryHistoryText(contact.id);
            }

            var worldbookSeedTexts = [];
            recentOnlineMsgs.forEach(function(m) {
                var text = typeof extractMsgPureText === 'function'
                    ? extractMsgPureText(m.content || '')
                    : String(m.content || '');
                text = String(text || '').trim();
                if (text) worldbookSeedTexts.push(text);
            });
            recentMsgs.forEach(function(m) {
                var text = String(m.content || '').trim();
                if (text) worldbookSeedTexts.push(text);
            });
            var worldbookText = '';
            if (typeof buildContactWorldbookContextText === 'function') {
                worldbookText = await buildContactWorldbookContextText(contact, worldbookSeedTexts);
            }

            var sysPrompt = '【角色身份锚点】你现在就是「' + (contact.roleName || '角色') + '」，正在与用户进行一段真实、连续发生的线下见面。\n' +
                '【线下模式铁律】\n' +
                '1. 线下剧情和线上聊天属于同一段关系连续体，必须承接已经发生的事实，不要失忆，不要重新自我介绍。\n' +
                '2. 你可以描写环境、动作、距离、表情和氛围，但绝对不允许替用户决定动作、心理、反应和台词。\n' +
                '3. 输出必须是自然中文纯文本，不要JSON，不要列表，不要解释，不要Markdown，不要代码块，不要行内代码，不要网址，不要链接。\n' +
                '4. 旁白必须用星号包裹，如 *你靠近了一点*；真正说出口的话必须放在双引号内，如 "我在这里"；段落之间最多只换行一次，不要连续空行。\n' +
                '5. 叙述视角固定为' + perspective + '，整体长度控制在' + wordMin + '-' + wordMax + '字之间。\n' +
                '6. 文字要像真人，不要模板化抒情，不要空泛总结，优先承接刚刚发生的细节、情绪和动作。\n' +
                '【时间】' + timeStr + '\n';
            if (writingStyle) sysPrompt += '【文风要求】' + writingStyle + '\n';
            if (plotBg) sysPrompt += '【当前剧情背景】' + plotBg + '\n';
            if (contact.roleDetail) sysPrompt += '角色设定：' + contact.roleDetail + '\n';
            if (contact.userDetail) sysPrompt += '用户设定：' + contact.userDetail + '\n';
            if (memorySummaryText) {
                sysPrompt += '【长期记忆摘要】以下内容是你们已经共同经历过的事实，请带着它继续线下互动，不要和它冲突：\n' + memorySummaryText + '\n';
            }
            if (worldbookText) {
                sysPrompt += '【背景与设定信息】\n' + worldbookText + '\n';
            }
            if (onlineMemoryText) {
                sysPrompt += '【跨模式记忆：线上聊天】以下为你们最近在线上聊过的内容。线下续写时必须视为已发生事实并自然延续：\n' + onlineMemoryText + '\n';
            }

            var messages = [{ role: 'system', content: sysPrompt }];
            recentMsgs.forEach(function(m) {
                messages.push({ role: m.sender === 'me' ? 'user' : 'assistant', content: m.content });
            });
            if (recentMsgs.length === 0) {
                messages.push({ role: 'user', content: '请承接我们已经发生过的线上关系和当前背景，开启这次线下见面的第一段互动。' });
            } else if (recentMsgs[recentMsgs.length - 1].sender !== 'me' || triggerMeta.sourceType === 'continue') {
                messages.push({ role: 'user', content: '请紧接上一段线下剧情继续自然推进。' });
            }

            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) {
                var errorText = '';
                try { errorText = await response.text(); } catch (eRead) {}
                console.warn('offline reply http error', response.status, errorText);
                showOfflineToast('线下回复失败 (' + response.status + ')');
                return;
            }

            var data = await response.json();
            var rawChoice = data && data.choices && data.choices[0] ? data.choices[0] : null;
            var replyText = '';
            if (rawChoice && rawChoice.message) {
                if (typeof rawChoice.message.content === 'string') {
                    replyText = rawChoice.message.content;
                } else if (Array.isArray(rawChoice.message.content)) {
                    replyText = rawChoice.message.content.map(function(part) {
                        if (!part) return '';
                        if (typeof part === 'string') return part;
                        if (typeof part.text === 'string') return part.text;
                        if (part.type === 'text' && typeof part.content === 'string') return part.content;
                        return '';
                    }).join('\n');
                }
            }
            if (!replyText && rawChoice && typeof rawChoice.text === 'string') {
                replyText = rawChoice.text;
            }
            replyText = String(replyText || '').trim();
            if (!replyText) {
                showOfflineToast('模型未返回有效内容');
                return;
            }

            try {
                var parsed = JSON.parse(replyText);
                if (parsed && parsed.content) replyText = parsed.content;
                else if (Array.isArray(parsed) && parsed[0] && parsed[0].content) replyText = parsed[0].content;
            } catch (e2) {}

            replyText = dedupeOfflineContentLines(sanitizeOfflineMessageContent(replyText));
            if (!replyText) {
                showOfflineToast('模型未返回可显示文本');
                return;
            }

            var replyTs = Date.now();
            var replyId = await offlineDb.messages.add({
                contactId: contact.id,
                sender: 'role',
                content: replyText,
                timestamp: replyTs
            });
            var app = document.getElementById('offline-chat-app');
            if (app && app.style.display === 'flex' && activeOfflineContact && activeOfflineContact.id === contact.id) {
                var replyMsg = { id: replyId, contactId: contact.id, sender: 'role', content: replyText, timestamp: replyTs };
                removeOfflineTypingIndicator();
                container.appendChild(buildOfflineBubble(replyMsg));
                requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
            }
        } catch (e) {
            console.error('offline role reply failed', e);
            showOfflineToast('线下回复失败');
        } finally {
            removeOfflineTypingIndicator();
            offlineReplying = false;
            activeOfflineTriggerKey = '';

            var queuedPayload = queuedOfflineTriggerPayload;
            queuedOfflineTriggerPayload = null;
            if (queuedPayload && activeOfflineContact && queuedPayload.contact && activeOfflineContact.id === queuedPayload.contact.id) {
                scheduleOfflineReply(queuedPayload.contact, queuedPayload.userText, queuedPayload.sourceType, queuedPayload.sourceMsgId);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        var offlineInput = document.getElementById('offline-input-field');
        if (offlineInput) {
            offlineInput.addEventListener('input', function() {
                if (typeof autoGrowTextarea === 'function') autoGrowTextarea(this);
                else {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
                }
            });
        }
        document.addEventListener('keydown', function(e) {
            var modal = document.getElementById('offline-edit-modal');
            var textarea = document.getElementById('offline-edit-textarea');
            if (!modal || modal.style.display !== 'flex' || !textarea || document.activeElement !== textarea) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                saveOfflineEditedMessage();
            }
        });
        var offlineContainer = document.getElementById('offline-msg-container');
        if (offlineContainer) {
            offlineContainer.addEventListener('scroll', function() {
                closeOfflineBubbleActionMenu();
            }, { passive: true });
        }
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#offline-bubble-action-menu') && !e.target.closest('.offline-bubble')) {
                closeOfflineBubbleActionMenu();
            }
        });
    });

})();
