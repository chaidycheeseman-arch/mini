// Auto-split from js/messaging/sms-and-notify.js (1225-1787)

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

    var _pushSubscribeBusy = false;
    var _pushApiBase = '';

    function _urlBase64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        var rawData = atob(base64);
        var outputArray = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function _postPushApi(path, payload) {
        try {
            var resp = await fetch(_pushApiBase + path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });
            var data = null;
            try { data = await resp.json(); } catch (e) {}
            if (!resp.ok) {
                return {
                    ok: false,
                    reason: (data && data.reason) ? data.reason : ('http_' + resp.status),
                    status: resp.status,
                    data: data
                };
            }
            return data || { ok: true };
        } catch (e2) {
            return { ok: false, reason: 'push_server_unavailable', error: e2 && e2.message ? e2.message : String(e2) };
        }
    }

    async function _fetchPushApi(path) {
        try {
            var resp = await fetch(_pushApiBase + path, { method: 'GET' });
            var data = null;
            try { data = await resp.json(); } catch (e) {}
            if (!resp.ok) {
                return {
                    ok: false,
                    reason: (data && data.reason) ? data.reason : ('http_' + resp.status),
                    status: resp.status,
                    data: data
                };
            }
            return data || { ok: true };
        } catch (e2) {
            return { ok: false, reason: 'push_server_unavailable', error: e2 && e2.message ? e2.message : String(e2) };
        }
    }

    async function _ensureWebPushSubscription(options) {
        if (_pushSubscribeBusy) return { ok: false, reason: 'busy' };
        var opts = options || {};
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return { ok: false, reason: 'push_unsupported' };
        }
        if (!window.isSecureContext) {
            return { ok: false, reason: 'insecure_context' };
        }
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return { ok: false, reason: 'notification_not_granted' };
        }

        _pushSubscribeBusy = true;
        try {
            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.getSubscription();
            if (!sub) {
                var vapidResp = await _fetchPushApi('/api/push/vapid-public-key');
                if (!vapidResp || !vapidResp.ok || !vapidResp.publicKey) {
                    return { ok: false, reason: 'push_server_unavailable' };
                }
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: _urlBase64ToUint8Array(vapidResp.publicKey)
                });
            }

            var subJson = sub.toJSON ? sub.toJSON() : sub;
            var saveResp = await _postPushApi('/api/push/subscribe', {
                subscription: subJson,
                client: {
                    userAgent: navigator.userAgent || '',
                    language: navigator.language || '',
                    timeZone: (Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : ''
                }
            });
            if (!saveResp || !saveResp.ok) {
                return { ok: false, reason: (saveResp && saveResp.reason) ? saveResp.reason : 'subscribe_failed' };
            }
            try { await localforage.setItem('miffy_webpush_enabled', true); } catch (e2) {}
            return { ok: true, reason: 'subscribed', endpoint: subJson.endpoint || '' };
        } catch (e) {
            if (!opts.silent) {
                console.error('[Push] 订阅失败', e);
            }
            return { ok: false, reason: 'subscribe_exception', error: e && e.message ? e.message : String(e) };
        } finally {
            _pushSubscribeBusy = false;
        }
    }

    window._ensureWebPushSubscription = _ensureWebPushSubscription;

    window._sendWebPushTest = async function(payload) {
        var body = payload || {};
        return _postPushApi('/api/push/send-test', {
            title: body.title || 'Mini Push 测试',
            body: body.body || '这是一条来自 Web Push 的测试消息。',
            url: body.url || window.location.href,
            contactId: body.contactId || ''
        });
    };

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
            serviceWorkerSupported: ('serviceWorker' in navigator),
            pushSupported: ('PushManager' in window)
        };
    };

    window._ensureBrowserNotificationPermission = async function(options) {
        var opts = options || {};
        var perm = await _ensureBrowserNotificationPermission();
        if (!perm.ok) return perm;
        var pushRes = null;
        if (opts.subscribePush) {
            pushRes = await _ensureWebPushSubscription();
            if (!pushRes.ok) {
                return { ok: false, reason: pushRes.reason, push: pushRes };
            }
        }
        if (!opts.test) return perm;

        var testTitle = 'Mini 通知测试';
        var testBody = '通知已启用，后台消息会逐条弹出并保留在通知栏。';
        var testTag = 'mini-notify-test-' + Date.now();
        try {
            if ('serviceWorker' in navigator) {
                var reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.showNotification(testTitle, {
                        body: testBody,
                        icon: 'icon-192.png',
                        badge: 'icon-192.png',
                        tag: testTag,
                        renotify: false,
                        requireInteraction: true,
                        timestamp: Date.now(),
                        data: { contactId: '', url: window.location.href }
                    });
                    return { ok: true, reason: 'granted', push: pushRes };
                }
            }
            var n = new Notification(testTitle, {
                body: testBody,
                icon: 'icon-192.png',
                tag: testTag,
                renotify: false,
                requireInteraction: true,
                timestamp: Date.now()
            });
            n.onclick = function() {
                window.focus();
                n.close();
            };
            return { ok: true, reason: 'granted', push: pushRes };
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
        var commonNotifData = { contactId: contact.id, url: window.location.href };
        var swOptions = {
            body: msgText,
            icon: avatarSrc,
            badge: 'icon-192.png',
            tag: uniqueTag,
            renotify: false,
            requireInteraction: true,
            timestamp: Date.now(),
            data: commonNotifData
        };

        if ('serviceWorker' in navigator) {
            try {
                var reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.showNotification(displayName, swOptions);
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
                renotify: false,
                requireInteraction: true,
                timestamp: Date.now()
            });
            notif.onclick = function() {
                window.focus();
                document.getElementById('wechat-app').style.display = 'flex';
                enterChatWindow(contact.id);
                notif.close();
            };
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
        try {
            await triggerRoleReply(contact);
        } catch(e) {
            console.error('[后台触发] WeChat回复失败', e);
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
        try {
            var pushOn = await localforage.getItem('miffy_webpush_enabled');
            if (pushOn && ('Notification' in window) && Notification.permission === 'granted') {
                _ensureWebPushSubscription({ silent: true }).catch(function() {});
            }
        } catch (e3) {}
    }

    // 页面加载完成后启动
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(_restoreAllTimers, 2000);
    });
})();
