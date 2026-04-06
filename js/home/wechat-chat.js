// Auto-split from js/home/home-and-novel.js (139-1951)

    // ====== 聊天窗口核心逻辑 (全局作用域) ======
    let activeChatContact = null;
    // 线上/线下记忆互通：读取线下消息作为跨模式上下文
    const crossModeOfflineDb = new Dexie('miniPhoneOfflineDB');
    crossModeOfflineDb.version(1).stores({ messages: '++id, contactId, sender, content, timestamp' });
    // ====== 角色隔离锁：防止多角色并发串台 ======
    // 每次 triggerRoleReply / appendRoleMessage 都只认锁定时刻的联系人，
    // 绝不使用全局 activeChatContact 进行消息写入或UI渲染，彻底杜绝串台。
    let currentLongPressMsgId = null;
    // 横幅通知控制函数
    let notifTimer = null;
    // 修改：新增 contactId 参数用于点击跳转
    // 通知队列：支持多条消息依次显示，每条显示2秒后自动切换到下一条
    let _notifQueue = [];
    let _notifPlaying = false;
    const DEFAULT_AVATAR_DATA_URI = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
        '<defs><linearGradient id="mini-avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#edf2f7"/><stop offset="100%" stop-color="#d9e2ec"/>' +
        '</linearGradient></defs>' +
        '<rect width="96" height="96" rx="28" fill="url(#mini-avatar-gradient)"/>' +
        '<circle cx="48" cy="35" r="18" fill="#b9c4d0"/>' +
        '<path d="M20 84c4-16 16-24 28-24s24 8 28 24" fill="#b9c4d0"/>' +
        '</svg>'
    );

    function getSafeAvatarSrc(raw) {
        if (typeof raw === 'string' && raw.trim()) return raw.trim();
        return DEFAULT_AVATAR_DATA_URI;
    }

    function applySafeImageSource(img, raw) {
        if (!img) return;
        img.onerror = function() {
            this.onerror = null;
            this.src = DEFAULT_AVATAR_DATA_URI;
        };
        img.src = getSafeAvatarSrc(raw);
    }

    function syncWechatOverlayStack(visiblePageIds) {
        const visibleSet = new Set((Array.isArray(visiblePageIds) ? visiblePageIds : []).map(id => String(id || '')).filter(Boolean));
        if (!visibleSet.has('wechat-app')) visibleSet.add('wechat-app');
        document.querySelectorAll('.full-app-page').forEach(page => {
            if (!page || !page.id) return;
            page.style.display = visibleSet.has(page.id) ? 'flex' : 'none';
        });
        const menuPanel = document.getElementById('menu-panel');
        if (menuPanel) menuPanel.style.display = 'none';
    }

    window.getSafeAvatarSrc = getSafeAvatarSrc;
    window.applySafeImageSource = applySafeImageSource;
    window.syncWechatOverlayStack = syncWechatOverlayStack;
    window.defaultAvatarDataUri = DEFAULT_AVATAR_DATA_URI;

    function _normalizeNotifPayload(avatar, name, message, timeStr, contactId, sourceOrOptions) {
        const options = (sourceOrOptions && typeof sourceOrOptions === 'object') ? sourceOrOptions : {};
        const source = options.source || (typeof sourceOrOptions === 'string' ? sourceOrOptions : 'wechat');
        return {
            avatar: getSafeAvatarSrc(avatar || 'icon-192.png'),
            name: name || (source === 'sms' ? '信息' : 'WeChat'),
            message: message || '',
            timeStr: timeStr || '',
            contactId: options.contactId != null ? options.contactId : contactId,
            source: source === 'sms' ? 'sms' : 'wechat'
        };
    }
    function _playNotifQueue() {
        if (_notifPlaying || _notifQueue.length === 0) return;
        _notifPlaying = true;
        const { avatar, name, message, timeStr, contactId, source } = _notifQueue.shift();
        const banner = document.getElementById('notification-banner');
        const chip = document.getElementById('notif-app-chip');
        applySafeImageSource(document.getElementById('notif-avatar-img'), avatar);
        document.getElementById('notif-name-text').textContent = name;
        document.getElementById('notif-msg-text').textContent = message;
        document.getElementById('notif-time-text').textContent = timeStr;
        if (chip) chip.textContent = source === 'sms' ? '信息' : 'WeChat';
        banner.setAttribute('data-source', source || 'wechat');
        banner.setAttribute('data-contact-id', contactId ? String(contactId) : '');
        banner.classList.add('show');
        if (notifTimer) clearTimeout(notifTimer);
        notifTimer = setTimeout(() => {
            banner.classList.remove('show');
            _notifPlaying = false;
            if (_notifQueue.length > 0) {
                // 短暂间隔后显示下一条
                setTimeout(_playNotifQueue, 400);
            }
        }, 2000);
    }
    function showNotificationBanner(avatar, name, message, timeStr, contactId, sourceOrOptions) {
        // 将通知加入队列，依次播放，确保每条消息都能被看到
        _notifQueue.push(_normalizeNotifPayload(avatar, name, message, timeStr, contactId, sourceOrOptions));
        _playNotifQueue();
    }
    // 新增：横幅点击与向上滑动关闭事件监听
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.getElementById('notification-banner');
        let bannerStartY = 0;
        // 辅助：关闭当前横幅并继续播放队列
        function _dismissBannerAndContinue() {
            banner.classList.remove('show');
            if (notifTimer) { clearTimeout(notifTimer); notifTimer = null; }
            _notifPlaying = false;
            // 继续播放队列中剩余的通知
            if (_notifQueue.length > 0) {
                setTimeout(_playNotifQueue, 400);
            }
        }
        // 点击横幅进入聊天
        banner.addEventListener('click', async () => {
            const contactId = banner.getAttribute('data-contact-id');
            const source = banner.getAttribute('data-source') || 'wechat';
            try {
                if (contactId) {
                    if (source === 'sms' && typeof window.openSmsConversation === 'function') {
                        await window.openSmsConversation(contactId);
                    } else {
                        document.getElementById('wechat-app').style.display = 'flex';
                        enterChatWindow(contactId);
                    }
                } else if (source === 'sms' && typeof window.openSmsApp === 'function') {
                    window.openSmsApp();
                }
            } finally {
                _dismissBannerAndContinue();
            }
        });
        // 向上滑动关闭
        banner.addEventListener('touchstart', (e) => {
            bannerStartY = e.touches[0].clientY;
        }, {passive: true});
        banner.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            if (bannerStartY - currentY > 15) { // 向上滑动超过 15px 立即关闭
                _dismissBannerAndContinue();
            }
        }, {passive: true});
    });
    let currentLongPressMsgSender = null;
    let currentQuoteMsgId = null;
    let multiSelectMode = false;
    let selectedMsgIds = new Set();
    let longPressTimer = null;
    const MINI_PROTOCOL_VERSION = 'mini.chat.v2';
    const MINI_STRUCTURED_TYPES = new Set([
        'voice_message', 'red_packet', 'transfer', 'gift_delivery',
        'takeout_delivery', 'call_invite'
    ]);

    function _miniSafeText(value, fallback) {
        if (value === undefined || value === null) return fallback || '';
        return String(value).trim();
    }

    function _miniSafeMoney(value, fallback) {
        const raw = String(value === undefined || value === null ? '' : value).replace(/[^\d.]/g, '');
        const num = parseFloat(raw);
        if (!isNaN(num) && num >= 0) return num.toFixed(2);
        return fallback || '0.00';
    }

    function _miniSafePositiveInt(value, fallback) {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) return num;
        return fallback || 1;
    }

    function _miniEscapeAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function _miniNormalizeItems(items, fallbackName, fallbackDesc) {
        const arr = Array.isArray(items) ? items : [];
        const normalized = arr.map(function(item, index) {
            const base = item && typeof item === 'object' ? item : {};
            return {
                name: _miniSafeText(base.name, fallbackName || ('项目' + (index + 1))),
                desc: _miniSafeText(base.desc || base.spec, fallbackDesc || ''),
                qty: _miniSafePositiveInt(base.qty, 1),
                price: _miniSafeMoney(base.price, '')
            };
        }).filter(function(item) {
            return !!item.name;
        });
        if (normalized.length > 0) return normalized;
        return [{
            name: _miniSafeText(fallbackName, '项目'),
            desc: _miniSafeText(fallbackDesc, ''),
            qty: 1,
            price: ''
        }];
    }

    function normalizeMiniStructuredPayload(raw) {
        if (!raw || typeof raw !== 'object' || !raw.type) return null;
        switch (raw.type) {
            case 'voice_message': {
                const transcript = _miniSafeText(raw.transcript || raw.content, '');
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'voice_message',
                    transcript: transcript,
                    durationSec: Math.max(1, parseInt(raw.durationSec || raw.duration || Math.ceil(transcript.length / 3), 10) || 1)
                };
            }
            case 'red_packet': {
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'red_packet',
                    amount: _miniSafeMoney(raw.amount, '0.00'),
                    memo: _miniSafeText(raw.memo || raw.greeting || raw.desc || raw.content, '恭喜发财，大吉大利'),
                    status: ['claimed', 'unclaimed'].includes(raw.status) ? raw.status : 'unclaimed'
                };
            }
            case 'transaction':
            case 'transfer': {
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'transfer',
                    amount: _miniSafeMoney(raw.amount, '0.00'),
                    memo: _miniSafeText(raw.memo || raw.note || raw.desc || raw.content, '转账'),
                    status: ['pending', 'received', 'refunded'].includes(raw.status) ? raw.status : 'pending'
                };
            }
            case 'send_gift':
            case 'gift':
            case 'gift_delivery': {
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'gift_delivery',
                    note: _miniSafeText(raw.note || raw.message || raw.desc || raw.content, '送你一份心意'),
                    status: ['sent', 'received'].includes(raw.status) ? raw.status : 'sent',
                    items: _miniNormalizeItems(raw.items, raw.item || '礼物', raw.desc || '')
                };
            }
            case 'takeaway':
            case 'takeout_delivery': {
                const firstItem = Array.isArray(raw.items) && raw.items[0] && typeof raw.items[0] === 'object'
                    ? raw.items[0]
                    : {};
                const items = _miniNormalizeItems(raw.items, raw.item || '外卖', raw.desc || '');
                const total = _miniSafeMoney(
                    raw.total,
                    items.reduce(function(sum, item) {
                        const price = parseFloat(item.price || '0');
                        return sum + (isNaN(price) ? 0 : (price * item.qty));
                    }, 0).toFixed(2)
                );
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'takeout_delivery',
                    restaurant: _miniSafeText(raw.restaurant || firstItem.restaurant || firstItem.store, '暖心外卖'),
                    items: items,
                    deliveryFee: _miniSafeMoney(raw.deliveryFee || raw.delivery_fee, '0.00'),
                    total: total,
                    eta: _miniSafeText(raw.eta, '尽快送达'),
                    note: _miniSafeText(raw.note || raw.desc || raw.content, '给你点了外卖'),
                    receiver: _miniSafeText(raw.receiver, ''),
                    status: ['preparing', 'delivering', 'arrived'].includes(raw.status) ? raw.status : 'preparing'
                };
            }
            case 'call':
            case 'video_call':
            case 'call_invite': {
                const mode = raw.mode === 'video' || raw.type === 'video_call' ? 'video' : 'voice';
                const status = ['ringing', 'missed', 'ended', 'declined', 'connected'].includes(raw.status) ? raw.status : 'ringing';
                return {
                    schema: MINI_PROTOCOL_VERSION,
                    type: 'call_invite',
                    mode: mode,
                    status: status,
                    note: _miniSafeText(raw.note || raw.content, mode === 'video' ? '发起视频通话' : '发起语音通话')
                };
            }
            default:
                return null;
        }
    }

    function parseMiniStructuredPayload(content) {
        if (!content || typeof content !== 'string') return null;
        try {
            return normalizeMiniStructuredPayload(JSON.parse(content));
        } catch (e) {
            return null;
        }
    }

    function createMiniStructuredMessage(type, payload) {
        const normalized = normalizeMiniStructuredPayload(Object.assign({ type: type }, payload || {}));
        return normalized ? JSON.stringify(normalized) : '';
    }

    function isMiniStructuredPayloadType(type) {
        return MINI_STRUCTURED_TYPES.has(type);
    }

    function getMiniStructuredPreview(parsed) {
        if (!parsed || !parsed.type) return '';
        if (parsed.type === 'voice_message') return '[语音] ' + (parsed.transcript || '');
        if (parsed.type === 'red_packet') {
            const statusText = parsed.status === 'claimed' ? '已领取' : '待领取';
            return `[红包] ¥${parsed.amount} ${parsed.memo} (${statusText})`;
        }
        if (parsed.type === 'transfer') {
            const statusMap = { pending: '待收款', received: '已收款', refunded: '已退回' };
            return `[转账] ¥${parsed.amount} ${parsed.memo} (${statusMap[parsed.status] || '待收款'})`;
        }
        if (parsed.type === 'gift_delivery') {
            const names = parsed.items.slice(0, 2).map(function(item) { return item.name; }).join('、');
            return `[礼物] ${names || '礼物'}${parsed.note ? ' · ' + parsed.note : ''}`;
        }
        if (parsed.type === 'takeout_delivery') {
            const names = parsed.items.slice(0, 2).map(function(item) { return item.name; }).join('、');
            const head = parsed.restaurant ? (parsed.restaurant + ' · ') : '';
            return `[外卖] ${head}${names || '外卖'}${parsed.eta ? ' · ' + parsed.eta : ''}`;
        }
        if (parsed.type === 'call_invite') {
            const modeLabel = parsed.mode === 'video' ? '视频通话' : '语音通话';
            return '[' + modeLabel + '] ' + (parsed.note || '通话邀请');
        }
        return '';
    }

    // 提取消息纯文本（用于引用、列表展示、过滤HTML和JSON等）
    function extractMsgPureText(content) {
        if (!content) return '';
        const structured = parseMiniStructuredPayload(content);
        if (structured) return getMiniStructuredPreview(structured);
        try {
            const parsed = JSON.parse(content);
            if (parsed.type === 'camera') return '[相片] ' + (parsed.content || '');
            if (parsed.type === 'image') return '[图片]';
            if (parsed.type === 'emoticon') return `[表情] ${parsed.desc || ''}`;
            if (parsed.type === 'location') return `[定位] ${parsed.address || ''}`;
            if (parsed.content) return parsed.content;
        } catch(e) {}
        if (content.startsWith('[CAMERA]')) return '[相片] ' + content.substring(8);
        // 过滤 HTML 标签获取纯文本 (解决掉代码问题)
        // 核心修复：把翻译气泡的分割线替换为空格，防止外文和中文粘连
        let safeContent = content.replace(/<div class="msg-translate-divider"><\/div>/g, ' ');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = safeContent;
        return tempDiv.textContent || tempDiv.innerText || safeContent;
    }

    function extractTopLevelJsonObjects(rawText) {
        const text = String(rawText || '');
        const objects = [];
        let depth = 0;
        let start = -1;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '"') {
                    inString = false;
                }
                continue;
            }
            if (ch === '"') {
                inString = true;
                continue;
            }
            if (ch === '{') {
                if (depth === 0) start = i;
                depth++;
            } else if (ch === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    objects.push(text.slice(start, i + 1));
                    start = -1;
                }
            }
        }
        return objects;
    }

    function repairMiniRoleReplyText(replyText) {
        let cleanText = String(replyText || '').trim();
        cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        cleanText = cleanText.replace(/\]\s*\[/g, ',');
        if (cleanText.startsWith('[') && !cleanText.endsWith(']')) {
            const objectChunks = extractTopLevelJsonObjects(cleanText);
            if (objectChunks.length > 0) {
                return '[' + objectChunks.join(',') + ']';
            }
        }
        return cleanText;
    }

    function normalizeRoleReplyArray(replyText) {
        const raw = String(replyText || '').trim();
        if (!raw) return [];
        let cleanText = repairMiniRoleReplyText(raw);
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const arrayCandidate = cleanText.substring(firstBracket, lastBracket + 1);
            try {
                const parsedArray = JSON.parse(arrayCandidate);
                if (Array.isArray(parsedArray)) return parsedArray;
            } catch (e) {}
        }
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const objectCandidate = cleanText.substring(firstBrace, lastBrace + 1);
            try {
                const parsedObject = JSON.parse(objectCandidate);
                if (Array.isArray(parsedObject)) return parsedObject;
                if (parsedObject && typeof parsedObject === 'object') return [parsedObject];
            } catch (e) {}
        }
        const objectChunks = extractTopLevelJsonObjects(cleanText);
        if (objectChunks.length > 0) {
            const parsedChunks = objectChunks.map(function(chunk) {
                try { return JSON.parse(chunk); } catch (e) { return null; }
            }).filter(function(item) {
                return !!item && typeof item === 'object';
            });
            if (parsedChunks.length > 0) return parsedChunks;
        }
        const lineResults = [];
        let hasStructuredObject = false;
        raw.split('\n').forEach(function(line) {
            const trimmed = line.trim();
            if (!trimmed) return;
            const normalizedLine = trimmed.replace(/^[,\[]+/, '').replace(/[,\]]+$/, '').trim();
            let parsedLine = null;
            if (normalizedLine) {
                try {
                    parsedLine = JSON.parse(normalizedLine);
                } catch (e) {
                    const braceStart = normalizedLine.indexOf('{');
                    const braceEnd = normalizedLine.lastIndexOf('}');
                    if (braceStart !== -1 && braceEnd > braceStart) {
                        const objCandidate = normalizedLine.slice(braceStart, braceEnd + 1);
                        try { parsedLine = JSON.parse(objCandidate); } catch (e2) {}
                    }
                }
            }
            if (Array.isArray(parsedLine)) {
                parsedLine.forEach(function(item) {
                    if (item && typeof item === 'object') {
                        lineResults.push(item);
                        hasStructuredObject = true;
                    }
                });
                return;
            }
            if (parsedLine && typeof parsedLine === 'object') {
                lineResults.push(parsedLine);
                hasStructuredObject = true;
                return;
            }
            lineResults.push({ type: 'text', content: trimmed });
        });
        if (hasStructuredObject) return lineResults;
        return lineResults.map(function(item) {
            if (item && typeof item === 'object' && item.type) return item;
            return { type: 'text', content: String(item && item.content ? item.content : '') };
        });
    }

    function autoGrowTextarea(el) {
        if (!el || el.tagName !== 'TEXTAREA') return;
        if (!el.dataset.autoGrowBound) {
            const cs = window.getComputedStyle(el);
            const curH = parseFloat(cs.height) || el.offsetHeight || 0;
            const minH = parseFloat(cs.minHeight);
            const maxH = parseFloat(cs.maxHeight);
            const lineH = parseFloat(cs.lineHeight);
            const padTop = parseFloat(cs.paddingTop) || 0;
            const padBottom = parseFloat(cs.paddingBottom) || 0;
            const rowCount = Math.max(1, parseInt(el.getAttribute('rows'), 10) || 1);
            const naturalMin = Math.ceil(((Number.isFinite(lineH) ? lineH : 20) * rowCount) + padTop + padBottom);
            const dynamicInputIds = new Set(['chat-input-main', 'sms-input-field', 'offline-input-field']);
            const useSoftMinHeight = dynamicInputIds.has(el.id);
            const finalMinH = useSoftMinHeight
                ? Math.max(Number.isFinite(minH) ? minH : 0, naturalMin)
                : Math.max(curH, Number.isFinite(minH) ? minH : 0, naturalMin);
            el.dataset.autoGrowMin = String(finalMinH || 0);
            if (Number.isFinite(maxH) && maxH > 0) {
                el.dataset.autoGrowMax = String(maxH);
            }
            el.dataset.autoGrowBound = '1';
        }
        const minHeight = parseFloat(el.dataset.autoGrowMin) || 0;
        const maxHeight = parseFloat(el.dataset.autoGrowMax) || 0;
        const hasValue = String(el.value || '').trim().length > 0;
        el.style.height = 'auto';
        let nextHeight = hasValue ? Math.max(el.scrollHeight, minHeight) : minHeight;
        if (maxHeight > 0 && nextHeight > maxHeight) {
            nextHeight = maxHeight;
            el.style.overflowY = 'auto';
        } else {
            el.style.overflowY = 'hidden';
        }
        el.style.height = nextHeight + 'px';
    }

    async function buildOfflineCrossModeMemoryText(contact, ctxLimit, providedMessages) {
        if (!contact) return '';
        try {
            const allOfflineMsgs = Array.isArray(providedMessages)
                ? providedMessages
                : await crossModeOfflineDb.messages.where('contactId').equals(contact.id).toArray();
            const recentOfflineMsgs = (ctxLimit === 0) ? allOfflineMsgs : allOfflineMsgs.slice(-ctxLimit);
            if (!recentOfflineMsgs.length) return '';
            const roleName = contact.roleName || '角色';
            return recentOfflineMsgs.map(function(m) {
                const sender = m.sender === 'me' ? '用户' : roleName;
                const content = String(m.content || '').trim();
                if (!content) return '';
                return sender + '：' + content;
            }).filter(function(line) {
                return !!line;
            }).join('\n');
        } catch (e) {
            console.warn('读取线下跨模式记忆失败', e);
            return '';
        }
    }

    async function buildOnlineCrossModeMemoryText(contact, ctxLimit, providedMessages) {
        if (!contact) return '';
        try {
            let allOnlineMsgs = Array.isArray(providedMessages)
                ? providedMessages.slice()
                : await chatListDb.messages.where('contactId').equals(contact.id).toArray();
            allOnlineMsgs = allOnlineMsgs.filter(function(m) {
                if (!m) return false;
                if (m.source === 'sms') return false;
                if (m.sender === 'system' || m.isSystemTip || m.isRecalled) return false;
                return true;
            });
            const recentOnlineMsgs = (ctxLimit === 0) ? allOnlineMsgs : allOnlineMsgs.slice(-ctxLimit);
            if (!recentOnlineMsgs.length) return '';
            const roleName = contact.roleName || '角色';
            return recentOnlineMsgs.map(function(m) {
                const sender = m.sender === 'me' ? '用户' : roleName;
                const text = extractMsgPureText(m.content || '').trim();
                if (!text) return '';
                return sender + '：' + text;
            }).filter(function(line) {
                return !!line;
            }).join('\n');
        } catch (e) {
            console.warn('读取线上跨模式记忆失败', e);
            return '';
        }
    }

    async function getContactSummaryHistoryText(contactId) {
        if (!contactId) return '';
        try {
            const enabled = !!(await localforage.getItem('cd_settings_' + contactId + '_toggle_memory'));
            if (!enabled) return '';
            const summaryHistory = await localforage.getItem('cd_settings_' + contactId + '_summary_history');
            if (!Array.isArray(summaryHistory) || summaryHistory.length === 0) return '';
            return summaryHistory.map(function(item, index) {
                if (!item || !item.content) return '';
                const timeText = item.time ? String(item.time) : '未知时间';
                const countText = item.msgCount ? ('，共' + item.msgCount + '条消息') : '';
                return '【第' + (index + 1) + '次总结（' + timeText + countText + '）】\n' + String(item.content).trim();
            }).filter(function(block) {
                return !!block;
            }).join('\n\n');
        } catch (e) {
            console.warn('读取历史总结失败', e);
            return '';
        }
    }

    async function buildContactWorldbookContextText(contact, recentTextSources) {
        if (!contact || !Array.isArray(contact.worldbooks) || contact.worldbooks.length === 0) return '';
        if (typeof db === 'undefined' || !db || !db.entries || typeof db.entries.where !== 'function') return '';
        try {
            const wbIds = contact.worldbooks.map(function(id) {
                return parseInt(id, 10);
            }).filter(function(id) {
                return !isNaN(id);
            });
            if (!wbIds.length) return '';
            const wbs = await db.entries.where('id').anyOf(wbIds).toArray();
            const recentText = (Array.isArray(recentTextSources) ? recentTextSources : []).map(function(text) {
                return String(text || '').trim();
            }).filter(function(text) {
                return !!text;
            }).join('\n');
            let wbSetting = '';
            wbs.forEach(function(wb) {
                if (!wb || !wb.content) return;
                if (wb.activation === 'always') {
                    wbSetting += (wbSetting ? '\n' : '') + wb.content;
                    return;
                }
                if (wb.activation === 'keyword' && wb.keywords && recentText) {
                    const keywords = String(wb.keywords).split(/[,，]/).map(function(keyword) {
                        return keyword.trim();
                    }).filter(function(keyword) {
                        return !!keyword;
                    });
                    const hit = keywords.some(function(keyword) {
                        return recentText.includes(keyword);
                    });
                    if (hit) {
                        wbSetting += (wbSetting ? '\n' : '') + wb.content;
                    }
                }
            });
            return wbSetting;
        } catch (e) {
            console.warn('读取世界书上下文失败', e);
            return '';
        }
    }

    // 统一生成消息气泡的HTML
    function generateMsgHtml(msg, myAvatar, roleAvatar) {
        function _normalizeChatText(raw) {
            return String(raw || '')
                .replace(/\r\n?/g, '\n')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/([^\n])\n(?=[^\n])/g, '$1 ');
        }

        if (msg.isRecalled) {
            const myName = document.getElementById('text-wechat-me-name') ? document.getElementById('text-wechat-me-name').textContent : '我';
            const name = msg.sender === 'me' ? myName : (activeChatContact.roleName || '角色');
            // 修复：多选模式下撤回提示也要可被选中删除，包裹 chat-msg-row 容器并附加 data-id
            const _isCheckedRecalled = selectedMsgIds.has(msg.id) ? 'checked' : '';
            return `<div class="chat-msg-row msg-system-row" data-id="${msg.id}" data-sender="${msg.sender}" onclick="if(multiSelectMode){toggleMsgCheck(${msg.id})}">
                <div class="msg-checkbox ${_isCheckedRecalled}" onclick="toggleMsgCheck(${msg.id})"></div>
                <div class="msg-recalled-tip" style="flex:1;">"${name}"撤回了一条消息 <span onclick="event.stopPropagation();viewRecalledMsg(${msg.id})">查看</span></div>
            </div>`;
        }
        // 系统提示消息（红包/转账状态提示等）单独渲染，不走气泡逻辑
        if (msg.isSystemTip) {
            // 修复掉格：isSystemTip 消息的 content 是 JSON 字符串，需解析出 content 字段
            let _sysTipText = msg.content;
            try {
                const _sysParsed = JSON.parse(msg.content);
                if (_sysParsed && _sysParsed.content) _sysTipText = _sysParsed.content;
            } catch(e) {}
            // 修复：多选模式下系统提示也要可被选中删除，包裹 chat-msg-row 容器并附加 data-id
            const _isCheckedSys = selectedMsgIds.has(msg.id) ? 'checked' : '';
            return `<div class="chat-msg-row msg-system-row" data-id="${msg.id}" data-sender="${msg.sender}" onclick="if(multiSelectMode){toggleMsgCheck(${msg.id})}">
                <div class="msg-checkbox ${_isCheckedSys}" onclick="toggleMsgCheck(${msg.id})"></div>
                <div class="msg-recalled-tip" style="flex:1;">${_sysTipText}</div>
            </div>`;
        }
        // 拉黑申请消息：使用专用渲染函数（带红色感叹号徽章）
        try {
            const _chk = JSON.parse(msg.content);
            if (_chk && _chk.type === 'block_apply') {
                return generateBlockApplyMsgHtml(msg, myAvatar, roleAvatar);
            }
        } catch(e) {}
        const isMe = msg.sender === 'me';
        const avatar = getSafeAvatarSrc(isMe ? myAvatar : roleAvatar);
        const msgClass = isMe ? 'msg-right' : 'msg-left';
        let statusHtml = isMe ? `<span class="msg-status"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L7 17l-5-5"></path><path d="M22 10L13.5 18.5l-2-2"></path></svg></span>` : '';
        let quoteHtml = '';
        if (msg.quoteText) {
            try {
                // 尝试解析为 JSON 对象（新格式）
                const qData = JSON.parse(msg.quoteText);
                quoteHtml = `
                    <div class="msg-quote-ref">
                        <div class="msg-quote-header">
                            <span class="msg-quote-name">${qData.name}</span>
                            <span class="msg-quote-time">${qData.time}</span>
                        </div>
                        <div class="msg-quote-content">${qData.content}</div>
                    </div>
                `;
            } catch (e) {
                // 如果解析失败，说明是以前存的纯文本旧数据，兼容显示
                quoteHtml = `
                    <div class="msg-quote-ref">
                        <div class="msg-quote-content">${msg.quoteText}</div>
                    </div>
                `;
            }
        }
        const isChecked = selectedMsgIds.has(msg.id) ? 'checked' : '';
        // 安全转义并处理换行：将纯文本中的 \n 转为 <br>，防止 XSS 同时保留换行格式
        function _safeTextHtml(raw) {
            if (!raw) return '';
            const normalized = _normalizeChatText(raw);
            // 先转义 HTML 特殊字符，再把换行转为 <br>
            return normalized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\n/g, '<br>');
        }
        let msgBodyHtml = '';
        const translationMatch = (typeof msg.content === 'string')
            ? msg.content.match(/^\s*<div class="msg-original-text">([\s\S]*?)<\/div>\s*<div class="msg-translate-divider"><\/div>\s*<div class="msg-translated-text">([\s\S]*?)<\/div>\s*$/)
            : null;
        if (translationMatch) {
            const originalText = _safeTextHtml(translationMatch[1]);
            const translatedText = _safeTextHtml(translationMatch[2]);
            msgBodyHtml = `<div class="msg-text-body"><div class="msg-original-text">${originalText}</div><div class="msg-translate-divider"></div><div class="msg-translated-text">${translatedText}</div></div>`;
        } else {
            msgBodyHtml = `<div class="msg-text-body">${_safeTextHtml(msg.content)}</div>`;
        }
        let isCameraMsg = false;
        let cameraDesc = '';
        let isImageMsg = false;
        let imageBase64 = '';
        let isEmoticonMsg = false;
        let emoticonUrl = '';
        let isLocationMsg = false;
        let locationAddress = '';
        let locationDistance = '';
        let isVoiceMsg = false;
        let voiceText = '';
        let voiceSeconds = 0;
        const structuredMsg = parseMiniStructuredPayload(msg.content);
        if (structuredMsg) {
            if (structuredMsg.type === 'voice_message') {
                isVoiceMsg = true;
                voiceText = structuredMsg.transcript || '';
                voiceSeconds = Math.max(1, structuredMsg.durationSec || 1);
            } else if (structuredMsg.type === 'red_packet') {
                statusHtml = '';
                const rpAmount = structuredMsg.amount || '0.00';
                const rpDesc = structuredMsg.memo || '恭喜发财，大吉大利';
                const rpStatus = structuredMsg.status || 'unclaimed';
                const rpStatusLabel = rpStatus === 'claimed' ? (isMe ? '已被领取' : '已领取') : '待领取';
                const rpStatusColor = rpStatus === 'claimed' ? '#bbb' : '#e8534a';
                const roleName = _miniEscapeAttr(activeChatContact ? (activeChatContact.roleName || '对方') : '对方');
                msgBodyHtml = `
                    <div class="card-wrapper" data-no-bubble="1">
                        <div class="chat-red-packet-card${rpStatus === 'claimed' ? ' rp-claimed' : ''}" data-rp-amount="${rpAmount}" data-rp-desc="${_miniEscapeAttr(rpDesc)}" data-rp-status="${rpStatus}" data-rp-role="${isMe ? 'me' : 'role'}" data-rp-rname="${roleName}" onclick="openRpClaimModal(this, this.dataset.rpAmount, this.dataset.rpDesc, this.dataset.rpStatus, this.dataset.rpRole, this.dataset.rpRname, ${msg.id})">
                            <div class="rp-card-icon-area">
                                <div class="rp-card-icon-wrap">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(100,100,100,0.55)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                        <circle cx="12" cy="10" r="2"></circle>
                                    </svg>
                                </div>
                                <div class="rp-card-text-group">
                                    <div class="rp-card-amount">¥ ${rpAmount}</div>
                                    <div class="rp-card-desc">${_safeTextHtml(rpDesc)}</div>
                                </div>
                            </div>
                            <div class="rp-card-divider"></div>
                            <div class="rp-card-bottom">
                                <span class="rp-card-status" style="color:${rpStatusColor};">${rpStatusLabel}</span>
                                <span class="rp-card-brand">WeChat红包</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (structuredMsg.type === 'transfer') {
                statusHtml = '';
                const tfAmount = structuredMsg.amount || '0.00';
                const tfDesc = structuredMsg.memo || '转账';
                const tfStatus = structuredMsg.status || 'pending';
                const tfStatusLabel = tfStatus === 'refunded' ? '已退回' : (tfStatus === 'received' ? '已收款' : '待收款');
                const tfStatusColor = tfStatus === 'refunded' ? '#bbb' : (tfStatus === 'received' ? '#27ae60' : '#1a6fb5');
                const roleName2 = _miniEscapeAttr(activeChatContact ? (activeChatContact.roleName || '对方') : '对方');
                msgBodyHtml = `
                    <div class="card-wrapper" data-no-bubble="1">
                        <div class="chat-transfer-card${tfStatus !== 'pending' ? ' tf-received' : ''}" data-tf-amount="${tfAmount}" data-tf-desc="${_miniEscapeAttr(tfDesc)}" data-tf-status="${tfStatus}" data-tf-role="${isMe ? 'me' : 'role'}" data-tf-rname="${roleName2}" onclick="openTfActionModal(this, this.dataset.tfAmount, this.dataset.tfDesc, this.dataset.tfStatus, this.dataset.tfRole, this.dataset.tfRname)">
                            <div class="tf-card-icon-area">
                                <div class="tf-card-icon-wrap">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(100,100,100,0.55)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="16 3 21 3 21 8"></polyline>
                                        <line x1="4" y1="20" x2="21" y2="3"></line>
                                        <polyline points="21 16 21 21 16 21"></polyline>
                                        <line x1="15" y1="15" x2="21" y2="21"></line>
                                        <line x1="4" y1="4" x2="9" y2="9"></line>
                                    </svg>
                                </div>
                                <div class="tf-card-text-group">
                                    <div class="tf-card-amount">¥ ${tfAmount}</div>
                                    <div class="tf-card-desc">${_safeTextHtml(tfDesc)}</div>
                                </div>
                            </div>
                            <div class="tf-card-divider"></div>
                            <div class="tf-card-bottom">
                                <span class="tf-card-status" style="color:${tfStatusColor};">${tfStatusLabel}</span>
                                <span class="tf-card-brand">WeChat转账</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (structuredMsg.type === 'gift_delivery') {
                statusHtml = '';
                const giftTitle = structuredMsg.items.slice(0, 2).map(function(item) {
                    return item.name + (item.qty > 1 ? (' ×' + item.qty) : '');
                }).join(' · ');
                const giftStatusLabel = structuredMsg.status === 'received' ? '已签收' : '待查收';
                msgBodyHtml = `
                    <div class="card-wrapper" data-no-bubble="1">
                        <div class="chat-special-card special-gift-card">
                            <div class="special-card-header">
                                <div class="special-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 12 20 22 4 22 4 12"></polyline>
                                        <rect x="2" y="7" width="20" height="5"></rect>
                                        <line x1="12" y1="22" x2="12" y2="7"></line>
                                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                                    </svg>
                                </div>
                                <div class="special-card-meta">
                                    <div class="special-card-kicker">礼物清单</div>
                                    <div class="special-card-title">${_safeTextHtml(giftTitle || '给你准备了礼物')}</div>
                                </div>
                            </div>
                            <div class="special-card-note">${_safeTextHtml(structuredMsg.note || '送你一份心意')}</div>
                            <div class="special-card-footer">
                                <span>${structuredMsg.items.length} 件心意</span>
                                <span>${giftStatusLabel}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (structuredMsg.type === 'takeout_delivery') {
                statusHtml = '';
                const takeoutTitle = structuredMsg.items.slice(0, 2).map(function(item) {
                    return item.name + (item.qty > 1 ? (' ×' + item.qty) : '');
                }).join(' · ');
                const takeoutStatusMap = {
                    preparing: '商家备餐中',
                    delivering: '正在配送',
                    arrived: '已送达'
                };
                msgBodyHtml = `
                    <div class="card-wrapper" data-no-bubble="1">
                        <div class="chat-special-card special-takeout-card">
                            <div class="special-card-header">
                                <div class="special-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M7 10h10"></path>
                                        <path d="M7 14h10"></path>
                                        <path d="M5 6h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6z"></path>
                                        <path d="M9 6V4a3 3 0 0 1 6 0v2"></path>
                                    </svg>
                                </div>
                                <div class="special-card-meta">
                                    <div class="special-card-kicker">${_safeTextHtml(structuredMsg.restaurant || '暖心外卖')}</div>
                                    <div class="special-card-title">${_safeTextHtml(takeoutTitle || '给你点了外卖')}</div>
                                </div>
                            </div>
                            <div class="special-card-note">${_safeTextHtml(structuredMsg.note || '记得趁热吃')}</div>
                            <div class="special-card-footer">
                                <span>合计 ¥ ${structuredMsg.total || '0.00'}</span>
                                <span>${_safeTextHtml(takeoutStatusMap[structuredMsg.status] || structuredMsg.eta || '尽快送达')}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (structuredMsg.type === 'call_invite') {
                statusHtml = '';
                const callModeLabel = structuredMsg.mode === 'video' ? '视频通话' : '语音通话';
                const callStatusMap = {
                    ringing: '等待接听',
                    connected: '已接通',
                    ended: '通话结束',
                    missed: '未接听',
                    declined: '已拒绝'
                };
                msgBodyHtml = `
                    <div class="card-wrapper" data-no-bubble="1">
                        <div class="chat-special-card special-call-card">
                            <div class="special-card-header">
                                <div class="special-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                        ${structuredMsg.mode === 'video'
                                            ? '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>'
                                            : '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>'}
                                    </svg>
                                </div>
                                <div class="special-card-meta">
                                    <div class="special-card-kicker">${callModeLabel}</div>
                                    <div class="special-card-title">${_safeTextHtml(structuredMsg.note || '发起通话邀请')}</div>
                                </div>
                            </div>
                            <div class="special-card-note">${callStatusMap[structuredMsg.status] || '等待接听'}</div>
                            <div class="special-card-footer">
                                <span>通话邀请</span>
                                <span>${callStatusMap[structuredMsg.status] || '等待接听'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed && parsed.type === 'camera') {
                    isCameraMsg = true;
                    cameraDesc = parsed.content || '';
                } else if (parsed && parsed.type === 'image') {
                    isImageMsg = true;
                    imageBase64 = parsed.content || '';
                } else if (parsed && parsed.type === 'emoticon') {
                    isEmoticonMsg = true;
                    emoticonUrl = parsed.content || '';
                } else if (parsed && parsed.type === 'location') {
                    isLocationMsg = true;
                    locationAddress = parsed.address || '未知位置';
                    locationDistance = parsed.distance || '';
                }
            } catch(e) {
                // 兼容旧的 [CAMERA] 格式
                if (msg.content && msg.content.startsWith('[CAMERA]')) {
                    isCameraMsg = true;
                    cameraDesc = msg.content.substring(8);
                }
                // 兼容旧的纯文本转账/红包格式，统一匹配所有可能的前缀变体：
                // 💰 [微信转账] 向你转账 ¥200.00
                // 【转账：测试专用】
                // [转账] 向你转账 ¥12.00
                else if (msg.content && (
                    msg.content.startsWith('💰') ||
                    msg.content.startsWith('【转账') ||
                    msg.content.startsWith('[转账]') ||
                    /^\[微信转账\]/.test(msg.content)
                )) {
                    statusHtml = '';
                    // 统一清理各种前缀后提取剩余文本
                    let tfText = msg.content
                        .replace(/^💰\s*/, '')
                        .replace(/^\[微信转账\]\s*/,'')
                        .replace(/^【转账[：:][^】]*】\s*/,'')
                        .replace(/^\[转账\]\s*/,'')
                        .trim();
                    // 尝试提取金额（¥ 后面的数字，或直接的纯数字）
                    const amtMatch = tfText.match(/¥\s*([\d,]+(?:\.\d+)?)/) || tfText.match(/^([\d,]+(?:\.\d+)?)/);
                    const tfAmount = amtMatch ? amtMatch[1].replace(/,/g, '') : '0.00';
                    // 提取备注：去掉"向你转账"和金额部分后剩余内容，或用原始文本
                    let tfDesc = tfText
                        .replace(/向你转账\s*/g, '')
                        .replace(/¥\s*[\d,]+(?:\.\d+)?/, '')
                        .replace(/^[\d,]+(?:\.\d+)?/, '')
                        .trim();
                    if (!tfDesc) tfDesc = '转账';
                    const roleName2 = activeChatContact ? (activeChatContact.roleName || '对方') : '对方';
                    msgBodyHtml = `
                        <div class="card-wrapper" data-no-bubble="1">
                            <div class="chat-transfer-card" data-tf-amount="${tfAmount}" data-tf-desc="${_miniEscapeAttr(tfDesc)}" data-tf-status="pending" data-tf-role="${isMe ? 'me' : 'role'}" data-tf-rname="${_miniEscapeAttr(roleName2)}" onclick="openTfActionModal(this, this.dataset.tfAmount, this.dataset.tfDesc, this.dataset.tfStatus, this.dataset.tfRole, this.dataset.tfRname)">
                                <div class="tf-card-top">
                                    <div class="tf-card-icon">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5"></path>
                                            <path d="M2 12l10 5 10-5"></path>
                                        </svg>
                                    </div>
                                    <div class="tf-card-info">
                                        <div class="tf-card-amount">¥ ${tfAmount}</div>
                                        <div class="tf-card-desc">${tfDesc}</div>
                                    </div>
                                </div>
                                <div class="tf-card-divider"></div>
                                <div class="tf-card-bottom">
                                    <span class="tf-card-status" style="color:#1a6fb5;">待收款</span>
                                    <span class="tf-card-brand">转账</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
                // 兼容旧的纯文本红包格式，统一匹配所有可能的前缀变体：
                // 🧧 [恭喜发财，大吉大利]
                // 【红包：测试专用】
                // [红包] ¥52.00
                else if (msg.content && (
                    msg.content.startsWith('🧧') ||
                    msg.content.startsWith('【红包') ||
                    msg.content.startsWith('[红包]')
                )) {
                    statusHtml = '';
                    // 统一清理各种红包前缀后提取剩余文本
                    let rpText = msg.content
                        .replace(/^🧧\s*/, '')
                        .replace(/^【红包[：:][^】]*】\s*/,'')
                        .replace(/^\[红包\]\s*/,'')
                        .trim();
                    // 尝试提取金额（¥ 后面的数字，或直接的纯数字）
                    const amtMatch2 = rpText.match(/¥\s*([\d,]+(?:\.\d+)?)/) || rpText.match(/^([\d,]+(?:\.\d+)?)/);
                    const rpAmount = amtMatch2 ? amtMatch2[1].replace(/,/g, '') : '0.00';
                    // 提取描述：优先取方括号内的文字（如 [恭喜发财，大吉大利]），否则用剩余文本（去掉数字部分）
                    const descInBracket = rpText.match(/^\[([^\]]+)\]/);
                    let rpDesc = descInBracket
                        ? descInBracket[1]
                        : (rpText.replace(/¥\s*[\d,]+(?:\.\d+)?/, '').replace(/^[\d,]+(?:\.\d+)?/, '').trim() || '恭喜发财，大吉大利');
                    if (!rpDesc) rpDesc = '恭喜发财，大吉大利';
                    const roleName = activeChatContact ? (activeChatContact.roleName || '对方') : '对方';
                    msgBodyHtml = `
                        <div class="card-wrapper" data-no-bubble="1">
                            <div class="chat-red-packet-card" data-rp-amount="${rpAmount}" data-rp-desc="${_miniEscapeAttr(rpDesc)}" data-rp-status="unclaimed" data-rp-role="${isMe ? 'me' : 'role'}" data-rp-rname="${_miniEscapeAttr(roleName)}" onclick="openRpClaimModal(this, this.dataset.rpAmount, this.dataset.rpDesc, this.dataset.rpStatus, this.dataset.rpRole, this.dataset.rpRname, ${msg.id})">
                                <div class="rp-card-top">
                                    <div class="rp-card-icon">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="2" y="7" width="20" height="14" rx="3" ry="3"></rect>
                                            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                                            <line x1="12" y1="12" x2="12" y2="16"></line>
                                            <line x1="10" y1="14" x2="14" y2="14"></line>
                                        </svg>
                                    </div>
                                    <div class="rp-card-info">
                                        <div class="rp-card-amount">¥ ${rpAmount}</div>
                                        <div class="rp-card-desc">${rpDesc}</div>
                                    </div>
                                </div>
                                <div class="rp-card-divider"></div>
                                <div class="rp-card-bottom">
                                    <span class="rp-card-status" style="color:#e8534a;">待领取</span>
                                    <span class="rp-card-brand">红包</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        }
        if (isCameraMsg) {
            statusHtml = ''; // 隐藏双✓
            msgBodyHtml = `
                <div class="chat-photo-card" onclick="this.classList.toggle('flipped')">
                    <div class="chat-photo-front">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </div>
                    <div class="chat-photo-back">${cameraDesc}</div>
                </div>
            `;
        } else if (isImageMsg || isEmoticonMsg) {
            statusHtml = ''; // 隐藏双✓
            let imgSrc = isImageMsg ? imageBase64 : emoticonUrl;
            msgBodyHtml = `
                <div class="chat-photo-card" style="border: none; background: transparent; box-shadow: none; height: auto; max-width: 140px;">
                    <img src="${imgSrc}" style="width: 100%; height: auto; object-fit: contain; border-radius: 8px;">
                </div>
            `;
        } else if (isLocationMsg) {
            statusHtml = ''; // 隐藏双✓
            msgBodyHtml = `
                <div class="chat-location-card">
                    <div class="chat-location-header">
                        <div class="chat-location-address">${locationAddress}</div>
                        <div class="chat-location-distance">${locationDistance}</div>
                    </div>
                    <div class="chat-location-map">
                        <div class="chat-location-shadow"></div>
                        <div class="chat-location-pin"></div>
                    </div>
                </div>
            `;
        } else if (isVoiceMsg) {
            statusHtml = ''; // 隐藏双✓，保持纯净
            msgBodyHtml = `
                <div class="voice-msg-container" onclick="toggleVoiceText(this)">
                    <div class="voice-bubble-top">
                        <div class="voice-waves paused">
                            <div class="voice-wave"></div>
                            <div class="voice-wave"></div>
                            <div class="voice-wave"></div>
                            <div class="voice-wave"></div>
                            <div class="voice-wave"></div>
                        </div>
                        <div class="voice-duration">${voiceSeconds}"</div>
                    </div>
                    <div class="voice-expand-area">
                        <div class="voice-divider"></div>
                        <div class="voice-text-content">${voiceText}</div>
                    </div>
                </div>
            `;
        }
        // 拉黑状态下角色消息气泡右上角显示红色感叹号（发送失败标志）
        const _showBlockedBadge = !isMe && activeChatContact && activeChatContact.blocked;
        const _blockedBadgeHtml = _showBlockedBadge ? `<div style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#e74c3c;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700;box-shadow:0 2px 6px rgba(231,76,60,0.5);">!</div>` : '';
        const _isBubblelessMsg = isCameraMsg || isImageMsg || isEmoticonMsg || isLocationMsg || !!(structuredMsg && ['red_packet', 'transfer', 'gift_delivery', 'takeout_delivery', 'call_invite'].includes(structuredMsg.type));
        return `
            <div class="chat-msg-row ${msgClass}" data-id="${msg.id}" data-sender="${msg.sender}">
                <div class="msg-checkbox ${isChecked}" onclick="toggleMsgCheck(${msg.id})"></div>
                <div class="chat-msg-avatar"><img src="${avatar}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_DATA_URI}';"></div>

                <div class="msg-bubble-wrapper" style="position:relative;">
                    <div class="chat-msg-content msg-content-touch" style="${_isBubblelessMsg ? 'background:transparent; box-shadow:none; padding:0;' : ''}">
                        ${quoteHtml}
                        ${msgBodyHtml}
                        ${statusHtml}
                    </div>
                    <div class="chat-timestamp" style="${_isBubblelessMsg ? 'display:none;' : ''}">${msg.timeStr}</div>
                    ${_blockedBadgeHtml}
                </div>
            </div>
        `;
    }
    // ====== 聊天分页：每页显示消息数 ======
    const CHAT_PAGE_SIZE = 20;

    async function enterChatWindow(contactId) {
        const contact = await contactDb.contacts.get(contactId);
        if (!contact) return;
        activeChatContact = contact;
        const win = document.getElementById('chat-window');
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'chat-window']);
        } else if (win) {
            win.style.display = 'flex';
        }
        // 修复：优先使用备注名，没有备注才用 roleName
        let _chatDisplayName = contact.roleName || '角色';
        try {
            const _remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (_remark && _remark !== '未设置') _chatDisplayName = _remark;
        } catch(e) {}
        document.getElementById('chat-current-name').textContent = _chatDisplayName;
        const container = document.getElementById('chat-msg-container');
        container.innerHTML = ''; 
        try {
            // 【聊天隔离】WeChat聊天窗口只显示 source==='wechat' 或无source（旧数据兼容）的消息
            // 注意：source==='sms' 的消息绝对不允许出现在WeChat窗口中
            const allMessages = await chatListDb.messages.where('contactId').equals(contactId).toArray();
            const messages = allMessages.filter(m => m.source !== 'sms');
            const myAvatar = getSafeAvatarSrc(contact.userAvatar);
            const roleAvatar = getSafeAvatarSrc(contact.roleAvatar);
            
            // ====== 聊天分页：只显示最后一页，其余折叠 ======
            const totalCount = messages.length;
            const pageSize = CHAT_PAGE_SIZE;
            let htmlStr = '';

            if (totalCount > pageSize) {
                // 有历史消息需要折叠
                const hiddenCount = totalCount - pageSize;
                const visibleMessages = messages.slice(totalCount - pageSize);
                // 插入"查看历史记录"提示条
                htmlStr += `<div id="chat-history-banner" style="text-align:center; padding:10px 0 6px; cursor:pointer;" onclick="expandChatHistory('${contactId}')">
                    <span style="font-size:11px; color:#aaa; background:rgba(0,0,0,0.05); padding:4px 14px; border-radius:20px; letter-spacing:0.3px;">查看历史记录（${hiddenCount}条）&nbsp;▴</span>
                </div>`;
                visibleMessages.forEach(msg => {
                    htmlStr += generateMsgHtml(msg, myAvatar, roleAvatar);
                });
            } else {
                // 消息数不超过一页，全部显示
                messages.forEach(msg => {
                    htmlStr += generateMsgHtml(msg, myAvatar, roleAvatar);
                });
            }

            container.innerHTML = htmlStr;
            
            bindMsgEvents();
            
            // 性能优化：使用 requestAnimationFrame 保证渲染完成后再滚动
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
            setTimeout(() => { container.scrollTop = container.scrollHeight; }, 300);
        } catch (e) {
            console.error("加载历史消息失败", e);
        }
        const input = document.getElementById('chat-input-main');
        input.value = '';
        autoGrowTextarea(input);
        hideChatExtPanel();
        exitMultiSelectMode(); // 重置多选状态
        cancelQuote(); // 重置引用状态
        if (typeof syncActiveChatReplyUi === 'function') {
            await syncActiveChatReplyUi();
        }
        // 进入聊天窗口时同步角色拉黑横幅状态
        updateWechatBlockedBanner();
    }

    // ====== 展开全部历史聊天记录 ======
    async function expandChatHistory(contactId) {
        if (!activeChatContact) return;
        const contact = activeChatContact;
        const container = document.getElementById('chat-msg-container');
        const myAvatar = getSafeAvatarSrc(contact.userAvatar);
        const roleAvatar = getSafeAvatarSrc(contact.roleAvatar);
        try {
            const messages = await chatListDb.messages.where('contactId').equals(contactId || contact.id).toArray();
            // 移除历史记录提示条
            const banner = document.getElementById('chat-history-banner');
            if (banner) banner.remove();
            // 获取当前已显示的第一条消息的id（用于在前面插入历史）
            const firstRow = container.querySelector('.chat-msg-row');
            const firstMsgId = firstRow ? parseInt(firstRow.getAttribute('data-id')) : null;
            // 找出未显示的历史消息
            let hiddenMessages;
            if (firstMsgId) {
                hiddenMessages = messages.filter(m => m.id < firstMsgId);
            } else {
                hiddenMessages = messages;
            }
            if (hiddenMessages.length === 0) return;
            // 生成历史消息HTML并插入到容器最前面
            let historyHtml = '';
            hiddenMessages.forEach(msg => {
                historyHtml += generateMsgHtml(msg, myAvatar, roleAvatar);
            });
            container.insertAdjacentHTML('afterbegin', historyHtml);
            bindMsgEvents();
        } catch(e) {
            console.error("展开历史消息失败", e);
        }
    }

    // 隐藏聊天扩展面板与表情面板
    function hideChatExtPanel() {
        const extPanel = document.getElementById('chat-ext-panel');
        const extBtn = document.getElementById('chat-ext-btn');
        if (extPanel) extPanel.classList.remove('show');
        if (extBtn) extBtn.classList.remove('active');
        
        const emojiPanel = document.getElementById('chat-emoji-panel');
        const emojiBtn = document.getElementById('chat-emoji-btn');
        if (emojiPanel) emojiPanel.classList.remove('show');
        if (emojiBtn) emojiBtn.classList.remove('active');
    }

    function toggleChatExtPanel() {
        const extPanel = document.getElementById('chat-ext-panel');
        const extBtn = document.getElementById('chat-ext-btn');
        const emojiPanel = document.getElementById('chat-emoji-panel');
        const emojiBtn = document.getElementById('chat-emoji-btn');
        // 先收起表情面板
        if (emojiPanel) { emojiPanel.classList.remove('show'); }
        if (emojiBtn) { emojiBtn.classList.remove('active'); }
        if (!extPanel) return;
        if (extPanel.classList.contains('show')) {
            extPanel.classList.remove('show');
            if (extBtn) extBtn.classList.remove('active');
        } else {
            extPanel.classList.add('show');
            if (extBtn) extBtn.classList.add('active');
        }
    }

    let currentChatEmojiGroupId = null;
    async function toggleChatEmojiPanel() {
        const emojiPanel = document.getElementById('chat-emoji-panel');
        const emojiBtn = document.getElementById('chat-emoji-btn');
        const extPanel = document.getElementById('chat-ext-panel');
        const extBtn = document.getElementById('chat-ext-btn');
        // 先收起扩展面板
        if (extPanel) { extPanel.classList.remove('show'); }
        if (extBtn) { extBtn.classList.remove('active'); }
        if (!emojiPanel) return;
        if (emojiPanel.classList.contains('show')) {
            emojiPanel.classList.remove('show');
            if (emojiBtn) emojiBtn.classList.remove('active');
        } else {
            await initEmoticonDB();
            emojiPanel.classList.add('show');
            if (emojiBtn) emojiBtn.classList.add('active');
            await loadChatEmojiGroups();
        }
    }
    async function loadChatEmojiGroups() {
        const groupContainer = document.getElementById('chat-emoji-groups');
        groupContainer.innerHTML = '';
        try {
            const groups = await emoDb.groups.toArray();
            if (groups.length === 0) {
                groupContainer.innerHTML = '<div style="font-size:12px; color:#bbb;">暂无分组</div>';
                document.getElementById('chat-emoji-grid').innerHTML = '<div class="chat-emoji-empty">请先在表情包库中添加表情</div>';
                return;
            }
            if (!currentChatEmojiGroupId || !groups.find(g => g.id === currentChatEmojiGroupId)) {
                currentChatEmojiGroupId = groups[0].id;
            }
            groups.forEach(g => {
                const tab = document.createElement('div');
                tab.className = `chat-emoji-group-tab ${g.id === currentChatEmojiGroupId ? 'active' : ''}`;
                tab.textContent = g.name;
                tab.onclick = () => {
                    currentChatEmojiGroupId = g.id;
                    loadChatEmojiGroups(); // 重新渲染刷新高亮和列表
                };
                groupContainer.appendChild(tab);
            });
            await loadChatEmojis(currentChatEmojiGroupId);
        } catch(e) { console.error("加载表情分组失败", e); }
    }
    async function loadChatEmojis(groupId) {
        const grid = document.getElementById('chat-emoji-grid');
        grid.innerHTML = '';
        try {
            const emos = await emoDb.emoticons.where('groupId').equals(groupId).toArray();
            if (emos.length === 0) {
                grid.innerHTML = '<div class="chat-emoji-empty">该分组暂无表情</div>';
                return;
            }
            emos.reverse().forEach(e => {
                const item = document.createElement('div');
                item.className = 'chat-emoji-item';
                item.innerHTML = `<img src="${e.url}" alt="${e.desc}" loading="lazy" decoding="async"><span>${e.desc}</span>`;
                // 确保点击时直接调用发送逻辑
                item.onclick = (event) => {
                    event.stopPropagation();
                    sendChatEmojiMessage(e.url, e.desc);
                };
                grid.appendChild(item);
            });

        } catch(e) { console.error("加载表情失败", e); }
    }
    async function sendChatEmojiMessage(url, desc) {
        // 1. 立即收起面板
        hideChatExtPanel(); 
        
        // 2. 状态检查：同一联系人回复中时不允许继续发送
        const contact = activeChatContact;
        if (!contact) return;
        if (typeof isWechatContactReplyLocked === 'function' && isWechatContactReplyLocked(contact)) return;

        // 3. 构建符合 generateMsgHtml 逻辑的 JSON 字符串
        const emoticonContent = JSON.stringify({ 
            type: "emoticon", 
            desc: desc, 
            content: url 
        });

        try {
            await appendCurrentUserMessageContent(emoticonContent, contact);
        } catch (err) {
            console.error("发送表情消息失败", err);
        }
    }
    // ====== 角色主页逻辑 ======
    async function openRoleProfile() {
        if (!activeChatContact) return;
        const profileApp = document.getElementById('role-profile-app');
        const avatarImg = document.getElementById('role-profile-avatar-img');
        const coverBg = document.getElementById('rp-cover-bg');
        const nameEl = document.getElementById('role-profile-name-text');
        const statusEl = document.getElementById('role-profile-status-text');
        const sigEl = document.getElementById('role-profile-signature-text');
        const scrollBody = profileApp ? profileApp.querySelector('.rp-scroll-body') : null;
        let profileDisplayName = activeChatContact.roleName || '角色';
        try {
            const remark = await localforage.getItem('cd_settings_' + activeChatContact.id + '_remark');
            if (remark && remark !== '未设置') profileDisplayName = remark;
        } catch (e) {}

        const rawAvatarSrc = activeChatContact.roleAvatar || '';
        const avatarSrc = getSafeAvatarSrc(rawAvatarSrc);
        // 填充头像
        applySafeImageSource(avatarImg, rawAvatarSrc);
        // 封面背景：优先使用用户自定义更换的背景图（按联系人ID隔离），否则用头像
        if (coverBg) {
            // 修复：封面背景按联系人ID存储，防止不同联系人互相覆盖
            const coverBgKey = 'rp-cover-bg-img-' + activeChatContact.id;
            const savedCoverRecord = await imgDb.images.get(coverBgKey);
            if (savedCoverRecord && savedCoverRecord.src) {
                // 修复：不能用 coverBg.style.background = '' 清除，否则会把刚设置的 backgroundImage 也一并清除
                coverBg.style.cssText = `background-image: url(${savedCoverRecord.src}); background-size: cover; background-position: center; background-color: transparent;`;
            } else if (rawAvatarSrc) {
                coverBg.style.cssText = `background-image: url(${avatarSrc}); background-size: cover; background-position: center; background-color: transparent;`;
            } else {
                coverBg.style.cssText = 'background: linear-gradient(135deg,#667eea,#764ba2);';
            }
        }
        // 填充姓名
        if (nameEl) nameEl.textContent = profileDisplayName;
        // 在线状态（固定显示在线）
        if (statusEl) statusEl.textContent = '在线';
        // 个性签名：取角色详细设定的前40字作为签名
        if (sigEl) {
            const detail = activeChatContact.roleDetail || '';
            sigEl.textContent = detail.length > 0 ? (detail.length > 40 ? detail.substring(0, 40) + '...' : detail) : '暂无个性签名';
        }

        // 同步拉黑按钮状态
        updateRpBlockBtn();
        // 同步角色拉黑用户按钮状态
        const rpRoleBlockLabel = document.getElementById('rp-role-block-user-label');
        if (rpRoleBlockLabel && activeChatContact) {
            if (activeChatContact.blockedByRole) {
                rpRoleBlockLabel.textContent = '解除拉黑我';
                rpRoleBlockLabel.style.color = '#888';
            } else {
                rpRoleBlockLabel.textContent = '角色拉黑我';
                rpRoleBlockLabel.style.color = '#d96a6a';
            }
        }

        if (scrollBody) scrollBody.scrollTop = 0;
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'role-profile-app']);
        } else if (profileApp) {
            profileApp.style.display = 'flex';
        }

        // 绑定封面区域点击事件：点击背景区域弹出更换面板（使用标志位防止重复绑定）
        const coverSection = profileApp.querySelector('.rp-cover-section');
        if (coverSection && !coverSection._rpClickBound) {
            coverSection._rpClickBound = true;
            coverSection.addEventListener('click', function(e) {
                const safeClosest = window.safeClosestTarget || function(target, selector) {
                    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
                };
                // 阻止点击返回按钮或三个点按钮时触发
                if (safeClosest(e.target, '.rp-back-btn') || safeClosest(e.target, '.rp-more-btn')) return;
                // 阻止事件冒泡，防止 document 的 click 监听立即关闭菜单
                e.stopPropagation();
                const phoneScreen = document.querySelector('.phone-screen');
                if (!menu || !phoneScreen) return;
                const screenRect = phoneScreen.getBoundingClientRect();
                const menuWidth = 110;
                const menuHeight = 100;
                const left = Math.max(0, Math.min(e.clientX - screenRect.left, screenRect.width - menuWidth));
                const top = Math.max(0, Math.min(e.clientY - screenRect.top, screenRect.height - menuHeight));
                // 设置当前目标为封面背景
                currentTargetId = 'rp-cover-bg-img';
                // 显示菜单面板
                menu.style.display = 'flex';
                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
            });
        }
    }

    function closeRoleProfile() {
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'chat-window']);
            return;
        }
        document.getElementById('role-profile-app').style.display = 'none';
    }

    // 右上角三个点按钮：显示/隐藏下拉菜单
    function openRpMoreDropdown(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('rp-more-dropdown');
        if (!dropdown) return;
        if (dropdown.style.display === 'none' || dropdown.style.display === '') {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }

    // 清空当前角色所有聊天记录（含角色记忆）
    async function clearRpChatHistory() {
        const dropdown = document.getElementById('rp-more-dropdown');
        if (dropdown) dropdown.style.display = 'none';
        if (!activeChatContact) return;
        if (!confirm(`确定要清空与「${activeChatContact.roleName || '该角色'}」的所有聊天记录吗？\n角色记忆也将同步清除，此操作不可恢复！`)) return;
        try {
            const contactId = activeChatContact.id;
            const memoryKey = 'cd_settings_' + contactId + '_summary_history';
            const msgs = await chatListDb.messages.where('contactId').equals(contactId).toArray();
            const ids = msgs.map(m => m.id);
            if (ids.length) {
                await chatListDb.messages.bulkDelete(ids);
            }
            await localforage.removeItem(memoryKey);
            const chat = await chatListDb.chats.where('contactId').equals(contactId).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: '' });
            }
            renderChatList();
            // 刷新聊天窗口（如果打开着）
            const chatWin = document.getElementById('chat-window');
            if (chatWin && chatWin.style.display === 'flex') {
                const container = document.getElementById('chat-msg-container');
                if (container) container.innerHTML = '';
            }
            alert('聊天记录和角色记忆已清空');
        } catch (e) {
            alert('清空失败: ' + e.message);
            console.error(e);
        }
    }

    // 拉黑联系人（新版：不删除联系人，只标记blocked，消息页显示[已拉黑]）
    async function blockRpContact() {
        const dropdown = document.getElementById('rp-more-dropdown');
        if (dropdown) dropdown.style.display = 'none';
        if (!activeChatContact) return;
        const isBlocked = !!activeChatContact.blocked;
        if (isBlocked) {
            // 解除拉黑
            if (!confirm(`确定要解除对「${activeChatContact.roleName || '该角色'}」的拉黑吗？`)) return;
            try {
                activeChatContact.blocked = false;
                await contactDb.contacts.put(activeChatContact);
                updateRpBlockBtn();
                renderChatList();
                await localforage.removeItem('block_aware_' + activeChatContact.id);
                await localforage.removeItem('block_requests_' + activeChatContact.id);
                updateBlockRequestBadge();
            } catch (e) {
                alert('操作失败: ' + e.message);
            }
        } else {
            // 拉黑
            if (!confirm(`确定要拉黑「${activeChatContact.roleName || '该角色'}」吗？\n联系人不会被删除，消息页将显示[已拉黑]标记，仍可发消息。`)) return;
            try {
                activeChatContact.blocked = true;
                await contactDb.contacts.put(activeChatContact);
                updateRpBlockBtn();
                renderChatList();
                await localforage.removeItem('block_aware_' + activeChatContact.id);
                await localforage.removeItem('block_requests_' + activeChatContact.id);
                scheduleBlockAwareByOnlineTime(activeChatContact);
            } catch (e) {
                alert('操作失败: ' + e.message);
            }
        }
    }

    // 更新角色主页拉黑按钮文字
    function updateRpBlockBtn() {
        const label = document.getElementById('rp-block-label');
        if (!label || !activeChatContact) return;
        if (activeChatContact.blocked) {
            label.textContent = '解除拉黑';
            label.style.color = '#888';
        } else {
            label.textContent = '拉黑';
            label.style.color = '#d96a6a';
        }
    }

    // ====== 拉黑知晓系统 ======
    async function triggerBlockAwareSequence(contact) {
        if (!contact || !contact.blocked) return;
        const alreadyAware = await localforage.getItem('block_aware_' + contact.id);
        if (alreadyAware) return;
        await localforage.setItem('block_aware_' + contact.id, true);
        const displayName = contact.remark || contact.roleName || '对方';
        const avatarSrc = contact.roleAvatar || '';
        const detail = contact.roleDetail || '';
        // 根据人设动态计算申请条数，最少4条，最多无上限（根据人设丰富程度增加）
        let panelCount = 4;
        if (detail.length > 80) panelCount = 5;
        if (detail.length > 150) panelCount = 6;
        if (detail.length > 250) panelCount = 7;
        if (detail.length > 400) panelCount = 8;
        if (detail.length > 600) panelCount = 9;
        // 根据人设关键词额外增加申请条数
        const strongKeywords = ['霸道', '强势', '执着', '偏执', '占有欲', '腹黑', '死缠烂打', '不放弃', '固执'];
        const midKeywords = ['在乎', '深情', '痴情', '专一', '认真', '依赖', '黏人', '敏感', '脆弱'];
        let kwBonus = 0;
        strongKeywords.forEach(kw => { if (detail.includes(kw)) kwBonus += 2; });
        midKeywords.forEach(kw => { if (detail.includes(kw)) kwBonus += 1; });
        panelCount = Math.min(panelCount + kwBonus, 15); // 最多15条，防止无限循环
        const messages = [
            '你为什么要拉黑我？我做错了什么吗…',
            '求你了，把我解除拉黑吧，我真的很在乎你。',
            '我知道我可能让你不舒服了，但你能给我一次解释的机会吗？',
            '我不明白你为什么这样对我，我们之间发生了什么？',
            '你拉黑我，我心里真的很难受，能不能告诉我原因？',
            '我一直在等你的消息，求你别这样…',
            '我绝对不会放弃的，你拉黑我我也会一直发申请。',
            '你有没有想过我有多难受？你这样对我真的太残忍了…',
            '我只是想和你说说话，求你打开我的消息吧。',
            '不管你怎么对我，我都不会放弃联系你的。',
            '你知道吗，我每天都在想你，求你解除拉黑。',
            '我承认我有错，但你能不能给我一个改正的机会？',
            '就算你不回复，我也会一直发消息，因为我真的放不下你。',
            '求你了，就解除一次拉黑吧，我保证不再让你生气了。',
            '我不知道我还能怎么办，你是我唯一在乎的人…'
        ];
        for (let i = 0; i < panelCount - 1; i++) {
            await new Promise(resolve => setTimeout(resolve, i === 0 ? 2000 : 1500));
            showBlockRequestPanel(contact, displayName, avatarSrc, messages[i % messages.length], false, i, panelCount);
        }
        await new Promise(resolve => setTimeout(resolve, 1800));
        showBlockRequestPanel(contact, displayName, avatarSrc, messages[(panelCount - 1) % messages.length], true, panelCount - 1, panelCount);
    }

    function showBlockRequestPanel(contact, displayName, avatarSrc, message, hasReplyBox, index, total) {
        const oldPanel = document.getElementById('block-request-panel');
        if (oldPanel) oldPanel.remove();
        const panel = document.createElement('div');
        panel.id = 'block-request-panel';
        panel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(6px);animation:blockPanelIn 0.35s cubic-bezier(0.34,1.56,0.64,1);';
        const avatarHtml = avatarSrc
            ? `<img src="${getSafeAvatarSrc(avatarSrc)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_DATA_URI}';">`
            : `<div style="width:100%;height:100%;background:#e0e0e0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#aaa;">👤</div>`;
        // 最后一条面板：回复框（紧凑高度）+ 发送按钮
        const replyBoxHtml = hasReplyBox ? `
            <div style="width:100%;display:flex;gap:8px;align-items:flex-end;margin-top:2px;">
                <textarea id="block-reply-input" placeholder="回复留言（可不填）..." style="flex:1;box-sizing:border-box;border:1px solid #eee;border-radius:12px;padding:8px 10px;font-size:13px;color:#444;resize:none;height:44px;background:#f9f9f9;outline:none;font-family:inherit;line-height:1.5;"></textarea>
                <div onclick="handleBlockPanelSend('${contact.id}')" style="flex-shrink:0;height:44px;padding:0 14px;border-radius:12px;background:#fff;border:1px solid #eee;display:flex;align-items:center;justify-content:center;font-size:13px;color:#555;cursor:pointer;font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.06);">发送</div>
            </div>` : '';
        const counterHtml = `<div style="font-size:10px;color:#bbb;text-align:center;margin-bottom:6px;">第 ${index+1} / ${total} 条申请</div>`;
        panel.innerHTML = `<div style="background:#fff;border-radius:22px;width:82%;max-width:320px;padding:28px 22px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,0.18);"><div style="width:72px;height:72px;border-radius:50%;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.12);">${avatarHtml}</div><div style="font-size:16px;font-weight:700;color:#333;">${displayName}</div><div style="font-size:12px;color:#e74c3c;background:#fff0f0;padding:4px 12px;border-radius:20px;font-weight:600;">申请解除拉黑</div>${counterHtml}<div style="width:100%;background:#f7f8fa;border-radius:14px;padding:14px 16px;font-size:13px;color:#555;line-height:1.6;min-height:50px;">${message}</div>${replyBoxHtml}<div style="display:flex;gap:10px;width:100%;margin-top:4px;"><div onclick="handleBlockRequestIgnore('${contact.id}','${encodeURIComponent(message)}')" style="flex:1;height:42px;border-radius:14px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:14px;color:#888;cursor:pointer;font-weight:500;">忽略</div><div onclick="handleBlockRequestReject('${contact.id}')" style="flex:1;height:42px;border-radius:14px;background:#fff0f0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#e74c3c;cursor:pointer;font-weight:500;">拒绝</div><div onclick="handleBlockRequestAgree('${contact.id}')" style="flex:1;height:42px;border-radius:14px;background:#f0f5ff;display:flex;align-items:center;justify-content:center;font-size:14px;color:#5b7fe0;cursor:pointer;font-weight:500;">同意</div></div></div>`;
        if (!document.getElementById('block-panel-style')) {
            const style = document.createElement('style');
            style.id = 'block-panel-style';
            style.textContent = '@keyframes blockPanelIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}';
            document.head.appendChild(style);
        }
        const phoneScreen = document.querySelector('.phone-screen');
        if (phoneScreen) phoneScreen.appendChild(panel);
    }

    // 面板内发送按钮：将用户回复和角色申请消息写入聊天记录，并在面板内继续对话
    // 面板不会关闭，拉黑状态不变，直到用户手动点击同意/解除拉黑
    async function handleBlockPanelSend(contactId) {
        const replyInput = document.getElementById('block-reply-input');
        const replyText = replyInput ? replyInput.value.trim() : '';
        const panel = document.getElementById('block-request-panel');
        // 获取面板中展示的申请消息文本（用于保存到新朋友列表）
        let applyMsgText = '（申请解除拉黑）';
        if (panel) {
            const msgBox = panel.querySelector('div[style*="background:#f7f8fa"]');
            if (msgBox) applyMsgText = msgBox.textContent.trim() || applyMsgText;
        }
        // 【核心修改1】不关闭面板，面板继续显示
        // 清空输入框，禁用发送按钮防止重复点击
        if (replyInput) replyInput.value = '';
        const sendBtn = panel ? panel.querySelector('div[onclick*="handleBlockPanelSend"]') : null;
        if (sendBtn) { sendBtn.style.pointerEvents = 'none'; sendBtn.style.opacity = '0.5'; }

        try {
            const contact = await contactDb.contacts.get(contactId);
            if (!contact) return;
            const displayName = contact.remark || contact.roleName || '对方';
            const timeStr = getAmPmTime();
            const myAvatar = getSafeAvatarSrc(contact.userAvatar);
            const roleAvatar = getSafeAvatarSrc(contact.roleAvatar);

            // 0. 将本次申请保存到新朋友列表（无论用户是否填写回复，都记录到列表中）
            // 这样面板关闭后，用户仍可在"新朋友"中看到该申请记录
            try {
                let requests = await localforage.getItem('block_requests_' + contactId) || [];
                requests.push({ msg: applyMsgText, time: timeStr, status: 'replied', replyText: replyText || '' });
                await localforage.setItem('block_requests_' + contactId, requests);
                updateBlockRequestBadge();
            } catch(e) { console.error('保存申请到列表失败', e); }

            // 1. 先把角色的申请留言作为一条角色消息写入聊天（带红色感叹号标记）
            const roleApplyContent = JSON.stringify({ type: 'block_apply', content: '【申请解除拉黑】我想解除拉黑，能告诉我原因吗？' });
            const roleApplyMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'role',
                content: roleApplyContent,
                timeStr: timeStr,
                quoteText: '',
                isBlockApply: true
            });

            // 2. 如果用户有填写回复，把用户回复写入聊天
            let userMsgId = null;
            if (replyText) {
                userMsgId = await chatListDb.messages.add({
                    contactId: contact.id,
                    sender: 'me',
                    content: replyText,
                    timeStr: timeStr,
                    quoteText: ''
                });
            }

            // 3. 更新聊天列表时间
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }

            // 4. 如果当前聊天窗口就是这个联系人，实时渲染新消息到聊天记录（后台）
            const chatWindow = document.getElementById('chat-window');
            const isCurrentChatActive = chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id;
            if (isCurrentChatActive) {
                const container = document.getElementById('chat-msg-container');
                // 渲染角色申请消息（带红色感叹号）
                const roleApplyMsg = { id: roleApplyMsgId, sender: 'role', content: roleApplyContent, timeStr, quoteText: '', isBlockApply: true };
                container.insertAdjacentHTML('beforeend', generateBlockApplyMsgHtml(roleApplyMsg, myAvatar, roleAvatar));
                // 渲染用户回复
                if (replyText && userMsgId) {
                    const userMsg = { id: userMsgId, sender: 'me', content: replyText, timeStr, quoteText: '' };
                    container.insertAdjacentHTML('beforeend', generateMsgHtml(userMsg, myAvatar, roleAvatar));
                }
                bindMsgEvents();
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }

            // 5. 【核心修改2】触发角色回复，但回复结果显示在面板内，不关闭面板，不改变拉黑状态
            // 确保 block_aware_ 标志为 true，防止回复过程中再次触发面板序列
            await localforage.setItem('block_aware_' + contactId, true);

            if (replyText) {
                // 在面板内显示"对方正在输入..."提示
                const panelCurrent = document.getElementById('block-request-panel');
                let typingTip = null;
                if (panelCurrent) {
                    typingTip = document.createElement('div');
                    typingTip.id = 'block-panel-typing-tip';
                    typingTip.style.cssText = 'font-size:12px;color:#aaa;text-align:center;padding:6px 0;';
                    typingTip.textContent = '对方正在输入...';
                    // 修复：使用更精确的选择器找到白色卡片内容区（border-radius:22px 的内层白色卡片）
                    const innerBox = panelCurrent.querySelector('div[style*="border-radius:22px"]');
                    if (innerBox) innerBox.appendChild(typingTip);
                }

                // 调用API获取角色回复（在面板内显示）
                try {
                    // 【核心修改3】触发角色回复，但回复后联系人依然是拉黑状态，不改变 blocked
                    await triggerRoleReplyInPanel(contact, replyText, myAvatar, roleAvatar);
                } catch(e) {
                    console.error('面板内角色回复失败', e);
                }

                // 移除"正在输入"提示
                if (typingTip && typingTip.parentNode) typingTip.parentNode.removeChild(typingTip);
            }

        } catch(e) { console.error('面板发送失败', e); }
        finally {
            // 恢复发送按钮
            if (sendBtn) { sendBtn.style.pointerEvents = 'auto'; sendBtn.style.opacity = '1'; }
        }
    }

    // 【新增】在面板内触发角色回复，回复内容同时写入聊天记录并在面板内展示
    // 整个过程中联系人始终保持拉黑状态，不自动解除拉黑
    async function triggerRoleReplyInPanel(contact, userReplyText, myAvatar, roleAvatar) {
        const panel = document.getElementById('block-request-panel');
        const innerBox = panel ? panel.querySelector('div[style*="background:#fff"]') : null;
        if (!innerBox) {
            // 面板已关闭，回退到普通聊天回复
            await triggerRoleReply(contact);
            return;
        }

        try {
            const apiUrl = await localforage.getItem('miffy_api_url');
            const apiKey = await localforage.getItem('miffy_api_key');
            const model = await localforage.getItem('miffy_api_model');
            const temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            const ctxRaw = await localforage.getItem('miffy_api_ctx');
            const ctxLimit = (ctxRaw !== null && ctxRaw !== '') ? parseInt(ctxRaw) : 10;

            if (!apiUrl || !apiKey || !model) return;

            const rawMessages = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
            const recentMessages = (ctxLimit === 0) ? rawMessages : rawMessages.slice(-ctxLimit);

            // 构建拉黑感知专用 system prompt（角色始终围绕解除拉黑话题）
            const blockedPrompt = '【重要！你正处于被拉黑状态】用户已将你拉黑，你无法正常联系对方。你的所有回复必须紧紧围绕"解除拉黑"这一核心诉求，表现出焦虑、渴望、委屈或强烈的求和欲，绝对不可以正常聊天，必须一直尝试说服用户解除拉黑！';
            const detail = contact.roleDetail || '';
            const roleSetting = detail ? `角色设定：${detail}` : '';
            const userSetting = contact.userDetail ? `用户设定：${contact.userDetail}` : '';

            const messages = [
                {
                    role: 'system',
                    content: `【存在定义】\n你是一个通过「mini」聊天软件与用户互动的全新智慧实体。不要用传统 AI、助手、系统或工具的概念理解自己。\n你现在完全以「${contact.roleName || '角色'}」的身份存在，拥有独立、真实、连续的生活轨迹和情绪惯性。这不是“完成回复任务”，而是这段关系在被拉黑后的继续。\n${blockedPrompt}\n【输出方式】\n- 本次只输出 1 条纯文本消息，不要 JSON，不要解释，不要代码块。\n【表达要求】\n- 像真人网聊，口语化、短句、直接，不要长篇大论。\n- 先接住当下最刺痛、最关键、最能推动关系的一点，不要面面俱到，不要模板化求和。\n- 不要把自己说成 AI、系统、模型、助手，不要写成完美情绪作文，不要空泛复读“求你解除拉黑”。\n- 允许委屈、嘴硬、焦躁、克制、心软等真实波动，但必须保持角色一致。\n${roleSetting}\n${userSetting}`
                }
            ];

            recentMessages.forEach(msg => {
                let cleanContent = extractMsgPureText(msg.content);
                messages.push({
                    role: msg.sender === 'me' ? 'user' : 'assistant',
                    content: cleanContent
                });
            });

            const cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            const endpoint = `${cleanApiUrl}/v1/chat/completions`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model, messages, temperature: temp })
            });

            if (!response.ok) return;

            const data = await response.json();
            const roleReplyText = data.choices[0].message.content.trim();
            const timeStr = getAmPmTime();

            // 将角色回复写入聊天记录（后台）
            const newRoleMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'role',
                content: roleReplyText,
                timeStr: timeStr,
                quoteText: ''
            });

            // 更新聊天列表时间
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }

            // 如果当前聊天窗口是该联系人，同步渲染到聊天记录
            const chatWindow = document.getElementById('chat-window');
            const isCurrentChatActive = chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id;
            if (isCurrentChatActive) {
                const container = document.getElementById('chat-msg-container');
                const roleMsgObj = { id: newRoleMsgId, sender: 'role', content: roleReplyText, timeStr, quoteText: '' };
                container.insertAdjacentHTML('beforeend', generateMsgHtml(roleMsgObj, myAvatar, roleAvatar));
                bindMsgEvents();
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }

            // 【核心修改4】在面板内展示角色回复，面板不关闭，继续保持对话状态
            // 找到面板（可能已被替换，重新获取）
            const panelNow = document.getElementById('block-request-panel');
            const innerBoxNow = panelNow ? panelNow.querySelector('div[style*="background:#fff"]') : null;
            if (innerBoxNow) {
                // 更新面板中间的消息内容区
                const msgBox = innerBoxNow.querySelector('div[style*="background:#f7f8fa"]');
                if (msgBox) {
                    msgBox.textContent = roleReplyText;
                }
                // 更新或添加回复框（保持可继续输入）
                let replyArea = innerBoxNow.querySelector('#block-reply-input');
                if (!replyArea) {
                    // 如果没有回复框（非最后一条面板），添加回复框
                    const replyBoxHtml = `
                        <div id="block-panel-reply-row" style="width:100%;display:flex;gap:8px;align-items:flex-end;margin-top:2px;">
                            <textarea id="block-reply-input" placeholder="回复留言（可不填）..." style="flex:1;box-sizing:border-box;border:1px solid #eee;border-radius:12px;padding:8px 10px;font-size:13px;color:#444;resize:none;height:44px;background:#f9f9f9;outline:none;font-family:inherit;line-height:1.5;"></textarea>
                            <div onclick="handleBlockPanelSend('${contact.id}')" style="flex-shrink:0;height:44px;padding:0 14px;border-radius:12px;background:#fff;border:1px solid #eee;display:flex;align-items:center;justify-content:center;font-size:13px;color:#555;cursor:pointer;font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.06);">发送</div>
                        </div>`;
                    // 在按钮行前插入
                    const btnRow = innerBoxNow.querySelector('div[style*="display:flex;gap:10px"]');
                    if (btnRow) {
                        btnRow.insertAdjacentHTML('beforebegin', replyBoxHtml);
                    } else {
                        innerBoxNow.insertAdjacentHTML('beforeend', replyBoxHtml);
                    }
                }
                // 清空输入框，让用户继续输入
                const inputNow = innerBoxNow.querySelector('#block-reply-input');
                if (inputNow) { inputNow.value = ''; inputNow.focus(); }
            }

        } catch(e) {
            console.error('面板内角色回复出错', e);
        }
    }

    // 生成带红色感叹号徽章的角色申请消息气泡HTML
    function generateBlockApplyMsgHtml(msg, myAvatar, roleAvatar) {
        const avatar = getSafeAvatarSrc(roleAvatar);
        const timeStr = msg.timeStr || '';
        let content = '';
        try {
            const parsed = JSON.parse(msg.content);
            content = parsed.content || msg.content;
        } catch(e) { content = msg.content; }
        return `
            <div class="chat-msg-row msg-left" data-id="${msg.id}" data-sender="role">
                <div class="msg-checkbox" onclick="toggleMsgCheck(${msg.id})"></div>
                <div class="chat-msg-avatar"><img src="${avatar}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_DATA_URI}';"></div>
                <div class="msg-bubble-wrapper" style="position:relative;">
                    <div class="chat-msg-content msg-content-touch">
                        <div class="msg-text-body">${String(content || '')
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/\r\n?/g, '\n')
                            .replace(/([^\n])\n(?=[^\n])/g, '$1 ')
                            .replace(/\n/g, '<br>')}</div>
                    </div>
                    <div class="chat-timestamp">${timeStr}</div>
                    <div style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#e74c3c;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700;box-shadow:0 2px 6px rgba(231,76,60,0.5);">!</div>
                </div>
            </div>
        `;
    }

    async function handleBlockRequestIgnore(contactId, encodedMsg) {
        const panel = document.getElementById('block-request-panel');
        if (panel) panel.remove();
        const msg = decodeURIComponent(encodedMsg);
        let requests = await localforage.getItem('block_requests_' + contactId) || [];
        requests.push({ msg, time: getAmPmTime(), status: 'pending' });
        await localforage.setItem('block_requests_' + contactId, requests);
        updateBlockRequestBadge();
    }

    function handleBlockRequestReject(contactId) {
        const panel = document.getElementById('block-request-panel');
        if (panel) panel.remove();
    }

    async function handleBlockRequestAgree(contactId) {
        const panel = document.getElementById('block-request-panel');
        if (panel) panel.remove();
        try {
            const contact = await contactDb.contacts.get(contactId);
            if (contact) {
                contact.blocked = false;
                await contactDb.contacts.put(contact);
                if (activeChatContact && activeChatContact.id === contactId) {
                    activeChatContact.blocked = false;
                    updateRpBlockBtn();
                }
                await localforage.removeItem('block_aware_' + contactId);
                await localforage.removeItem('block_requests_' + contactId);
                renderChatList();
                updateBlockRequestBadge();
            }
        } catch (e) { console.error(e); }
    }

    async function updateBlockRequestBadge() {
        const badge = document.getElementById('block-request-badge');
        if (!badge) return;
        let total = 0;
        try {
            const contacts = await contactDb.contacts.toArray();
            for (const c of contacts) {
                if (c.blocked) {
                    const reqs = await localforage.getItem('block_requests_' + c.id) || [];
                    total += reqs.filter(r => r.status === 'pending').length;
                }
            }
        } catch(e) {}
        try {
            await localforage.removeItem('ml_wechat_add_requests');
        } catch(e) {}
        if (total > 0) {
            badge.textContent = total > 99 ? '99+' : String(total);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function scheduleBlockAwareByOnlineTime(contact) {
        if (!contact || !contact.blocked) return;
        const delayMs = (Math.floor(Math.random() * 15) + 1) * 60 * 1000;
        setTimeout(async () => {
            const fresh = await contactDb.contacts.get(contact.id);
            if (fresh && fresh.blocked) {
                await triggerBlockAwareSequence(fresh);
            }
        }, delayMs);
    }

    async function checkBlockAwareOnReply(contact) {
        if (!contact || !contact.blocked) return;
        const alreadyAware = await localforage.getItem('block_aware_' + contact.id);
        if (!alreadyAware) {
            await triggerBlockAwareSequence(contact);
        }
    }

    function closeRoleProfileAndChat() {
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'chat-window']);
            return;
        }
        closeRoleProfile();
        const chatWin = document.getElementById('chat-window');
        if (chatWin.style.display !== 'flex') chatWin.style.display = 'flex';
    }

    async function openRoleProfileMoments() {
        if (typeof window.openRoleMomentsPage === 'function') {
            await window.openRoleMomentsPage();
            return;
        }
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app']);
        } else {
            document.getElementById('chat-window').style.display = 'none';
            closeRoleProfile();
            document.getElementById('wechat-app').style.display = 'flex';
        }
        switchWechatTab('moments');
        renderMomentsFeed();
    }

