// Auto-split from js/wallet/wallet-and-wechat.js (698-844)

// ====== 转账功能逻辑 ======
(function() {
    var _tfAmount = '';
    var _tfDesc = '';
    var _tfPwdInput = '';

    window.openTransferModal = function() {
        if (!activeChatContact) return;
        hideChatExtPanel();
        var modal = document.getElementById('transfer-modal');
        var sheet = document.getElementById('transfer-sheet');
        document.getElementById('transfer-amount-input').value = '';
        document.getElementById('transfer-desc-input').value = '';
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    window.closeTransferModal = function() {
        var sheet = document.getElementById('transfer-sheet');
        var modal = document.getElementById('transfer-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 340);
    };

    window.submitTransfer = async function() {
        var amountVal = document.getElementById('transfer-amount-input').value.trim();
        var descVal = document.getElementById('transfer-desc-input').value.trim();
        var amount = parseFloat(amountVal);
        if (!amountVal || isNaN(amount) || amount <= 0) {
            document.getElementById('transfer-amount-input').focus();
            return;
        }
        _tfAmount = amount.toFixed(2);
        const myNameForTf = document.getElementById('text-wechat-me-name') ? document.getElementById('text-wechat-me-name').textContent : '我';
        _tfDesc = descVal || (myNameForTf + ' 发起了转账');
        closeTransferModal();
        var noPwd = false;
        try { noPwd = !!(await localforage.getItem('no_pwd_pay_enabled')); } catch(e) {}
        if (noPwd) {
            await _doSendTransfer();
        } else {
            var stored = null;
            try { stored = await localforage.getItem('pay_password'); } catch(e) {}
            if (!stored) {
                await _doSendTransfer();
                return;
            }
            _tfPwdInput = '';
            _updateTfBoxes();
            document.getElementById('tf-pay-amount-hint').textContent = '转账 ¥' + _tfAmount;
            var overlay = document.getElementById('tf-pay-pwd-overlay');
            var sheet2 = document.getElementById('tf-pay-pwd-sheet');
            overlay.style.display = 'block';
            sheet2.style.display = 'block';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    sheet2.style.transform = 'translateY(0)';
                });
            });
        }
    };

    window.closeTfPayPwd = function() {
        var sheet2 = document.getElementById('tf-pay-pwd-sheet');
        var overlay = document.getElementById('tf-pay-pwd-overlay');
        sheet2.style.transform = 'translateY(100%)';
        setTimeout(function() {
            sheet2.style.display = 'none';
            overlay.style.display = 'none';
        }, 320);
        _tfPwdInput = '';
    };

    function _updateTfBoxes() {
        for (var i = 0; i < 6; i++) {
            var box = document.getElementById('tfpb' + i);
            if (!box) continue;
            box.innerHTML = i < _tfPwdInput.length
                ? '<span style="width:10px;height:10px;border-radius:50%;background:#333;display:inline-block;"></span>'
                : '';
            box.className = 'pay-pwd-box'
                + (i < _tfPwdInput.length ? ' filled' : '')
                + (i === _tfPwdInput.length ? ' active' : '');
        }
    }

    window.tfPayKeyInput = async function(digit) {
        if (_tfPwdInput.length >= 6) return;
        _tfPwdInput += digit;
        _updateTfBoxes();
        if (_tfPwdInput.length === 6) {
            var stored = null;
            try { stored = await localforage.getItem('pay_password'); } catch(e) {}
            if (_tfPwdInput === stored) {
                closeTfPayPwd();
                setTimeout(async function() { await _doSendTransfer(); }, 360);
            } else {
                _tfPwdInput = '';
                var wrap = document.querySelector('#tf-pay-pwd-sheet .pay-pwd-box');
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
                setTimeout(function() { _updateTfBoxes(); }, 100);
            }
        }
    };

    window.tfPayKeyDel = function() {
        if (_tfPwdInput.length > 0) {
            _tfPwdInput = _tfPwdInput.slice(0, -1);
            _updateTfBoxes();
        }
    };

    async function _doSendTransfer() {
        if (!activeChatContact) return;
        var amount = parseFloat(_tfAmount);
        // 检查并扣减钱包余额
        var walletBal = parseFloat((document.getElementById('text-wallet-bal').textContent || '0').replace(/,/g, '')) || 0;
        if (amount > walletBal) {
            alert('余额不足（当前余额 ¥' + walletBal.toFixed(2) + '），无法发起转账');
            return;
        }
        var newWalletBal = walletBal - amount;
        document.getElementById('text-wallet-bal').textContent = newWalletBal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        walletDb.kv.put({ key: 'walletBalance', value: newWalletBal }).catch(function(e) { console.error("余额持久化失败", e); });
        var content = createMiniStructuredMessage('transfer', { amount: _tfAmount, memo: _tfDesc, status: 'pending' });
        var newMsgId = await appendCurrentUserMessageContent(content, activeChatContact);
        if (!newMsgId) {
            console.error('发送转账失败');
            return;
        }
        _addBill('transfer', '转账', amount, true, activeChatContact.roleName || '对方');
    }
})();

