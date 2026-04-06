// Auto-split from js/wallet/wallet-and-wechat.js (1-525)

// ====== 理财股票功能 ======
(function() {
    var stocks = [
        { id: 0, name: '腾讯控股', code: '00700.HK', price: 328.60, open: 328.60, held: 0, avgCost: 0, color: '#1a6fb5' },
        { id: 1, name: '贵州茅台', code: '600519.SH', price: 1688.00, open: 1688.00, held: 0, avgCost: 0, color: '#e74c3c' },
        { id: 2, name: '宁德时代', code: '300750.SZ', price: 198.50, open: 198.50, held: 0, avgCost: 0, color: '#27ae60' },
        { id: 3, name: '比亚迪', code: '002594.SZ', price: 285.30, open: 285.30, held: 0, avgCost: 0, color: '#8e44ad' },
        { id: 4, name: '阿里巴巴', code: '09988.HK', price: 85.40, open: 85.40, held: 0, avgCost: 0, color: '#e67e22' },
        { id: 5, name: '中芯国际', code: '00981.HK', price: 22.80, open: 22.80, held: 0, avgCost: 0, color: '#16a085' },
        { id: 6, name: '小米集团', code: '01810.HK', price: 18.96, open: 18.96, held: 0, avgCost: 0, color: '#c0392b' }
    ];
    var stockTimer = null;
    var currentTradeStockId = -1;
    var currentTradeMode = 'buy';

    function tickPrices() {
        stocks.forEach(function(s) {
            var volatility = s.price * 0.003;
            var change = (Math.random() - 0.5) * 2 * volatility;
            var drift = (s.open - s.price) * 0.002;
            s.price = Math.max(s.price + change + drift, s.price * 0.7);
            s.price = parseFloat(s.price.toFixed(2));
        });
        renderStockList();
        updateStockTradeModal();
        updateStockHeader();
    }

    function renderStockList() {
        var body = document.getElementById('stock-list-body');
        if (!body) return;
        var html = '';
        stocks.forEach(function(s) {
            var change = s.price - s.open;
            var changePct = (change / s.open * 100);
            var isUp = change >= 0;
            var changeColor = isUp ? '#e74c3c' : '#27ae60';
            var changeSign = isUp ? '+' : '';
            var holdValue = s.held * s.price;
            var holdProfit = s.held > 0 ? (s.price - s.avgCost) * s.held : 0;
            html += '<div class="stock-card">' +
                '<div class="stock-card-left">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<div style="width:36px;height:36px;border-radius:10px;background:' + s.color + '22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                            '<span style="font-size:12px;font-weight:800;color:' + s.color + ';">' + s.name.charAt(0) + '</span>' +
                        '</div>' +
                        '<div>' +
                            '<div style="font-size:14px;font-weight:700;color:#333;">' + s.name + '</div>' +
                            '<div style="font-size:10px;color:#aaa;margin-top:2px;">' + s.code + '</div>' +
                        '</div>' +
                    '</div>' +
                    (s.held > 0 ? '<div style="margin-top:8px;display:flex;gap:12px;">' +
                        '<div><div style="font-size:9px;color:#aaa;">持仓</div><div style="font-size:12px;font-weight:600;color:#555;">' + s.held + '股</div></div>' +
                        '<div><div style="font-size:9px;color:#aaa;">市值</div><div style="font-size:12px;font-weight:600;color:#555;">¥' + holdValue.toFixed(2) + '</div></div>' +
                        '<div><div style="font-size:9px;color:#aaa;">盈亏</div><div style="font-size:12px;font-weight:600;color:' + (holdProfit >= 0 ? '#e74c3c' : '#27ae60') + ';">' + (holdProfit >= 0 ? '+' : '') + holdProfit.toFixed(2) + '</div></div>' +
                    '</div>' : '') +
                '</div>' +
                '<div class="stock-card-right">' +
                    '<div style="font-size:20px;font-weight:800;color:' + changeColor + ';font-family:Arial,sans-serif;" id="stock-price-' + s.id + '">¥' + s.price.toFixed(2) + '</div>' +
                    '<div style="font-size:11px;color:' + changeColor + ';margin-top:2px;" id="stock-change-' + s.id + '">' + changeSign + change.toFixed(2) + ' (' + changeSign + changePct.toFixed(2) + '%)</div>' +
                    '<div style="display:flex;gap:6px;margin-top:8px;">' +
                        '<div onclick="openStockTrade(' + s.id + ',\'buy\')" style="padding:5px 10px;background:#e74c3c;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">买入</div>' +
                        (s.held > 0 ? '<div onclick="openStockTrade(' + s.id + ',\'sell\')" style="padding:5px 10px;background:#27ae60;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">卖出</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        body.innerHTML = html;
    }

    function updateStockHeader() {
        var totalValue = 0, totalProfit = 0, todayProfit = 0;
        stocks.forEach(function(s) {
            if (s.held > 0) {
                totalValue += s.held * s.price;
                totalProfit += (s.price - s.avgCost) * s.held;
                todayProfit += (s.price - s.open) * s.held;
            }
        });
        var tv = document.getElementById('stock-total-value');
        var tp = document.getElementById('stock-today-profit');
        var tpp = document.getElementById('stock-total-profit');
        if (tv) tv.textContent = totalValue.toFixed(2);
        if (tp) { tp.textContent = (todayProfit >= 0 ? '+' : '') + todayProfit.toFixed(2); tp.style.color = todayProfit >= 0 ? '#ff8080' : '#80ffa0'; }
        if (tpp) { tpp.textContent = (totalProfit >= 0 ? '+' : '') + totalProfit.toFixed(2); tpp.style.color = totalProfit >= 0 ? '#ff8080' : '#80ffa0'; }
    }
    function updateStockTradeModal() {
        if (currentTradeStockId < 0) return;
        var s = stocks[currentTradeStockId];
        var priceEl = document.getElementById('stock-trade-price');
        var changeEl = document.getElementById('stock-trade-change');
        var totalEl = document.getElementById('stock-trade-total');
        var qtyEl = document.getElementById('stock-trade-qty');
        if (!priceEl) return;
        var change = s.price - s.open;
        var changePct = (change / s.open * 100);
        var isUp = change >= 0;
        var changeColor = isUp ? '#e74c3c' : '#27ae60';
        priceEl.textContent = '¥' + s.price.toFixed(2);
        priceEl.style.color = changeColor;
        changeEl.textContent = (isUp ? '+' : '') + change.toFixed(2) + ' (' + (isUp ? '+' : '') + changePct.toFixed(2) + '%)';
        changeEl.style.color = changeColor;
        var qty = parseInt(qtyEl.value) || 100;
        if (totalEl) totalEl.textContent = '¥' + (qty * s.price).toFixed(2);
    }

    // ---- 持久化股票持仓到 walletDb ----
    async function _saveStockHoldings() {
        var holdings = stocks.map(function(s) {
            return { id: s.id, held: s.held, avgCost: s.avgCost, price: s.price, open: s.open };
        });
        try {
            await walletDb.kv.put({ key: 'stockHoldings', value: JSON.stringify(holdings) });
        } catch(e) { console.error("股票持仓持久化失败", e); }
    }

    // ---- 恢复股票持仓 ----
    async function _restoreStockHoldings() {
        try {
            var rec = await walletDb.kv.get('stockHoldings');
            if (rec && rec.value) {
                var holdings = JSON.parse(rec.value);
                holdings.forEach(function(h) {
                    var s = stocks.find(function(x) { return x.id === h.id; });
                    if (s) {
                        s.held = h.held || 0;
                        s.avgCost = h.avgCost || 0;
                        // 恢复上次保存的价格，使今日盈亏不因重新进入而归零
                        if (h.price && h.price > 0) s.price = h.price;
                        // 恢复开盘价：若已保存则使用，否则以当前价格作为今日开盘价
                        if (h.open && h.open > 0) s.open = h.open;
                        else s.open = s.price;
                    }
                });
            }
        } catch(e) { console.error("恢复股票持仓失败", e); }
    }

    window.openStockApp = async function() {
        document.getElementById('stock-app').style.display = 'flex';
        await _restoreStockHoldings();
        renderStockList();
        updateStockHeader();
        if (!stockTimer) { stockTimer = setInterval(tickPrices, 1000); }
    };

    window.closeStockApp = async function() {
        document.getElementById('stock-app').style.display = 'none';
        if (stockTimer) { clearInterval(stockTimer); stockTimer = null; }
        // 关闭时保存当前股价，防止下次进入时今日盈亏归零
        await _saveStockHoldings();
    };

    window.openStockTrade = function(stockId, mode) {
        currentTradeStockId = stockId;
        currentTradeMode = mode;
        var s = stocks[stockId];
        var titleEl = document.getElementById('stock-trade-title');
        var confirmBtn = document.getElementById('stock-trade-confirm-btn');
        var qtyEl = document.getElementById('stock-trade-qty');
        document.getElementById('stock-trade-name').textContent = s.name;
        document.getElementById('stock-trade-code').textContent = s.code;
        titleEl.textContent = mode === 'buy' ? '买入 ' + s.name : '卖出 ' + s.name;
        titleEl.style.color = mode === 'buy' ? '#e74c3c' : '#27ae60';
        confirmBtn.textContent = mode === 'buy' ? '确认买入' : '确认卖出';
        confirmBtn.style.background = mode === 'buy' ? 'linear-gradient(135deg,#e74c3c,#c0392b)' : 'linear-gradient(135deg,#27ae60,#1e8449)';
        confirmBtn.style.boxShadow = mode === 'buy' ? '0 8px 20px rgba(231,76,60,0.35)' : '0 8px 20px rgba(39,174,96,0.35)';
        qtyEl.value = 100;
        updateStockTradeModal();
        var modal = document.getElementById('stock-trade-modal');
        var sheet = document.getElementById('stock-trade-sheet');
        modal.style.display = 'flex';
        requestAnimationFrame(function() { requestAnimationFrame(function() { sheet.style.transform = 'translateY(0)'; }); });
    };

    window.closeStockTradeModal = function() {
        var sheet = document.getElementById('stock-trade-sheet');
        var modal = document.getElementById('stock-trade-modal');
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() { modal.style.display = 'none'; }, 340);
        currentTradeStockId = -1;
    };

    window.stockTradeQtyAdj = function(delta) {
        var qtyEl = document.getElementById('stock-trade-qty');
        var val = Math.max(1, (parseInt(qtyEl.value) || 0) + delta);
        qtyEl.value = val;
        updateStockTradeModal();
    };

    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'stock-trade-qty') { updateStockTradeModal(); }
    });

    window.confirmStockTrade = function() {
        if (currentTradeStockId < 0) return;
        var s = stocks[currentTradeStockId];
        var qty = parseInt(document.getElementById('stock-trade-qty').value) || 0;
        if (qty <= 0) return;
        var tradeTotal = (qty * s.price).toFixed(2);
        if (currentTradeMode === 'buy') {
            var totalCost = s.held * s.avgCost + qty * s.price;
            s.held += qty;
            s.avgCost = s.held > 0 ? totalCost / s.held : 0;
            _addBill('stock', '买入 ' + s.name, parseFloat(tradeTotal), true, qty + '股 · ¥' + s.price.toFixed(2));
        } else {
            if (qty > s.held) { alert('持仓不足，最多可卖 ' + s.held + ' 股'); return; }
            s.held -= qty;
            if (s.held === 0) s.avgCost = 0;
            _addBill('stock', '卖出 ' + s.name, parseFloat(tradeTotal), false, qty + '股 · ¥' + s.price.toFixed(2));
        }
        // 持久化持仓到 IndexedDB
        _saveStockHoldings();
        window.closeStockTradeModal();
        renderStockList();
        updateStockHeader();
    };
})();

