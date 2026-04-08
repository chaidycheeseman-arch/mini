// Auto-split from js/wallet/wallet-and-wechat.js (526-697)

// ====== 红包功能逻辑 ======
(function() {
    var _rpAmount = '';
    var _rpDesc = '';
    var _rpPwdInput = '';

    // 打开红包弹窗
    window.openRedPacketModal = function() {
        if (!activeChatContact) return;
        hideChatExtPanel();
        var modal = document.getElementById('red-packet-modal');
        var sheet = document.getElementById('red-packet-sheet');
        document.getElementById('red-packet-amount-input').value = '';
        document.getElementById('red-packet-desc-input').value = '';
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    window.closeRedPacketModal = function() {
        var sheet = document.getElementById('red-packet-sheet');
        var modal = document.getElementById('red-packet-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 340);
    };

    // 点击"塞入红包·发送"
    window.submitRedPacket = async function() {
        var amountVal = document.getElementById('red-packet-amount-input').value.trim();
        var descVal = document.getElementById('red-packet-desc-input').value.trim();
        var amount = parseFloat(amountVal);
        if (!amountVal || isNaN(amount) || amount <= 0) {
            document.getElementById('red-packet-amount-input').focus();
            return;
        }
        _rpAmount = amount.toFixed(2);
        _rpDesc = descVal || '恭喜发财，大吉大利';
        closeRedPacketModal();
        // 检查是否开启免密
        var noPwd = false;
        try { noPwd = !!(await localforage.getItem('no_pwd_pay_enabled')); } catch(e) {}
        if (noPwd) {
            // 免密直接发送
            await _doSendRedPacket();
        } else {
            // 弹出支付密码
            var stored = null;
            try { stored = await localforage.getItem('pay_password'); } catch(e) {}
            if (!stored) {
                // 未设置密码，直接发
                await _doSendRedPacket();
                return;
            }
            _rpPwdInput = '';
            _updateRpBoxes();
            document.getElementById('rp-pay-amount-hint').textContent = '发送红包 ¥' + _rpAmount;
            var overlay = document.getElementById('rp-pay-pwd-overlay');
            var sheet2 = document.getElementById('rp-pay-pwd-sheet');
            overlay.style.display = 'block';
            sheet2.style.display = 'block';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    sheet2.style.transform = 'translateY(0)';
                });
            });
        }
    };

    window.closeRpPayPwd = function() {
        var sheet2 = document.getElementById('rp-pay-pwd-sheet');
        var overlay = document.getElementById('rp-pay-pwd-overlay');
        sheet2.style.transform = 'translateY(100%)';
        setTimeout(function() {
            sheet2.style.display = 'none';
            overlay.style.display = 'none';
        }, 320);
        _rpPwdInput = '';
    };

    function _updateRpBoxes() {
        for (var i = 0; i < 6; i++) {
            var box = document.getElementById('rppb' + i);
            if (!box) continue;
            box.innerHTML = i < _rpPwdInput.length
                ? '<span style="width:10px;height:10px;border-radius:50%;background:#333;display:inline-block;"></span>'
                : '';
            box.className = 'pay-pwd-box'
                + (i < _rpPwdInput.length ? ' filled' : '')
                + (i === _rpPwdInput.length ? ' active' : '');
        }
    }

    window.rpPayKeyInput = async function(digit) {
        if (_rpPwdInput.length >= 6) return;
        _rpPwdInput += digit;
        _updateRpBoxes();
        if (_rpPwdInput.length === 6) {
            var stored = null;
            try { stored = await localforage.getItem('pay_password'); } catch(e) {}
            if (_rpPwdInput === stored) {
                closeRpPayPwd();
                setTimeout(async function() { await _doSendRedPacket(); }, 360);
            } else {
                // 密码错误抖动
                _rpPwdInput = '';
                var wrap = document.querySelector('#rp-pay-pwd-sheet .pay-pwd-box');
                if (wrap && wrap.parentElement) {
                    var p = wrap.parentElement;
                    var seq = [6, -6, 5, -5, 3, 0];
                    var idx = 0;
                    var t = setInterval(function() {
                        p.style.transform = 'translateX(' + seq[idx] + 'px)';
                        idx++;
                        if (idx >= seq.length) { clearInterval(t); p.style.transform = ''; }
                    }, 60);
                }
                setTimeout(function() { _updateRpBoxes(); }, 100);
            }
        }
    };

    window.rpPayKeyDel = function() {
        if (_rpPwdInput.length > 0) {
            _rpPwdInput = _rpPwdInput.slice(0, -1);
            _updateRpBoxes();
        }
    };

    async function _doSendRedPacket() {
        if (!activeChatContact) return;
        var amount = parseFloat(_rpAmount);
        // 检查并扣减钱包余额
        var walletBal = parseFloat((document.getElementById('text-wallet-bal').textContent || '0').replace(/,/g, '')) || 0;
        if (amount > walletBal) {
            alert('余额不足（当前余额 ¥' + walletBal.toFixed(2) + '），无法发送红包');
            return;
        }
        var newWalletBal = walletBal - amount;
        document.getElementById('text-wallet-bal').textContent = newWalletBal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        walletDb.kv.put({ key: 'walletBalance', value: newWalletBal }).catch(function(e) { console.error("余额持久化失败", e); });
        var content = createMiniStructuredMessage('red_packet', { amount: _rpAmount, memo: _rpDesc, status: 'unclaimed' });
        var newMsgId = await appendCurrentUserMessageContent(content, activeChatContact);
        if (!newMsgId) {
            console.error('发送红包失败');
            return;
        }
        _addBill('red_packet', '发红包', amount, true, activeChatContact.roleName || '对方');
    }
})();

