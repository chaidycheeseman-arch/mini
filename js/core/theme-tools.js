// Auto-split from js/core/bootstrap.js (1411-1696)

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