// ====== 角色主动处理红包/转账的辅助函数 ======
async function _roleHandleRedPacket(lockedContact) {
    // 找到最近一条我发的、未领取的红包消息
    const allMsgs = await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray();
    let targetMsg = null;
    for (let i = allMsgs.length - 1; i >= 0; i--) {
        const msg = allMsgs[i];
        if (msg.sender !== 'me') continue;
        const parsed = parseMiniStructuredPayload(msg.content);
        if (parsed && parsed.type === 'red_packet' && parsed.status === 'unclaimed') {
            targetMsg = msg;
            break;
        }
    }
    if (!targetMsg) return;
    // 更新消息状态为已领取
    try {
        const parsed = parseMiniStructuredPayload(targetMsg.content);
        await chatListDb.messages.update(targetMsg.id, {
            content: createMiniStructuredMessage('red_packet', {
                amount: parsed.amount,
                memo: parsed.memo,
                status: 'claimed'
            })
        });
    } catch(e) { return; }
    // 刷新聊天窗口
    const chatWindow = document.getElementById('chat-window');
    const isCurrentChatActive = chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === lockedContact.id;
    if (isCurrentChatActive) {
        await refreshChatWindow();
    }
    // 显示系统小字提示
    const roleName = lockedContact.roleName || '对方';
    await appendSystemTipMessage(roleName + ' 领取了你的红包', lockedContact, 'rp_claimed_tip');
}

