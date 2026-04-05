(function() {
    'use strict';

    var replayItems = [
        {
            artClass: 'music-art--duet',
            title: '戒不掉（原声版）',
            badge: '听歌识曲榜 No.98',
            subtitle: '欧阳朵朵',
            liked: true,
            count: '840+'
        },
        {
            artClass: 'music-art--poetry',
            title: '父亲写的散文诗',
            badge: '感人至深，生活真相',
            subtitle: '许飞',
            liked: true,
            count: '1200+'
        },
        {
            artClass: 'music-art--angel',
            title: 'ANGEL',
            badge: '热门推荐',
            subtitle: 'MFBTY',
            liked: false,
            count: '190+'
        }
    ];

    var specialItems = [
        {
            artClass: 'music-art--heal',
            title: '音乐疗愈：土之律',
            duration: '06:10',
            subtitle: '五音调养，放松助眠'
        },
        {
            artClass: 'music-art--sword',
            title: '第七季 第3集 断长生桥',
            duration: '18:09',
            subtitle: '广播剧高光片段，剧情紧凑'
        },
        {
            artClass: 'music-art--luoxiang',
            title: '罗翔：你考的不是试',
            duration: '00:40',
            subtitle: '人间清醒时刻，短音频精选'
        }
    ];

    function heartSvg(filled) {
        if (filled) {
            return '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12.1 20.55l-.1.1-.11-.1C7.14 16.24 4 13.39 4 9.96 4 7.5 5.9 5.6 8.36 5.6c1.4 0 2.74.65 3.59 1.67.85-1.02 2.19-1.67 3.59-1.67 2.46 0 4.36 1.9 4.36 4.36 0 3.43-3.14 6.28-7.8 10.59z"/></svg>';
    }

    function durationSvg() {
        return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6l4 2"></path></svg>';
    }

    function replayItemMarkup(item) {
        return [
            '<div class="music-list-item">',
            '  <div class="music-art ' + item.artClass + '"></div>',
            '  <div class="music-item-main">',
            '    <div class="music-item-title">',
            '      <span>' + item.title + '</span>',
            '      <span class="music-item-badge">' + item.badge + '</span>',
            '    </div>',
            '    <div class="music-item-subtitle">' + item.subtitle + '</div>',
            '  </div>',
            '  <div class="music-item-right">',
            '    <div class="music-like-count">' + item.count + '</div>',
            '    <div class="music-like-btn' + (item.liked ? ' music-like-btn--filled' : '') + '">' + heartSvg(item.liked) + '</div>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function specialItemMarkup(item) {
        return [
            '<div class="music-list-item">',
            '  <div class="music-art ' + item.artClass + '"></div>',
            '  <div class="music-item-main">',
            '    <div class="music-item-title music-item-title--small">',
            '      <span>' + item.title + '</span>',
            '      <span class="music-item-duration">' + durationSvg() + item.duration + '</span>',
            '    </div>',
            '    <div class="music-item-desc">' + item.subtitle + '</div>',
            '  </div>',
            '  <div class="music-item-right">',
            '    <div class="music-like-btn">' + heartSvg(false) + '</div>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function renderMusicLists() {
        var replayEl = document.getElementById('music-replay-list');
        var specialEl = document.getElementById('music-special-list');
        if (replayEl) replayEl.innerHTML = replayItems.map(replayItemMarkup).join('');
        if (specialEl) specialEl.innerHTML = specialItems.map(specialItemMarkup).join('');
    }

    function updateMusicTime() {
        var timeEl = document.getElementById('music-status-time');
        if (!timeEl) return;
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = hh + ':' + mm;
    }

    function openMusicApp() {
        renderMusicLists();
        updateMusicTime();
        openApp('music-app');
    }

    window.openMusicApp = openMusicApp;

    window.closeMusicApp = function() {
        var app = document.getElementById('music-app');
        if (app) app.style.display = 'none';
    };

    document.addEventListener('DOMContentLoaded', function() {
        renderMusicLists();
        updateMusicTime();

        var musicBtn = document.getElementById('app-btn-music');
        if (musicBtn) {
            musicBtn.onclick = function(e) {
                e.stopPropagation();
                openMusicApp();
            };
        }
    });
})();
