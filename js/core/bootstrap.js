const imgDb = new Dexie("miniPhoneImagesDB");
imgDb.version(1).stores({ images: 'id, src' });

// 修复：whitePixel 是全局通用的 1x1 透明占位图，用于图标/头像未加载时的默认值，防止出现 ReferenceError
const whitePixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// ====== 资产钱包持久化数据库 (Dexie.js + IndexedDB) ======
const walletDb = new Dexie("miniPhoneWalletDB");
walletDb.version(1).stores({
    kv: 'key',           // 键值对存储（余额等标量数据）
    bankCards: '++id',   // 银行卡列表
    bills: '++id'        // 账单记录
});

// 初始化钱包数据（页面加载时从 IndexedDB 恢复）
async function initWalletData() {
    // 恢复余额
    try {
        const balRecord = await walletDb.kv.get('walletBalance');
        if (balRecord && balRecord.value !== undefined) {
            const el = document.getElementById('text-wallet-bal');
            if (el) el.textContent = parseFloat(balRecord.value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } catch(e) { console.error("恢复余额失败", e); }

    // 恢复银行卡
    try {
        const cards = await walletDb.bankCards.toArray();
        if (cards.length > 0) {
            const emptyEl = document.getElementById('bank-card-empty');
            if (emptyEl) emptyEl.style.display = 'none';
            const list = document.getElementById('bank-card-list');
            if (list) {
                cards.forEach(card => {
                    const cardEl = _buildBankCardElement(card);
                    list.appendChild(cardEl);
                });
            }
        }
    } catch(e) { console.error("恢复银行卡失败", e); }

    // 恢复账单
    try {
        const bills = await walletDb.bills.orderBy('id').reverse().toArray();
        _billList = bills;
        _renderBills();
    } catch(e) { console.error("恢复账单失败", e); }
}

// ====== 辅助：根据存储的数据对象构建银行卡 DOM 元素 ======
function _buildBankCardElement(cardData) {
    var balanceStr = parseFloat(cardData.balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var cardId = cardData.domId || ('bank-card-' + (cardData.id || Date.now()));
    var dbId = cardData.id || '';
    var color = cardData.color || 'linear-gradient(135deg,#667eea,#764ba2)';
    var name = cardData.name || '银行卡';
    var type = cardData.type || '储蓄卡';
    var cardNumber = cardData.cardNumber || '**** **** **** 0000';
    var html = '<div class="sim-bank-card" id="' + cardId + '" data-db-id="' + dbId + '" style="background:' + color + ';">' +
        '<div class="sim-card-delete-btn" onclick="deleteBankCard(\'' + cardId + '\')">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</div>' +
        '<div class="sim-card-top">' +
        '<div class="sim-card-bank-name">' + name + '</div>' +
        '<div class="sim-card-type-badge">' + type + '</div>' +
        '</div>' +
        '<div class="sim-card-chip"></div>' +
        '<div class="sim-card-number">' + cardNumber + '</div>' +
        '<div class="sim-card-bottom">' +
        '<div>' +
        '<div class="sim-card-balance-label">当前余额</div>' +
        '<div class="sim-card-balance-amount">¥ ' + balanceStr + '</div>' +
        '</div>' +
        '<div class="sim-card-logo">' +
        '<div class="sim-card-logo-circle" style="background:#eb001b;"></div>' +
        '<div class="sim-card-logo-circle" style="background:#f79e1b; margin-left:-8px;"></div>' +
        '</div>' +
        '</div>' +
        '</div>';
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.firstChild;
}
const appIconNames = ["小说", "日记", "购物", "论坛", "WeChat", "纪念日", "遇恋", "世界书", "占位1", "闲鱼", "查手机", "情侣空间", "信息", "占位3", "占位4", "占位5", "主题", "设置"];
const themeIconGrid = document.getElementById('icon-theme-grid');
const mainIcons = document.querySelectorAll('.icon-img img, .dock-icon img');
const headerSubtitleMap = {
    '主题': 'THEME',
    '设置': 'SETTINGS',
    '世界书': 'WORLDBOOK',
    '消息': 'MESSAGES',
    '联系人': 'CONTACTS',
    '个人中心': 'PROFILE',
    '资产钱包': 'WALLET',
    '银行卡': 'BANK CARD',
    '面具预设': 'MASK PRESETS',
    '表情包库': 'STICKER LIBRARY',
    '信息': 'INBOX',
    '首页': 'HOME',
    '聊天详情': 'CHAT DETAIL',
    '发朋友圈': 'MOMENTS',
    '理财': 'FINANCE',
    '遇恋': 'MEETLOVE',
    '匹配': 'MATCH',
    '线下': 'OFFLINE',
    '大厅设置': 'HALL SETTINGS',
    '线下设置': 'OFFLINE SETTINGS'
};

function resolveHeaderSubtitle(rawText, isOfflineTitle) {
    var raw = (rawText || '').trim();
    var compact = raw.replace(/\s+/g, '');
    if (!compact) return isOfflineTitle ? 'OFFLINE' : 'SECTION';
    if (headerSubtitleMap[compact]) return headerSubtitleMap[compact];
    var latinTokens = compact.match(/[A-Za-z0-9]+/g);
    if (latinTokens && latinTokens.length) {
        return latinTokens.join(' ').toUpperCase();
    }
    return isOfflineTitle ? 'OFFLINE' : 'SECTION';
}

function refreshHeaderSubtitles() {
    document.querySelectorAll('.app-title, .offline-header-title').forEach(function(el) {
        var isOfflineTitle = el.classList.contains('offline-header-title');
        var subtitle = resolveHeaderSubtitle(el.textContent || '', isOfflineTitle);
        el.setAttribute('data-subtitle', subtitle);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    refreshHeaderSubtitles();
    if (!window.MutationObserver) return;
    var timer = null;
    var observer = new MutationObserver(function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(refreshHeaderSubtitles, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
});

    // 修复电脑端：打开任意全屏应用前，先关闭其他所有全屏应用，防止多个 full-app-page 同时可见互相遮挡
    function openApp(appId) {
        document.querySelectorAll('.full-app-page').forEach(el => {
            if (el.id !== appId) el.style.display = 'none';
        });
        const app = document.getElementById(appId);
        if (app) app.style.display = 'flex';
    }

    const menu = document.getElementById('menu-panel');
    const swiper = new Swiper('.mySwiper', {
        loop: false,
        resistanceRatio: 0, // 减少边缘回弹的计算阻力
        observer: true,     // 开启 DOM 变动监听
        observeParents: true,
        on: {
            touchStart: function() { menu.style.display = 'none'; },
            slideChange: function() { menu.style.display = 'none'; }
        }
    });
    let currentTargetId = null;
    function openImageMenuAtEvent(e, targetId) {
        const phoneScreen = document.querySelector('.phone-screen');
        currentTargetId = targetId;
        if (!menu || !phoneScreen) return;
        const screenRect = phoneScreen.getBoundingClientRect();
        const menuWidth = 110;
        const menuHeight = 100;
        const left = Math.max(0, Math.min(e.clientX - screenRect.left, screenRect.width - menuWidth));
        const top = Math.max(0, Math.min(e.clientY - screenRect.top, screenRect.height - menuHeight));
        menu.style.display = 'flex';
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }
    // 更新时间与日期
    function updateDateTime() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const ct = document.getElementById('current-time');
        if(ct) ct.textContent = timeStr;
        const bc = document.getElementById('big-clock');
        if(bc) bc.textContent = timeStr;
        const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
        const week = ['周日','周一','周二','周三','周四','周五','周六'][now.getDay()];
        const weekF = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
        const rd = document.getElementById('real-date');
if(rd) rd.textContent = `${y%100}-${m}-${d}`;
const rw = document.getElementById('real-week');
if(rw) rw.textContent = week;
        const sd = document.getElementById('sub-date');
        if(sd) sd.textContent = `${m}-${d} ${week}`;
        const rt = document.getElementById('rect-time');
        if(rt) rt.textContent = timeStr;
        const rw2 = document.getElementById('rect-week');
        if(rw2) rw2.textContent = weekF;
        const rfd = document.getElementById('rect-full-date');
        if(rfd) rfd.textContent = `${d} / ${m} / ${y}`;
    }
    setInterval(updateDateTime, 1000); updateDateTime();
    // 电量
    if(navigator.getBattery) navigator.getBattery().then(b => {
        const update = () => {
            const bl = document.getElementById('battery-level');
            if(bl) bl.style.width = (b.level * 100) + '%';
        }
        update(); b.addEventListener('levelchange', update);
    });
    // 交互与持久化 (图片更换菜单逻辑)
    document.querySelectorAll('.editable').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openImageMenuAtEvent(e, el.id);
        });
    });
    function getEditableTextStorageKey(el, fallbackIndex) {
        if (!el) return null;
        if (el.id) return 'miffy_text_' + el.id;
        if (!el.dataset.editKey) {
            const idx = (fallbackIndex !== undefined && fallbackIndex !== null) ? fallbackIndex : 0;
            el.dataset.editKey = 'auto_' + idx;
        }
        return 'miffy_text_' + el.dataset.editKey;
    }
    // 交互与持久化 (文字)
    document.querySelectorAll('.editable-text').forEach((el, idx) => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newText = prompt('请输入新内容:', el.textContent);
            if(newText !== null && newText.trim() !== "") {
                el.textContent = newText;
                const textKey = getEditableTextStorageKey(el, idx);
                if (textKey) await localforage.setItem(textKey, newText);
            }
        });
    });
    document.addEventListener('click', (e) => {
        // 只有点击非 editable 元素时才关闭菜单（防止点击 editable 后菜单立即被关闭）
        if (!e.target.closest('.editable') && !e.target.closest('#menu-panel')) {
            menu.style.display = 'none';
        }
    });
    function changeImage(type) {
        if(type === 'url') {
            const url = prompt('请输入图片链接:');
            if(url) applyImage(currentTargetId, url);
        } else if(type === 'file') {
            const fileInput = document.getElementById('file-input');
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            // 修改：使用 async 和 compressImageBase64 修复 iOS 更换大图导致页面崩溃重置的问题
            reader.onload = async (e) => {
                const compressedBase64 = await compressImageBase64(e.target.result, 1080, 0.8);
                applyImage(currentTargetId, compressedBase64);
                fileInput.value = ''; 
            };
            reader.readAsDataURL(file);
        }
    }
    async function applyImage(id, src) {
        // 特殊处理：角色主页封面背景更换
        // 修复：不能先设置 backgroundImage 再清空 background，否则 background 简写属性会把 backgroundImage 也一起清掉
        if (id === 'rp-cover-bg-img') {
            const coverBg = document.getElementById('rp-cover-bg');
            if (coverBg) {
                coverBg.style.cssText = `background-image: url(${src}); background-size: cover; background-position: center; background-color: transparent;`;
            }
            // 修复：封面背景按当前联系人ID存储，防止不同联系人互相覆盖
            const coverBgKey = activeChatContact ? ('rp-cover-bg-img-' + activeChatContact.id) : 'rp-cover-bg-img';
            try {
                await imgDb.images.put({ id: coverBgKey, src: src });
            } catch (e) {
                console.error("图片存入IndexedDB失败", e);
            }
            return;
        }
        const target = document.getElementById(id);
        if (!target) return;
        const img = target.querySelector('img');
        if(img) {
            img.style.content = "normal";
            img.src = src;
            try {
                await imgDb.images.put({ id: id, src: src });
            } catch (e) {
                console.error("图片存入IndexedDB失败", e);
            }
        }
    }