async function _roleHandleTransfer(lockedContact, action) {
    // 找到最近一条我发的、待收款的转账消息
    const allMsgs = await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray();
    let targetMsg = null;
    for (let i = allMsgs.length - 1; i >= 0; i--) {
        const msg = allMsgs[i];
        if (msg.sender !== 'me') continue;
        const parsed = parseMiniStructuredPayload(msg.content);
        if (parsed && parsed.type === 'transfer' && parsed.status === 'pending') {
            targetMsg = msg;
            break;
        }
    }
    if (!targetMsg) return;
    // 更新消息状态
    const newStatus = (action === 'refunded') ? 'refunded' : 'received';
    try {
        const parsed = parseMiniStructuredPayload(targetMsg.content);
        await chatListDb.messages.update(targetMsg.id, {
            content: createMiniStructuredMessage('transfer', {
                amount: parsed.amount,
                memo: parsed.memo,
                status: newStatus
            })
        });
    } catch(e) { return; }
    // 刷新聊天窗口
    const chatWindow = document.getElementById('chat-window');
    const isCurrentChatActive = chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === lockedContact.id;
    if (isCurrentChatActive) {
        await refreshChatWindow();
    }
    // 显示系统小字提示
    const roleName = lockedContact.roleName || '对方';
    let tipText = '';
    if (newStatus === 'received') {
        tipText = `${roleName} 接收了你的转账`;
    } else {
        tipText = `${roleName} 退回了你的转账`;
    }
    await appendSystemTipMessage(tipText, lockedContact, 'tf_action_tip');
}

