// Memory Center app (replaces legacy Meetlove logic)
(function() {
    var memoryDb = new Dexie('miniPhoneMemoryCenterDB');
    memoryDb.version(1).stores({
        notes: '++id, contactId, createdAt, updatedAt',
        schedules: '++id, contactId, dateKey, startTime, updatedAt'
    });

    var whitePixel = window.whitePixel || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var state = {
        inited: false,
        tab: 'memory',
        dateKey: dateKey(new Date()),
        contactId: '',
        contactIndex: -1,
        contact: null,
        contacts: [],
        summaries: [],
        notes: [],
        schedules: [],
        online: [],
        offline: []
    };

    function esc(text) {
        return String(text || '').replace(/[&<>"']/g, function(ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function pad(num) { return String(num).padStart(2, '0'); }
    function dateKey(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
    function parseDate(key) {
        var m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function timeVal(value) {
        var m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return '';
        return pad(Math.max(0, Math.min(23, +m[1] || 0))) + ':' + pad(Math.max(0, Math.min(59, +m[2] || 0)));
    }
    function dt(ts) {
        var d = ts ? new Date(ts) : new Date();
        return dateKey(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function nl(text) { return esc(String(text || '').trim()).replace(/\n/g, '<br>'); }
    function short(text, len) {
        text = String(text || '').trim();
        return text.length > len ? (text.slice(0, len) + '...') : text;
    }
    function avatar(contact) { return contact && contact.roleAvatar ? contact.roleAvatar : whitePixel; }
    function summaryTs(item) {
        var raw = String(item && item.time || '').trim();
        var ms = raw ? Date.parse(raw.replace(/\./g, '-').replace(/\//g, '-').replace(/\s+/, 'T')) : 0;
        return isFinite(ms) ? ms : 0;
    }
    function schedTs(item) {
        var d = parseDate(item && item.dateKey);
        var t = timeVal(item && item.startTime);
        if (!d || !t) return 0;
        d.setHours(+t.slice(0, 2), +t.slice(3, 5), 0, 0);
        return d.getTime();
    }
    function relDay(key) {
        var d = parseDate(key) || new Date();
        var today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (diff === 0) return '今天';
        if (diff === 1) return '明天';
        if (diff === -1) return '昨天';
        return pad(d.getMonth() + 1) + '/' + pad(d.getDate());
    }

    async function readSummary(contactId) {
        try {
            var data = await localforage.getItem('cd_settings_' + contactId + '_summary_history');
            return Array.isArray(data) ? data.filter(function(item) { return item && item.content; }) : [];
        } catch (e) { return []; }
    }

    async function writeSummary(contactId, list) {
        await localforage.setItem('cd_settings_' + contactId + '_summary_history', Array.isArray(list) ? list : []);
    }

    async function remark(contactId) {
        try {
            var value = String(await localforage.getItem('cd_settings_' + contactId + '_remark') || '').trim();
            return value && value !== '未设置' ? value : '';
        } catch (e) { return ''; }
    }

    async function memoryEnabled(contactId) {
        try { return !!(await localforage.getItem('cd_settings_' + contactId + '_toggle_memory')); }
        catch (e) { return false; }
    }

    function archiveCount(contact) {
        if (!contact) return 0;
        return (contact.summaryCount || 0) + (contact.noteCount || 0);
    }

    async function persistSelectedContact(contactId) {
        try {
            await localforage.setItem('memory_center_selected_contact_id', String(contactId || ''));
        } catch (e) {}
    }

    function syncContactIndex() {
        if (!state.contacts.length) {
            state.contactId = '';
            state.contactIndex = -1;
            state.contact = null;
            return;
        }
        var index = state.contacts.findIndex(function(contact) {
            return String(contact.id) === String(state.contactId);
        });
        if (index < 0) index = 0;
        state.contactIndex = index;
        state.contact = state.contacts[index] || null;
        state.contactId = state.contact ? state.contact.id : '';
    }

    async function activateContactByIndex(index) {
        var total = state.contacts.length;
        if (!total) return;
        var nextIndex = ((index % total) + total) % total;
        if (nextIndex === state.contactIndex && state.contact) return;
        var nextContact = state.contacts[nextIndex];
        if (!nextContact) return;
        state.contactIndex = nextIndex;
        state.contact = nextContact;
        state.contactId = nextContact.id;
        await persistSelectedContact(nextContact.id);
        await loadCurrent();
        render();
    }

    async function activateContactById(contactId) {
        var index = state.contacts.findIndex(function(contact) {
            return String(contact.id) === String(contactId);
        });
        if (index < 0) return;
        await activateContactByIndex(index);
    }

    async function shiftContact(offset) {
        if (state.contacts.length < 2) return;
        var currentIndex = state.contactIndex >= 0 ? state.contactIndex : 0;
        await activateContactByIndex(currentIndex + offset);
    }

    function ensureStyle() {
        if (document.getElementById('mc-style')) return;
        var style = document.createElement('style');
        style.id = 'mc-style';
        style.textContent = `
#meetlove-app.mc-shell{display:none;flex-direction:column;background:linear-gradient(180deg,#f7f8fb,#eef2f6)!important;padding-top:0!important;overflow:hidden}
#meetlove-app.mc-shell .mc-head{position:relative;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 10px;background:transparent;border-bottom:none;backdrop-filter:none;-webkit-backdrop-filter:none}
#meetlove-app.mc-shell .mc-back,#meetlove-app.mc-shell .mc-top-btn,#meetlove-app.mc-shell .mc-chip-btn,#meetlove-app.mc-shell .mc-act,#meetlove-app.mc-shell .mc-empty-btn,#meetlove-app.mc-shell .mc-save,#meetlove-app.mc-shell .mc-cancel{border:0;cursor:pointer;font-family:inherit}
#meetlove-app.mc-shell .mc-back{position:relative;z-index:1;width:30px;height:30px;border-radius:0;background:transparent;color:#29312f;box-shadow:none;display:flex;align-items:center;justify-content:center}
#meetlove-app.mc-shell .mc-title{position:absolute;left:50%;transform:translateX(-50%);width:calc(100% - 168px);max-width:260px;min-width:0;text-align:center;pointer-events:none}.mc-title-main{font-size:20px;font-weight:760;color:#17212b;line-height:1.1}.mc-title-sub{font-size:11px;color:#6f7c8a;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:1.6px}
#meetlove-app.mc-shell .mc-top{position:relative;z-index:1;display:flex;gap:8px;margin-left:auto}.mc-top-btn{height:34px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:700}.mc-top-btn.ghost{background:rgba(255,255,255,.82);color:#556473}.mc-top-btn.main{background:#17212b;color:#fff;box-shadow:0 12px 24px rgba(23,33,43,.14)}
#meetlove-app.mc-shell .mc-strip{display:flex;padding:4px 18px 6px;flex-shrink:0}#meetlove-app.mc-shell .mc-strip::-webkit-scrollbar{display:none}
#meetlove-app.mc-shell .mc-role-stage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:8px;width:100%;touch-action:pan-y;-webkit-user-select:none;user-select:none}
#meetlove-app.mc-shell .mc-person{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;padding:0;border:0;background:transparent;box-shadow:none;min-width:0;flex-shrink:1}
#meetlove-app.mc-shell .mc-person-av{width:60px;height:60px;border-radius:999px;overflow:hidden;border:none;background:#e7ebf0;box-shadow:0 14px 32px rgba(22,33,45,.14);transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}.mc-person-av img{width:100%;height:100%;object-fit:cover;display:block}.mc-person-name{font-size:12px;font-weight:700;color:#1a2430;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}.mc-person-meta{font-size:10px;color:#7b8793;display:none}
#meetlove-app.mc-shell .mc-person.is-left,#meetlove-app.mc-shell .mc-person.is-right{opacity:.76}#meetlove-app.mc-shell .mc-person.is-left .mc-person-av,#meetlove-app.mc-shell .mc-person.is-right .mc-person-av{transform:scale(.8)}#meetlove-app.mc-shell .mc-person.is-left .mc-person-name,#meetlove-app.mc-shell .mc-person.is-right .mc-person-name{font-size:11px;color:#73808d}
#meetlove-app.mc-shell .mc-person.is-center .mc-person-av{width:98px;height:98px;box-shadow:0 20px 42px rgba(22,33,45,.18)}#meetlove-app.mc-shell .mc-person.is-center .mc-person-name{font-size:14px;font-weight:800}#meetlove-app.mc-shell .mc-person.is-center .mc-person-meta{display:block}
#meetlove-app.mc-shell .mc-person-placeholder{display:block;height:128px}
#meetlove-app.mc-shell .mc-body{flex:1;overflow-y:auto;padding:10px 18px calc(env(safe-area-inset-bottom,0px) + 28px);display:flex;flex-direction:column;gap:18px}
#meetlove-app.mc-shell .mc-hero{background:linear-gradient(180deg,#f9fbfd 0%,#edf3f8 100%);border:1px solid rgba(255,255,255,.9);border-radius:30px;padding:20px 18px 18px;color:#17212b;box-shadow:0 20px 44px rgba(23,33,43,.1)}.mc-hero-top{display:block}.mc-hero-av{width:60px;height:60px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.18)}.mc-hero-av img{width:100%;height:100%;object-fit:cover;display:block}.mc-hero-name{font-size:21px;font-weight:800;color:#17212b}.mc-hero-desc{font-size:12px;line-height:1.7;color:#617180;margin-top:7px}.mc-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.mc-chip{padding:7px 11px;border-radius:999px;background:#e7eef5;color:#556677;font-size:11px;font-weight:700}.mc-copy{margin-top:16px;padding:16px;border-radius:20px;background:rgba(255,255,255,.86);box-shadow:inset 0 0 0 1px rgba(23,33,43,.06);font-size:12px;line-height:1.8;color:#465767}.mc-hero-btns{display:flex;gap:10px;margin-top:16px}.mc-chip-btn{height:40px;padding:0 16px;border-radius:14px;font-size:12px;font-weight:800}.mc-chip-btn.light{background:#17212b;color:#fff;box-shadow:0 12px 24px rgba(23,33,43,.16)}.mc-chip-btn.clear{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.12)}
#meetlove-app.mc-shell .hide{display:none!important}.mc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mc-card,.mc-stat,.mc-line,.mc-date,.mc-item,.mc-empty,.mc-load{background:rgba(255,255,255,.9);border-radius:22px;border:1px solid rgba(23,33,43,.06);box-shadow:0 16px 36px rgba(21,32,45,.07)}.mc-stat{padding:16px 15px;min-height:92px}.mc-stat-v{font-size:22px;font-weight:900;color:#17212b}.mc-stat-l{font-size:11px;color:#7c8792;margin-top:6px}.mc-card{padding:18px}.mc-sec-title{font-size:14px;font-weight:800;color:#17212b}.mc-sec-desc{font-size:11px;color:#768493;margin-top:5px;line-height:1.6}
#meetlove-app.mc-shell .mc-lines{display:flex;flex-direction:column;gap:12px;margin-top:14px}.mc-line{display:flex;gap:10px;align-items:flex-start;padding:14px 15px}.mc-line-tag{height:22px;padding:0 8px;border-radius:999px;background:#eef2f6;color:#5b6874;font-size:10px;font-weight:800;display:inline-flex;align-items:center;flex-shrink:0}.mc-line-text{font-size:12px;color:#4a5b69;line-height:1.7}
#meetlove-app.mc-shell .mc-timeline{display:flex;flex-direction:column;gap:14px;margin-top:14px}.mc-mini{padding:16px;border-radius:20px;background:#fff}.mc-mini-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mc-badge{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:10px;font-weight:800}.mc-badge.sum{background:#eef4ff;color:#315fa3}.mc-badge.note{background:#f8f0de;color:#9a6720}.mc-meta{font-size:11px;color:#7a8795;margin-top:8px}.mc-mini-title{font-size:14px;font-weight:800;color:#17212b;margin-top:10px}.mc-mini-body{font-size:12px;line-height:1.8;color:#4a5a68;margin-top:10px}.mc-mini-act{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}.mc-act{height:28px;padding:0 10px;border-radius:10px;background:#f4f6f8;color:#566573;font-size:11px;font-weight:700}.mc-act.danger{background:#fff1f1;color:#c45656}
#meetlove-app.mc-shell .mc-dates{display:flex;gap:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}#meetlove-app.mc-shell .mc-dates::-webkit-scrollbar{display:none}.mc-date{min-width:76px;padding:12px 10px;text-align:center;flex-shrink:0;cursor:pointer}.mc-date.active{background:#17212b;color:#fff}.mc-date-top{font-size:10px;font-weight:800;opacity:.82}.mc-date-main{font-size:15px;font-weight:900;margin-top:4px}.mc-date-sub{font-size:10px;margin-top:4px;opacity:.72}
#meetlove-app.mc-shell .mc-list{display:flex;flex-direction:column;gap:12px}.mc-item{display:flex;gap:14px;align-items:flex-start;padding:16px}.mc-item-time{width:70px;flex-shrink:0}.mc-item-clock{font-size:19px;font-weight:900;color:#17212b;line-height:1}.mc-state{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:800;margin-top:8px}.mc-state.future{background:#eef2f6;color:#5b6874}.mc-state.soon{background:#fff4d7;color:#9a6a12}.mc-state.live{background:#e8f6ec;color:#2f7f4a}.mc-state.past{background:#f2f3f5;color:#95a0aa}.mc-item-title{font-size:14px;font-weight:800;color:#17212b}.mc-item-place{font-size:11px;color:#6e7d8c;margin-top:6px}.mc-item-note{font-size:12px;color:#4c5b69;line-height:1.7;margin-top:8px}
#meetlove-app.mc-shell .mc-empty,#meetlove-app.mc-shell .mc-load{padding:20px 18px;font-size:12px;line-height:1.7;color:#7b8793;text-align:center}.mc-empty-btn{margin-top:12px;height:38px;padding:0 16px;border-radius:12px;background:#17212b;color:#fff;font-size:12px;font-weight:800}
#meetlove-app.mc-shell .mc-editor{display:none;position:absolute;inset:0;background:rgba(8,13,18,.38);backdrop-filter:blur(10px);z-index:35;align-items:flex-end}.mc-editor.show{display:flex}.mc-editor-sheet{width:100%;background:#f9fbfd;border-radius:28px 28px 0 0;padding:14px 18px 18px}.mc-editor-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px}.mc-editor-title{font-size:17px;font-weight:800;color:#17212b}.mc-field{display:flex;flex-direction:column;gap:6px;margin-top:12px}.mc-field.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mc-field label{font-size:11px;font-weight:800;color:#687686}.mc-field input,.mc-field textarea{width:100%;box-sizing:border-box;border:1px solid rgba(23,33,43,.08);border-radius:16px;background:#fff;color:#17212b;padding:12px 14px;font-size:14px;outline:none;font-family:inherit}.mc-field textarea{resize:none;min-height:104px;line-height:1.7}.mc-editor-foot{display:flex;gap:10px;padding-top:14px}.mc-save,.mc-cancel{flex:1;height:44px;border-radius:14px;font-size:13px;font-weight:800}.mc-cancel{background:#eef2f6;color:#5a6977}.mc-save{background:#17212b;color:#fff}`;
        document.head.appendChild(style);
    }

    function buildShell() {
        var app = document.getElementById('meetlove-app');
        if (!app) return;
        app.className += ' mc-shell';
        app.innerHTML = `
<div class="mc-head"><button class="mc-back" data-mc="close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button><div class="mc-title"><div class="mc-title-main">记忆中枢</div><div class="mc-title-sub" id="mc-title-sub">把总结和手记放进同一个入口</div></div><div class="mc-top"><button class="mc-top-btn ghost" data-mc="refresh">刷新</button><button class="mc-top-btn main" id="mc-primary" data-mc="primary">新增手记</button></div></div>
<div class="mc-strip" id="mc-strip"></div>
<div class="mc-body"><div id="mc-hero"></div><div id="mc-memory"></div></div>
<div class="mc-editor" id="mc-editor"><div class="mc-editor-sheet"><div class="mc-editor-top"><div class="mc-editor-title" id="mc-editor-title">新增手记</div><button class="mc-act" data-mc="close-editor">关闭</button></div><div class="mc-field"><label for="mc-edit-title">标题</label><input id="mc-edit-title" type="text" placeholder="写一个醒目的标题"></div><div class="mc-field two hide" id="mc-time-row"><div><label for="mc-edit-date">日期</label><input id="mc-edit-date" type="date"></div><div><label for="mc-edit-time">时间</label><input id="mc-edit-time" type="time"></div></div><div class="mc-field hide" id="mc-place-row"><label for="mc-edit-place">地点</label><input id="mc-edit-place" type="text" placeholder="例如：咖啡店、公司楼下"></div><div class="mc-field"><label for="mc-edit-content" id="mc-edit-label">内容</label><textarea id="mc-edit-content" placeholder="把这条长期记忆写清楚。"></textarea></div><div class="mc-editor-foot"><button class="mc-cancel" data-mc="close-editor">取消</button><button class="mc-save" data-mc="save-editor">保存</button></div></div></div>`;
        app.style.display = 'none';
        var old = document.getElementById('ml-settings-modal');
        if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    function status(item) {
        var key = item && item.dateKey || '';
        var time = timeVal(item && item.startTime || '');
        var today = dateKey(new Date());
        if (!key || !time) return { label: '待定', cls: 'future' };
        if (key < today) return { label: '已过', cls: 'past' };
        if (key > today) return { label: '待进行', cls: 'future' };
        var now = Date.now();
        var start = schedTs(item);
        var end = start + 90 * 60 * 1000;
        if (now < start - 20 * 60 * 1000) return { label: '即将', cls: 'soon' };
        if (now <= end) return { label: '进行中', cls: 'live' };
        return { label: '已过', cls: 'past' };
    }

    function recentLines() {
        var name = state.contact ? (state.contact.displayName || state.contact.roleName || '角色') : '角色';
        var online = state.online.slice(-3).map(function(msg) {
            var text = typeof extractMsgPureText === 'function' ? extractMsgPureText(msg.content || '') : String(msg.content || '');
            text = String(text || '').trim();
            return text ? { tag: '线上', text: (msg.sender === 'me' ? '我' : name) + '：' + text } : null;
        }).filter(Boolean);
        var offline = state.offline.slice(-3).map(function(msg) {
            var text = String(msg.content || '').trim();
            return text ? { tag: '线下', text: (msg.sender === 'me' ? '我' : name) + '：' + text } : null;
        }).filter(Boolean);
        return online.concat(offline).slice(-5);
    }

    function timeline() {
        return state.summaries.map(function(item, index) {
            return {
                kind: 'summary',
                index: index,
                title: '对话总结',
                meta: String(item.time || '未知时间') + ' · ' + ((+item.msgCount) || 0) + ' 条消息',
                body: String(item.content || '').trim(),
                ts: summaryTs(item)
            };
        }).concat(state.notes.map(function(item) {
            return {
                kind: 'note',
                id: item.id,
                title: String(item.title || '手动手记').trim() || '手动手记',
                meta: dt(item.updatedAt || item.createdAt),
                body: String(item.content || '').trim(),
                ts: (+item.updatedAt) || (+item.createdAt) || 0
            };
        })).sort(function(a, b) { return b.ts - a.ts; });
    }

    function renderContacts() {
        var box = document.getElementById('mc-strip');
        if (!box) return;
        if (!state.contacts.length) {
            box.innerHTML = '<div class="mc-empty" style="width:100%;">还没有联系人。先创建角色，这里的记忆才有归档对象。<br><button class="mc-empty-btn" data-mc="open-editor-contact">添加联系人</button></div>';
            return;
        }
        var total = state.contacts.length;
        var currentIndex = state.contactIndex >= 0 ? state.contactIndex : 0;
        var slots = [null, null, null];
        if (total === 1) {
            slots[1] = state.contacts[currentIndex];
        } else if (total === 2) {
            if (currentIndex === 0) {
                slots[1] = state.contacts[0];
                slots[2] = state.contacts[1];
            } else {
                slots[0] = state.contacts[0];
                slots[1] = state.contacts[1];
            }
        } else {
            slots[0] = state.contacts[(currentIndex - 1 + total) % total];
            slots[1] = state.contacts[currentIndex];
            slots[2] = state.contacts[(currentIndex + 1) % total];
        }
        box.innerHTML = '<div class="mc-role-stage" data-mc-swipe="roles">' + slots.map(function(contact, index) {
            var slotName = index === 0 ? 'left' : (index === 1 ? 'center' : 'right');
            if (!contact) return '<span class="mc-person-placeholder is-' + slotName + '"></span>';
            return '<button class="mc-person is-' + slotName + (slotName === 'center' ? ' active' : '') + '" data-mc="pick" data-id="' + esc(contact.id) + '"><span class="mc-person-av"><img src="' + esc(avatar(contact)) + '" alt=""></span><span class="mc-person-name">' + esc(contact.displayName || contact.roleName || '未命名') + '</span><span class="mc-person-meta">' + archiveCount(contact) + ' 条归档</span></button>';
        }).join('') + '</div>';
    }

    function renderHero() {
        var box = document.getElementById('mc-hero');
        var title = document.getElementById('mc-title-sub');
        if (!box || !title) return;
        if (!state.contact) {
            title.textContent = '还没有可整理的角色记忆';
            box.innerHTML = '<div class="mc-empty">当前没有联系人。你可以先去联系人页创建角色，后续聊天总结、线下记录和手动手记都会自动按角色归档。<br><button class="mc-empty-btn" data-mc="open-editor-contact">去添加联系人</button></div>';
            return;
        }
        var latestItem = timeline()[0] || null;
        var latestText = latestItem && latestItem.body
            ? ('最近归档：' + short(String(latestItem.body || '').replace(/\s+/g, ' '), 96))
            : '还没有归档。你可以先在聊天详情里执行一次总结，或者先手动补几条关键记忆。';
        title.textContent = '当前角色：' + (state.contact.displayName || state.contact.roleName || '未命名');
        box.innerHTML = '<div class="mc-hero"><div class="mc-hero-top"><div><div class="mc-hero-name">' + esc(state.contact.displayName || state.contact.roleName || '未命名') + '</div><div class="mc-hero-desc">' + esc(short(state.contact.roleDetail || '这里会持续整理这个角色的对话总结、线下记录与手动补充的长期记忆。', 78)) + '</div></div></div><div class="mc-chips"><span class="mc-chip">总结 ' + state.summaries.length + '</span><span class="mc-chip">手记 ' + state.notes.length + '</span><span class="mc-chip">' + (state.contact.memoryEnabled ? '自动总结已开启' : '自动总结未开启') + '</span></div><div class="mc-copy">' + esc(latestText) + '</div><div class="mc-hero-btns"><button class="mc-chip-btn light" data-mc="chat">继续聊天</button></div></div>';
    }

    function renderMemory() {
        var box = document.getElementById('mc-memory');
        if (!box) return;
        if (!state.contact) {
            box.innerHTML = '<div class="mc-empty">还没有选中的联系人，记忆时间线暂时为空。</div>';
            return;
        }
        var lines = recentLines();
        var items = timeline();
        box.innerHTML = '<div class="mc-grid"><div class="mc-stat"><div class="mc-stat-v">' + state.summaries.length + '</div><div class="mc-stat-l">总结档案</div></div><div class="mc-stat"><div class="mc-stat-v">' + state.notes.length + '</div><div class="mc-stat-l">手动手记</div></div><div class="mc-stat"><div class="mc-stat-v">' + state.offline.length + '</div><div class="mc-stat-l">线下记录</div></div><div class="mc-stat"><div class="mc-stat-v">' + (state.online.length + state.offline.length) + '</div><div class="mc-stat-l">可追溯消息</div></div></div><div class="mc-card"><div class="mc-sec-title">最近片段</div><div class="mc-sec-desc">这里抓的是最近能快速定位关系状态的几段对话。</div>' + (lines.length ? '<div class="mc-lines">' + lines.map(function(item) { return '<div class="mc-line"><span class="mc-line-tag">' + esc(item.tag) + '</span><div class="mc-line-text">' + esc(short(item.text, 120)) + '</div></div>'; }).join('') + '</div>' : '<div class="mc-empty" style="margin-top:12px;">当前还没有足够的新近片段可展示。</div>') + '</div><div class="mc-card"><div class="mc-sec-title">记忆时间线</div><div class="mc-sec-desc">总结档案和手动手记统一排序，方便补档和修正。</div>' + (items.length ? '<div class="mc-timeline">' + items.map(function(item) { return '<div class="mc-mini"><div class="mc-mini-top"><div><span class="mc-badge ' + (item.kind === 'summary' ? 'sum' : 'note') + '">' + (item.kind === 'summary' ? '总结' : '手记') + '</span><div class="mc-meta">' + esc(item.meta) + '</div></div><div class="mc-mini-act">' + (item.kind === 'summary' ? '<button class="mc-act" data-mc="edit-summary" data-index="' + item.index + '">编辑</button><button class="mc-act danger" data-mc="del-summary" data-index="' + item.index + '">删除</button>' : '<button class="mc-act" data-mc="edit-note" data-id="' + item.id + '">编辑</button><button class="mc-act danger" data-mc="del-note" data-id="' + item.id + '">删除</button>') + '</div></div><div class="mc-mini-title">' + esc(item.title) + '</div><div class="mc-mini-body">' + nl(item.body) + '</div></div>'; }).join('') + '</div>' : '<div class="mc-empty" style="margin-top:12px;">还没有任何归档。可以先新增一条手记，或者去聊天详情生成总结。</div>') + '</div>';
    }

    function renderSchedule() {
        var box = document.getElementById('mc-schedule');
        if (!box) return;
        if (!state.contact) {
            box.innerHTML = '<div class="mc-empty">还没有选中的联系人，行程表暂时为空。</div>';
            return;
        }
        var days = [];
        for (var i = -1; i <= 7; i++) {
            var d = new Date();
            d.setDate(d.getDate() + i);
            days.push(dateKey(d));
        }
        if (days.indexOf(state.dateKey) === -1) { days.push(state.dateKey); days.sort(); }
        var todayList = state.schedules.filter(function(item) { return item.dateKey === state.dateKey; });
        var next = state.schedules.find(function(item) { return schedTs(item) >= Date.now() - 30 * 60 * 1000; }) || state.schedules[0];
        box.innerHTML = '<div class="mc-card"><div class="mc-sec-title">行程板</div><div class="mc-sec-desc">把已发生、正在发生和即将发生的安排固定下来，后续线下互动会按这里衔接。</div><div class="mc-chips"><span class="mc-chip" style="background:#eef2f6;color:#526170">' + esc((function(key){var d=parseDate(key)||new Date();return (d.getMonth()+1)+'月'+d.getDate()+'日 '+week[d.getDay()];})(state.dateKey)) + '</span><span class="mc-chip" style="background:#eef2f6;color:#526170">今日 ' + todayList.length + ' 条</span><span class="mc-chip" style="background:#eef2f6;color:#526170">总计 ' + state.schedules.length + ' 条</span></div><div class="mc-copy" style="margin-top:12px;background:#f5f7fa;color:#435363">' + esc(next ? ('下一条安排：' + relDay(next.dateKey) + ' ' + timeVal(next.startTime || '') + ' · ' + String(next.title || '').trim()) : '下一条安排：还没有写，可以直接新增。') + '</div></div><div class="mc-dates">' + days.map(function(key) { var d=parseDate(key)||new Date(); return '<button class="mc-date' + (key === state.dateKey ? ' active' : '') + '" data-mc="pick-day" data-key="' + key + '"><div class="mc-date-top">' + esc(relDay(key)) + '</div><div class="mc-date-main">' + pad(d.getMonth()+1) + '/' + pad(d.getDate()) + '</div><div class="mc-date-sub">' + esc(week[d.getDay()]) + '</div></button>'; }).join('') + '</div>' + (todayList.length ? '<div class="mc-list">' + todayList.map(function(item) { var st = status(item); return '<div class="mc-item"><div class="mc-item-time"><div class="mc-item-clock">' + esc(timeVal(item.startTime || '') || '--:--') + '</div><div class="mc-state ' + st.cls + '">' + esc(st.label) + '</div></div><div style="flex:1;min-width:0"><div class="mc-item-title">' + esc(item.title || '未命名行程') + '</div>' + (item.place ? '<div class="mc-item-place">地点：' + esc(item.place) + '</div>' : '') + (item.detail ? '<div class="mc-item-note">' + nl(item.detail) + '</div>' : '') + '</div><div class="mc-mini-act"><button class="mc-act" data-mc="edit-schedule" data-id="' + item.id + '">编辑</button><button class="mc-act danger" data-mc="del-schedule" data-id="' + item.id + '">删除</button></div></div>'; }).join('') + '</div>' : '<div class="mc-empty">这一天还没有安排。你可以先补一条见面、通话、出游或关键节点，后面线下剧情就有锚点了。</div>');
    }

    function renderLoading() {
        renderContacts();
        var hero = document.getElementById('mc-hero');
        var mem = document.getElementById('mc-memory');
        if (hero) hero.innerHTML = '<div class="mc-load">正在整理这个入口里的记忆和手记...</div>';
        if (mem) mem.innerHTML = '<div class="mc-load">记忆时间线加载中...</div>';
    }

    function render() {
        syncContactIndex();
        renderContacts();
        renderHero();
        renderMemory();
        var primary = document.getElementById('mc-primary');
        if (primary) primary.textContent = '新增手记';
    }

    async function loadContacts() {
        if (typeof contactDb === 'undefined' || !contactDb || !contactDb.contacts) { state.contacts = []; return; }
        var raw = await contactDb.contacts.toArray();
        raw = Array.isArray(raw) ? raw : [];
        state.contacts = await Promise.all(raw.map(async function(contact) {
            var summary = await readSummary(contact.id);
            var noteCount = await memoryDb.notes.where('contactId').equals(contact.id).count();
            var scheduleCount = await memoryDb.schedules.where('contactId').equals(contact.id).count();
            var name = await remark(contact.id);
            return {
                id: contact.id,
                roleName: contact.roleName || '未命名',
                displayName: name || contact.roleName || '未命名',
                roleAvatar: contact.roleAvatar || '',
                roleDetail: contact.roleDetail || '',
                summaryCount: summary.length,
                noteCount: noteCount,
                scheduleCount: scheduleCount,
                memoryEnabled: await memoryEnabled(contact.id)
            };
        }));
        state.contacts.sort(function(a, b) {
            var aw = archiveCount(a);
            var bw = archiveCount(b);
            return bw - aw || String(a.displayName || '').localeCompare(String(b.displayName || ''), 'zh-Hans-CN');
        });
    }

    async function chooseContact(preferActive) {
        var preferred = '';
        if (preferActive && typeof activeChatContact !== 'undefined' && activeChatContact && activeChatContact.id !== undefined && activeChatContact.id !== null) preferred = String(activeChatContact.id);
        if (!preferred && state.contactId) preferred = String(state.contactId);
        if (!preferred) {
            try { preferred = String(await localforage.getItem('memory_center_selected_contact_id') || ''); } catch (e) {}
        }
        var match = state.contacts.find(function(contact) { return String(contact.id) === preferred; }) || state.contacts[0] || null;
        state.contactId = match ? match.id : '';
        syncContactIndex();
        if (state.contact) await persistSelectedContact(state.contact.id);
    }

    async function loadCurrent() {
        state.summaries = [];
        state.notes = [];
        state.schedules = [];
        state.online = [];
        state.offline = [];
        if (!state.contact) return;
        var tasks = [
            readSummary(state.contact.id),
            memoryDb.notes.where('contactId').equals(state.contact.id).toArray(),
            memoryDb.schedules.where('contactId').equals(state.contact.id).toArray()
        ];
        if (typeof chatListDb !== 'undefined' && chatListDb && chatListDb.messages) tasks.push(chatListDb.messages.where('contactId').equals(state.contact.id).toArray());
        else tasks.push(Promise.resolve([]));
        try {
            var offlineDb = new Dexie('miniPhoneOfflineDB');
            offlineDb.version(1).stores({ messages: '++id, contactId, sender, content, timestamp' });
            tasks.push(offlineDb.messages.where('contactId').equals(state.contact.id).toArray());
        } catch (e) {
            tasks.push(Promise.resolve([]));
        }
        var rows = await Promise.all(tasks);
        state.summaries = rows[0] || [];
        state.notes = (rows[1] || []).sort(function(a, b) { return ((+b.updatedAt) || (+b.createdAt) || 0) - ((+a.updatedAt) || (+a.createdAt) || 0); });
        state.schedules = (rows[2] || []).sort(function(a, b) { return schedTs(a) - schedTs(b); });
        state.online = (rows[3] || []).filter(function(msg) { return msg && msg.source !== 'sms'; }).sort(function(a, b) { return ((+a.id) || 0) - ((+b.id) || 0); });
        state.offline = (rows[4] || []).sort(function(a, b) { return ((+a.timestamp) || 0) - ((+b.timestamp) || 0); });
    }

    async function refresh(preferActive) {
        renderLoading();
        await loadContacts();
        await chooseContact(preferActive);
        await loadCurrent();
        render();
    }

    function openEditor(mode, item) {
        if (!state.contact) { window.showMiniToast('请先选择一个联系人'); return; }
        state.editMode = mode;
        state.editId = item && item.id !== undefined ? item.id : null;
        var editor = document.getElementById('mc-editor');
        if (!editor) return;
        document.getElementById('mc-editor-title').textContent = mode === 'schedule' ? (item ? '编辑行程' : '新增行程') : (item ? '编辑手记' : '新增手记');
        document.getElementById('mc-edit-label').textContent = mode === 'schedule' ? '备注' : '内容';
        document.getElementById('mc-time-row').classList.toggle('hide', mode !== 'schedule');
        document.getElementById('mc-place-row').classList.toggle('hide', mode !== 'schedule');
        document.getElementById('mc-edit-title').value = item && item.title ? item.title : '';
        document.getElementById('mc-edit-date').value = item && item.dateKey ? item.dateKey : state.dateKey;
        document.getElementById('mc-edit-time').value = item && item.startTime ? timeVal(item.startTime) : '19:30';
        document.getElementById('mc-edit-place').value = item && item.place ? item.place : '';
        document.getElementById('mc-edit-content').value = mode === 'schedule' ? (item && item.detail ? item.detail : '') : (item && item.content ? item.content : '');
        editor.classList.add('show');
        setTimeout(function() { document.getElementById('mc-edit-title').focus(); }, 40);
    }

    function closeEditor() {
        state.editMode = '';
        state.editId = null;
        var editor = document.getElementById('mc-editor');
        if (editor) editor.classList.remove('show');
    }

    async function saveEditor() {
        if (!state.contact || !state.editMode) return;
        var title = String(document.getElementById('mc-edit-title').value || '').trim();
        var content = String(document.getElementById('mc-edit-content').value || '').trim();
        if (!title) { window.showMiniToast((state.editMode === 'schedule' ? '行程' : '手记') + '标题不能为空'); return; }
        if (state.editMode === 'schedule') {
            var key = String(document.getElementById('mc-edit-date').value || '').trim() || state.dateKey;
            var time = timeVal(document.getElementById('mc-edit-time').value || '');
            var place = String(document.getElementById('mc-edit-place').value || '').trim();
            if (!parseDate(key)) { window.showMiniToast('请填写有效日期'); return; }
            if (!time) { window.showMiniToast('请填写有效时间'); return; }
            var schedule = { contactId: state.contact.id, title: title, dateKey: key, startTime: time, place: place, detail: content, updatedAt: Date.now() };
            if (state.editId !== null && state.editId !== undefined) await memoryDb.schedules.update(state.editId, schedule);
            else { schedule.createdAt = Date.now(); await memoryDb.schedules.add(schedule); }
            state.dateKey = key;
            window.showMiniToast(state.editId !== null && state.editId !== undefined ? '行程已更新' : '行程已添加');
        } else {
            if (!content) { window.showMiniToast('手记内容不能为空'); return; }
            var note = { contactId: state.contact.id, title: title, content: content, updatedAt: Date.now() };
            if (state.editId !== null && state.editId !== undefined) await memoryDb.notes.update(state.editId, note);
            else { note.createdAt = Date.now(); await memoryDb.notes.add(note); }
            window.showMiniToast(state.editId !== null && state.editId !== undefined ? '手记已更新' : '手记已添加');
        }
        closeEditor();
        await refresh(false);
    }

    async function editSummary(index) {
        if (!state.contact) return;
        var list = await readSummary(state.contact.id);
        if (index < 0 || index >= list.length) return;
        var next = await window.showMiniPrompt('编辑这条总结：', list[index].content, { title: '编辑总结', multiline: true });
        if (next === null) return;
        next = String(next || '').trim();
        if (!next) { window.showMiniToast('总结内容不能为空'); return; }
        list[index].content = next;
        await writeSummary(state.contact.id, list);
        await refresh(false);
        window.showMiniToast('总结已更新');
    }

    async function delSummary(index) {
        if (!state.contact || !await window.showMiniConfirm('确定删除这条总结吗？')) return;
        var list = await readSummary(state.contact.id);
        if (index < 0 || index >= list.length) return;
        list.splice(index, 1);
        await writeSummary(state.contact.id, list);
        await refresh(false);
        window.showMiniToast('总结已删除');
    }

    async function toChat() {
        if (!state.contact || typeof enterChatWindow !== 'function') { window.showMiniToast('当前无法直接跳转聊天'); return; }
        closeMeetloveApp();
        await enterChatWindow(state.contact.id);
    }

    async function onAction(el) {
        var action = el.getAttribute('data-mc');
        if (action === 'close') { closeMeetloveApp(); return; }
        if (action === 'refresh') { await refresh(false); window.showMiniToast('记忆入口已刷新'); return; }
        if (action === 'primary') { openEditor('note', null); return; }
        if (action === 'tab') { return; }
        if (action === 'pick') {
            await activateContactById(el.getAttribute('data-id'));
            return;
        }
        if (action === 'pick-day') { state.dateKey = el.getAttribute('data-key') || state.dateKey; renderSchedule(); return; }
        if (action === 'chat') { await toChat(); return; }
        if (action === 'open-editor-contact') { closeMeetloveApp(); if (typeof openContactEditor === 'function') openContactEditor(); return; }
        if (action === 'close-editor') { closeEditor(); return; }
        if (action === 'save-editor') { await saveEditor(); return; }
        if (action === 'edit-summary') { await editSummary(+el.getAttribute('data-index')); return; }
        if (action === 'del-summary') { await delSummary(+el.getAttribute('data-index')); return; }
        if (action === 'edit-note') { var note = state.notes.find(function(item) { return String(item.id) === String(el.getAttribute('data-id')); }); if (note) openEditor('note', note); return; }
        if (action === 'del-note') { if (!await window.showMiniConfirm('确定删除这条手记吗？')) return; await memoryDb.notes.delete(+el.getAttribute('data-id')); await refresh(false); window.showMiniToast('手记已删除'); return; }
        if (action === 'edit-schedule') { var schedule = state.schedules.find(function(item) { return String(item.id) === String(el.getAttribute('data-id')); }); if (schedule) openEditor('schedule', schedule); return; }
        if (action === 'del-schedule') { if (!await window.showMiniConfirm('确定删除这条行程吗？')) return; await memoryDb.schedules.delete(+el.getAttribute('data-id')); await refresh(false); window.showMiniToast('行程已删除'); return; }
    }

    async function scheduleContext(contactId, options) {
        if (!contactId) return '';
        var list = await memoryDb.schedules.where('contactId').equals(contactId).toArray();
        list = (list || []).sort(function(a, b) { return schedTs(a) - schedTs(b); });
        if (!list.length) return '';
        var key = options && options.dateKey ? options.dateKey : dateKey(new Date());
        var today = list.filter(function(item) { return item.dateKey === key; });
        var upcoming = list.filter(function(item) { return item.dateKey >= key; }).slice(0, Math.max(3, +(options && options.limit) || 4));
        var blocks = [];
        if (today.length) blocks.push('【当日行程】\n' + today.map(function(item) { var line = timeVal(item.startTime || '') + ' ' + String(item.title || '').trim(); if (item.place) line += ' @ ' + String(item.place).trim(); if (item.detail) line += '（' + String(item.detail).trim().replace(/\s+/g, ' ') + '）'; return line; }).join('\n'));
        if (upcoming.length) blocks.push('【近期安排】\n' + upcoming.map(function(item) { var line = item.dateKey + ' ' + timeVal(item.startTime || '') + ' ' + String(item.title || '').trim(); if (item.place) line += ' @ ' + String(item.place).trim(); if (item.detail) line += '（' + String(item.detail).trim().replace(/\s+/g, ' ') + '）'; return line; }).join('\n'));
        return blocks.join('\n\n');
    }

    function bind() {
        var app = document.getElementById('meetlove-app');
        if (!app) return;
        var swipeState = { active: false, pointerId: null, startX: 0, startY: 0 };
        app.addEventListener('click', async function(event) {
            if (event.target.id === 'mc-editor') { closeEditor(); return; }
            var el = event.target.closest('[data-mc]');
            if (!el || !app.contains(el)) return;
            event.preventDefault();
            await onAction(el);
        });
        app.addEventListener('pointerdown', function(event) {
            var stage = event.target.closest('[data-mc-swipe="roles"]');
            if (!stage || !app.contains(stage)) return;
            swipeState.active = true;
            swipeState.pointerId = event.pointerId;
            swipeState.startX = event.clientX;
            swipeState.startY = event.clientY;
        });
        app.addEventListener('pointercancel', function(event) {
            if (swipeState.pointerId !== event.pointerId) return;
            swipeState.active = false;
            swipeState.pointerId = null;
        });
        app.addEventListener('pointerup', async function(event) {
            if (!swipeState.active || swipeState.pointerId !== event.pointerId) return;
            var dx = event.clientX - swipeState.startX;
            var dy = event.clientY - swipeState.startY;
            swipeState.active = false;
            swipeState.pointerId = null;
            if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return;
            await shiftContact(dx < 0 ? 1 : -1);
        });
        var icon = document.getElementById('app-btn-meetlove');
        if (icon) {
            icon.onclick = function(e) {
                if (e) e.stopPropagation();
                openMeetloveApp();
            };
        }
    }

    function init() {
        if (state.inited) return;
        ensureStyle();
        buildShell();
        bind();
        state.inited = true;
    }

    window.getMemoryCenterScheduleContextText = scheduleContext;
    window.switchMeetloveTab = function() { state.tab = 'memory'; render(); };
    window.openMeetloveApp = function() {
        init();
        var app = document.getElementById('meetlove-app');
        if (!app) return;
        app.style.display = 'flex';
        refresh(true);
    };
    window.closeMeetloveApp = function() {
        closeEditor();
        var app = document.getElementById('meetlove-app');
        if (app) app.style.display = 'none';
    };
    try { openMeetloveApp = window.openMeetloveApp; } catch (e) {}
    try { closeMeetloveApp = window.closeMeetloveApp; } catch (e) {}
    try { switchMeetloveTab = window.switchMeetloveTab; } catch (e) {}

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
