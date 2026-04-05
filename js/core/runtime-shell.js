// Auto-split from js/core/bootstrap.js (1-462)

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
const appIconNames = ["小说", "日记", "购物", "论坛", "WeChat", "纪念日", "记忆", "世界书", "游戏", "闲鱼", "查手机", "情侣空间", "音乐", "信息", "梦境", "21st Closet", "主题", "设置"];
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
    '记忆': 'MEMORY',
    '游戏': 'GAME',
    '梦境': 'DREAM',
    '21stCloset': '21ST CLOSET',
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
        var fixedSubtitle = (el.getAttribute('data-subtitle-fixed') || '').trim();
        var subtitle = fixedSubtitle || resolveHeaderSubtitle(el.textContent || '', isOfflineTitle);
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

function getEventElementTarget(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
}

function safeClosestFromEventTarget(target, selector) {
    const elementTarget = getEventElementTarget(target);
    if (!elementTarget || typeof elementTarget.closest !== 'function') return null;
    return elementTarget.closest(selector);
}

window.safeClosestTarget = safeClosestFromEventTarget;

document.addEventListener('contextmenu', function(e) {
    if (!safeClosestFromEventTarget(e.target, '.phone-screen')) return;
    e.preventDefault();
});

document.addEventListener('selectstart', function(e) {
    if (!safeClosestFromEventTarget(e.target, '.phone-screen')) return;
    e.preventDefault();
});

document.addEventListener('dragstart', function(e) {
    if (!safeClosestFromEventTarget(e.target, '.phone-screen')) return;
    e.preventDefault();
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
        if (!safeClosestFromEventTarget(e.target, '.editable') && !safeClosestFromEventTarget(e.target, '#menu-panel')) {
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
        if (!screen) return;
        const themeMode = document.documentElement.getAttribute('data-theme') || 'day';
        const hasImage = !!(src && !src.includes('via.placeholder.com'));
        const syncDeviceLockWallpaper = function() {
            if (typeof window.refreshDeviceLockWallpaperPreview === 'function') {
                window.refreshDeviceLockWallpaperPreview().catch(function(err) {
                    console.error('刷新锁屏壁纸预览失败', err);
                });
            }
        };
        screen.style.backgroundBlendMode = '';

        if (themeMode === 'night') {
            if (hasImage) {
                screen.style.background = `radial-gradient(circle at top, rgba(76,82,92,0.16), transparent 34%), linear-gradient(180deg, rgba(10,11,14,0.14) 0%, rgba(3,3,4,0.32) 100%), url(${src}) center/cover no-repeat`;
                screen.style.backgroundBlendMode = 'screen, multiply, normal';
            } else {
                screen.style.background = 'radial-gradient(circle at top, rgba(88,94,106,0.22), transparent 34%), linear-gradient(180deg, #1a1c21 0%, #0d0e12 58%, #000000 100%)';
            }
            syncDeviceLockWallpaper();
            return;
        }

        if (themeMode === 'dopamine' && hasImage) {
            screen.style.background = `linear-gradient(180deg, rgba(255,244,238,0.16) 0%, rgba(255,240,230,0.26) 100%), url(${src}) center/cover no-repeat`;
            screen.style.backgroundBlendMode = 'normal, normal';
            syncDeviceLockWallpaper();
            return;
        }

        if (hasImage) {
            screen.style.background = `url(${src}) center/cover no-repeat`;
        } else {
            screen.style.background = '';
        }
        syncDeviceLockWallpaper();
    }
    function shouldDeferToCustomThemeWallpaper() {
        return document.documentElement.getAttribute('data-theme') === 'custom';
    }
    const previewImg = document.querySelector('#wallpaper-preview img');
    if (previewImg) {
        new MutationObserver(async (mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    if (!shouldDeferToCustomThemeWallpaper()) {
                        setWallpaper(previewImg.src);
                    }
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
        if (record && record.src && !shouldDeferToCustomThemeWallpaper()) {
            setWallpaper(record.src);
            if (previewImg && previewImg.src !== record.src) {
                previewImg.src = record.src;
            }
        }
    }, 100);
