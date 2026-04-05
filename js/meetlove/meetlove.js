// Auto-split from js/meetlove/meetlove-and-offline.js (1-488)

// ====== 遇恋应用完整功能逻辑补丁 ======
(function() {
// ====== 遇恋个人资料编辑弹窗 HTML 注入 ======
(function injectMlEditModal() {
    if (document.getElementById('ml-edit-modal')) return;
    var modal = document.createElement('div');
    modal.id = 'ml-edit-modal';
    modal.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:500;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);justify-content:center;align-items:flex-end;';
    modal.innerHTML = `
    <div id="ml-edit-sheet" style="width:100%;background:#fff;border-radius:24px 24px 0 0;padding:0 0 env(safe-area-inset-bottom,20px);transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:center;padding:12px 0 4px;position:sticky;top:0;background:#fff;z-index:2;">
            <div style="width:36px;height:4px;border-radius:2px;background:#eee;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 22px 12px;position:sticky;top:20px;background:#fff;z-index:2;border-bottom:1px solid #f5f5f5;">
            <div style="font-size:17px;font-weight:700;color:#222;">编辑资料</div>
            <div onclick="mlCloseEditModal()" style="color:#bbb;font-size:24px;cursor:pointer;line-height:1;font-weight:300;">×</div>
        </div>
        <div style="padding:16px 22px 24px;display:flex;flex-direction:column;gap:14px;">
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">昵称</div>
                <input id="ml-edit-name" type="text" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="输入昵称">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">年龄</div>
                <input id="ml-edit-age" type="number" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="输入年龄" min="18" max="99">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">性别</div>
                <div style="display:flex;gap:10px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;background:#f9f9f9;border:1px solid #f0f0f0;border-radius:12px;flex:1;justify-content:center;"><input type="radio" name="ml-edit-gender" value="女" style="accent-color:#e91e63;"> <span style="font-size:13px;color:#555;">女</span></label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;background:#f9f9f9;border:1px solid #f0f0f0;border-radius:12px;flex:1;justify-content:center;"><input type="radio" name="ml-edit-gender" value="男" style="accent-color:#e91e63;"> <span style="font-size:13px;color:#555;">男</span></label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;background:#f9f9f9;border:1px solid #f0f0f0;border-radius:12px;flex:1;justify-content:center;"><input type="radio" name="ml-edit-gender" value="其他" style="accent-color:#e91e63;"> <span style="font-size:13px;color:#555;">其他</span></label>
                </div>
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">个人简介</div>
                <textarea id="ml-edit-bio" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:13px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;resize:none;height:80px;line-height:1.6;font-family:inherit;" placeholder="介绍一下自己..."></textarea>
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">城市</div>
                <input id="ml-edit-city" type="text" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="所在城市">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">身高 (cm)</div>
                <input id="ml-edit-height" type="number" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="例如 163">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">学历</div>
                <select id="ml-edit-edu" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;appearance:none;">
                    <option value="高中">高中</option>
                    <option value="大专">大专</option>
                    <option value="本科" selected>本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                </select>
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">职业</div>
                <input id="ml-edit-job" type="text" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="例如 设计师">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">出生年份</div>
                <input id="ml-edit-birth" type="number" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="例如 2002" min="1960" max="2010">
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">寻找目标</div>
                <select id="ml-edit-goal" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;appearance:none;">
                    <option value="寻找恋爱" selected>寻找恋爱</option>
                    <option value="寻找友谊">寻找友谊</option>
                    <option value="随缘">随缘</option>
                    <option value="认识新朋友">认识新朋友</option>
                </select>
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:500;letter-spacing:0.5px;">兴趣标签（用逗号分隔）</div>
                <input id="ml-edit-tags" type="text" style="width:100%;border:1px solid #f0f0f0;border-radius:14px;padding:10px 14px;font-size:14px;color:#333;background:#f9f9f9;outline:none;box-sizing:border-box;" placeholder="例如 音乐,读书,旅行">
            </div>
            <div onclick="mlSaveEditProfile()" style="width:100%;height:50px;background:linear-gradient(135deg,#f48fb1,#e91e63);border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;cursor:pointer;margin-top:4px;box-shadow:0 8px 20px rgba(233,30,99,0.3);transition:opacity 0.2s;" onmousedown="this.style.opacity='0.85'" onmouseup="this.style.opacity='1'">
                保存资料
            </div>
        </div>
    </div>`;
    modal.onclick = function(e) { if (e.target === modal) mlCloseEditModal(); };
    var app = document.getElementById('meetlove-app');
    if (app) app.appendChild(modal);
    else document.body.appendChild(modal);
})();
var _mlNpcs = [
    { id: 0, name: '小鹿', age: 22, tags: ['音乐', '读书'], color: 'linear-gradient(135deg,#fce4ec,#f48fb1)', online: true },
    { id: 1, name: '晴天', age: 24, tags: ['绘画', '旅行'], color: 'linear-gradient(135deg,#e8eaf6,#9fa8da)', online: true },
    { id: 2, name: '暖暖', age: 21, tags: ['美食', '萌宠'], color: 'linear-gradient(135deg,#e0f7fa,#80deea)', online: false },
    { id: 3, name: '糖糖', age: 23, tags: ['舞蹈', '电影'], color: 'linear-gradient(135deg,#f3e5f5,#ce93d8)', online: true },
    { id: 4, name: '微澜', age: 25, tags: ['摄影', '运动'], color: 'linear-gradient(135deg,#fff8e1,#ffcc80)', online: false },
    { id: 5, name: '云朵', age: 20, tags: ['养生', '咖啡'], color: 'linear-gradient(135deg,#e8f5e9,#a5d6a7)', online: true },
    { id: 6, name: '夏至', age: 26, tags: ['设计', '旅行'], color: 'linear-gradient(135deg,#fce4ec,#e91e63)', online: true },
    { id: 7, name: '星辰', age: 22, tags: ['音乐', '电影'], color: 'linear-gradient(135deg,#e3f2fd,#42a5f5)', online: false },
    { id: 8, name: '若曦', age: 23, tags: ['读书', '咖啡'], color: 'linear-gradient(135deg,#f9fbe7,#aed581)', online: true },
    { id: 9, name: '沐风', age: 24, tags: ['运动', '摄影'], color: 'linear-gradient(135deg,#fff3e0,#ff8a65)', online: false }
];
var _mlUserLiked = [];
var _mlUserStarred = [];
var _mlNpcLiked = [];
var _mlNpcStarred = [];
var _mlBeingLikedCount = 128;
var _mlBeingLikedTimer = null;
var _mlMatchIdx = 0;

async function _mlLoad() {
    try {
        var ul = await localforage.getItem('ml_user_liked'); if (ul) _mlUserLiked = ul;
        var us = await localforage.getItem('ml_user_starred'); if (us) _mlUserStarred = us;
        var nl = await localforage.getItem('ml_npc_liked'); if (nl) _mlNpcLiked = nl;
        var ns = await localforage.getItem('ml_npc_starred'); if (ns) _mlNpcStarred = ns;
        var bc = await localforage.getItem('ml_being_liked'); if (bc !== null && bc !== undefined) _mlBeingLikedCount = bc;
        var avatar = await localforage.getItem('ml_profile_avatar');
        if (avatar) { var img = document.getElementById('ml-profile-avatar-img'); if (img) img.src = avatar; }
    } catch(e) {}
}

function _mlSave() {
    try {
        localforage.setItem('ml_user_liked', _mlUserLiked);
        localforage.setItem('ml_user_starred', _mlUserStarred);
        localforage.setItem('ml_npc_liked', _mlNpcLiked);
        localforage.setItem('ml_npc_starred', _mlNpcStarred);
        localforage.setItem('ml_being_liked', _mlBeingLikedCount);
    } catch(e) {}
}

function _mlMutualCount() {
    return _mlUserLiked.filter(function(id) { return _mlNpcLiked.indexOf(id) !== -1; }).length;
}

function _mlSuperCount() {
    return _mlUserStarred.filter(function(id) { return _mlNpcStarred.indexOf(id) !== -1; }).length;
}

function _mlUpdateStats() {
    var items = document.querySelectorAll('.ml-stat-item .ml-stat-num');
    if (items[0]) items[0].textContent = _mlBeingLikedCount;
    if (items[1]) items[1].textContent = _mlMutualCount();
    if (items[2]) items[2].textContent = _mlSuperCount();
}

function _mlStartBeingLikedTimer() {
    if (_mlBeingLikedTimer) clearInterval(_mlBeingLikedTimer);
    _mlBeingLikedTimer = setInterval(function() {
        var delta = Math.floor(Math.random() * 5) - 2;
        _mlBeingLikedCount = Math.max(0, _mlBeingLikedCount + delta);
        _mlSave();
        _mlUpdateStats();
    }, 8000 + Math.random() * 7000);
}

function _mlRenderHall() {
    var grid = document.getElementById('ml-user-grid');
    if (!grid) return;
    grid.innerHTML = '';
    _mlNpcs.forEach(function(npc) {
        var card = document.createElement('div');
        card.className = 'ml-user-card';
        var tagsHtml = npc.tags.map(function(t) { return '<span class="ml-card-tag">' + t + '</span>'; }).join('');
        var onlineDot = npc.online ? '<div class="ml-card-online-dot"></div>' : '';
        card.innerHTML = '<div class="ml-card-img" style="background:' + npc.color + ';"></div><div class="ml-card-info"><div class="ml-card-name">' + npc.name + ' <span class="ml-card-age">' + npc.age + '</span></div><div class="ml-card-tags">' + tagsHtml + '</div></div>' + onlineDot;
        grid.appendChild(card);
    });
}

function _mlRenderMatchCard() {
    var npc = _mlNpcs[_mlMatchIdx % _mlNpcs.length];
    var card = document.getElementById('ml-match-card');
    if (!card) return;
    var bg = card.querySelector('.ml-match-card-bg');
    var content = card.querySelector('.ml-match-card-content');
    if (bg) bg.style.background = npc.color;
    if (content) {
        var nameEl = content.querySelector('.ml-match-name');
        if (nameEl) nameEl.innerHTML = npc.name + ' <span class="ml-match-age-badge">' + npc.age + '</span>';
        var tagsRow = content.querySelector('.ml-match-tags-row');
        if (tagsRow) tagsRow.innerHTML = npc.tags.map(function(t) { return '<span class="ml-match-tag">' + t + '</span>'; }).join('');
    }
}

function _mlNpcMaybeReact(npcId, action) {
    setTimeout(function() {
        if (action === 'like' && _mlNpcLiked.indexOf(npcId) === -1 && Math.random() < 0.30) {
            _mlNpcLiked.push(npcId); _mlSave(); _mlUpdateStats();
        } else if (action === 'star' && _mlNpcStarred.indexOf(npcId) === -1 && Math.random() < 0.20) {
            _mlNpcStarred.push(npcId); _mlSave(); _mlUpdateStats();
        }
    }, 1500 + Math.random() * 3000);
}

function _mlAnimateCard(tx, ty, rot, cb) {
    var card = document.getElementById('ml-match-card');
    if (!card) { if(cb) cb(); return; }
    card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    card.style.transform = 'translate(' + tx + ',' + ty + ') rotate(' + rot + 'deg)';
    card.style.opacity = '0';
    setTimeout(function() {
        card.style.transition = 'none';
        card.style.transform = '';
        card.style.opacity = '1';
        _mlMatchIdx++;
        _mlRenderMatchCard();
        if (cb) cb();
    }, 450);
}

window.mlLikeCard = function() {
    var npcId = _mlMatchIdx % _mlNpcs.length;
    _mlAnimateCard('150%', '0', 20);
    if (_mlUserLiked.indexOf(npcId) === -1) {
        _mlUserLiked.push(npcId); _mlSave(); _mlNpcMaybeReact(npcId, 'like'); _mlUpdateStats();
    }
};

window.mlSuperLike = function() {
    var npcId = _mlMatchIdx % _mlNpcs.length;
    _mlAnimateCard('0', '-150%', 0);
    if (_mlUserStarred.indexOf(npcId) === -1) {
        _mlUserStarred.push(npcId); _mlSave(); _mlNpcMaybeReact(npcId, 'star'); _mlUpdateStats();
    }
};

window.mlSkipCard = function() {
    _mlAnimateCard('-150%', '0', -20);
};

window.mlRefreshHall = function() {
    var btn = document.getElementById('ml-refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        btn.style.transition = 'transform 0.5s ease';
        setTimeout(function() { btn.style.transform = ''; btn.style.transition = ''; }, 500);
    }
    for (var i = _mlNpcs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = _mlNpcs[i]; _mlNpcs[i] = _mlNpcs[j]; _mlNpcs[j] = tmp;
    }
    _mlRenderHall();
};

window.mlChangeAvatar = function() {
    var inp = document.getElementById('ml-avatar-file-input');
    if (inp) inp.click();
};

window.mlHandleAvatarChange = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var src = e.target.result;
        var img = document.getElementById('ml-profile-avatar-img');
        if (img) img.src = src;
        localforage.setItem('ml_profile_avatar', src);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

window.mlAlbumChange = function(event, idx) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var src = e.target.result;
        var img = document.getElementById('ml-album-img-' + idx);
        var placeholder = document.getElementById('ml-album-placeholder-' + idx);
        if (img) { img.src = src; img.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
        localforage.setItem('ml_album_' + idx, src);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

window.mlChangeCoverWallpaper = function() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            var src = ev.target.result;
            var bg = document.querySelector('.ml-profile-cover-bg');
            if (bg) { bg.style.backgroundImage = 'url(' + src + ')'; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; }
            localforage.setItem('ml_cover_wallpaper', src);
        };
        reader.readAsDataURL(file);
    };
    input.click();
};

