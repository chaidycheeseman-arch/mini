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
    var npc = _mlNpcs[npcId];
    _mlAnimateCard('150%', '0', 20);
    if (_mlUserLiked.indexOf(npcId) === -1) {
        _mlUserLiked.push(npcId); _mlSave(); _mlNpcMaybeReact(npcId, 'like'); _mlUpdateStats();
        // 30%概率NPC主动发起WeChat添加申请
        if (Math.random() < 0.30 && npc) {
            setTimeout(function() {
                mlSendWechatAddRequest(npc.name, '', npc.tags ? npc.tags.join('、') + '爱好者' : '', '女');
            }, 800 + Math.random() * 2000);
        }
    }
};

window.mlSuperLike = function() {
    var npcId = _mlMatchIdx % _mlNpcs.length;
    var npc = _mlNpcs[npcId];
    _mlAnimateCard('0', '-150%', 0);
    if (_mlUserStarred.indexOf(npcId) === -1) {
        _mlUserStarred.push(npcId); _mlSave(); _mlNpcMaybeReact(npcId, 'star'); _mlUpdateStats();
        // 超级喜欢：60%概率NPC主动发起WeChat添加申请
        if (Math.random() < 0.60 && npc) {
            setTimeout(function() {
                mlSendWechatAddRequest(npc.name, '', npc.tags ? npc.tags.join('、') + '爱好者' : '', '女');
            }, 500 + Math.random() * 1500);
        }
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

// ====== 心声面板 (Heart Voice Panel) 核心逻辑 ======
// 注意：此处不使用 IIFE，确保函数挂载到全局 window，不受 JS 错误影响
var _hvGenerating = false;
var HV_HISTORY_KEY = 'hv_history_';
(function() {
    'use strict';

    /**
     * 打开心声面板 - 由聊天页面导航栏角色名点击触发
     */
    window.openHeartVoice = async function() {
        if (!activeChatContact) return;

        var overlay = document.getElementById('heart-voice-overlay');
        var panel = document.getElementById('heart-voice-panel');
        if (!overlay || !panel) return;

        // 显示面板（居中弹入，scale动画）
        overlay.style.display = 'flex';
        panel.style.transform = 'scale(0.88)';
        panel.style.opacity = '0';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                panel.style.transform = 'scale(1)';
                panel.style.opacity = '1';
            });
        });

        // 重置内容为加载状态
        _hvSetLoadingState();

        // 设置底部时间
        _hvUpdateFooterTime();

        // 异步生成心声内容
        await _hvGenerate();
    };

    /**
     * 关闭心声面板
     */
    window.closeHeartVoice = function() {
        var panel = document.getElementById('heart-voice-panel');
        var overlay = document.getElementById('heart-voice-overlay');
        if (panel) {
            panel.style.transform = 'scale(0.88)';
            panel.style.opacity = '0';
        }
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
            if (panel) { panel.style.transform = ''; panel.style.opacity = ''; }
        }, 320);
        // 停止ECG动画
        var ecgPath = document.getElementById('hv-ecg-path');
        if (ecgPath) ecgPath.classList.remove('hv-ecg-animated');
    };

    /**
     * 设置加载中状态
     */
    function _hvSetLoadingState() {
        var monologue = document.getElementById('hv-monologue');
        var darkMono = document.getElementById('hv-dark-mono');
        var hrNum = document.getElementById('hv-hr-num');
        var locationCity = document.getElementById('hv-location-city');
        var locationDetail = document.getElementById('hv-location-detail');
        var barLove = document.getElementById('hv-bar-love');
        var barJealous = document.getElementById('hv-bar-jealous');
        var valLove = document.getElementById('hv-val-love');
        var valJealous = document.getElementById('hv-val-jealous');

        if (monologue) monologue.textContent = '生成中...';
        if (darkMono) darkMono.textContent = '生成中...';
        if (hrNum) hrNum.textContent = '--';
        if (locationCity) locationCity.textContent = '--';
        if (locationDetail) locationDetail.textContent = '--';
        if (barLove) barLove.style.width = '0%';
        if (barJealous) barJealous.style.width = '0%';
        if (valLove) valLove.textContent = '--';
        if (valJealous) valJealous.textContent = '--';

        // 停止ECG动画
        var ecgPath = document.getElementById('hv-ecg-path');
        if (ecgPath) ecgPath.classList.remove('hv-ecg-animated');
    }

    /**
     * 更新底部时间戳
     */
    function _hvUpdateFooterTime() {
        var el = document.getElementById('hv-footer-datetime');
        if (!el) return;
        var now = new Date();
        var y = now.getFullYear();
        var mo = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        var h = String(now.getHours()).padStart(2, '0');
        var mi = String(now.getMinutes()).padStart(2, '0');
        el.textContent = y + '.' + mo + '.' + d + '  ' + h + ':' + mi;
    }

    /**
     * 生成心声内容 - 调用 AI API 分析最新一轮对话
     */
    async function _hvGenerate() {
        if (_hvGenerating) return;
        _hvGenerating = true;

        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;

            if (!apiUrl || !apiKey || !model) {
                // 没有 API 配置，使用随机演示数据
                _hvApplyDemoData();
                return;
            }

            // 获取最近对话（最多取最后10条）
            var allMsgs = await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray();
            var recentMsgs = allMsgs.filter(function(m) { return m.source !== 'sms'; }).slice(-10);

            if (recentMsgs.length === 0) {
                _hvApplyDemoData();
                return;
            }

            // 构建对话摘要
            var chatSummary = recentMsgs.map(function(m) {
                var sender = m.sender === 'me' ? '用户' : (activeChatContact.roleName || '角色');
                return sender + '：' + extractMsgPureText(m.content);
            }).join('\n');

            var roleDetail = activeChatContact.roleDetail || '';
            var roleName = activeChatContact.roleName || '角色';

            // 构建 prompt
            var systemPrompt = '你是一个专业的情感分析师，专门分析角色在对话中的内心状态。请根据以下角色设定和最新对话，以JSON格式输出角色的内心状态分析。\n\n' +
                '角色设定：' + (roleDetail || '无特殊设定') + '\n\n' +
                '【输出要求】严格输出以下JSON格式，不要有任何多余内容：\n' +
                '{\n' +
                '  "love": <0-100的整数，代表对用户的好感度>,\n' +
                '  "jealous": <0-100的整数，代表醋意值，对话越亲密或涉及其他人越高>,\n' +
                '  "heartrate": <60-130的整数，代表当前心跳bpm，情绪激动时偏高>,\n' +
                '  "city": "<角色当前所在城市，根据对话或设定推断，如无法推断则写\"未知城市\">",\n' +
                '  "location": "<具体位置描述，如咖啡馆、家里、公司等，结合对话场景>",\n' +
                '  "monologue": "<角色内心独白，30-50字，第一人称，口语化，真实表达对用户的情感>",\n' +
                '  "dark": "<角色阴暗面独白，20-40字，第一人称，表达占有欲、不安全感或隐藏的执念，语气略带压抑>"\n' +
                '}';

            var messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '以下是最新的对话记录：\n\n' + chatSummary + '\n\n请分析' + roleName + '的内心状态，严格输出JSON。' }
            ];

            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';

            var response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });

            if (!response.ok) throw new Error('API请求失败: ' + response.status);

            var data = await response.json();
            var rawText = data.choices[0].message.content.trim();

            // 提取 JSON
            var jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('无法解析JSON');

            var result = JSON.parse(jsonMatch[0]);

            // 应用数据到面板
            _hvApplyData(result);

            // 保存到历史记录
            _hvSaveHistory(result);

        } catch (e) {
            console.error('[心声面板] 生成失败:', e);
            // 降级为演示数据
            _hvApplyDemoData();
        } finally {
            _hvGenerating = false;
        }
    }

    /**
     * 将生成的数据应用到面板 UI
     */
    function _hvApplyData(result) {
        var love = Math.max(0, Math.min(100, parseInt(result.love) || 50));
        var jealous = Math.max(0, Math.min(100, parseInt(result.jealous) || 20));
        var hr = Math.max(55, Math.min(140, parseInt(result.heartrate) || 80));

        // 好感度
        var barLove = document.getElementById('hv-bar-love');
        var valLove = document.getElementById('hv-val-love');
        if (barLove) barLove.style.width = love + '%';
        if (valLove) valLove.textContent = love;

        // 醋意值
        var barJealous = document.getElementById('hv-bar-jealous');
        var valJealous = document.getElementById('hv-val-jealous');
        if (barJealous) barJealous.style.width = jealous + '%';
        if (valJealous) valJealous.textContent = jealous;

        // 心率
        var hrNum = document.getElementById('hv-hr-num');
        if (hrNum) hrNum.textContent = hr;

        // 更新 ECG 波形：根据心率调整波形间距
        _hvUpdateEcg(hr);

        // 定位
        var locationCity = document.getElementById('hv-location-city');
        var locationDetail = document.getElementById('hv-location-detail');
        if (locationCity) locationCity.textContent = result.city || '--';
        if (locationDetail) locationDetail.textContent = result.location || '--';

        // 内心独白
        var monologue = document.getElementById('hv-monologue');
        if (monologue) monologue.textContent = result.monologue || '--';

        // 阴暗独白
        var darkMono = document.getElementById('hv-dark-mono');
        if (darkMono) darkMono.textContent = result.dark || '--';
    }

    /**
     * 根据心率更新 ECG 波形图
     * 模拟真实心电图机：波形连续滚动，两端始终可见
     */
    function _hvUpdateEcg(bpm) {
        var ecgPath = document.getElementById('hv-ecg-path');
        if (!ecgPath) return;

        // 参数：根据心率调整波形密度和幅度
        var amplitude = bpm > 100 ? 14 : (bpm > 80 ? 11 : 8);
        var baseY = 18;
        var spacing = bpm > 100 ? 28 : (bpm > 80 ? 36 : 44);

        // 生成足够长的路径（3个周期宽度，用于无缝循环滚动）
        // SVG viewBox 宽度为 180，生成 3x 宽度 = 540，保证滚动时两端不会出现空白
        var totalWidth = spacing * Math.ceil(540 / spacing) + spacing;
        var segments = [];
        var x = 0;

        segments.push('M0 ' + baseY);
        while (x < totalWidth) {
            var x1 = x + spacing * 0.15;
            var x2 = x + spacing * 0.28;
            var x3 = x + spacing * 0.42;
            var x4 = x + spacing * 0.55;
            var x5 = x + spacing * 0.7;
            var x6 = x + spacing;

            segments.push(
                'L' + x.toFixed(1) + ' ' + baseY,
                'L' + x1.toFixed(1) + ' ' + baseY,
                'L' + x2.toFixed(1) + ' ' + (baseY - amplitude * 0.6).toFixed(1),
                'L' + x3.toFixed(1) + ' ' + (baseY + amplitude).toFixed(1),
                'L' + x4.toFixed(1) + ' ' + (baseY - amplitude * 1.2).toFixed(1),
                'L' + x5.toFixed(1) + ' ' + baseY,
                'L' + x6.toFixed(1) + ' ' + baseY
            );
            x += spacing;
        }

        ecgPath.setAttribute('d', segments.join(' '));

        // ��� strokeDasharray����������߶��������� translateX ������
        ecgPath.style.strokeDasharray = 'none';
        ecgPath.style.strokeDashoffset = '0';
        ecgPath.style.animation = 'none';

        // ʹ�� <g> ���ض���translateX ������ SVG ·�ɵ�ͼ�Ʒ�Χ
        // ͨ�� hv-ecg-group ȡ�ü�Ⱥ�Ⱥ transform
        var ecgGroup = document.getElementById('hv-ecg-group');
        if (!ecgGroup) return;

        // ע�� translateX ���� keyframes��ֻע��һ�Σ�
        var styleId = 'hv-ecg-scroll-style';
        var existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove(); // ÿ�δ����µ�spacing����Ҫ���¶�̬ע��
        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        var speedMs = bpm > 100 ? 450 : (bpm > 80 ? 600 : 750);
        // ʹ�ÿ�ֵ px ֱ�ӶǪ�ȷ
        styleEl.textContent = '@keyframes hv-ecg-tape { from { transform: translateX(0px); } to { transform: translateX(-' + spacing.toFixed(1) + 'px); } }';
        document.head.appendChild(styleEl);

        // Ӧ�õ� <g> ��Ⱥ
        ecgGroup.style.animation = 'none';
        // ǿ�Ƹ���
        void ecgGroup.offsetWidth;
        ecgGroup.style.animation = 'hv-ecg-tape ' + speedMs + 'ms linear infinite';
        ecgPath.classList.add('hv-ecg-animated');
    }

    /**
     * 演示数据（API 未配置时使用）
     */
    function _hvApplyDemoData() {
        var demoData = {
            love: Math.floor(Math.random() * 40) + 45,
            jealous: Math.floor(Math.random() * 30) + 10,
            heartrate: Math.floor(Math.random() * 30) + 72,
            city: '未知城市',
            location: '某个安静的地方',
            monologue: '和你说话的时候，我总是会不自觉地笑起来，也不知道为什么...',
            dark: '要是你只属于我一个人就好了，谁都不能靠近你。'
        };
        _hvApplyData(demoData);
        _hvSaveHistory(demoData);
    }

    /**
     * 保存心声到历史记录
     */
    async function _hvSaveHistory(data) {
        if (!activeChatContact) return;
        var key = HV_HISTORY_KEY + activeChatContact.id;
        try {
            var history = await localforage.getItem(key) || [];
            var now = new Date();
            history.unshift({
                time: now.getFullYear() + '.' +
                      String(now.getMonth() + 1).padStart(2, '0') + '.' +
                      String(now.getDate()).padStart(2, '0') + '  ' +
                      String(now.getHours()).padStart(2, '0') + ':' +
                      String(now.getMinutes()).padStart(2, '0'),
                love: data.love,
                jealous: data.jealous,
                heartrate: data.heartrate,
                city: data.city,
                location: data.location,
                monologue: data.monologue,
                dark: data.dark
            });
            // 最多保留 30 条历史
            if (history.length > 30) history = history.slice(0, 30);
            await localforage.setItem(key, history);
        } catch (e) {
            console.error('[心声面板] 保存历史失败:', e);
        }
    }

    /**
     * 打开历史心声弹窗
     */
    window.openHeartVoiceHistory = async function() {
        if (!activeChatContact) return;
        var modal = document.getElementById('hv-history-modal');
        var sheet = document.getElementById('hv-history-sheet');
        if (!modal || !sheet) return;

        // 居中弹入，scale动画
        sheet.style.transform = 'scale(0.88)';
        sheet.style.opacity = '0';
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'scale(1)';
                sheet.style.opacity = '1';
            });
        });

        // 渲染历史列表
        var listEl = document.getElementById('hv-history-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        var key = HV_HISTORY_KEY + activeChatContact.id;
        var history = await localforage.getItem(key) || [];

        if (history.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#ccc;font-size:13px;margin:30px 0;letter-spacing:0.3px;">暂无历史心声记录</div>';
            return;
        }

        history.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'hv-history-card';
            card.innerHTML =
                '<div class="hv-history-card-header">' +
                    '<span class="hv-history-card-time">' + (item.time || '') + '</span>' +
                    '<span class="hv-history-card-hr">' + (item.heartrate || '--') + ' bpm</span>' +
                '</div>' +
                '<div style="display:flex;gap:12px;align-items:center;margin:2px 0;">' +
                    '<div style="display:flex;align-items:center;gap:6px;flex:1;">' +
                        '<span style="font-size:10px;color:#c9a0a0;letter-spacing:0.3px;white-space:nowrap;">好感</span>' +
                        '<div style="flex:1;height:3px;background:#f0f0f0;border-radius:2px;overflow:hidden;">' +
                            '<div style="height:100%;border-radius:2px;background:linear-gradient(90deg,#f5c2c2,#e88);width:' + (item.love || 0) + '%;"></div>' +
                        '</div>' +
                        '<span style="font-size:10px;color:#bbb;font-weight:600;font-family:Arial,sans-serif;min-width:20px;text-align:right;">' + (item.love || '--') + '</span>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:6px;flex:1;">' +
                        '<span style="font-size:10px;color:#a0b0c9;letter-spacing:0.3px;white-space:nowrap;">醋意</span>' +
                        '<div style="flex:1;height:3px;background:#f0f0f0;border-radius:2px;overflow:hidden;">' +
                            '<div style="height:100%;border-radius:2px;background:linear-gradient(90deg,#b8c8e8,#7799cc);width:' + (item.jealous || 0) + '%;"></div>' +
                        '</div>' +
                        '<span style="font-size:10px;color:#bbb;font-weight:600;font-family:Arial,sans-serif;min-width:20px;text-align:right;">' + (item.jealous || '--') + '</span>' +
                    '</div>' +
                '</div>' +
                (item.city || item.location ? '<div class="hv-history-card-loc">' +
                    '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                    '<span>' + (item.city || '') + (item.location ? ' · ' + item.location : '') + '</span>' +
                '</div>' : '') +
                '<div class="hv-history-card-mono">' + (item.monologue || '') + '</div>' +
                (item.dark ? '<div class="hv-history-card-dark">' + item.dark + '</div>' : '');
            listEl.appendChild(card);
        });
    };

    /**
     * 关闭历史心声弹窗
     */
    window.closeHeartVoiceHistory = function() {
        var sheet = document.getElementById('hv-history-sheet');
        var modal = document.getElementById('hv-history-modal');
        if (sheet) {
            sheet.style.transform = 'scale(0.88)';
            sheet.style.opacity = '0';
        }
        setTimeout(function() {
            if (modal) modal.style.display = 'none';
            if (sheet) { sheet.style.transform = ''; sheet.style.opacity = ''; }
        }, 300);
    };

    // 注：点击事件已通过 HTML onclick="openHeartVoice()" 绑定，无需重复绑定

})();


