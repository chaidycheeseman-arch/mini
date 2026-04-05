// Auto-split from js/wallet/wallet-and-wechat.js (2142-2340)

// ====== 支付密码功能 ======
(function() {
  var PAY_PWD_KEY = 'pay_password';
  var _payInput = '';
  var _payStep = 'check'; // 'check' | 'set' | 'confirm'
  var _payFirst = '';

  function updateBoxes() {
    for (var i = 0; i < 6; i++) {
      var box = document.getElementById('ppb' + i);
      if (!box) continue;
      box.innerHTML = i < _payInput.length ? '<span style="width:10px;height:10px;border-radius:50%;background:#333;display:inline-block;"></span>' : '';
      box.className = 'pay-pwd-box' + (i < _payInput.length ? ' filled' : '') + (i === _payInput.length ? ' active' : '');
    }
  }

  window.openPayPwd = async function() {
    _payInput = '';
    _payFirst = '';
    var stored = null;
    try { stored = await localforage.getItem(PAY_PWD_KEY); } catch(e) {}
    if (stored) {
      _payStep = 'check';
      document.getElementById('pay-pwd-title').textContent = '请输入支付密码';
      document.getElementById('pay-forgot-link').style.display = 'block';
    } else {
      _payStep = 'set';
      document.getElementById('pay-pwd-title').textContent = '设置支付密码';
      document.getElementById('pay-forgot-link').style.display = 'none';
    }
    updateBoxes();
    var overlay = document.getElementById('pay-pwd-overlay');
    var sheet = document.getElementById('pay-pwd-sheet');
    overlay.style.display = 'block';
    sheet.style.display = 'block';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        sheet.style.transform = 'translateY(0)';
      });
    });
  };

  window.closePayPwd = function() {
    var sheet = document.getElementById('pay-pwd-sheet');
    var overlay = document.getElementById('pay-pwd-overlay');
    sheet.style.transform = 'translateY(100%)';
    setTimeout(function() {
      sheet.style.display = 'none';
      overlay.style.display = 'none';
    }, 320);
    _payInput = '';
  };

  window.payKeyInput = async function(digit) {
    if (_payInput.length >= 6) return;
    _payInput += digit;
    updateBoxes();
    if (_payInput.length === 6) {
      await handlePayComplete();
    }
  };

  window.payKeyDel = function() {
    if (_payInput.length > 0) {
      _payInput = _payInput.slice(0, -1);
      updateBoxes();
    }
  };

  async function handlePayComplete() {
    var stored = null;
    try { stored = await localforage.getItem(PAY_PWD_KEY); } catch(e) {}
    if (_payStep === 'check') {
      if (_payInput === stored) {
        closePayPwd();
        setTimeout(function() { showToast('验证成功 '); }, 350);
      } else {
        document.getElementById('pay-pwd-title').textContent = '密码错误，请重试';
        setTimeout(function() {
          _payInput = '';
          document.getElementById('pay-pwd-title').textContent = '请输入支付密码';
          updateBoxes();
        }, 600);
        shakeBoxes();
      }
    } else if (_payStep === 'set') {
      _payFirst = _payInput;
      _payInput = '';
      _payStep = 'confirm';
      document.getElementById('pay-pwd-title').textContent = '再次确认密码';
      updateBoxes();
    } else if (_payStep === 'confirm') {
      if (_payInput === _payFirst) {
        try { await localforage.setItem(PAY_PWD_KEY, _payInput); } catch(e) {}
        closePayPwd();
        setTimeout(function() { showToast('支付密码设置成功 '); }, 350);
      } else {
        document.getElementById('pay-pwd-title').textContent = '两次密码不一致，重新设置';
        setTimeout(function() {
          _payInput = ''; _payFirst = ''; _payStep = 'set';
          document.getElementById('pay-pwd-title').textContent = '设置支付密码';
          updateBoxes();
        }, 700);
        shakeBoxes();
      }
    }
  }

  function shakeBoxes() {
    var wrap = document.querySelector('#pay-pwd-sheet .pay-pwd-box')?.parentElement;
    if (!wrap) return;
    wrap.style.animation = 'none';
    wrap.style.transition = 'transform 0.08s';
    var seq = [6, -6, 5, -5, 3, 0];
    var i = 0;
    var t = setInterval(function() {
      wrap.style.transform = 'translateX(' + seq[i] + 'px)';
      i++;
      if (i >= seq.length) { clearInterval(t); wrap.style.transform = ''; }
    }, 60);
  }

  window.forgotPayPwd = async function() {
    if (confirm('确认重置支付密码？')) {
      try { await localforage.removeItem(PAY_PWD_KEY); } catch(e) {}
      _payInput = ''; _payFirst = ''; _payStep = 'set';
      document.getElementById('pay-pwd-title').textContent = '设置新支付密码';
      document.getElementById('pay-forgot-link').style.display = 'none';
      updateBoxes();
    }
  };

  function showToast(msg) {
    if (typeof window.showToast === 'function' && window.showToast !== showToast) { window.showToast(msg); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:999;pointer-events:none;white-space:nowrap;';
    var screen = document.querySelector('.phone-screen');
    if (screen) screen.appendChild(t);
    setTimeout(function() { t.remove(); }, 2000);
  }
})();