window.mlOpenEditProfile = function() {
    // 读取当前资料填入弹窗
    var modal = document.getElementById('ml-edit-modal');
    if (!modal) return;
    // 读取当前显示值
    var nameEl = document.querySelector('.ml-profile-name');
    var bioEl = document.querySelector('.ml-profile-bio');
    var ageBadge = document.querySelector('.ml-profile-age-badge');
    var genderBadge = document.querySelector('.ml-profile-gender-badge');
    var locationSpan = document.querySelector('.ml-profile-location-row span[style]');
    // 详细资料
    var detailItems = document.querySelectorAll('.ml-detail-text');
    var birthVal = '', heightVal = '', eduVal = '本科', jobVal = '', cityVal = '', goalVal = '寻找恋爱';
    if (detailItems[0]) birthVal = detailItems[0].textContent.replace('年生','').trim();
    if (detailItems[1]) heightVal = detailItems[1].textContent.replace('cm','').trim();
    if (detailItems[2]) eduVal = detailItems[2].textContent.trim();
    if (detailItems[3]) jobVal = detailItems[3].textContent.trim();
    if (detailItems[4]) cityVal = detailItems[4].textContent.trim();
    if (detailItems[5]) goalVal = detailItems[5].textContent.trim();
    // 兴趣标签
    var tagEls = document.querySelectorAll('.ml-interest-tag');
    var tagsStr = Array.from(tagEls).map(function(t){ return t.textContent.trim(); }).join(',');

    var inp = document.getElementById('ml-edit-name'); if (inp) inp.value = nameEl ? nameEl.textContent.trim() : '';
    var ageInp = document.getElementById('ml-edit-age'); if (ageInp) ageInp.value = ageBadge ? ageBadge.textContent.trim() : '';
    var bioInp = document.getElementById('ml-edit-bio'); if (bioInp) bioInp.value = bioEl ? bioEl.textContent.trim() : '';
    var cityInp = document.getElementById('ml-edit-city'); if (cityInp) cityInp.value = cityVal;
    var heightInp = document.getElementById('ml-edit-height'); if (heightInp) heightInp.value = heightVal;
    var eduSel = document.getElementById('ml-edit-edu'); if (eduSel) eduSel.value = eduVal;
    var jobInp = document.getElementById('ml-edit-job'); if (jobInp) jobInp.value = jobVal;
    var birthInp = document.getElementById('ml-edit-birth'); if (birthInp) birthInp.value = birthVal;
    var goalSel = document.getElementById('ml-edit-goal'); if (goalSel) goalSel.value = goalVal;
    var tagsInp = document.getElementById('ml-edit-tags'); if (tagsInp) tagsInp.value = tagsStr;
    // 性别
    var genderVal = genderBadge ? genderBadge.textContent.trim() : '女';
    var genderRadios = document.querySelectorAll('input[name="ml-edit-gender"]');
    genderRadios.forEach(function(r){ r.checked = (r.value === genderVal); });

    // 显示弹窗
    modal.style.display = 'flex';
    setTimeout(function(){ var sheet = document.getElementById('ml-edit-sheet'); if (sheet) sheet.style.transform = 'translateY(0)'; }, 20);
};

