// Auto-split from js/wallet/wallet-and-wechat.js (1270-2141)

// ====== 聊天详情页面逻辑 ======
(function() {
    // 当前联系人的详情设置存储键前缀
    var CD_KEY_PREFIX = 'cd_settings_';
    var SPECIAL_MESSAGE_PROBABILITY_VERSION = 3;
    const LEGACY_SPECIAL_MESSAGE_PROBABILITIES = Object.freeze({
        camera: 0.1,
        location: 0.1,
        takeaway: 0.1,
        gift: 0.1,
        call: 0.1,
        video_call: 0.1,
        red_packet: 3,
        transfer: 3,
        voice_message: 15,
        emoticon: 15,
        reply: 15,
        recall: 5,
        time_aware: 20
    });
    const DEFAULT_SPECIAL_MESSAGE_PROBABILITIES = Object.freeze({
        camera: 20,
        location: 20,
        takeaway: 20,
        gift: 20,
        call: 20,
        video_call: 20,
        red_packet: 20,
        transfer: 20,
        voice_message: 18,
        emoticon: 18,
        reply: 18,
        recall: 6,
        time_aware: 25
    });
    const ACTION_SPECIAL_MESSAGE_KEYS = ['camera', 'location', 'takeaway', 'gift', 'call', 'video_call', 'red_packet', 'transfer'];
    const ACTION_SPECIAL_MESSAGE_LABELS = Object.freeze({
        camera: '相片',
        location: '定位',
        takeaway: '外卖',
        gift: '礼物',
        call: '电话',
        video_call: '视频',
        red_packet: '红包',
        transfer: '转账'
    });
    const SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS = {
        camera: 'cd-prob-camera',
        location: 'cd-prob-location',
        takeaway: 'cd-prob-takeaway',
        gift: 'cd-prob-gift',
        call: 'cd-prob-call',
        video_call: 'cd-prob-video-call',
        red_packet: 'cd-prob-red-packet',
        transfer: 'cd-prob-transfer',
        voice_message: 'cd-prob-voice-message',
        emoticon: 'cd-prob-emoticon',
        reply: 'cd-prob-reply',
        recall: 'cd-prob-recall',
        time_aware: 'cd-prob-time-aware'
    };

    // 获取当前联系人的存储键
    function cdKey(field) {
        if (!activeChatContact) return null;
        return CD_KEY_PREFIX + activeChatContact.id + '_' + field;
    }

    function _normalizeProbabilityValue(raw, fallback) {
        var val = parseFloat(raw);
        if (!isFinite(val) || isNaN(val)) return fallback;
        if (val < 0) return 0;
        if (val > 100) return 100;
        return Math.round(val * 100) / 100;
    }

    function _formatProbabilityValue(val) {
        var normalized = _normalizeProbabilityValue(val, 0);
        return String(parseFloat(normalized.toFixed(2)));
    }

    function _getDefaultSpecialMessageProbabilities() {
        return JSON.parse(JSON.stringify(DEFAULT_SPECIAL_MESSAGE_PROBABILITIES));
    }

    function _isSameProbabilityConfig(a, b) {
        if (!a || !b) return false;
        return Object.keys(DEFAULT_SPECIAL_MESSAGE_PROBABILITIES).every(function(key) {
            return _normalizeProbabilityValue(a[key], 0) === _normalizeProbabilityValue(b[key], 0);
        });
    }

    function _normalizeSpecialMessageProbabilities(raw) {
        var normalized = _getDefaultSpecialMessageProbabilities();
        if (!raw || typeof raw !== 'object') return normalized;
        Object.keys(normalized).forEach(function(key) {
            normalized[key] = _normalizeProbabilityValue(raw[key], normalized[key]);
        });
        return normalized;
    }

    function _getActionSpecialProbabilityTotal(config) {
        return ACTION_SPECIAL_MESSAGE_KEYS.reduce(function(sum, key) {
            return sum + _normalizeProbabilityValue(config && config[key], 0);
        }, 0);
    }

    function _getSpecialProbabilityStorageKey(contact) {
        var target = contact || activeChatContact;
        return target ? (CD_KEY_PREFIX + target.id + '_special_message_probabilities') : '';
    }

    function _getSpecialProbabilityVersionKey(contact) {
        var target = contact || activeChatContact;
        return target ? (CD_KEY_PREFIX + target.id + '_special_message_probabilities_version') : '';
    }

    function _getActionSelectionProbabilityBreakdown(config) {
        var keys = ACTION_SPECIAL_MESSAGE_KEYS.slice();
        var weights = keys.map(function(key) {
            return _normalizeProbabilityValue(config && config[key], 0);
        });
        var hitProbabilities = weights.map(function(weight) {
            return weight / 100;
        });
        var selectedByKey = {};
        var anyProbability = 0;

        keys.forEach(function(key) {
            selectedByKey[key] = 0;
        });

        for (var mask = 1; mask < (1 << keys.length); mask++) {
            var subsetProbability = 1;
            var totalWeight = 0;
            for (var i = 0; i < keys.length; i++) {
                var isHit = !!(mask & (1 << i));
                subsetProbability *= isHit ? hitProbabilities[i] : (1 - hitProbabilities[i]);
                if (isHit) totalWeight += weights[i];
            }
            if (subsetProbability <= 0 || totalWeight <= 0) continue;
            anyProbability += subsetProbability;
            for (var j = 0; j < keys.length; j++) {
                if (!(mask & (1 << j))) continue;
                selectedByKey[keys[j]] += subsetProbability * (weights[j] / totalWeight);
            }
        }

        Object.keys(selectedByKey).forEach(function(key) {
            selectedByKey[key] = Math.round(selectedByKey[key] * 10000) / 100;
        });

        return {
            anyProbability: Math.round(anyProbability * 10000) / 100,
            selectedByKey: selectedByKey
        };
    }

    function _ensureSpecialProbabilityDetailEl() {
        var detailEl = document.getElementById('cd-prob-actual-summary');
        if (detailEl) return detailEl;
        var totalEl = document.getElementById('cd-prob-exclusive-total');
        if (!totalEl) return null;
        var headerRow = totalEl.closest('.cd-section-item');
        var gridWrap = headerRow ? headerRow.nextElementSibling : null;
        if (!gridWrap) return null;
        detailEl = document.createElement('div');
        detailEl.id = 'cd-prob-actual-summary';
        detailEl.style.cssText = 'margin-top:10px;font-size:11px;color:#8d8d8d;line-height:1.55;word-break:break-word;';
        gridWrap.appendChild(detailEl);
        return detailEl;
    }

    var _specialProbabilitySaveTimer = null;

    function _scheduleSpecialProbabilitySave() {
        if (!activeChatContact) return;
        if (_specialProbabilitySaveTimer) clearTimeout(_specialProbabilitySaveTimer);
        _specialProbabilitySaveTimer = setTimeout(function() {
            window.cdSaveSpecialProbabilities().catch(function(err) {
                console.error('保存特殊消息概率失败', err);
            });
        }, 120);
    }

    function _bindSpecialProbabilityInputs() {
        Object.keys(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS).forEach(function(key) {
            var el = document.getElementById(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS[key]);
            if (!el || el.dataset.cdProbBound === '1') return;
            el.dataset.cdProbBound = '1';
            el.addEventListener('input', function() {
                window.cdRefreshSpecialProbabilitySummary();
                _scheduleSpecialProbabilitySave();
            });
            el.addEventListener('change', function() {
                window.cdSaveSpecialProbabilities().catch(function(err) {
                    console.error('保存特殊消息概率失败', err);
                });
            });
        });
    }

    async function getContactSpecialMessageProbabilities(contact) {
        var target = contact || activeChatContact;
        if (!target) return _getDefaultSpecialMessageProbabilities();
        try {
            var key = _getSpecialProbabilityStorageKey(target);
            var versionKey = _getSpecialProbabilityVersionKey(target);
            var saved = await localforage.getItem(key);
            if (!saved) {
                var defaults = _getDefaultSpecialMessageProbabilities();
                try {
                    await localforage.setItem(key, defaults);
                    await localforage.setItem(versionKey, SPECIAL_MESSAGE_PROBABILITY_VERSION);
                } catch (_) {}
                return defaults;
            }
            var normalized = _normalizeSpecialMessageProbabilities(saved);
            var savedVersionRaw = await localforage.getItem(versionKey);
            var savedVersion = parseInt(savedVersionRaw, 10) || 0;
            if (savedVersion < SPECIAL_MESSAGE_PROBABILITY_VERSION && _isSameProbabilityConfig(normalized, LEGACY_SPECIAL_MESSAGE_PROBABILITIES)) {
                var defaults = _getDefaultSpecialMessageProbabilities();
                try {
                    await localforage.setItem(key, defaults);
                } catch (_) {}
                normalized = defaults;
            }
            if (savedVersion < SPECIAL_MESSAGE_PROBABILITY_VERSION) {
                try {
                    await localforage.setItem(versionKey, SPECIAL_MESSAGE_PROBABILITY_VERSION);
                } catch (_) {}
            }
            return normalized;
        } catch(e) {
            console.error('读取特殊消息概率失败', e);
            return _getDefaultSpecialMessageProbabilities();
        }
    }

    function _rollExclusiveSpecialMessageType(config) {
        var triggeredKeys = ACTION_SPECIAL_MESSAGE_KEYS.filter(function(key) {
            return Math.random() < (_normalizeProbabilityValue(config && config[key], 0) / 100);
        });
        if (!triggeredKeys.length) return '';
        if (triggeredKeys.length === 1) return triggeredKeys[0];
        var totalWeight = triggeredKeys.reduce(function(sum, key) {
            return sum + _normalizeProbabilityValue(config && config[key], 0);
        }, 0);
        if (totalWeight <= 0) return triggeredKeys[0];
        var roll = Math.random() * totalWeight;
        var cursor = 0;
        for (var i = 0; i < triggeredKeys.length; i++) {
            var key = triggeredKeys[i];
            cursor += _normalizeProbabilityValue(config && config[key], 0);
            if (roll < cursor) return key;
        }
        return triggeredKeys[triggeredKeys.length - 1];
    }

    function _getCurrentSpecialProbabilityInputConfig() {
        var config = _getDefaultSpecialMessageProbabilities();
        Object.keys(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS).forEach(function(key) {
            var el = document.getElementById(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS[key]);
            config[key] = _normalizeProbabilityValue(el ? el.value : config[key], config[key]);
        });
        return config;
    }

    function _renderSpecialProbabilityInputs(config) {
        _bindSpecialProbabilityInputs();
        Object.keys(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS).forEach(function(key) {
            var el = document.getElementById(SPECIAL_MESSAGE_PROBABILITY_INPUT_IDS[key]);
            if (el) el.value = _formatProbabilityValue(config[key]);
        });
        window.cdRefreshSpecialProbabilitySummary();
    }

    window._normalizeProbabilityValue = _normalizeProbabilityValue;
    window.getContactSpecialMessageProbabilities = getContactSpecialMessageProbabilities;
    window._rollExclusiveSpecialMessageType = _rollExclusiveSpecialMessageType;

    window.cdRefreshSpecialProbabilitySummary = function() {
        var totalEl = document.getElementById('cd-prob-exclusive-total');
        if (!totalEl) return;
        var config = _getCurrentSpecialProbabilityInputConfig();
        var total = _getActionSpecialProbabilityTotal(config);
        var breakdown = _getActionSelectionProbabilityBreakdown(config);
        totalEl.textContent = '动作型参考权重 ' + _formatProbabilityValue(total) + '% · 实际触发率 ' + _formatProbabilityValue(breakdown.anyProbability) + '%';
        totalEl.style.color = '#999';
        var detailEl = _ensureSpecialProbabilityDetailEl();
        if (!detailEl) return;
        if (breakdown.anyProbability <= 0) {
            detailEl.textContent = '动作型已全部关闭，当前只会走普通文本或你另外开放的语音、表情、引用、撤回逻辑。';
            return;
        }
        detailEl.textContent = '实际动作分流：' + ACTION_SPECIAL_MESSAGE_KEYS.map(function(key) {
            return ACTION_SPECIAL_MESSAGE_LABELS[key] + ' ' + _formatProbabilityValue(breakdown.selectedByKey[key]) + '%';
        }).join(' · ');
    };

    window.cdSaveSpecialProbabilities = async function() {
        if (!activeChatContact) return;
        var config = _getCurrentSpecialProbabilityInputConfig();
        window.cdRefreshSpecialProbabilitySummary();
        await localforage.setItem(_getSpecialProbabilityStorageKey(activeChatContact), config);
        await localforage.setItem(_getSpecialProbabilityVersionKey(activeChatContact), SPECIAL_MESSAGE_PROBABILITY_VERSION);
    };

    window.cdResetSpecialProbabilities = async function() {
        if (!activeChatContact) return;
        var defaults = _getDefaultSpecialMessageProbabilities();
        _renderSpecialProbabilityInputs(defaults);
        await localforage.setItem(_getSpecialProbabilityStorageKey(activeChatContact), defaults);
        await localforage.setItem(_getSpecialProbabilityVersionKey(activeChatContact), SPECIAL_MESSAGE_PROBABILITY_VERSION);
    };

    // 打开聊天详情页
    window.openChatDetail = async function() {
        if (!activeChatContact) return;
        var app = document.getElementById('chat-detail-app');
        if (!app) return;
        var appBody = app.querySelector('.app-body');

        // 填充角色头像
        var roleImg = document.getElementById('cd-role-avatar-img');
        if (roleImg) {
            if (typeof window.applySafeImageSource === 'function') {
                window.applySafeImageSource(roleImg, activeChatContact.roleAvatar || '');
            } else {
                roleImg.src = activeChatContact.roleAvatar || (window.defaultAvatarDataUri || whitePixel);
            }
        }
        // 填充我方头像
        var userImg = document.getElementById('cd-user-avatar-img');
        if (userImg) {
            if (typeof window.applySafeImageSource === 'function') {
                window.applySafeImageSource(userImg, activeChatContact.userAvatar || '');
            } else {
                userImg.src = activeChatContact.userAvatar || (window.defaultAvatarDataUri || whitePixel);
            }
        }

        // 填充角色名称标签：优先备注，否则用 roleName
        var remarkKeyForLabel = cdKey('remark');
        var remarkForLabel = remarkKeyForLabel ? await localforage.getItem(remarkKeyForLabel) : null;
        var roleLabel = document.getElementById('cd-role-name-label');
        if (roleLabel) {
            if (remarkForLabel && remarkForLabel !== '未设置') {
                roleLabel.textContent = remarkForLabel;
            } else {
                roleLabel.textContent = activeChatContact.roleName || '角色';
            }
        }

        // 填充用户名称标签：使用个人页面昵称（text-wechat-me-name）
        var userLabel = document.getElementById('cd-user-name-label');
        if (userLabel) {
            var myNameEl = document.getElementById('text-wechat-me-name');
            userLabel.textContent = myNameEl ? (myNameEl.textContent || '我') : '我';
        }

        // 恢复备注
        var remarkKey = cdKey('remark');
        var remark = remarkKey ? (await localforage.getItem(remarkKey) || '未设置') : '未设置';
        var remarkEl = document.getElementById('cd-remark-value');
        if (remarkEl) remarkEl.textContent = remark;

        // 恢复聊天壁纸预览
        var wallpaperKey = cdKey('wallpaper');
        var wallpaperSrc = wallpaperKey ? await localforage.getItem(wallpaperKey) : null;
        var wpPreview = document.getElementById('cd-wallpaper-preview');
        if (wpPreview) {
            if (wallpaperSrc) {
                wpPreview.style.backgroundImage = 'url(' + wallpaperSrc + ')';
            } else {
                wpPreview.style.backgroundImage = '';
                wpPreview.style.background = '#f0f0f0';
            }
        }

        // 恢复每轮回复条数
        var replyMinKey = cdKey('reply_min');
        var replyMaxKey = cdKey('reply_max');
        var replyMin = replyMinKey ? await localforage.getItem(replyMinKey) : null;
        var replyMax = replyMaxKey ? await localforage.getItem(replyMaxKey) : null;
        var minEl = document.getElementById('cd-reply-min');
        var maxEl = document.getElementById('cd-reply-max');
        if (minEl && replyMin !== null) minEl.value = replyMin;
        if (maxEl && replyMax !== null) maxEl.value = replyMax;
        _bindSpecialProbabilityInputs();
        _renderSpecialProbabilityInputs(await getContactSpecialMessageProbabilities(activeChatContact));

        // 恢复各开关状态
        var toggleKeys = ['time', 'memory', 'drama', 'keepalive', 'proactive', 'auto_summary'];
        for (var i = 0; i < toggleKeys.length; i++) {
            var tk = toggleKeys[i];
            var key = cdKey('toggle_' + tk);
            var val = key ? await localforage.getItem(key) : false;
            var toggleId = tk === 'auto_summary' ? 'cd-toggle-auto-summary' : ('cd-toggle-' + tk);
            var toggleEl = document.getElementById(toggleId);
            if (toggleEl) {
                if (val) {
                    toggleEl.classList.add('on');
                } else {
                    toggleEl.classList.remove('on');
                }
            }
        }

        // 恢复自动总结阈值
        var thresholdKey = cdKey('summary_threshold');
        var threshold = thresholdKey ? await localforage.getItem(thresholdKey) : null;
        var thresholdEl = document.getElementById('cd-summary-threshold');
        if (thresholdEl && threshold !== null) thresholdEl.value = threshold;

        // 恢复记忆展开区显示状态（CSS动画）
        var memoryOn = await localforage.getItem(cdKey('toggle_memory'));
        var memoryExpand = document.getElementById('cd-memory-expand');
        if (memoryExpand) {
            if (memoryOn) {
                memoryExpand.classList.add('open');
            } else {
                memoryExpand.classList.remove('open');
            }
        }

        // 恢复后台保活展开区显示状态
        var keepaliveOn = await localforage.getItem(cdKey('toggle_keepalive'));
        var keepaliveExpand = document.getElementById('cd-keepalive-expand');
        if (keepaliveExpand) {
            if (keepaliveOn) {
                keepaliveExpand.classList.add('open');
            } else {
                keepaliveExpand.classList.remove('open');
            }
        }

        // 恢复主动发消息展开区显示状态
        var proactiveOn = await localforage.getItem(cdKey('toggle_proactive'));
        var proactiveExpand = document.getElementById('cd-proactive-expand');
        if (proactiveExpand) {
            if (proactiveOn) {
                proactiveExpand.classList.add('open');
            } else {
                proactiveExpand.classList.remove('open');
            }
        }

        // 恢复后台保活间隔
        var kMinKey = cdKey('keepalive_min');
        var kMaxKey = cdKey('keepalive_max');
        var kMin = kMinKey ? await localforage.getItem(kMinKey) : null;
        var kMax = kMaxKey ? await localforage.getItem(kMaxKey) : null;
        var kMinEl = document.getElementById('cd-keepalive-min');
        var kMaxEl = document.getElementById('cd-keepalive-max');
        if (kMinEl && kMin !== null) kMinEl.value = kMin;
        if (kMaxEl && kMax !== null) kMaxEl.value = kMax;

        // 恢复后台保活活跃时段
        var keepaliveStartKey = cdKey('keepalive_active_start');
        var keepaliveEndKey = cdKey('keepalive_active_end');
        var keepaliveStart = keepaliveStartKey ? await localforage.getItem(keepaliveStartKey) : null;
        var keepaliveEnd = keepaliveEndKey ? await localforage.getItem(keepaliveEndKey) : null;
        var keepaliveStartEl = document.getElementById('cd-keepalive-start');
        var keepaliveEndEl = document.getElementById('cd-keepalive-end');
        if (keepaliveStartEl) keepaliveStartEl.value = (typeof keepaliveStart === 'string' && keepaliveStart) ? keepaliveStart : '00:00';
        if (keepaliveEndEl) keepaliveEndEl.value = (typeof keepaliveEnd === 'string' && keepaliveEnd) ? keepaliveEnd : '23:59';

        // 恢复主动发消息间隔设置
        var pMinKey = cdKey('proactive_min');
        var pMaxKey = cdKey('proactive_max');
        var pMin = pMinKey ? await localforage.getItem(pMinKey) : null;
        var pMax = pMaxKey ? await localforage.getItem(pMaxKey) : null;
        var pMinEl = document.getElementById('cd-proactive-min');
        var pMaxEl = document.getElementById('cd-proactive-max');
        if (pMinEl && pMin !== null) pMinEl.value = pMin;
        if (pMaxEl && pMax !== null) pMaxEl.value = pMax;

        // 恢复"打开页面立即发"开关
        var proactiveOnOpenKey = cdKey('toggle_proactive_onopen');
        var proactiveOnOpenVal = proactiveOnOpenKey ? await localforage.getItem(proactiveOnOpenKey) : false;
        var proactiveOnOpenToggle = document.getElementById('cd-toggle-proactive-onopen');
        if (proactiveOnOpenToggle) {
            if (proactiveOnOpenVal) {
                proactiveOnOpenToggle.classList.add('on');
            } else {
                proactiveOnOpenToggle.classList.remove('on');
            }
        }

        // 同步角色拉黑用户按钮状态
        updateRoleBlockUserBtn();

        if (appBody) appBody.scrollTop = 0;
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'chat-detail-app']);
        } else {
            app.style.display = 'flex';
        }
    };

    // 关闭聊天详情页
    window.closeChatDetail = function() {
        var app = document.getElementById('chat-detail-app');
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'role-profile-app']);
            return;
        }
        if (app) app.style.display = 'none';
    };

    // 切换开关
    window.cdToggle = async function(name) {
        if (!activeChatContact) return;
        var toggleId = name === 'auto_summary' ? 'cd-toggle-auto-summary' : ('cd-toggle-' + name);
        var toggleEl = document.getElementById(toggleId);
        if (!toggleEl) return;
        var isOn = toggleEl.classList.toggle('on');
        if (isOn && (name === 'keepalive' || name === 'proactive')) {
            // 在用户点击开关时立刻申请通知权限（用户手势上下文，成功率最高）
            if (typeof window._ensureBrowserNotificationPermission === 'function') {
                window._ensureBrowserNotificationPermission({ test: false }).catch(function(e) {
                    console.error('[通知] 权限申请失败', e);
                });
            }
        }
        var key = cdKey('toggle_' + name);
        if (key) await localforage.setItem(key, isOn);

        // 记忆与总结开关联动展开区（CSS动画）
        if (name === 'memory') {
            var memoryExpand = document.getElementById('cd-memory-expand');
            if (memoryExpand) {
                if (isOn) {
                    memoryExpand.classList.add('open');
                } else {
                    memoryExpand.classList.remove('open');
                }
            }
        }

        // 后台保活开关联动展开区
        if (name === 'keepalive') {
            var keepaliveExpand = document.getElementById('cd-keepalive-expand');
            if (keepaliveExpand) {
                if (isOn) {
                    keepaliveExpand.classList.add('open');
                } else {
                    keepaliveExpand.classList.remove('open');
                }
            }
        }

        // 主动发消息开关联动展开区
        if (name === 'proactive') {
            var proactiveExpand = document.getElementById('cd-proactive-expand');
            if (proactiveExpand) {
                if (isOn) {
                    proactiveExpand.classList.add('open');
                } else {
                    proactiveExpand.classList.remove('open');
                }
            }
        }

        // 备注改动后同步角色名标签
        if (name === 'remark') {
            // 重新同步 roleLabel（备注可能变化）
            var remarkKeyForLabel2 = cdKey('remark');
            var remarkForLabel2 = remarkKeyForLabel2 ? await localforage.getItem(remarkKeyForLabel2) : null;
            var roleLabel2 = document.getElementById('cd-role-name-label');
            if (roleLabel2) {
                if (remarkForLabel2 && remarkForLabel2 !== '未设置') {
                    roleLabel2.textContent = remarkForLabel2;
                } else {
                    roleLabel2.textContent = activeChatContact ? (activeChatContact.roleName || '角色') : '角色';
                }
            }
        }
    };

    function _normalizeTimeValue(timeVal, fallbackVal) {
        if (typeof timeVal !== 'string') return fallbackVal;
        var val = timeVal.trim();
        var m = /^(\d{1,2}):(\d{1,2})$/.exec(val);
        if (!m) return fallbackVal;
        var hh = parseInt(m[1], 10);
        var mm = parseInt(m[2], 10);
        if (isNaN(hh) || isNaN(mm)) return fallbackVal;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallbackVal;
        return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    // 保存后台保活间隔
    window.cdSaveKeepaliveInterval = async function() {
        if (!activeChatContact) return;
        var minEl = document.getElementById('cd-keepalive-min');
        var maxEl = document.getElementById('cd-keepalive-max');
        if (!minEl || !maxEl) return;
        var minVal = parseInt(minEl.value, 10);
        var maxVal = parseInt(maxEl.value, 10);
        if (isNaN(minVal)) minVal = 5;
        if (isNaN(maxVal)) maxVal = 20;
        if (minVal < 1) { minVal = 1; }
        if (maxVal < minVal) { maxVal = minVal; }
        minEl.value = minVal;
        maxEl.value = maxVal;
        var kMinKey = cdKey('keepalive_min');
        var kMaxKey = cdKey('keepalive_max');
        if (kMinKey) await localforage.setItem(kMinKey, minVal);
        if (kMaxKey) await localforage.setItem(kMaxKey, maxVal);
        if (typeof window._refreshKeepaliveTimer === 'function') {
            await window._refreshKeepaliveTimer(activeChatContact.id);
        }
    };

    // 保存后台保活每日活跃范围
    window.cdSaveKeepaliveActiveRange = async function() {
        if (!activeChatContact) return;
        var startEl = document.getElementById('cd-keepalive-start');
        var endEl = document.getElementById('cd-keepalive-end');
        if (!startEl || !endEl) return;
        var startVal = _normalizeTimeValue(startEl.value, '00:00');
        var endVal = _normalizeTimeValue(endEl.value, '23:59');
        startEl.value = startVal;
        endEl.value = endVal;
        var startKey = cdKey('keepalive_active_start');
        var endKey = cdKey('keepalive_active_end');
        if (startKey) await localforage.setItem(startKey, startVal);
        if (endKey) await localforage.setItem(endKey, endVal);
        if (typeof window._refreshKeepaliveTimer === 'function') {
            await window._refreshKeepaliveTimer(activeChatContact.id);
        }
    };

    // 立即触发一次后台保活
    window.cdTriggerKeepaliveNow = async function() {
        if (!activeChatContact) return;
        var labelEl = document.getElementById('cd-keepalive-trigger-label');
        var originalText = labelEl ? labelEl.textContent : '';
        if (labelEl) labelEl.textContent = '触发中...';
        try {
            if (typeof window._manualKeepaliveTrigger === 'function') {
                await window._manualKeepaliveTrigger(activeChatContact.id);
            } else {
                isReplying = false;
                await triggerRoleReply();
            }
        } catch (e) {
            console.error('[聊天详情] 立即触发保活失败', e);
        } finally {
            if (labelEl) labelEl.textContent = originalText || '立即触发一次';
        }
    };

    // 授权通知并发送测试横幅
    window.cdEnableBrowserNotification = async function() {
        if (typeof window._ensureBrowserNotificationPermission !== 'function') {
            alert('通知模块尚未就绪，请稍后重试。');
            return;
        }
        var res = await window._ensureBrowserNotificationPermission({ test: true, subscribePush: true });
        if (res && res.ok) {
            alert('通知权限已开启，已发送一条测试横幅，且已完成 Web Push 订阅。');
            return;
        }
        var reason = (res && res.reason) ? res.reason : 'unknown';
        if (reason === 'insecure_context') {
            alert('当前页面不是安全上下文，浏览器无法显示系统通知。请用 https 或 localhost 打开。');
        } else if (reason === 'denied') {
            alert('通知权限被拒绝了，请在浏览器地址栏/站点设置里手动允许通知。');
        } else if (reason === 'push_unsupported') {
            alert('当前浏览器不支持 Web Push，关闭浏览器后无法继续推送。');
        } else if (reason === 'push_server_unavailable') {
            alert('通知权限已给，但未连接到 Push 服务端。请先运行 push-server.js。');
        } else if (reason === 'unsupported') {
            alert('当前环境不支持浏览器通知。');
        } else if (reason === 'show_failed') {
            alert('通知权限已给，但系统横幅发送失败，请检查系统通知总开关和浏览器通知权限。');
        } else {
            alert('通知开启失败：' + reason);
        }
    };

    // 保存主动发消息间隔
    window.cdSaveProactiveInterval = async function() {
        if (!activeChatContact) return;
        var minEl = document.getElementById('cd-proactive-min');
        var maxEl = document.getElementById('cd-proactive-max');
        if (!minEl || !maxEl) return;
        var minVal = parseInt(minEl.value) || 10;
        var maxVal = parseInt(maxEl.value) || 40;
        if (minVal < 1) { minEl.value = 1; minVal = 1; }
        if (maxVal < minVal) { maxEl.value = minVal; maxVal = minVal; }
        var pMinKey = cdKey('proactive_min');
        var pMaxKey = cdKey('proactive_max');
        if (pMinKey) await localforage.setItem(pMinKey, minVal);
        if (pMaxKey) await localforage.setItem(pMaxKey, maxVal);
    };

    // 保存每轮回复条数
    window.cdSaveReplyCount = async function() {
        if (!activeChatContact) return;
        var minEl = document.getElementById('cd-reply-min');
        var maxEl = document.getElementById('cd-reply-max');
        if (!minEl || !maxEl) return;
        var minVal = parseInt(minEl.value) || 1;
        var maxVal = parseInt(maxEl.value) || 6;
        if (minVal < 1) { minEl.value = 1; minVal = 1; }
        if (maxVal < minVal) { maxEl.value = minVal; maxVal = minVal; }
        var replyMinKey = cdKey('reply_min');
        var replyMaxKey = cdKey('reply_max');
        if (replyMinKey) await localforage.setItem(replyMinKey, minVal);
        if (replyMaxKey) await localforage.setItem(replyMaxKey, maxVal);
    };

    // 保存自动总结阈值
    window.cdSaveSummaryThreshold = async function() {
        if (!activeChatContact) return;
        var el = document.getElementById('cd-summary-threshold');
        if (!el) return;
        var val = parseInt(el.value) || 30;
        if (val < 5) { el.value = 5; val = 5; }
        var key = cdKey('summary_threshold');
        if (key) await localforage.setItem(key, val);
    };

    // 立即总结
    window.cdDoSummaryNow = async function() {
        if (!activeChatContact) return;
        var apiUrl = await localforage.getItem('miffy_api_url');
        var apiKey = await localforage.getItem('miffy_api_key');
        var model = await localforage.getItem('miffy_api_model');
        if (!apiUrl || !apiKey || !model) {
            alert('请先在设置中配置 API 网址、密钥和模型。');
            return;
        }
        // 获取聊天记录
        var msgs = await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray();
        var offlineMsgs = [];
        try {
            var summaryOfflineDb = new Dexie('miniPhoneOfflineDB');
            summaryOfflineDb.version(1).stores({ messages: '++id, contactId, sender, content, timestamp' });
            offlineMsgs = await summaryOfflineDb.messages.where('contactId').equals(activeChatContact.id).toArray();
        } catch (offlineErr) {
            console.warn('读取线下记录失败', offlineErr);
            offlineMsgs = [];
        }
        var totalMsgCount = (msgs ? msgs.length : 0) + (offlineMsgs ? offlineMsgs.length : 0);
        if (totalMsgCount === 0) {
            alert('暂无聊天记录可供总结。');
            return;
        }
        // 总结前，如有上一条总结则先展示，避免重复总结
        var historyKeyPre = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
        var historyPre = (await localforage.getItem(historyKeyPre)) || [];
        if (historyPre.length > 0) {
            var lastSummary = historyPre[0];
            var previewText = '上次总结（' + lastSummary.time + '，共' + lastSummary.msgCount + '条消息）：\n\n' + lastSummary.content.substring(0, 300) + (lastSummary.content.length > 300 ? '...' : '');
            var doIt = confirm(previewText + '\n\n当前共 ' + totalMsgCount + ' 条消息（含线下记录），确定要重新总结吗？');
            if (!doIt) return;
        }
        // 构造消息列表
        var summaryPrompt = '现在暂停当前扮演身份，你即刻切换为聊天记录总结管理大师，以客观中立的第三人称视角，精准提炼本次对话核心内容；要求一针见血抓取关键信息，不添加多余废话，同时不做过度简略，需完整梳理双方的对话脉络、核心诉求、沟通细节、情绪态度与情感倾向，清晰呈现对话中的重点问题、达成的共识、存在的分歧以及关键互动节点，逻辑清晰、内容详实。线上聊天与线下见面属于同一段连续关系，如果两边互相影响或呼应，必须明确总结出来。';
        var onlineChatText = msgs.map(function(m) {
            var sender = m.sender === 'me' ? '用户' : (activeChatContact.roleName || '角色');
            var content = extractMsgPureText(m.content);
            return sender + '：' + content;
        }).join('\n');
        var offlineChatText = offlineMsgs.map(function(m) {
            var sender = m.sender === 'me' ? '用户' : (activeChatContact.roleName || '角色');
            return sender + '：' + String(m.content || '').trim();
        }).filter(function(line) {
            return !!line && !/：\s*$/.test(line);
        }).join('\n');
        var chatSections = [];
        if (onlineChatText) chatSections.push('【线上聊天】\n' + onlineChatText);
        if (offlineChatText) chatSections.push('【线下见面】\n' + offlineChatText);
        var chatText = chatSections.join('\n\n');
        var messages = [
            { role: 'system', content: summaryPrompt },
            { role: 'user', content: '以下是需要总结的完整记录（线上与线下视为同一段连续关系）：\n\n' + chatText }
        ];
        var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
        var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
        var endpoint = cleanApiUrl + '/v1/chat/completions';
        // 显示加载中
        var doSummaryBtn = document.querySelector('#cd-memory-expand .cd-section-item[onclick="cdDoSummaryNow()"]');
        var origLabel = '';
        if (doSummaryBtn) {
            var labelEl = doSummaryBtn.querySelector('.cd-item-label');
            if (labelEl) { origLabel = labelEl.textContent; labelEl.textContent = '总结中...'; }
        }
        try {
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });
            if (!response.ok) throw new Error('请求失败: ' + response.status);
            var data = await response.json();
            var summaryText = data.choices[0].message.content.trim();
            // 保存历史总结
            var historyKey = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
            var history = (await localforage.getItem(historyKey)) || [];
            var now = new Date();
            history.unshift({
                time: now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
                content: summaryText,
                msgCount: totalMsgCount
            });
            if (history.length > 20) history = history.slice(0, 20);
            await localforage.setItem(historyKey, history);
            alert('总结完成！\n\n' + summaryText.substring(0, 200) + (summaryText.length > 200 ? '...' : ''));
        } catch (e) {
            alert('总结失败: ' + e.message);
        } finally {
            if (doSummaryBtn) {
                var labelEl2 = doSummaryBtn.querySelector('.cd-item-label');
                if (labelEl2) labelEl2.textContent = origLabel || '立即总结';
            }
        }
    };

    // 打开历史总结
    window.cdOpenSummaryHistory = async function() {
        if (!activeChatContact) return;
        var modal = document.getElementById('cd-summary-history-modal');
        if (!modal) return;
        await _cdRenderSummaryHistory();
        modal.style.display = 'flex';
    };

    // 渲染历史总结列表（支持编辑/删除）
    async function _cdRenderSummaryHistory() {
        var listEl = document.getElementById('cd-summary-history-list');
        if (!listEl || !activeChatContact) return;
        listEl.innerHTML = '';
        var historyKey = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
        var history = (await localforage.getItem(historyKey)) || [];
        if (history.length === 0) {
            listEl.innerHTML = '<div style="color:#bbb; font-size:13px; text-align:center; margin-top:20px;">暂无历史总结</div>';
            return;
        }
        history.forEach(function(item, idx) {
            var card = document.createElement('div');
            card.style.cssText = 'background:#f9f9f9; border-radius:14px; padding:14px; border:1px solid #f0f0f0; display:flex; flex-direction:column; gap:8px; position:relative;';
            // 顶部：序号+时间+操作按钮
            var header = document.createElement('div');
            header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
            var titleSpan = document.createElement('span');
            titleSpan.style.cssText = 'font-size:12px; font-weight:600; color:#555;';
            titleSpan.textContent = '第 ' + (idx+1) + ' 次总结';
            var metaSpan = document.createElement('span');
            metaSpan.style.cssText = 'font-size:10px; color:#bbb;';
            metaSpan.textContent = item.time + ' · ' + item.msgCount + '条消息';
            var actions = document.createElement('div');
            actions.style.cssText = 'display:flex; gap:8px; align-items:center; flex-shrink:0; margin-left:8px;';
            // 编辑按钮
            var editBtn = document.createElement('span');
            editBtn.style.cssText = 'font-size:11px; color:#888; cursor:pointer; padding:2px 6px; background:#fff; border-radius:6px; border:1px solid #eee;';
            editBtn.textContent = '编辑';
            editBtn.onclick = (function(i) { return function() { _cdEditSummary(i); }; })(idx);
            // 删除按钮
            var delBtn = document.createElement('span');
            delBtn.style.cssText = 'font-size:11px; color:#d96a6a; cursor:pointer; padding:2px 6px; background:#fff; border-radius:6px; border:1px solid #f0c0c0;';
            delBtn.textContent = '删除';
            delBtn.onclick = (function(i) { return function() { _cdDeleteSummary(i); }; })(idx);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            var leftGroup = document.createElement('div');
            leftGroup.style.cssText = 'display:flex; flex-direction:column; gap:2px; flex:1;';
            leftGroup.appendChild(titleSpan);
            leftGroup.appendChild(metaSpan);
            header.appendChild(leftGroup);
            header.appendChild(actions);
            // 内容区（可编辑textarea，默认只读）
            var contentEl = document.createElement('div');
            contentEl.setAttribute('data-summary-idx', idx);
            contentEl.style.cssText = 'font-size:12px; color:#666; line-height:1.6; white-space:pre-wrap; word-break:break-all;';
            contentEl.textContent = item.content;
            card.appendChild(header);
            card.appendChild(contentEl);
            listEl.appendChild(card);
        });
    }

    // 编辑某条总结
    async function _cdEditSummary(idx) {
        if (!activeChatContact) return;
        var historyKey = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
        var history = (await localforage.getItem(historyKey)) || [];
        if (idx < 0 || idx >= history.length) return;
        var newContent = prompt('编辑总结内容：', history[idx].content);
        if (newContent === null) return;
        history[idx].content = newContent.trim() || history[idx].content;
        await localforage.setItem(historyKey, history);
        await _cdRenderSummaryHistory();
    }

    // 删除某条总结
    async function _cdDeleteSummary(idx) {
        if (!activeChatContact) return;
        if (!confirm('确定要删除这条总结吗？')) return;
        var historyKey = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
        var history = (await localforage.getItem(historyKey)) || [];
        history.splice(idx, 1);
        await localforage.setItem(historyKey, history);
        await _cdRenderSummaryHistory();
    }

    // 关闭历史总结弹窗
    window.cdCloseSummaryHistory = function() {
        var modal = document.getElementById('cd-summary-history-modal');
        if (modal) modal.style.display = 'none';
    };

    // 更改备注
    window.cdChangeRemark = async function() {
        if (!activeChatContact) return;
        var current = document.getElementById('cd-remark-value').textContent;
        var newRemark = prompt('请输入备注名称：', current === '未设置' ? '' : current);
        if (newRemark === null) return;
        var displayRemark = newRemark.trim() || '未设置';
        document.getElementById('cd-remark-value').textContent = displayRemark;
        var key = cdKey('remark');
        if (key) await localforage.setItem(key, displayRemark);
        // 计算显示名：有备注用备注，否则用 roleName
        var displayName = (displayRemark && displayRemark !== '未设置') ? displayRemark : (activeChatContact.roleName || '角色');
        // 1. 同步聊天详情页头像区角色名标签
        var roleLabel = document.getElementById('cd-role-name-label');
        if (roleLabel) roleLabel.textContent = displayName;
        // 2. 同步聊天窗口顶部标题
        var chatTitle = document.getElementById('chat-current-name');
        if (chatTitle && activeChatContact) chatTitle.textContent = displayName;
        // 3. 同步聊天列表中的显示名
        renderChatList();
        // 4. 同步角色主页名称（除联系人页面外，其余所有地方都覆盖角色名）
        var rpNameEl = document.getElementById('role-profile-name-text');
        if (rpNameEl) rpNameEl.textContent = displayName;
        // 5. 同步信息(SMS)应用列表中的显示名（如果当前SMS聊天窗口打开也同步顶部标题）
        var smsChatName = document.getElementById('sms-chat-name');
        if (smsChatName && activeChatContact) {
            // 仅当SMS聊天窗口当前显示的就是这个联系人时才同步
            var smsWin = document.getElementById('sms-chat-window');
            if (smsWin && smsWin.style.display === 'flex') {
                smsChatName.textContent = displayName;
            }
        }
    };

    // 更换聊天壁纸 - 点击触发文件选择
    window.cdChangeWallpaper = function() {
        document.getElementById('cd-wallpaper-input').click();
    };

    // 处理壁纸文件变更
    window.cdHandleWallpaperChange = async function(event) {
        var file = event.target.files[0];
        if (!file || !activeChatContact) return;
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            // 更新预览
            var wpPreview = document.getElementById('cd-wallpaper-preview');
            if (wpPreview) {
                wpPreview.style.backgroundImage = 'url(' + base64 + ')';
            }
            // 持久化
            var key = cdKey('wallpaper');
            if (key) await localforage.setItem(key, base64);
            // 应用到聊天窗口背景
            _applyChatWallpaper(base64);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // 将壁纸应用到聊天窗口
    function _applyChatWallpaper(src) {
        var chatBody = document.getElementById('chat-msg-container');
        if (chatBody) {
            if (src) {
                chatBody.style.background = 'url(' + src + ') center/cover no-repeat';
            } else {
                chatBody.style.background = '#f6f6f6';
            }
        }
    }

    // 更改角色头像 - 点击触发文件选择
    window.cdChangeRoleAvatar = function() {
        document.getElementById('cd-role-avatar-input').click();
    };

    // 处理角色头像文件变更
    window.cdHandleRoleAvatarChange = async function(event) {
        var file = event.target.files[0];
        if (!file || !activeChatContact) return;
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = await compressImageBase64(e.target.result, 400, 0.8);
            // 更新详情页头像显示
            var img = document.getElementById('cd-role-avatar-img');
            if (img) img.src = base64;
            // 更新联系人数据
            activeChatContact.roleAvatar = base64;
            try {
                await contactDb.contacts.update(activeChatContact.id, { roleAvatar: base64 });
            } catch(err) { console.error('更新角色头像失败', err); }
            // 更新角色主页头像
            var rpImg = document.getElementById('role-profile-avatar-img');
            if (rpImg) rpImg.src = base64;
            // 刷新聊天窗口中的头像
            if (document.getElementById('chat-window').style.display === 'flex') {
                await refreshChatWindow();
            }
            // 刷新聊天列表
            renderChatList();
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // 更改我方头像 - 点击触发文件选择
    window.cdChangeUserAvatar = function() {
        document.getElementById('cd-user-avatar-input').click();
    };

    // 处理我方头像文件变更
    window.cdHandleUserAvatarChange = async function(event) {
        var file = event.target.files[0];
        if (!file || !activeChatContact) return;
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = await compressImageBase64(e.target.result, 400, 0.8);
            // 更新详情页头像显示
            var img = document.getElementById('cd-user-avatar-img');
            if (img) img.src = base64;
            // 更新联系人数据
            activeChatContact.userAvatar = base64;
            try {
                await contactDb.contacts.update(activeChatContact.id, { userAvatar: base64 });
            } catch(err) { console.error('更新我方头像失败', err); }
            // 刷新聊天窗口中的头像
            if (document.getElementById('chat-window').style.display === 'flex') {
                await refreshChatWindow();
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // 进入聊天窗口时恢复该联系人的壁纸
    var _origEnterChatWindow = window.enterChatWindow;
    // 通过monkey-patch方式在enterChatWindow后恢复壁纸
    // 注意：不覆盖原函数，而是在原函数结束后追加壁纸恢复逻辑
    // 这里通过监听DOMContentLoaded后挂载一个后处理
    document.addEventListener('DOMContentLoaded', function() {
        _bindSpecialProbabilityInputs();
        // 当聊天窗口打开时，检查并应用该联系人的聊天壁纸
        // 通过MutationObserver监听chat-window的display变化
        var chatWin = document.getElementById('chat-window');
        if (!chatWin) return;
        var observer = new MutationObserver(async function(mutations) {
            for (var m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'style') {
                    if (chatWin.style.display === 'flex' && activeChatContact) {
                        var key = CD_KEY_PREFIX + activeChatContact.id + '_wallpaper';
                        var src = await localforage.getItem(key);
                        _applyChatWallpaper(src || null);
                    }
                }
            }
        });
        observer.observe(chatWin, { attributes: true });
    });

})();