// ====== 红包领取弹窗逻辑 ======
var _rpClaimCardEl = null;
var _rpClaimMsgId = null;
function _appendWalletStatusPanel(actionsEl, heading, value, detail, toneClass) {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';
    var panel = document.createElement('div');
    panel.className = 'wallet-status-panel';
    var headingEl = document.createElement('div');
    headingEl.className = 'wallet-status-heading';
    headingEl.textContent = heading;
    panel.appendChild(headingEl);
    var valueEl = document.createElement('div');
    valueEl.className = 'wallet-status-value' + (toneClass ? (' ' + toneClass) : '');
    valueEl.textContent = value;
    panel.appendChild(valueEl);
    if (detail) {
        var detailEl = document.createElement('div');
        detailEl.className = 'wallet-status-detail';
        detailEl.textContent = detail;
        panel.appendChild(detailEl);
    }
    actionsEl.appendChild(panel);
}
function openRpClaimModal(cardEl, amount, desc, status, senderRole, roleName, msgId) {
    _rpClaimCardEl = cardEl;
    _rpClaimMsgId = msgId || null;
    var row = cardEl ? cardEl.closest('.chat-msg-row') : null;
    var rowSender = row ? row.getAttribute('data-sender') : '';
    var resolvedSenderRole = rowSender === 'me' ? 'me' : (rowSender === 'role' ? 'role' : senderRole);
    var targetRoleName = roleName || '对方';
    document.getElementById('rp-claim-amount').textContent = '¥ ' + amount;
    document.getElementById('rp-claim-desc').textContent = desc;
    var actionsEl = document.getElementById('rp-claim-actions');
    actionsEl.innerHTML = '';
    if (status === 'claimed') {
        _appendWalletStatusPanel(
            actionsEl,
            '红包状态',
            resolvedSenderRole === 'me' ? '已被领取' : '已领取',
            resolvedSenderRole === 'me' ? (targetRoleName + ' 已领取这个红包') : '这个红包已被你领取',
            'is-success'
        );
    } else {
        if (resolvedSenderRole === 'me') {
            _appendWalletStatusPanel(actionsEl, '红包状态', '待领取', '等待 ' + targetRoleName + ' 领取', 'is-pending');
        } else {
            var btn = document.createElement('div');
            btn.className = 'rp-modal-btn rp-modal-btn-claim';
            btn.textContent = '领取红包';
            btn.onclick = function() { _doClaimRp(resolvedSenderRole, targetRoleName, parseFloat(amount)); };
            actionsEl.appendChild(btn);
        }
    }
    var modal = document.getElementById('rp-claim-modal');
    modal.style.display = 'flex';
    var card = document.getElementById('rp-claim-card');
    card.style.transform = 'scale(0.85)';
    card.style.opacity = '0';
    card.style.transition = 'transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.28s';
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        });
    });
}
function closeRpClaimModal() {
    document.getElementById('rp-claim-modal').style.display = 'none';
    _rpClaimCardEl = null;
}
async function _doClaimRp(senderRole, roleName, amount) {
    var cardElRef = _rpClaimCardEl;
    var msgIdRef = _rpClaimMsgId;
    closeRpClaimModal();
    if (!cardElRef) return;
    // 修复：领取前先从 IndexedDB 验证当前状态，防止多次领取
    if (msgIdRef) {
        try {
            var checkMsg = await chatListDb.messages.get(msgIdRef);
            if (checkMsg) {
                var checkParsed = parseMiniStructuredPayload(checkMsg.content);
                if (checkParsed && checkParsed.status === 'claimed') {
                    // 已被领取，直接返回，不重复操作
                    return;
                }
            }
        } catch(e) {}
    }
    // 更新卡片状态（DOM）
    var statusEl = cardElRef.querySelector('.rp-card-status');
    if (statusEl) {
        statusEl.textContent = '已领取';
        statusEl.style.color = '#bbb';
    }
    cardElRef.classList.add('rp-claimed');
    cardElRef.style.opacity = '';
    if (cardElRef.dataset) {
        cardElRef.dataset.rpStatus = 'claimed';
    }
    // 持久化：更新 IndexedDB 中的消息状态
    if (msgIdRef) {
        try {
            var msg = await chatListDb.messages.get(msgIdRef);
            if (msg) {
                var parsed = parseMiniStructuredPayload(msg.content);
                await chatListDb.messages.update(msgIdRef, {
                    content: createMiniStructuredMessage('red_packet', {
                        amount: parsed.amount,
                        memo: parsed.memo,
                        status: 'claimed'
                    })
                });
            }
        } catch(e) { console.error('红包状态持久化失败', e); }
    }
    // 角色发的红包被用户领取时：增加钱包余额 + 插入系统小字
    if (senderRole !== 'me') {
        // 增加钱包余额
        if (amount && amount > 0) {
            var walletEl = document.getElementById('text-wallet-bal');
            if (walletEl) {
                var curBal = parseFloat(walletEl.textContent.replace(/,/g, '')) || 0;
                var newBal = curBal + amount;
                walletEl.textContent = newBal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                walletDb.kv.put({ key: 'walletBalance', value: newBal }).catch(function(e) { console.error('余额持久化失败', e); });
                // 记录账单（收入）
                _addBill('red_packet', '领取红包', amount, false, roleName + ' 发的红包');
            }
        }
        var tipText_rp = '你领取了 ' + roleName + ' 的红包';
        await appendSystemTipMessage(tipText_rp, activeChatContact, 'rp_claimed_tip');
    }
}

