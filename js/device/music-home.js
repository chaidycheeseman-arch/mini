(function() {
    'use strict';

    var replayItems = [
        {
            artClass: 'music-art--duet',
            title: '\u6212\u4e0d\u6389\uff08\u539f\u58f0\u7248\uff09',
            badge: '\u542c\u6b4c\u8bc6\u66f2\u699c No.98',
            subtitle: '\u6b27\u9633\u8000\u83b9',
            liked: true,
            count: '840+'
        },
        {
            artClass: 'music-art--poetry',
            title: '\u7236\u4eb2\u5199\u7684\u6563\u6587\u8bd7',
            badge: '\u611f\u4eba\u81f3\u6df1\uff0c\u751f\u6d3b\u771f\u8c1b',
            subtitle: '\u8bb8\u98de',
            liked: true,
            count: '1200+'
        },
        {
            artClass: 'music-art--angel',
            title: 'ANGEL',
            badge: 'Melon\u5956\u63d0\u540d',
            subtitle: 'MFBTY',
            liked: false,
            count: '190+'
        }
    ];

    var specialItems = [
        {
            artClass: 'music-art--heal',
            title: '\u97f3\u4e50\u7597\u6108\u300a\u571f\u4e4b\u5f8b\u300b | \u4fc3\u4e2d\u5bab\u5347\u964d\uff0c\u548c\u813e\u80c3\u4e4b\u4eca\u4ea8',
            duration: '06:10',
            subtitle: '\u4e94\u97f3\u7597\u6108\u4e94\u884c\u517b\u751f\u97f3\u4e50-\u758f\u809d\u7406\u6c14-\u8c03\u517b\u4e94\u810f-\u5b89\u795e\u52a9\u7720'
        },
        {
            artClass: 'music-art--sword',
            title: '\u7b2c1\u5b63\u00b7\u7b2c3\u96c6 \u65ad\u957f\u751f\u6865',
            duration: '18:09',
            subtitle: '\u5251\u6765\u5e7f\u64ad\u5267\u4e00\u4e8c\u5b63\u7cbe\u6821\u7248\u52a8\u6f2b2\u4ece51\u96c6\u5f00\u59cb\u540d\u573a\u9762\u62a2\u5148\u542c\u58f0\u5a31\u6587\u5316\u5236\u4f5c'
        },
        {
            artClass: 'music-art--luoxiang',
            title: '\u7f57\u7fd4\uff1a\u4f60\u8003\u7684\u4e0d\u662f\u8bd5\uff0c\u662f\u524d\u9014\u548c\u66ae\u5e74\u7684\u6b22\u559cmp3',
            duration: '00:40',
            subtitle: '\u4eba\u95f4\u6e05\u9192\u65f6\u523b | \u4e0d\u82e6\u4e0e\u4e50\u4f55\u5728\uff0c\u4eba\u6027\u771f\u76f8\u4e0e\u6e29\u67d4\u9006\u5546'
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