async function initThemeIcons() {
    if (!themeIconGrid) return;
    themeIconGrid.innerHTML = '';
    // 性能优化：一次性批量查询所有主题图标的 IndexedDB 记录，避免 N 次顺序 await
    const themeIds = Array.from({ length: mainIcons.length }, (_, i) => 'theme-icon-' + i);
    const themeRecords = await imgDb.images.where('id').anyOf(themeIds).toArray();
    const themeMap = {};
    themeRecords.forEach(r => { themeMap[r.id] = r.src; });

    for (let index = 0; index < mainIcons.length; index++) {
        const mainImg = mainIcons[index];
        const id = 'theme-icon-' + index;
        const container = document.createElement('div');
        container.className = 'theme-icon-container';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'theme-icon-item editable';
        itemDiv.id = id;
        const img = document.createElement('img');
        const saved = themeMap[id] || null;
        img.src = saved || whitePixel;
        itemDiv.appendChild(img);
        container.appendChild(itemDiv);
        const label = document.createElement('span');
        label.className = 'theme-icon-label';
        label.textContent = appIconNames[index] || "应用";
        container.appendChild(label);
        themeIconGrid.appendChild(container);
        mainIcons[index].src = img.src;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    mainIcons[index].src = img.src;
                }
            });
        });
        observer.observe(img, { attributes: true });
        itemDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            openImageMenuAtEvent(e, itemDiv.id);
        });
    }
}
window.addEventListener('DOMContentLoaded', async () => {
        // 修复电脑端加载时闪烁/延伸：页面加载完成后立即显示手机壳，不等待 DB
        const shell = document.querySelector('.phone-shell');
        if (shell) {
            requestAnimationFrame(() => { shell.style.opacity = '1'; });
        }

        // ===== 性能优化：批量并行读取所有持久化数据，消除顺序 await 阻塞 =====

        // 1. 并行读取所有 editable-text 的 key
        const textElements = Array.from(document.querySelectorAll('.editable-text'));
        const textKeys = textElements.map((el, idx) => getEditableTextStorageKey(el, idx));
        const textValues = await Promise.all(textKeys.map(k => localforage.getItem(k)));
        textElements.forEach((el, i) => {
            if (textValues[i]) el.textContent = textValues[i];
        });

        // 2. 并行读取所有 editable 图片（批量 IndexedDB 查询）
        const editables = document.querySelectorAll('.editable');
        const editableIds = Array.from(editables)
            .filter(el => el.id && el.querySelector('img'))
            .map(el => el.id);
        // 一次性批量获取所有图片记录
        const imgRecords = await imgDb.images.where('id').anyOf(editableIds).toArray();
        const imgMap = {};
        imgRecords.forEach(r => { imgMap[r.id] = r.src; });
        editables.forEach(el => {
            if (!el.id) return;
            const img = el.querySelector('img');
            if (img) {
                img.src = imgMap[el.id] || whitePixel;
            }
        });
        renderWorldbooks();
        await initThemeIcons();

        // 3. 并行读取字体/粗细/大小设置
        const [savedFont, savedWeight, savedSize] = await Promise.all([
            localforage.getItem('miffy_global_font'),
            localforage.getItem('miffy_global_font_weight'),
            localforage.getItem('miffy_global_font_size')
        ]);
        if (savedFont) {
            currentFontData = savedFont;
            const fontInput = document.getElementById('font-url-input');
            if (fontInput && savedFont.startsWith('http')) {
                fontInput.value = savedFont;
            }
        }
        if (savedWeight) {
            currentFontWeight = savedWeight;
            const weightSlider = document.getElementById('font-weight-slider');
            const weightVal = document.getElementById('font-weight-val');
            if (weightSlider) weightSlider.value = savedWeight;
            if (weightVal) weightVal.textContent = savedWeight;
        }
        if (savedSize) {
            currentFontSize = savedSize;
            const sizeSlider = document.getElementById('font-size-slider');
            const sizeVal = document.getElementById('font-size-val');
            if (sizeSlider) sizeSlider.value = savedSize;
            if (sizeVal) sizeVal.textContent = savedSize + 'px';
        }
        renderGlobalFont();

        // 4. 恢复 UI 缩放（localforage 异步读取，覆盖 head 内脚本的 localStorage 尝试）
        const savedUiScale = await localforage.getItem('miffy_ui_scale');
        if (savedUiScale) {
            const scaleVal = parseFloat(savedUiScale);
            if (scaleVal && scaleVal >= 50 && scaleVal <= 150) {
                document.documentElement.style.zoom = scaleVal / 100;
                const slider = document.getElementById('ui-scale-slider');
                const display = document.getElementById('ui-scale-val');
                if (slider) slider.value = scaleVal;
                if (display) display.textContent = scaleVal + '%';
            }
        }
    });
    function setWallpaper(src) {
        const screen = document.querySelector('.phone-screen');
        if (src && !src.includes('via.placeholder.com')) {
            screen.style.background = `url(${src}) center/cover no-repeat`;
        } else {
            screen.style.background = '';
        }
    }
    const previewImg = document.querySelector('#wallpaper-preview img');
    if (previewImg) {
        new MutationObserver(async (mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    setWallpaper(previewImg.src);
                    // 修复：不保存占位图URL（via.placeholder.com）到IndexedDB
                    // 否则 restoreDefaultWallpaper() 重置时会把占位图URL写入数据库，
                    // 下次加载时会尝试将占位图设为壁纸，导致壁纸显示异常
                    if (previewImg.src && !previewImg.src.includes('via.placeholder.com')) {
                        try {
                            await imgDb.images.put({ id: 'wallpaper-preview', src: previewImg.src });
                        } catch (e) { console.error(e); }
                    }
                }
            }
        }).observe(previewImg, { attributes: true });
    }
    const themeBtn = document.getElementById('dock-btn-theme');
    if (themeBtn) {
        themeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('theme-app').style.display = 'flex';
        });
    }
    function closeThemeApp() {
        document.getElementById('theme-app').style.display = 'none';
    }
    async function restoreDefaultWallpaper() {
        try { await imgDb.images.delete('wallpaper-preview'); } catch(e){}
        if (previewImg) {
            previewImg.src = 'https://via.placeholder.com/300x600?text=Wallpaper';
        }
    }
    setTimeout(async () => {
        const record = await imgDb.images.get('wallpaper-preview');
        if (record && record.src) {
            setWallpaper(record.src);
            if (previewImg && previewImg.src !== record.src) {
                previewImg.src = record.src;
            }
        }
    }, 100);
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
    const wbBtn = document.getElementById('app-btn-worldbook');
    const wbApp = document.getElementById('worldbook-app');
    const wbEditor = document.getElementById('worldbook-editor');
    if(wbBtn) {
        wbBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openApp('worldbook-app');
            renderWorldbooks();
        });
    }
    function closeWorldbookApp() {
        wbApp.style.display = 'none';
    }
    function switchWbCategory(cat) {
        currentWbCategory = cat;
        document.getElementById('tab-global').className = cat === 'global' ? 'wb-tab active' : 'wb-tab';
        document.getElementById('tab-local').className = cat === 'local' ? 'wb-tab active' : 'wb-tab';
        renderWorldbooks();
    }
    async function renderWorldbooks() {
        const listContainer = document.getElementById('wb-list-container');
        listContainer.innerHTML = '';
        try {
            const items = await db.entries.where('category').equals(currentWbCategory).toArray();
            if(items.length === 0) {
                listContainer.innerHTML = '<div class="wb-empty">暂无世界书</div>';
                return;
            }
            const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
            items.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'wb-card';
                const pTagClass = `tag-${item.priority}`;
                const pTagText = item.priority === 'high' ? '高优先级' : (item.priority === 'medium' ? '中优先级' : '低优先级');
                const aTagClass = `tag-${item.activation}`;
                const aTagText = item.activation === 'always' ? '始终生效' : '关键词触发';
                let keywordHtml = '';
                if(item.activation === 'keyword' && item.keywords) {
                    keywordHtml = `<div class="wb-tag" style="background:#f5f5f5; color:#777; font-weight:normal;"> ${item.keywords}</div>`;
                }
                card.innerHTML = `
                    <div class="wb-card-title">${item.title}</div>
                    <div class="wb-card-tags">
                        <div class="wb-tag ${aTagClass}">${aTagText}</div>
                        <div class="wb-tag ${pTagClass}">${pTagText}</div>
                        ${keywordHtml}
                    </div>
                    <div class="wb-card-content">${item.content}</div>
                    <div class="wb-card-actions">
                        <div class="wb-action-icon" onclick="editWorldbook(${item.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div class="wb-action-icon" onclick="deleteWorldbook(${item.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) { listContainer.innerHTML = '<div class="wb-empty">暂无世界书</div>'; }
    }
    function toggleKeywordInput() {
        const isKeyword = document.querySelector('input[name="wb-activation"]:checked').value === 'keyword';
        document.getElementById('wb-keywords-group').style.display = isKeyword ? 'block' : 'none';
    }
    async function openWorldbookEditor(id = null) {
        wbEditor.style.display = 'flex';
        const titleEl = document.getElementById('wb-editor-title');
        if (id) {
            titleEl.textContent = '编辑世界书';
            const item = await db.entries.get(id);
            if(item) {
                document.getElementById('wb-id').value = item.id;
                document.getElementById('wb-title').value = item.title;
                document.querySelector(`input[name="wb-category"][value="${item.category}"]`).checked = true;
                document.querySelector(`input[name="wb-activation"][value="${item.activation}"]`).checked = true;
                document.getElementById('wb-keywords').value = item.keywords || '';
                document.getElementById('wb-priority').value = item.priority;
                document.getElementById('wb-content').value = item.content;
            }
        } else {
            titleEl.textContent = '新建世界书';
            document.getElementById('wb-id').value = '';
            document.getElementById('wb-title').value = '';
            document.querySelector(`input[name="wb-category"][value="${currentWbCategory}"]`).checked = true;
            document.querySelector(`input[name="wb-activation"][value="always"]`).checked = true;
            document.getElementById('wb-keywords').value = '';
            document.getElementById('wb-priority').value = 'medium';
            document.getElementById('wb-content').value = '';
        }
        toggleKeywordInput();
    }
    function closeWorldbookEditor() { wbEditor.style.display = 'none'; }
    async function saveWorldbook() {
        const id = document.getElementById('wb-id').value;
        const title = document.getElementById('wb-title').value.trim();
        const category = document.querySelector('input[name="wb-category"]:checked').value;
        const activation = document.querySelector('input[name="wb-activation"]:checked').value;
        const keywords = document.getElementById('wb-keywords').value.trim();
        const priority = document.getElementById('wb-priority').value;
        const content = document.getElementById('wb-content').value.trim();
        if (!title || !content) return alert('标题和内容不能为空');
        const data = { title, category, activation, keywords, priority, content, updatedAt: new Date().getTime() };
        try {
            if (id) await db.entries.update(parseInt(id), data);
            else { data.createdAt = new Date().getTime(); await db.entries.add(data); }
            closeWorldbookEditor();
            if (currentWbCategory !== category) switchWbCategory(category);
            else renderWorldbooks();
        } catch (error) { alert('保存失败'); }
    }
    async function editWorldbook(id) { await openWorldbookEditor(id); }
    async function deleteWorldbook(id) {
        if (confirm('确定要永久删除这条世界书设定吗？')) {
            try { await db.entries.delete(id); renderWorldbooks(); } catch (error) { alert('删除失败'); }
        }
    }
    const wechatBtn = document.getElementById('app-btn-wechat');
    if(wechatBtn) {
        wechatBtn.onclick = (e) => { 
            e.stopPropagation(); 
            openApp('wechat-app');
        };
    }
    function closeWechatApp() { document.getElementById('wechat-app').style.display = 'none'; }
    function switchWechatTab(tabName) {
        document.querySelectorAll('.wechat-tab-page').forEach(page => page.classList.remove('active'));
        document.getElementById('wechat-tab-' + tabName).classList.add('active');
        const btns = document.querySelectorAll('.wechat-dock-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        const indexMap = {'msg': 0, 'contacts': 1, 'moments': 2, 'me': 3};
        btns[indexMap[tabName]].classList.add('active');
        if (tabName === 'contacts' && typeof renderContacts === 'function') {
            renderContacts();
        }
    }
    // 新增：面具预设页面逻辑
    function openMaskPresets() {
        document.getElementById('mask-presets-app').style.display = 'flex';
        renderMaskPresets();
    }
// ====== 资产钱包页面显示逻辑 ======
    function openWalletApp() {
        document.getElementById('wallet-app').style.display = 'flex';
    }
    function closeWalletApp() {
        document.getElementById('wallet-app').style.display = 'none';
    }

// ====== 银行卡页面逻辑 ======
    function openBankCardApp() {
        document.getElementById('bank-card-app').style.display = 'flex';
    }
    function closeBankCardApp() {
        document.getElementById('bank-card-app').style.display = 'none';
        // 退出管理模式
        var list = document.getElementById('bank-card-list');
        if (list) list.classList.remove('bank-card-manage-mode');
        var btn = document.getElementById('bank-card-manage-btn');
        if (btn) btn.querySelector('span').textContent = '管理';
    }

    // 管理模式切换
    function toggleBankCardManage() {
        var list = document.getElementById('bank-card-list');
        var btn = document.getElementById('bank-card-manage-btn');
        var isManage = list.classList.toggle('bank-card-manage-mode');
        btn.querySelector('span').textContent = isManage ? '完成' : '管理';
    }

    // 打开添加银行卡弹窗
    function openAddBankCardModal() {
        var modal = document.getElementById('add-bank-card-modal');
        modal.style.display = 'flex';
        setTimeout(function() {
            document.getElementById('add-bank-card-sheet').style.transform = 'translateY(0)';
        }, 10);
        // 重置表单
        document.getElementById('bank-card-name-input').value = '';
        document.getElementById('bank-card-balance-input').value = '';
        // 重置类型选择
        document.querySelectorAll('.bank-type-btn').forEach(function(btn) { btn.classList.remove('active'); });
        document.querySelector('.bank-type-btn').classList.add('active');
        window._selectedBankCardType = '储蓄卡';
        // 重置颜色选择
        document.querySelectorAll('.bank-color-dot').forEach(function(dot) { dot.classList.remove('active'); });
        document.querySelector('.bank-color-dot').classList.add('active');
        window._selectedBankCardColor = 'linear-gradient(135deg,#667eea,#764ba2)';
    }

    // 关闭添加银行卡弹窗
    function closeAddBankCardModal() {
        document.getElementById('add-bank-card-sheet').style.transform = 'translateY(100%)';
        setTimeout(function() {
            document.getElementById('add-bank-card-modal').style.display = 'none';
        }, 320);
    }

    // 选择银行卡类型
    function selectBankCardType(el, type) {
        document.querySelectorAll('.bank-type-btn').forEach(function(btn) { btn.classList.remove('active'); });
        el.classList.add('active');
        window._selectedBankCardType = type;
    }

    // 选择银行卡颜色
    function selectBankCardColor(el, color) {
        document.querySelectorAll('.bank-color-dot').forEach(function(dot) { dot.classList.remove('active'); });
        el.classList.add('active');
        window._selectedBankCardColor = color;
    }

    // 生成随机卡号（最后四位）
    function _genCardNumber() {
        var groups = [];
        for (var i = 0; i < 4; i++) {
            if (i < 3) {
                groups.push('****');
            } else {
                groups.push(String(Math.floor(Math.random() * 9000) + 1000));
            }
        }
        return groups.join(' ');
    }

    // 确认添加银行卡 (持久化到 walletDb)
    async function confirmAddBankCard() {
        var name = document.getElementById('bank-card-name-input').value.trim();
        var balance = document.getElementById('bank-card-balance-input').value.trim();
        var type = window._selectedBankCardType || '储蓄卡';
        var color = window._selectedBankCardColor || 'linear-gradient(135deg,#667eea,#764ba2)';

        if (!name) {
            document.getElementById('bank-card-name-input').focus();
            return;
        }

        var balanceNum = parseFloat(balance) || 0;
        var balanceStr = balanceNum.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var cardNumber = _genCardNumber();

        // 隐藏空状态提示
        var emptyEl = document.getElementById('bank-card-empty');
        if (emptyEl) emptyEl.style.display = 'none';

        // 持久化银行卡到 IndexedDB
        var cardDbId;
        try {
            cardDbId = await walletDb.bankCards.add({
                name: name,
                type: type,
                color: color,
                balance: balanceNum,
                cardNumber: cardNumber
            });
        } catch(e) { console.error("银行卡持久化失败", e); }

        // 创建仿真银行卡 HTML
        var cardId = 'bank-card-' + (cardDbId || Date.now());
        var cardHtml = '<div class="sim-bank-card" id="' + cardId + '" data-db-id="' + (cardDbId || '') + '" style="background:' + color + ';">' +
            '<div class="sim-card-delete-btn" onclick="deleteBankCard(\'' + cardId + '\')">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</div>' +
            '<div class="sim-card-top">' +
            '<div class="sim-card-bank-name">' + name + '</div>' +
            '<div class="sim-card-type-badge">' + type + '</div>' +
            '</div>' +
            '<div class="sim-card-chip"></div>' +
            '<div class="sim-card-number">' + cardNumber + '</div>' +
            '<div class="sim-card-bottom">' +
            '<div>' +
            '<div class="sim-card-balance-label">当前余额</div>' +
            '<div class="sim-card-balance-amount">¥ ' + balanceStr + '</div>' +
            '</div>' +
            '<div class="sim-card-logo">' +
            '<div class="sim-card-logo-circle" style="background:#eb001b;"></div>' +
            '<div class="sim-card-logo-circle" style="background:#f79e1b; margin-left:-8px;"></div>' +
            '</div>' +
            '</div>' +
            '</div>';

        var list = document.getElementById('bank-card-list');
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHtml;
        list.appendChild(tempDiv.firstChild);

        // 记录账单
        _addBill('bank_card', '添加银行卡', balanceNum, false, name + ' · ' + type);

        closeAddBankCardModal();
    }

    // 删除银行卡 (同步从 walletDb 删除)
    function deleteBankCard(cardId) {
        var card = document.getElementById(cardId);
        if (card) {
            // 从 IndexedDB 删除
            var dbId = card.getAttribute('data-db-id');
            if (dbId) {
                walletDb.bankCards.delete(parseInt(dbId)).catch(function(e) { console.error("删除银行卡失败", e); });
            }
            card.style.transition = 'opacity 0.25s, transform 0.25s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(function() {
                card.remove();
                // 如果没有卡了，显示空状态
                var list = document.getElementById('bank-card-list');
                var cards = list.querySelectorAll('.sim-bank-card');
                if (cards.length === 0) {
                    var emptyEl = document.getElementById('bank-card-empty');
                    if (emptyEl) emptyEl.style.display = 'flex';
                }
            }, 250);
        }
    }
    function closeMaskPresets() {
        document.getElementById('mask-presets-app').style.display = 'none';
    }
// 切换主题页折叠项
    function toggleThemeSection(id) {
        const item = document.getElementById(id);
        const isActive = item.classList.contains('active');
        // 可选：关闭其他已展开的项
        document.querySelectorAll('.theme-accordion-item').forEach(el => el.classList.remove('active'));
        // 切换当前项
        if (!isActive) item.classList.add('active');
    }
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
            '    height: 32px;',
            '    border-radius: 50%;',
            '    background: transparent;',
            '    box-shadow: none;',
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
        document.documentElement.style.zoom = (val / 100);
        const display = document.getElementById('ui-scale-val');
        if (display) display.textContent = val + '%';
        localforage.setItem('miffy_ui_scale', val);
    }
    function restoreDefaultUiScale() {
        const defaultVal = 100;
        document.documentElement.style.zoom = 1;
        const slider = document.getElementById('ui-scale-slider');
        if (slider) slider.value = defaultVal;
        const display = document.getElementById('ui-scale-val');
        if (display) display.textContent = defaultVal + '%';
        localforage.setItem('miffy_ui_scale', defaultVal);
    }
    // 联系人分组增删逻辑
    let contactGroups = [];
    async function initContactGroups() {
        const savedGroups = await localforage.getItem('miffy_contact_groups');
        if (savedGroups && Array.isArray(savedGroups)) {
            contactGroups = savedGroups;
        } else {
            contactGroups = ['Lover', 'Friend', 'Family'];
            await localforage.setItem('miffy_contact_groups', contactGroups);
        }
        renderContactGroups();
    }
    function renderContactGroups() {
        const container = document.getElementById('contact-group-container');
        if (!container) return;
        container.innerHTML = '';
        // 渲染固定的 ALL 标签 (极小尺寸、大圆角)
        const allTag = document.createElement('div');
        allTag.style.cssText = 'background: #fff; padding: 4px 12px; border-radius: 16px; font-size: 11px; color: #555; box-shadow: 0 1px 6px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; display: flex; align-items: center; letter-spacing: 0.5px;';
        allTag.textContent = 'ALL';
        container.appendChild(allTag);
        // 渲染动态分组标签
        contactGroups.forEach((group, index) => {
            const tag = document.createElement('div');
            tag.style.cssText = 'background: #fff; padding: 4px 8px 4px 12px; border-radius: 16px; font-size: 11px; color: #555; box-shadow: 0 1px 6px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 5px; letter-spacing: 0.5px;';
            tag.innerHTML = `
                ${group} 
                <span style="color: #ccc; font-size: 13px; cursor: pointer; padding-bottom: 2px; font-family: Arial, sans-serif; transition: color 0.2s;" 
                      onmouseover="this.style.color='#ff4d4f'" 
                      onmouseout="this.style.color='#ccc'"
                      onclick="deleteContactGroup(${index})">×</span>
            `;
            container.appendChild(tag);
        });
        // 渲染添加「+」按钮
        const addTag = document.createElement('div');
        addTag.style.cssText = 'background: #fafafa; padding: 4px 14px; border-radius: 16px; font-size: 12px; color: #999; border: 1px dashed #ddd; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;';
        addTag.innerHTML = '+';
        addTag.onmouseover = () => addTag.style.background = '#f0f0f0';
        addTag.onmouseout = () => addTag.style.background = '#fafafa';
        addTag.onclick = addContactGroup;
        container.appendChild(addTag);
    }
    async function deleteContactGroup(index) {
        contactGroups.splice(index, 1);
        await localforage.setItem('miffy_contact_groups', contactGroups);
        renderContactGroups();
    }
    async function addContactGroup() {
        const newGroup = prompt('请输入新分组名称:');
        if (newGroup && newGroup.trim() !== '') {
            contactGroups.push(newGroup.trim());
            await localforage.setItem('miffy_contact_groups', contactGroups);
            renderContactGroups();
        }
    }
    // 初始渲染分组
    initContactGroups();
    // ====== 面具预设功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const maskDb = new Dexie("miniPhoneMaskDB");
    maskDb.version(1).stores({ presets: 'id' }); // id 为主键，后续字段自动入库
    let tempMaskAvatarBase64 = '';
    async function renderMaskPresets() {
        const listContainer = document.getElementById('mask-list-container');
        listContainer.innerHTML = '';
        try {
            const presets = await maskDb.presets.toArray();
            if (presets.length === 0) {
                listContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 40px;">
                        <div class="wb-empty" style="margin-top: 0;">暂无保存的面具预设</div>
                        <div style="font-size: 11px; color: #ccc; margin-top: 10px; text-align: center;">面具可用于快速切换用户设定</div>
                    </div>
                `;
            } else {
                presets.forEach(p => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: #fff; border-radius: 18px; padding: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;';
                    // 头像显示逻辑
                    let avatarHtml = '';
                    if (p.avatar) {
                        avatarHtml = `<img src="${p.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    } else {
                        avatarHtml = `<span style="color: #f0f0f0; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif;">Me</span>`;
                    }
                    item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; overflow: hidden;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: #fdfdfd; border: 1px solid #f0f0f0; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                                ${avatarHtml}
                            </div>
                            <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px;">
                                <div style="font-size: 15px; font-weight: 600; color: #333;">${p.name || '未命名'} <span style="font-size: 11px; color: #999; font-weight: normal; margin-left: 4px; background: #f5f5f5; padding: 2px 6px; border-radius: 8px;">${p.gender || '女'}</span></div>
                                <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.detail || '暂无详细设定'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; flex-shrink: 0; margin-left: 15px;">
                            <div class="wb-action-icon" onclick="openMaskEditor('${p.id}')">
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>
                            <div class="wb-action-icon" onclick="deleteMaskPreset('${p.id}')">
                                <!-- 修改删除按钮不标红，使用 currentColor 与编辑图标颜色保持一致 -->
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </div>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        } catch (e) {
            listContainer.innerHTML = '<div style="color:#999; font-size:12px; text-align:center; margin-top:20px;">加载面具配置失败</div>';
            console.error("加载面具配置失败", e);
        }
    }
    async function openMaskEditor(id = null) {
        const modal = document.getElementById('mask-editor-modal');
        const title = document.getElementById('mask-editor-title');
        const idInput = document.getElementById('mask-edit-id');
        const nameInput = document.getElementById('mask-name');
        const detailInput = document.getElementById('mask-detail');
        const avatarPreview = document.getElementById('mask-avatar-preview');
        const avatarText = document.getElementById('mask-avatar-text');
        modal.style.display = 'flex';
        tempMaskAvatarBase64 = '';
        if (id) {
            title.textContent = '编辑面具设定';
            const p = await maskDb.presets.get(id);
            if (p) {
                idInput.value = p.id;
                nameInput.value = p.name || '';
                detailInput.value = p.detail || '';
                document.querySelector(`input[name="mask-gender"][value="${p.gender || '女'}"]`).checked = true;
                if (p.avatar) {
                    tempMaskAvatarBase64 = p.avatar;
                    avatarPreview.src = p.avatar;
                    avatarPreview.style.display = 'block';
                    avatarText.style.display = 'none';
                } else {
                    avatarPreview.style.display = 'none';
                    avatarText.style.display = 'block';
                }
            }
        } else {
            title.textContent = '添加面具设定';
            idInput.value = '';
            nameInput.value = '';
            detailInput.value = '';
            document.querySelector(`input[name="mask-gender"][value="女"]`).checked = true;
            avatarPreview.style.display = 'none';
            avatarText.style.display = 'block';
        }
    }
    function closeMaskEditor() {
        document.getElementById('mask-editor-modal').style.display = 'none';
        document.getElementById('mask-avatar-input').value = '';
    }
    function handleMaskAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            tempMaskAvatarBase64 = e.target.result;
            const preview = document.getElementById('mask-avatar-preview');
            preview.src = tempMaskAvatarBase64;
            preview.style.display = 'block';
            document.getElementById('mask-avatar-text').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    async function saveMaskPreset() {
        const id = document.getElementById('mask-edit-id').value;
        const name = document.getElementById('mask-name').value.trim();
        const gender = document.querySelector('input[name="mask-gender"]:checked').value;
        const detail = document.getElementById('mask-detail').value.trim();
        if (!name) return alert('请输入用户姓名');
        const data = {
            id: id || Date.now().toString(),
            name,
            gender,
            detail,
            avatar: tempMaskAvatarBase64
        };
        try {
            await maskDb.presets.put(data);
            closeMaskEditor();
            renderMaskPresets();
        } catch (e) {
            alert('保存失败');
            console.error(e);
        }
    }
    async function deleteMaskPreset(id) {
        if (confirm('确定要永久删除这个面具设定吗？')) {
            try {
                await maskDb.presets.delete(id);
                renderMaskPresets();
            } catch (e) {
                alert('删除失败');
                console.error(e);
            }
        }
    }
    // ====== 表情包库功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const emoDb = new Dexie("miniPhoneEmoDB");
    emoDb.version(1).stores({
        groups: 'id, name',
        emoticons: '++id, groupId, desc, url'
    });
    
    let currentEmoGroupId = 'default';
    let emoManageMode = false;
    let selectedEmoIds = new Set();

    async function initEmoticonDB() {
        const defaultGroup = await emoDb.groups.get('default');
        if (!defaultGroup) {
            await emoDb.groups.add({ id: 'default', name: '默认' });
        }
    }

    async function openEmoticonApp() {
        await initEmoticonDB();
        document.getElementById('emoticon-app').style.display = 'flex';
        emoManageMode = false;
        document.getElementById('emoticon-manage-bar').style.display = 'none';
        selectedEmoIds.clear();
        await renderEmoGroups();
    }

    function closeEmoticonApp() {
        document.getElementById('emoticon-app').style.display = 'none';
    }

    async function renderEmoGroups() {
        const container = document.getElementById('emoticon-group-container');
        container.innerHTML = '';
        const groups = await emoDb.groups.toArray();
        
        const defaultGroup = groups.find(g => g.id === 'default');
        const otherGroups = groups.filter(g => g.id !== 'default');
        
        const renderTab = (g) => {
            const tab = document.createElement('div');
            tab.className = `emoticon-group-tag ${g.id === currentEmoGroupId ? 'active' : ''}`;
            tab.textContent = g.name;
            // 非默认分组支持长按删除
            if (g.id !== 'default') {
                let timer;
                tab.addEventListener('touchstart', () => {
                    timer = setTimeout(() => {
                        if (confirm(`确定要删除分组【${g.name}】及其下所有表情包吗？`)) {
                            deleteEmoGroup(g.id);
                        }
                    }, 800);
                }, {passive: true});
                tab.addEventListener('touchend', () => clearTimeout(timer));
                tab.addEventListener('touchmove', () => clearTimeout(timer));
            }
            tab.onclick = () => {
                currentEmoGroupId = g.id;
                renderEmoGroups();
            };
            container.appendChild(tab);
        };
        
        if (defaultGroup) renderTab(defaultGroup);
        otherGroups.forEach(renderTab);
        
        const addBtn = document.createElement('div');
        addBtn.className = 'emo-group-add';
        addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        addBtn.onclick = async () => {
            const name = prompt('请输入新分组名称:');
            if (name && name.trim()) {
                const id = 'group_' + Date.now();
                await emoDb.groups.add({ id, name: name.trim() });
                currentEmoGroupId = id;
                renderEmoGroups();
            }
        };
        container.appendChild(addBtn);
        
        await renderEmoticons();
    }

    async function deleteEmoGroup(groupId) {
        await emoDb.groups.delete(groupId);
        const emos = await emoDb.emoticons.where('groupId').equals(groupId).toArray();
        const emoIds = emos.map(e => e.id);
        await emoDb.emoticons.bulkDelete(emoIds);
        if (currentEmoGroupId === groupId) currentEmoGroupId = 'default';
        renderEmoGroups();
    }

    async function renderEmoticons() {
        const list = document.getElementById('emoticon-list-container');
        list.innerHTML = '';
        const emos = await emoDb.emoticons.where('groupId').equals(currentEmoGroupId).toArray();
        
        if (emos.length === 0) {
            list.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #bbb; font-size: 13px; margin-top: 50px;">该分组暂无表情包</div>';
            return;
        }
        
        emos.reverse().forEach(e => {
            const item = document.createElement('div');
            item.className = `emo-item ${emoManageMode ? 'manage-mode' : ''}`;
            const isChecked = selectedEmoIds.has(e.id) ? 'checked' : '';
            
            item.innerHTML = `
                <div class="emo-checkbox ${isChecked}"></div>
                <img src="${e.url}" loading="lazy" decoding="async">
                <div class="emo-item-desc">${e.desc}</div>
            `;
            
            item.onclick = () => {
                if (emoManageMode) {
                    if (selectedEmoIds.has(e.id)) {
                        selectedEmoIds.delete(e.id);
                    } else {
                        selectedEmoIds.add(e.id);
                    }
                    renderEmoticons();
                }
            };
            list.appendChild(item);
        });
    }

    function toggleEmoticonManageMode() {
        emoManageMode = !emoManageMode;
        selectedEmoIds.clear();
        document.getElementById('emoticon-manage-bar').style.display = emoManageMode ? 'flex' : 'none';
        renderEmoticons();
    }

    async function selectAllEmoticons() {
        const emos = await emoDb.emoticons.where('groupId').equals(currentEmoGroupId).toArray();
        if (selectedEmoIds.size === emos.length) {
            selectedEmoIds.clear();
        } else {
            emos.forEach(e => selectedEmoIds.add(e.id));
        }
        renderEmoticons();
    }

    async function deleteSelectedEmoticons() {
        if (selectedEmoIds.size === 0) return;
        if (confirm(`确定删除选中的 ${selectedEmoIds.size} 个表情包吗？`)) {
            await emoDb.emoticons.bulkDelete(Array.from(selectedEmoIds));
            selectedEmoIds.clear();
            renderEmoticons();
        }
    }

    async function moveSelectedEmoticons() {
        if (selectedEmoIds.size === 0) return;
        const select = document.getElementById('emoticon-move-select');
        select.innerHTML = '';
        const groups = await emoDb.groups.toArray();
        groups.forEach(g => {
            if (g.id !== currentEmoGroupId) {
                select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
            }
        });
        if (select.options.length === 0) {
            alert('没有其他分组可供移动');
            return;
        }
        document.getElementById('emoticon-move-modal').style.display = 'flex';
    }

    function closeMoveEmoticonModal() {
        document.getElementById('emoticon-move-modal').style.display = 'none';
    }
    // 别名：HTML 中 onclick 使用的是 closeEmoticonMoveModal
    function closeEmoticonMoveModal() {
        closeMoveEmoticonModal();
    }

    async function confirmMoveEmoticons() {
        const targetGroupId = document.getElementById('emoticon-move-select').value;
        if (!targetGroupId) return;
        const ids = Array.from(selectedEmoIds);
        for (let id of ids) {
            await emoDb.emoticons.update(id, { groupId: targetGroupId });
        }
        selectedEmoIds.clear();
        closeMoveEmoticonModal();
        renderEmoticons();
        alert('移动成功');
    }

    function openAddEmoticonModal() {
        document.getElementById('emoticon-batch-input').value = '';
        document.getElementById('emoticon-add-modal').style.display = 'flex';
    }
    function closeAddEmoticonModal() {
        document.getElementById('emoticon-add-modal').style.display = 'none';
    }
    
    async function saveBatchEmoticons() {
        const input = document.getElementById('emoticon-batch-input').value.trim();
        if (!input) return;
        
        const lines = input.split('\n');
        let addedCount = 0;
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // 兼容 "描述 URL" 和 "描述：URL" 格式
            const match = line.match(/^(.+?)(?:\s+|:|：)(http.+)$/i);
            if (match) {
                const desc = match[1].trim();
                const url = match[2].trim();
                await emoDb.emoticons.add({
                    groupId: currentEmoGroupId,
                    desc: desc,
                    url: url
                });
                addedCount++;
            }
        }
        
        closeAddEmoticonModal();
        renderEmoticons();
        alert(`成功添加 ${addedCount} 个表情包`);
    }
    // ====== 联系人功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const contactDb = new Dexie("miniPhoneContactDB");
    contactDb.version(1).stores({ contacts: 'id' });
    let tempRoleAvatarBase64 = '';
    let tempUserAvatarBase64 = '';
    let tempContactNpcs = [];
        // 渲染联系人列表 (新增性别、语言直观展示，确保信息严格区分)
    async function renderContacts() {
        const listContainer = document.getElementById('contact-list-container');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        try {
            const contacts = await contactDb.contacts.toArray();
            if (contacts.length === 0) {
                listContainer.innerHTML = '<div style="color:#bbb; font-size:13px; text-align:center; margin-top:20px;">暂无联系人</div>';
                return;
            }
            contacts.forEach(c => {
                const item = document.createElement('div');
                item.style.cssText = 'background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between;';
                let avatarHtml = c.roleAvatar ? `<img src="${c.roleAvatar}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async">` : `<span style="color: #ccc; font-size: 12px;">无</span>`;
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
                        <div style="width: 45px; height: 45px; border-radius: 50%; background: #fdfdfd; border: 1px solid #f0f0f0; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 5px;">
                            <div style="font-size: 15px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span>${c.roleName || '未命名'}</span>
                                <span style="font-size: 10px; color: #777; font-weight: normal; background: #eef2f5; padding: 2px 6px; border-radius: 8px;">${c.roleGender || '男'}</span>
                                <span style="font-size: 10px; color: #777; font-weight: normal; background: #f5f0ee; padding: 2px 6px; border-radius: 8px;">${c.roleLanguage || '中'}</span>
                                <span style="font-size: 10px; color: #999; font-weight: normal; background: #f5f5f5; padding: 2px 6px; border-radius: 8px;">${c.roleGroup || 'ALL'}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.roleDetail || '暂无设定'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; flex-shrink: 0; margin-left: 10px;">
                        <div class="wb-action-icon" onclick="openContactEditor('${c.id}')">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div class="wb-action-icon" onclick="deleteContact('${c.id}')">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        } catch (e) {
            console.error("加载联系人失败", e);
        }
    }
    // 打开联系人编辑器 (加固重置逻辑，绝对杜绝信息残留与串联)
    async function openContactEditor(id = null) {
        const modal = document.getElementById('contact-editor-modal');
        const title = document.getElementById('contact-editor-title');
        // 更新分组下拉框
        const groupSelect = document.getElementById('contact-role-group');
        groupSelect.innerHTML = '<option value="">ALL (不分组)</option>';
        contactGroups.forEach(g => {
            groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
        });
        // 加载面具预设到下拉框
        const maskSelect = document.getElementById('contact-mask-select');
        maskSelect.innerHTML = '<option value="">使用面具...</option>';
        try {
            const presets = await maskDb.presets.toArray();
            presets.forEach(p => {
                maskSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        } catch (e) {}
        modal.style.display = 'flex';
        // 【核心隔离】彻底清空所有临时变量
        tempRoleAvatarBase64 = '';
        tempUserAvatarBase64 = '';
        tempContactNpcs = [];
        // 加载世界书列表到复选框
        const wbListContainer = document.getElementById('contact-worldbook-list');
        wbListContainer.innerHTML = '';
        try {
            const allWbs = await db.entries.toArray();
            if(allWbs.length === 0) {
                wbListContainer.innerHTML = '<div style="color:#bbb; font-size:12px; text-align:center;">暂无世界书设定</div>';
            } else {
                allWbs.forEach(wb => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; cursor: pointer;';
                    label.innerHTML = `<input type="checkbox" class="contact-wb-checkbox" value="${wb.id}" style="accent-color: #666; width: 14px; height: 14px;"> <span>${wb.title}</span> <span style="font-size:10px; color:#999;">(${wb.category==='global'?'全局':'局部'})</span>`;
                    wbListContainer.appendChild(label);
                });
            }
        } catch (e) {
            console.error("加载世界书失败", e);
        }
document.getElementById('contact-edit-id').value = '';
        document.getElementById('contact-role-name').value = '';
        document.getElementById('contact-role-group').value = '';
        document.getElementById('contact-role-gender').value = '男'; // 下拉框重置
        document.getElementById('contact-role-lang').value = '中';
        document.getElementById('contact-role-detail').value = '';
        document.getElementById('contact-role-avatar-preview').src = '';
        document.getElementById('contact-role-avatar-preview').style.display = 'none';
        document.getElementById('contact-role-avatar-text').style.display = 'block';
        document.getElementById('contact-user-name').value = '';
        document.getElementById('contact-user-gender').value = '女'; // 下拉框重置
        document.getElementById('contact-user-detail').value = '';
        document.getElementById('contact-user-avatar-preview').src = '';
        document.getElementById('contact-user-avatar-preview').style.display = 'none';
        document.getElementById('contact-user-avatar-text').style.display = 'block';
        if (id) {
            title.textContent = '编辑联系人';
            const c = await contactDb.contacts.get(id);
            if (c) {
                document.getElementById('contact-edit-id').value = c.id;
                document.getElementById('contact-role-name').value = c.roleName || '';
                if (c.roleGroup && contactGroups.includes(c.roleGroup)) {
                    document.getElementById('contact-role-group').value = c.roleGroup;
                }
                if (c.roleGender) document.getElementById('contact-role-gender').value = c.roleGender; // 下拉框回显
                if (c.roleLanguage) document.getElementById('contact-role-lang').value = c.roleLanguage;
                document.getElementById('contact-role-detail').value = c.roleDetail || '';
                if (c.roleAvatar) {
                    tempRoleAvatarBase64 = c.roleAvatar;
                    document.getElementById('contact-role-avatar-preview').src = c.roleAvatar;
                    document.getElementById('contact-role-avatar-preview').style.display = 'block';
                    document.getElementById('contact-role-avatar-text').style.display = 'none';
                }
                document.getElementById('contact-user-name').value = c.userName || '';
                if (c.userGender) document.getElementById('contact-user-gender').value = c.userGender; // 下拉框回显
                document.getElementById('contact-user-detail').value = c.userDetail || '';
                if (c.userAvatar) {
                    tempUserAvatarBase64 = c.userAvatar;
                    document.getElementById('contact-user-avatar-preview').src = c.userAvatar;
                    document.getElementById('contact-user-avatar-preview').style.display = 'block';
                    document.getElementById('contact-user-avatar-text').style.display = 'none';
                }
                if (c.npcs && Array.isArray(c.npcs)) {
                    tempContactNpcs = JSON.parse(JSON.stringify(c.npcs)); 
                }
                if (c.worldbooks && Array.isArray(c.worldbooks)) {
                    const checkboxes = document.querySelectorAll('.contact-wb-checkbox');
                    checkboxes.forEach(cb => {
                        if (c.worldbooks.includes(parseInt(cb.value))) {
                            cb.checked = true;
                        }
                    });
                }
            }
        } else {
            title.textContent = '添加新朋友';
        }
        renderContactNpcs();
    }
    function closeContactEditor() {
        document.getElementById('contact-editor-modal').style.display = 'none';
        document.getElementById('contact-role-avatar-input').value = '';
        document.getElementById('contact-user-avatar-input').value = '';
    }
    function handleContactAvatarChange(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'role') {
                tempRoleAvatarBase64 = e.target.result;
                const preview = document.getElementById('contact-role-avatar-preview');
                preview.src = tempRoleAvatarBase64;
                preview.style.display = 'block';
                document.getElementById('contact-role-avatar-text').style.display = 'none';
            } else {
                tempUserAvatarBase64 = e.target.result;
                const preview = document.getElementById('contact-user-avatar-preview');
                preview.src = tempUserAvatarBase64;
                preview.style.display = 'block';
                document.getElementById('contact-user-avatar-text').style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
    // 应用面具预设到用户设定
    async function applyMaskToContact() {
        const maskId = document.getElementById('contact-mask-select').value;
        if (!maskId) return;
        try {
            const p = await maskDb.presets.get(maskId);
            if (p) {
                document.getElementById('contact-user-name').value = p.name || '';
                if (p.gender) document.getElementById('contact-user-gender').value = p.gender; // 下拉框赋值
                document.getElementById('contact-user-detail').value = p.detail || '';
                if (p.avatar) {
                    tempUserAvatarBase64 = p.avatar;
                    const preview = document.getElementById('contact-user-avatar-preview');
                    preview.src = tempUserAvatarBase64;
                    preview.style.display = 'block';
                    document.getElementById('contact-user-avatar-text').style.display = 'none';
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    // NPC 拓展逻辑
    function renderContactNpcs() {
        const list = document.getElementById('contact-npc-list');
        list.innerHTML = '';
        tempContactNpcs.forEach((npc, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; position: relative;';
            item.innerHTML = `
                <div style="position: absolute; top: 10px; right: 10px; color: #ff4d4f; font-size: 16px; cursor: pointer; line-height: 1;" onclick="removeContactNpc(${index})">×</div>
                <input type="text" class="settings-input" style="padding: 6px 10px; font-size: 13px; width: 85%;" placeholder="NPC姓名" value="${npc.name}" onchange="updateContactNpc(${index}, 'name', this.value)">
                <textarea class="settings-input" style="height: 40px; padding: 6px 10px; font-size: 13px;" placeholder="NPC设定" onchange="updateContactNpc(${index}, 'detail', this.value)">${npc.detail}</textarea>
            `;
            list.appendChild(item);
        });
    }
    function addContactNpc() {
        tempContactNpcs.push({ name: '', detail: '' });
        renderContactNpcs();
    }
    function removeContactNpc(index) {
        tempContactNpcs.splice(index, 1);
        renderContactNpcs();
    }
    function updateContactNpc(index, field, value) {
        tempContactNpcs[index][field] = value;
    }
    // 保存联系人
    async function saveContact() {
        const id = document.getElementById('contact-edit-id').value;
        const roleName = document.getElementById('contact-role-name').value.trim();
        if (!roleName) return alert('请输入角色姓名');
        // 获取选中的世界书
        const wbCheckboxes = document.querySelectorAll('.contact-wb-checkbox:checked');
        const selectedWorldbooks = Array.from(wbCheckboxes).map(cb => parseInt(cb.value));
        const data = {
            id: id || Date.now().toString(),
            roleName,
            roleGroup: document.getElementById('contact-role-group').value,
            roleGender: document.getElementById('contact-role-gender').value,
            roleLanguage: document.getElementById('contact-role-lang').value,
            roleDetail: document.getElementById('contact-role-detail').value.trim(),
            roleAvatar: tempRoleAvatarBase64,
            userName: document.getElementById('contact-user-name').value.trim(),
            userGender: document.getElementById('contact-user-gender').value,
            userDetail: document.getElementById('contact-user-detail').value.trim(),
            userAvatar: tempUserAvatarBase64,
            worldbooks: selectedWorldbooks,
            npcs: tempContactNpcs
        };
        try {
            await contactDb.contacts.put(data);
            closeContactEditor();
            renderContacts();
        } catch (e) {
            alert('保存失败');
            console.error(e);
        }
    }
    async function deleteContact(id) {
        if (confirm('确定要删除这个联系人吗？')) {
            try {
                await contactDb.contacts.delete(id);
                renderContacts();
            } catch (e) {
                alert('删除失败');
                console.error(e);
            }
        }
    }
    // ====== 聊天列表功能逻辑 ======
    // 新增：获取 AM/PM 格式时间
    function getAmPmTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0点变成12点
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }
    const chatListDb = new Dexie("miniPhoneChatListDB");
    chatListDb.version(1).stores({ chats: 'id, contactId, lastTime' });
    chatListDb.version(2).stores({
        chats: 'id, contactId, lastTime',
        messages: '++id, contactId, sender, content, timeStr'
    });
    chatListDb.version(3).stores({
        chats: 'id, contactId, lastTime, pinned',
        messages: '++id, contactId, sender, content, timeStr'
    });
    chatListDb.version(4).stores({
        chats: 'id, contactId, lastTime, pinned',
        messages: '++id, contactId, sender, content, timeStr, source'
    });
    function openChatTypeModal() {
        document.getElementById('chat-type-modal').style.display = 'flex';
    }
    function closeChatTypeModal() {
        document.getElementById('chat-type-modal').style.display = 'none';
    }
    async function openSingleChatSelect() {
        closeChatTypeModal();
        const modal = document.getElementById('single-chat-select-modal');
        const listContainer = document.getElementById('single-chat-contact-list');
        listContainer.innerHTML = '';
        try {
            const contacts = await contactDb.contacts.toArray();
            if (contacts.length === 0) {
                listContainer.innerHTML = '<div style="color:#bbb; font-size:13px; text-align:center; margin-top:20px;">暂无联系人，请先添加新朋友</div>';
            } else {
                contacts.forEach(c => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: #f9f9f9; border-radius: 12px; padding: 10px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; border: 1px solid #eee;';
                    item.onclick = () => createSingleChat(c.id);
                    let avatarHtml = c.roleAvatar ? `<img src="${c.roleAvatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="color: #ccc; font-size: 12px;">无</span>`;
                    item.innerHTML = `
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fff; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center; border: 1px solid #f0f0f0;">
                            ${avatarHtml}
                        </div>
                        <div style="font-size: 14px; font-weight: 500; color: #333;">${c.roleName || '未命名'}</div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        } catch (e) {
            console.error("加载联系人失败", e);
        }
        modal.style.display = 'flex';
    }
    function closeSingleChatSelect() {
        document.getElementById('single-chat-select-modal').style.display = 'none';
    }
    async function createSingleChat(contactId) {
        try {
            const existingChat = await chatListDb.chats.where('contactId').equals(contactId).first();
            if (!existingChat) {
                const timeStr = getAmPmTime();
                await chatListDb.chats.add({
                    id: Date.now().toString(),
                    contactId: contactId,
                    lastTime: timeStr
                });
            }
            closeSingleChatSelect();
            renderChatList();
        } catch (e) {
            console.error("创建聊天失败", e);
        }
    }
    let chatListRenderToken = 0;
    async function renderChatList() {
        const renderToken = ++chatListRenderToken;
        const container = document.getElementById('chat-list-container');
        if (!container) return;
        try {
            let chats = await chatListDb.chats.toArray();
            if (renderToken !== chatListRenderToken) return;
            if (chats.length === 0) {
                container.innerHTML = '<div id="no-msg-tip" style="color:#bbb; font-size:13px; margin-top:100px; text-align:center;">暂无新消息</div>';
                return;
            }
            // 置顶的排前面，其余保持原始顺序（倒序）
            chats.reverse();
            const seenContactIds = new Set();
            chats = chats.filter(chat => {
                if (!chat || !chat.contactId) return false;
                if (seenContactIds.has(chat.contactId)) return false;
                seenContactIds.add(chat.contactId);
                return true;
            });
            chats.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

            const fragment = document.createDocumentFragment();

            for (let chat of chats) {
                if (renderToken !== chatListRenderToken) return;
                const contact = await contactDb.contacts.get(chat.contactId);
                if (!contact) continue;
                const msgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
                let lastMsgText = '点击开始聊天...';
                if (msgs && msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg.isRecalled) {
                        lastMsgText = '撤回了一条消息';
                    } else {
                        lastMsgText = extractMsgPureText(lastMsg.content);
                    }
                }

                const isPinned = !!chat.pinned;
                let avatarHtml = contact.roleAvatar
                    ? `<img src="${contact.roleAvatar}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" decoding="async">`
                    : `<span style="color:#ccc;font-size:12px;">无</span>`;

                // 外层滑动容器
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-swipe-wrapper';
                if (isPinned) wrapper.classList.add('chat-item-pinned-wrap');
                wrapper.setAttribute('data-chat-id', chat.id);
                wrapper.setAttribute('data-contact-id', contact.id);

                // 操作按钮区（右侧，左滑后显示）
                const actions = document.createElement('div');
                actions.className = 'chat-swipe-actions';
                actions.innerHTML = `
                    <div class="chat-swipe-btn chat-swipe-pin${isPinned ? ' pinned' : ''}" onclick="togglePinChat('${chat.id}', this)">
                        ${isPinned ? '取消置顶' : '置顶'}
                    </div>
                    <div class="chat-swipe-btn chat-swipe-delete" onclick="deleteChatItem('${chat.id}', this)">删除</div>
                `;

                // 主内容区
                const item = document.createElement('div');
                item.className = 'chat-swipe-item';
                if (isPinned) item.classList.add('chat-item-pinned');
                // 读取备注
                let displayName = contact.roleName || '未命名';
                try {
                    const remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
                    if (remark && remark !== '未设置') displayName = remark;
                } catch(e) {}
                const blockedTag = contact.blocked ? '<span style="font-size:10px;color:#e74c3c;font-weight:600;background:#fff0f0;padding:1px 5px;border-radius:6px;margin-left:4px;">[已拉黑]</span>' : '';
                item.innerHTML = `
                    <div style="width:45px;height:45px;border-radius:50%;background:#fdfdfd;border:1px solid #f0f0f0;overflow:hidden;flex-shrink:0;display:flex;justify-content:center;align-items:center;">
                        ${avatarHtml}
                    </div>
                    <div style="flex:1;margin-left:12px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                                ${isPinned ? '<span class="chat-pin-tag">置顶</span>' : ''}
                                <span style="font-size:15px;font-weight:600;color:#333;">${displayName}</span>${blockedTag}
                            </div>
                            <span style="font-size:11px;color:#999;flex-shrink:0;">${chat.lastTime || ''}</span>
                        </div>
                        <span style="font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lastMsgText}</span>
                    </div>
                `;
                item.onclick = () => enterChatWindow(contact.id);

                // 绑定左滑手势
                bindSwipeGesture(wrapper, item);

                wrapper.appendChild(actions);
                wrapper.appendChild(item);
                fragment.appendChild(wrapper);
            }

            if (renderToken !== chatListRenderToken) return;
            if (!fragment.childNodes.length) {
                container.innerHTML = '<div id="no-msg-tip" style="color:#bbb;font-size:13px;margin-top:100px;text-align:center;">暂无新消息</div>';
                return;
            }
            container.replaceChildren(fragment);
        } catch (e) {
            console.error("加载聊天列表失败", e);
        }
    }

    // 左滑手势绑定（同时支持触摸和鼠标）
    function bindSwipeGesture(wrapper, item) {
        let startX = 0, startY = 0, currentX = 0;
        let dragging = false, isHorizontal = null;
        const ACTION_WIDTH = 130;

        function closeOtherSwipes(except) {
            document.querySelectorAll('.chat-swipe-item.swiped').forEach(el => {
                if (el !== except) {
                    el.style.transition = 'transform 0.25s ease';
                    el.style.transform = 'translateX(0)';
                    el.classList.remove('swiped');
                }
            });
        }

        function snapItem() {
            item.style.transition = 'transform 0.25s ease';
            const alreadySwiped = item.classList.contains('swiped');
            const threshold = ACTION_WIDTH * 0.35;
            if (!alreadySwiped && currentX < -threshold) {
                item.style.transform = `translateX(-${ACTION_WIDTH}px)`;
                item.classList.add('swiped');
                closeOtherSwipes(item);
            } else if (alreadySwiped && currentX > threshold) {
                item.style.transform = 'translateX(0)';
                item.classList.remove('swiped');
            } else if (alreadySwiped) {
                item.style.transform = `translateX(-${ACTION_WIDTH}px)`;
            } else {
                item.style.transform = 'translateX(0)';
            }
        }

        // ===== 触摸 =====
        wrapper.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = 0; dragging = false; isHorizontal = null;
            item.style.transition = 'none';
        }, { passive: true });

        wrapper.addEventListener('touchmove', e => {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (isHorizontal === null) {
                if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                isHorizontal = Math.abs(dx) > Math.abs(dy);
            }
            if (!isHorizontal) return;
            dragging = true;
            currentX = dx;
            const base = item.classList.contains('swiped') ? -ACTION_WIDTH : 0;
            const offset = Math.max(-ACTION_WIDTH, Math.min(0, base + dx));
            item.style.transform = `translateX(${offset}px)`;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            if (dragging) snapItem();
            dragging = false;
        });

        // ===== 鼠标（电脑端）=====
        wrapper.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            currentX = 0; dragging = false; isHorizontal = null;
            item.style.transition = 'none';

            const onMove = ev => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (isHorizontal === null) {
                    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                    isHorizontal = Math.abs(dx) > Math.abs(dy);
                }
                if (!isHorizontal) return;
                dragging = true;
                currentX = dx;
                const base = item.classList.contains('swiped') ? -ACTION_WIDTH : 0;
                const offset = Math.max(-ACTION_WIDTH, Math.min(0, base + dx));
                item.style.transform = `translateX(${offset}px)`;
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (dragging) snapItem();
                dragging = false;
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // 点击已展开项时收回
        item.addEventListener('click', e => {
            if (item.classList.contains('swiped')) {
                e.stopPropagation();
                item.style.transition = 'transform 0.25s ease';
                item.style.transform = 'translateX(0)';
                item.classList.remove('swiped');
            }
        }, true);
    }

    // 置顶/取消置顶
    async function togglePinChat(chatId, btnEl) {
        try {
            const chat = await chatListDb.chats.get(chatId);
            if (!chat) return;
            const newPinned = !chat.pinned;
            await chatListDb.chats.update(chatId, { pinned: newPinned });
            renderChatList();
        } catch (e) {
            console.error("置顶操作失败", e);
        }
    }

    // 删除聊天项（从列表移除，保留消息记录）
    async function deleteChatItem(chatId, btnEl) {
        try {
            await chatListDb.chats.delete(chatId);
            renderChatList();
        } catch (e) {
            console.error("删除聊天失败", e);
        }
    }

    // 初始化渲染联系人列表与聊天列表，并恢复钱包数据
    document.addEventListener('DOMContentLoaded', () => {
        renderContacts();
        renderChatList();
        initWalletData();
    });
// 小说应用控制逻辑
    const novelBtn = document.getElementById('app-btn-novel');
    if(novelBtn) {
        novelBtn.onclick = (e) => { 
            e.stopPropagation(); 
            openApp('novel-app');
        };
    }
    function closeNovelApp() {
        document.getElementById('novel-app').style.display = 'none';
    }
