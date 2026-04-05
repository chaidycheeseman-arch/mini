// Auto-split from js/messaging/sms-and-notify.js (691-1224)

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

