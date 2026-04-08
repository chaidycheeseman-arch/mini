// ====== 查手机功能逻辑 ======
(function() {
    'use strict';

    function _cpDebug(tag, payload) {
        try {
            if (payload === undefined) console.info('[CHECKPHONE_DEBUG] ' + tag);
            else console.info('[CHECKPHONE_DEBUG] ' + tag, payload);
        } catch (e) {}
    }

    // 当前查看的联系人
    var _cpContact = null;
    // 密码输入状态
    var _cpPasscodeInput = '';
    // 是否正在询问角色
    var _cpAsking = false;
    // 锁屏时间更新定时器
    var _cpTimeTimer = null;
    // 当前联系人显示名（备注优先）
    var _cpDisplayName = '';

    async function _cpGetDisplayName(contact) {
        if (!contact) return '未命名';
        var roleName = contact.roleName || '未命名';
        try {
            var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') return remark;
        } catch (e) {}
        return roleName;
    }

    function _cpEnsureInnerAppInsidePhone() {
        var phoneScreen = document.getElementById('cp-phone-screen');
        var innerApp = document.getElementById('cp-inner-app');
        if (!phoneScreen || !innerApp) return;
        if (innerApp.parentElement !== phoneScreen) {
            phoneScreen.appendChild(innerApp);
        }
    }

    // ---- 绑定"查手机"图标点击事件 ----
    document.addEventListener('DOMContentLoaded', function() {
        _cpEnsureInnerAppInsidePhone();
        // 找到第二页的"查手机"图标
        var allIcons = document.querySelectorAll('.app-icon');
        allIcons.forEach(function(icon) {
            var span = icon.querySelector('span');
            if (span && span.textContent.trim() === '查手机') {
                icon.onclick = function(e) {
                    e.stopPropagation();
                    openCheckphoneContactModal();
                };
            }
        });

        // 冗余绑定“询问密码”按钮，避免仅依赖内联 onclick
        var askBtn = document.getElementById('cp-ask-role-btn');
        if (askBtn && !askBtn._cpAskBound) {
            askBtn._cpAskBound = true;
            askBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!_cpContact || _cpAsking) return;
                _cpDebug('ask_btn_click_triggered');
                if (typeof window.cpAskRoleForPassword === 'function') {
                    window.cpAskRoleForPassword();
                } else {
                    _cpDebug('ask_btn_missing_handler');
                }
            });
        }
    });

    // ---- 打开联系人选择弹窗 ----
    window.openCheckphoneContactModal = async function() {
        var modal = document.getElementById('checkphone-contact-modal');
        var sheet = document.getElementById('checkphone-contact-sheet');
        var grid = document.getElementById('checkphone-contact-grid');
        if (!modal || !sheet || !grid) return;

        // 填充联系人
        grid.innerHTML = '';
        try {
            var contacts = await contactDb.contacts.toArray();
            if (contacts.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#bbb;font-size:13px;padding:30px 0;">暂无联系人，请先在WeChat中添加</div>';
            } else {
                for (const c of contacts) {
                    var item = document.createElement('div');
                    item.className = 'cp-contact-item';
                    // 获取显示名（备注优先）
                    var displayName = await _cpGetDisplayName(c);
                    // 头像
                    var avatarHtml = c.roleAvatar
                        ? '<img src="' + c.roleAvatar + '" alt="">'
                        : '<span style="font-size:22px;color:#ccc;">👤</span>';
                    item.innerHTML = '<div class="cp-contact-avatar">' + avatarHtml + '</div>' +
                        '<div class="cp-contact-name">' + displayName + '</div>';
                    item.onclick = function() {
                        closeCheckphoneContactModal();
                        setTimeout(function() {
                            openCheckphoneApp(Object.assign({}, c, { _displayName: displayName }));
                        }, 350);
                    };
                    grid.appendChild(item);
                }
            }
        } catch(e) {
            console.error('加载联系人失败', e);
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#bbb;font-size:13px;padding:30px 0;">加载失败</div>';
        }

        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    // ---- 关闭联系人选择弹窗 ----
    window.closeCheckphoneContactModal = function() {
        var sheet = document.getElementById('checkphone-contact-sheet');
        var modal = document.getElementById('checkphone-contact-modal');
        if (!sheet || !modal) return;
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 350);
    };

    // ---- 打开应用内页（点击桌面图标）----
    window.cpOpenApp = async function(appName) {
        if (!_cpContact) return;
        _cpEnsureInnerAppInsidePhone();
        var innerApp = document.getElementById('cp-inner-app');
        if (!innerApp) return;

        // 获取显示名（备注优先）
        var displayName = _cpDisplayName || _cpContact._displayName || await _cpGetDisplayName(_cpContact);
        _cpDisplayName = displayName;

        // 设置标题：角色名/备注 · 应用名
        var titleEl = document.getElementById('cp-inner-app-title');
        if (titleEl) titleEl.textContent = displayName + ' · ' + appName;

        // 记录当前打开的应用名（供刷新按钮使用）
        innerApp.setAttribute('data-app-name', appName);
        innerApp.setAttribute('data-contact-id', _cpContact.id);

        // 填充应用内容
        _cpRenderInnerApp(appName);

        // 显示内页（在虚拟手机屏幕内）
        innerApp.style.display = 'flex';
    };

    // ---- 关闭应用内页，返回桌面 ----
    window.cpCloseInnerApp = function() {
        var innerApp = document.getElementById('cp-inner-app');
        if (innerApp) innerApp.style.display = 'none';
    };

    // ---- 刷新应用内页（重绘应用框架）----
    window.cpRefreshInnerApp = function() {
        var innerApp = document.getElementById('cp-inner-app');
        if (!innerApp || !_cpContact) return;
        var appName = innerApp.getAttribute('data-app-name') || '备忘录';
        var btn = document.getElementById('cp-inner-refresh-btn');
        if (btn) {
            btn.style.transform = 'rotate(360deg)';
            btn.style.background = 'rgba(0,0,0,0.12)';
            setTimeout(function() {
                btn.style.transform = '';
                btn.style.background = 'rgba(0,0,0,0.06)';
            }, 500);
        }
        _cpRenderInnerApp(appName);
    };

    function _cpBuildFrameRows(rows) {
        return rows.map(function(text) {
            return '<div style="padding:11px 12px;border-radius:12px;background:#fff;border:1px solid #ededf3;color:#4a4a56;font-size:13px;line-height:1.55;">' +
                text + '</div>';
        }).join('');
    }

    var _cpDefaultDesktopIconTemplates = null;
    var _cpDefaultDockIconTemplates = null;

    function _cpCaptureIconTemplates() {
        if (_cpDefaultDesktopIconTemplates && _cpDefaultDockIconTemplates) return;
        _cpDefaultDesktopIconTemplates = Array.from(document.querySelectorAll('#cp-unlocked-screen .cp-desktop-icon-bg')).map(function(el) {
            return {
                style: el.getAttribute('style') || '',
                html: el.innerHTML
            };
        });
        _cpDefaultDockIconTemplates = Array.from(document.querySelectorAll('#cp-unlocked-screen .cp-dock-icon-bg')).map(function(el) {
            return {
                style: el.getAttribute('style') || '',
                html: el.innerHTML
            };
        });
    }

    function _cpApplyIconTemplate(el, customSrc, fallback) {
        if (!el) return;
        if (customSrc) {
            el.style.background = 'url(' + customSrc + ') center/cover no-repeat';
            el.innerHTML = '';
            return;
        }
        if (fallback && fallback.style) el.setAttribute('style', fallback.style);
        else el.removeAttribute('style');
        el.innerHTML = fallback && typeof fallback.html === 'string' ? fallback.html : '';
    }

    async function _cpRestoreDesktopCustomization(contact) {
        if (!contact) return;
        _cpCaptureIconTemplates();
        _cpDesktopIconData = new Array(10).fill('');

        var unlockedWpEl = document.getElementById('cp-unlocked-wallpaper');
        if (unlockedWpEl) unlockedWpEl.style.background = '';

        var profileBgEl = document.getElementById('cp-profile-bg');
        if (profileBgEl) {
            profileBgEl.style.background = contact.roleAvatar
                ? ('url(' + contact.roleAvatar + ') center/cover no-repeat')
                : '';
        }

        var defaultIconEls = document.querySelectorAll('#cp-unlocked-screen .cp-desktop-icon-bg');
        for (var d = 0; d < defaultIconEls.length; d++) {
            _cpApplyIconTemplate(defaultIconEls[d], '', _cpDefaultDesktopIconTemplates && _cpDefaultDesktopIconTemplates[d]);
        }

        var defaultDockEls = document.querySelectorAll('#cp-unlocked-screen .cp-dock-icon-bg');
        for (var dd = 0; dd < defaultDockEls.length; dd++) {
            _cpApplyIconTemplate(defaultDockEls[dd], '', _cpDefaultDockIconTemplates && _cpDefaultDockIconTemplates[dd]);
        }

        var contactId = contact.id;
        try {
            var tasks = [
                localforage.getItem('cp_desktop_wallpaper_' + contactId),
                localforage.getItem('cp_profile_bg_' + contactId)
            ];
            for (var i = 0; i < 10; i++) {
                tasks.push(localforage.getItem('cp_desktop_icon_' + contactId + '_' + i));
            }
            var results = await Promise.all(tasks);
            if (!_cpContact || String(_cpContact.id) !== String(contactId)) return;

            var savedWallpaper = results[0];
            var savedProfileBg = results[1];
            var savedIcons = results.slice(2);
            _cpDesktopIconData = savedIcons.slice();

            var unlockedWp = document.getElementById('cp-unlocked-wallpaper');
            if (unlockedWp) {
                unlockedWp.style.background = savedWallpaper
                    ? ('url(' + savedWallpaper + ') center/cover no-repeat')
                    : '';
            }

            var profileBg = document.getElementById('cp-profile-bg');
            if (profileBg) {
                if (savedProfileBg) {
                    profileBg.style.background = 'url(' + savedProfileBg + ') center/cover no-repeat';
                } else if (contact.roleAvatar) {
                    profileBg.style.background = 'url(' + contact.roleAvatar + ') center/cover no-repeat';
                } else {
                    profileBg.style.background = '';
                }
            }

            var allIconBgs = document.querySelectorAll('#cp-unlocked-screen .cp-desktop-icon-bg');
            for (var j = 0; j < allIconBgs.length; j++) {
                _cpApplyIconTemplate(allIconBgs[j], savedIcons[j], _cpDefaultDesktopIconTemplates && _cpDefaultDesktopIconTemplates[j]);
            }

            var allDockBgs = document.querySelectorAll('#cp-unlocked-screen .cp-dock-icon-bg');
            for (var k = 0; k < allDockBgs.length; k++) {
                _cpApplyIconTemplate(allDockBgs[k], savedIcons[k + 8], _cpDefaultDockIconTemplates && _cpDefaultDockIconTemplates[k]);
            }

            var customPanel = document.getElementById('cp-custom-panel');
            if (customPanel && customPanel.style.display === 'flex') {
                _cpInitIconRows();
            }
        } catch (err) {
            console.error('恢复查手机桌面自定义失败', err);
        }
    }

    // ---- 渲染应用内容（仅保留应用框架，不生成数据）----
    function _cpRenderInnerApp(appName) {
        var body = document.getElementById('cp-inner-app-body');
        if (!body) return;
        var frameRowsMap = {
            '备忘录': ['快速记录区', '待办清单区', '最近编辑区'],
            '相册': ['最近照片区', '相册分组区', '回忆精选区'],
            '音乐': ['最近播放区', '收藏歌单区', '推荐歌单区'],
            '短视频': ['关注更新区', '推荐视频区', '历史记录区'],
            '资产': ['账户总览区', '收支记录区', '账单分析区'],
            '购物': ['购物车区', '待收货区', '历史订单区'],
            '浏览器': ['常用网站区', '历史访问区', '下载管理区'],
            '私密空间': ['隐私入口区', '私密相册区', '私密文档区']
        };
        var rows = frameRowsMap[appName] || ['主内容区', '辅助内容区', '最近操作区'];
        body.innerHTML =
            '<div style="padding:12px;border-radius:14px;background:#ffffff;border:1px solid #ececf2;">' +
                '<div style="font-size:14px;font-weight:700;color:#2d2d38;letter-spacing:0.2px;">' + appName + ' · 应用框架</div>' +
                '<div style="margin-top:6px;font-size:12px;color:#8c8ca1;line-height:1.55;">仅保留页面结构，不执行任何查数据生成。</div>' +
            '</div>' +
            _cpBuildFrameRows(rows);
    }

    // ---- 打开手机检查页面 ----
    window.openCheckphoneApp = function(contact) {
        _cpContact = contact;
        _cpPasscodeInput = '';
        _cpAsking = false;
        _cpDisplayName = contact._displayName || contact.roleName || '对方';
        _cpEnsureInnerAppInsidePhone();

        var app = document.getElementById('checkphone-app');
        if (!app) return;
        app.style.display = 'flex';
        var innerApp = document.getElementById('cp-inner-app');
        if (innerApp) innerApp.style.display = 'none';

        // 设置角色名
        var roleNameEl = document.getElementById('checkphone-role-name');
        if (roleNameEl) roleNameEl.textContent = _cpDisplayName + ' 的手机';

        // 重置到锁屏状态
        _cpShowLockScreen();

        // 设置壁纸（锁屏和密码页使用头像，解锁后保持深色渐变）
        var avatarWallpaperBg = contact.roleAvatar
            ? 'url(' + contact.roleAvatar + ') center/cover no-repeat'
            : 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)';
        // 锁屏和密码页：先恢复上次保存的自定义壁纸，否则用头像
        var savedWallpaperKey = 'cp_wallpaper_' + contact.id;
        localforage.getItem(savedWallpaperKey).then(function(savedWp) {
            var wpBg = savedWp ? ('url(' + savedWp + ') center/cover no-repeat') : avatarWallpaperBg;
            ['cp-lock-wallpaper', 'cp-passcode-wallpaper'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.background = wpBg;
            });
        }).catch(function() {
            ['cp-lock-wallpaper', 'cp-passcode-wallpaper'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.background = avatarWallpaperBg;
            });
        });
        // 解锁后壁纸：保持深色渐变（不使用头像，避免头像铺满整个屏幕背景）
        // cp-unlocked-wallpaper 的 CSS 已定义为深色渐变，此处不做覆盖

        // 设置密码输入层的头像
        var passcodeAvatarImg = document.getElementById('cp-passcode-avatar-img');
        if (passcodeAvatarImg) passcodeAvatarImg.src = contact.roleAvatar || '';
        var passcodeNameEl = document.getElementById('cp-passcode-name');
        if (passcodeNameEl) passcodeNameEl.textContent = _cpDisplayName;

        // 设置询问按钮的角色名
        var askRoleNameEl = document.getElementById('cp-ask-role-name');
        if (askRoleNameEl) askRoleNameEl.textContent = _cpDisplayName;

        // 设置AI回复头像
        var replyAvatarImg = document.getElementById('cp-role-reply-avatar-img');
        if (replyAvatarImg) replyAvatarImg.src = contact.roleAvatar || '';

        // 更新锁屏时间
        _cpUpdateLockTime();
        _cpTimeTimer = setInterval(_cpUpdateLockTime, 1000);

        // 设置锁屏通知文字
        var notifText = document.getElementById('cp-lock-notif-text');
        if (notifText) notifText.textContent = _cpDisplayName + ' 发来了消息';

        _cpGetDisplayName(contact).then(function(name) {
            if (!_cpContact || String(_cpContact.id) !== String(contact.id)) return;
            _cpDisplayName = name || _cpDisplayName;
            var roleNameEl2 = document.getElementById('checkphone-role-name');
            if (roleNameEl2) roleNameEl2.textContent = _cpDisplayName + ' 的手机';
            var passcodeNameEl2 = document.getElementById('cp-passcode-name');
            if (passcodeNameEl2) passcodeNameEl2.textContent = _cpDisplayName;
            var askRoleNameEl2 = document.getElementById('cp-ask-role-name');
            if (askRoleNameEl2) askRoleNameEl2.textContent = _cpDisplayName;
            var notifText2 = document.getElementById('cp-lock-notif-text');
            if (notifText2) notifText2.textContent = _cpDisplayName + ' 发来了消息';
            var profileNameEl2 = document.getElementById('cp-profile-name');
            if (profileNameEl2) profileNameEl2.textContent = _cpDisplayName;
            var innerTitle = document.getElementById('cp-inner-app-title');
            var innerApp2 = document.getElementById('cp-inner-app');
            if (innerTitle && innerApp2 && innerApp2.getAttribute('data-app-name')) {
                innerTitle.textContent = _cpDisplayName + ' · ' + innerApp2.getAttribute('data-app-name');
            }
        }).catch(function() {});

        _cpRestoreDesktopCustomization(contact);

        // 绑定上滑手势
        _cpBindSwipeGesture();
    };

    // ---- 关闭手机检查页面 ----
    window.closeCheckphoneApp = function() {
        var app = document.getElementById('checkphone-app');
        if (app) app.style.display = 'none';
        var innerApp = document.getElementById('cp-inner-app');
        if (innerApp) {
            innerApp.style.display = 'none';
            innerApp.removeAttribute('data-app-name');
            innerApp.removeAttribute('data-contact-id');
        }
        if (_cpTimeTimer) { clearInterval(_cpTimeTimer); _cpTimeTimer = null; }
        _cpContact = null;
        _cpPasscodeInput = '';
        _cpAsking = false;
        _cpDisplayName = '';
        // 重置UI
        _cpHideAllScreens();
        var lockScreen = document.getElementById('cp-lock-screen');
        if (lockScreen) lockScreen.style.display = 'flex';
    };

    // ---- 显示锁屏 ----
    function _cpShowLockScreen() {
        _cpHideAllScreens();
        var lockScreen = document.getElementById('cp-lock-screen');
        if (lockScreen) lockScreen.style.display = 'flex';
    }

    // ---- 显示密码输入层 ----
    function _cpShowPasscodeScreen() {
        _cpHideAllScreens();
        _cpPasscodeInput = '';
        _cpUpdateDots();
        var screen = document.getElementById('cp-passcode-screen');
        if (screen) screen.style.display = 'flex';
        // 隐藏错误提示
        var errEl = document.getElementById('cp-passcode-error');
        if (errEl) errEl.style.display = 'none';
        // 隐藏AI回复气泡
        var bubble = document.getElementById('cp-role-reply-bubble');
        if (bubble) bubble.style.display = 'none';
        // 重置提示文字
        var hintEl = document.getElementById('cp-passcode-hint');
        if (hintEl) hintEl.textContent = '输入密码';
    }

    // ---- 显示解锁成功页面 ----
    function _cpShowUnlockedScreen() {
        _cpHideAllScreens();
        var screen = document.getElementById('cp-unlocked-screen');
        if (screen) screen.style.display = 'flex';
        // 更新状态栏时间
        _cpUpdateStatusTime();
        // 填充信息卡片
        if (_cpContact) {
            // 头像
            var profileAvatarImg = document.getElementById('cp-profile-avatar-img');
            if (profileAvatarImg) profileAvatarImg.src = _cpContact.roleAvatar || '';
            // 名字（角色名）
            var profileNameEl = document.getElementById('cp-profile-name');
            if (profileNameEl) profileNameEl.textContent = _cpDisplayName || _cpContact.roleName || '角色';
            // 更新应用行标题（角色名/备注 · 应用名）
            var row1Title = document.getElementById('cp-row1-title');
            var row2Title = document.getElementById('cp-row2-title');
            if (row1Title) row1Title.textContent = _cpDisplayName + ' · 备忘录';
            if (row2Title) row2Title.textContent = _cpDisplayName + ' · 资产';
            // 个性签名：从 localforage 读取，初始显示"暂无个性签名"
            var profileSigEl = document.getElementById('cp-profile-sig');
            if (profileSigEl) {
                var sigKey = 'cp_sig_' + _cpContact.id;
                localforage.getItem(sigKey).then(function(savedSig) {
                    profileSigEl.textContent = savedSig || '暂无个性签名';
                }).catch(function() {
                    profileSigEl.textContent = '暂无个性签名';
                });
                // 绑定点击可编辑
                profileSigEl.onclick = async function() {
                    var current = profileSigEl.textContent;
                    var newSig = await window.showMiniPrompt('输入个性签名：', current === '暂无个性签名' ? '' : current);
                    if (newSig !== null) {
                        var text = newSig.trim() || '暂无个性签名';
                        profileSigEl.textContent = text;
                        localforage.setItem(sigKey, text).catch(function(){});
                    }
                };
            }
            _cpRestoreDesktopCustomization(_cpContact);
        }
    }

    // ---- 隐藏所有屏幕层 ----
    function _cpHideAllScreens() {
        ['cp-lock-screen', 'cp-passcode-screen', 'cp-unlocked-screen'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // ---- 更新锁屏时间 ----
    function _cpUpdateLockTime() {
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var timeEl = document.getElementById('cp-lock-time');
        if (timeEl) timeEl.textContent = hh + ':' + mm;
        var dateEl = document.getElementById('cp-lock-date');
        if (dateEl) {
            var months = now.getMonth() + 1;
            var days = now.getDate();
            var weeks = ['周日','周一','周二','周三','周四','周五','周六'][now.getDay()];
            dateEl.textContent = months + '月' + days + '日 ' + weeks;
        }
    }

    // ---- 更新状态栏时间 ----
    function _cpUpdateStatusTime() {
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var el = document.getElementById('cp-status-time');
        if (el) el.textContent = hh + ':' + mm;
    }

    // ---- 绑定上滑手势（锁屏→密码输入）----
    function _cpBindSwipeGesture() {
        var lockScreen = document.getElementById('cp-lock-screen');
        if (!lockScreen || lockScreen._cpBound) return;
        lockScreen._cpBound = true;

        var startY = 0;
        var startX = 0;

        lockScreen.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        }, { passive: true });

        lockScreen.addEventListener('touchend', function(e) {
            var endY = e.changedTouches[0].clientY;
            var endX = e.changedTouches[0].clientX;
            var dy = startY - endY;
            var dx = Math.abs(startX - endX);
            // 上滑超过40px且横向偏移小于纵向偏移
            if (dy > 40 && dx < dy) {
                _cpShowPasscodeScreen();
            }
        }, { passive: true });

        // 电脑端：鼠标上滑
        lockScreen.addEventListener('mousedown', function(e) {
            startY = e.clientY;
        });
        lockScreen.addEventListener('mouseup', function(e) {
            var dy = startY - e.clientY;
            if (dy > 40) {
                _cpShowPasscodeScreen();
            }
        });

        // 点击上滑提示区域也可进入
        var swipeHint = document.getElementById('cp-swipe-hint');
        if (swipeHint) {
            swipeHint.onclick = function() { _cpShowPasscodeScreen(); };
        }
    }

    // ---- 更新密码圆点显示 ----
    function _cpUpdateDots() {
        for (var i = 0; i < 6; i++) {
            var dot = document.getElementById('cp-dot-' + i);
            if (!dot) continue;
            dot.className = 'cp-dot' + (i < _cpPasscodeInput.length ? ' filled' : '');
        }
    }

    // ---- 数字键盘输入 ----
    window.cpNumInput = async function(digit) {
        if (_cpPasscodeInput.length >= 6) return;
        _cpPasscodeInput += digit;
        _cpUpdateDots();

        if (_cpPasscodeInput.length === 6) {
            // 验证密码
            await _cpVerifyPasscode(_cpPasscodeInput);
        }
    };

    // ---- 删除键 ----
    window.cpNumDel = function() {
        if (_cpPasscodeInput.length > 0) {
            _cpPasscodeInput = _cpPasscodeInput.slice(0, -1);
            _cpUpdateDots();
        }
    };

    // ---- 取消密码输入 ----
    window.cpCancelPasscode = function() {
        _cpShowLockScreen();
    };

    // ---- 验证密码 ----
    async function _cpVerifyPasscode(code) {
        if (!_cpContact) return;

        // 根据角色设定推算可能的密码
        var possiblePasscodes = _cpGetPossiblePasscodes(_cpContact);

        if (possiblePasscodes.includes(code)) {
            // 密码正确
            _cpShowUnlockedScreen();
        } else {
            // 密码错误
            _cpPasscodeInput = '';
            _cpUpdateDots();
            // 显示错误提示并抖动
            var errEl = document.getElementById('cp-passcode-error');
            if (errEl) errEl.style.display = 'block';
            var hintEl = document.getElementById('cp-passcode-hint');
            if (hintEl) hintEl.textContent = '密码错误，请重试';
            // 圆点变红
            for (var i = 0; i < 6; i++) {
                var dot = document.getElementById('cp-dot-' + i);
                if (dot) dot.className = 'cp-dot error';
            }
            // 抖动动画
            var dotsEl = document.getElementById('cp-passcode-dots');
            if (dotsEl) {
                var seq = [8, -8, 6, -6, 4, 0];
                var idx = 0;
                var t = setInterval(function() {
                    dotsEl.style.transform = 'translateX(' + seq[idx] + 'px)';
                    idx++;
                    if (idx >= seq.length) {
                        clearInterval(t);
                        dotsEl.style.transform = '';
                        // 恢复圆点
                        setTimeout(function() {
                            _cpUpdateDots();
                            if (errEl) errEl.style.display = 'none';
                            if (hintEl) hintEl.textContent = '输入密码';
                        }, 300);
                    }
                }, 60);
            }
        }
    }

    // ---- 根据角色设定推算可能的密码 ----
    // 密码可能是：角色生日、用户生日、特殊纪念日（从设定中提取数字）
    function _cpGetPossiblePasscodes(contact) {
        var codes = [];
        var detail = (contact.roleDetail || '') + ' ' + (contact.userDetail || '');

        // 提取所有连续的数字串（4-8位）
        var numMatches = detail.match(/\d{4,8}/g) || [];
        numMatches.forEach(function(n) {
            // 取前6位或后6位
            if (n.length >= 6) codes.push(n.substring(0, 6));
            if (n.length > 6) codes.push(n.substring(n.length - 6));
            if (n.length === 4) codes.push(n + '00'); // 年份补零
        });

        // 提取日期格式（YYYYMMDD, MMDD, MM/DD, YYYY/MM/DD）
        var datePatterns = [
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,  // YYYY-MM-DD
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,  // MM-DD-YYYY
            /(\d{4})(\d{2})(\d{2})/g                      // YYYYMMDD
        ];
        datePatterns.forEach(function(pattern) {
            var m;
            var str = detail;
            pattern.lastIndex = 0;
            while ((m = pattern.exec(str)) !== null) {
                // 尝试各种6位组合
                var parts = [m[1], m[2], m[3]].map(function(p) { return p.padStart(2, '0'); });
                codes.push(parts.join('').substring(0, 6));
                codes.push((parts[0].substring(2) + parts[1] + parts[2]).substring(0, 6));
                codes.push((parts[1] + parts[2] + parts[0].substring(2)).substring(0, 6));
            }
        });

        // 过滤：只保留6位纯数字
        codes = codes.filter(function(c) { return /^\d{6}$/.test(c); });
        // 去重
        codes = Array.from(new Set(codes));

        return codes;
    }

    // ---- 询问角色密码 ----
    window.cpAskRoleForPassword = async function() {
        if (_cpAsking || !_cpContact) return;
        _cpAsking = true;
        _cpDebug('ask_begin');

        var btn = document.getElementById('cp-ask-role-btn');
        if (btn) btn.style.opacity = '0.5';

        // 隐藏之前的回复气泡
        var bubble = document.getElementById('cp-role-reply-bubble');
        var replyText = document.getElementById('cp-role-reply-text');
        if (bubble) bubble.style.display = 'none';

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            _cpDebug('ask_config_loaded', {
                hasApiUrl: !!apiUrl,
                hasApiKey: !!apiKey,
                hasModel: !!model
            });

            if (!apiUrl || !apiKey || !model) {
                // 没有配置API，角色直接拒绝
                _cpShowRoleReply(_cpGetFallbackRefusal(_cpContact));
                _cpDebug('ask_fallback_no_config');
                return;
            }

            var contact = _cpContact;
            var detail = contact.roleDetail || '';
            var userName = contact.userName || '用户';

            // 构建询问密码的prompt：角色根据人设决定是否透露
            var sysPrompt = '你是' + (contact.roleName || '对方') + '，' + (detail || '一个普通人') + '\n' +
                '【场景】' + userName + '正在试图查看你的手机，他/她问你手机密码是什么。\n' +
                '【要求】根据你的角色性格和当前关系，决定是否告诉对方密码。\n' +
                '- 如果你们关系亲密且你信任对方，可以暗示或透露密码（但不能直接说出6位数字，要用隐晦的方式提示，比如"你难道忘了吗，就是我们第一次见面那天"或"你猜猜，和我生日有关"）\n' +
                '- 如果你不信任对方或关系一般，坚决拒绝并质问为什么要查你手机\n' +
                '- 无论如何，绝对不能直接说出6位数字密码\n' +
                '- 回复要极度口语化、真实自然，像真人发消息一样简短，不超过50字';

            var messages = [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: '你手机密码是多少？' }
            ];

            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';
            _cpDebug('ask_request_start', { endpoint: endpoint });
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) throw new Error('API请求失败');
            var data = await response.json();
            var replyContent = data && data.choices && data.choices[0] && data.choices[0].message
                ? String(data.choices[0].message.content || '').trim()
                : '';
            if (!replyContent) {
                _cpDebug('ask_empty_reply_use_fallback');
                replyContent = _cpGetFallbackRefusal(_cpContact);
            }
            _cpShowRoleReply(replyContent);
            _cpDebug('ask_reply_done', { replyLength: replyContent.length });

        } catch(e) {
            console.warn('询问密码失败，已使用兜底回复', e);
            _cpShowRoleReply(_cpGetFallbackRefusal(_cpContact));
            _cpDebug('ask_exception_fallback', {
                message: e && e.message ? e.message : String(e)
            });
        } finally {
            _cpAsking = false;
            if (btn) btn.style.opacity = '1';
            _cpDebug('ask_end');
        }
    };

    // ---- 获取默认拒绝回复 ----
    function _cpGetFallbackRefusal(contact) {
        var refusals = [
            '你干嘛要看我手机？',
            '凭什么告诉你？',
            '不告诉你。',
            '你想干什么？',
            '这是我的隐私，不行。',
            '不可能告诉你的。'
        ];
        return refusals[Math.floor(Math.random() * refusals.length)];
    }

    // ---- 锁屏壁纸更换功能 ----
    window.cpChangeWallpaper = async function(event) {
        var file = event.target.files[0];
        if (!file || !_cpContact) {
            event.target.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            var wpBg = 'url(' + base64 + ') center/cover no-repeat';
            // 应用到锁屏和密码页壁纸
            ['cp-lock-wallpaper', 'cp-passcode-wallpaper'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.background = wpBg;
            });
            // 持久化保存
            var savedWallpaperKey = 'cp_wallpaper_' + _cpContact.id;
            try {
                await localforage.setItem(savedWallpaperKey, base64);
            } catch(err) { console.error('壁纸保存失败', err); }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // ---- 锁屏左下角星星按钮：切换自定义面板（操作查手机桌面壁纸/图标，不动锁屏壁纸）----
    window.toggleCpCustomPanel = function(e) {
        if (e) e.stopPropagation();
        var panel = document.getElementById('cp-custom-panel');
        if (!panel) return;
        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
            setTimeout(function() { panel.style.display = 'none'; }, 280);
        } else {
            panel.style.display = 'flex';
            // 填充查手机桌面图标按钮（10个）
            _cpInitIconRows();
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    panel.classList.add('show');
                });
            });
            // 面板本身阻止事件冒泡到锁屏层（防止触发上滑密码页）
            panel.addEventListener('click', function(ev) { ev.stopPropagation(); }, false);
            panel.addEventListener('touchstart', function(ev) { ev.stopPropagation(); }, false);
            panel.addEventListener('touchend', function(ev) { ev.stopPropagation(); }, false);
            panel.addEventListener('touchmove', function(ev) { ev.stopPropagation(); }, false);
            panel.addEventListener('mousedown', function(ev) { ev.stopPropagation(); }, false);
            panel.addEventListener('mouseup', function(ev) { ev.stopPropagation(); }, false);
        }
        // 点击锁屏其他地方关闭面板
        var lockScreen = document.getElementById('cp-lock-screen');
        if (lockScreen) {
            lockScreen.addEventListener('click', function closePanelOnBg(ev) {
                var panel2 = document.getElementById('cp-custom-panel');
                var starBtn = document.getElementById('cp-lock-star-btn');
                if (panel2 && !panel2.contains(ev.target) && ev.target !== starBtn && !starBtn.contains(ev.target)) {
                    panel2.classList.remove('show');
                    setTimeout(function() { panel2.style.display = 'none'; }, 280);
                    lockScreen.removeEventListener('click', closePanelOnBg);
                }
            });
        }
    };

    // ---- 初始化自定义面板中的10个查手机桌面图标按钮 ----
    // 注意：这里操作的是查手机桌面的 cp-desktop-icon-bg，不是主题页的 mainIcons！
    var _cpDesktopIconData = []; // 存储查手机桌面图标的base64数据

    function _cpInitIconRows() {
        var row1 = document.getElementById('cp-icon-row-1');
        var row2 = document.getElementById('cp-icon-row-2');
        var row3 = document.getElementById('cp-icon-row-3');
        if (!row1 || !row2) return;
        // ÿ�δ򿪶�������Ⱦ����Ϊͼ������Ѹ��£�
        row1.innerHTML = '';
        row2.innerHTML = '';
        if (row3) row3.innerHTML = '';

        // 查手机桌面图标的名称（对应桌面上的10个图标）
        var cpIconNames = ['备忘录', '相册', '音乐', '短视频', '资产', '购物', '浏览器', '私密空间', '电话', 'Chat'];

        for (var i = 0; i < 10; i++) {
            (function(idx) {
                var iconName = cpIconNames[idx] || ('图标' + (idx + 1));
                var item = document.createElement('div');
                item.className = 'cp-custom-item';

                var wrap = document.createElement('div');
                wrap.className = 'cp-custom-icon-wrap';

                // 显示已存储的查手机桌面图标；默认保持纯白空白位，避免桌面过挤
                var savedData = _cpDesktopIconData[idx];
                if (savedData) {
                    var img = document.createElement('img');
                    img.src = savedData;
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
                    wrap.appendChild(img);
                }

                var label = document.createElement('span');
                label.textContent = iconName;

                item.appendChild(wrap);
                item.appendChild(label);

                // 点击触发查手机桌面图标更换（不影响主题页图标）
                item.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    var fileInput = document.getElementById('cp-icon-input-' + idx);
                    if (fileInput) fileInput.click();
                });

                // 琛?: idx 0-3 (澶囧繕褰?鐩稿唽/闊充箰/鐭棰?
                // 琛?: idx 4-7 (璧勪骇/璐墿/娴忚鍣?绉佸瘑绌洪棿)
                // 琛?: idx 8-9 (鐢佃瘽/Chat)
                if (idx < 4) {
                    row1.appendChild(item);
                } else if (idx < 8) {
                    row2.appendChild(item);
                } else {
                    var row3 = document.getElementById('cp-icon-row-3');
                    if (row3) row3.appendChild(item);
                }
            })(i);
        }
    }

    // ---- 更换查手机桌面壁纸（解锁后全屏背景）----
    window.cpChangeDesktopWallpaper = async function(event) {
        var file = event.target.files[0];
        if (!file || !_cpContact) { event.target.value = ''; return; }
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            var bgStyle = 'url(' + base64 + ') center/cover no-repeat';
            var unlockedWp = document.getElementById('cp-unlocked-wallpaper');
            if (unlockedWp) unlockedWp.style.background = bgStyle;
            var bgKey = 'cp_desktop_wallpaper_' + _cpContact.id;
            try { await localforage.setItem(bgKey, base64); } catch(err) { console.error('桌面壁纸保存失败', err); }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // ---- 更换查手机角色信息卡背景图（cp-profile-bg）----
    window.cpChangeProfileBg = async function(event) {
        var file = event.target.files[0];
        if (!file || !_cpContact) { event.target.value = ''; return; }
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            var profileBg = document.getElementById('cp-profile-bg');
            if (profileBg) profileBg.style.background = 'url(' + base64 + ') center/cover no-repeat';
            var bgKey = 'cp_profile_bg_' + _cpContact.id;
            try { await localforage.setItem(bgKey, base64); } catch(err) { console.error('角色卡背景保存失败', err); }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // ---- 更换查手机桌面某个图标 ----
    window.cpChangeDesktopIcon = async function(event, idx) {
        var file = event.target.files[0];
        if (!file || !_cpContact) { event.target.value = ''; return; }
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            // 存储图标数据
            _cpDesktopIconData[idx] = base64;
            // 更新查手机桌面上对应的图标（cp-desktop-icon-bg，按行列顺序）
            // idx 0-7: desktop app icons (.cp-desktop-icon-bg), idx 8-9: Dock icons (.cp-dock-icon-bg)
            if (idx < 8) {
                var allIconBgs = document.querySelectorAll('#cp-unlocked-screen .cp-desktop-icon-bg');
                if (allIconBgs[idx]) {
                    allIconBgs[idx].style.background = 'url(' + base64 + ') center/cover no-repeat';
                    allIconBgs[idx].innerHTML = '';
                }
            } else {
                var dockIdx = idx - 8;
                var allDockBgs = document.querySelectorAll('#cp-unlocked-screen .cp-dock-icon-bg');
                if (allDockBgs[dockIdx]) {
                    allDockBgs[dockIdx].style.background = 'url(' + base64 + ') center/cover no-repeat';
                    allDockBgs[dockIdx].innerHTML = '';
                }
            }
            // 更新面板内图标预览
            _cpInitIconRows();
            // 持久化（按联系人隔离）
            var iconKey = 'cp_desktop_icon_' + _cpContact.id + '_' + idx;
            try { await localforage.setItem(iconKey, base64); } catch(err) { console.error('图标保存失败', err); }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // ---- 显示角色回复气泡 ----
    function _cpShowRoleReply(text) {
        var bubble = document.getElementById('cp-role-reply-bubble');
        var replyTextEl = document.getElementById('cp-role-reply-text');
        if (!bubble || !replyTextEl) return;
        replyTextEl.textContent = text;
        bubble.style.display = 'flex';
        // 滚动到底部
        var content = document.getElementById('cp-passcode-content');
        if (content) {
            setTimeout(function() { content.scrollTop = content.scrollHeight; }, 100);
        }
    }

})();



