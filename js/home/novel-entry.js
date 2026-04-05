// Auto-split from js/home/home-and-novel.js (1-138)

// ====== 小说 Tab 切换 ======
    // ====== 遇恋应用控制逻辑 ======
    document.addEventListener('DOMContentLoaded', function() {
        var mlBtn = document.getElementById('app-btn-meetlove');
        if (mlBtn) {
            mlBtn.onclick = function(e) {
                e.stopPropagation();
                openMeetloveApp();
            };
        }
    });

    function openMeetloveApp() {
        var app = document.getElementById('meetlove-app');
        if (app) {
            app.style.display = 'flex';
            // 默认显示大厅Tab
            switchMeetloveTab('hall');
        }
    }

    function closeMeetloveApp() {
        var app = document.getElementById('meetlove-app');
        if (app) app.style.display = 'none';
    }

    function switchMeetloveTab(tabName) {
        // 切换 tab 页面
        document.querySelectorAll('.ml-tab-page').forEach(function(p) { p.classList.remove('active'); });
        var target = document.getElementById('ml-tab-' + tabName);
        if (target) target.classList.add('active');
        // 切换 dock 按钮高亮
        document.querySelectorAll('.ml-dock-btn').forEach(function(b) { b.classList.remove('active'); });
        var dockBtn = document.getElementById('ml-dock-' + tabName);
        if (dockBtn) dockBtn.classList.add('active');
    }

    function mlRefreshHall() {
        var btn = document.getElementById('ml-refresh-btn');
        if (btn) {
            btn.style.transform = 'rotate(360deg)';
            btn.style.transition = 'transform 0.5s ease';
            setTimeout(function() { btn.style.transform = ''; btn.style.transition = ''; }, 500);
        }
        // 模拟刷新：随机打乱卡片顺序
        var grid = document.getElementById('ml-user-grid');
        if (grid) {
            var cards = Array.from(grid.children);
            for (var i = cards.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                grid.appendChild(cards[j]);
                cards.splice(j, 1);
            }
        }
    }

    function mlOpenSettings() {
        var modal = document.getElementById('ml-settings-modal');
        var sheet = document.getElementById('ml-settings-sheet');
        if (modal && sheet) {
            modal.style.display = 'flex';
            requestAnimationFrame(function() {
                sheet.style.transform = 'translateY(0)';
            });
        }
    }

    function mlCloseSettings() {
        var sheet = document.getElementById('ml-settings-sheet');
        var modal = document.getElementById('ml-settings-modal');
        if (sheet) sheet.style.transform = 'translateY(100%)';
        setTimeout(function() {
            if (modal) modal.style.display = 'none';
        }, 320);
    }

    function mlSkipCard() {
        var card = document.getElementById('ml-match-card');
        if (card) {
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
            card.style.transform = 'translateX(-150%) rotate(-20deg)';
            card.style.opacity = '0';
            setTimeout(function() {
                card.style.transition = 'none';
                card.style.transform = '';
                card.style.opacity = '1';
            }, 450);
        }
    }

    function mlLikeCard() {
        var card = document.getElementById('ml-match-card');
        if (card) {
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
            card.style.transform = 'translateX(150%) rotate(20deg)';
            card.style.opacity = '0';
            setTimeout(function() {
                card.style.transition = 'none';
                card.style.transform = '';
                card.style.opacity = '1';
            }, 450);
        }
    }

    function mlSuperLike() {
        var card = document.getElementById('ml-match-card');
        if (card) {
            card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
            card.style.transform = 'translateY(-150%) scale(0.9)';
            card.style.opacity = '0';
            setTimeout(function() {
                card.style.transition = 'none';
                card.style.transform = '';
                card.style.opacity = '1';
            }, 450);
        }
    }

    // 大厅分类标签点击
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.ml-tag').forEach(function(tag) {
            tag.addEventListener('click', function() {
                document.querySelectorAll('.ml-tag').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
            });
        });
    });

    function switchNovelTab(tabName, title) {
        document.querySelectorAll('.novel-tab-page').forEach(page => page.classList.remove('active'));
        document.getElementById('novel-tab-' + tabName).classList.add('active');
        document.getElementById('novel-header-title').textContent = title;
        const items = document.querySelectorAll('.novel-dock-item');
        items.forEach(item => {
            if(item.textContent === title) item.classList.add('active');
            else item.classList.remove('active');
        });
    }
