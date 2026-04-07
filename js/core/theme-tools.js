// Auto-split from js/core/bootstrap.js (1411-1696)

// 切换主题页折叠项
    function collapseThemeAccordions() {
        document.querySelectorAll('.theme-accordion-item').forEach(function(el) {
            el.classList.remove('active');
        });
    }

    function toggleThemeSection(id) {
        const item = document.getElementById(id);
        if (!item) return;
        const isActive = item.classList.contains('active');
        collapseThemeAccordions();
        if (!isActive) item.classList.add('active');
    }

    window.collapseThemeAccordions = collapseThemeAccordions;

    const THEME_MODE_KEY = 'miffy_theme_mode';
    const CUSTOM_THEME_KEY = 'miffy_custom_theme';
    const CUSTOM_THEME_PRESETS_KEY = 'miffy_custom_theme_presets';
    const DEFAULT_CUSTOM_THEME = Object.freeze({
        bgMain: '#f5f1eb',
        bgSub: '#ebe5dc',
        textMain: '#26221e',
        textSub: '#8d8479',
        accent: '#1f1d1a',
        border: '#d8d0c4',
        surface: '#ffffff',
        widget: '#f7f3ed',
        wallpaper: '',
        primaryButtonImage: '',
        secondaryButtonImage: '',
        iconButtonImage: '',
        dockImage: '',
        buttonStyle: 'soft',
        buttonRadius: 22
    });
    const BUILTIN_THEME_TOKENS = Object.freeze({
        day: {
            bgMain: '#f5f1eb',
            bgSub: '#ebe5dc',
            panelBg: 'rgba(250, 248, 244, 0.94)',
            widgetBg: 'rgba(255, 255, 255, 0.76)',
            surface1: '#ffffff',
            surface2: '#f7f3ed',
            inputBg: '#fcfaf7',
            textMain: '#26221e',
            textSub: '#8d8479',
            accent: '#1f1d1a',
            accentSoft: 'rgba(31, 29, 26, 0.08)',
            border: 'rgba(45, 39, 33, 0.08)',
            shadow: 'rgba(45, 39, 33, 0.06)',
            shadowStrong: 'rgba(45, 39, 33, 0.12)',
            lineColor: 'rgba(205, 196, 184, 0.18)'
        },
        dopamine: {
            bgMain: '#fffaf6',
            bgSub: '#fff4ee',
            panelBg: 'rgba(255, 247, 241, 0.94)',
            widgetBg: 'rgba(255, 243, 235, 0.82)',
            surface1: '#fffdfb',
            surface2: '#fff0e6',
            inputBg: '#fffaf7',
            textMain: '#564a52',
            textSub: '#9d8d94',
            accent: '#ff9c7b',
            accentSoft: 'rgba(255, 156, 123, 0.18)',
            border: 'rgba(255, 156, 123, 0.18)',
            shadow: 'rgba(244, 157, 129, 0.12)',
            shadowStrong: 'rgba(244, 157, 129, 0.18)',
            lineColor: 'rgba(86, 74, 82, 0.07)'
        },
        night: {
            bgMain: '#080b12',
            bgSub: '#101726',
            panelBg: 'rgba(11, 16, 26, 0.94)',
            widgetBg: 'rgba(18, 25, 39, 0.88)',
            surface1: '#141c2b',
            surface2: '#0d131e',
            inputBg: '#192233',
            textMain: '#eef4ff',
            textSub: '#8e9cb4',
            accent: '#7bb7ff',
            accentSoft: 'rgba(123, 183, 255, 0.18)',
            border: 'rgba(143, 170, 214, 0.16)',
            shadow: 'rgba(0, 0, 0, 0.34)',
            shadowStrong: 'rgba(0, 0, 0, 0.5)',
            lineColor: 'rgba(210, 224, 247, 0.06)'
        }
    });

    let currentThemeMode = 'day';
    let currentCustomTheme = Object.assign({}, DEFAULT_CUSTOM_THEME);

    function normalizeHexColor(value, fallback) {
        const raw = (value || '').trim();
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
            return '#' + raw.slice(1).split('').map(ch => ch + ch).join('').toLowerCase();
        }
        return fallback;
    }

    function hexToRgb(hex) {
        const safe = normalizeHexColor(hex, '#000000');
        return {
            r: parseInt(safe.slice(1, 3), 16),
            g: parseInt(safe.slice(3, 5), 16),
            b: parseInt(safe.slice(5, 7), 16)
        };
    }

    function toRgba(hex, alpha) {
        const rgb = hexToRgb(hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    function mixHexColors(baseHex, mixHex, ratio) {
        const base = hexToRgb(baseHex);
        const mix = hexToRgb(mixHex);
        const weight = Math.max(0, Math.min(1, ratio));
        const mixed = {
            r: Math.round(base.r + (mix.r - base.r) * weight),
            g: Math.round(base.g + (mix.g - base.g) * weight),
            b: Math.round(base.b + (mix.b - base.b) * weight)
        };
        return '#' + [mixed.r, mixed.g, mixed.b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    function getHexLuminance(hex) {
        const rgb = hexToRgb(hex);
        const channels = [rgb.r, rgb.g, rgb.b].map(function(channel) {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function normalizeCustomTheme(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            bgMain: normalizeHexColor(source.bgMain, DEFAULT_CUSTOM_THEME.bgMain),
            bgSub: normalizeHexColor(source.bgSub, DEFAULT_CUSTOM_THEME.bgSub),
            textMain: normalizeHexColor(source.textMain, DEFAULT_CUSTOM_THEME.textMain),
            textSub: normalizeHexColor(source.textSub, DEFAULT_CUSTOM_THEME.textSub),
            accent: normalizeHexColor(source.accent, DEFAULT_CUSTOM_THEME.accent),
            border: normalizeHexColor(source.border, DEFAULT_CUSTOM_THEME.border),
            surface: normalizeHexColor(source.surface, DEFAULT_CUSTOM_THEME.surface),
            widget: normalizeHexColor(source.widget, DEFAULT_CUSTOM_THEME.widget),
            wallpaper: source && typeof source.wallpaper === 'string' ? source.wallpaper : '',
            primaryButtonImage: source && typeof source.primaryButtonImage === 'string' ? source.primaryButtonImage : '',
            secondaryButtonImage: source && typeof source.secondaryButtonImage === 'string' ? source.secondaryButtonImage : '',
            iconButtonImage: source && typeof source.iconButtonImage === 'string' ? source.iconButtonImage : '',
            dockImage: source && typeof source.dockImage === 'string' ? source.dockImage : '',
            buttonStyle: source && (source.buttonStyle === 'glass' || source.buttonStyle === 'solid') ? source.buttonStyle : 'soft',
            buttonRadius: Math.max(14, Math.min(34, parseInt(source && source.buttonRadius, 10) || DEFAULT_CUSTOM_THEME.buttonRadius))
        };
    }

    function buildThemeTokens(mode, customTheme) {
        if (mode === 'custom') {
            const theme = normalizeCustomTheme(customTheme);
            const surface2 = mixHexColors(theme.bgSub, theme.surface, 0.42);
            let controlBg = toRgba(theme.surface, 0.9);
            let controlBorder = toRgba(theme.border, 0.44);
            let controlShadow = `0 10px 28px ${toRgba(theme.accent, 0.16)}`;
            if (theme.buttonStyle === 'glass') {
                controlBg = toRgba(theme.surface, 0.52);
                controlBorder = toRgba(theme.surface, 0.68);
                controlShadow = `0 14px 36px ${toRgba(theme.accent, 0.2)}`;
            } else if (theme.buttonStyle === 'solid') {
                controlBg = theme.accent;
                controlBorder = toRgba(theme.accent, 0.92);
                controlShadow = `0 14px 34px ${toRgba(theme.accent, 0.26)}`;
            }
            return {
                bgMain: theme.bgMain,
                bgSub: theme.bgSub,
                panelBg: toRgba(theme.surface, 0.94),
                widgetBg: toRgba(theme.widget, 0.82),
                surface1: theme.surface,
                surface2: surface2,
                inputBg: mixHexColors(theme.surface, '#ffffff', 0.16),
                textMain: theme.textMain,
                textSub: theme.textSub,
                accent: theme.accent,
                accentSoft: toRgba(theme.accent, 0.16),
                border: toRgba(theme.border, 0.52),
                shadow: toRgba(theme.accent, 0.12),
                shadowStrong: toRgba(theme.accent, 0.18),
                lineColor: toRgba(theme.textMain, 0.06),
                controlBg: controlBg,
                controlBorder: controlBorder,
                controlShadow: controlShadow,
                controlText: theme.buttonStyle === 'solid' ? '#ffffff' : theme.textMain,
                controlRadius: theme.buttonRadius + 'px'
            };
        }
        return BUILTIN_THEME_TOKENS[mode] || BUILTIN_THEME_TOKENS.day;
    }

    function updateThemeMeta(mode, tokens, customTheme) {
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (mode === 'day') {
            if (metaTheme) metaTheme.setAttribute('content', '#ffffff');
            if (appleStatusBar) appleStatusBar.setAttribute('content', 'default');
            document.documentElement.style.colorScheme = 'light';
            return;
        }
        const isDark = mode === 'night' || (mode === 'custom' && getHexLuminance((customTheme || DEFAULT_CUSTOM_THEME).bgMain) < 0.42);
        if (metaTheme) metaTheme.setAttribute('content', tokens.bgMain || '#ffffff');
        if (appleStatusBar) appleStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }

    function applyThemeTokens(mode, tokens, customTheme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', mode);
        if (mode === 'custom') root.setAttribute('data-button-style', normalizeCustomTheme(customTheme).buttonStyle);
        else root.removeAttribute('data-button-style');
        root.style.setProperty('--bg-main', tokens.bgMain);
        root.style.setProperty('--bg-sub', tokens.bgSub);
        root.style.setProperty('--panel-bg', tokens.panelBg);
        root.style.setProperty('--widget-bg', tokens.widgetBg);
        root.style.setProperty('--surface-1', tokens.surface1);
        root.style.setProperty('--surface-2', tokens.surface2);
        root.style.setProperty('--input-bg', tokens.inputBg);
        root.style.setProperty('--text-main', tokens.textMain);
        root.style.setProperty('--text-sub', tokens.textSub);
        root.style.setProperty('--accent', tokens.accent);
        root.style.setProperty('--accent-soft', tokens.accentSoft);
        root.style.setProperty('--border', tokens.border);
        root.style.setProperty('--shadow', tokens.shadow);
        root.style.setProperty('--shadow-strong', tokens.shadowStrong);
        root.style.setProperty('--line-color', tokens.lineColor);
        if (tokens.controlBg) root.style.setProperty('--control-bg', tokens.controlBg);
        if (tokens.controlBorder) root.style.setProperty('--control-border', tokens.controlBorder);
        if (tokens.controlShadow) root.style.setProperty('--control-shadow', tokens.controlShadow);
        if (tokens.controlText) root.style.setProperty('--control-text', tokens.controlText);
        if (tokens.controlRadius) root.style.setProperty('--control-radius', tokens.controlRadius);
        root.style.setProperty('--control-image-primary', customTheme && customTheme.primaryButtonImage ? `url("${customTheme.primaryButtonImage}")` : 'none');
        root.style.setProperty('--control-image-secondary', customTheme && customTheme.secondaryButtonImage ? `url("${customTheme.secondaryButtonImage}")` : 'none');
        root.style.setProperty('--control-image-icon', customTheme && customTheme.iconButtonImage ? `url("${customTheme.iconButtonImage}")` : 'none');
        root.style.setProperty('--control-image-dock', customTheme && customTheme.dockImage ? `url("${customTheme.dockImage}")` : 'none');
        updateThemeMeta(mode, tokens, customTheme);
    }

    function clearThemeTokens() {
        const root = document.documentElement;
        root.removeAttribute('data-theme');
        root.removeAttribute('data-button-style');
        [
            '--bg-main', '--bg-sub', '--panel-bg', '--widget-bg', '--surface-1', '--surface-2',
            '--input-bg', '--text-main', '--text-sub', '--accent', '--accent-soft', '--border',
            '--shadow', '--shadow-strong', '--line-color', '--control-bg', '--control-border',
            '--control-shadow', '--control-text', '--control-radius', '--control-image-primary',
            '--control-image-secondary', '--control-image-icon', '--control-image-dock'
        ].forEach(function(token) {
            root.style.removeProperty(token);
        });
        updateThemeMeta('day', {}, DEFAULT_CUSTOM_THEME);
    }

    function getCustomThemeInputs() {
        return {
            bgMain: document.getElementById('custom-bg-main'),
            bgSub: document.getElementById('custom-bg-sub'),
            textMain: document.getElementById('custom-text-main'),
            textSub: document.getElementById('custom-text-sub'),
            accent: document.getElementById('custom-accent'),
            border: document.getElementById('custom-border'),
            surface: document.getElementById('custom-surface'),
            widget: document.getElementById('custom-widget'),
            buttonStyle: document.getElementById('custom-button-style'),
            buttonRadius: document.getElementById('custom-button-radius')
        };
    }

    function fillCustomThemeInputs(theme) {
        const normalized = normalizeCustomTheme(theme);
        const inputs = getCustomThemeInputs();
        Object.keys(inputs).forEach(function(key) {
            if (inputs[key] && normalized[key] !== undefined) inputs[key].value = normalized[key];
        });
        const radiusVal = document.getElementById('custom-button-radius-val');
        if (radiusVal) radiusVal.textContent = normalized.buttonRadius + 'px';
        setCustomWallpaperPreview(normalized.wallpaper);
        updateCustomThemePreview(normalized);
    }

    function readCustomThemeFromInputs() {
        const inputs = getCustomThemeInputs();
        return normalizeCustomTheme({
            bgMain: inputs.bgMain && inputs.bgMain.value,
            bgSub: inputs.bgSub && inputs.bgSub.value,
            textMain: inputs.textMain && inputs.textMain.value,
            textSub: inputs.textSub && inputs.textSub.value,
            accent: inputs.accent && inputs.accent.value,
            border: inputs.border && inputs.border.value,
            surface: inputs.surface && inputs.surface.value,
            widget: inputs.widget && inputs.widget.value,
            wallpaper: currentCustomTheme && currentCustomTheme.wallpaper ? currentCustomTheme.wallpaper : '',
            buttonStyle: inputs.buttonStyle && inputs.buttonStyle.value,
            buttonRadius: inputs.buttonRadius && inputs.buttonRadius.value
        });
    }

    function updateCustomThemePreview(theme) {
        const preview = document.querySelector('.theme-mode-option[data-theme="custom"] .theme-mode-preview');
        if (!preview) return;
        const normalized = normalizeCustomTheme(theme);
        preview.style.background = normalized.wallpaper
            ? `linear-gradient(135deg, ${toRgba(normalized.bgMain, 0.24)}, ${toRgba(normalized.surface, 0.28)}), url(${normalized.wallpaper}) center/cover no-repeat`
            : `linear-gradient(135deg, ${normalized.bgMain} 0%, ${normalized.surface} 54%, ${normalized.widget} 100%)`;
        preview.style.borderColor = toRgba(normalized.border, 0.7);
    }

    function setCustomWallpaperPreview(src) {
        const img = document.querySelector('#custom-theme-wallpaper-preview img');
        const panel = document.getElementById('custom-theme-wallpaper-preview');
        if (!img || !panel) return;
        const safeSrc = src || (typeof whitePixel === 'string' ? whitePixel : '');
        img.src = safeSrc;
        panel.classList.toggle('is-empty', !src);
    }

    async function readCompressedThemeImage(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                let result = e.target && e.target.result ? e.target.result : '';
                if (typeof compressImageBase64 === 'function') {
                    try {
                        result = await compressImageBase64(result, 1440, 0.82);
                    } catch (err) {
                        console.error('主题图片压缩失败', err);
                    }
                }
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function restorePrimaryWallpaper() {
        if (typeof setWallpaper !== 'function' || typeof imgDb === 'undefined') return;
        const record = await imgDb.images.get('wallpaper-preview');
        setWallpaper(record && record.src ? record.src : '');
    }

    async function applyThemeWallpaper(mode, customTheme) {
        if (typeof setWallpaper !== 'function') return;
        if (mode === 'custom' && customTheme && customTheme.wallpaper) {
            setWallpaper(customTheme.wallpaper);
            return;
        }
        await restorePrimaryWallpaper();
    }

    function updateThemeModeUI(mode) {
        document.querySelectorAll('.theme-mode-option').forEach(function(option) {
            option.classList.toggle('active', option.dataset.theme === mode);
        });
        const editor = document.getElementById('custom-theme-editor');
        if (editor) editor.style.display = mode === 'custom' ? 'block' : 'none';
    }

    async function getCustomThemePresets() {
        const presets = await localforage.getItem(CUSTOM_THEME_PRESETS_KEY);
        return Array.isArray(presets) ? presets : [];
    }

    async function saveCustomThemePresetsToStore(presets) {
        await localforage.setItem(CUSTOM_THEME_PRESETS_KEY, presets);
    }

    async function renderCustomThemePresetOptions(selectedId) {
        const select = document.getElementById('custom-theme-preset-select');
        const hint = document.getElementById('custom-theme-preset-hint');
        const nameInput = document.getElementById('custom-theme-preset-name');
        if (!select) return [];

        const presets = await getCustomThemePresets();
        if (!presets.length) {
            select.innerHTML = '<option value="">暂无预设</option>';
            select.classList.add('custom-theme-preset-empty');
            if (nameInput) nameInput.value = '';
            if (hint) hint.textContent = '当前未保存个性主题预设，可先调色后保存。';
            return presets;
        }

        select.classList.remove('custom-theme-preset-empty');
        select.innerHTML = presets.map(function(preset) {
            return `<option value="${preset.id}">${preset.name}</option>`;
        }).join('');

        const targetId = selectedId || select.value || presets[0].id;
        select.value = targetId;
        const currentPreset = presets.find(function(item) { return item.id === targetId; }) || presets[0];
        if (currentPreset && nameInput && !nameInput.value.trim()) {
            nameInput.value = currentPreset.name;
        }
        if (hint) {
            hint.textContent = `已保存 ${presets.length} 套个性主题预设，当前选中：${currentPreset ? currentPreset.name : '未选择'}。`;
        }
        return presets;
    }

    function syncPresetNameToSelection() {
        const select = document.getElementById('custom-theme-preset-select');
        const nameInput = document.getElementById('custom-theme-preset-name');
        if (!select || !nameInput || !select.value) return;
        const option = select.options[select.selectedIndex];
        if (option) nameInput.value = option.textContent;
    }

    async function applyThemeMode(mode, options) {
        const normalizedMode = mode === 'dopamine' || mode === 'night' || mode === 'custom' ? mode : 'day';
        const opts = options || {};
        currentThemeMode = normalizedMode;

        if (normalizedMode === 'day') {
            clearThemeTokens();
            await applyThemeWallpaper('day', currentCustomTheme);
        } else if (normalizedMode === 'custom') {
            currentCustomTheme = normalizeCustomTheme(opts.customTheme || currentCustomTheme);
            fillCustomThemeInputs(currentCustomTheme);
            applyThemeTokens('custom', buildThemeTokens('custom', currentCustomTheme), currentCustomTheme);
            await applyThemeWallpaper('custom', currentCustomTheme);
        } else {
            applyThemeTokens(normalizedMode, buildThemeTokens(normalizedMode, currentCustomTheme), currentCustomTheme);
            await applyThemeWallpaper(normalizedMode, currentCustomTheme);
        }

        updateThemeModeUI(normalizedMode);

        if (opts.persist === false) return;
        await localforage.setItem(THEME_MODE_KEY, normalizedMode);
        if (normalizedMode === 'custom') {
            await localforage.setItem(CUSTOM_THEME_KEY, currentCustomTheme);
        }
    }

    async function setThemeMode(mode) {
        const normalizedMode = mode === 'dopamine' || mode === 'night' || mode === 'custom' ? mode : 'day';
        await applyThemeMode(normalizedMode, normalizedMode === 'custom'
            ? { customTheme: currentCustomTheme }
            : undefined);
    }

    function previewCustomThemeFromInputs() {
        const previewTheme = readCustomThemeFromInputs();
        updateCustomThemePreview(previewTheme);
        if (currentThemeMode === 'custom') {
            currentCustomTheme = previewTheme;
            applyThemeTokens('custom', buildThemeTokens('custom', previewTheme), previewTheme);
            applyThemeWallpaper('custom', previewTheme);
            updateThemeModeUI('custom');
        }
    }

    async function applyCustomTheme() {
        currentCustomTheme = readCustomThemeFromInputs();
        await applyThemeMode('custom', { customTheme: currentCustomTheme });
    }

    async function saveCustomThemePreset() {
        const nameInput = document.getElementById('custom-theme-preset-name');
        const presetName = nameInput && nameInput.value.trim()
            ? nameInput.value.trim()
            : `个性主题 ${new Date().toLocaleDateString('zh-CN')}`;
        const presets = await getCustomThemePresets();
        const preset = {
            id: 'custom-theme-' + Date.now(),
            name: presetName,
            theme: readCustomThemeFromInputs(),
            updatedAt: Date.now()
        };
        presets.unshift(preset);
        await saveCustomThemePresetsToStore(presets);
        if (nameInput) nameInput.value = preset.name;
        await renderCustomThemePresetOptions(preset.id);
        alert(`已保存主题预设：${preset.name}`);
    }

    async function loadCustomThemePreset() {
        const select = document.getElementById('custom-theme-preset-select');
        if (!select || !select.value) {
            alert('请先选择一个主题预设');
            return;
        }
        const presets = await getCustomThemePresets();
        const preset = presets.find(function(item) { return item.id === select.value; });
        if (!preset) {
            alert('未找到对应的主题预设');
            return;
        }
        currentCustomTheme = normalizeCustomTheme(preset.theme);
        fillCustomThemeInputs(currentCustomTheme);
        const nameInput = document.getElementById('custom-theme-preset-name');
        if (nameInput) nameInput.value = preset.name;
        await applyThemeMode('custom', { customTheme: currentCustomTheme });
        await renderCustomThemePresetOptions(preset.id);
    }

    async function updateCustomThemePreset() {
        const select = document.getElementById('custom-theme-preset-select');
        if (!select || !select.value) {
            alert('请先选择一个要更新的预设');
            return;
        }
        const presets = await getCustomThemePresets();
        const index = presets.findIndex(function(item) { return item.id === select.value; });
        if (index < 0) {
            alert('未找到对应的主题预设');
            return;
        }
        const nameInput = document.getElementById('custom-theme-preset-name');
        presets[index] = {
            id: presets[index].id,
            name: nameInput && nameInput.value.trim() ? nameInput.value.trim() : presets[index].name,
            theme: readCustomThemeFromInputs(),
            updatedAt: Date.now()
        };
        await saveCustomThemePresetsToStore(presets);
        currentCustomTheme = normalizeCustomTheme(presets[index].theme);
        await applyThemeMode('custom', { customTheme: currentCustomTheme });
        if (nameInput) nameInput.value = presets[index].name;
        await renderCustomThemePresetOptions(presets[index].id);
        alert(`已更新主题预设：${presets[index].name}`);
    }

    async function deleteCustomThemePreset() {
        const select = document.getElementById('custom-theme-preset-select');
        if (!select || !select.value) {
            alert('请先选择一个要删除的预设');
            return;
        }
        const presets = await getCustomThemePresets();
        const preset = presets.find(function(item) { return item.id === select.value; });
        if (!preset) {
            alert('未找到对应的主题预设');
            return;
        }
        if (!await window.showMiniConfirm(`确定删除主题预设【${preset.name}】吗？`)) return;
        const nextPresets = presets.filter(function(item) { return item.id !== preset.id; });
        await saveCustomThemePresetsToStore(nextPresets);
        const nextId = nextPresets.length ? nextPresets[0].id : '';
        await renderCustomThemePresetOptions(nextId);
        if (nextId) syncPresetNameToSelection();
        alert(`已删除主题预设：${preset.name}`);
    }

    async function handleCustomThemeWallpaperFile(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        const result = await readCompressedThemeImage(file);
        currentCustomTheme = normalizeCustomTheme(Object.assign({}, readCustomThemeFromInputs(), {
            wallpaper: result
        }));
        fillCustomThemeInputs(currentCustomTheme);
        if (currentThemeMode === 'custom') {
            await applyThemeMode('custom', { customTheme: currentCustomTheme });
        }
        event.target.value = '';
    }

    async function clearCustomThemeWallpaper() {
        currentCustomTheme = normalizeCustomTheme(Object.assign({}, readCustomThemeFromInputs(), {
            wallpaper: ''
        }));
        fillCustomThemeInputs(currentCustomTheme);
        if (currentThemeMode === 'custom') {
            await applyThemeMode('custom', { customTheme: currentCustomTheme });
        } else {
            await restorePrimaryWallpaper();
        }
    }

    async function handleCustomThemeButtonImage(key, event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        const result = await readCompressedThemeImage(file);
        const nextTheme = Object.assign({}, readCustomThemeFromInputs());
        nextTheme[key] = result;
        currentCustomTheme = normalizeCustomTheme(nextTheme);
        fillCustomThemeInputs(currentCustomTheme);
        if (currentThemeMode === 'custom') {
            await applyThemeMode('custom', { customTheme: currentCustomTheme });
        }
        event.target.value = '';
    }

    async function clearCustomThemeButtonImage(key) {
        const nextTheme = Object.assign({}, readCustomThemeFromInputs());
        nextTheme[key] = '';
        currentCustomTheme = normalizeCustomTheme(nextTheme);
        fillCustomThemeInputs(currentCustomTheme);
        if (currentThemeMode === 'custom') {
            await applyThemeMode('custom', { customTheme: currentCustomTheme });
        }
    }

    function updateCustomButtonRadius(val) {
        const display = document.getElementById('custom-button-radius-val');
        if (display) display.textContent = val + 'px';
        previewCustomThemeFromInputs();
    }

    document.addEventListener('DOMContentLoaded', async function() {
        const storedCustomTheme = await localforage.getItem(CUSTOM_THEME_KEY);
        currentCustomTheme = normalizeCustomTheme(storedCustomTheme || DEFAULT_CUSTOM_THEME);
        fillCustomThemeInputs(currentCustomTheme);
        await renderCustomThemePresetOptions();

        const select = document.getElementById('custom-theme-preset-select');
        if (select && !select._themePresetBound) {
            select._themePresetBound = true;
            select.addEventListener('change', syncPresetNameToSelection);
        }

        Object.values(getCustomThemeInputs()).forEach(function(input) {
            if (!input || input._themePreviewBound) return;
            input._themePreviewBound = true;
            input.addEventListener('input', previewCustomThemeFromInputs);
            input.addEventListener('change', previewCustomThemeFromInputs);
        });

        const storedMode = await localforage.getItem(THEME_MODE_KEY);
        const normalizedStoredMode = storedMode === 'dopamine' || storedMode === 'night' || storedMode === 'custom'
            ? storedMode
            : 'day';
        await applyThemeMode(normalizedStoredMode, {
            persist: false,
            customTheme: currentCustomTheme
        });
    });
    // ====== 全局 CSS 模板功能 ======
    async function applyGlobalCssInput() {
        const cssText = document.getElementById('global-css-input').value.trim();
        let styleEl = document.getElementById('global-custom-css-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'global-custom-css-style';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = cssText;
        await localforage.setItem('miffy_global_custom_css', cssText);
        // 提示
        const btn = document.querySelector('[onclick="applyGlobalCssInput()"]');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '已应用 ✓';
            btn.style.color = '#4caf50';
            setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
        }
    }

    function copyGlobalCssTemplate() {
        const template = [
            '/* ====== 全局桌面 CSS 模板 ======',
            '   修改后点击「应用」即可生效，支持自定义整个桌面外观。',
            '   ============================== */',
            '',
            '/* --- 图标大小（桌面应用图标） --- */',
            '.icon-img {',
            '    width: 63px;',
            '    height: 63px;',
            '    border-radius: 17px;',
            '}',
            '',
            '/* --- 图标名称字体大小 --- */',
            '.app-icon span {',
            '    font-size: 12px;',
            '    color: #333;',
            '}',
            '',
            '/* --- Dock栏图标大小 --- */',
            '.dock-icon {',
            '    width: 63px;',
            '    height: 63px;',
            '    border-radius: 17px;',
            '}',
            '',
            '/* --- Dock栏背景 --- */',
            '.dock {',
            '    height: 95px;',
            '    background: rgba(255,255,255,0.45);',
            '    border-radius: 35px;',
            '    backdrop-filter: blur(25px);',
            '}',
            '',
            '/* --- 导航栏标题 --- */',
            '.app-title {',
            '    font-size: 17px;',
            '    font-weight: 800;',
            '    color: #222;',
            '}',
            '',
            '/* --- 导航栏背景 --- */',
            '.app-header {',
            '    height: 68px;',
            '    background: transparent;',
            '}',
            '',
            '/* --- 导航栏返回/操作按钮 --- */',
            '.app-back, .app-header-action {',
            '    width: 32px;',
            '    min-width: 32px;',
            '    height: 32px;',
            '    border-radius: 50%;',
            '    padding: 0;',
            '    background: transparent !important;',
            '    border: none !important;',
            '    box-shadow: none !important;',
            '    backdrop-filter: none !important;',
            '    -webkit-backdrop-filter: none !important;',
            '}',
            '.app-header-action svg {',
            '    filter: drop-shadow(0 6px 14px rgba(0,0,0,0.12));',
            '}',
            '',
            '/* --- 聊天气泡字体 --- */',
            '.chat-msg-content {',
            '    font-size: 13.5px;',
            '}',
            '',
            '/* --- 我的聊天气泡颜色 --- */',
            '.msg-right .chat-msg-content {',
            '    background: #e2e2e2;',
            '    color: #333;',
            '}',
            '',
            '/* --- 角色聊天气泡颜色 --- */',
            '.msg-left .chat-msg-content {',
            '    background: #ffffff;',
            '    color: #222;',
            '}',
            '',
            '/* --- 聊天页面背景 --- */',
            '.chat-body {',
            '    background: #f6f6f6;',
            '}',
            '',
            '/* --- 聊天输入框区域 --- */',
            '.chat-footer {',
            '    height: 52px;',
            '    background: rgba(255,255,255,0.85);',
            '    border-radius: 26px;',
            '}',
            '',
            '/* --- 通用输入框 --- */',
            '.settings-input {',
            '    border-radius: 12px;',
            '    font-size: 14px;',
            '    border: 1px solid #eee;',
            '}',
            '',
            '/* --- 通用按钮 --- */',
            '.btn-restore {',
            '    background: #fff;',
            '    color: #666;',
            '    border-radius: 25px;',
            '    font-size: 14px;',
            '    box-shadow: 0 6px 20px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 卡片样式 --- */',
            '.wb-card {',
            '    border-radius: 18px;',
            '    box-shadow: 0 4px 16px rgba(0,0,0,0.03);',
            '}',
            '',
            '/* --- 全屏页面背景 --- */',
            '.full-app-page {',
            '    background: rgba(250,250,250,0.95);',
            '}',
            '',
            '/* --- WeChat消息列表背景 --- */',
            '#wechat-tab-msg {',
            '    background: #f7f7f7;',
            '}',
            '',
            '/* --- 折叠面板 --- */',
            '.theme-accordion-item {',
            '    border-radius: 22px;',
            '    background: #fff;',
            '}',
        ].join('\n');

        // 填入输入框
        const cssInput = document.getElementById('global-css-input');
        if (cssInput) {
            cssInput.value = template;
            cssInput.focus();
            cssInput.scrollTop = 0;
        }

        // 同时复制到剪贴板
        if (navigator.clipboard) {
            navigator.clipboard.writeText(template).catch(() => {});
        }

        // 提示
        const btn = document.querySelector('[onclick="copyGlobalCssTemplate()"]');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '已复制 ✓';
            btn.style.color = '#4caf50';
            setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
        }
    }

    async function resetGlobalCss() {
        const cssInput = document.getElementById('global-css-input');
        if (cssInput) cssInput.value = '';
        let styleEl = document.getElementById('global-custom-css-style');
        if (styleEl) styleEl.innerHTML = '';
        await localforage.removeItem('miffy_global_custom_css');
        const btn = document.querySelector('[onclick="resetGlobalCss()"]');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '已重置 ✓';
            btn.style.color = '#4caf50';
            setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
        }
    }

    // 页面加载时恢复全局自定义CSS
    window.addEventListener('DOMContentLoaded', async () => {
        const savedCss = await localforage.getItem('miffy_global_custom_css');
        if (savedCss) {
            let styleEl = document.getElementById('global-custom-css-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'global-custom-css-style';
                document.head.appendChild(styleEl);
            }
            styleEl.innerHTML = savedCss;
            const cssInput = document.getElementById('global-css-input');
            if (cssInput) cssInput.value = savedCss;
        }
    });

    // UI缩放
    function updateUiScale(val) {
        const numericVal = Math.max(50, Math.min(150, parseFloat(val) || 100));
        document.documentElement.style.setProperty('--ui-scale', String(numericVal / 100));
        document.documentElement.style.zoom = '';
        const display = document.getElementById('ui-scale-val');
        if (display) display.textContent = numericVal + '%';
        localforage.setItem('miffy_ui_scale', numericVal);
    }
    function restoreDefaultUiScale() {
        const defaultVal = 100;
        document.documentElement.style.setProperty('--ui-scale', '1');
        document.documentElement.style.zoom = '';
        const slider = document.getElementById('ui-scale-slider');
        if (slider) slider.value = defaultVal;
        const display = document.getElementById('ui-scale-val');
        if (display) display.textContent = defaultVal + '%';
        localforage.setItem('miffy_ui_scale', defaultVal);
    }
    // 联系人分组增删与筛选逻辑
    let contactGroups = [];
    let activeContactGroupFilter = 'ALL';

    function getActiveContactGroupFilter() {
        if (activeContactGroupFilter === 'ALL') return 'ALL';
        return contactGroups.includes(activeContactGroupFilter) ? activeContactGroupFilter : 'ALL';
    }

    function createContactGroupTag(label, isActive) {
        const tag = document.createElement('button');
        tag.type = 'button';
        tag.style.cssText = [
            'appearance:none',
            'border:none',
            'outline:none',
            'cursor:pointer',
            'display:flex',
            'align-items:center',
            'gap:6px',
            'padding:4px 12px',
            'border-radius:16px',
            'font-size:11px',
            'letter-spacing:0.5px',
            'transition:all 0.18s ease',
            isActive
                ? 'background:#1f1f1f;color:#fff;box-shadow:0 10px 18px rgba(0,0,0,0.08);border:1px solid #1f1f1f'
                : 'background:#fff;color:#555;box-shadow:0 1px 6px rgba(0,0,0,0.03);border:1px solid #f0f0f0'
        ].join(';');
        tag.textContent = label;
        return tag;
    }

    async function syncContactGroupFilterAndList() {
        activeContactGroupFilter = getActiveContactGroupFilter();
        renderContactGroups();
        if (typeof renderContacts === 'function') {
            await renderContacts();
        }
    }

    async function initContactGroups() {
        const savedGroups = await localforage.getItem('miffy_contact_groups');
        if (savedGroups && Array.isArray(savedGroups)) {
            contactGroups = savedGroups;
        } else {
            contactGroups = ['Lover', 'Friend', 'Family'];
            await localforage.setItem('miffy_contact_groups', contactGroups);
        }
        activeContactGroupFilter = getActiveContactGroupFilter();
        renderContactGroups();
    }
    function renderContactGroups() {
        const container = document.getElementById('contact-group-container');
        if (!container) return;
        const currentFilter = getActiveContactGroupFilter();
        container.innerHTML = '';
        const allTag = createContactGroupTag('ALL', currentFilter === 'ALL');
        allTag.onclick = function() {
            setActiveContactGroup('ALL');
        };
        container.appendChild(allTag);
        contactGroups.forEach((group, index) => {
            const tag = createContactGroupTag(group, currentFilter === group);
            tag.style.paddingRight = '8px';
            tag.onclick = function() {
                setActiveContactGroup(group);
            };
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '×';
            deleteBtn.style.cssText = [
                'color:' + (currentFilter === group ? 'rgba(255,255,255,0.7)' : '#ccc'),
                'font-size:13px',
                'cursor:pointer',
                'padding-bottom:2px',
                'font-family:Arial,sans-serif',
                'transition:color 0.2s'
            ].join(';');
            deleteBtn.onmouseover = function() {
                this.style.color = currentFilter === group ? '#fff' : '#ff4d4f';
            };
            deleteBtn.onmouseout = function() {
                this.style.color = currentFilter === group ? 'rgba(255,255,255,0.7)' : '#ccc';
            };
            deleteBtn.onclick = function(evt) {
                evt.stopPropagation();
                deleteContactGroup(index);
            };
            tag.appendChild(deleteBtn);
            container.appendChild(tag);
        });
        const addTag = document.createElement('button');
        addTag.type = 'button';
        addTag.style.cssText = 'appearance:none; outline:none; background:#fafafa; padding:4px 14px; border-radius:16px; font-size:12px; color:#999; border:1px dashed #ddd; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;';
        addTag.innerHTML = '+';
        addTag.onmouseover = () => addTag.style.background = '#f0f0f0';
        addTag.onmouseout = () => addTag.style.background = '#fafafa';
        addTag.onclick = addContactGroup;
        container.appendChild(addTag);
    }
    async function setActiveContactGroup(group) {
        activeContactGroupFilter = group && group !== 'ALL' && contactGroups.includes(group) ? group : 'ALL';
        await syncContactGroupFilterAndList();
    }
    async function deleteContactGroup(index) {
        const deletedGroup = contactGroups[index];
        if (deletedGroup === undefined) return;
        contactGroups.splice(index, 1);
        await localforage.setItem('miffy_contact_groups', contactGroups);
        if (activeContactGroupFilter === deletedGroup) {
            activeContactGroupFilter = 'ALL';
        }
        await syncContactGroupFilterAndList();
    }
    async function addContactGroup() {
        const newGroup = await window.showMiniPrompt('请输入新分组名称：', '');
        if (newGroup && newGroup.trim() !== '') {
            const normalizedName = newGroup.trim();
            const existingGroup = contactGroups.find(function(group) {
                return String(group).toLowerCase() === normalizedName.toLowerCase();
            });
            if (existingGroup) {
                activeContactGroupFilter = existingGroup;
            } else {
                contactGroups.push(normalizedName);
                activeContactGroupFilter = normalizedName;
                await localforage.setItem('miffy_contact_groups', contactGroups);
            }
            await syncContactGroupFilterAndList();
        }
    }
    window.getActiveContactGroupFilter = getActiveContactGroupFilter;
    // 初始渲染分组
    initContactGroups();
    // ====== 面具预设功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const maskDb = new Dexie("miniPhoneMaskDB");
    maskDb.version(1).stores({ presets: 'id' }); // id 为主键，后续字段自动入库
    let tempMaskAvatarBase64 = '';
