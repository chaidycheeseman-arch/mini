// Auto-split from js/core/bootstrap.js (463-1090)

    // ====== 全局字体设置逻辑 (持久化: localForage) ======
    const ST_FONT = 'miffy_global_font';
    const ST_FONT_WEIGHT = 'miffy_global_font_weight';
    const ST_FONT_SIZE = 'miffy_global_font_size';
    let currentFontData = null;
    let currentFontWeight = null;
    let currentFontSize = null;
    function renderGlobalFont() {
        let styleEl = document.getElementById('dynamic-font-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-font-style';
            document.head.appendChild(styleEl);
        }
        let css = '';
        if (currentFontData) {
            css += `@font-face { font-family: 'CustomGlobalFont'; src: url('${currentFontData}'); }
                    * { font-family: 'CustomGlobalFont', "PingFang SC", "Microsoft YaHei", sans-serif !important; }\n`;
        }
        if (currentFontWeight) {
            css += `* { font-weight: ${currentFontWeight} !important; }\n`;
        }
        if (currentFontSize) {
            // 极大幅度扩充覆盖面，确保全局各个角落的字体大小都能被强制改变
            css += `
            .chat-msg-content, .msg-text-body, .msg-original-text, .msg-translated-text, 
            .voice-text-content, .chat-photo-back, .editable-text, .novel-body, 
            .app-title, .settings-input, .wb-card-content, .wb-card-title,
            .me-name, .moments-nickname, .moments-feed, .wallet-balance-num, 
            .theme-section-header span, .preset-header span, .app-icon span, .theme-icon-label,
            .wallet-action-btn, .msg-quote-content
            { font-size: ${currentFontSize}px !important; }\n`;
        }
        styleEl.innerHTML = css;
    }
    function setGlobalFont(fontData) {
        currentFontData = fontData;
        renderGlobalFont();
    }
    async function updateFontWeight(val) {
        document.getElementById('font-weight-val').textContent = val;
        currentFontWeight = val;
        renderGlobalFont();
        await localforage.setItem(ST_FONT_WEIGHT, val);
    }
    async function updateFontSize(val) {
        document.getElementById('font-size-val').textContent = val + 'px';
        currentFontSize = val;
        renderGlobalFont();
        await localforage.setItem(ST_FONT_SIZE, val);
    }
    async function applyFontFromUrl() {
        const url = document.getElementById('font-url-input').value.trim();
        if (!url) return alert('请输入字体链接');
        setGlobalFont(url);
        await localforage.setItem(ST_FONT, url);
        alert('字体已应用并保存');
    }
    function applyFontFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Font = e.target.result;
            setGlobalFont(base64Font);
            await localforage.setItem(ST_FONT, base64Font);
            alert('本地字体已应用并保存');
            event.target.value = ''; // 清空选择
        };
        reader.readAsDataURL(file);
    }
    async function restoreDefaultFont() {
        currentFontData = null;
        currentFontWeight = null;
        currentFontSize = null;
        renderGlobalFont();
        await localforage.removeItem(ST_FONT);
        await localforage.removeItem(ST_FONT_WEIGHT);
        await localforage.removeItem(ST_FONT_SIZE);
        document.getElementById('font-url-input').value = '';
        document.getElementById('font-weight-slider').value = 400;
        document.getElementById('font-weight-val').textContent = '默认';
        document.getElementById('font-size-slider').value = 14;
        document.getElementById('font-size-val').textContent = '默认';
        alert('已重置为默认设置');
    }
    const ST_URL = 'miffy_api_url';
    const ST_KEY = 'miffy_api_key';
    const ST_MODEL = 'miffy_api_model';
    const ST_TEMP = 'miffy_api_temp';
    const ST_CTX = 'miffy_api_ctx';
    const ST_PRESETS = 'miffy_api_presets';
    const ST_MM_REGION = 'miffy_minimax_region';
    const ST_MM_KEY = 'miffy_minimax_api_key';
    const ST_MM_GROUP = 'miffy_minimax_group_id';
    const ST_MM_VOICE = 'miffy_minimax_voice_id';
    const ST_MM_LANG = 'miffy_minimax_language';
    const ST_MM_SPEED = 'miffy_minimax_speed';
    const ST_MM_PRESETS = 'miffy_minimax_voice_presets';

    const MM_LANG_TEST_TEXT = {
        zh: '乖宝~语音连接成功，mini 已正常接入。',
        en: 'Hi there, MiniMax voice connection is working.',
        ja: 'こんにちは、MiniMax 音声接続は正常です。',
        ko: '안녕하세요, MiniMax 음성 연결이 정상입니다.'
    };

    let mmCurrentAudio = null;
    let mmCurrentAudioUrl = '';
    let mmCurrentVoiceElement = null;
    let mmVoiceRequestSeq = 0;
    let presetManagerMode = 'text';

    function normalizeMiniMaxLanguage(lang) {
        const val = (lang || '').toLowerCase();
        if (val === 'en' || val === 'ja' || val === 'ko') return val;
        return 'zh';
    }

    function normalizeMiniMaxSpeed(raw) {
        const n = parseFloat(raw);
        if (isNaN(n)) return 1.0;
        if (n < 0.5) return 0.5;
        if (n > 2.0) return 2.0;
        return Math.round(n * 10) / 10;
    }

    function normalizeMiniMaxConfig(raw) {
        const region = raw && raw.region === 'global' ? 'global' : 'cn';
        return {
            region: region,
            apiKey: (raw && raw.apiKey ? String(raw.apiKey) : '').trim(),
            groupId: (raw && raw.groupId ? String(raw.groupId) : '').trim(),
            voiceId: (raw && raw.voiceId ? String(raw.voiceId) : '').trim(),
            language: normalizeMiniMaxLanguage(raw && raw.language ? String(raw.language) : 'zh'),
            speed: normalizeMiniMaxSpeed(raw && raw.speed !== undefined ? raw.speed : 1.0)
        };
    }

    function getMiniMaxInputsConfig() {
        const regionEl = document.getElementById('mm-region');
        const keyEl = document.getElementById('mm-api-key');
        const groupEl = document.getElementById('mm-group-id');
        const voiceEl = document.getElementById('mm-voice-id');
        const langEl = document.getElementById('mm-lang');
        const speedEl = document.getElementById('mm-speed');
        return normalizeMiniMaxConfig({
            region: regionEl ? regionEl.value : 'cn',
            apiKey: keyEl ? keyEl.value : '',
            groupId: groupEl ? groupEl.value : '',
            voiceId: voiceEl ? voiceEl.value : '',
            language: langEl ? langEl.value : 'zh',
            speed: speedEl ? speedEl.value : 1.0
        });
    }

    async function getMiniMaxStoredConfig() {
        return normalizeMiniMaxConfig({
            region: await localforage.getItem(ST_MM_REGION) || 'cn',
            apiKey: await localforage.getItem(ST_MM_KEY) || '',
            groupId: await localforage.getItem(ST_MM_GROUP) || '',
            voiceId: await localforage.getItem(ST_MM_VOICE) || '',
            language: await localforage.getItem(ST_MM_LANG) || 'zh',
            speed: await localforage.getItem(ST_MM_SPEED) || 1.0
        });
    }

    function getMiniMaxEndpoint(region) {
        return region === 'global'
            ? 'https://api.minimax.io/v1/t2a_v2'
            : 'https://api.minimaxi.com/v1/t2a_v2';
    }

    function getMiniMaxTestTextByLanguage(lang) {
        const key = normalizeMiniMaxLanguage(lang);
        return MM_LANG_TEST_TEXT[key] || MM_LANG_TEST_TEXT.zh;
    }

    function showMiniMaxTestTip(text, isError) {
        const tip = document.getElementById('mm-test-tip');
        if (!tip) return;
        tip.style.display = text ? 'block' : 'none';
        tip.style.color = isError ? '#d96a6a' : '#8b8b8b';
        tip.textContent = text || '';
    }

    function updateMiniMaxSpeedDisplay(speed) {
        const valEl = document.getElementById('mm-speed-val');
        if (valEl) valEl.textContent = normalizeMiniMaxSpeed(speed).toFixed(1);
    }

    async function saveMiniMaxSettings(config) {
        const mmConfig = normalizeMiniMaxConfig(config || getMiniMaxInputsConfig());
        await localforage.setItem(ST_MM_REGION, mmConfig.region);
        await localforage.setItem(ST_MM_KEY, mmConfig.apiKey);
        await localforage.setItem(ST_MM_GROUP, mmConfig.groupId);
        await localforage.setItem(ST_MM_VOICE, mmConfig.voiceId);
        await localforage.setItem(ST_MM_LANG, mmConfig.language);
        await localforage.setItem(ST_MM_SPEED, mmConfig.speed);
    }

    async function requestMiniMaxVoiceHex(text, config) {
        const endpoint = getMiniMaxEndpoint(config.region);
        const url = config.groupId
            ? `${endpoint}?GroupId=${encodeURIComponent(config.groupId)}`
            : endpoint;
        const payload = {
            model: 'speech-01-turbo',
            text: text,
            stream: false,
            voice_setting: { voice_id: config.voiceId, speed: config.speed, vol: 1.0, pitch: 0 },
            audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const msg = data && data.base_resp && data.base_resp.status_msg
                ? data.base_resp.status_msg
                : `HTTP ${response.status}`;
            throw new Error(msg);
        }
        if (data && data.base_resp && data.base_resp.status_code !== 0) {
            throw new Error(data.base_resp.status_msg || '语音接口调用失败');
        }
        const audioHex = data && data.data && typeof data.data.audio === 'string' ? data.data.audio : '';
        if (!audioHex) throw new Error('返回数据缺少音频内容');
        return audioHex;
    }

    async function synthesizeMiniMaxVoice(text, config) {
        const normalized = normalizeMiniMaxConfig(config || {});
        const cleanText = (text || '').trim();
        if (!cleanText) throw new Error('语音内容为空');
        if (!normalized.apiKey) throw new Error('请先填写 MiniMax API 密钥');
        if (!normalized.groupId) throw new Error('请先填写 Group ID');
        if (!normalized.voiceId) throw new Error('请先填写语音 ID');
        return requestMiniMaxVoiceHex(cleanText, normalized);
    }

    function hexToUint8Array(hex) {
        const cleanHex = (hex || '').trim();
        if (!cleanHex || cleanHex.length % 2 !== 0) throw new Error('音频数据格式不正确');
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
        }
        return bytes;
    }

    function cleanupMiniMaxAudioSession() {
        if (mmCurrentAudioUrl) {
            URL.revokeObjectURL(mmCurrentAudioUrl);
            mmCurrentAudioUrl = '';
        }
        mmCurrentAudio = null;
        mmCurrentVoiceElement = null;
    }

    function stopMiniMaxAudioPlayback(cancelPending) {
        if (cancelPending !== false) mmVoiceRequestSeq++;
        if (mmCurrentAudio) {
            mmCurrentAudio.pause();
            mmCurrentAudio.currentTime = 0;
        }
        if (mmCurrentVoiceElement) {
            const waves = mmCurrentVoiceElement.querySelector('.voice-waves');
            if (waves) waves.classList.add('paused');
        }
        cleanupMiniMaxAudioSession();
    }

    async function playMiniMaxHexAudio(audioHex, voiceElement) {
        stopMiniMaxAudioPlayback(false);
        const bytes = hexToUint8Array(audioHex);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        mmCurrentAudio = audio;
        mmCurrentAudioUrl = audioUrl;
        mmCurrentVoiceElement = voiceElement || null;
        if (voiceElement) {
            const waves = voiceElement.querySelector('.voice-waves');
            if (waves) waves.classList.remove('paused');
        }
        audio.addEventListener('ended', () => {
            if (mmCurrentVoiceElement) {
                const waves = mmCurrentVoiceElement.querySelector('.voice-waves');
                if (waves) waves.classList.add('paused');
            }
            cleanupMiniMaxAudioSession();
        }, { once: true });
        try {
            await audio.play();
        } catch (e) {
            stopMiniMaxAudioPlayback();
            throw e;
        }
    }

    async function playMiniMaxVoiceFromText(text, voiceElement) {
        const cleanText = (text || '').trim();
        if (!cleanText) return;
        const requestId = ++mmVoiceRequestSeq;
        const config = await getMiniMaxStoredConfig();
        if (!config.apiKey || !config.groupId || !config.voiceId) return;
        try {
            const audioHex = await synthesizeMiniMaxVoice(cleanText, config);
            if (requestId !== mmVoiceRequestSeq) return;
            if (voiceElement && !voiceElement.classList.contains('expanded')) return;
            await playMiniMaxHexAudio(audioHex, voiceElement || null);
        } catch (e) {
            if (voiceElement) {
                const waves = voiceElement.querySelector('.voice-waves');
                if (waves) waves.classList.add('paused');
            }
            console.error('MiniMax 语音播放失败:', e);
        }
    }

    async function testMiniMaxConnection() {
        const btn = document.getElementById('mm-test-btn');
        const originalText = btn ? btn.innerText : '测试';
        if (btn) {
            btn.innerText = '测试中...';
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.7';
        }
        showMiniMaxTestTip('正在测试语音连接...', false);
        try {
            const config = getMiniMaxInputsConfig();
            const testText = getMiniMaxTestTextByLanguage(config.language);
            const audioHex = await synthesizeMiniMaxVoice(testText, config);
            showMiniMaxTestTip(testText, false);
            await playMiniMaxHexAudio(audioHex, null);
        } catch (e) {
            showMiniMaxTestTip('连接失败：' + (e && e.message ? e.message : '未知错误'), true);
        } finally {
            if (btn) {
                btn.innerText = originalText;
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            }
        }
    }

    window.testMiniMaxConnection = testMiniMaxConnection;
    window.stopMiniMaxAudioPlayback = stopMiniMaxAudioPlayback;
    window.playMiniMaxVoiceFromText = playMiniMaxVoiceFromText;
    window.getMiniMaxStoredConfig = getMiniMaxStoredConfig;

    const settingsBtn = document.getElementById('dock-btn-settings');
    const settingsApp = document.getElementById('settings-app');
    if(settingsBtn) {
        settingsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await loadSettingsToUI();
            settingsApp.style.display = 'flex';
        });
    }
    function closeSettingsApp() {
        settingsApp.style.display = 'none';
    }
    async function loadSettingsToUI() {
        document.getElementById('api-url').value = await localforage.getItem(ST_URL) || '';
        document.getElementById('api-key').value = await localforage.getItem(ST_KEY) || '';
        const savedModel = await localforage.getItem(ST_MODEL) || '';
        const modelSelect = document.getElementById('api-model');
        if(savedModel && modelSelect.options.length <= 1) {
            const opt = document.createElement('option');
            opt.value = savedModel;
            opt.text = savedModel;
            modelSelect.appendChild(opt);
        }
        modelSelect.value = savedModel;
        const t = await localforage.getItem(ST_TEMP) || '0.7';
        document.getElementById('api-temp').value = t;
        document.getElementById('temp-val').textContent = t;
        const c = await localforage.getItem(ST_CTX) || '10';
        document.getElementById('api-ctx').value = c;

        const mmConfig = await getMiniMaxStoredConfig();
        const regionEl = document.getElementById('mm-region');
        const keyEl = document.getElementById('mm-api-key');
        const groupEl = document.getElementById('mm-group-id');
        const voiceEl = document.getElementById('mm-voice-id');
        const langEl = document.getElementById('mm-lang');
        const speedEl = document.getElementById('mm-speed');
        if (regionEl) regionEl.value = mmConfig.region || 'cn';
        if (keyEl) keyEl.value = mmConfig.apiKey || '';
        if (groupEl) groupEl.value = mmConfig.groupId || '';
        if (voiceEl) voiceEl.value = mmConfig.voiceId || '';
        if (langEl) langEl.value = mmConfig.language || 'zh';
        if (speedEl) speedEl.value = normalizeMiniMaxSpeed(mmConfig.speed).toFixed(1);
        updateMiniMaxSpeedDisplay(mmConfig.speed);
        showMiniMaxTestTip('', false);
        if (window.miniRuntimeLog && typeof window.miniRuntimeLog.render === 'function') {
            await window.miniRuntimeLog.render();
        }
    }
    async function saveSettings() {
        await localforage.setItem(ST_URL, document.getElementById('api-url').value);
        await localforage.setItem(ST_KEY, document.getElementById('api-key').value);
        await localforage.setItem(ST_MODEL, document.getElementById('api-model').value);
        await localforage.setItem(ST_TEMP, document.getElementById('api-temp').value);
        await localforage.setItem(ST_CTX, document.getElementById('api-ctx').value);
        await saveMiniMaxSettings(getMiniMaxInputsConfig());
        alert('设置已成功保存');
    }
    async function saveVoiceSettings() {
        await saveMiniMaxSettings(getMiniMaxInputsConfig());
        alert('语音设置已成功保存');
    }
    function getPresetModeLabel() {
        return presetManagerMode === 'voice' ? '语音预设管理' : '预设管理';
    }
    function applyPresetManagerTitle() {
        const titleEl = document.getElementById('preset-manager-title');
        if (titleEl) titleEl.textContent = getPresetModeLabel();
    }
    async function fetchModels() {
        const urlInput = document.getElementById('api-url').value.trim();
        const key = document.getElementById('api-key').value.trim();
        if(!urlInput || !key) return alert('请先填写完整的API网址和密钥');
        const url = urlInput.replace(/\/+$/, '');
        const endpoint = url.endsWith('/v1') ? `${url}/models` : `${url}/v1/models`;
        const select = document.getElementById('api-model');
        select.innerHTML = '<option value="">加载中...</option>';
        try {
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            if(!res.ok) throw new Error('网络响应错误: ' + res.status);
            const data = await res.json();
            let models = [];
            if(data.data && Array.isArray(data.data)) {
                models = data.data; 
            } else if (Array.isArray(data)) {
                models = data; 
            } else {
                throw new Error('未知的API数据结构');
            }
            select.innerHTML = '';
            models.forEach(m => {
                const opt = document.createElement('option');
                const modelId = m.id || m.name || m;
                opt.value = modelId;
                opt.textContent = modelId;
                select.appendChild(opt);
            });
            alert('获取模型成功');
        } catch (e) {
            select.innerHTML = '<option value="">拉取失败</option>';
            alert('拉取失败: ' + e.message);
        }
    }
    async function getPresets() {
        return await localforage.getItem(ST_PRESETS) || [];
    }
    async function savePresets(arr) {
        await localforage.setItem(ST_PRESETS, arr);
    }
    async function getVoicePresets() {
        return await localforage.getItem(ST_MM_PRESETS) || [];
    }
    async function saveVoicePresets(arr) {
        await localforage.setItem(ST_MM_PRESETS, arr);
    }
    async function saveAsPreset() {
        presetManagerMode = 'text';
        const name = prompt('请输入该预设的名称:');
        if(!name || name.trim() === '') return;
        const presets = await getPresets();
        presets.push({
            id: Date.now().toString(),
            name: name.trim(),
            url: document.getElementById('api-url').value,
            key: document.getElementById('api-key').value,
            model: document.getElementById('api-model').value,
            temp: document.getElementById('api-temp').value,
            ctx: document.getElementById('api-ctx').value
        });
        await savePresets(presets);
        alert('预设已保存');
    }
    async function saveAsVoicePreset() {
        presetManagerMode = 'voice';
        const name = prompt('请输入该语音预设的名称:');
        if(!name || name.trim() === '') return;
        const presets = await getVoicePresets();
        const mmConfig = getMiniMaxInputsConfig();
        presets.push({
            id: Date.now().toString(),
            name: name.trim(),
            region: mmConfig.region,
            apiKey: mmConfig.apiKey,
            groupId: mmConfig.groupId,
            voiceId: mmConfig.voiceId,
            language: mmConfig.language,
            speed: mmConfig.speed
        });
        await saveVoicePresets(presets);
        alert('语音预设已保存');
    }
    function openPresetManager() {
        presetManagerMode = 'text';
        applyPresetManagerTitle();
        const pm = document.getElementById('preset-manager');
        pm.style.display = 'flex';
        renderPresets();
    }
    function openVoicePresetManager() {
        presetManagerMode = 'voice';
        applyPresetManagerTitle();
        const pm = document.getElementById('preset-manager');
        pm.style.display = 'flex';
        renderPresets();
    }
    function closePresetManager() {
        document.getElementById('preset-manager').style.display = 'none';
    }
    async function renderPresets() {
        const list = document.getElementById('preset-list');
        list.innerHTML = '';
        const presets = presetManagerMode === 'voice'
            ? await getVoicePresets()
            : await getPresets();
        if(presets.length === 0) {
            list.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;margin-top:20px;">暂无保存的预设</div>';
            return;
        }
        presets.forEach(p => {
            const item = document.createElement('div');
            item.style = 'border:1px solid #f0f0f0; border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:6px;';
            const desc = presetManagerMode === 'voice'
                ? `语音: ${p.voiceId || '未填写'} · 语言: ${p.language || 'zh'} · 语速: ${normalizeMiniMaxSpeed(p.speed || 1.0).toFixed(1)}`
                : `模型: ${p.model || '未选择'}`;
            item.innerHTML = `
                <div style="font-weight:600; font-size:14px; color:#333;">${p.name}</div>
                <div style="font-size:12px; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${desc}</div>
                <div style="display:flex; gap:8px; margin-top:6px;">
                    <button class="settings-btn" style="padding:6px 14px; font-size:12px; border-radius:10px;" onclick="usePreset('${p.id}')">使用</button>
                    <button class="settings-btn" style="padding:6px 14px; font-size:12px; border-radius:10px;" onclick="renamePreset('${p.id}')">重命名</button>
                    <button class="settings-btn" style="padding:6px 14px; font-size:12px; color:#ff3b30; border-radius:10px;" onclick="deletePreset('${p.id}')">删除</button>
                </div>
            `;
            list.appendChild(item);
        });
    }
    async function usePreset(id) {
        const presets = presetManagerMode === 'voice'
            ? await getVoicePresets()
            : await getPresets();
        const p = presets.find(x => x.id === id);
        if(p) {
            if (presetManagerMode === 'voice') {
                const regionEl = document.getElementById('mm-region');
                const keyEl = document.getElementById('mm-api-key');
                const groupEl = document.getElementById('mm-group-id');
                const voiceEl = document.getElementById('mm-voice-id');
                const langEl = document.getElementById('mm-lang');
                const speedEl = document.getElementById('mm-speed');
                if (regionEl) regionEl.value = p.region || 'cn';
                if (keyEl) keyEl.value = p.apiKey || '';
                if (groupEl) groupEl.value = p.groupId || '';
                if (voiceEl) voiceEl.value = p.voiceId || '';
                if (langEl) langEl.value = normalizeMiniMaxLanguage(p.language || 'zh');
                if (speedEl) speedEl.value = normalizeMiniMaxSpeed(p.speed || 1.0).toFixed(1);
                updateMiniMaxSpeedDisplay(p.speed || 1.0);
            } else {
                document.getElementById('api-url').value = p.url || '';
                document.getElementById('api-key').value = p.key || '';
                const select = document.getElementById('api-model');
                if(p.model && select.querySelector(`option[value="${p.model}"]`) === null) {
                    const opt = document.createElement('option');
                    opt.value = p.model;
                    opt.text = p.model;
                    select.appendChild(opt);
                }
                select.value = p.model || '';
                document.getElementById('api-temp').value = p.temp || '0.7';
                document.getElementById('temp-val').textContent = p.temp || '0.7';
                document.getElementById('api-ctx').value = p.ctx || '10';
            }
            closePresetManager();
            alert(`已应用${presetManagerMode === 'voice' ? '语音' : ''}预设: ${p.name}`);
        }
    }
    async function renamePreset(id) {
        const presets = presetManagerMode === 'voice'
            ? await getVoicePresets()
            : await getPresets();
        const p = presets.find(x => x.id === id);
        if(!p) return;
        const newName = prompt('重命名为:', p.name);
        if(newName && newName.trim() !== '') {
            p.name = newName.trim();
            if (presetManagerMode === 'voice') await saveVoicePresets(presets);
            else await savePresets(presets);
            renderPresets();
        }
    }
    async function deletePreset(id) {
        if(confirm('确定要删除这个预设吗？')) {
            let presets = presetManagerMode === 'voice'
                ? await getVoicePresets()
                : await getPresets();
            presets = presets.filter(x => x.id !== id);
            if (presetManagerMode === 'voice') await saveVoicePresets(presets);
            else await savePresets(presets);
            renderPresets();
        }
    }
    document.addEventListener('DOMContentLoaded', function() {
        const speedEl = document.getElementById('mm-speed');
        if (speedEl && !speedEl._miniBound) {
            speedEl._miniBound = true;
            speedEl.addEventListener('input', function() {
                updateMiniMaxSpeedDisplay(this.value);
            });
        }
    });
    const db = new Dexie("miniPhoneWorldbookDB_V2");
    db.version(1).stores({ entries: '++id, category, activation, priority' });
    let currentWbCategory = 'global'; 