window.mlCloseEditModal = function() {
    var sheet = document.getElementById('ml-edit-sheet');
    var modal = document.getElementById('ml-edit-modal');
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(function(){ if (modal) modal.style.display = 'none'; }, 360);
};

window.mlSaveEditProfile = function() {
    var nameVal = (document.getElementById('ml-edit-name')||{}).value || '';
    var ageVal = (document.getElementById('ml-edit-age')||{}).value || '';
    var bioVal = (document.getElementById('ml-edit-bio')||{}).value || '';
    var cityVal = (document.getElementById('ml-edit-city')||{}).value || '';
    var heightVal = (document.getElementById('ml-edit-height')||{}).value || '';
    var eduVal = (document.getElementById('ml-edit-edu')||{}).value || '';
    var jobVal = (document.getElementById('ml-edit-job')||{}).value || '';
    var birthVal = (document.getElementById('ml-edit-birth')||{}).value || '';
    var goalVal = (document.getElementById('ml-edit-goal')||{}).value || '';
    var tagsVal = (document.getElementById('ml-edit-tags')||{}).value || '';
    var genderRadios = document.querySelectorAll('input[name="ml-edit-gender"]');
    var genderVal = '女';
    genderRadios.forEach(function(r){ if(r.checked) genderVal = r.value; });

    // 更新DOM
    var nameEl = document.querySelector('.ml-profile-name'); if (nameEl && nameVal.trim()) nameEl.textContent = nameVal.trim();
    var ageBadge = document.querySelector('.ml-profile-age-badge'); if (ageBadge && ageVal) ageBadge.textContent = ageVal;
    var genderBadge = document.querySelector('.ml-profile-gender-badge'); if (genderBadge) genderBadge.textContent = genderVal;
    var bioEl = document.querySelector('.ml-profile-bio'); if (bioEl) bioEl.textContent = bioVal;
    // 详细资料
    var detailItems = document.querySelectorAll('.ml-detail-text');
    if (detailItems[0] && birthVal) detailItems[0].textContent = birthVal + '年生';
    if (detailItems[1] && heightVal) detailItems[1].textContent = heightVal + 'cm';
    if (detailItems[2] && eduVal) detailItems[2].textContent = eduVal;
    if (detailItems[3] && jobVal) detailItems[3].textContent = jobVal;
    if (detailItems[4] && cityVal) detailItems[4].textContent = cityVal;
    if (detailItems[5] && goalVal) detailItems[5].textContent = goalVal;
    // 城市显示在 location row
    var locationSpans = document.querySelectorAll('.ml-profile-location-row span');
    locationSpans.forEach(function(s){ if (s.textContent.indexOf('·') !== -1 && cityVal) s.textContent = cityVal + ' · 距你 0km'; });
    // 兴趣标签
    if (tagsVal.trim()) {
        var tagsContainer = document.querySelector('.ml-profile-interest-tags');
        if (tagsContainer) {
            var tagArr = tagsVal.split(/[,，]/).map(function(t){ return t.trim(); }).filter(Boolean);
            tagsContainer.innerHTML = tagArr.map(function(t){ return '<span class="ml-interest-tag" style="color:#555;background:#f5f5f5;font-size:11px;letter-spacing:0.5px;font-weight:500;">' + t + '</span>'; }).join('');
        }
    }

    // 持久化
    try {
        localforage.setItem('ml_profile_name', nameVal.trim());
        localforage.setItem('ml_profile_bio', bioVal);
        localforage.setItem('ml_profile_age', ageVal);
        localforage.setItem('ml_profile_gender', genderVal);
        localforage.setItem('ml_profile_city', cityVal);
        localforage.setItem('ml_profile_height', heightVal);
        localforage.setItem('ml_profile_edu', eduVal);
        localforage.setItem('ml_profile_job', jobVal);
        localforage.setItem('ml_profile_birth', birthVal);
        localforage.setItem('ml_profile_goal', goalVal);
        localforage.setItem('ml_profile_tags', tagsVal);
        localforage.setItem('ml_profile_gender_val', genderVal);
    } catch(e) {}

    mlCloseEditModal();
};

