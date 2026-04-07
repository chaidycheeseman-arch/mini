// ====== 查手机功能逻辑 ======
(function() {
    'use strict';

    // 当前查看的联系人
    var _cpContact = null;
    // 密码输入状态
    var _cpPasscodeInput = '';
    // 是否正在询问角色
    var _cpAsking = false;
    // 锁屏时间更新定时器
    var _cpTimeTimer = null;

    // ---- 绑定"查手机"图标点击事件 ----
    document.addEventListener('DOMContentLoaded', function() {
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
                contacts.forEach(function(c) {
                    var item = document.createElement('div');
                    item.className = 'cp-contact-item';
                    // 获取显示名（备注优先）
                    var displayName = c.roleName || '未命名';
                    // 头像
                    var avatarHtml = c.roleAvatar
                        ? '<img src="' + c.roleAvatar + '" alt="">'
                        : '<span style="font-size:22px;color:#ccc;">👤</span>';
                    item.innerHTML = '<div class="cp-contact-avatar">' + avatarHtml + '</div>' +
                        '<div class="cp-contact-name">' + displayName + '</div>';
                    item.onclick = function() {
                        closeCheckphoneContactModal();
                        setTimeout(function() { openCheckphoneApp(c); }, 350);
                    };
                    grid.appendChild(item);
                });
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
        var innerApp = document.getElementById('cp-inner-app');
        if (!innerApp) return;

        // 获取显示名（备注优先）
        var displayName = _cpContact.roleName || '角色';
        try {
            var remark = await localforage.getItem('cd_settings_' + _cpContact.id + '_remark');
            if (remark && remark !== '未设置') displayName = remark;
        } catch(e) {}

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

    // ---- 刷新应用内页（调用AI生成内容）----
    window.cpRefreshInnerApp = async function() {
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
        await _cpFetchInnerAppContent(appName);
    };

    // ---- 渲染应用内容（先显示骨架，再异步请求AI）----
    function _cpRenderInnerApp(appName) {
        var body = document.getElementById('cp-inner-app-body');
        if (!body) return;
        // 显示加载骨架
        body.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">' +
            '<div style="height:14px;background:#e8e8e8;border-radius:7px;width:70%;animation:cpSkeletonPulse 1.2s infinite;"></div>' +
            '<div style="height:14px;background:#e8e8e8;border-radius:7px;width:90%;animation:cpSkeletonPulse 1.2s infinite 0.1s;"></div>' +
            '<div style="height:14px;background:#e8e8e8;border-radius:7px;width:55%;animation:cpSkeletonPulse 1.2s infinite 0.2s;"></div>' +
            '<div style="height:80px;background:#f0f0f0;border-radius:14px;margin-top:8px;animation:cpSkeletonPulse 1.2s infinite 0.15s;"></div>' +
            '<div style="height:14px;background:#e8e8e8;border-radius:7px;width:80%;animation:cpSkeletonPulse 1.2s infinite 0.3s;"></div>' +
            '<div style="height:14px;background:#e8e8e8;border-radius:7px;width:60%;animation:cpSkeletonPulse 1.2s infinite 0.4s;"></div>' +
            '</div>';
        // 注入骨架动画样式（只注入一次）
        if (!document.getElementById('cp-skeleton-style')) {
            var s = document.createElement('style');
            s.id = 'cp-skeleton-style';
            s.textContent = '@keyframes cpSkeletonPulse{0%,100%{opacity:0.6}50%{opacity:1}}';
            document.head.appendChild(s);
        }
        // 异步请求AI内容
        _cpFetchInnerAppContent(appName);
    }

    // ---- 调用AI生成应用内容 ----
    async function _cpFetchInnerAppContent(appName) {
        if (!_cpContact) return;
        var body = document.getElementById('cp-inner-app-body');
        if (!body) return;
        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            if (!apiUrl || !apiKey || !model) {
                body.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;margin-top:40px;letter-spacing:0.3px;">请先配置API才能查看内容</div>';
                return;
            }
            var detail = _cpContact.roleDetail || '';
            var roleName = _cpContact.roleName || '角色';
            // 根据不同应用生成不同内容
            var appPrompts = {
                '备忘录': '你是' + roleName + '（设定：' + detail + '），现在请以第一人称生成你手机备忘录中的3-5条备忘内容。内容要符合角色性格，真实自然，像真实的手机备忘录一样（可以是购物清单、提醒事项、随手记录等）。每条备忘单独一行，用简洁的文字。',
                '相册': '你是' + roleName + '（设定：' + detail + '），现在请描述你手机相册中最近的3-5张照片的内容（用文字描述每张照片拍了什么，什么时候拍的，有什么故事）。要符合角色性格，真实自然。',
                '音乐': '你是' + roleName + '（设定：' + detail + '），现在请列出你手机音乐播放列表中最近在听的5-8首歌（歌名 - 歌手），并说明你为什么喜欢这些歌。要符合角色性格。',
                '短视频': '你是' + roleName + '（设定：' + detail + '），现在请描述你最近在短视频平台上刷到的3-5个印象深刻的视频内容，以及你的反应和感受。要符合角色性格，真实自然。',
                '资产': '你是' + roleName + '（设定：' + detail + '），现在请描述你的资产情况，包括：大概的存款余额、最近的收支情况、有没有在理财等。内容要符合角色性格和背景，数字要具体真实。',
                '购物': '你是' + roleName + '（设定：' + detail + '），现在请列出你购物车或最近浏览的3-5件商品（商品名称、价格、你为什么想买），以及最近下单的1-2件商品。要符合角色性格。',
                '浏览器': '你是' + roleName + '（设定：' + detail + '），现在请描述你浏览器最近的历史记录中的3-5个网站/搜索内容，以及你为什么搜索这些。要符合角色性格，真实自然。',
                '私密空间': '你是' + roleName + '（设定：' + detail + '），你的手机有一个私密空间（加密文件夹）。请描述里面存放了什么内容（可以是私密照片、秘密文件、不想被人看到的东西等），以及为什么要藏起来。要符合角色性格，可以有一定神秘感。'
            };
            var prompt = appPrompts[appName] || ('你是' + roleName + '，请描述你手机' + appName + '应用中的内容。');
            var messages = [
                { role: 'system', content: '你是一个手机应用内容生成助手。请用自然、真实的方式生成手机应用内容，不要有任何格式标记，直接输出纯文本内容，换行用\\n表示。内容要简洁，符合真实手机应用的风格。' },
                { role: 'user', content: prompt }
            ];
            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });
            if (!response.ok) throw new Error('API请求失败: ' + response.status);
            var data = await response.json();
            var content = data.choices[0].message.content.trim();
            // 渲染内容
            body.innerHTML = '';
            var lines = content.split(/\n+/).filter(function(l) { return l.trim(); });
            lines.forEach(function(line, idx) {
                var p = document.createElement('div');
                p.style.cssText = 'font-size:13.5px;color:#333;line-height:1.7;padding:10px 14px;background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,0.04);border:1px solid #f5f5f5;';
                p.textContent = line.trim();
                body.appendChild(p);
            });
        } catch(e) {
            console.error('[查手机应用内页] AI请求失败', e);
            body.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;margin-top:40px;letter-spacing:0.3px;">内容加载失败，点击右上角刷新重试</div>';
        }
    }

    // ---- 打开手机检查页面 ----
    window.openCheckphoneApp = function(contact) {
        _cpContact = contact;
        _cpPasscodeInput = '';
        _cpAsking = false;

        var app = document.getElementById('checkphone-app');
        if (!app) return;
        app.style.display = 'flex';

        // 设置角色名
        var roleNameEl = document.getElementById('checkphone-role-name');
        if (roleNameEl) roleNameEl.textContent = (contact.roleName || '对方') + ' 的手机';

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
        if (passcodeNameEl) passcodeNameEl.textContent = contact.roleName || '对方';

        // 设置询问按钮的角色名
        var askRoleNameEl = document.getElementById('cp-ask-role-name');
        if (askRoleNameEl) askRoleNameEl.textContent = contact.roleName || '对方';

        // 设置AI回复头像
        var replyAvatarImg = document.getElementById('cp-role-reply-avatar-img');
        if (replyAvatarImg) replyAvatarImg.src = contact.roleAvatar || '';

        // 更新锁屏时间
        _cpUpdateLockTime();
        _cpTimeTimer = setInterval(_cpUpdateLockTime, 1000);

        // 设置锁屏通知文字
        var notifText = document.getElementById('cp-lock-notif-text');
        if (notifText) notifText.textContent = (contact.roleName || '对方') + ' 发来了消息';

        // 绑定上滑手势
        _cpBindSwipeGesture();
    };

    // ---- 关闭手机检查页面 ----
    window.closeCheckphoneApp = function() {
        var app = document.getElementById('checkphone-app');
        if (app) app.style.display = 'none';
        if (_cpTimeTimer) { clearInterval(_cpTimeTimer); _cpTimeTimer = null; }
        _cpContact = null;
        _cpPasscodeInput = '';
        _cpAsking = false;
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
            if (profileNameEl) profileNameEl.textContent = _cpContact.roleName || '角色';
            // 更新应用行标题（角色名/备注 · 应用名）
            var _cpDisplayName = _cpContact.remark || _cpContact.roleName || '角色';
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
                profileSigEl.onclick = function() {
                    var current = profileSigEl.textContent;
                    var newSig = prompt('输入个性签名：', current === '暂无个性签名' ? '' : current);
                    if (newSig !== null) {
                        var text = newSig.trim() || '暂无个性签名';
                        profileSigEl.textContent = text;
                        localforage.setItem(sigKey, text).catch(function(){});
                    }
                };
            }
            // 背景图（使用头像作为模糊背景，仅用于顶部信息卡片背景，不影响全屏壁纸）
            var profileBg = document.getElementById('cp-profile-bg');
            if (profileBg && _cpContact.roleAvatar) {
                profileBg.style.background = 'url(' + _cpContact.roleAvatar + ') center/cover no-repeat';
            }
            // 解锁后壁纸：保持深色渐变，不使用头像（避免头像铺满整个屏幕背景）
            // cp-unlocked-wallpaper 的 CSS 已定义为深色渐变，此处不做覆盖
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

            if (!apiUrl || !apiKey || !model) {
                // 没有配置API，角色直接拒绝
                _cpShowRoleReply(_cpGetFallbackRefusal(_cpContact));
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
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) throw new Error('API请求失败');
            var data = await response.json();
            var replyContent = data.choices[0].message.content.trim();
            _cpShowRoleReply(replyContent);

        } catch(e) {
            console.error('询问密码失败', e);
            _cpShowRoleReply(_cpGetFallbackRefusal(_cpContact));
        } finally {
            _cpAsking = false;
            if (btn) btn.style.opacity = '1';
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

                // 显示已存储的查手机桌面图标，若无则显示占位SVG
                var savedData = _cpDesktopIconData[idx];
                if (savedData) {
                    var img = document.createElement('img');
                    img.src = savedData;
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
                    wrap.appendChild(img);
                } else {
                    wrap.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
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