// ====== 解除拉黑申请列表（新朋友页面）======
// 说明：新朋友弹窗仅用于：
//   1. 角色被用户拉黑后发来的解除拉黑申请
//   2. 遇恋NPC角色主动添加到WeChat的通知
// 不显示联系人列表，不显示拉黑按钮。
async function openBlockRequestList() {
    const modal = document.getElementById('block-request-list-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const content = document.getElementById('block-request-list-content');
    if (!content) return;
    content.innerHTML = '';
    try {
        await localforage.removeItem('ml_wechat_add_requests');
    } catch(e) {}
    content.innerHTML = '<div style="color:#bbb;font-size:13px;text-align:center;margin:20px 0;">暂无新朋友申请</div>';
}

// 记忆应用角色添加到 WeChat：拒绝
async function mlAddRequestReject(idx) {
    try {
        await localforage.removeItem('ml_wechat_add_requests');
        updateBlockRequestBadge();
        openBlockRequestList();
    } catch(e) { console.error(e); }
}

// 记忆应用角色添加到 WeChat：接受 → 自动创建联系人并开启聊天
async function mlAddRequestAgree(idx) {
    try {
        await localforage.removeItem('ml_wechat_add_requests');
        updateBlockRequestBadge();
        openBlockRequestList();
    } catch(e) { console.error('清理记忆申请失败', e); }
}

// 记忆大厅：喜欢卡片时，角色发起添加 WeChat 申请
async function mlSendWechatAddRequest(npcName, npcAvatar, npcDetail, npcGender) {
    try {
        await localforage.removeItem('ml_wechat_add_requests');
        updateBlockRequestBadge();
    } catch(e) { console.error('清理记忆申请失败', e); }
}

function closeBlockRequestList() {
    const modal = document.getElementById('block-request-list-modal');
    if (modal) modal.style.display = 'none';
}

// 关闭新朋友弹窗并打开添加联系人弹窗（确保新朋友弹窗先隐藏，联系人编辑器完全置于顶层）
function closeBlockRequestListAndOpenEditor() {
    // 1. 立即隐藏新朋友弹窗
    const modal = document.getElementById('block-request-list-modal');
    if (modal) modal.style.display = 'none';
    // 2. 使用 requestAnimationFrame 确保 DOM 更新后再打开编辑器，防止层级残留
    requestAnimationFrame(function() {
        openContactEditor();
    });
}

// 在申请列表中拒绝某条申请
async function blockListReject(contactId, reqIdx) {
    try {
        let reqs = await localforage.getItem('block_requests_' + contactId) || [];
        const pendingReqs = reqs.filter(r => r.status === 'pending');
        if (pendingReqs[reqIdx]) {
            // 找到原始索引并标记为rejected
            let pi = -1;
            let count = 0;
            for (let i = 0; i < reqs.length; i++) {
                if (reqs[i].status === 'pending') {
                    if (count === reqIdx) { pi = i; break; }
                    count++;
                }
            }
            if (pi >= 0) reqs[pi].status = 'rejected';
            await localforage.setItem('block_requests_' + contactId, reqs);
        }
        updateBlockRequestBadge();
        openBlockRequestList(); // 刷新列表
    } catch(e) { console.error(e); }
}

// 在申请列表中同意解除拉黑
async function blockListAgree(contactId) {
    try {
        const contact = await contactDb.contacts.get(contactId);
        if (contact) {
            contact.blocked = false;
            await contactDb.contacts.put(contact);
            if (activeChatContact && activeChatContact.id === contactId) {
                activeChatContact.blocked = false;
                updateRpBlockBtn();
            }
            await localforage.removeItem('block_aware_' + contactId);
            await localforage.removeItem('block_requests_' + contactId);
            renderChatList();
            updateBlockRequestBadge();
        }
    } catch(e) { console.error(e); }
    openBlockRequestList(); // 刷新列表
}

// 初始化时更新徽章
document.addEventListener('DOMContentLoaded', function() {
    updateBlockRequestBadge();
});