window.openMeetloveApp = function() {
    var app = document.getElementById('meetlove-app');
    if (app) { app.style.display = 'flex'; switchMeetloveTab('hall'); }
    _mlLoad().then(function() {
        _mlRenderHall(); _mlRenderMatchCard(); _mlUpdateStats(); _mlStartBeingLikedTimer();
        localforage.getItem('ml_cover_wallpaper').then(function(src) {
            if (src) { var bg = document.querySelector('.ml-profile-cover-bg'); if (bg) { bg.style.backgroundImage = 'url(' + src + ')'; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; } }
        });
        localforage.getItem('ml_profile_name').then(function(n) { if (n) { var el = document.querySelector('.ml-profile-name'); if (el) el.textContent = n; } });
        localforage.getItem('ml_profile_bio').then(function(b) { if (b) { var el = document.querySelector('.ml-profile-bio'); if (el) el.textContent = b; } });
        localforage.getItem('ml_profile_age').then(function(v) { if (v) { var el = document.querySelector('.ml-profile-age-badge'); if (el) el.textContent = v; } });
        localforage.getItem('ml_profile_gender_val').then(function(v) { if (v) { var el = document.querySelector('.ml-profile-gender-badge'); if (el) el.textContent = v; } });
        localforage.getItem('ml_profile_city').then(function(v) {
            if (v) {
                var spans = document.querySelectorAll('.ml-profile-location-row span');
                spans.forEach(function(s){ if (s.textContent.indexOf('·') !== -1) s.textContent = v + ' · 距你 0km'; });
                var detailItems = document.querySelectorAll('.ml-detail-text');
                if (detailItems[4]) detailItems[4].textContent = v;
            }
        });
        localforage.getItem('ml_profile_height').then(function(v) { if (v) { var d = document.querySelectorAll('.ml-detail-text'); if (d[1]) d[1].textContent = v + 'cm'; } });
        localforage.getItem('ml_profile_edu').then(function(v) { if (v) { var d = document.querySelectorAll('.ml-detail-text'); if (d[2]) d[2].textContent = v; } });
        localforage.getItem('ml_profile_job').then(function(v) { if (v) { var d = document.querySelectorAll('.ml-detail-text'); if (d[3]) d[3].textContent = v; } });
        localforage.getItem('ml_profile_birth').then(function(v) { if (v) { var d = document.querySelectorAll('.ml-detail-text'); if (d[0]) d[0].textContent = v + '年生'; } });
        localforage.getItem('ml_profile_goal').then(function(v) { if (v) { var d = document.querySelectorAll('.ml-detail-text'); if (d[5]) d[5].textContent = v; } });
        // 恢复相册图片
        [1,2,3].forEach(function(idx) {
            localforage.getItem('ml_album_' + idx).then(function(src) {
                if (src) {
                    var img = document.getElementById('ml-album-img-' + idx);
                    var placeholder = document.getElementById('ml-album-placeholder-' + idx);
                    if (img) { img.src = src; img.style.display = 'block'; }
                    if (placeholder) placeholder.style.display = 'none';
                }
            });
        });
        localforage.getItem('ml_profile_tags').then(function(v) {
            if (v) {
                var tagsContainer = document.querySelector('.ml-profile-interest-tags');
                if (tagsContainer) {
                    var tagArr = v.split(/[,，]/).map(function(t){ return t.trim(); }).filter(Boolean);
                    tagsContainer.innerHTML = tagArr.map(function(t){ return '<span class="ml-interest-tag" style="color:#555;background:#f5f5f5;font-size:11px;letter-spacing:0.5px;font-weight:500;">' + t + '</span>'; }).join('');
                }
            }
        });
    });
};

window.closeMeetloveApp = function() {
    var app = document.getElementById('meetlove-app');
    if (app) app.style.display = 'none';
    if (_mlBeingLikedTimer) { clearInterval(_mlBeingLikedTimer); _mlBeingLikedTimer = null; }
};

document.addEventListener('DOMContentLoaded', function() {
    var coverBg = document.querySelector('.ml-profile-cover-bg');
    if (coverBg) { coverBg.style.cursor = 'pointer'; coverBg.addEventListener('click', function(e) { e.stopPropagation(); mlChangeCoverWallpaper(); }); }
    var editBtn = document.querySelector('.ml-profile-edit-btn');
    if (editBtn) { editBtn.addEventListener('click', function(e) { e.stopPropagation(); mlOpenEditProfile(); }); }
    document.querySelectorAll('.ml-tag').forEach(function(tag) {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.ml-tag').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
        });
    });
});

})();

