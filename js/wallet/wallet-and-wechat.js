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
        try {
            const parsed = JSON.parse(msg.content);
            if (parsed.type === 'red_packet' && parsed.status === 'unclaimed') {
                targetMsg = msg;
                break;
            }
        } catch(e) {}
    }
    if (!targetMsg) return;
    // 更新消息状态为已领取
    try {
        const parsed = JSON.parse(targetMsg.content);
        parsed.status = 'claimed';
        await chatListDb.messages.update(targetMsg.id, { content: JSON.stringify(parsed) });
    } catch(e) { return; }
    // 刷新聊天窗口
    const chatWindow = document.getElementById('chat-window');
    const isCurrentChatActive = chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === lockedContact.id;
    if (isCurrentChatActive) {
        await refreshChatWindow();
    }
    // 显示系统小字提示
    const roleName = lockedContact.roleName || '对方';
    const container = document.getElementById('chat-msg-container');
    const tipHtml = `<div class="msg-recalled-tip">${roleName} 领取了你的红包</div>`;
    if (isCurrentChatActive && container) {
        container.insertAdjacentHTML('beforeend', tipHtml);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
}

async function _roleHandleTransfer(lockedContact, action) {
    // 找到最近一条我发的、待收款的转账消息
    const allMsgs = await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray();
    let targetMsg = null;
    for (let i = allMsgs.length - 1; i >= 0; i--) {
        const msg = allMsgs[i];
        if (msg.sender !== 'me') continue;
        try {
            const parsed = JSON.parse(msg.content);
            if (parsed.type === 'transfer' && parsed.status === 'pending') {
                targetMsg = msg;
                break;
            }
        } catch(e) {}
    }
    if (!targetMsg) return;
    // 更新消息状态
    const newStatus = (action === 'refunded') ? 'refunded' : 'received';
    try {
        const parsed = JSON.parse(targetMsg.content);
        parsed.status = newStatus;
        await chatListDb.messages.update(targetMsg.id, { content: JSON.stringify(parsed) });
    } catch(e) { return; }
    // 刷新聊天窗口
    const chatWindow = document.getElementById('chat-window');
    const isCurrentChatActive = chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === lockedContact.id;
    if (isCurrentChatActive) {
        await refreshChatWindow();
    }
    // 显示系统小字提示
    const roleName = lockedContact.roleName || '对方';
    const container = document.getElementById('chat-msg-container');
    let tipText = '';
    if (newStatus === 'received') {
        tipText = `${roleName} 接收了你的转账`;
    } else {
        tipText = `${roleName} 退回了你的转账`;
    }
    const tipHtml = `<div class="msg-recalled-tip">${tipText}</div>`;
    if (isCurrentChatActive && container) {
        container.insertAdjacentHTML('beforeend', tipHtml);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
}

// ====== 红包领取弹窗逻辑 ======
var _rpClaimCardEl = null;
var _rpClaimMsgId = null;
function openRpClaimModal(cardEl, amount, desc, status, senderRole, roleName, msgId) {
    _rpClaimCardEl = cardEl;
    _rpClaimMsgId = msgId || null;
    document.getElementById('rp-claim-amount').textContent = '¥ ' + amount;
    document.getElementById('rp-claim-desc').textContent = desc;
    var actionsEl = document.getElementById('rp-claim-actions');
    actionsEl.innerHTML = '';
    if (status === 'claimed') {
        // 已领取：显示状态标签
        actionsEl.innerHTML = '<div class="rp-modal-status-text" style="color:#aaa; font-size:13px; padding:16px 0; text-align:center; letter-spacing:0.3px;">已领取</div>';
    } else {
        // 未领取：根据发送方显示按钮
        if (senderRole === 'me') {
            // 我发的：等待对方领取 → 只显示提示
            actionsEl.innerHTML = '<div class="rp-modal-status-text" style="color:#aaa; font-size:13px; padding:16px 0; text-align:center; letter-spacing:0.3px; line-height:1.6;">等待 ' + roleName + ' 领取</div>';
        } else {
            // 角色发的：我可以领取
            var btn = document.createElement('div');
            btn.className = 'rp-modal-btn rp-modal-btn-claim';
            btn.textContent = '领取红包';
            btn.onclick = function() { _doClaimRp(senderRole, roleName, parseFloat(amount)); };
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
                var checkParsed = JSON.parse(checkMsg.content);
                if (checkParsed.status === 'claimed') {
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
    cardElRef.style.opacity = '0.75';
    // 持久化：更新 IndexedDB 中的消息状态
    if (msgIdRef) {
        try {
            var msg = await chatListDb.messages.get(msgIdRef);
            if (msg) {
                var parsed = JSON.parse(msg.content);
                parsed.status = 'claimed';
                await chatListDb.messages.update(msgIdRef, { content: JSON.stringify(parsed) });
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
        var container = document.getElementById('chat-msg-container');
        if (container) {
            var sysTip = document.createElement('div');
            sysTip.className = 'msg-recalled-tip';
            sysTip.textContent = tipText_rp;
            container.appendChild(sysTip);
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        // 持久化系统小字到 IndexedDB
        if (msgIdRef && activeChatContact) {
            chatListDb.messages.add({
                contactId: activeChatContact.id,
                sender: 'system',
                content: JSON.stringify({ type: 'rp_claimed_tip', content: tipText_rp }),
                timeStr: getAmPmTime(),
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            }).catch(function(e) { console.error('红包提示持久化失败', e); });
        }
    }
}

// ====== 转账操作弹窗逻辑 ======
var _tfActionCardEl = null;
var _tfActionMsgId = null;
var _tfActionAmount = 0;
function openTfActionModal(cardEl, amount, desc, status, senderRole, roleName) {
    _tfActionCardEl = cardEl;
    _tfActionAmount = parseFloat(amount) || 0;
    // 从卡片所在行获取 msg.id（通过向上查找 .chat-msg-row 的 data-id）
    var row = cardEl.closest('.chat-msg-row');
    _tfActionMsgId = row ? parseInt(row.getAttribute('data-id')) || null : null;
    document.getElementById('tf-action-amount').textContent = '¥ ' + amount;
    document.getElementById('tf-action-desc').textContent = desc;
    var actionsEl = document.getElementById('tf-action-actions');
    actionsEl.innerHTML = '';
    if (status === 'received' || status === 'refunded') {
        // 已处理：只显示状态
        var label = status === 'received' ? '已收款' : '已退回';
        actionsEl.innerHTML = '<div class="tf-modal-status-text">' + label + '</div>';
    } else {
        // 待收款：根据发送方决定按钮
        if (senderRole === 'me') {
            // 我发的，等待对方操作
            actionsEl.innerHTML = '<div class="tf-modal-status-text">等待 ' + roleName + ' 处理</div>';
        } else {
            // 角色发的，我可以接收或退回
            var receiveBtn = document.createElement('div');
            receiveBtn.className = 'tf-modal-btn tf-modal-btn-receive';
            receiveBtn.textContent = '接收转账';
            receiveBtn.onclick = function() { _doTfAction('received', senderRole, roleName); };
            var sepEl = document.createElement('div');
            sepEl.className = 'tf-modal-btn-sep';
            var refundBtn = document.createElement('div');
            refundBtn.className = 'tf-modal-btn tf-modal-btn-refund';
            refundBtn.textContent = '退回转账';
            refundBtn.onclick = function() { _doTfAction('refunded', senderRole, roleName); };
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
                var checkParsed2 = JSON.parse(checkMsg2.content);
                if (checkParsed2.status === 'received' || checkParsed2.status === 'refunded') {
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
            cardElRef.style.opacity = '0.72';
        }
    }
    // 持久化：更新 IndexedDB 中的消息状态
    if (msgIdRef) {
        try {
            var msg = await chatListDb.messages.get(msgIdRef);
            if (msg) {
                var parsed = JSON.parse(msg.content);
                parsed.status = newStatus;
                await chatListDb.messages.update(msgIdRef, { content: JSON.stringify(parsed) });
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
        var container = document.getElementById('chat-msg-container');
        if (container) {
            var sysTip = document.createElement('div');
            sysTip.className = 'msg-recalled-tip';
            sysTip.textContent = tipText_tf;
            container.appendChild(sysTip);
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        // 持久化系统小字到 IndexedDB
        if (msgIdRef && activeChatContact) {
            chatListDb.messages.add({
                contactId: activeChatContact.id,
                sender: 'system',
                content: JSON.stringify({ type: 'tf_action_tip', content: tipText_tf }),
                timeStr: getAmPmTime(),
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            }).catch(function(e) { console.error('转账提示持久化失败', e); });
        }
    }
}

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
        var container = document.getElementById('chat-msg-container');
        var myAvatar = activeChatContact.userAvatar || 'https://via.placeholder.com/100';
        var roleAvatar = activeChatContact.roleAvatar || 'https://via.placeholder.com/100';
        var timeStr = getAmPmTime();
        var content = JSON.stringify({ type: 'red_packet', amount: _rpAmount, desc: _rpDesc, status: 'unclaimed' });
        try {
            var newMsgId = await chatListDb.messages.add({
                contactId: activeChatContact.id,
                sender: 'me',
                content: content,
                timeStr: timeStr,
                quoteText: ''
            });
            var chat = await chatListDb.chats.where('contactId').equals(activeChatContact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }
            var msgObj = { id: newMsgId, sender: 'me', content: content, timeStr: timeStr, quoteText: '' };
            container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
            bindMsgEvents();
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            // 记录账单
            _addBill('red_packet', '发红包', amount, true, activeChatContact.roleName || '对方');
        } catch(e) {
            console.error('发送红包失败', e);
        }
    }
})();

// ====== 转账卡片状态切换 ======
function toggleTransferStatus(cardEl) {
    var statusEl = cardEl.querySelector('.tf-card-status');
    if (!statusEl) return;
    var cur = statusEl.textContent;
    if (cur === '待收款') {
        statusEl.textContent = '已收款';
        statusEl.style.color = '#27ae60';
    } else if (cur === '已收款') {
        statusEl.textContent = '已退回';
        statusEl.style.color = '#bbb';
        cardEl.style.opacity = '0.72';
    } else {
        statusEl.textContent = '待收款';
        statusEl.style.color = '#1a6fb5';
        cardEl.style.opacity = '1';
    }
}

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
        var container = document.getElementById('chat-msg-container');
        var myAvatar = activeChatContact.userAvatar || 'https://via.placeholder.com/100';
        var roleAvatar = activeChatContact.roleAvatar || 'https://via.placeholder.com/100';
        var timeStr = getAmPmTime();
        var content = JSON.stringify({ type: 'transfer', amount: _tfAmount, desc: _tfDesc, status: 'pending' });
        try {
            var newMsgId = await chatListDb.messages.add({
                contactId: activeChatContact.id,
                sender: 'me',
                content: content,
                timeStr: timeStr,
                quoteText: ''
            });
            var chat = await chatListDb.chats.where('contactId').equals(activeChatContact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }
            var msgObj = { id: newMsgId, sender: 'me', content: content, timeStr: timeStr, quoteText: '' };
            container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
            bindMsgEvents();
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            // 记录账单
            _addBill('transfer', '转账', amount, true, activeChatContact.roleName || '对方');
        } catch(e) {
            console.error('发送转账失败', e);
        }
    }
})();

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

// ====== 聊天详情页面逻辑 ======
(function() {
    // 当前联系人的详情设置存储键前缀
    var CD_KEY_PREFIX = 'cd_settings_';

    // 获取当前联系人的存储键
    function cdKey(field) {
        if (!activeChatContact) return null;
        return CD_KEY_PREFIX + activeChatContact.id + '_' + field;
    }

    async function cdGetToggleValue(name) {
        var key = cdKey('toggle_' + name);
        if (!key) return false;
        var val = await localforage.getItem(key);
        if (val !== null && val !== undefined) return !!val;
        // 兼容旧版本：跨模式记忆默认继承原来的“记忆总结”总开关，避免升级后行为突变
        if (name === 'cross_mode_memory') {
            var legacyKey = cdKey('toggle_memory');
            var legacyVal = legacyKey ? await localforage.getItem(legacyKey) : false;
            var fallback = !!legacyVal;
            await localforage.setItem(key, fallback);
            return fallback;
        }
        return false;
    }

    // 打开聊天详情页
    window.openChatDetail = async function() {
        if (!activeChatContact) return;
        var app = document.getElementById('chat-detail-app');
        if (!app) return;

        // 填充角色头像
        var roleImg = document.getElementById('cd-role-avatar-img');
        if (roleImg) {
            roleImg.src = activeChatContact.roleAvatar || whitePixel;
        }
        // 填充我方头像
        var userImg = document.getElementById('cd-user-avatar-img');
        if (userImg) {
            userImg.src = activeChatContact.userAvatar || whitePixel;
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

        // 恢复各开关状态
        var toggleKeys = ['time', 'memory', 'cross_mode_memory', 'drama', 'keepalive', 'proactive', 'auto_summary'];
        for (var i = 0; i < toggleKeys.length; i++) {
            var tk = toggleKeys[i];
            var val = await cdGetToggleValue(tk);
            var toggleId = tk === 'auto_summary'
                ? 'cd-toggle-auto-summary'
                : (tk === 'cross_mode_memory' ? 'cd-toggle-cross-mode-memory' : ('cd-toggle-' + tk));
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
        var memoryOn = await cdGetToggleValue('memory');
        var memoryExpand = document.getElementById('cd-memory-expand');
        if (memoryExpand) {
            memoryExpand.classList.add('open');
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

        app.style.display = 'flex';
    };

    // 关闭聊天详情页
    window.closeChatDetail = function() {
        var app = document.getElementById('chat-detail-app');
        if (app) app.style.display = 'none';
    };

    // 切换开关
    window.cdToggle = async function(name) {
        if (!activeChatContact) return;
        var toggleId = name === 'auto_summary'
            ? 'cd-toggle-auto-summary'
            : (name === 'cross_mode_memory' ? 'cd-toggle-cross-mode-memory' : ('cd-toggle-' + name));
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

        // 记忆设置区固定展开，避免子开关被隐藏
        if (name === 'memory' || name === 'cross_mode_memory') {
            var memoryExpand = document.getElementById('cd-memory-expand');
            if (memoryExpand) {
                memoryExpand.classList.add('open');
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
        var res = await window._ensureBrowserNotificationPermission({ test: true });
        if (res && res.ok) {
            alert('通知权限已开启，已发送一条测试横幅。');
            return;
        }
        var reason = (res && res.reason) ? res.reason : 'unknown';
        if (reason === 'insecure_context') {
            alert('当前页面不是安全上下文，Edge 无法显示系统通知。请用 https 或 localhost 打开。');
        } else if (reason === 'denied') {
            alert('通知权限被拒绝了，请在 Edge 地址栏/站点设置里手动允许通知。');
        } else if (reason === 'unsupported') {
            alert('当前环境不支持浏览器通知。');
        } else if (reason === 'show_failed') {
            alert('通知权限已给，但系统横幅发送失败，请检查系统通知总开关和 Edge 通知权限。');
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
        if (!msgs || msgs.length === 0) {
            alert('暂无聊天记录可供总结。');
            return;
        }
        // 总结前，如有上一条总结则先展示，避免重复总结
        var historyKeyPre = CD_KEY_PREFIX + activeChatContact.id + '_summary_history';
        var historyPre = (await localforage.getItem(historyKeyPre)) || [];
        if (historyPre.length > 0) {
            var lastSummary = historyPre[0];
            var previewText = '上次总结（' + lastSummary.time + '，共' + lastSummary.msgCount + '条消息）：\n\n' + lastSummary.content.substring(0, 300) + (lastSummary.content.length > 300 ? '...' : '');
            var doIt = confirm(previewText + '\n\n当前共 ' + msgs.length + ' 条消息，确定要重新总结吗？');
            if (!doIt) return;
        }
        // 构造消息列表
        var summaryPrompt = '现在暂停当前扮演身份，你即刻切换为聊天记录总结管理大师，以客观中立的第三人称视角，精准提炼本次对话核心内容；要求一针见血抓取关键信息，不添加多余废话，同时不做过度简略，需完整梳理双方的对话脉络、核心诉求、沟通细节、情绪态度与情感倾向，清晰呈现对话中的重点问题、达成的共识、存在的分歧以及关键互动节点，逻辑清晰、内容详实。';
        var chatText = msgs.map(function(m) {
            var sender = m.sender === 'me' ? '用户' : (activeChatContact.roleName || '角色');
            var content = extractMsgPureText(m.content);
            return sender + '：' + content;
        }).join('\n');
        var messages = [
            { role: 'system', content: summaryPrompt },
            { role: 'user', content: '以下是需要总结的聊天记录：\n\n' + chatText }
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
                msgCount: msgs.length
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

// 遇恋NPC添加到WeChat：拒绝
async function mlAddRequestReject(idx) {
    try {
        let reqs = await localforage.getItem('ml_wechat_add_requests') || [];
        const pendingReqs = reqs.filter(r => r.status === 'pending');
        if (pendingReqs[idx]) {
            const orig = reqs.find(r => r === pendingReqs[idx]);
            if (orig) orig.status = 'rejected';
            await localforage.setItem('ml_wechat_add_requests', reqs);
        }
        updateBlockRequestBadge();
        openBlockRequestList();
    } catch(e) { console.error(e); }
}

// 遇恋NPC添加到WeChat：接受 → 自动创建联系人并开启聊天
async function mlAddRequestAgree(idx) {
    try {
        let reqs = await localforage.getItem('ml_wechat_add_requests') || [];
        const pendingReqs = reqs.filter(r => r.status === 'pending');
        const req = pendingReqs[idx];
        if (!req) return;
        // 标记为已处理
        const orig = reqs.find(r => r === req);
        if (orig) orig.status = 'agreed';
        await localforage.setItem('ml_wechat_add_requests', reqs);

        // 检查是否已有同名联系人
        const existing = await contactDb.contacts.toArray();
        const dup = existing.find(c => c.roleName === req.name);
        if (!dup) {
            // 创建新联系人
            const newContact = {
                id: Date.now().toString(),
                roleName: req.name || '遇恋用户',
                roleGroup: '',
                roleGender: req.gender || '女',
                roleLanguage: '中',
                roleDetail: req.detail || '',
                roleAvatar: req.avatar || '',
                userName: '',
                userGender: '女',
                userDetail: '',
                userAvatar: '',
                worldbooks: [],
                npcs: []
            };
            await contactDb.contacts.put(newContact);
            // 自动创建WeChat聊天
            await chatListDb.chats.add({
                id: (Date.now() + 1).toString(),
                contactId: newContact.id,
                lastTime: getAmPmTime()
            });
            renderContacts();
            renderChatList();
        }
        updateBlockRequestBadge();
        openBlockRequestList();
    } catch(e) { console.error('接受遇恋好友申请失败', e); alert('操作失败: ' + e.message); }
}

// 遇恋大厅：喜欢卡片时，NPC角色发起添加WeChat申请
async function mlSendWechatAddRequest(npcName, npcAvatar, npcDetail, npcGender) {
    try {
        let reqs = await localforage.getItem('ml_wechat_add_requests') || [];
        // 防止重复申请
        if (reqs.find(r => r.name === npcName && r.status === 'pending')) return;
        reqs.push({
            name: npcName || '遇恋用户',
            avatar: npcAvatar || '',
            detail: npcDetail || '',
            gender: npcGender || '女',
            msg: '我们在遇恋相遇，加个微信吧～',
            time: getAmPmTime(),
            status: 'pending'
        });
        await localforage.setItem('ml_wechat_add_requests', reqs);
        updateBlockRequestBadge();
    } catch(e) { console.error('遇恋添加WeChat申请失败', e); }
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

