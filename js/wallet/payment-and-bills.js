// Auto-split from js/wallet/wallet-and-wechat.js (845-1269)

// ====== 免密支付功能 ======
(function() {
    var NO_PWD_KEY = 'no_pwd_pay_enabled';
    var isNoPwdEnabled = false;

    window.openNoPwdPayModal = async function() {
        // 读取开关状态
        try { isNoPwdEnabled = !!(await localforage.getItem(NO_PWD_KEY)); } catch(e) { isNoPwdEnabled = false; }
        // 同步 Toggle UI
        var toggle = document.getElementById('no-pwd-toggle');
        var thumb = document.getElementById('no-pwd-toggle-thumb');
        if (toggle && thumb) {
            toggle.style.background = isNoPwdEnabled ? '#4cd964' : '#ddd';
            thumb.style.left = isNoPwdEnabled ? '22px' : '2px';
        }
        var modal = document.getElementById('no-pwd-pay-modal');
        var sheet = document.getElementById('no-pwd-pay-sheet');
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    window.closeNoPwdPayModal = function() {
        var sheet = document.getElementById('no-pwd-pay-sheet');
        var modal = document.getElementById('no-pwd-pay-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() {
            modal.style.display = 'none';
        }, 340);
    };

    window.toggleNoPwdPay = async function() {
        isNoPwdEnabled = !isNoPwdEnabled;
        try { await localforage.setItem(NO_PWD_KEY, isNoPwdEnabled); } catch(e) {}
        var toggle = document.getElementById('no-pwd-toggle');
        var thumb = document.getElementById('no-pwd-toggle-thumb');
        if (toggle && thumb) {
            toggle.style.background = isNoPwdEnabled ? '#4cd964' : '#ddd';
            thumb.style.left = isNoPwdEnabled ? '22px' : '2px';
        }
    };
})();

// ====== 账单系统 (持久化: Dexie.js + IndexedDB via walletDb) ======
var _billList = [];

async function _addBill(type, name, amount, isOut, detail) {
    var now = new Date();
    var h = String(now.getHours()).padStart(2,'0');
    var m = String(now.getMinutes()).padStart(2,'0');
    var mo = String(now.getMonth()+1).padStart(2,'0');
    var d = String(now.getDate()).padStart(2,'0');
    var bill = {
        type: type,       // 'recharge'|'withdraw'|'red_packet'|'transfer'|'stock'|'bank_card'|'family_card'
        name: name,       // 显示名称
        amount: amount,   // 数字
        isOut: isOut,     // true=支出/扣减, false=收入/增加
        detail: detail || '',
        time: mo + '-' + d + ' ' + h + ':' + m
    };
    _billList.unshift(bill);
    if (_billList.length > 50) _billList = _billList.slice(0, 50);
    // 持久化到 IndexedDB
    try {
        await walletDb.bills.add(bill);
        // 若超过50条，删除最旧的
        const allBills = await walletDb.bills.orderBy('id').toArray();
        if (allBills.length > 50) {
            const toDelete = allBills.slice(0, allBills.length - 50).map(b => b.id);
            await walletDb.bills.bulkDelete(toDelete);
        }
    } catch(e) { console.error("账单持久化失败", e); }
    _renderBills();
}