// ====== Offline Chat Feature ======
(function() {
    var offlineDb = new Dexie('miniPhoneOfflineDB');
    offlineDb.version(1).stores({ messages: '++id, contactId, sender, content, timestamp' });

    var activeOfflineContact = null;
    var activeOfflineBubbleMsgId = null;
    var offlineReplying = false;

    function formatOfflineTimestamp(ts) {
        var d = new Date(ts);
        var y = d.getFullYear();
        var mo = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        var h = String(d.getHours()).padStart(2, '0');
        var min = String(d.getMinutes()).padStart(2, '0');
        return y + '\u5e74' + mo + '\u6708' + day + '\u65e5 ' + h + ':' + min;
    }

    window.openOfflineChat = function() {
        if (!activeChatContact) return;
        activeOfflineContact = activeChatContact;
        hideChatExtPanel();
        var titleEl = document.getElementById('offline-chat-title');
        if (titleEl) {
            var displayName = activeOfflineContact.roleName || '\u7ebf\u4e0b';
            titleEl.textContent = displayName;
            localforage.getItem('cd_settings_' + activeOfflineContact.id + '_remark').then(function(remark) {
                if (remark && remark !== '\u672a\u8bbe\u7f6e') titleEl.textContent = remark;
            }).catch(function() {});
        }
        var app = document.getElementById('offline-chat-app');
        if (app) app.style.display = 'flex';
        loadOfflineMessages();
        var input = document.getElementById('offline-input-field');
        if (input) { input.value = ''; input.style.height = 'auto'; }
    };

    window.closeOfflineChat = function() {
        var app = document.getElementById('offline-chat-app');
        if (app) app.style.display = 'none';
    };

    function ensureOfflineBubbleActionMenu() {
        var app = document.getElementById('offline-chat-app');
        if (!app) return null;
        var menu = document.getElementById('offline-bubble-action-menu');
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'offline-bubble-action-menu';
        menu.style.cssText = 'display:none;position:absolute;z-index:360;min-width:136px;background:rgba(255,255,255,0.98);border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,0.16);border:1px solid rgba(0,0,0,0.06);overflow:hidden;';
        menu.innerHTML =
            '<div data-action="edit" style="padding:12px 14px;font-size:13px;color:#333;cursor:pointer;border-bottom:1px solid #f2f2f2;">编辑</div>' +
            '<div data-action="delete" style="padding:12px 14px;font-size:13px;color:#d94848;cursor:pointer;border-bottom:1px solid #f2f2f2;">删除</div>' +
            '<div data-action="continue" style="padding:12px 14px;font-size:13px;color:#5b4a3f;cursor:pointer;">续写</div>';
        menu.addEventListener('click', async function(e) {
            var item = e.target && e.target.closest('[data-action]');
            if (!item) return;
            var action = item.getAttribute('data-action');
            if (!activeOfflineBubbleMsgId) return;
            if (action === 'edit') {
                await openOfflineEditModal(activeOfflineBubbleMsgId);
            } else if (action === 'delete') {
                await deleteOfflineMessage(activeOfflineBubbleMsgId);
            } else if (action === 'continue') {
                await continueOfflineMessage(activeOfflineBubbleMsgId);
            }
        });
        app.appendChild(menu);
        return menu;
    }

    function closeOfflineBubbleActionMenu() {
        var menu = document.getElementById('offline-bubble-action-menu');
        if (!menu) return;
        menu.style.display = 'none';
        activeOfflineBubbleMsgId = null;
    }

    function openOfflineBubbleActionMenu(msgId, bubbleEl) {
        var menu = ensureOfflineBubbleActionMenu();
        var app = document.getElementById('offline-chat-app');
        if (!menu || !app || !bubbleEl || !msgId) return;
        activeOfflineBubbleMsgId = msgId;
        menu.style.display = 'block';

        var appRect = app.getBoundingClientRect();
        var bubbleRect = bubbleEl.getBoundingClientRect();
        var menuW = menu.offsetWidth || 136;
        var menuH = menu.offsetHeight || 132;
        var x = bubbleRect.left - appRect.left + (bubbleRect.width / 2) - (menuW / 2);
        var y = bubbleRect.top - appRect.top - menuH - 8;

        if (x < 10) x = 10;
        if (x + menuW > appRect.width - 10) x = appRect.width - menuW - 10;
        if (y < 10) y = bubbleRect.bottom - appRect.top + 8;
        if (y + menuH > appRect.height - 10) y = Math.max(10, appRect.height - menuH - 10);

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }

    function ensureOfflineEditModal() {
        var app = document.getElementById('offline-chat-app');
        if (!app) return null;
        var modal = document.getElementById('offline-edit-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'offline-edit-modal';
        modal.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(0,0,0,0.45);z-index:370;justify-content:center;align-items:flex-end;backdrop-filter:blur(6px);';
        modal.innerHTML =
            '<div id="offline-edit-sheet" style="width:100%;background:#fff;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;transform:translateY(100%);transition:transform 0.26s cubic-bezier(0.4,0,0.2,1);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div style="font-size:16px;font-weight:700;color:#333;">编辑对话</div>' +
                    '<div id="offline-edit-close-btn" style="font-size:20px;color:#bbb;cursor:pointer;line-height:1;">×</div>' +
                '</div>' +
                '<textarea id="offline-edit-textarea" style="width:100%;height:120px;max-height:220px;border:1px solid #eee;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.6;resize:none;outline:none;font-family:inherit;color:#333;background:#fafafa;"></textarea>' +
                '<div style="display:flex;gap:10px;">' +
                    '<button id="offline-edit-cancel-btn" type="button" style="flex:1;height:42px;border:none;border-radius:12px;background:#f3f3f3;color:#666;font-size:14px;cursor:pointer;">取消</button>' +
                    '<button id="offline-edit-save-btn" type="button" style="flex:1;height:42px;border:none;border-radius:12px;background:#6f5f53;color:#fff;font-size:14px;cursor:pointer;">保存</button>' +
                '</div>' +
            '</div>';
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeOfflineEditModal();
        });
        app.appendChild(modal);

        var closeBtn = document.getElementById('offline-edit-close-btn');
        var cancelBtn = document.getElementById('offline-edit-cancel-btn');
        var saveBtn = document.getElementById('offline-edit-save-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeOfflineEditModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeOfflineEditModal);
        if (saveBtn) saveBtn.addEventListener('click', saveOfflineEditedMessage);
        return modal;
    }

    async function openOfflineEditModal(msgId) {
        closeOfflineBubbleActionMenu();
        var modal = ensureOfflineEditModal();
        if (!modal) return;
        var msg = await offlineDb.messages.get(msgId);
        if (!msg) return;
        activeOfflineBubbleMsgId = msgId;
        var textarea = document.getElementById('offline-edit-textarea');
        if (textarea) {
            textarea.value = msg.content || '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(textarea);
        }
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            var sheet = document.getElementById('offline-edit-sheet');
            if (sheet) sheet.style.transform = 'translateY(0)';
        });
    }

    function closeOfflineEditModal() {
        var modal = document.getElementById('offline-edit-modal');
        var sheet = document.getElementById('offline-edit-sheet');
        if (!modal || !sheet) return;
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() {
            modal.style.display = 'none';
        }, 260);
    }

    async function saveOfflineEditedMessage() {
        if (!activeOfflineBubbleMsgId) return;
        var textarea = document.getElementById('offline-edit-textarea');
        var nextText = textarea ? textarea.value : '';
        if (!nextText || !nextText.trim()) return;
        try {
            await offlineDb.messages.update(activeOfflineBubbleMsgId, { content: nextText });
            closeOfflineEditModal();
            await loadOfflineMessages();
        } catch (e) {
            console.error('编辑线下消息失败', e);
        }
    }

    async function deleteOfflineMessage(msgId) {
        closeOfflineBubbleActionMenu();
        if (!msgId) return;
        if (!confirm('确定要删除这条对话吗？')) return;
        try {
            await offlineDb.messages.delete(msgId);
            await loadOfflineMessages();
        } catch (e) {
            console.error('删除线下消息失败', e);
        }
    }

    async function continueOfflineMessage(msgId) {
        closeOfflineBubbleActionMenu();
        if (!activeOfflineContact) return;
        try {
            var msg = await offlineDb.messages.get(msgId);
            await triggerOfflineRoleReply(activeOfflineContact, msg ? (msg.content || '') : '');
        } catch (e) {
            console.error('线下续写失败', e);
        }
    }

    // ====== 线下管理：存档系统（每角色3个槽位）======
    window.openOfflineManage = async function() {
        if (!activeOfflineContact) return;
        var modal = document.getElementById('offline-manage-modal');
        var sheet = document.getElementById('offline-manage-sheet');
        if (!modal || !sheet) return;
        modal.style.display = 'flex';
        requestAnimationFrame(function() { sheet.style.transform = 'translateY(0)'; });
        await renderOfflineSlots();
    };

    window.closeOfflineManage = function() {
        var sheet = document.getElementById('offline-manage-sheet');
        var modal = document.getElementById('offline-manage-modal');
        if (sheet) sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { if (modal) modal.style.display = 'none'; }, 320);
    };

    async function renderOfflineSlots() {
        var listEl = document.getElementById('offline-slot-list');
        if (!listEl || !activeOfflineContact) return;
        listEl.innerHTML = '';
        var contactId = activeOfflineContact.id;
        for (var i = 1; i <= 3; i++) {
            var slotKey = 'offline_slot_' + contactId + '_' + i;
            var slotData = null;
            try { slotData = await localforage.getItem(slotKey); } catch(e) {}
            var slotEl = document.createElement('div');
            slotEl.style.cssText = 'background:#f7f8fa;border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border:1px solid #eee;';
            var leftDiv = document.createElement('div');
            leftDiv.style.cssText = 'display:flex;flex-direction:column;gap:3px;flex:1;overflow:hidden;';
            var slotTitle = document.createElement('div');
            slotTitle.style.cssText = 'font-size:14px;font-weight:600;color:#333;';
            slotTitle.textContent = '存档 ' + i;
            var slotDesc = document.createElement('div');
            slotDesc.style.cssText = 'font-size:11px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            if (slotData) {
                var d = new Date(slotData.savedAt || 0);
                var dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
                    + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                slotDesc.textContent = dStr + ' · ' + (slotData.msgCount || 0) + '条消息';
            } else {
                slotDesc.textContent = '空槽位';
            }
            leftDiv.appendChild(slotTitle);
            leftDiv.appendChild(slotDesc);
            var btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';
            if (slotData) {
                // 读取按钮
                var loadBtn = document.createElement('div');
                loadBtn.style.cssText = 'padding:6px 12px;background:#fff;border:none;border-radius:14px;font-size:12px;color:#555;cursor:pointer;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.08);';
                loadBtn.textContent = '读取';
                (function(idx) {
                    loadBtn.onclick = function() { loadOfflineSlot(idx); };
                })(i);
                btnGroup.appendChild(loadBtn);
            }
            // 存档按钮
            var saveBtn = document.createElement('div');
            saveBtn.style.cssText = 'padding:6px 12px;background:#fff;border:none;border-radius:14px;font-size:12px;color:#555;cursor:pointer;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.08);';
            saveBtn.textContent = '存档';
            (function(idx) {
                saveBtn.onclick = function() { saveOfflineSlot(idx); };
            })(i);
            btnGroup.appendChild(saveBtn);
            slotEl.appendChild(leftDiv);
            slotEl.appendChild(btnGroup);
            listEl.appendChild(slotEl);
        }
    }

    async function saveOfflineSlot(slotIndex) {
        if (!activeOfflineContact) return;
        var contactId = activeOfflineContact.id;
        try {
            var msgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            var slotKey = 'offline_slot_' + contactId + '_' + slotIndex;
            await localforage.setItem(slotKey, {
                messages: msgs,
                savedAt: Date.now(),
                msgCount: msgs.length
            });
            await renderOfflineSlots();
            // 简单提示
            var toast = document.createElement('div');
            toast.textContent = '存档 ' + slotIndex + ' 已保存';
            toast.style.cssText = 'position:absolute;bottom:120px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;white-space:nowrap;';
            var offlineApp = document.getElementById('offline-chat-app');
            if (offlineApp) offlineApp.appendChild(toast);
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2000);
        } catch(e) { console.error('存档失败', e); }
    }

    async function loadOfflineSlot(slotIndex) {
        if (!activeOfflineContact) return;
        if (!confirm('读取存档 ' + slotIndex + ' 将覆盖当前对话，确定吗？')) return;
        var contactId = activeOfflineContact.id;
        try {
            var slotKey = 'offline_slot_' + contactId + '_' + slotIndex;
            var slotData = await localforage.getItem(slotKey);
            if (!slotData || !slotData.messages) return;
            // 清空当前消息
            var allMsgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            await offlineDb.messages.bulkDelete(allMsgs.map(function(m) { return m.id; }));
            // 写入存档消息（去掉id让IndexedDB自动分配）
            var newMsgs = slotData.messages.map(function(m) {
                return { contactId: m.contactId, sender: m.sender, content: m.content, timestamp: m.timestamp };
            });
            if (newMsgs.length > 0) await offlineDb.messages.bulkAdd(newMsgs);
            closeOfflineManage();
            await loadOfflineMessages();
        } catch(e) { console.error('读取存档失败', e); alert('读取失败: ' + e.message); }
    }

    window.offlineNewChat = async function() {
        if (!activeOfflineContact) return;
        if (!confirm('新建对话将清空当前所有消息，确定吗？')) return;
        var contactId = activeOfflineContact.id;
        try {
            var allMsgs = await offlineDb.messages.where('contactId').equals(contactId).toArray();
            await offlineDb.messages.bulkDelete(allMsgs.map(function(m) { return m.id; }));
            closeOfflineManage();
            var container = document.getElementById('offline-msg-container');
            if (container) container.innerHTML = '';
        } catch(e) { console.error('新建失败', e); }
    };

    // ====== 线下设置侧边栏 ======
    window.openOfflineSettings = async function() {
        if (!activeOfflineContact) return;
        var overlay = document.getElementById('offline-settings-overlay');
        var sidebar = document.getElementById('offline-settings-sidebar');
        if (!overlay || !sidebar) return;
        overlay.style.display = 'block';
        sidebar.style.display = 'flex';
        requestAnimationFrame(function() { sidebar.style.transform = 'translateX(0)'; });
        // 恢复已保存设置
        var contactId = activeOfflineContact.id;
        try {
            var settings = await localforage.getItem('offline_settings_' + contactId) || {};
            var wordMinEl = document.getElementById('offline-word-min');
            var wordMaxEl = document.getElementById('offline-word-max');
            if (wordMinEl) wordMinEl.value = settings.wordMin || 100;
            if (wordMaxEl) wordMaxEl.value = settings.wordMax || 500;
            // 视角
            var perspVal = settings.perspective || 'second';
            var perspEl = document.getElementById('offline-persp-' + perspVal);
            if (perspEl) perspEl.checked = true;
            // 文风
            var styleEl = document.getElementById('offline-writing-style');
            if (styleEl) styleEl.value = settings.writingStyle !== undefined ? settings.writingStyle : '温柔细腻，笔触细腻，情感丰富，如涓涓细流般娓娓道来，充满诗意与温度';
            // 剧情背景
            var plotEl = document.getElementById('offline-plot-bg');
            if (plotEl) plotEl.value = settings.plotBg || '';
            // CSS
            var cssEl = document.getElementById('offline-custom-css');
            if (cssEl) cssEl.value = settings.customCss || '';
            // 背景图预览
            var bgPreviewImg = document.getElementById('offline-bg-preview-img');
            if (bgPreviewImg && settings.bgImage) {
                bgPreviewImg.src = settings.bgImage;
                bgPreviewImg.style.display = 'block';
            }
        } catch(e) {}
    };

    window.closeOfflineSettings = function() {
        var overlay = document.getElementById('offline-settings-overlay');
        var sidebar = document.getElementById('offline-settings-sidebar');
        if (sidebar) sidebar.style.transform = 'translateX(100%)';
        setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
        }, 320);
    };

    window.offlineSaveSettings = async function() {
        if (!activeOfflineContact) return;
        var contactId = activeOfflineContact.id;
        var wordMin = parseInt(document.getElementById('offline-word-min').value) || 100;
        var wordMax = parseInt(document.getElementById('offline-word-max').value) || 500;
        var perspEl = document.querySelector('input[name="offline-perspective"]:checked');
        var perspective = perspEl ? perspEl.value : 'second';
        var writingStyle = document.getElementById('offline-writing-style').value.trim();
        var plotBg = document.getElementById('offline-plot-bg').value.trim();
        var customCss = document.getElementById('offline-custom-css').value.trim();
        // 读取已有设置（保留bgImage）
        var existing = await localforage.getItem('offline_settings_' + contactId) || {};
        var settings = Object.assign(existing, { wordMin, wordMax, perspective, writingStyle, plotBg, customCss });
        await localforage.setItem('offline_settings_' + contactId, settings);
        // 应用CSS
        if (customCss) _applyOfflineCss(customCss);
        closeOfflineSettings();
        // 显示提示
        var toast = document.createElement('div');
        toast.textContent = '设置已保存';
        toast.style.cssText = 'position:absolute;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;white-space:nowrap;';
        var offlineApp = document.getElementById('offline-chat-app');
        if (offlineApp) offlineApp.appendChild(toast);
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2000);
    };

    window.offlineChangeBg = async function(event) {
        var file = event.target.files[0];
        if (!file || !activeOfflineContact) return;
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            // 更新预览
            var previewImg = document.getElementById('offline-bg-preview-img');
            if (previewImg) { previewImg.src = base64; previewImg.style.display = 'block'; }
            // 应用背景
            var msgBody = document.getElementById('offline-msg-container');
            if (msgBody) msgBody.style.background = 'url(' + base64 + ') center/cover no-repeat';
            // 持久化
            var contactId = activeOfflineContact.id;
            var settings = await localforage.getItem('offline_settings_' + contactId) || {};
            settings.bgImage = base64;
            await localforage.setItem('offline_settings_' + contactId, settings);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    window.offlineResetBg = async function() {
        if (!activeOfflineContact) return;
        var msgBody = document.getElementById('offline-msg-container');
        if (msgBody) msgBody.style.background = '#f0ede8';
        var previewImg = document.getElementById('offline-bg-preview-img');
        if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
        var contactId = activeOfflineContact.id;
        var settings = await localforage.getItem('offline_settings_' + contactId) || {};
        delete settings.bgImage;
        await localforage.setItem('offline_settings_' + contactId, settings);
    };

    window.offlineApplyCss = function() {
        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) _applyOfflineCss(cssEl.value.trim());
    };

    window.offlineResetCss = async function() {
        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) cssEl.value = '';
        _applyOfflineCss('');
        if (activeOfflineContact) {
            var contactId = activeOfflineContact.id;
            var settings = await localforage.getItem('offline_settings_' + contactId) || {};
            settings.customCss = '';
            await localforage.setItem('offline_settings_' + contactId, settings);
        }
    };

    function _applyOfflineCss(css) {
        var styleId = 'offline-custom-style';
        var existing = document.getElementById(styleId);
        if (!existing) {
            existing = document.createElement('style');
            existing.id = styleId;
            document.head.appendChild(existing);
        }
        existing.textContent = css || '';
    }

    /* ====== 线下CSS模板提取 ====== */
    window.offlineExtractCssTemplate = function() {
        var template = [
            '/* ====== 线下聊天 CSS 模板 ======',
            '   复制此内容到「自定义页面CSS」中，按需修改后点击「应用」。',
            '   ============================== */',
            '',
            '/* --- 全局背景 --- */',
            '.offline-msg-body {',
            '    background: #f0ede8;          /* 聊天区域背景色 */',
            '    padding: 16px 14px 90px;      /* 内边距 */',
            '    gap: 18px;                    /* 气泡间距 */',
            '}',
            '',
            '/* --- 头像（行外小头像） --- */',
            '.offline-avatar {',
            '    width: 38px;',
            '    height: 38px;',
            '    border-radius: 50%;',
            '    border: 2px solid #fff;',
            '    box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
            '}',
            '',
            '/* --- 气泡包裹器（控制整体宽度） --- */',
            '.offline-bubble-wrap {',
            '    width: 260px;',
            '    min-width: 260px;',
            '    max-width: 260px;',
            '    gap: 4px;',
            '}',
            '',
            '/* --- 气泡头部（内嵌头像+名字+时间戳） --- */',
            '.offline-bubble-header {',
            '    padding: 10px 14px 6px;',
            '    gap: 8px;',
            '}',
            '',
            '/* --- 气泡头部内嵌头像 --- */',
            '.offline-bubble-avatar {',
            '    width: 36px;',
            '    height: 36px;',
            '    border-radius: 50%;',
            '    border: 1.5px solid rgba(255,255,255,0.7);',
            '}',
            '',
            '/* --- 气泡内名字标签 --- */',
            '.offline-bubble-name {',
            '    font-size: 11px;',
            '    font-weight: 600;',
            '    color: rgba(58,48,40,0.6);',
            '}',
            '',
            '/* --- 气泡内时间戳 --- */',
            '.offline-bubble-time {',
            '    font-size: 10px;',
            '    color: rgba(58,48,40,0.4);',
            '}',
            '',
            '/* --- 气泡正文 --- */',
            '.offline-bubble-text {',
            '    padding: 4px 14px 12px;',
            '    font-size: 14px;',
            '    line-height: 1.7;',
            '    color: #3a3028;',
            '}',
            '',
            '/* --- 用户气泡（右侧） --- */',
            '.offline-me .offline-bubble {',
            '    background: #f5f1ec;          /* 右侧气泡背景色 */',
            '    border-radius: 20px;',
            '    box-shadow: 0 2px 12px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 角色气泡（左侧） --- */',
            '.offline-role .offline-bubble {',
            '    background: #ffffff;          /* 左侧气泡背景色 */',
            '    border-radius: 20px;',
            '    box-shadow: 0 2px 12px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 旁白文字（斜体灰色） --- */',
            '.offline-narration {',
            '    color: #9a9088;',
            '    font-style: italic;',
            '    font-size: 13px;',
            '    line-height: 1.7;',
            '}',
            '',
            '/* --- 对话文字（正常加粗） --- */',
            '.offline-dialogue {',
            '    color: #1a1410;',
            '    font-style: normal;',
            '    font-weight: 500;',
            '}',
            '',
            '/* --- 输入框区域 --- */',
            '.offline-input-wrap {',
            '    background: rgba(255,255,255,0.92);',
            '    border-radius: 22px;',
            '    border: 1px solid rgba(255,255,255,0.8);',
            '    box-shadow: 0 4px 20px rgba(0,0,0,0.08);',
            '}',
            '',
            '/* --- 发送按钮 --- */',
            '.offline-send-btn {',
            '    background: #7a6e64;',
            '    box-shadow: 0 3px 10px rgba(122,110,100,0.35);',
            '}',
            '',
            '/* --- 顶部导航栏 --- */',
            '.offline-header {',
            '    background: rgba(240,237,232,0.92);',
            '    border-bottom: 1px solid rgba(0,0,0,0.06);',
            '}',
            '',
            '.offline-header-title {',
            '    font-size: 16px;',
            '    font-weight: 700;',
            '    color: #3a3028;',
            '}',
        ].join('\n');

        var cssEl = document.getElementById('offline-custom-css');
        if (cssEl) {
            cssEl.value = template;
            cssEl.focus();
            /* 滚动到顶部方便查看 */
            cssEl.scrollTop = 0;
        }
        /* 提示用户 */
        var btn = document.querySelector('[onclick="offlineExtractCssTemplate()"]');
        if (btn) {
            var orig = btn.textContent;
            btn.textContent = '已填入模板！';
            btn.style.background = '#e8f5e9';
            btn.style.color = '#4caf50';
            btn.style.borderColor = '#c8e6c9';
            setTimeout(function() {
                btn.textContent = orig;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 2000);
        }
    };

    async function loadOfflineMessages() {
        var container = document.getElementById('offline-msg-container');
        if (!container || !activeOfflineContact) return;
        container.innerHTML = '';
        closeOfflineBubbleActionMenu();
        try {
            var msgs = await offlineDb.messages.where('contactId').equals(activeOfflineContact.id).toArray();
            msgs.forEach(function(msg) { container.appendChild(buildOfflineBubble(msg)); });
            requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
        } catch(e) { console.error('load offline messages failed', e); }
    }

    function buildOfflineBubble(msg) {
        var isMe = msg.sender === 'me';
        var contact = activeOfflineContact;
        var userAvatar = contact ? (contact.userAvatar || '') : '';
        var roleAvatar = contact ? (contact.roleAvatar || '') : '';
        var userName = '我';
        var roleName = contact ? (contact.roleName || '角色') : '角色';
        try {
            var myNameEl = document.getElementById('text-wechat-me-name');
            if (myNameEl && myNameEl.textContent) userName = myNameEl.textContent;
        } catch(e) {}

        var avatar = isMe ? userAvatar : roleAvatar;
        var name = isMe ? userName : roleName;
        var rowClass = isMe ? 'offline-msg-row offline-me' : 'offline-msg-row offline-role';
        var tsText = formatOfflineTimestamp(msg.timestamp || Date.now());
        var placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        var row = document.createElement('div');
        row.className = rowClass;

        var wrap = document.createElement('div');
        wrap.className = 'offline-bubble-wrap';

        // 气泡本体（无尖角，头像+名字+时间戳都在气泡内）
        var bubble = document.createElement('div');
        bubble.className = 'offline-bubble';

        // 气泡头部：头像 + 名字 + 时间戳
        var header = document.createElement('div');
        header.className = 'offline-bubble-header';

        var avatarInner = document.createElement('div');
        avatarInner.className = 'offline-bubble-avatar';
        var img = document.createElement('img');
        img.src = avatar || placeholder;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        avatarInner.appendChild(img);

        var meta = document.createElement('div');
        meta.className = 'offline-bubble-meta';

        var nameEl = document.createElement('div');
        nameEl.className = 'offline-bubble-name';
        nameEl.textContent = name;

        var timeEl = document.createElement('div');
        timeEl.className = 'offline-bubble-time';
        timeEl.textContent = tsText;

        meta.appendChild(nameEl);
        meta.appendChild(timeEl);

        header.appendChild(avatarInner);
        header.appendChild(meta);

        // 气泡正文（旁白灰色斜体，对话黑色正体）
        var textEl = document.createElement('div');
        textEl.className = 'offline-bubble-text';
        // 解析 *旁白* 和 "对话" 格式
        var rawContent = msg.content || '';
        var lines = rawContent.split('\n');
        lines.forEach(function(line, idx) {
            if (idx > 0) {
                textEl.appendChild(document.createTextNode('\n'));
            }
            // 检测整行是否为旁白（以*开头和*结尾）
            var narrationMatch = line.match(/^\*(.+)\*$/);
            if (narrationMatch) {
                var em = document.createElement('em');
                em.className = 'offline-narration';
                em.textContent = narrationMatch[1];
                textEl.appendChild(em);
            } else {
                // 在行内查找"对话"片段并高亮为黑色
                var parts = line.split(/([""][^""]*[""])/);
                parts.forEach(function(part) {
                    if (part.match(/^[""][^""]*[""]$/)) {
                        var span = document.createElement('span');
                        span.className = 'offline-dialogue';
                        span.textContent = part;
                        textEl.appendChild(span);
                    } else if (part) {
                        textEl.appendChild(document.createTextNode(part));
                    }
                });
            }
        });

        bubble.appendChild(header);
        bubble.appendChild(textEl);
        if (msg && msg.id) {
            bubble.setAttribute('data-msg-id', String(msg.id));
            bubble.style.cursor = 'pointer';
            bubble.addEventListener('click', function(e) {
                e.stopPropagation();
                openOfflineBubbleActionMenu(msg.id, bubble);
            });
        }
        wrap.appendChild(bubble);
        row.appendChild(wrap);
        return row;
    }

    window.offlineSendMessage = async function() {
        var input = document.getElementById('offline-input-field');
        if (!input || !activeOfflineContact) return;
        var content = input.value;
        if (!content || !content.trim()) return;
        var container = document.getElementById('offline-msg-container');
        var ts = Date.now();
        try {
            var newId = await offlineDb.messages.add({
                contactId: activeOfflineContact.id,
                sender: 'me',
                content: content,
                timestamp: ts
            });
            input.value = '';
            input.style.height = 'auto';
            var msg = { id: newId, contactId: activeOfflineContact.id, sender: 'me', content: content, timestamp: ts };
            container.appendChild(buildOfflineBubble(msg));
            requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
            triggerOfflineRoleReply(activeOfflineContact, content);
        } catch(e) { console.error('send offline message failed', e); }
    };

    async function triggerOfflineRoleReply(contact, userText) {
        if (offlineReplying) return;
        offlineReplying = true;
        var container = document.getElementById('offline-msg-container');
        try {
            var apiUrl = await localforage.getItem('miffy_api_url');
            var apiKey = await localforage.getItem('miffy_api_key');
            var model = await localforage.getItem('miffy_api_model');
            var temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            if (!apiUrl || !apiKey || !model) return;
            var ctxRaw = await localforage.getItem('miffy_api_ctx');
            var ctxLimit = (ctxRaw !== null && ctxRaw !== '') ? parseInt(ctxRaw) : 10;
            var allMsgs = await offlineDb.messages.where('contactId').equals(contact.id).toArray();
            var recentMsgs = (ctxLimit === 0) ? allMsgs : allMsgs.slice(-ctxLimit);
            var allOnlineMsgs = [];
            try {
                allOnlineMsgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
                allOnlineMsgs = allOnlineMsgs.filter(function(m) { return m.source !== 'sms'; });
            } catch (eOnline) {
                allOnlineMsgs = [];
            }
            var recentOnlineMsgs = (ctxLimit === 0) ? allOnlineMsgs : allOnlineMsgs.slice(-ctxLimit);
            var now = new Date();
            var weeks2 = ['\u5468\u65e5','\u5468\u4e00','\u5468\u4e8c','\u5468\u4e09','\u5468\u56db','\u5468\u4e94','\u5468\u516d'];
            var timeStr = now.getFullYear() + '\u5e74' + (now.getMonth()+1) + '\u6708' + now.getDate() + '\u65e5 ' +
                weeks2[now.getDay()] + ' ' +
                String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
            var sysPrompt = '你与用户开启了可感知、真实、沉浸式的线下见面。\n' +
                '全程以陪伴呈现，只输出细腻、有画面感、贴近现实的情景描写与剧情推进，注重沉浸感。不允许替用户做出回复。\n' +
                '【格式要求】旁白使用灰色斜体（用星号包裹：*旁白内容*），对话内容放在双引号内（如："你好"），每次只输出1段连贯的叙述，不要输出JSON格式，直接输出纯文本。\n' +
                '【时间】' + timeStr + '\n';
            if (contact.roleDetail) sysPrompt += '角色设定：' + contact.roleDetail + '\n';
            if (contact.userDetail) sysPrompt += '用户设定：' + contact.userDetail + '\n';
            if (recentOnlineMsgs.length > 0) {
                var roleName = contact.roleName || '角色';
                var onlineMemoryText = recentOnlineMsgs.map(function(m) {
                    var sender = m.sender === 'me' ? '用户' : roleName;
                    var text = '';
                    if (typeof extractMsgPureText === 'function') text = extractMsgPureText(m.content || '');
                    else text = String(m.content || '');
                    return sender + '：' + text;
                }).join('\n');
                sysPrompt += '【跨模式记忆：线上聊天】以下为你们最近在线上聊过的内容。线下续写时必须视为已发生事实并自然延续：\n' + onlineMemoryText + '\n';
            }
            var messages = [{ role: 'system', content: sysPrompt }];
            recentMsgs.forEach(function(m) {
                messages.push({ role: m.sender === 'me' ? 'user' : 'assistant', content: m.content });
            });
            if (recentMsgs.length > 0 && recentMsgs[recentMsgs.length - 1].sender !== 'me') {
                messages.push({ role: 'user', content: '请紧接上一段线下剧情继续自然推进。' });
            }
            var cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            var endpoint = cleanApiUrl + '/v1/chat/completions';
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model, messages: messages, temperature: temp })
            });
            if (!response.ok) return;
            var data = await response.json();
            var replyText = data.choices[0].message.content.trim();
            try {
                var parsed = JSON.parse(replyText);
                if (parsed && parsed.content) replyText = parsed.content;
                else if (Array.isArray(parsed) && parsed[0] && parsed[0].content) replyText = parsed[0].content;
            } catch(e2) {}
            var replyTs = Date.now();
            var replyId = await offlineDb.messages.add({
                contactId: contact.id,
                sender: 'role',
                content: replyText,
                timestamp: replyTs
            });
            var app = document.getElementById('offline-chat-app');
            if (app && app.style.display === 'flex' && activeOfflineContact && activeOfflineContact.id === contact.id) {
                var replyMsg = { id: replyId, contactId: contact.id, sender: 'role', content: replyText, timestamp: replyTs };
                container.appendChild(buildOfflineBubble(replyMsg));
                requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
            }
        } catch(e) { console.error('offline role reply failed', e); }
        finally { offlineReplying = false; }
    }

    document.addEventListener('DOMContentLoaded', function() {
        var offlineInput = document.getElementById('offline-input-field');
        if (offlineInput) {
            offlineInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 100) + 'px';
            });
        }
        var offlineContainer = document.getElementById('offline-msg-container');
        if (offlineContainer) {
            offlineContainer.addEventListener('scroll', function() {
                closeOfflineBubbleActionMenu();
            }, { passive: true });
        }
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#offline-bubble-action-menu') && !e.target.closest('.offline-bubble')) {
                closeOfflineBubbleActionMenu();
            }
        });
    });

})();