// ====== 转账操作弹窗逻辑 ======
var _tfActionCardEl = null;
var _tfActionMsgId = null;
var _tfActionAmount = 0;
function openTfActionModal(cardEl, amount, desc, status, senderRole, roleName) {
    _tfActionCardEl = cardEl;
    _tfActionAmount = parseFloat(amount) || 0;
    var targetRoleName = roleName || '对方';
    // 从卡片所在行获取 msg.id（通过向上查找 .chat-msg-row 的 data-id）
    var row = cardEl.closest('.chat-msg-row');
    var rowSender = row ? row.getAttribute('data-sender') : '';
    var resolvedSenderRole = rowSender === 'me' ? 'me' : (rowSender === 'role' ? 'role' : senderRole);
    _tfActionMsgId = row ? parseInt(row.getAttribute('data-id')) || null : null;
    document.getElementById('tf-action-amount').textContent = '¥ ' + amount;
    document.getElementById('tf-action-desc').textContent = desc;
    var actionsEl = document.getElementById('tf-action-actions');
    actionsEl.innerHTML = '';
    if (status === 'received' || status === 'refunded') {
        _appendWalletStatusPanel(
            actionsEl,
            '转账状态',
            status === 'received' ? '已收款' : '已退回',
            resolvedSenderRole === 'me'
                ? (status === 'received' ? (targetRoleName + ' 已接收这笔转账') : (targetRoleName + ' 已退回这笔转账'))
                : (status === 'received' ? '这笔转账已存入你的余额' : '这笔转账已退回'),
            status === 'received' ? 'is-success' : 'is-muted'
        );
    } else {
        if (resolvedSenderRole === 'me') {
            _appendWalletStatusPanel(actionsEl, '转账状态', '待处理', '等待 ' + targetRoleName + ' 处理', 'is-pending');
        } else {
            var receiveBtn = document.createElement('div');
            receiveBtn.className = 'tf-modal-btn tf-modal-btn-receive';
            receiveBtn.textContent = '接收转账';
            receiveBtn.onclick = function() { _doTfAction('received', resolvedSenderRole, targetRoleName); };
            var sepEl = document.createElement('div');
            sepEl.className = 'tf-modal-btn-sep';
            var refundBtn = document.createElement('div');
            refundBtn.className = 'tf-modal-btn tf-modal-btn-refund';
            refundBtn.textContent = '退回转账';
            refundBtn.onclick = function() { _doTfAction('refunded', resolvedSenderRole, targetRoleName); };
            actionsEl.appendChild(receiveBtn);
            actionsEl.appendChild(sepEl);
            actionsEl.appendChild(refundBtn);
        }
    }
    var modal = document.getElementById('tf-action-modal');
    modal.style.display = 'flex';
    var card = document.getElementById('tf-action-card');
    card.style.transform = 'scale(0.85)';
    card.style.opacity = '0';
    card.style.transition = 'transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.28s';
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        });
    });
}
function closeTfActionModal() {
    document.getElementById('tf-action-modal').style.display = 'none';
    _tfActionCardEl = null;
}
async function _doTfAction(newStatus, senderRole, roleName) {
    var cardElRef = _tfActionCardEl;
    var msgIdRef = _tfActionMsgId;
    var amountRef = _tfActionAmount;
    closeTfActionModal();
    if (!cardElRef) return;
    // 修复：操作前先从 IndexedDB 验证当前状态，防止多次接收/退回
    if (msgIdRef) {
        try {
            var checkMsg2 = await chatListDb.messages.get(msgIdRef);
            if (checkMsg2) {
                var checkParsed2 = parseMiniStructuredPayload(checkMsg2.content);
                if (checkParsed2 && (checkParsed2.status === 'received' || checkParsed2.status === 'refunded')) {
                    // 已处理过，直接返回，不重复操作
                    return;
                }
            }
        } catch(e) {}
    }
    var statusEl = cardElRef.querySelector('.tf-card-status');
    if (statusEl) {
        if (newStatus === 'received') {
            statusEl.textContent = '已收款';
            statusEl.style.color = '#27ae60';
        } else {
            statusEl.textContent = '已退回';
            statusEl.style.color = '#bbb';
        }
    }
    cardElRef.classList.add('tf-received');
    cardElRef.style.opacity = '';
    if (cardElRef.dataset) {
        cardElRef.dataset.tfStatus = newStatus;
    }
    // 持久化：更新 IndexedDB 中的消息状态
    if (msgIdRef) {
        try {
            var msg = await chatListDb.messages.get(msgIdRef);
            if (msg) {
                var parsed = parseMiniStructuredPayload(msg.content);
                await chatListDb.messages.update(msgIdRef, {
                    content: createMiniStructuredMessage('transfer', {
                        amount: parsed.amount,
                        memo: parsed.memo,
                        status: newStatus
                    })
                });
            }
        } catch(e) { console.error('转账状态持久化失败', e); }
    }
    // 角色发的转账被用户接收时：增加钱包余额
    if (senderRole !== 'me' && newStatus === 'received' && amountRef > 0) {
        var walletEl = document.getElementById('text-wallet-bal');
        if (walletEl) {
            var curBal = parseFloat(walletEl.textContent.replace(/,/g, '')) || 0;
            var newBal = curBal + amountRef;
            walletEl.textContent = newBal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            walletDb.kv.put({ key: 'walletBalance', value: newBal }).catch(function(e) { console.error('余额持久化失败', e); });
            // 记录账单（收入）
            _addBill('transfer', '接收转账', amountRef, false, roleName + ' 发的转账');
        }
    }
    // 角色发的转账被用户操作时，在聊天流中插入系统小字
    if (senderRole !== 'me') {
        var tipText_tf = newStatus === 'received' ? ('你接收了 ' + roleName + ' 的转账') : ('你退回了 ' + roleName + ' 的转账');
        await appendSystemTipMessage(tipText_tf, activeChatContact, 'tf_action_tip');
    }
}