function _renderBills() {
    var section = document.querySelector('.wallet-bill-section');
    if (!section) return;
    // 找到空状态容器
    var emptyBox = section.querySelector('div[style*="min-height"]');
    if (_billList.length === 0) {
        if (emptyBox) emptyBox.style.display = 'flex';
        return;
    }
    if (emptyBox) emptyBox.style.display = 'none';
    // 找或创建账单列表容器
    var listEl = section.querySelector('#wallet-bill-list');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'wallet-bill-list';
        listEl.style.cssText = 'display:flex; flex-direction:column; gap:10px; padding-bottom:20px;';
        section.appendChild(listEl);
    }
    listEl.innerHTML = '';
    // 图标映射（SVG线条，无emoji）
    var iconMap = {
        recharge:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#667eea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>',
        withdraw:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
        red_packet:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#e8534a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="3" ry="3"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>',
        transfer:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1a6fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
        stock:       '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8e44ad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
        bank_card:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
        family_card: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
    };
    var bgMap = {
        recharge: '#f0f0ff', withdraw: '#f0fff4', red_packet: '#fff2f2',
        transfer: '#f0f6ff', stock: '#f8f0ff', bank_card: '#f5f5f5', family_card: '#fafafa'
    };
    _billList.forEach(function(bill) {
        var icon = iconMap[bill.type] || iconMap['bank_card'];
        var bg = bgMap[bill.type] || '#f5f5f5';
        var amtColor = bill.isOut ? '#333' : '#27ae60';
        var amtPrefix = bill.isOut ? '-' : '+';
        var item = document.createElement('div');
        item.className = 'wallet-bill-item';
        item.innerHTML = '<div class="wallet-bill-left">' +
            '<div class="wallet-bill-icon" style="background:' + bg + ';">' + icon + '</div>' +
            '<div class="wallet-bill-info">' +
                '<div class="wallet-bill-name">' + bill.name + '</div>' +
                '<div class="wallet-bill-time">' + (bill.detail ? bill.detail + ' · ' : '') + bill.time + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="wallet-bill-amount" style="color:' + amtColor + ';">' + amtPrefix + '¥' + parseFloat(bill.amount).toFixed(2) + '</div>';
        listEl.appendChild(item);
    });
}

