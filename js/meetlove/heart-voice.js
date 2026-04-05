// Auto-split from js/meetlove/meetlove-and-offline.js (489-932)

// ====== 心声面板 (Heart Voice Panel) 核心逻辑 ======
// 注意：此处不使用 IIFE，确保函数挂载到全局 window，不受 JS 错误影响
var _hvGenerating = false;
var HV_HISTORY_KEY = 'hv_history_';
(function() {
    'use strict';

    /**
     * 打开心声面板 - 由聊天页面导航栏角色名点击触发
     */
    window.openHeartVoice = async function() {
        if (!activeChatContact) return;

        var overlay = document.getElementById('heart-voice-overlay');
        var panel = document.getElementById('heart-voice-panel');
        if (!overlay || !panel) return;

        // 显示面板（居中弹入，scale动画）
        overlay.style.display = 'flex';
        panel.style.transform = 'scale(0.88)';
        panel.style.opacity = '0';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                panel.style.transform = 'scale(1)';
                panel.style.opacity = '1';
            });
        });

        // 重置内容为加载状态
        _hvSetLoadingState();

        // 设置底部时间
        _hvUpdateFooterTime();

        // 异步生成心声内容
        await _hvGenerate();
    };

    /**
     * 关闭心声面板
     */
    window.closeHeartVoice = function() {
        var panel = document.getElementById('heart-voice-panel');
        var overlay = document.getElementById('heart-voice-overlay');
        if (panel) {
            panel.style.transform = 'scale(0.88)';
            panel.style.opacity = '0';
        }
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
            if (panel) { panel.style.transform = ''; panel.style.opacity = ''; }
        }, 320);
        // 停止ECG动画
        var ecgPath = document.getElementById('hv-ecg-path');
        if (ecgPath) ecgPath.classList.remove('hv-ecg-animated');
    };

    /**
     * 设置加载中状态
     */
    function _hvSetLoadingState() {
        var monologue = document.getElementById('hv-monologue');
        var darkMono = document.getElementById('hv-dark-mono');
        var hrNum = document.getElementById('hv-hr-num');
        var locationCity = document.getElementById('hv-location-city');
        var locationDetail = document.getElementById('hv-location-detail');
        var barLove = document.getElementById('hv-bar-love');
        var barJealous = document.getElementById('hv-bar-jealous');
        var valLove = document.getElementById('hv-val-love');
        var valJealous = document.getElementById('hv-val-jealous');

        if (monologue) monologue.textContent = '生成中...';
        if (darkMono) darkMono.textContent = '生成中...';
        if (hrNum) hrNum.textContent = '--';
        if (locationCity) locationCity.textContent = '--';
        if (locationDetail) locationDetail.textContent = '--';
        if (barLove) barLove.style.width = '0%';
        if (barJealous) barJealous.style.width = '0%';
        if (valLove) valLove.textContent = '--';
        if (valJealous) valJealous.textContent = '--';

        // 停止ECG动画
        var ecgPath = document.getElementById('hv-ecg-path');
        if (ecgPath) ecgPath.classList.remove('hv-ecg-animated');
    }

    /**
     * 更新底部时间戳
     */
    function _hvUpdateFooterTime() {
        var el = document.getElementById('hv-footer-datetime');
        if (!el) return;
        var now = new Date();
        var y = now.getFullYear();
        var mo = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        var h = String(now.getHours()).padStart(2, '0');
        var mi = String(now.getMinutes()).padStart(2, '0');
        el.textContent = y + '.' + mo + '.' + d + '  ' + h + ':' + mi;
    }

    /**
     * 生成心声内容 - 调用 AI API 分析最新一轮对话
     */
    async function _hvGenerate() {
        if (_hvGenerating) return;
        _hvGenerating = true;

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;

            if (!apiUrl || !apiKey || !model) {
                // 没有 API 配置，使用随机演示数据
                _hvApplyDemoData();
                return;
            }

            // 获取最近对话（最多取最后10条）
            var allMsgs = await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray();
            var recentMsgs = allMsgs.filter(function(m) { return m.source !== 'sms'; }).slice(-10);

            if (recentMsgs.length === 0) {
                _hvApplyDemoData();
                return;
            }

            // 构建对话摘要
            var chatSummary = recentMsgs.map(function(m) {
                var sender = m.sender === 'me' ? '用户' : (activeChatContact.roleName || '角色');
                return sender + '：' + extractMsgPureText(m.content);
            }).join('\n');

            var roleDetail = activeChatContact.roleDetail || '';
            var roleName = activeChatContact.roleName || '角色';

            // 构建 prompt
            var systemPrompt = '你是一个专业的情感分析师，专门分析角色在对话中的内心状态。请根据以下角色设定和最新对话，以JSON格式输出角色的内心状态分析。\n\n' +
                '角色设定：' + (roleDetail || '无特殊设定') + '\n\n' +
                '【输出要求】严格输出以下JSON格式，不要有任何多余内容：\n' +
                '{\n' +
                '  "love": <0-100的整数，代表对用户的好感度>,\n' +
                '  "jealous": <0-100的整数，代表醋意值，对话越亲密或涉及其他人越高>,\n' +
                '  "heartrate": <60-130的整数，代表当前心跳bpm，情绪激动时偏高>,\n' +
                '  "city": "<角色当前所在城市，根据对话或设定推断，如无法推断则写\"未知城市\">",\n' +
                '  "location": "<具体位置描述，如咖啡馆、家里、公司等，结合对话场景>",\n' +
                '  "monologue": "<角色内心独白，30-50字，第一人称，口语化，真实表达对用户的情感>",\n' +
                '  "dark": "<角色阴暗面独白，20-40字，第一人称，表达占有欲、不安全感或隐藏的执念，语气略带压抑>"\n' +
                '}';

            var messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '以下是最新的对话记录：\n\n' + chatSummary + '\n\n请分析' + roleName + '的内心状态，严格输出JSON。' }
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

            if (!response.ok) throw new Error('API请求失败: ' + response.status);

            var data = await response.json();
            var rawText = data.choices[0].message.content.trim();

            // 提取 JSON
            var jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('无法解析JSON');

            var result = JSON.parse(jsonMatch[0]);

            // 应用数据到面板
            _hvApplyData(result);

            // 保存到历史记录
            _hvSaveHistory(result);

        } catch (e) {
            console.error('[心声面板] 生成失败:', e);
            // 降级为演示数据
            _hvApplyDemoData();
        } finally {
            _hvGenerating = false;
        }
    }

    /**
     * 将生成的数据应用到面板 UI
     */
    function _hvApplyData(result) {
        var love = Math.max(0, Math.min(100, parseInt(result.love) || 50));
        var jealous = Math.max(0, Math.min(100, parseInt(result.jealous) || 20));
        var hr = Math.max(55, Math.min(140, parseInt(result.heartrate) || 80));

        // 好感度
        var barLove = document.getElementById('hv-bar-love');
        var valLove = document.getElementById('hv-val-love');
        if (barLove) barLove.style.width = love + '%';
        if (valLove) valLove.textContent = love;

        // 醋意值
        var barJealous = document.getElementById('hv-bar-jealous');
        var valJealous = document.getElementById('hv-val-jealous');
        if (barJealous) barJealous.style.width = jealous + '%';
        if (valJealous) valJealous.textContent = jealous;

        // 心率
        var hrNum = document.getElementById('hv-hr-num');
        if (hrNum) hrNum.textContent = hr;

        // 更新 ECG 波形：根据心率调整波形间距
        _hvUpdateEcg(hr);

        // 定位
        var locationCity = document.getElementById('hv-location-city');
        var locationDetail = document.getElementById('hv-location-detail');
        if (locationCity) locationCity.textContent = result.city || '--';
        if (locationDetail) locationDetail.textContent = result.location || '--';

        // 内心独白
        var monologue = document.getElementById('hv-monologue');
        if (monologue) monologue.textContent = result.monologue || '--';

        // 阴暗独白
        var darkMono = document.getElementById('hv-dark-mono');
        if (darkMono) darkMono.textContent = result.dark || '--';
    }

    /**
     * 根据心率更新 ECG 波形图
     * 模拟真实心电图机：波形连续滚动，两端始终可见
     */
    function _hvUpdateEcg(bpm) {
        var ecgPath = document.getElementById('hv-ecg-path');
        if (!ecgPath) return;

        // 参数：根据心率调整波形密度和幅度
        var amplitude = bpm > 100 ? 14 : (bpm > 80 ? 11 : 8);
        var baseY = 18;
        var spacing = bpm > 100 ? 28 : (bpm > 80 ? 36 : 44);

        // 生成足够长的路径（3个周期宽度，用于无缝循环滚动）
        // SVG viewBox 宽度为 180，生成 3x 宽度 = 540，保证滚动时两端不会出现空白
        var totalWidth = spacing * Math.ceil(540 / spacing) + spacing;
        var segments = [];
        var x = 0;

        segments.push('M0 ' + baseY);
        while (x < totalWidth) {
            var x1 = x + spacing * 0.15;
            var x2 = x + spacing * 0.28;
            var x3 = x + spacing * 0.42;
            var x4 = x + spacing * 0.55;
            var x5 = x + spacing * 0.7;
            var x6 = x + spacing;

            segments.push(
                'L' + x.toFixed(1) + ' ' + baseY,
                'L' + x1.toFixed(1) + ' ' + baseY,
                'L' + x2.toFixed(1) + ' ' + (baseY - amplitude * 0.6).toFixed(1),
                'L' + x3.toFixed(1) + ' ' + (baseY + amplitude).toFixed(1),
                'L' + x4.toFixed(1) + ' ' + (baseY - amplitude * 1.2).toFixed(1),
                'L' + x5.toFixed(1) + ' ' + baseY,
                'L' + x6.toFixed(1) + ' ' + baseY
            );
            x += spacing;
        }

        ecgPath.setAttribute('d', segments.join(' '));

        // ��� strokeDasharray����������߶��������� translateX ������
        ecgPath.style.strokeDasharray = 'none';
        ecgPath.style.strokeDashoffset = '0';
        ecgPath.style.animation = 'none';

        // ʹ�� <g> ���ض���translateX ������ SVG ·�ɵ�ͼ�Ʒ�Χ
        // ͨ�� hv-ecg-group ȡ�ü�Ⱥ�Ⱥ transform
        var ecgGroup = document.getElementById('hv-ecg-group');
        if (!ecgGroup) return;

        // ע�� translateX ���� keyframes��ֻע��һ�Σ�
        var styleId = 'hv-ecg-scroll-style';
        var existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove(); // ÿ�δ����µ�spacing����Ҫ���¶�̬ע��
        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        var speedMs = bpm > 100 ? 450 : (bpm > 80 ? 600 : 750);
        // ʹ�ÿ�ֵ px ֱ�ӶǪ�ȷ
        styleEl.textContent = '@keyframes hv-ecg-tape { from { transform: translateX(0px); } to { transform: translateX(-' + spacing.toFixed(1) + 'px); } }';
        document.head.appendChild(styleEl);

        // Ӧ�õ� <g> ��Ⱥ
        ecgGroup.style.animation = 'none';
        // ǿ�Ƹ���
        void ecgGroup.offsetWidth;
        ecgGroup.style.animation = 'hv-ecg-tape ' + speedMs + 'ms linear infinite';
        ecgPath.classList.add('hv-ecg-animated');
    }

    /**
     * 演示数据（API 未配置时使用）
     */
    function _hvApplyDemoData() {
        var demoData = {
            love: Math.floor(Math.random() * 40) + 45,
            jealous: Math.floor(Math.random() * 30) + 10,
            heartrate: Math.floor(Math.random() * 30) + 72,
            city: '未知城市',
            location: '某个安静的地方',
            monologue: '和你说话的时候，我总是会不自觉地笑起来，也不知道为什么...',
            dark: '要是你只属于我一个人就好了，谁都不能靠近你。'
        };
        _hvApplyData(demoData);
        _hvSaveHistory(demoData);
    }

    /**
     * 保存心声到历史记录
     */
    async function _hvSaveHistory(data) {
        if (!activeChatContact) return;
        var key = HV_HISTORY_KEY + activeChatContact.id;
        try {
            var history = await localforage.getItem(key) || [];
            var now = new Date();
            history.unshift({
                time: now.getFullYear() + '.' +
                      String(now.getMonth() + 1).padStart(2, '0') + '.' +
                      String(now.getDate()).padStart(2, '0') + '  ' +
                      String(now.getHours()).padStart(2, '0') + ':' +
                      String(now.getMinutes()).padStart(2, '0'),
                love: data.love,
                jealous: data.jealous,
                heartrate: data.heartrate,
                city: data.city,
                location: data.location,
                monologue: data.monologue,
                dark: data.dark
            });
            // 最多保留 30 条历史
            if (history.length > 30) history = history.slice(0, 30);
            await localforage.setItem(key, history);
        } catch (e) {
            console.error('[心声面板] 保存历史失败:', e);
        }
    }

    /**
     * 打开历史心声弹窗
     */
    window.openHeartVoiceHistory = async function() {
        if (!activeChatContact) return;
        var modal = document.getElementById('hv-history-modal');
        var sheet = document.getElementById('hv-history-sheet');
        if (!modal || !sheet) return;

        // 居中弹入，scale动画
        sheet.style.transform = 'scale(0.88)';
        sheet.style.opacity = '0';
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'scale(1)';
                sheet.style.opacity = '1';
            });
        });

        // 渲染历史列表
        var listEl = document.getElementById('hv-history-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        var key = HV_HISTORY_KEY + activeChatContact.id;
        var history = await localforage.getItem(key) || [];

        if (history.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#ccc;font-size:13px;margin:30px 0;letter-spacing:0.3px;">暂无历史心声记录</div>';
            return;
        }

        history.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'hv-history-card';
            card.innerHTML =
                '<div class="hv-history-card-header">' +
                    '<span class="hv-history-card-time">' + (item.time || '') + '</span>' +
                    '<span class="hv-history-card-hr">' + (item.heartrate || '--') + ' bpm</span>' +
                '</div>' +
                '<div style="display:flex;gap:12px;align-items:center;margin:2px 0;">' +
                    '<div style="display:flex;align-items:center;gap:6px;flex:1;">' +
                        '<span style="font-size:10px;color:#c9a0a0;letter-spacing:0.3px;white-space:nowrap;">好感</span>' +
                        '<div style="flex:1;height:3px;background:#f0f0f0;border-radius:2px;overflow:hidden;">' +
                            '<div style="height:100%;border-radius:2px;background:linear-gradient(90deg,#f5c2c2,#e88);width:' + (item.love || 0) + '%;"></div>' +
                        '</div>' +
                        '<span style="font-size:10px;color:#bbb;font-weight:600;font-family:Arial,sans-serif;min-width:20px;text-align:right;">' + (item.love || '--') + '</span>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:6px;flex:1;">' +
                        '<span style="font-size:10px;color:#a0b0c9;letter-spacing:0.3px;white-space:nowrap;">醋意</span>' +
                        '<div style="flex:1;height:3px;background:#f0f0f0;border-radius:2px;overflow:hidden;">' +
                            '<div style="height:100%;border-radius:2px;background:linear-gradient(90deg,#b8c8e8,#7799cc);width:' + (item.jealous || 0) + '%;"></div>' +
                        '</div>' +
                        '<span style="font-size:10px;color:#bbb;font-weight:600;font-family:Arial,sans-serif;min-width:20px;text-align:right;">' + (item.jealous || '--') + '</span>' +
                    '</div>' +
                '</div>' +
                (item.city || item.location ? '<div class="hv-history-card-loc">' +
                    '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                    '<span>' + (item.city || '') + (item.location ? ' · ' + item.location : '') + '</span>' +
                '</div>' : '') +
                '<div class="hv-history-card-mono">' + (item.monologue || '') + '</div>' +
                (item.dark ? '<div class="hv-history-card-dark">' + item.dark + '</div>' : '');
            listEl.appendChild(card);
        });
    };

    /**
     * 关闭历史心声弹窗
     */
    window.closeHeartVoiceHistory = function() {
        var sheet = document.getElementById('hv-history-sheet');
        var modal = document.getElementById('hv-history-modal');
        if (sheet) {
            sheet.style.transform = 'scale(0.88)';
            sheet.style.opacity = '0';
        }
        setTimeout(function() {
            if (modal) modal.style.display = 'none';
            if (sheet) { sheet.style.transform = ''; sheet.style.opacity = ''; }
        }, 300);
    };

    // 注：点击事件已通过 HTML onclick="openHeartVoice()" 绑定，无需重复绑定

})();


