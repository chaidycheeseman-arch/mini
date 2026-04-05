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

    // 只收集遇恋NPC添加到WeChat的通知（不显示联系人列表和拉黑按钮）
    let mlAddRequests = [];
    try {
        const saved = await localforage.getItem('ml_wechat_add_requests') || [];
        mlAddRequests = saved.filter(r => r.status === 'pending');
    } catch(e) { console.error(e); }

    // 渲染遇恋NPC添加通知
    if (mlAddRequests.length > 0) {
        const sectionTitle = document.createElement('div');
        sectionTitle.style.cssText = 'font-size:12px;color:#aaa;padding:8px 0 6px;font-weight:500;letter-spacing:0.3px;';
        sectionTitle.textContent = '遇恋好友申请';
        content.appendChild(sectionTitle);

        mlAddRequests.forEach((req, idx) => {
            const avatarHtml = req.avatar
                ? `<img src="${req.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : `<div style="width:100%;height:100%;background:#f8bbd0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:#e91e63;">♡</div>`;
            const item = document.createElement('div');
            item.style.cssText = 'background:#fff;border-radius:16px;padding:14px;border:1px solid #f0f0f0;display:flex;gap:12px;align-items:flex-start;';
            item.innerHTML = `
                <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;">${avatarHtml}</div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;overflow:hidden;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:14px;font-weight:600;color:#333;">${req.name || '遇恋用户'}</span>
                        <span style="font-size:10px;color:#e91e63;background:#fce4ec;padding:1px 6px;border-radius:8px;font-weight:600;">遇恋</span>
                        <span style="font-size:10px;color:#bbb;">${req.time || ''}</span>
                    </div>
                    <div style="font-size:12px;color:#666;background:#f7f8fa;border-radius:10px;padding:8px 10px;line-height:1.5;">${req.msg || '我们在遇恋相遇，加个微信吧～'}</div>
                    <div style="display:flex;gap:8px;margin-top:2px;">
                        <div onclick="mlAddRequestReject(${idx})" style="flex:1;height:34px;border-radius:10px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:13px;color:#888;cursor:pointer;font-weight:500;border:1px solid #eee;">拒绝</div>
                        <div onclick="mlAddRequestAgree(${idx})" style="flex:1;height:34px;border-radius:10px;background:#f0f5ff;display:flex;align-items:center;justify-content:center;font-size:13px;color:#5b7fe0;cursor:pointer;font-weight:500;border:1px solid #c6d4f5;">接受</div>
                    </div>
                </div>
            `;
            content.appendChild(item);
        });
    }

    if (mlAddRequests.length === 0) {
        content.innerHTML = '<div style="color:#bbb;font-size:13px;text-align:center;margin:20px 0;">暂无新朋友申请</div>';
    }
}