// ====== 充值 & 提现功能 ======
(function() {
    // 内部状态：当前选中的来源/目标索引（-1=未选，>=0=银行卡序号，'family_N'=亲属卡）
    var _rechargeSelectedIndex = -1;
    var _withdrawSelectedIndex = -1;

    // ---- 辅助：读取当前余额数字 ----
    function _getWalletBalance() {
        var el = document.getElementById('text-wallet-bal');
        if (!el) return 0;
        var raw = el.textContent.replace(/,/g, '').trim();
        return parseFloat(raw) || 0;
    }

    // ---- 辅助：设置余额显示 ----
    function _setWalletBalance(val) {
        var el = document.getElementById('text-wallet-bal');
        if (!el) return;
        el.textContent = val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ---- 辅助：读取银行卡余额（从DOM中的 .sim-card-balance-amount） ----
    function _getBankCardBalance(cardEl) {
        var amountEl = cardEl.querySelector('.sim-card-balance-amount');
        if (!amountEl) return 0;
        var raw = amountEl.textContent.replace('¥', '').replace(/,/g, '').trim();
        return parseFloat(raw) || 0;
    }

    // ---- 辅助：设置银行卡余额 ----
    function _setBankCardBalance(cardEl, val) {
        var amountEl = cardEl.querySelector('.sim-card-balance-amount');
        if (!amountEl) return;
        amountEl.textContent = '¥ ' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ---- 辅助：获取所有银行卡 DOM 元素 ----
    function _getBankCards() {
        return Array.from(document.querySelectorAll('#bank-card-list .sim-bank-card'));
    }

    // ---- 辅助：构建选项行（通用） ----
    function _buildOptionRow(label, subLabel, index, selectedIndex, onSelect) {
        var row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; cursor:pointer; gap:10px;';
        var left = document.createElement('div');
        left.style.cssText = 'display:flex; flex-direction:column; gap:3px; flex:1; overflow:hidden;';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:14px; font-weight:500; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        nameEl.textContent = label;
        var subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:11px; color:#aaa;';
        subEl.textContent = subLabel;
        left.appendChild(nameEl);
        left.appendChild(subEl);
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = onSelect === 'recharge' ? 'recharge-source' : 'withdraw-target';
        radio.style.cssText = 'width:16px; height:16px; accent-color:#667eea; flex-shrink:0;';
        radio.value = index;
        radio.addEventListener('change', function() {
            if (onSelect === 'recharge') _rechargeSelectedIndex = index;
            else _withdrawSelectedIndex = index;
        });
        row.appendChild(left);
        row.appendChild(radio);
        return row;
    }

    // ---- 构建亲属卡选项（未完善提示） ----
    function _buildFamilyRow(listId, onSelect) {
        var row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; cursor:not-allowed; gap:10px; opacity:0.45;';
        var left = document.createElement('div');
        left.style.cssText = 'display:flex; flex-direction:column; gap:3px; flex:1;';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:14px; font-weight:500; color:#333;';
        nameEl.textContent = '亲属卡';
        var subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:11px; color:#aaa;';
        subEl.textContent = '（未完善）';
        left.appendChild(nameEl);
        left.appendChild(subEl);
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = onSelect === 'recharge' ? 'recharge-source' : 'withdraw-target';
        radio.disabled = true;
        radio.style.cssText = 'width:16px; height:16px; flex-shrink:0;';
        row.appendChild(left);
        row.appendChild(radio);
        return row;
    }

    // ---- 填充充值来源列表 ----
    function _populateRechargeList() {
        var list = document.getElementById('recharge-source-list');
        if (!list) return;
        list.innerHTML = '';
        _rechargeSelectedIndex = -1;
        var cards = _getBankCards();
        if (cards.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:16px; font-size:13px; color:#bbb; text-align:center;';
            empty.textContent = '暂无银行卡，请先添加';
            list.appendChild(empty);
        } else {
            cards.forEach(function(card, idx) {
                var nameEl = card.querySelector('.sim-card-bank-name');
                var name = nameEl ? nameEl.textContent : ('银行卡 ' + (idx + 1));
                var bal = _getBankCardBalance(card);
                var balStr = '余额 ¥' + bal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                var divider = document.createElement('div');
                divider.style.cssText = 'height:1px; background:#f0f0f0; margin:0 16px;';
                if (idx > 0) list.appendChild(divider);
                var row = _buildOptionRow(name, balStr, idx, _rechargeSelectedIndex, 'recharge');
                list.appendChild(row);
            });
        }
        // 亲属卡（未完善）
        if (cards.length > 0) {
            var divider2 = document.createElement('div');
            divider2.style.cssText = 'height:1px; background:#f0f0f0; margin:0 16px;';
            list.appendChild(divider2);
        }
        list.appendChild(_buildFamilyRow('recharge-source-list', 'recharge'));
    }

    // ---- 填充提现目标列表 ----
    function _populateWithdrawList() {
        var list = document.getElementById('withdraw-target-list');
        if (!list) return;
        list.innerHTML = '';
        _withdrawSelectedIndex = -1;
        var cards = _getBankCards();
        if (cards.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:16px; font-size:13px; color:#bbb; text-align:center;';
            empty.textContent = '暂无银行卡，请先添加';
            list.appendChild(empty);
        } else {
            cards.forEach(function(card, idx) {
                var nameEl = card.querySelector('.sim-card-bank-name');
                var name = nameEl ? nameEl.textContent : ('银行卡 ' + (idx + 1));
                var bal = _getBankCardBalance(card);
                var balStr = '余额 ¥' + bal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                var divider = document.createElement('div');
                divider.style.cssText = 'height:1px; background:#f0f0f0; margin:0 16px;';
                if (idx > 0) list.appendChild(divider);
                var row = _buildOptionRow(name, balStr, idx, _withdrawSelectedIndex, 'withdraw');
                list.appendChild(row);
            });
        }
        // 亲属卡（未完善）
        if (cards.length > 0) {
            var divider2 = document.createElement('div');
            divider2.style.cssText = 'height:1px; background:#f0f0f0; margin:0 16px;';
            list.appendChild(divider2);
        }
        list.appendChild(_buildFamilyRow('withdraw-target-list', 'withdraw'));
    }

    // ---- 打开充值弹窗 ----
    window.openRechargeModal = function() {
        _populateRechargeList();
        document.getElementById('recharge-amount-input').value = '';
        var modal = document.getElementById('recharge-modal');
        var sheet = document.getElementById('recharge-sheet');
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    // ---- 关闭充值弹窗 ----
    window.closeRechargeModal = function() {
        var sheet = document.getElementById('recharge-sheet');
        var modal = document.getElementById('recharge-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 340);
    };

    // ---- 确认充值 ----
    window.confirmRecharge = function() {
        var amountVal = document.getElementById('recharge-amount-input').value.trim();
        var amount = parseFloat(amountVal);
        if (!amountVal || isNaN(amount) || amount <= 0) {
            document.getElementById('recharge-amount-input').focus();
            return;
        }
        var cards = _getBankCards();
        if (cards.length === 0) {
            alert('请先添加银行卡');
            return;
        }
        if (_rechargeSelectedIndex < 0 || _rechargeSelectedIndex >= cards.length) {
            alert('请选择充值来源');
            return;
        }
        var card = cards[_rechargeSelectedIndex];
        var cardBal = _getBankCardBalance(card);
        if (amount > cardBal) {
            alert('银行卡余额不足（当前余额 ¥' + cardBal.toFixed(2) + '）');
            return;
        }
        var cardNameEl = card.querySelector('.sim-card-bank-name');
        var cardName = cardNameEl ? cardNameEl.textContent : '银行卡';
        // 银行卡扣减
        _setBankCardBalance(card, cardBal - amount);
        // 钱包余额增加
        var walletBal = _getWalletBalance();
        var newWalletBal = walletBal + amount;
        _setWalletBalance(newWalletBal);
        // 持久化余额到 IndexedDB
        walletDb.kv.put({ key: 'walletBalance', value: newWalletBal }).catch(function(e) { console.error("余额持久化失败", e); });
        // 记录账单
        _addBill('recharge', '充值', amount, false, '来自 ' + cardName);
        closeRechargeModal();
        // 简单 Toast 提示
        _showSimpleToast('充值成功 ¥' + amount.toFixed(2));
    };

    // ---- 打开提现弹窗 ----
    window.openWithdrawModal = function() {
        _populateWithdrawList();
        document.getElementById('withdraw-amount-input').value = '';
        var modal = document.getElementById('withdraw-modal');
        var sheet = document.getElementById('withdraw-sheet');
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        });
    };

    // ---- 关闭提现弹窗 ----
    window.closeWithdrawModal = function() {
        var sheet = document.getElementById('withdraw-sheet');
        var modal = document.getElementById('withdraw-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 340);
    };

    // ---- 确认提现 ----
    window.confirmWithdraw = function() {
        var amountVal = document.getElementById('withdraw-amount-input').value.trim();
        var amount = parseFloat(amountVal);
        if (!amountVal || isNaN(amount) || amount <= 0) {
            document.getElementById('withdraw-amount-input').focus();
            return;
        }
        var cards = _getBankCards();
        if (cards.length === 0) {
            alert('请先添加银行卡');
            return;
        }
        if (_withdrawSelectedIndex < 0 || _withdrawSelectedIndex >= cards.length) {
            alert('请选择提现目标');
            return;
        }
        var walletBal = _getWalletBalance();
        if (amount > walletBal) {
            alert('余额不足（当前余额 ¥' + walletBal.toFixed(2) + '）');
            return;
        }
        var card = cards[_withdrawSelectedIndex];
        var cardBal = _getBankCardBalance(card);
        var wdCardNameEl = card.querySelector('.sim-card-bank-name');
        var wdCardName = wdCardNameEl ? wdCardNameEl.textContent : '银行卡';
        // 钱包余额扣减
        var newWithdrawBal = walletBal - amount;
        _setWalletBalance(newWithdrawBal);
        // 持久化余额到 IndexedDB
        walletDb.kv.put({ key: 'walletBalance', value: newWithdrawBal }).catch(function(e) { console.error("余额持久化失败", e); });
        // 银行卡余额增加
        _setBankCardBalance(card, cardBal + amount);
        // 记录账单
        _addBill('withdraw', '提现', amount, true, '到 ' + wdCardName);
        closeWithdrawModal();
        _showSimpleToast('提现成功 ¥' + amount.toFixed(2));
    };

    // ---- 简单 Toast ----
    function _showSimpleToast(msg) {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:absolute;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;white-space:nowrap;';
        var screen = document.querySelector('.phone-screen');
        if (screen) screen.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
    }
})();

