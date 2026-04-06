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
    const ST_DEVICE_LOCK_ENABLED = 'miffy_device_lock_enabled';
    const ST_DEVICE_LOCK_CODE = 'miffy_device_lock_code';
    const ST_DEVICE_LOCK_WALLPAPER = 'miffy_device_lock_wallpaper';
    const LITE_DEVICE_LOCK_ENABLED = 'miffy_lite_device_lock_enabled';
    const LITE_DEVICE_LOCK_CODE = 'miffy_lite_device_lock_code';
    const LITE_DEVICE_LOCK_WALLPAPER = 'miffy_lite_device_lock_wallpaper';
    const DEFAULT_DEVICE_LOCK_CODE = '2066';

    const MM_LANG_TEST_TEXT = {
        zh: '乖宝~语音连接成功，mini 已正常接入。',
        en: 'Hi there, MiniMax voice connection is working.',
        ja: 'こんにちは、MiniMax 音声接続は正常です。',
        ko: '안녕하세요, MiniMax 음성 연결이 정상입니다.',
        yue: '喂，语音连接成功喇，MiniMax 已经接入好。',
        fr: 'Salut, la connexion vocale MiniMax fonctionne correctement.',
        th: 'สวัสดี การเชื่อมต่อเสียง MiniMax ใช้งานได้ปกติแล้ว'
    };

    let mmCurrentAudio = null;
    let mmCurrentAudioUrl = '';
    let mmCurrentVoiceElement = null;
    let mmVoiceRequestSeq = 0;
    let presetManagerMode = 'text';
    let deviceLockEnabled = true;
    let deviceLockCode = DEFAULT_DEVICE_LOCK_CODE;
    let deviceLockInput = '';
    let deviceLockClockTimer = null;

    function readLiteStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function writeLiteStorage(key, value) {
        try {
            localStorage.setItem(key, String(value));
        } catch (e) {}
    }

    function removeLiteStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }

    function readLiteBoolean(key) {
        const raw = readLiteStorage(key);
        if (raw === null || raw === undefined || raw === '') return null;
        return raw === '1' || raw === 'true';
    }

    function normalizeDeviceLockCode(raw) {
        const digits = String(raw || '').replace(/\D/g, '');
        if (digits.length >= 4 && digits.length <= 8) return digits;
        return DEFAULT_DEVICE_LOCK_CODE;
    }

    function getDeviceLockElement(id) {
        return document.getElementById(id);
    }

    function getDeviceLockBackgroundValue(src) {
        return src
            ? `url(${src}) center/cover no-repeat`
            : 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)';
    }

    async function getFallbackDeviceLockWallpaper() {
        try {
            const themeMode = await localforage.getItem('miffy_theme_mode');
            const customTheme = await localforage.getItem('miffy_custom_theme');
            if (themeMode === 'custom' && customTheme && customTheme.wallpaper) {
                return customTheme.wallpaper;
            }
        } catch (e) {}
        try {
            if (typeof imgDb !== 'undefined') {
                const record = await imgDb.images.get('wallpaper-preview');
                if (record && record.src && !String(record.src).includes('via.placeholder.com')) {
                    return record.src;
                }
            }
        } catch (e) {}
        return '';
    }

    async function getDeviceLockWallpaperSource() {
        const saved = await localforage.getItem(ST_DEVICE_LOCK_WALLPAPER);
        if (saved) return saved;
        const liteSaved = readLiteStorage(LITE_DEVICE_LOCK_WALLPAPER);
        if (liteSaved) return liteSaved;
        return getFallbackDeviceLockWallpaper();
    }

    function applyDeviceLockWallpaperToUI(src) {
        const backgroundValue = getDeviceLockBackgroundValue(src);
        ['device-lock-wallpaper', 'device-passcode-wallpaper', 'theme-lock-preview-wallpaper'].forEach(function(id) {
            const el = getDeviceLockElement(id);
            if (el) el.style.background = backgroundValue;
        });
    }

    async function refreshDeviceLockWallpaperPreview() {
        const src = await getDeviceLockWallpaperSource();
        applyDeviceLockWallpaperToUI(src);
    }

    async function persistDeviceLockWallpaper(src) {
        if (src) {
            await localforage.setItem(ST_DEVICE_LOCK_WALLPAPER, src);
            writeLiteStorage(LITE_DEVICE_LOCK_WALLPAPER, src);
        } else {
            await localforage.removeItem(ST_DEVICE_LOCK_WALLPAPER);
            removeLiteStorage(LITE_DEVICE_LOCK_WALLPAPER);
        }
        await refreshDeviceLockWallpaperPreview();
    }

    async function readDeviceLockImage(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                let result = e && e.target ? e.target.result : '';
                if (typeof compressImageBase64 === 'function' && result) {
                    try {
                        result = await compressImageBase64(result, 1440, 0.82);
                    } catch (err) {
                        console.error('锁屏壁纸压缩失败', err);
                    }
                }
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleDeviceLockWallpaperFile(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        const result = await readDeviceLockImage(file);
        await persistDeviceLockWallpaper(result);
        event.target.value = '';
    }

    async function clearDeviceLockWallpaper() {
        await persistDeviceLockWallpaper('');
    }

    function updateDeviceLockClock() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const dateText = `${now.getMonth() + 1}月${now.getDate()}日 ${['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()]}`;
        const timeText = `${hh}:${mm}`;
        ['device-lock-time', 'theme-lock-preview-time'].forEach(function(id) {
            const el = getDeviceLockElement(id);
            if (el) el.textContent = timeText;
        });
        ['device-lock-date', 'theme-lock-preview-date'].forEach(function(id) {
            const el = getDeviceLockElement(id);
            if (el) el.textContent = dateText;
        });
    }

    function buildDotsInto(containerId, dotClassName, dotIdPrefix) {
        const dotsWrap = getDeviceLockElement(containerId);
        if (!dotsWrap) return;
        dotsWrap.innerHTML = '';
        for (let i = 0; i < deviceLockCode.length; i++) {
            const dot = document.createElement('div');
            dot.className = dotClassName;
            if (dotIdPrefix) dot.id = dotIdPrefix + i;
            dotsWrap.appendChild(dot);
        }
    }

    function buildDeviceLockDots() {
        buildDotsInto('device-passcode-dots', 'device-passcode-dot', 'device-passcode-dot-');
        buildDotsInto('theme-lock-preview-dots', 'theme-lock-preview-dot', '');
    }

    function updateDeviceLockDots(state) {
        const mode = state || '';
        for (let i = 0; i < deviceLockCode.length; i++) {
            const dot = getDeviceLockElement('device-passcode-dot-' + i);
            if (!dot) continue;
            if (mode === 'error') dot.className = 'device-passcode-dot error';
            else dot.className = 'device-passcode-dot' + (i < deviceLockInput.length ? ' filled' : '');
        }
    }

    function hideDevicePasscodeError() {
        const errEl = getDeviceLockElement('device-passcode-error');
        const hintEl = getDeviceLockElement('device-passcode-hint');
        if (errEl) errEl.style.display = 'none';
        if (hintEl) hintEl.textContent = '输入锁屏密码';
    }

    function showDevicePasscodeError() {
        const errEl = getDeviceLockElement('device-passcode-error');
        const hintEl = getDeviceLockElement('device-passcode-hint');
        const dotsWrap = getDeviceLockElement('device-passcode-dots');
        if (errEl) errEl.style.display = 'block';
        if (hintEl) hintEl.textContent = '密码错误，请重试';
        updateDeviceLockDots('error');
        if (dotsWrap) {
            const seq = [8, -8, 6, -6, 4, 0];
            let idx = 0;
            const timer = setInterval(function() {
                dotsWrap.style.transform = 'translateX(' + seq[idx] + 'px)';
                idx += 1;
                if (idx >= seq.length) {
                    clearInterval(timer);
                    dotsWrap.style.transform = '';
                }
            }, 60);
        }
    }

    function showDeviceLockScreen() {
        const lockScreen = getDeviceLockElement('device-lock-screen');
        const passcodeScreen = getDeviceLockElement('device-passcode-screen');
        deviceLockInput = '';
        if (lockScreen) lockScreen.style.display = 'block';
        if (passcodeScreen) passcodeScreen.style.display = 'none';
        hideDevicePasscodeError();
        buildDeviceLockDots();
        updateDeviceLockDots();
    }

    function showDevicePasscodeScreen() {
        const lockScreen = getDeviceLockElement('device-lock-screen');
        const passcodeScreen = getDeviceLockElement('device-passcode-screen');
        deviceLockInput = '';
        if (lockScreen) lockScreen.style.display = 'none';
        if (passcodeScreen) passcodeScreen.style.display = 'block';
        hideDevicePasscodeError();
        buildDeviceLockDots();
        updateDeviceLockDots();
    }

    function hideDeviceLockOverlay() {
        const overlay = getDeviceLockElement('device-lock-overlay');
        if (overlay) overlay.style.display = 'none';
        showDeviceLockScreen();
    }

    function lockDevice() {
        if (!deviceLockEnabled) {
            hideDeviceLockOverlay();
            return;
        }
        const overlay = getDeviceLockElement('device-lock-overlay');
        if (overlay) overlay.style.display = 'block';
        showDeviceLockScreen();
    }

    function unlockDevice() {
        hideDeviceLockOverlay();
    }

    async function verifyDeviceLockInput() {
        if (deviceLockInput === deviceLockCode) {
            unlockDevice();
            return;
        }
        deviceLockInput = '';
        showDevicePasscodeError();
        setTimeout(function() {
            hideDevicePasscodeError();
            updateDeviceLockDots();
        }, 520);
    }

    function deviceLockInputDigit(digit) {
        if (!deviceLockEnabled || deviceLockInput.length >= deviceLockCode.length) return;
        deviceLockInput += String(digit || '');
        updateDeviceLockDots();
        if (deviceLockInput.length === deviceLockCode.length) {
            verifyDeviceLockInput();
        }
    }

    function deviceLockDeleteDigit() {
        if (!deviceLockInput) return;
        deviceLockInput = deviceLockInput.slice(0, -1);
        updateDeviceLockDots();
    }

    function deviceLockCancelPasscode() {
        showDeviceLockScreen();
    }

    function bindDeviceLockGesture() {
        const lockScreen = getDeviceLockElement('device-lock-screen');
        const swipeHint = getDeviceLockElement('device-lock-swipe-hint');
        if (!lockScreen || lockScreen._deviceLockBound) return;
        lockScreen._deviceLockBound = true;

        let startY = 0;
        let startX = 0;

        lockScreen.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        }, { passive: true });

        lockScreen.addEventListener('touchend', function(e) {
            const dy = startY - e.changedTouches[0].clientY;
            const dx = Math.abs(startX - e.changedTouches[0].clientX);
            if (dy > 40 && dx < dy) showDevicePasscodeScreen();
        }, { passive: true });

        lockScreen.addEventListener('mousedown', function(e) {
            startY = e.clientY;
        });

        lockScreen.addEventListener('mouseup', function(e) {
            if (startY - e.clientY > 40) showDevicePasscodeScreen();
        });

        if (swipeHint) swipeHint.onclick = showDevicePasscodeScreen;
    }

    function updateDeviceLockStatusTip() {
        const tip = getDeviceLockElement('device-lock-status-tip');
        if (!tip) return;
        tip.textContent = deviceLockEnabled
            ? `已开启锁屏密码，当前为 ${deviceLockCode.length} 位数字。默认初始密码是 ${DEFAULT_DEVICE_LOCK_CODE}。`
            : '已关闭锁屏密码，进入桌面时不会再要求输入密码。';
    }

    function ensureSettingsSecurityFirst() {
        const settingsBody = document.querySelector('#settings-app .app-body');
        const securitySection = getDeviceLockElement('accordion-security');
        if (!settingsBody || !securitySection) return;
        const firstAccordion = settingsBody.querySelector('.theme-accordion-item');
        if (firstAccordion && firstAccordion !== securitySection) {
            settingsBody.insertBefore(securitySection, firstAccordion);
        }
    }

    async function ensureDeviceLockDefaults() {
        const savedEnabled = await localforage.getItem(ST_DEVICE_LOCK_ENABLED);
        const savedCode = await localforage.getItem(ST_DEVICE_LOCK_CODE);
        const liteEnabled = readLiteBoolean(LITE_DEVICE_LOCK_ENABLED);
        const liteCodeRaw = readLiteStorage(LITE_DEVICE_LOCK_CODE);
        const liteCode = liteCodeRaw ? normalizeDeviceLockCode(liteCodeRaw) : '';
        const normalizedEnabled = savedEnabled === null || savedEnabled === undefined
            ? (liteEnabled === null ? true : liteEnabled)
            : savedEnabled !== false;
        const normalizedCode = normalizeDeviceLockCode(savedCode || liteCode || DEFAULT_DEVICE_LOCK_CODE);

        if (savedEnabled === null || savedEnabled === undefined) {
            await localforage.setItem(ST_DEVICE_LOCK_ENABLED, normalizedEnabled);
        }
        if (!savedCode) {
            await localforage.setItem(ST_DEVICE_LOCK_CODE, normalizedCode);
        }

        writeLiteStorage(LITE_DEVICE_LOCK_ENABLED, normalizedEnabled ? '1' : '0');
        writeLiteStorage(LITE_DEVICE_LOCK_CODE, normalizedCode);

        const savedWallpaper = await localforage.getItem(ST_DEVICE_LOCK_WALLPAPER);
        const liteWallpaper = readLiteStorage(LITE_DEVICE_LOCK_WALLPAPER);
        if (!savedWallpaper && liteWallpaper) {
            await localforage.setItem(ST_DEVICE_LOCK_WALLPAPER, liteWallpaper);
        } else if (savedWallpaper) {
            writeLiteStorage(LITE_DEVICE_LOCK_WALLPAPER, savedWallpaper);
        }
    }

    async function syncDeviceLockConfig() {
        await ensureDeviceLockDefaults();
        const savedEnabled = await localforage.getItem(ST_DEVICE_LOCK_ENABLED);
        const savedCode = await localforage.getItem(ST_DEVICE_LOCK_CODE);
        const liteEnabled = readLiteBoolean(LITE_DEVICE_LOCK_ENABLED);
        const liteCode = readLiteStorage(LITE_DEVICE_LOCK_CODE);
        deviceLockEnabled = savedEnabled === null || savedEnabled === undefined
            ? liteEnabled !== false
            : savedEnabled !== false;
        deviceLockCode = normalizeDeviceLockCode(savedCode || liteCode || DEFAULT_DEVICE_LOCK_CODE);
        writeLiteStorage(LITE_DEVICE_LOCK_ENABLED, deviceLockEnabled ? '1' : '0');
        writeLiteStorage(LITE_DEVICE_LOCK_CODE, deviceLockCode);
        buildDeviceLockDots();
        updateDeviceLockDots();
        updateDeviceLockStatusTip();
        await refreshDeviceLockWallpaperPreview();
    }

    async function loadDeviceSecuritySettingsUI() {
        ensureSettingsSecurityFirst();
        await syncDeviceLockConfig();
        const enabledInput = getDeviceLockElement('device-lock-enabled');
        const pwdInput = getDeviceLockElement('device-lock-password');
        const confirmInput = getDeviceLockElement('device-lock-password-confirm');
        if (enabledInput) enabledInput.checked = !!deviceLockEnabled;
        if (pwdInput) pwdInput.value = '';
        if (confirmInput) confirmInput.value = '';
    }

    async function saveSecuritySettings() {
        const enabledInput = getDeviceLockElement('device-lock-enabled');
        const pwdInput = getDeviceLockElement('device-lock-password');
        const confirmInput = getDeviceLockElement('device-lock-password-confirm');
        const previousEnabled = deviceLockEnabled;
        const nextEnabled = enabledInput ? !!enabledInput.checked : true;
        const nextPwd = pwdInput ? String(pwdInput.value || '').replace(/\D/g, '') : '';
        const confirmPwd = confirmInput ? String(confirmInput.value || '').replace(/\D/g, '') : '';
        let finalCode = deviceLockCode;

        if (nextPwd || confirmPwd) {
            if (nextPwd.length < 4 || nextPwd.length > 8) {
                alert('锁屏密码需为 4 到 8 位数字');
                return;
            }
            if (nextPwd !== confirmPwd) {
                alert('两次输入的锁屏密码不一致');
                return;
            }
            finalCode = nextPwd;
        }

        deviceLockEnabled = nextEnabled;
        deviceLockCode = normalizeDeviceLockCode(finalCode);
        await localforage.setItem(ST_DEVICE_LOCK_ENABLED, deviceLockEnabled);
        await localforage.setItem(ST_DEVICE_LOCK_CODE, deviceLockCode);
        writeLiteStorage(LITE_DEVICE_LOCK_ENABLED, deviceLockEnabled ? '1' : '0');
        writeLiteStorage(LITE_DEVICE_LOCK_CODE, deviceLockCode);

        if (pwdInput) pwdInput.value = '';
        if (confirmInput) confirmInput.value = '';

        buildDeviceLockDots();
        updateDeviceLockDots();
        updateDeviceLockStatusTip();

        if (!deviceLockEnabled) {
            hideDeviceLockOverlay();
        } else if (!previousEnabled) {
            lockDevice();
        }

        alert('安全设置已成功保存');
    }

    async function initDeviceLock() {
        ensureSettingsSecurityFirst();
        await syncDeviceLockConfig();
        bindDeviceLockGesture();
        updateDeviceLockClock();
        if (deviceLockClockTimer) clearInterval(deviceLockClockTimer);
        deviceLockClockTimer = setInterval(updateDeviceLockClock, 1000);
        if (deviceLockEnabled) lockDevice();
        else hideDeviceLockOverlay();
    }

    window.refreshDeviceLockWallpaperPreview = refreshDeviceLockWallpaperPreview;
    window.handleDeviceLockWallpaperFile = handleDeviceLockWallpaperFile;
    window.clearDeviceLockWallpaper = clearDeviceLockWallpaper;
    window.saveSecuritySettings = saveSecuritySettings;
    window.deviceLockInputDigit = deviceLockInputDigit;
    window.deviceLockDeleteDigit = deviceLockDeleteDigit;
    window.deviceLockCancelPasscode = deviceLockCancelPasscode;

    function normalizeMiniMaxLanguage(lang) {
        const raw = String(lang || '').trim();
        const val = raw.toLowerCase();
        const aliasMap = {
            zh: 'zh',
            cn: 'zh',
            '中': 'zh',
            en: 'en',
            english: 'en',
            '英': 'en',
            ja: 'ja',
            jp: 'ja',
            japanese: 'ja',
            '日': 'ja',
            ko: 'ko',
            kr: 'ko',
            korean: 'ko',
            '韩': 'ko',
            yue: 'yue',
            cantonese: 'yue',
            '粤': 'yue',
            fr: 'fr',
            french: 'fr',
            '法': 'fr',
            th: 'th',
            thai: 'th',
            '泰': 'th'
        };
        return aliasMap[val] || aliasMap[raw] || 'zh';
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
            if (typeof window.collapseThemeAccordions === 'function') {
                window.collapseThemeAccordions();
            }
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
        await loadDeviceSecuritySettingsUI();
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
        initDeviceLock().catch(function(err) {
            console.error('初始化设备锁屏失败', err);
        });
    });
    const db = new Dexie("miniPhoneWorldbookDB_V2");
    db.version(1).stores({ entries: '++id, category, activation, priority' });
    let currentWbCategory = 'global'; 
