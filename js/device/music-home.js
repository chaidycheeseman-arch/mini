(function() {
    'use strict';

    var currentTab = 'recommend';
    var currentBottomPage = 'home';
    var currentPlayingTrack = null;
    var isMiniPlaying = true;
    var lastDailyRefreshKey = '';
    var previewAudioCtx = null;
    var previewOscillator = null;
    var previewGainNode = null;
    var playlistTracks = [];
    var playlistTrackSeq = 0;
    var trackLikeState = {};
    var isPlaylistPanelOpen = false;
    var playlistPlayMode = 'order';
    var playlistModeOrder = ['order', 'single', 'shuffle'];
    var myPlaylists = [];
    var myPlaylistSeq = 0;
    var mySongSeq = 0;
    var currentPlaylistId = '';
    var pendingPlaylistCoverDataUrl = '';
    var pendingSongCoverDataUrl = '';
    var pendingSongAudioFile = null;
    var pendingSongLrcText = '';
    var musicAudioEl = null;
    var isPlaylistSelectionMode = false;
    var selectedPlaylistSongIds = {};
    var isMyPlaylistManageMode = false;
    var isPlaylistSongManageMode = false;
    var musicDb = null;
    var musicStorageInitPromise = Promise.resolve();
    var musicPersistQueue = Promise.resolve();
    var runtimeSongObjectUrls = {};
    var isPlayerDetailOpen = false;
    var playerDetailView = 'record';
    var playerDetailLyrics = [];
    var playerDetailActiveLyricIndex = -1;
    var playerDetailTouchState = null;
    var playerDetailMetricsCache = {};
    var playerDetailPaletteCache = {};
    var playerDetailPaletteReqId = 0;

    if (typeof Dexie !== 'undefined') {
        musicDb = new Dexie('miniPhoneMusicDB');
        musicDb.version(1).stores({
            library: 'key'
        });
    }
    window.musicLibraryDb = musicDb;

    function revokeRuntimeSongObjectUrls() {
        Object.keys(runtimeSongObjectUrls).forEach(function(key) {
            var objectUrl = runtimeSongObjectUrls[key];
            if (!objectUrl) return;
            try {
                URL.revokeObjectURL(objectUrl);
            } catch (e) {}
        });
        runtimeSongObjectUrls = {};
    }

    function getSongRuntimeAudioSrc(song) {
        if (!song) return '';
        var sourceType = String(song.sourceType || '').trim();
        if (sourceType === 'url') {
            return String(song.audioSrc || '').trim();
        }
        if (!(song.audioBlob instanceof Blob)) {
            return String(song.audioSrc || '').trim();
        }
        var songId = String(song.id || '').trim();
        if (!songId) {
            return URL.createObjectURL(song.audioBlob);
        }
        if (!runtimeSongObjectUrls[songId]) {
            runtimeSongObjectUrls[songId] = URL.createObjectURL(song.audioBlob);
        }
        return runtimeSongObjectUrls[songId];
    }

    function hydrateSongRecord(song) {
        var item = song && typeof song === 'object' ? song : {};
        item.id = String(item.id || '').trim();
        item.title = String(item.title || '').trim();
        item.artist = String(item.artist || '').trim();
        item.cover = String(item.cover || '').trim();
        item.lrc = String(item.lrc || '').trim();
        item.sourceType = String(item.sourceType || '').trim() === 'url' ? 'url' : 'file';
        item.audioSrc = getSongRuntimeAudioSrc(item);
        if (item.sourceType === 'url') {
            item.audioBlob = null;
        }
        return item;
    }

    function hydratePlaylistRecord(playlist) {
        var item = playlist && typeof playlist === 'object' ? playlist : {};
        item.id = String(item.id || '').trim();
        item.name = String(item.name || '').trim();
        item.desc = String(item.desc || '').trim();
        item.cover = String(item.cover || '').trim();
        item.songs = Array.isArray(item.songs) ? item.songs.map(hydrateSongRecord) : [];
        return item;
    }

    function serializeSongRecord(song) {
        var item = song && typeof song === 'object' ? song : {};
        var sourceType = String(item.sourceType || '').trim() === 'url' ? 'url' : 'file';
        return {
            id: String(item.id || '').trim(),
            title: String(item.title || '').trim(),
            artist: String(item.artist || '').trim(),
            cover: String(item.cover || '').trim(),
            audioSrc: sourceType === 'url' ? String(item.audioSrc || '').trim() : '',
            audioBlob: sourceType === 'file' && item.audioBlob instanceof Blob ? item.audioBlob : null,
            sourceType: sourceType,
            lrc: String(item.lrc || '').trim()
        };
    }

    function buildMusicLibrarySnapshot() {
        return {
            myPlaylists: myPlaylists.map(function(playlist) {
                return {
                    id: String(playlist && playlist.id || '').trim(),
                    name: String(playlist && playlist.name || '').trim(),
                    desc: String(playlist && playlist.desc || '').trim(),
                    cover: String(playlist && playlist.cover || '').trim(),
                    songs: Array.isArray(playlist && playlist.songs) ? playlist.songs.map(serializeSongRecord) : []
                };
            }),
            myPlaylistSeq: Number(myPlaylistSeq || 0),
            mySongSeq: Number(mySongSeq || 0),
            trackLikeState: Object.assign({}, trackLikeState || {})
        };
    }

    function queueMusicLibraryPersist() {
        if (!musicDb) return Promise.resolve();
        var snapshot = buildMusicLibrarySnapshot();
        musicPersistQueue = musicPersistQueue.catch(function() {}).then(function() {
            return musicDb.table('library').put({
                key: 'state',
                value: snapshot,
                updatedAt: Date.now()
            });
        }).catch(function(error) {
            console.error('music library persist failed', error);
        });
        return musicPersistQueue;
    }

    function restoreMusicLibrarySnapshot(snapshot) {
        revokeRuntimeSongObjectUrls();
        myPlaylists = Array.isArray(snapshot && snapshot.myPlaylists) ? snapshot.myPlaylists.map(hydratePlaylistRecord) : [];
        myPlaylistSeq = Number(snapshot && snapshot.myPlaylistSeq || 0);
        mySongSeq = Number(snapshot && snapshot.mySongSeq || 0);
        trackLikeState = snapshot && snapshot.trackLikeState && typeof snapshot.trackLikeState === 'object'
            ? Object.assign({}, snapshot.trackLikeState)
            : {};
        if (currentPlaylistId && !findMyPlaylistById(currentPlaylistId)) {
            currentPlaylistId = '';
        }
    }

    function loadMusicLibraryFromDb() {
        if (!musicDb) return Promise.resolve();
        return musicDb.table('library').get('state').then(function(record) {
            if (!record || !record.value) return;
            restoreMusicLibrarySnapshot(record.value);
        }).catch(function(error) {
            console.error('music library load failed', error);
        });
    }

    function getPlayableSongSource(song, fallbackAudioSrc) {
        var src = String(fallbackAudioSrc || '').trim();
        if (src) return src;
        if (!song) return '';
        var ensured = getSongRuntimeAudioSrc(song);
        if (ensured) {
            song.audioSrc = ensured;
        }
        return ensured;
    }

    function escapeAttr(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function hashString(text) {
        var str = String(text || '');
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }

    function getDailyKey() {
        var now = new Date();
        var y = now.getFullYear();
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function parseSongLine(songLine) {
        var text = String(songLine || '').trim();
        if (!text) return { title: '', artist: '' };
        var seg = text.split(/\s*-\s*/);
        if (seg.length >= 2) {
            return {
                title: seg[0].trim(),
                artist: seg.slice(1).join(' - ').trim()
            };
        }
        return { title: text, artist: '' };
    }

    function trackKey(title, artist) {
        var safeTitle = String(title || '').trim().toLowerCase();
        if (!safeTitle) return '';
        var safeArtist = String(artist || '').trim().toLowerCase();
        return safeTitle + '||' + safeArtist;
    }

    function getTrackLiked(title, artist, fallback) {
        var key = trackKey(title, artist);
        if (!key) return !!fallback;
        if (Object.prototype.hasOwnProperty.call(trackLikeState, key)) {
            return !!trackLikeState[key];
        }
        return !!fallback;
    }

    function rememberTrackLiked(title, artist, liked) {
        var key = trackKey(title, artist);
        if (!key) return;
        trackLikeState[key] = !!liked;
    }

    function playlistDeleteSvg() {
        return '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    }

    function playlistModeOrderSvg() {
        return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';
    }

    function playlistModeSingleSvg() {
        return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><path d="M12 8v8"></path><path d="M10.2 10.2L12 8.7l1.8 1.5"></path></svg>';
    }

    function playlistModeShuffleSvg() {
        return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l10 10h4"></path><path d="M17 7h4v4"></path><path d="M21 7l-4 4"></path><path d="M3 17h4l4-4"></path></svg>';
    }

    function playlistSongPlaySvg() {
        return '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 6v12l10-6z"></path></svg>';
    }

    function playlistSongSelectedSvg(selected) {
        if (selected) {
            return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7.8"></path></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.2"></circle></svg>';
    }

    function playlistSongDeleteBtnMarkup(songId) {
        return '<button class="music-playlist-detail-song-delete" type="button" data-my-playlist-action="delete-song" data-track-id="' + escapeAttr(songId) + '" aria-label="\u4ece\u6b4c\u5355\u5220\u9664">' + playlistDeleteSvg() + '</button>';
    }

    function getPlaylistModeLabel(mode) {
        if (mode === 'single') return '\u5355\u66f2\u5faa\u73af';
        if (mode === 'shuffle') return '\u968f\u673a\u64ad\u653e';
        return '\u987a\u5e8f\u64ad\u653e';
    }

    function getPlaylistModeIcon(mode) {
        if (mode === 'single') return playlistModeSingleSvg();
        if (mode === 'shuffle') return playlistModeShuffleSvg();
        return playlistModeOrderSvg();
    }

    function buildTrackPool(data) {
        var pool = [];
        var seen = {};

        function pushItem(title, artist) {
            var safeTitle = String(title || '').trim();
            if (!safeTitle) return;
            var safeArtist = String(artist || '').trim();
            var key = safeTitle + '||' + safeArtist;
            if (seen[key]) return;
            seen[key] = true;
            pool.push({
                title: safeTitle,
                artist: safeArtist
            });
        }

        (data.replayItems || []).forEach(function(item) {
            pushItem(item && item.title, item && item.subtitle);
        });

        (data.specialItems || []).forEach(function(item) {
            pushItem(item && item.title, item && item.subtitle);
        });

        (data.features || []).forEach(function(item) {
            var parsed = parseSongLine(item && item.song);
            pushItem(parsed.title, parsed.artist);
        });

        return pool;
    }

    function rotateArray(list, offset) {
        var arr = Array.isArray(list) ? list.slice() : [];
        if (!arr.length) return arr;
        var safeOffset = ((offset % arr.length) + arr.length) % arr.length;
        if (!safeOffset) return arr;
        return arr.slice(safeOffset).concat(arr.slice(0, safeOffset));
    }

    function stopPreviewAudio() {
        if (previewOscillator) {
            try {
                previewOscillator.stop();
            } catch (e) {}
            try {
                previewOscillator.disconnect();
            } catch (e2) {}
            previewOscillator = null;
        }
        if (previewGainNode) {
            try {
                previewGainNode.disconnect();
            } catch (e3) {}
            previewGainNode = null;
        }
    }

    function startPreviewAudio(seedText) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!previewAudioCtx) {
            previewAudioCtx = new AudioContextClass();
        }

        if (previewAudioCtx.state === 'suspended') {
            previewAudioCtx.resume().catch(function() {});
        }

        stopPreviewAudio();

        var baseFreq = 196 + (hashString(seedText) % 220);
        previewOscillator = previewAudioCtx.createOscillator();
        previewGainNode = previewAudioCtx.createGain();

        previewOscillator.type = 'triangle';
        previewOscillator.frequency.setValueAtTime(baseFreq, previewAudioCtx.currentTime);
        previewGainNode.gain.setValueAtTime(0.018, previewAudioCtx.currentTime);

        previewOscillator.connect(previewGainNode);
        previewGainNode.connect(previewAudioCtx.destination);
        previewOscillator.start();
    }

    function withDailyContent(tabKey, data) {
        var dailyKey = getDailyKey();
        var seed = hashString(dailyKey + '|' + tabKey);
        var pool = buildTrackPool(data);
        var usedIdx = {};
        var featureList = (data.features || []).map(function(item, idx) {
            var cloned = Object.assign({}, item);
            if (!pool.length) return cloned;

            var pickIdx = (seed + idx * 17 + 3) % pool.length;
            if (usedIdx[pickIdx] && pool.length > 1) {
                pickIdx = (pickIdx + 1) % pool.length;
            }
            usedIdx[pickIdx] = true;

            var picked = pool[pickIdx];
            cloned.song = picked.artist ? (picked.title + ' - ' + picked.artist) : picked.title;
            cloned.playTitle = picked.title;
            cloned.playArtist = picked.artist;
            return cloned;
        });

        var replayOffset = seed % Math.max((data.replayItems || []).length, 1);
        var specialOffset = (seed + 5) % Math.max((data.specialItems || []).length, 1);

        return {
            replayTitle: data.replayTitle,
            specialTitle: data.specialTitle,
            features: featureList,
            replayItems: rotateArray(data.replayItems || [], replayOffset),
            specialItems: rotateArray(data.specialItems || [], specialOffset)
        };
    }

    var tabContentMap = {
        recommend: {
            replayTitle: '一键重温 · 我的音乐收藏',
            specialTitle: '今日专属精彩内容',
            features: [
                { title: 'For<br>You', cover: 'group', variant: 'for-you', tag: '猜你喜欢', song: '一个人想着一个人 - 曾沛慈', squarePlay: false },
                { title: 'Daily<br>30', cover: 'dear', variant: 'daily', tag: '每日30首', song: 'Dear D 亲爱的你 - 项婕如', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--duet', title: '戒不掉（原声版）', badge: '听歌识曲榜 No.98', subtitle: '欧阳朵朵', liked: true, count: '840+' },
                { artClass: 'music-art--poetry', title: '父亲写的散文诗', badge: '感人至深，生活真相', subtitle: '许飞', liked: true, count: '1.2k+' },
                { artClass: 'music-art--angel', title: 'ANGEL', badge: '热门推荐', subtitle: 'MFBTY', liked: false, count: '190+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '音乐疗愈：土之律', duration: '06:10', subtitle: '五音调养，放松助眠', liked: false, count: '266+' },
                { artClass: 'music-art--sword', title: '第七季 第3集 断长生桥', duration: '18:09', subtitle: '广播剧高光片段，剧情紧凑', liked: false, count: '362+' },
                { artClass: 'music-art--luoxiang', title: '罗翔：你考的不是试', duration: '00:40', subtitle: '人间清醒时刻，短音频精选', liked: false, count: '488+' }
            ]
        },
        hall: {
            replayTitle: '乐馆重播 · 本周精选',
            specialTitle: '乐馆新上架',
            features: [
                { title: 'Hall<br>Picks', cover: 'group', variant: 'for-you', tag: '馆藏精选', song: '城市夜航 - 星落乐队', squarePlay: false },
                { title: 'Fresh<br>Drop', cover: 'dear', variant: 'daily', tag: '新歌快递', song: '归途有风 - 梁静茹', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--angel', title: 'Midnight Drive', badge: '电子氛围热播', subtitle: 'LUMA', liked: true, count: '610+' },
                { artClass: 'music-art--duet', title: '花火与晚风', badge: '独立女声', subtitle: '乔又年', liked: false, count: '305+' },
                { artClass: 'music-art--poetry', title: '小巷口', badge: '城市民谣', subtitle: '阿木川', liked: true, count: '922+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '低频氛围 · 夜读特辑', duration: '12:20', subtitle: '适合夜间阅读和放松', liked: false, count: '198+' },
                { artClass: 'music-art--sword', title: 'Live Session 12', duration: '09:35', subtitle: '现场录制，颗粒感更强', liked: true, count: '283+' },
                { artClass: 'music-art--luoxiang', title: '馆主荐歌速听', duration: '03:05', subtitle: '三分钟找到本周新欢', liked: false, count: '157+' }
            ]
        },
        kids: {
            replayTitle: '儿童最近常听',
            specialTitle: '儿童频道推荐',
            features: [
                { title: 'Kids<br>Fun', cover: 'group', variant: 'for-you', tag: '亲子合唱', song: '小兔子乖乖 - 童声团', squarePlay: false },
                { title: 'Story<br>Time', cover: 'dear', variant: 'daily', tag: '每日30首', song: '晚安童话屋 - 第7夜', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--duet', title: '两只老虎（律动版）', badge: '宝宝律动榜', subtitle: '小星星童声团', liked: true, count: '2.1k+' },
                { artClass: 'music-art--poetry', title: '恐龙去散步', badge: '热门儿歌', subtitle: '麦田老师', liked: true, count: '1.6k+' },
                { artClass: 'music-art--angel', title: '睡前摇篮曲', badge: '助眠合集', subtitle: '晚安电台', liked: false, count: '680+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '儿童古诗启蒙 第8首', duration: '10:12', subtitle: '轻松学古诗，节奏更好记', liked: false, count: '530+' },
                { artClass: 'music-art--sword', title: '科学小问答：宇宙', duration: '07:48', subtitle: '边听边学，培养好奇心', liked: false, count: '421+' },
                { artClass: 'music-art--luoxiang', title: '情绪小课堂：我生气了', duration: '05:34', subtitle: '儿童情绪管理故事', liked: true, count: '399+' }
            ]
        },
        radar: {
            replayTitle: '雷达推荐命中',
            specialTitle: '根据口味持续更新',
            features: [
                { title: 'Radar<br>Mix', cover: 'group', variant: 'for-you', tag: '猜你喜欢', song: '沿海公路 - 粒子派', squarePlay: false },
                { title: 'Daily<br>Radar', cover: 'dear', variant: 'daily', tag: '每日30首', song: '失重航线 - C17', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--angel', title: 'Falling City', badge: '相似度 94%', subtitle: 'Noon Lab', liked: true, count: '450+' },
                { artClass: 'music-art--duet', title: '雾中告白', badge: '相似度 91%', subtitle: '陆森', liked: false, count: '288+' },
                { artClass: 'music-art--poetry', title: '玻璃雨', badge: '相似度 89%', subtitle: '许见', liked: true, count: '516+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '雷达：午夜安静系', duration: '08:06', subtitle: '你可能会喜欢的低频旋律', liked: false, count: '244+' },
                { artClass: 'music-art--sword', title: '雷达：鼓点偏好', duration: '04:58', subtitle: '节奏驱动，适合通勤', liked: false, count: '172+' },
                { artClass: 'music-art--luoxiang', title: '雷达：短播单曲', duration: '01:58', subtitle: '一分钟抓耳旋律合集', liked: true, count: '334+' }
            ]
        },
        ai: {
            replayTitle: 'AI作歌历史',
            specialTitle: 'AI作歌推荐',
            features: [
                { title: 'AI<br>Compose', cover: 'group', variant: 'for-you', tag: '灵感推荐', song: '雨后便利店 - AI Demo', squarePlay: false },
                { title: 'Draft<br>30', cover: 'dear', variant: 'daily', tag: '每日30首', song: '海边霓虹 - 生成版', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--duet', title: '凌晨四点的邮件', badge: 'AI词曲', subtitle: '你的草稿箱', liked: true, count: '95+' },
                { artClass: 'music-art--poetry', title: '落日快门', badge: 'AI编曲', subtitle: '你的草稿箱', liked: false, count: '63+' },
                { artClass: 'music-art--angel', title: '别回头看海', badge: 'AI混音', subtitle: '你的草稿箱', liked: true, count: '109+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: 'AI风格模板：Lo-fi', duration: '02:44', subtitle: '一键生成 Lo-fi 伴奏', liked: false, count: '86+' },
                { artClass: 'music-art--sword', title: 'AI风格模板：摇滚', duration: '03:12', subtitle: '鼓组与吉他自动编配', liked: false, count: '71+' },
                { artClass: 'music-art--luoxiang', title: 'AI人声建议', duration: '01:36', subtitle: '给草稿补全旋律和和声', liked: true, count: '120+' }
            ]
        },
        coins: {
            replayTitle: '金币专区常听',
            specialTitle: '金币任务与奖励',
            features: [
                { title: 'Coin<br>Task', cover: 'group', variant: 'for-you', tag: '今日任务', song: '听歌30分钟 +30 金币', squarePlay: false },
                { title: 'Coin<br>Shop', cover: 'dear', variant: 'daily', tag: '每日30首', song: '精选歌单解锁券', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--angel', title: '金币翻倍时段', badge: '20:00-22:00', subtitle: '活动中心', liked: false, count: '1.2k+' },
                { artClass: 'music-art--duet', title: '签到歌单', badge: '连续7天奖励', subtitle: '金币频道', liked: true, count: '780+' },
                { artClass: 'music-art--poetry', title: '挑战榜热歌', badge: '完成率提升', subtitle: '金币频道', liked: false, count: '560+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '任务：分享歌曲一次', duration: '00:30', subtitle: '完成后领取 20 金币', liked: false, count: '402+' },
                { artClass: 'music-art--sword', title: '任务：收藏一首歌', duration: '01:00', subtitle: '完成后领取 25 金币', liked: true, count: '355+' },
                { artClass: 'music-art--luoxiang', title: '金币商城上新速览', duration: '02:16', subtitle: '限时兑换项目', liked: false, count: '277+' }
            ]
        },
        audiobook: {
            replayTitle: '听书最近在听',
            specialTitle: '听书频道推荐',
            features: [
                { title: 'Audio<br>Book', cover: 'group', variant: 'for-you', tag: '猜你喜欢', song: '午夜电台：旧梦来信', squarePlay: false },
                { title: 'Daily<br>Listen', cover: 'dear', variant: 'daily', tag: '每日30首', song: '短篇故事精选 Vol.9', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--luoxiang', title: '人间清醒时刻', badge: '热度飙升', subtitle: '罗翔', liked: true, count: '930+' },
                { artClass: 'music-art--sword', title: '武侠广播剧：夜行', badge: '连载更新', subtitle: '声娱文化', liked: true, count: '710+' },
                { artClass: 'music-art--heal', title: '白噪与故事', badge: '助眠推荐', subtitle: '晚安频道', liked: false, count: '460+' }
            ],
            specialItems: [
                { artClass: 'music-art--poetry', title: '散文夜读：春雪', duration: '11:28', subtitle: '温柔旁白，沉浸感强', liked: false, count: '248+' },
                { artClass: 'music-art--angel', title: '悬疑短篇：回声', duration: '09:14', subtitle: '反转收尾，节奏紧凑', liked: false, count: '195+' },
                { artClass: 'music-art--duet', title: '旅行见闻录', duration: '06:22', subtitle: '轻松通勤听', liked: true, count: '286+' }
            ]
        },
        vip: {
            replayTitle: '会员专属回听',
            specialTitle: '会员专属内容',
            features: [
                { title: 'VIP<br>Only', cover: 'group', variant: 'for-you', tag: '专属精选', song: '无损典藏集 - 第2期', squarePlay: false },
                { title: 'Daily<br>VIP', cover: 'dear', variant: 'daily', tag: '每日30首', song: '会员抢先听 - 今晚首发', squarePlay: true }
            ],
            replayItems: [
                { artClass: 'music-art--angel', title: '4K Live 音源带', badge: '会员抢先听', subtitle: 'Official Live', liked: true, count: '1.8k+' },
                { artClass: 'music-art--duet', title: '无损母带精选', badge: 'Hi-Res', subtitle: '母带音频馆', liked: true, count: '1.1k+' },
                { artClass: 'music-art--poetry', title: '演唱会全程回放', badge: '仅会员可听', subtitle: '官方频道', liked: false, count: '870+' }
            ],
            specialItems: [
                { artClass: 'music-art--heal', title: '会员音质对比课', duration: '05:08', subtitle: '讲解无损与标准音质差别', liked: false, count: '312+' },
                { artClass: 'music-art--sword', title: '幕后制作手记', duration: '07:33', subtitle: '制作人访谈版', liked: true, count: '265+' },
                { artClass: 'music-art--luoxiang', title: '会员播单：周末循环', duration: '04:20', subtitle: '根据会员偏好推荐', liked: false, count: '356+' }
            ]
        }
    };

    function heartSvg(filled) {
        if (filled) {
            return '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12.1 20.55l-.1.1-.11-.1C7.14 16.24 4 13.39 4 9.96 4 7.5 5.9 5.6 8.36 5.6c1.4 0 2.74.65 3.59 1.67.85-1.02 2.19-1.67 3.59-1.67 2.46 0 4.36 1.9 4.36 4.36 0 3.43-3.14 6.28-7.8 10.59z"/></svg>';
    }

    function miniHeartSvg(filled) {
        if (filled) {
            return '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12.1 20.55l-.1.1-.11-.1C7.14 16.24 4 13.39 4 9.96 4 7.5 5.9 5.6 8.36 5.6c1.4 0 2.74.65 3.59 1.67.85-1.02 2.19-1.67 3.59-1.67 2.46 0 4.36 1.9 4.36 4.36 0 3.43-3.14 6.28-7.8 10.59z"/></svg>';
    }

    function durationSvg() {
        return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6l4 2"></path></svg>';
    }

    function parseLikeCount(countText) {
        var text = String(countText || '').trim().toLowerCase();
        var hasPlus = text.indexOf('+') !== -1;
        var useK = text.indexOf('k') !== -1;
        var value = 0;

        text = text.replace(/\+/g, '').trim();

        if (useK) {
            var kValue = parseFloat(text.replace(/k/g, ''));
            if (!isNaN(kValue)) value = Math.round(kValue * 1000);
        } else {
            var plainValue = parseInt(text.replace(/[^\d]/g, ''), 10);
            if (!isNaN(plainValue)) value = plainValue;
        }

        if (value < 0) value = 0;
        return {
            value: value,
            hasPlus: hasPlus,
            useK: useK
        };
    }

    function formatLikeCount(value, hasPlus, useK) {
        var safeValue = Math.round(Number(value) || 0);
        if (safeValue < 0) safeValue = 0;

        var label = '';
        if (useK) {
            var roundedK = Math.round((safeValue / 1000) * 10) / 10;
            label = String(roundedK).replace(/\.0$/, '') + 'k';
        } else {
            label = String(safeValue);
        }
        return label + (hasPlus ? '+' : '');
    }

    function formatPlaybackTime(seconds) {
        var total = Math.max(0, Math.floor(Number(seconds) || 0));
        var mm = String(Math.floor(total / 60)).padStart(2, '0');
        var ss = String(total % 60).padStart(2, '0');
        return mm + ':' + ss;
    }

    function likeCountMarkup(rawCount) {
        var meta = parseLikeCount(rawCount);
        return '<div class="music-like-count" data-count-value="' + meta.value + '" data-count-plus="' + (meta.hasPlus ? '1' : '0') + '" data-count-k="' + (meta.useK ? '1' : '0') + '">' + formatLikeCount(meta.value, meta.hasPlus, meta.useK) + '</div>';
    }

    function miniPlaySvg() {
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }

    function miniPauseSvg() {
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>';
    }

    function playerDetailToggleSvg(playing) {
        if (playing) {
            return '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><rect x="6.75" y="4.75" width="3.5" height="14.5" rx="1"></rect><rect x="13.75" y="4.75" width="3.5" height="14.5" rx="1"></rect></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M9 6.2v11.6l8.8-5.8z"></path></svg>';
    }

    function playerDetailStarSvg(filled) {
        if (filled) {
            return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 3.5l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.7l-5.5 2.9 1-6.2L3 10.1l6.2-.9z"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.7l-5.5 2.9 1-6.2L3 10.1l6.2-.9z"/></svg>';
    }

    function replayPlaySvg() {
        return '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }

    function replayPauseSvg() {
        return '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>';
    }

    function getMiniToggleBtn() {
        var player = document.querySelector('.music-mini-player');
        if (!player) return null;
        return player.querySelector('.music-mini-btn[data-mini-action="toggle"]') || null;
    }

    function getMiniLikeBtn() {
        var player = document.querySelector('.music-mini-player');
        if (!player) return null;
        return player.querySelector('.music-mini-btn[data-mini-action="like"]') || null;
    }

    function getMiniPlaylistBtn() {
        var player = document.querySelector('.music-mini-player');
        if (!player) return null;
        return player.querySelector('.music-mini-btn[data-mini-action="playlist"]') || null;
    }

    function getPlaylistPanel() {
        return document.getElementById('music-playlist-panel');
    }

    function getPlaylistModeBtn() {
        var panel = getPlaylistPanel();
        if (!panel) return null;
        return panel.querySelector('.music-playlist-mode-btn[data-playlist-action="mode"]') || null;
    }

    function getPlayerDetailEl() {
        return document.getElementById('music-player-detail');
    }

    function getPlayerDetailPagesEl() {
        return document.getElementById('music-player-detail-pages');
    }

    function getPlayerDetailProgressEl() {
        return document.getElementById('music-player-detail-progress');
    }

    function getPlayerDetailModeBtn() {
        return document.getElementById('music-player-detail-mode-btn');
    }

    function getPlayerDetailToggleBtns() {
        return document.querySelectorAll('[data-player-detail-action="toggle"]');
    }

    function getPlayerDetailLyricsScrollEl() {
        return document.getElementById('music-player-lyrics-scroll');
    }

    function syncPlaylistModeButton() {
        var btn = getPlaylistModeBtn();
        if (!btn) return;
        var label = getPlaylistModeLabel(playlistPlayMode);
        btn.setAttribute('aria-label', label);
        btn.innerHTML = getPlaylistModeIcon(playlistPlayMode) + '<span>' + label + '</span>';
        syncPlayerDetailModeButton();
    }

    function syncPlayerDetailModeButton() {
        var btn = getPlayerDetailModeBtn();
        if (!btn) return;
        btn.setAttribute('aria-label', getPlaylistModeLabel(playlistPlayMode));
        btn.innerHTML = getPlaylistModeIcon(playlistPlayMode);
    }

    function getPlayerDetailSeed(track) {
        var safeTrack = track && typeof track === 'object' ? track : {};
        return hashString(String(safeTrack.title || '') + '|' + String(safeTrack.artist || ''));
    }

    function getPlayerDetailTrackKey(track) {
        var safeTrack = track && typeof track === 'object' ? track : {};
        var trackId = String(safeTrack.trackId || '').trim();
        if (trackId) return 'track:' + trackId;
        return 'meta:' + String(safeTrack.title || '').trim() + '|' + String(safeTrack.artist || '').trim();
    }

    function randomInt(min, max) {
        var safeMin = Math.floor(Number(min) || 0);
        var safeMax = Math.floor(Number(max) || 0);
        if (safeMax < safeMin) {
            var swap = safeMin;
            safeMin = safeMax;
            safeMax = swap;
        }
        return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
    }

    function createRandomPlayerDetailMetrics() {
        var likeValue = randomInt(280, 9800);
        var bulletValue = randomInt(120, 8800);
        return {
            listeners: String(randomInt(7, 999)) + '人在听',
            likeLabel: formatLikeCount(likeValue, likeValue >= 1000, likeValue >= 1000),
            listLabel: String(randomInt(68, 999)),
            commentLabel: String(randomInt(120, 9800)),
            bulletLabel: formatLikeCount(bulletValue, bulletValue >= 1000, bulletValue >= 1000)
        };
    }

    function getPlayerDetailMetrics(track) {
        var cacheKey = getPlayerDetailTrackKey(track);
        if (!playerDetailMetricsCache[cacheKey]) {
            playerDetailMetricsCache[cacheKey] = createRandomPlayerDetailMetrics();
        }
        return playerDetailMetricsCache[cacheKey];
    }

    function clampColorChannel(value) {
        var num = Math.round(Number(value) || 0);
        if (num < 0) return 0;
        if (num > 255) return 255;
        return num;
    }

    function rgbArrayToCss(rgb) {
        return [
            clampColorChannel(rgb[0]),
            clampColorChannel(rgb[1]),
            clampColorChannel(rgb[2])
        ].join(', ');
    }

    function mixRgb(rgbA, rgbB, ratio) {
        var safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
        return [
            clampColorChannel(rgbA[0] * (1 - safeRatio) + rgbB[0] * safeRatio),
            clampColorChannel(rgbA[1] * (1 - safeRatio) + rgbB[1] * safeRatio),
            clampColorChannel(rgbA[2] * (1 - safeRatio) + rgbB[2] * safeRatio)
        ];
    }

    function rgbDistance(rgbA, rgbB) {
        var dr = (rgbA[0] || 0) - (rgbB[0] || 0);
        var dg = (rgbA[1] || 0) - (rgbB[1] || 0);
        var db = (rgbA[2] || 0) - (rgbB[2] || 0);
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function hslToRgb(h, s, l) {
        var hue = ((Number(h) || 0) % 360 + 360) % 360;
        var sat = Math.max(0, Math.min(1, Number(s) || 0));
        var light = Math.max(0, Math.min(1, Number(l) || 0));
        var c = (1 - Math.abs(2 * light - 1)) * sat;
        var x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        var m = light - c / 2;
        var r = 0;
        var g = 0;
        var b = 0;

        if (hue < 60) {
            r = c; g = x;
        } else if (hue < 120) {
            r = x; g = c;
        } else if (hue < 180) {
            g = c; b = x;
        } else if (hue < 240) {
            g = x; b = c;
        } else if (hue < 300) {
            r = x; b = c;
        } else {
            r = c; b = x;
        }

        return [
            clampColorChannel((r + m) * 255),
            clampColorChannel((g + m) * 255),
            clampColorChannel((b + m) * 255)
        ];
    }

    function buildPlayerDetailFallbackPalette(track) {
        var seed = getPlayerDetailSeed(track);
        var accentA = mixRgb(hslToRgb(seed % 360, 0.72, 0.72), [255, 255, 255], 0.38);
        var accentB = mixRgb(hslToRgb((seed + 118) % 360, 0.68, 0.74), [255, 255, 255], 0.42);
        return {
            accentA: rgbArrayToCss(accentA),
            accentB: rgbArrayToCss(accentB)
        };
    }

    function extractPlayerDetailPaletteFromImage(imageEl) {
        var canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(imageEl, 0, 0, 24, 24);
        var imageData = ctx.getImageData(0, 0, 24, 24);
        if (!imageData || !imageData.data || !imageData.data.length) return null;

        var left = [0, 0, 0];
        var right = [0, 0, 0];
        var leftWeight = 0;
        var rightWeight = 0;

        for (var y = 0; y < 24; y++) {
            for (var x = 0; x < 24; x++) {
                var idx = (y * 24 + x) * 4;
                var alpha = imageData.data[idx + 3] / 255;
                if (alpha <= 0.06) continue;

                var r = imageData.data[idx];
                var g = imageData.data[idx + 1];
                var b = imageData.data[idx + 2];
                var max = Math.max(r, g, b);
                var min = Math.min(r, g, b);
                var saturation = max === 0 ? 0 : (max - min) / max;
                var weight = 0.3 + saturation * 1.7 + alpha * 0.6;

                if (x < 12) {
                    left[0] += r * weight;
                    left[1] += g * weight;
                    left[2] += b * weight;
                    leftWeight += weight;
                } else {
                    right[0] += r * weight;
                    right[1] += g * weight;
                    right[2] += b * weight;
                    rightWeight += weight;
                }
            }
        }

        if (!(leftWeight > 0) || !(rightWeight > 0)) return null;

        var leftAvg = [left[0] / leftWeight, left[1] / leftWeight, left[2] / leftWeight];
        var rightAvg = [right[0] / rightWeight, right[1] / rightWeight, right[2] / rightWeight];

        leftAvg = mixRgb(leftAvg, [255, 255, 255], 0.5);
        rightAvg = mixRgb(rightAvg, [255, 255, 255], 0.52);

        if (rgbDistance(leftAvg, rightAvg) < 34) {
            rightAvg = mixRgb([rightAvg[2], rightAvg[0], rightAvg[1]], [255, 255, 255], 0.3);
        }

        return {
            accentA: rgbArrayToCss(leftAvg),
            accentB: rgbArrayToCss(rightAvg)
        };
    }

    function applyPlayerDetailPalette(palette) {
        var detailEl = getPlayerDetailEl();
        if (!detailEl || !palette) return;
        detailEl.style.setProperty('--music-player-detail-accent-a', String(palette.accentA || '255, 224, 204'));
        detailEl.style.setProperty('--music-player-detail-accent-b', String(palette.accentB || '204, 239, 245'));
    }

    function updatePlayerDetailPalette(coverDataUrl, track) {
        var paletteTrack = track && typeof track === 'object' ? track : currentPlayingTrack || {};
        var cacheKey = String(coverDataUrl || '').trim() || getPlayerDetailTrackKey(paletteTrack);
        var fallbackPalette = buildPlayerDetailFallbackPalette(paletteTrack);

        if (playerDetailPaletteCache[cacheKey]) {
            applyPlayerDetailPalette(playerDetailPaletteCache[cacheKey]);
            return;
        }

        applyPlayerDetailPalette(fallbackPalette);

        var src = String(coverDataUrl || '').trim();
        if (!src) {
            playerDetailPaletteCache[cacheKey] = fallbackPalette;
            return;
        }

        var requestId = ++playerDetailPaletteReqId;
        var imageEl = new Image();
        imageEl.crossOrigin = 'anonymous';
        imageEl.onload = function() {
            if (requestId !== playerDetailPaletteReqId) return;
            var palette = null;
            try {
                palette = extractPlayerDetailPaletteFromImage(imageEl);
            } catch (e) {
                palette = null;
            }
            playerDetailPaletteCache[cacheKey] = palette || fallbackPalette;
            applyPlayerDetailPalette(playerDetailPaletteCache[cacheKey]);
        };
        imageEl.onerror = function() {
            if (requestId !== playerDetailPaletteReqId) return;
            playerDetailPaletteCache[cacheKey] = fallbackPalette;
            applyPlayerDetailPalette(fallbackPalette);
        };
        imageEl.src = src;
    }

    function buildPlayerDetailCredit(track) {
        var artist = String(track && track.artist || '').trim() || '未知歌手';
        return '词：' + artist + ' / 曲：' + artist + ' / 编曲：mini音乐';
    }

    function syncPlayerDetailCredit(lineIndex) {
        var creditEl = document.getElementById('music-player-detail-credit');
        if (!creditEl) return;
        var safeIndex = typeof lineIndex === 'number' ? lineIndex : 0;
        var lyricEntry = safeIndex >= 0 ? playerDetailLyrics[safeIndex] : null;
        var lyricText = String(lyricEntry && lyricEntry.text || '').trim();
        creditEl.textContent = lyricText || buildPlayerDetailCredit(currentPlayingTrack || {});
    }

    function buildPlayerDetailFallbackLyrics(title, artist) {
        var safeTitle = String(title || '').trim() || '当前歌曲';
        var safeArtist = String(artist || '').trim() || '未知歌手';
        var lines = [
            '正在播放 ' + safeTitle,
            '演唱：' + safeArtist,
            '还没有导入滚动歌词',
            '左滑进入歌词页，右滑返回唱片页',
            '如果歌曲带有 LRC 文件，这里会自动同步滚动',
            '你也可以在歌单里继续导入本地歌词',
            '愿这首歌正好唱到你的心里'
        ];
        return lines.map(function(text, idx) {
            return {
                time: idx * 6,
                text: text
            };
        });
    }

    function parsePlayerDetailLyrics(lrcText, title, artist) {
        var lines = String(lrcText || '').split(/\r?\n/);
        var entries = [];
        var plainLines = [];

        lines.forEach(function(line) {
            var text = String(line || '').trim();
            if (!text) return;
            if (/^\[(ti|ar|al|by|offset):/i.test(text)) return;

            var matches = text.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g);
            var lyricText = text.replace(/\[[^\]]+\]/g, '').trim();

            if (!matches || !matches.length) {
                if (lyricText) plainLines.push(lyricText);
                return;
            }

            matches.forEach(function(matchText) {
                var match = matchText.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/);
                if (!match || !lyricText) return;
                var minute = parseInt(match[1], 10) || 0;
                var second = parseInt(match[2], 10) || 0;
                var fraction = String(match[3] || '0');
                var millisecond = parseInt((fraction + '00').slice(0, 3), 10) || 0;
                entries.push({
                    time: minute * 60 + second + millisecond / 1000,
                    text: lyricText
                });
            });
        });

        if (!entries.length && plainLines.length) {
            entries = plainLines.map(function(text, idx) {
                return {
                    time: idx * 6,
                    text: text
                };
            });
        }

        if (!entries.length) {
            return buildPlayerDetailFallbackLyrics(title, artist);
        }

        entries.sort(function(a, b) {
            return a.time - b.time;
        });

        return entries.filter(function(item) {
            return String(item && item.text || '').trim();
        });
    }

    function setPlayerDetailView(viewKey) {
        playerDetailView = viewKey === 'lyrics' ? 'lyrics' : 'record';
        var detailEl = getPlayerDetailEl();
        if (detailEl) {
            detailEl.setAttribute('data-view', playerDetailView);
        }
        if (playerDetailView === 'lyrics') {
            syncPlayerDetailLyrics(true);
        }
    }

    function setPlayerDetailOpen(open, viewKey) {
        var detailEl = getPlayerDetailEl();
        if (!detailEl) return;
        isPlayerDetailOpen = !!open;
        if (typeof viewKey === 'string' && viewKey) {
            setPlayerDetailView(viewKey);
        } else {
            setPlayerDetailView(playerDetailView);
        }
        detailEl.classList.toggle('music-player-detail--open', isPlayerDetailOpen);
        detailEl.setAttribute('aria-hidden', isPlayerDetailOpen ? 'false' : 'true');
    }

    function ensurePlayerDetailTrackReady() {
        if (currentPlayingTrack && currentPlayingTrack.audioSrc) return true;
        var firstTrack = null;
        for (var i = 0; i < playlistTracks.length; i++) {
            if (playlistTracks[i] && playlistTracks[i].audioSrc) {
                firstTrack = playlistTracks[i];
                break;
            }
        }
        if (!firstTrack) return false;
        playTrack(firstTrack.title, firstTrack.artist, firstTrack.source || 'playlist', firstTrack);
        return !!(currentPlayingTrack && currentPlayingTrack.audioSrc);
    }

    function openPlayerDetail(viewKey) {
        if (!ensurePlayerDetailTrackReady()) {
            alert('\u8bf7\u5148\u5728\u6b4c\u5355\u91cc\u6dfb\u52a0\u53ef\u64ad\u653e\u6b4c\u66f2');
            return;
        }
        syncPlayerDetailTrackUI();
        syncPlayerDetailProgress();
        setPlaylistPanelOpen(false);
        setPlayerDetailOpen(true, viewKey || 'record');
    }

    function closePlayerDetail() {
        setPlayerDetailOpen(false);
    }

    function setPlayerDetailCover(coverDataUrl, title) {
        var coverEl = document.getElementById('music-player-detail-disc-cover');
        var fallbackEl = document.getElementById('music-player-detail-disc-fallback');
        if (!coverEl) return;
        var src = String(coverDataUrl || '').trim();
        if (src) {
            coverEl.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
            coverEl.classList.add('music-player-detail-disc-cover--image');
        } else {
            coverEl.style.backgroundImage = '';
            coverEl.classList.remove('music-player-detail-disc-cover--image');
        }
        if (fallbackEl) {
            var fallbackText = String(title || '').trim() || 'M';
            fallbackEl.textContent = fallbackText.slice(0, 1);
        }
        updatePlayerDetailPalette(src, currentPlayingTrack || { title: title });
    }

    function renderPlayerDetailLyrics() {
        var listEl = document.getElementById('music-player-lyrics-list');
        if (!listEl) return;
        var title = String(currentPlayingTrack && currentPlayingTrack.title || '').trim();
        var artist = String(currentPlayingTrack && currentPlayingTrack.artist || '').trim();
        var lrcText = String(currentPlayingTrack && currentPlayingTrack.lrc || '').trim();
        playerDetailLyrics = parsePlayerDetailLyrics(lrcText, title, artist);
        playerDetailActiveLyricIndex = -1;
        listEl.innerHTML = playerDetailLyrics.map(function(item, idx) {
            return '<div class="music-player-lyrics-line" data-lyric-index="' + idx + '" data-lyric-time="' + escapeAttr(String(item.time || 0)) + '" role="button" tabindex="0" aria-label="跳转到歌词：' + escapeAttr(item.text) + '">' + escapeAttr(item.text) + '</div>';
        }).join('');
        syncPlayerDetailLyrics(true);
    }

    function syncPlayerDetailLyrics(forceCenter) {
        var listEl = document.getElementById('music-player-lyrics-list');
        var scrollEl = getPlayerDetailLyricsScrollEl();
        if (!playerDetailLyrics.length) {
            syncPlayerDetailCredit(-1);
            return;
        }

        var currentTime = musicAudioEl ? Number(musicAudioEl.currentTime || 0) : 0;
        var nextIndex = 0;

        for (var i = 0; i < playerDetailLyrics.length; i++) {
            if (currentTime + 0.25 >= playerDetailLyrics[i].time) {
                nextIndex = i;
            } else {
                break;
            }
        }

        syncPlayerDetailCredit(nextIndex);

        if (!listEl || !scrollEl) {
            playerDetailActiveLyricIndex = nextIndex;
            return;
        }

        if (nextIndex === playerDetailActiveLyricIndex && !forceCenter) return;
        playerDetailActiveLyricIndex = nextIndex;

        var lineNodes = listEl.querySelectorAll('.music-player-lyrics-line');
        lineNodes.forEach(function(node, idx) {
            node.classList.toggle('music-player-lyrics-line--active', idx === nextIndex);
            node.classList.toggle('music-player-lyrics-line--past', idx < nextIndex);
        });

        var activeLine = listEl.querySelector('.music-player-lyrics-line--active');
        if (!activeLine) return;

        var targetTop = Math.max(0, activeLine.offsetTop - scrollEl.clientHeight * 0.38);
        scrollEl.scrollTo({
            top: targetTop,
            behavior: forceCenter ? 'auto' : 'smooth'
        });
    }

    function seekPlayerDetailToLyricLine(lineEl) {
        if (!lineEl || !musicAudioEl) return;
        var nextTime = Number(lineEl.getAttribute('data-lyric-time') || 0);
        if (!(nextTime >= 0)) return;
        var duration = Number(musicAudioEl.duration || 0);
        if (duration > 0) {
            nextTime = Math.min(nextTime, Math.max(0, duration - 0.05));
        }
        try {
            musicAudioEl.currentTime = nextTime;
        } catch (e) {
            return;
        }
        syncPlayerDetailProgress();
        syncPlayerDetailLyrics(true);
    }

    function updatePlayerDetailLikeUI() {
        var liked = !!(currentPlayingTrack && getTrackLiked(currentPlayingTrack.title, currentPlayingTrack.artist, false));
        var metrics = getPlayerDetailMetrics(currentPlayingTrack || {});
        var iconIds = ['music-player-detail-fav-icon', 'music-player-lyrics-fav-icon'];
        iconIds.forEach(function(id) {
            var iconEl = document.getElementById(id);
            if (!iconEl) return;
            iconEl.classList.toggle('music-player-detail-fav-icon--liked', liked);
            iconEl.innerHTML = miniHeartSvg(liked);
        });

        var starEl = document.getElementById('music-player-lyrics-star-icon');
        if (starEl) {
            starEl.classList.toggle('music-player-detail-fav-icon--liked', liked);
            starEl.innerHTML = playerDetailStarSvg(liked);
        }

        var countIds = ['music-player-detail-fav-count', 'music-player-lyrics-fav-count'];
        countIds.forEach(function(id) {
            var countEl = document.getElementById(id);
            if (countEl) countEl.textContent = metrics.likeLabel;
        });
    }

    function syncPlayerDetailPlaybackUI() {
        var toggleBtns = getPlayerDetailToggleBtns();
        toggleBtns.forEach(function(btn) {
            btn.innerHTML = playerDetailToggleSvg(isMiniPlaying);
            btn.setAttribute('aria-label', isMiniPlaying ? '暂停' : '播放');
        });
    }

    function syncPlayerDetailProgressVisual(progressEl, ratio) {
        if (!progressEl) return;
        var safeRatio = Math.max(0, Math.min(1, Number(ratio || 0)));
        progressEl.style.setProperty('--music-progress-percent', String((safeRatio * 100).toFixed(2)) + '%');
    }

    function syncPlayerDetailProgress() {
        var progressEl = getPlayerDetailProgressEl();
        var currentTimeEl = document.getElementById('music-player-detail-current-time');
        var totalTimeEl = document.getElementById('music-player-detail-total-time');
        var currentTime = musicAudioEl ? Number(musicAudioEl.currentTime || 0) : 0;
        var duration = musicAudioEl ? Number(musicAudioEl.duration || 0) : 0;

        if (progressEl) {
            var ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
            var nextValue = Math.round(ratio * 1000);
            progressEl.value = String(nextValue);
            syncPlayerDetailProgressVisual(progressEl, ratio);
        }
        if (currentTimeEl) currentTimeEl.textContent = formatPlaybackTime(currentTime);
        if (totalTimeEl) totalTimeEl.textContent = formatPlaybackTime(duration);
        if (playerDetailView === 'lyrics' || isPlayerDetailOpen) {
            syncPlayerDetailLyrics(false);
        }
    }

    function syncPlayerDetailTrackUI() {
        var title = String(currentPlayingTrack && currentPlayingTrack.title || '').trim() || '当前暂无正在播放';
        var artist = String(currentPlayingTrack && currentPlayingTrack.artist || '').trim() || '未知歌手';
        var metrics = getPlayerDetailMetrics(currentPlayingTrack || {});

        var titleEl = document.getElementById('music-player-detail-song-title');
        if (titleEl) titleEl.textContent = title;
        var artistEl = document.getElementById('music-player-detail-song-artist');
        if (artistEl) artistEl.textContent = artist;
        var lyricTitleEl = document.getElementById('music-player-lyrics-title');
        if (lyricTitleEl) lyricTitleEl.textContent = title;
        var lyricArtistEl = document.getElementById('music-player-lyrics-artist');
        if (lyricArtistEl) lyricArtistEl.textContent = artist;
        var lyricCreditEl = document.getElementById('music-player-lyrics-credit');
        if (lyricCreditEl) lyricCreditEl.textContent = '制作团队';

        var badgesEl = document.getElementById('music-player-detail-badges');
        if (badgesEl) {
            badgesEl.innerHTML = [
                '<span>关注</span>',
                '<span>' + metrics.listeners + '</span>',
                '<span>标准</span>',
                '<span>VIP</span>',
                '<span>原声</span>'
            ].join('');
        }

        var listCountEl = document.getElementById('music-player-detail-list-count');
        if (listCountEl) listCountEl.textContent = metrics.listLabel;
        var commentCountEl = document.getElementById('music-player-detail-comment-count');
        if (commentCountEl) commentCountEl.textContent = metrics.commentLabel;
        var lyricCommentCountEl = document.getElementById('music-player-lyrics-comment-count');
        if (lyricCommentCountEl) lyricCommentCountEl.textContent = '评论 ' + metrics.commentLabel;

        setPlayerDetailCover(currentPlayingTrack && currentPlayingTrack.cover || '', title);
        updatePlayerDetailLikeUI();
        renderPlayerDetailLyrics();
        syncPlayerDetailPlaybackUI();
        syncPlayerDetailModeButton();
    }

    function setPlaylistPlayMode(mode) {
        var nextMode = playlistModeOrder.indexOf(mode) === -1 ? 'order' : mode;
        playlistPlayMode = nextMode;
        syncPlaylistModeButton();
    }

    function cyclePlaylistPlayMode() {
        var idx = playlistModeOrder.indexOf(playlistPlayMode);
        if (idx < 0) idx = 0;
        setPlaylistPlayMode(playlistModeOrder[(idx + 1) % playlistModeOrder.length]);
    }

    function getMyPlaylistListEl() {
        return document.getElementById('music-my-playlist-list');
    }

    function getMyPlaylistEmptyEl() {
        return document.getElementById('music-my-empty-playlist');
    }

    function getCreatePlaylistModal() {
        return document.getElementById('music-create-playlist-modal');
    }

    function getAddSongModal() {
        return document.getElementById('music-add-song-modal');
    }

    function getCreatePlaylistNameInput() {
        return document.getElementById('music-create-playlist-name-input');
    }

    function getCreatePlaylistDescInput() {
        return document.getElementById('music-create-playlist-desc-input');
    }

    function getCreatePlaylistCoverInput() {
        return document.getElementById('music-create-playlist-cover-input');
    }

    function getCreatePlaylistCoverPreview() {
        return document.getElementById('music-create-playlist-cover-preview');
    }

    function getAddSongNameInput() {
        return document.getElementById('music-add-song-name-input');
    }

    function getAddSongArtistInput() {
        return document.getElementById('music-add-song-artist-input');
    }

    function getAddSongCoverFileInput() {
        return document.getElementById('music-add-song-cover-file-input');
    }

    function getAddSongCoverPreview() {
        return document.getElementById('music-add-song-cover-preview');
    }

    function getAddSongAudioUrlInput() {
        return document.getElementById('music-add-song-audio-url-input');
    }

    function getAddSongAudioFileInput() {
        return document.getElementById('music-add-song-audio-file-input');
    }

    function getAddSongAudioFileNameEl() {
        return document.getElementById('music-add-song-audio-file-name');
    }

    function getAddSongLrcFileInput() {
        return document.getElementById('music-add-song-lrc-file-input');
    }

    function getAddSongLrcFileNameEl() {
        return document.getElementById('music-add-song-lrc-file-name');
    }

    function getAddSongLrcPreviewEl() {
        return document.getElementById('music-add-song-lrc-preview');
    }

    function getAddSongPlaylistNameEl() {
        return document.getElementById('music-add-song-playlist-name');
    }

    function getPlaylistDetailScrollEl() {
        return document.getElementById('music-playlist-detail-scroll');
    }

    function getPlaylistDetailCoverEl() {
        return document.getElementById('music-playlist-detail-cover');
    }

    function getPlaylistDetailNameEl() {
        return document.getElementById('music-playlist-detail-name');
    }

    function getPlaylistDetailOwnerAvatarEl() {
        return document.getElementById('music-playlist-detail-owner-avatar');
    }

    function getPlaylistDetailOwnerNameEl() {
        return document.getElementById('music-playlist-detail-owner-name');
    }

    function getPlaylistDetailDescEl() {
        return document.getElementById('music-playlist-detail-desc');
    }

    function getPlaylistDetailCountEl() {
        return document.getElementById('music-playlist-detail-count');
    }

    function getPlaylistDetailAddLinkEl() {
        return document.getElementById('music-playlist-detail-add-link');
    }

    function getPlaylistDetailListEl() {
        return document.getElementById('music-playlist-detail-list');
    }

    function getPlaylistDetailEmptyEl() {
        return document.getElementById('music-playlist-detail-empty');
    }

    function getPlaylistInitial(name) {
        var text = String(name || '').trim();
        return text ? text.charAt(0).toUpperCase() : 'M';
    }

    function findMyPlaylistById(playlistId) {
        var id = String(playlistId || '');
        if (!id) return null;
        for (var i = 0; i < myPlaylists.length; i++) {
            if (String(myPlaylists[i].id) === id) return myPlaylists[i];
        }
        return null;
    }

    function getCurrentPlaylist() {
        return findMyPlaylistById(currentPlaylistId);
    }

    function getSongFromPlaylist(playlistId, songId) {
        var playlist = findMyPlaylistById(playlistId);
        if (!playlist || !Array.isArray(playlist.songs)) return null;
        var id = String(songId || '');
        if (!id) return null;
        for (var i = 0; i < playlist.songs.length; i++) {
            if (String(playlist.songs[i].id) === id) return playlist.songs[i];
        }
        return null;
    }

    function getPlaylistOwnerName() {
        var nameEl = document.getElementById('text-music-my-name');
        return String(nameEl && nameEl.textContent || '').trim() || '\u6211';
    }

    function getPlaylistOwnerAvatar() {
        var avatarImg = document.querySelector('#music-my-avatar img');
        return String(avatarImg && avatarImg.getAttribute('src') || '').trim();
    }

    function getPlaylistSummaryText(item) {
        var songs = Array.isArray(item && item.songs) ? item.songs : [];
        var count = songs.length;
        if (!count) return '0\u9996';
        var latestSong = songs[0] || {};
        var latestTitle = String(latestSong.title || '').trim() || '\u672a\u77e5\u6b4c\u66f2';
        var latestArtist = String(latestSong.artist || '').trim() || '\u672a\u77e5\u6b4c\u624b';
        return String(count) + '\u9996\u00b7' + latestTitle + '-' + latestArtist;
    }

    function getMyPlaylistManageBtn() {
        return document.getElementById('music-my-playlist-manage-btn');
    }

    function getPlaylistDetailManageBtn() {
        return document.getElementById('music-playlist-detail-manage-btn');
    }

    function updateMyPlaylistManageButtonUI() {
        var btn = getMyPlaylistManageBtn();
        if (!btn) return;
        btn.classList.toggle('music-my-section-manage--active', isMyPlaylistManageMode);
        btn.textContent = isMyPlaylistManageMode ? '\u5b8c\u6210' : '\u7ba1\u7406';
    }

    function updatePlaylistSongManageButtonUI() {
        var btn = getPlaylistDetailManageBtn();
        if (!btn) return;
        btn.classList.toggle('music-playlist-detail-float-btn--active', isPlaylistSongManageMode);
        btn.setAttribute('aria-label', isPlaylistSongManageMode ? '\u5b8c\u6210\u7ba1\u7406' : '\u7ba1\u7406\u6b4c\u66f2');
    }

    function toggleMyPlaylistManageMode() {
        isMyPlaylistManageMode = !isMyPlaylistManageMode;
        renderMyPlaylists();
    }

    function togglePlaylistSongManageMode() {
        isPlaylistSongManageMode = !isPlaylistSongManageMode;
        if (isPlaylistSongManageMode) {
            clearPlaylistSelection();
        }
        renderCurrentPlaylistDetail();
    }

    function editPlaylistById(playlistId) {
        var playlist = findMyPlaylistById(playlistId);
        if (!playlist) return;
        var nextName = window.prompt('\u7f16\u8f91\u6b4c\u5355\u540d', String(playlist.name || '').trim());
        if (nextName == null) return;
        nextName = String(nextName || '').trim();
        if (!nextName) {
            alert('\u6b4c\u5355\u540d\u4e0d\u80fd\u4e3a\u7a7a');
            return;
        }
        var nextDesc = window.prompt('\u7f16\u8f91\u6b4c\u5355\u63cf\u8ff0', String(playlist.desc || '').trim());
        if (nextDesc == null) return;
        playlist.name = nextName;
        playlist.desc = String(nextDesc || '').trim();
        renderMyPlaylists();
        if (String(currentPlaylistId || '') === String(playlist.id || '')) {
            renderCurrentPlaylistDetail();
        }
        queueMusicLibraryPersist();
    }

    function deletePlaylistById(playlistId) {
        var id = String(playlistId || '').trim();
        if (!id) return;
        var playlist = findMyPlaylistById(id);
        if (!playlist) return;
        var safeName = String(playlist.name || '').trim() || '\u672a\u547d\u540d\u6b4c\u5355';
        if (!window.confirm('\u786e\u5b9a\u5220\u9664\u6b4c\u5355\u300a' + safeName + '\u300b\uff1f')) return;

        var removedCurrentPlaylist = String(currentPlaylistId || '') === id;
        var playingFromRemovedPlaylist = !!(currentPlayingTrack && String(currentPlayingTrack.playlistId || '') === id);

        myPlaylists = myPlaylists.filter(function(item) {
            return String(item && item.id || '') !== id;
        });

        if (removedCurrentPlaylist) {
            currentPlaylistId = '';
            isPlaylistSongManageMode = false;
            clearPlaylistSelection();
            switchMusicPage('me');
        }

        if (playingFromRemovedPlaylist) {
            stopCurrentMusicPlayback();
            playlistTracks = [];
            renderPlaylistPanel();
        }

        renderMyPlaylists();
        queueMusicLibraryPersist();
    }

    function editSongInCurrentPlaylist(trackId) {
        var playlist = getCurrentPlaylist();
        var song = getSongFromPlaylist(currentPlaylistId, trackId);
        if (!playlist || !song) return;

        var nextTitle = window.prompt('\u7f16\u8f91\u6b4c\u66f2\u540d', String(song.title || '').trim());
        if (nextTitle == null) return;
        nextTitle = String(nextTitle || '').trim();
        if (!nextTitle) {
            alert('\u6b4c\u66f2\u540d\u4e0d\u80fd\u4e3a\u7a7a');
            return;
        }
        var nextArtist = window.prompt('\u7f16\u8f91\u6b4c\u624b\u540d', String(song.artist || '').trim());
        if (nextArtist == null) return;

        song.title = nextTitle;
        song.artist = String(nextArtist || '').trim();

        if (currentPlayingTrack && String(currentPlayingTrack.trackId || '') === String(song.id || '')) {
            currentPlayingTrack.title = song.title;
            currentPlayingTrack.artist = song.artist;
            setMiniTrack(currentPlayingTrack.title, currentPlayingTrack.artist, currentPlayingTrack.cover);
        }

        renderMyPlaylists();
        renderCurrentPlaylistDetail();
        syncPlaylistTracksFromCurrentPlaylist();
        renderPlaylistPanel();
        queueMusicLibraryPersist();
    }

    function myPlaylistItemMarkup(item) {
        var safeName = String(item && item.name || '').trim() || '\u672a\u547d\u540d\u6b4c\u5355';
        var summary = getPlaylistSummaryText(item);
        var playlistId = String(item && item.id || '').trim();
        var coverDataUrl = String(item && item.cover || '').trim();
        var coverMarkup = '<span class="music-my-playlist-cover"><em>' + escapeAttr(getPlaylistInitial(safeName)) + '</em></span>';
        if (coverDataUrl) {
            coverMarkup = '<span class="music-my-playlist-cover"><img src="' + escapeAttr(coverDataUrl) + '" alt=""></span>';
        }
        return [
            '<div class="music-my-playlist-item' + (isMyPlaylistManageMode ? ' music-my-playlist-item--managing' : '') + '" role="button" tabindex="0" data-my-playlist-id="' + escapeAttr(playlistId) + '">',
            coverMarkup,
            '  <div class="music-my-playlist-main">',
            '    <div class="music-my-playlist-name">' + escapeAttr(safeName) + '</div>',
            '    <div class="music-my-playlist-desc">' + escapeAttr(summary) + '</div>',
            '  </div>',
            isMyPlaylistManageMode
                ? '  <div class="music-my-playlist-actions"><button class="music-my-playlist-action" type="button" data-my-playlist-action="edit-playlist" data-playlist-id="' + escapeAttr(playlistId) + '">\u7f16\u8f91</button><button class="music-my-playlist-action music-my-playlist-action--danger" type="button" data-my-playlist-action="delete-playlist" data-playlist-id="' + escapeAttr(playlistId) + '">\u5220\u9664</button></div>'
                : '',
            '</div>'
        ].join('');
    }

    function renderMyPlaylists() {
        var listEl = getMyPlaylistListEl();
        var emptyEl = getMyPlaylistEmptyEl();
        if (!listEl || !emptyEl) return;

        if (!myPlaylists.length) {
            isMyPlaylistManageMode = false;
            listEl.innerHTML = '';
            emptyEl.style.display = 'flex';
            updateMyPlaylistManageButtonUI();
            return;
        }

        listEl.innerHTML = myPlaylists.map(myPlaylistItemMarkup).join('');
        emptyEl.style.display = 'none';
        updateMyPlaylistManageButtonUI();
    }

    function playlistDetailCoverMarkup(name, coverDataUrl) {
        var safeName = String(name || '').trim() || '\u672a\u547d\u540d\u6b4c\u5355';
        if (coverDataUrl) {
            return '<img src="' + escapeAttr(coverDataUrl) + '" alt="">';
        }
        return '<em>' + escapeAttr(getPlaylistInitial(safeName)) + '</em>';
    }

    function playlistSongCoverMarkup(song) {
        var cover = String(song && song.cover || '').trim();
        if (cover) {
            return '<span class="music-playlist-detail-song-cover"><img src="' + escapeAttr(cover) + '" alt=""></span>';
        }
        var title = String(song && song.title || '').trim();
        return '<span class="music-playlist-detail-song-cover"><em>' + escapeAttr(getPlaylistInitial(title)) + '</em></span>';
    }

    function playlistSongItemMarkup(song, playlistId, idx) {
        var title = String(song && song.title || '').trim() || '\u672a\u547d\u540d\u6b4c\u66f2';
        var artist = String(song && song.artist || '').trim() || '\u672a\u77e5\u6b4c\u624b';
        var audioSrc = String(song && song.audioSrc || '').trim();
        var sourceType = String(song && song.sourceType || '').trim();
        var songId = String(song && song.id || '');
        var active = !!(currentPlayingTrack && String(currentPlayingTrack.trackId || '') === String(song && song.id || ''));
        var subText = artist;
        if (sourceType === 'file') {
            subText = artist + ' \u00b7 \u672c\u5730\u6587\u4ef6';
        } else if (sourceType === 'url') {
            subText = artist + ' \u00b7 URL \u97f3\u6e90';
        }
        var stateClass = '';
        if (active) stateClass += ' music-playlist-detail-song-item--active';
        if (isPlaylistSongManageMode) stateClass += ' music-playlist-detail-song-item--managing';
        return [
            '<div class="music-playlist-detail-song-item' + stateClass + '" role="button" tabindex="0" data-play-title="' + escapeAttr(title) + '" data-play-artist="' + escapeAttr(artist) + '" data-play-source="my-playlist" data-playlist-id="' + escapeAttr(playlistId) + '" data-track-id="' + escapeAttr(songId) + '" data-audio-src="' + escapeAttr(audioSrc) + '" data-play-cover="' + escapeAttr(String(song && song.cover || '')) + '">',
            '  <span class="music-playlist-detail-song-index">' + String((idx || 0) + 1).padStart(2, '0') + '</span>',
            playlistSongCoverMarkup(song),
            '  <span class="music-playlist-detail-song-main">',
            '    <strong>' + escapeAttr(title) + '</strong>',
            '    <em>' + escapeAttr(subText) + '</em>',
            '  </span>',
            '  <span class="music-playlist-detail-song-actions">',
            isPlaylistSongManageMode
                ? '    <button class="music-playlist-detail-song-manage-btn" type="button" data-my-playlist-action="edit-song" data-track-id="' + escapeAttr(songId) + '">\u7f16\u8f91</button>' + playlistSongDeleteBtnMarkup(songId)
                : '    <span class="music-playlist-detail-song-play">' + playlistSongPlaySvg() + '</span>',
            '  </span>',
            '</div>'
        ].join('');
    }

    function getPlaylistSelectionCount() {
        return Object.keys(selectedPlaylistSongIds).length;
    }

    function clearPlaylistSelection() {
        isPlaylistSelectionMode = false;
        selectedPlaylistSongIds = {};
    }

    function togglePlaylistSelectionMode() {
        isPlaylistSelectionMode = !isPlaylistSelectionMode;
        if (!isPlaylistSelectionMode) {
            selectedPlaylistSongIds = {};
        }
        renderCurrentPlaylistDetail();
    }

    function togglePlaylistSongSelected(songId) {
        var id = String(songId || '').trim();
        if (!id) return;
        if (selectedPlaylistSongIds[id]) {
            delete selectedPlaylistSongIds[id];
        } else {
            selectedPlaylistSongIds[id] = true;
        }
        renderCurrentPlaylistDetail();
    }

    function getSelectedPlaylistSongs(playlist) {
        var songs = Array.isArray(playlist && playlist.songs) ? playlist.songs : [];
        return songs.filter(function(song) {
            return !!selectedPlaylistSongIds[String(song && song.id || '')];
        });
    }

    function copyTextToClipboard(text, onDone) {
        var safeText = String(text || '').trim();
        if (!safeText) {
            if (onDone) onDone(false);
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(safeText).then(function() {
                if (onDone) onDone(true);
            }).catch(function() {
                if (onDone) onDone(false);
            });
            return;
        }
        if (onDone) onDone(false);
    }

    function shareCurrentPlaylist() {
        var playlist = getCurrentPlaylist();
        if (!playlist) {
            alert('\u8bf7\u5148\u8fdb\u5165\u6b4c\u5355');
            return;
        }

        var safeName = String(playlist.name || '').trim() || '\u672a\u547d\u540d\u6b4c\u5355';
        var safeDesc = String(playlist.desc || '').trim();
        var selectedSongs = isPlaylistSelectionMode ? getSelectedPlaylistSongs(playlist) : [];
        var songsToShare = selectedSongs.length ? selectedSongs : (Array.isArray(playlist.songs) ? playlist.songs : []);
        var header = selectedSongs.length ? ('\u5206\u4eab\u6b4c\u5355\u300a' + safeName + '\u300b\u5df2\u9009 ' + selectedSongs.length + ' \u9996\uff1a') : ('\u5206\u4eab\u6b4c\u5355\u300a' + safeName + '\u300b');
        var lines = songsToShare.slice(0, 8).map(function(song, lineIdx) {
            var lineTitle = String(song && song.title || '').trim() || '\u672a\u547d\u540d\u6b4c\u66f2';
            var lineArtist = String(song && song.artist || '').trim() || '\u672a\u77e5\u6b4c\u624b';
            return String(lineIdx + 1) + '. ' + lineTitle + ' - ' + lineArtist;
        });
        var shareText = [header, safeDesc].concat(lines).filter(Boolean).join('\n');

        if (navigator.share) {
            navigator.share({
                title: safeName,
                text: shareText
            }).catch(function() {});
            return;
        }

        copyTextToClipboard(shareText, function(success) {
            if (success) {
                alert('\u5206\u4eab\u6587\u6848\u5df2\u590d\u5236');
                return;
            }
            alert(shareText);
        });
    }

    function syncPlaylistTracksFromCurrentPlaylist() {
        var playlist = getCurrentPlaylist();
        if (!playlist) {
            if (!currentPlayingTrack) {
                playlistTracks = [];
            }
            renderPlaylistPanel();
            return;
        }

        var songs = Array.isArray(playlist.songs) ? playlist.songs : [];
        playlistTracks = songs.map(function(song) {
            return createPlaylistTrack(song && song.title, song && song.artist, 'my-playlist', {
                audioSrc: getPlayableSongSource(song, song && song.audioSrc),
                cover: song && song.cover,
                lrc: song && song.lrc,
                playlistId: playlist.id,
                trackId: song && song.id
            });
        }).filter(function(item) {
            return !!item;
        });

        if (currentPlayingTrack && currentPlayingTrack.title && currentPlayingTrack.audioSrc) {
            ensureTrackInPlaylist(
                currentPlayingTrack.title,
                currentPlayingTrack.artist,
                currentPlayingTrack.source,
                true,
                {
                    audioSrc: currentPlayingTrack.audioSrc,
                    cover: currentPlayingTrack.cover,
                    lrc: currentPlayingTrack.lrc,
                    playlistId: currentPlayingTrack.playlistId,
                    trackId: currentPlayingTrack.trackId
                }
            );
        }
        renderPlaylistPanel();
    }

    function renderCurrentPlaylistDetail() {
        var playlist = getCurrentPlaylist();
        if (!playlist) return;
        var songs = Array.isArray(playlist.songs) ? playlist.songs : [];
        if (!songs.length) {
            clearPlaylistSelection();
            isPlaylistSongManageMode = false;
        }

        var name = String(playlist.name || '').trim() || '\u672a\u547d\u540d\u6b4c\u5355';
        var desc = String(playlist.desc || '').trim() || '\u6682\u65e0\u63cf\u8ff0';
        var cover = String(playlist.cover || '').trim();
        var ownerName = getPlaylistOwnerName();
        var ownerAvatar = getPlaylistOwnerAvatar();

        var coverEl = getPlaylistDetailCoverEl();
        var nameEl = getPlaylistDetailNameEl();
        var ownerAvatarEl = getPlaylistDetailOwnerAvatarEl();
        var ownerNameEl = getPlaylistDetailOwnerNameEl();
        var descEl = getPlaylistDetailDescEl();
        var countEl = getPlaylistDetailCountEl();
        var addLinkEl = getPlaylistDetailAddLinkEl();
        var listEl = getPlaylistDetailListEl();
        var emptyEl = getPlaylistDetailEmptyEl();
        var detailScroll = getPlaylistDetailScrollEl();
        var manageBtn = getPlaylistDetailManageBtn();

        if (coverEl) coverEl.innerHTML = playlistDetailCoverMarkup(name, cover);
        if (nameEl) nameEl.textContent = name;
        if (descEl) descEl.textContent = desc;
        if (ownerNameEl) ownerNameEl.textContent = ownerName;
        if (ownerAvatarEl) {
            ownerAvatarEl.innerHTML = ownerAvatar ? ('<img src="' + escapeAttr(ownerAvatar) + '" alt="">') : ('<em>' + escapeAttr(getPlaylistInitial(ownerName)) + '</em>');
        }
        if (countEl) {
            countEl.textContent = isPlaylistSongManageMode
                ? ('\u7ba1\u7406\u4e2d\u00b7' + String(songs.length) + '\u9996\u6b4c\u66f2')
                : (isPlaylistSelectionMode ? ('\u5df2\u9009 ' + getPlaylistSelectionCount() + ' \u9996') : (String(songs.length) + '\u9996\u6b4c\u66f2'));
        }
        if (addLinkEl) {
            addLinkEl.style.display = songs.length ? 'inline-flex' : 'none';
        }
        if (detailScroll) {
            detailScroll.classList.toggle('music-playlist-detail-scroll--selection', isPlaylistSelectionMode);
            detailScroll.classList.toggle('music-playlist-detail-scroll--manage', isPlaylistSongManageMode);
        }
        if (manageBtn) {
            manageBtn.classList.toggle('music-playlist-detail-float-btn--active', isPlaylistSongManageMode);
        }

        if (listEl) {
            listEl.innerHTML = songs.map(function(song, idx) {
                return playlistSongItemMarkup(song, playlist.id, idx);
            }).join('');
        }
        if (emptyEl) {
            emptyEl.style.display = songs.length ? 'none' : 'flex';
        }
        updatePlaylistSongManageButtonUI();
    }

    function openPlaylistDetail(playlistId) {
        var playlist = findMyPlaylistById(playlistId);
        if (!playlist) return;
        clearPlaylistSelection();
        isPlaylistSongManageMode = false;
        currentPlaylistId = String(playlist.id || '');
        renderCurrentPlaylistDetail();
        syncPlaylistTracksFromCurrentPlaylist();
        switchMusicPage('playlist');
    }

    function closePlaylistDetail() {
        clearPlaylistSelection();
        isPlaylistSongManageMode = false;
        switchMusicPage('me');
    }

    function updateCreatePlaylistCoverPreview(dataUrl) {
        var preview = getCreatePlaylistCoverPreview();
        if (!preview) return;
        if (dataUrl) {
            preview.innerHTML = '<img src="' + escapeAttr(dataUrl) + '" alt="">';
            return;
        }
        preview.textContent = 'M';
    }

    function resetCreatePlaylistForm() {
        pendingPlaylistCoverDataUrl = '';
        var nameInput = getCreatePlaylistNameInput();
        var descInput = getCreatePlaylistDescInput();
        var coverInput = getCreatePlaylistCoverInput();
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        if (coverInput) coverInput.value = '';
        updateCreatePlaylistCoverPreview('');
    }

    function openCreatePlaylistModal() {
        var modal = getCreatePlaylistModal();
        if (!modal) return;
        resetCreatePlaylistForm();
        modal.classList.add('music-create-playlist-modal--open');
        modal.setAttribute('aria-hidden', 'false');
        var nameInput = getCreatePlaylistNameInput();
        if (nameInput) {
            window.setTimeout(function() {
                nameInput.focus();
            }, 0);
        }
    }

    function closeCreatePlaylistModal() {
        var modal = getCreatePlaylistModal();
        if (!modal) return;
        modal.classList.remove('music-create-playlist-modal--open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function handleCreatePlaylistCoverFile(file) {
        if (!file || !/^image\//i.test(file.type || '')) {
            pendingPlaylistCoverDataUrl = '';
            updateCreatePlaylistCoverPreview('');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(event) {
            pendingPlaylistCoverDataUrl = String(event && event.target && event.target.result || '');
            updateCreatePlaylistCoverPreview(pendingPlaylistCoverDataUrl);
        };
        reader.readAsDataURL(file);
    }

    function submitCreatePlaylist() {
        var nameInput = getCreatePlaylistNameInput();
        var descInput = getCreatePlaylistDescInput();
        var name = String(nameInput && nameInput.value || '').trim();
        var desc = String(descInput && descInput.value || '').trim();

        if (!name) {
            if (nameInput) {
                nameInput.focus();
            }
            alert('\u8bf7\u8f93\u5165\u6b4c\u5355\u540d');
            return;
        }

        myPlaylists.unshift({
            id: 'music-my-playlist-' + (++myPlaylistSeq),
            name: name,
            desc: desc,
            cover: pendingPlaylistCoverDataUrl,
            songs: []
        });
        renderMyPlaylists();
        queueMusicLibraryPersist();
        closeCreatePlaylistModal();
    }

    function updateAddSongCoverPreview(dataUrl) {
        var preview = getAddSongCoverPreview();
        if (!preview) return;
        if (dataUrl) {
            preview.innerHTML = '<img src="' + escapeAttr(dataUrl) + '" alt="">';
            return;
        }
        preview.textContent = '\u5c01';
    }

    function updateAddSongLrcPreview(text) {
        var preview = getAddSongLrcPreviewEl();
        if (!preview) return;
        var safeText = String(text || '').trim();
        if (!safeText) {
            preview.textContent = '\u5bfc\u5165\u540e\u4f1a\u5728\u8fd9\u91cc\u663e\u793a\u6b4c\u8bcd\u9884\u89c8\u3002';
            return;
        }
        preview.textContent = safeText.split(/\r?\n/).slice(0, 4).join('   ');
    }

    function resetAddSongForm() {
        pendingSongCoverDataUrl = '';
        pendingSongAudioFile = null;
        pendingSongLrcText = '';

        var nameInput = getAddSongNameInput();
        var artistInput = getAddSongArtistInput();
        var audioUrlInput = getAddSongAudioUrlInput();
        var coverFileInput = getAddSongCoverFileInput();
        var audioFileInput = getAddSongAudioFileInput();
        var lrcFileInput = getAddSongLrcFileInput();
        var audioFileNameEl = getAddSongAudioFileNameEl();
        var lrcFileNameEl = getAddSongLrcFileNameEl();

        if (nameInput) nameInput.value = '';
        if (artistInput) artistInput.value = '';
        if (audioUrlInput) audioUrlInput.value = '';
        if (coverFileInput) coverFileInput.value = '';
        if (audioFileInput) audioFileInput.value = '';
        if (lrcFileInput) lrcFileInput.value = '';
        if (audioFileNameEl) audioFileNameEl.textContent = '\u9009\u62e9\u672c\u5730\u97f3\u9891\u6587\u4ef6';
        if (lrcFileNameEl) lrcFileNameEl.textContent = '\u5bfc\u5165\u672c\u5730 LRC \u6587\u4ef6';

        updateAddSongCoverPreview('');
        updateAddSongLrcPreview('');
    }

    function openAddSongModal() {
        var playlist = getCurrentPlaylist();
        if (!playlist) {
            alert('\u8bf7\u5148\u8fdb\u5165\u6b4c\u5355');
            return;
        }
        var modal = getAddSongModal();
        if (!modal) return;
        resetAddSongForm();
        var playlistNameEl = getAddSongPlaylistNameEl();
        if (playlistNameEl) {
            playlistNameEl.textContent = '\u5bfc\u5165\u5230\u300a' + (String(playlist.name || '').trim() || '\u5f53\u524d\u6b4c\u5355') + '\u300b';
        }
        modal.classList.add('music-add-song-modal--open');
        modal.setAttribute('aria-hidden', 'false');
        var nameInput = getAddSongNameInput();
        if (nameInput) {
            window.setTimeout(function() {
                nameInput.focus();
            }, 0);
        }
    }

    function closeAddSongModal() {
        var modal = getAddSongModal();
        if (!modal) return;
        modal.classList.remove('music-add-song-modal--open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function handleAddSongCoverFile(file) {
        if (!file || !/^image\//i.test(file.type || '')) {
            pendingSongCoverDataUrl = '';
            updateAddSongCoverPreview('');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(event) {
            pendingSongCoverDataUrl = String(event && event.target && event.target.result || '');
            updateAddSongCoverPreview(pendingSongCoverDataUrl);
        };
        reader.readAsDataURL(file);
    }

    function handleAddSongAudioFile(file) {
        pendingSongAudioFile = file || null;
        var audioFileNameEl = getAddSongAudioFileNameEl();
        if (!audioFileNameEl) return;
        if (!pendingSongAudioFile) {
            audioFileNameEl.textContent = '\u9009\u62e9\u672c\u5730\u97f3\u9891\u6587\u4ef6';
            return;
        }
        audioFileNameEl.textContent = String(pendingSongAudioFile.name || '\u5df2\u9009\u62e9\u672c\u5730\u6587\u4ef6');
    }

    function handleAddSongLrcFile(file) {
        pendingSongLrcText = '';
        var lrcFileNameEl = getAddSongLrcFileNameEl();
        if (lrcFileNameEl) {
            lrcFileNameEl.textContent = file ? String(file.name || '\u5df2\u5bfc\u5165\u6b4c\u8bcd') : '\u5bfc\u5165\u672c\u5730 LRC \u6587\u4ef6';
        }
        if (!file) {
            updateAddSongLrcPreview('');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(event) {
            pendingSongLrcText = String(event && event.target && event.target.result || '');
            updateAddSongLrcPreview(pendingSongLrcText);
        };
        reader.onerror = function() {
            pendingSongLrcText = '';
            updateAddSongLrcPreview('');
            alert('\u6b4c\u8bcd\u6587\u4ef6\u8bfb\u53d6\u5931\u8d25');
        };
        reader.readAsText(file);
    }

    function stopCurrentMusicPlayback() {
        currentPlayingTrack = null;
        if (musicAudioEl) {
            musicAudioEl.pause();
            musicAudioEl.removeAttribute('src');
            musicAudioEl.load();
        }
        setMiniTrack('\u5f53\u524d\u6682\u65e0\u6b63\u5728\u64ad\u653e', '', '');
        setMiniPlayingState(false);
    }

    function deleteSongFromCurrentPlaylist(trackId) {
        var playlist = getCurrentPlaylist();
        if (!playlist || !Array.isArray(playlist.songs)) return;
        var id = String(trackId || '').trim();
        if (!id) return;

        var removeIdx = -1;
        for (var i = 0; i < playlist.songs.length; i++) {
            if (String(playlist.songs[i].id || '') === id) {
                removeIdx = i;
                break;
            }
        }
        if (removeIdx < 0) return;
        var deleteName = String(playlist.songs[removeIdx] && playlist.songs[removeIdx].title || '').trim() || '\u672a\u547d\u540d\u6b4c\u66f2';
        if (!window.confirm('\u786e\u5b9a\u5220\u9664\u6b4c\u66f2\u300a' + deleteName + '\u300b\uff1f')) return;

        var removedSong = playlist.songs.splice(removeIdx, 1)[0];
        if (runtimeSongObjectUrls[id]) {
            try {
                URL.revokeObjectURL(runtimeSongObjectUrls[id]);
            } catch (e) {}
            delete runtimeSongObjectUrls[id];
        }
        delete selectedPlaylistSongIds[id];

        var removedWasPlaying = !!(currentPlayingTrack && String(currentPlayingTrack.trackId || '') === id);
        if (removedWasPlaying) {
            currentPlayingTrack = null;
        }

        syncPlaylistTracksFromCurrentPlaylist();

        if (removedWasPlaying) {
            if (playlistTracks.length) {
                if (playlistPlayMode === 'shuffle') {
                    playRandomTrackFromPlaylist();
                } else {
                    var nextTrack = playlistTracks[Math.min(removeIdx, playlistTracks.length - 1)];
                    if (nextTrack) {
                        playTrack(nextTrack.title, nextTrack.artist, nextTrack.source || 'my-playlist', nextTrack);
                    } else {
                        stopCurrentMusicPlayback();
                    }
                }
            } else {
                stopCurrentMusicPlayback();
            }
        }

        renderMyPlaylists();
        renderCurrentPlaylistDetail();
        renderPlaylistPanel();
        queueMusicLibraryPersist();
    }

    function submitAddSongToCurrentPlaylist() {
        var playlist = getCurrentPlaylist();
        if (!playlist) {
            alert('\u8bf7\u5148\u8fdb\u5165\u6b4c\u5355');
            return;
        }

        var nameInput = getAddSongNameInput();
        var artistInput = getAddSongArtistInput();
        var audioUrlInput = getAddSongAudioUrlInput();

        var title = String(nameInput && nameInput.value || '').trim();
        var artist = String(artistInput && artistInput.value || '').trim();
        var audioUrl = String(audioUrlInput && audioUrlInput.value || '').trim();

        if (!title) {
            if (nameInput) nameInput.focus();
            alert('\u8bf7\u8f93\u5165\u6b4c\u66f2\u540d');
            return;
        }

        if (!audioUrl && !pendingSongAudioFile) {
            alert('\u8bf7\u586b\u5199\u97f3\u6e90 URL \u6216\u9009\u62e9\u672c\u5730\u97f3\u9891\u6587\u4ef6');
            return;
        }

        var sourceType = audioUrl ? 'url' : 'file';
        var finalAudioBlob = sourceType === 'file' ? pendingSongAudioFile : null;
        var finalAudioSrc = sourceType === 'url'
            ? audioUrl
            : (finalAudioBlob ? URL.createObjectURL(finalAudioBlob) : '');
        var finalCover = pendingSongCoverDataUrl;
        if (!Array.isArray(playlist.songs)) playlist.songs = [];
        playlist.songs.unshift({
            id: 'music-song-' + (++mySongSeq),
            title: title,
            artist: artist,
            cover: finalCover,
            audioSrc: finalAudioSrc,
            audioBlob: finalAudioBlob,
            sourceType: sourceType,
            lrc: String(pendingSongLrcText || '').trim()
        });

        renderMyPlaylists();
        renderCurrentPlaylistDetail();
        syncPlaylistTracksFromCurrentPlaylist();
        queueMusicLibraryPersist();
        closeAddSongModal();
    }

    function playAllCurrentPlaylist() {
        var playlist = getCurrentPlaylist();
        if (!playlist || !Array.isArray(playlist.songs) || !playlist.songs.length) {
            alert('\u6b4c\u5355\u91cc\u6682\u65e0\u6b4c\u66f2');
            return;
        }
        syncPlaylistTracksFromCurrentPlaylist();
        var firstTrack = playlistTracks[0];
        if (!firstTrack) return;
        playTrack(firstTrack.title, firstTrack.artist, 'my-playlist', firstTrack);
    }

    function setPlaylistPanelOpen(open) {
        isPlaylistPanelOpen = !!open;
        var panel = getPlaylistPanel();
        if (panel) {
            panel.classList.toggle('music-playlist-panel--open', isPlaylistPanelOpen);
            panel.setAttribute('aria-hidden', isPlaylistPanelOpen ? 'false' : 'true');
        }
        var btn = getMiniPlaylistBtn();
        if (btn) {
            btn.classList.toggle('music-mini-btn--active', isPlaylistPanelOpen);
            btn.setAttribute('aria-label', isPlaylistPanelOpen ? '\u6536\u8d77\u64ad\u653e\u5217\u8868' : '\u6253\u5f00\u64ad\u653e\u5217\u8868');
        }
        if (isPlaylistPanelOpen) {
            renderPlaylistPanel();
        }
        syncPlaylistModeButton();
    }

    function togglePlaylistPanel() {
        setPlaylistPanelOpen(!isPlaylistPanelOpen);
    }

    function getReplayToggleBtn() {
        return document.getElementById('music-replay-toggle-btn');
    }

    function isReplayTrackPlaying() {
        return !!(currentPlayingTrack && currentPlayingTrack.audioSrc && isMiniPlaying);
    }

    function updateReplayToggleUI() {
        var btn = getReplayToggleBtn();
        if (!btn) return;
        var active = isReplayTrackPlaying();
        btn.setAttribute('aria-label', active ? 'replay-pause' : 'replay-play');
        btn.innerHTML = active ? replayPauseSvg() : replayPlaySvg();
    }

    function setMiniPlayingState(playing, fromAudioEvent) {
        isMiniPlaying = !!playing;
        var btn = getMiniToggleBtn();
        if (btn) {
            btn.setAttribute('aria-label', isMiniPlaying ? 'pause' : 'play');
            btn.innerHTML = isMiniPlaying ? miniPauseSvg() : miniPlaySvg();
        }

        if (musicAudioEl && !fromAudioEvent) {
            if (isMiniPlaying) {
                var playPromise = musicAudioEl.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(function() {
                        setMiniPlayingState(false, true);
                    });
                }
            } else {
                musicAudioEl.pause();
            }
        }

        updateReplayToggleUI();
        syncPlayerDetailPlaybackUI();
        syncPlayerDetailProgress();
    }

    function updateMiniLikeUI() {
        var btn = getMiniLikeBtn();
        if (!btn) return;

        var liked = false;
        if (currentPlayingTrack && currentPlayingTrack.title) {
            liked = getTrackLiked(currentPlayingTrack.title, currentPlayingTrack.artist, false);
        }

        btn.classList.toggle('music-mini-btn--like-active', liked);
        btn.setAttribute('aria-label', liked ? '鍙栨秷鏀惰棌' : '鏀惰棌');
        btn.innerHTML = miniHeartSvg(liked);
        updatePlayerDetailLikeUI();
    }

    function setMiniCover(coverDataUrl) {
        var coverEl = document.querySelector('.music-mini-cover');
        if (!coverEl) return;
        var src = String(coverDataUrl || '').trim();
        if (src) {
            coverEl.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
            coverEl.classList.add('music-mini-cover--image');
            return;
        }
        coverEl.style.backgroundImage = '';
        coverEl.classList.remove('music-mini-cover--image');
    }

    function setMiniTrack(title, artist, coverDataUrl) {
        var safeTitle = String(title || '').trim();
        var safeArtist = String(artist || '').trim();
        var nameEl = document.querySelector('.music-mini-song-name');
        var artistEl = document.querySelector('.music-mini-song-artist');
        if (nameEl) {
            nameEl.textContent = safeTitle || '\u5f53\u524d\u6682\u65e0\u6b63\u5728\u64ad\u653e';
        }
        if (artistEl) {
            artistEl.textContent = safeTitle ? (safeArtist || '\u672a\u77e5\u6b4c\u624b') : '';
        }
        setMiniCover(coverDataUrl || '');
        updateMiniLikeUI();
        syncPlayerDetailTrackUI();
    }

    function playTrack(title, artist, source, extra) {
        var info = extra && typeof extra === 'object' ? extra : {};
        var safeTitle = String(title || '').trim();
        if (!safeTitle) return;
        var safeArtist = String(artist || '').trim();
        var existingIdx = findPlaylistTrackIndex(safeTitle, safeArtist);
        var existingTrack = existingIdx >= 0 ? playlistTracks[existingIdx] : null;
        var audioSrc = String(info.audioSrc || (existingTrack && existingTrack.audioSrc) || '').trim();
        if (!audioSrc) {
            alert('\u8bf7\u5148\u5728\u6b4c\u5355\u91cc\u6dfb\u52a0\u771f\u5b9e\u53ef\u64ad\u653e\u7684\u6b4c\u66f2\u97f3\u6e90');
            return;
        }

        currentPlayingTrack = {
            title: safeTitle,
            artist: safeArtist,
            source: String(source || ''),
            audioSrc: audioSrc,
            cover: String(info.cover || (existingTrack && existingTrack.cover) || '').trim(),
            lrc: String(info.lrc || (existingTrack && existingTrack.lrc) || '').trim(),
            playlistId: String(info.playlistId || (existingTrack && existingTrack.playlistId) || '').trim(),
            trackId: String(info.trackId || (existingTrack && existingTrack.trackId) || '').trim()
        };

        ensureTrackInPlaylist(
            currentPlayingTrack.title,
            currentPlayingTrack.artist,
            currentPlayingTrack.source,
            true,
            {
                audioSrc: currentPlayingTrack.audioSrc,
                cover: currentPlayingTrack.cover,
                lrc: currentPlayingTrack.lrc,
                playlistId: currentPlayingTrack.playlistId,
                trackId: currentPlayingTrack.trackId
            }
        );

        if (musicAudioEl) {
            musicAudioEl.src = currentPlayingTrack.audioSrc;
            try {
                musicAudioEl.currentTime = 0;
            } catch (e) {}
        }
        setMiniTrack(currentPlayingTrack.title, currentPlayingTrack.artist, currentPlayingTrack.cover);
        setMiniPlayingState(true);
        renderPlaylistPanel();
        renderCurrentPlaylistDetail();
        syncPlayerDetailTrackUI();
        syncPlayerDetailProgress();
    }

    function toggleMiniPlayback() {
        if (!currentPlayingTrack || !currentPlayingTrack.audioSrc) {
            var firstTrack = playlistTracks[0];
            if (firstTrack && firstTrack.audioSrc) {
                playTrack(firstTrack.title, firstTrack.artist, firstTrack.source || 'my-playlist', firstTrack);
                return;
            }
            alert('\u8bf7\u5148\u5728\u6b4c\u5355\u91cc\u6dfb\u52a0\u53ef\u64ad\u653e\u6b4c\u66f2');
            return;
        }
        setMiniPlayingState(!isMiniPlaying);
    }

    function toggleMiniTrackLike() {
        if (!currentPlayingTrack || !currentPlayingTrack.title) return;

        var likedNow = getTrackLiked(currentPlayingTrack.title, currentPlayingTrack.artist, false);
        setTrackLikeState(currentPlayingTrack.title, currentPlayingTrack.artist, !likedNow);
    }

    function playAdjacentTrack(step) {
        var safeStep = step < 0 ? -1 : 1;
        if (!playlistTracks.length) return;

        if (safeStep < 0 && musicAudioEl && Number(musicAudioEl.currentTime || 0) > 3) {
            try {
                musicAudioEl.currentTime = 0;
            } catch (e) {}
            syncPlayerDetailProgress();
            return;
        }

        if (playlistPlayMode === 'shuffle' && safeStep > 0) {
            playRandomTrackFromPlaylist();
            return;
        }

        var currentIdx = currentPlayingTrack ? findPlaylistTrackIndex(currentPlayingTrack.title, currentPlayingTrack.artist) : -1;
        if (currentIdx < 0) currentIdx = 0;
        var nextIdx = (currentIdx + safeStep + playlistTracks.length) % playlistTracks.length;
        var nextTrack = playlistTracks[nextIdx];
        if (!nextTrack) return;
        playTrack(nextTrack.title, nextTrack.artist, nextTrack.source || 'playlist', nextTrack);
    }

    function featureCoverMarkup(coverType) {
        if (coverType === 'dear') {
            return '<div class="music-feature-cover music-feature-cover--dear"><div class="music-cover-tree"><span>Dear D</span></div></div>';
        }
        return '<div class="music-feature-cover music-feature-cover--group"><div class="music-cover-people"><span></span><span></span><span></span><span></span><span></span></div></div>';
    }

    function featureItemMarkup(item) {
        var parsed = parseSongLine(item.song);
        var playTitle = String(item.playTitle || parsed.title || '').trim();
        var playArtist = String(item.playArtist || parsed.artist || '').trim();

        return [
            '<div class="music-feature-card music-feature-card--' + item.variant + '" role="button" tabindex="0" data-play-title="' + escapeAttr(playTitle) + '" data-play-artist="' + escapeAttr(playArtist) + '" data-play-source="feature">',
            '  <div class="music-feature-title">' + item.title + '</div>',
            featureCoverMarkup(item.cover),
            '  <div class="music-feature-meta">',
            '    <div class="music-feature-tag">' + item.tag + '</div>',
            '    <div class="music-feature-song">' + item.song + '</div>',
            '  </div>',
            '  <div class="music-feature-play' + (item.squarePlay ? ' music-feature-play--square' : '') + '">',
            '    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function replayItemMarkup(item, showBadge) {
        var playTitle = String(item.title || '').trim();
        var playArtist = String(item.subtitle || '').trim();
        var liked = getTrackLiked(playTitle, playArtist, !!item.liked);
        return [
            '<div class="music-list-item" role="button" tabindex="0" data-play-title="' + escapeAttr(playTitle) + '" data-play-artist="' + escapeAttr(playArtist) + '" data-play-source="replay">',
            '  <div class="music-art ' + item.artClass + '"></div>',
            '  <div class="music-item-main">',
            '    <div class="music-item-title">',
            '      <span>' + item.title + '</span>',
            showBadge ? '      <span class="music-item-badge">' + item.badge + '</span>' : '',
            '    </div>',
            '    <div class="music-item-subtitle">' + item.subtitle + '</div>',
            '  </div>',
            '  <div class="music-item-right">',
            '    ' + likeCountMarkup(item.count),
            '    <div class="music-like-btn' + (liked ? ' music-like-btn--filled' : '') + '" role="button" tabindex="0" aria-pressed="' + (liked ? 'true' : 'false') + '">' + heartSvg(liked) + '</div>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function specialItemMarkup(item) {
        var playTitle = String(item.title || '').trim();
        var playArtist = String(item.subtitle || '').trim();
        var liked = getTrackLiked(playTitle, playArtist, !!item.liked);
        return [
            '<div class="music-list-item" role="button" tabindex="0" data-play-title="' + escapeAttr(playTitle) + '" data-play-artist="' + escapeAttr(playArtist) + '" data-play-source="special">',
            '  <div class="music-art ' + item.artClass + '"></div>',
            '  <div class="music-item-main">',
            '    <div class="music-item-title music-item-title--small">',
            '      <span>' + item.title + '</span>',
            '      <span class="music-item-duration">' + durationSvg() + item.duration + '</span>',
            '    </div>',
            '    <div class="music-item-desc">' + item.subtitle + '</div>',
            '  </div>',
            '  <div class="music-item-right">',
            '    ' + likeCountMarkup(item.count),
            '    <div class="music-like-btn' + (liked ? ' music-like-btn--filled' : '') + '" role="button" tabindex="0" aria-pressed="' + (liked ? 'true' : 'false') + '">' + heartSvg(liked) + '</div>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function seedTrackLikesFromData(data) {
        function seedItems(items) {
            (items || []).forEach(function(item) {
                var title = String(item && item.title || '').trim();
                if (!title) return;
                var artist = String(item && item.subtitle || '').trim();
                var key = trackKey(title, artist);
                if (!key) return;
                if (Object.prototype.hasOwnProperty.call(trackLikeState, key)) return;
                trackLikeState[key] = !!(item && item.liked);
            });
        }

        seedItems(data && data.replayItems);
        seedItems(data && data.specialItems);
    }

    function createPlaylistTrack(title, artist, source, extra) {
        var info = extra && typeof extra === 'object' ? extra : {};
        var safeTitle = String(title || '').trim();
        if (!safeTitle) return null;
        var safeAudioSrc = String(info.audioSrc || '').trim();
        return {
            id: String(info.trackId || '') || ('music-track-' + (++playlistTrackSeq)),
            title: safeTitle,
            artist: String(artist || '').trim(),
            source: String(source || ''),
            audioSrc: safeAudioSrc,
            cover: String(info.cover || '').trim(),
            lrc: String(info.lrc || '').trim(),
            playlistId: String(info.playlistId || '').trim(),
            trackId: String(info.trackId || '').trim()
        };
    }

    function findPlaylistTrackIndex(title, artist) {
        var key = trackKey(title, artist);
        if (!key) return -1;
        for (var i = 0; i < playlistTracks.length; i++) {
            var item = playlistTracks[i];
            if (trackKey(item.title, item.artist) === key) return i;
        }
        return -1;
    }

    function ensureTrackInPlaylist(title, artist, source, insertAtFront, extra) {
        var info = extra && typeof extra === 'object' ? extra : {};
        var existingIdx = findPlaylistTrackIndex(title, artist);
        if (existingIdx !== -1) {
            var existing = playlistTracks[existingIdx];
            if (!existing.audioSrc && info.audioSrc) existing.audioSrc = String(info.audioSrc || '').trim();
            if (!existing.cover && info.cover) existing.cover = String(info.cover || '').trim();
            if (!existing.lrc && info.lrc) existing.lrc = String(info.lrc || '').trim();
            if (!existing.playlistId && info.playlistId) existing.playlistId = String(info.playlistId || '').trim();
            if (!existing.trackId && info.trackId) existing.trackId = String(info.trackId || '').trim();
            return existing;
        }
        var created = createPlaylistTrack(title, artist, source, info);
        if (!created) return null;
        if (insertAtFront) {
            playlistTracks.unshift(created);
        } else {
            playlistTracks.push(created);
        }
        return created;
    }

    function rebuildPlaylistFromData() {
        if (currentPlayingTrack && currentPlayingTrack.title && currentPlayingTrack.audioSrc) {
            ensureTrackInPlaylist(
                currentPlayingTrack.title,
                currentPlayingTrack.artist,
                currentPlayingTrack.source,
                true,
                {
                    audioSrc: currentPlayingTrack.audioSrc,
                    cover: currentPlayingTrack.cover,
                    lrc: currentPlayingTrack.lrc,
                    playlistId: currentPlayingTrack.playlistId,
                    trackId: currentPlayingTrack.trackId
                }
            );
        }
        renderPlaylistPanel();
    }

    function getPlaylistTrackById(trackId) {
        var id = String(trackId || '');
        if (!id) return null;
        for (var i = 0; i < playlistTracks.length; i++) {
            if (playlistTracks[i].id === id) return playlistTracks[i];
        }
        return null;
    }

    function playlistItemMarkup(track, idx) {
        var liked = getTrackLiked(track.title, track.artist, false);
        var isActive = !!(currentPlayingTrack && trackKey(currentPlayingTrack.title, currentPlayingTrack.artist) === trackKey(track.title, track.artist));
        var safeArtist = String(track.artist || '').trim() || '\u672a\u77e5\u6b4c\u624b';
        var indexText = isActive ? '\u64ad\u653e\u4e2d' : String(idx + 1).padStart(2, '0');

        return [
            '<div class="music-playlist-item' + (isActive ? ' music-playlist-item--active' : '') + '" role="button" tabindex="0" data-track-id="' + escapeAttr(track.id) + '" data-play-title="' + escapeAttr(track.title) + '" data-play-artist="' + escapeAttr(track.artist) + '" data-play-source="playlist" data-audio-src="' + escapeAttr(track.audioSrc || '') + '" data-play-cover="' + escapeAttr(track.cover || '') + '" data-playlist-id="' + escapeAttr(track.playlistId || '') + '">',
            '  <div class="music-playlist-index">' + indexText + '</div>',
            '  <div class="music-playlist-main">',
            '    <div class="music-playlist-name">' + escapeAttr(track.title) + '</div>',
            '    <div class="music-playlist-artist">' + escapeAttr(safeArtist) + '</div>',
            '  </div>',
            '  <div class="music-playlist-actions">',
            '    <button class="music-playlist-action-btn music-playlist-like-btn' + (liked ? ' music-playlist-like-btn--filled' : '') + '" type="button" data-playlist-action="like" data-track-id="' + escapeAttr(track.id) + '" aria-label="' + (liked ? '鍙栨秷鏀惰棌' : '鏀惰棌') + '">' + miniHeartSvg(liked) + '</button>',
            '    <button class="music-playlist-action-btn music-playlist-delete-btn" type="button" data-playlist-action="delete" data-track-id="' + escapeAttr(track.id) + '" aria-label="鍒犻櫎">' + playlistDeleteSvg() + '</button>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function renderPlaylistPanel() {
        var listEl = document.getElementById('music-playlist-list');
        var currentEl = document.getElementById('music-playlist-current');

        if (currentEl) {
            if (currentPlayingTrack && currentPlayingTrack.title) {
                var currentTitle = String(currentPlayingTrack.title || '').trim();
                var currentArtist = String(currentPlayingTrack.artist || '').trim();
                currentEl.textContent = currentArtist ? ('\u64ad\u653e\u4e2d\uff1a' + currentTitle + ' - ' + currentArtist) : ('\u64ad\u653e\u4e2d\uff1a' + currentTitle);
            } else {
                currentEl.textContent = '\u5f53\u524d\u6682\u65e0\u6b63\u5728\u64ad\u653e';
            }
        }

        syncPlaylistModeButton();

        if (!listEl) return;
        if (!playlistTracks.length) {
            listEl.innerHTML = '<div class="music-playlist-empty">\u64ad\u653e\u5217\u8868\u6682\u65e0\u6b4c\u66f2</div>';
            return;
        }
        listEl.innerHTML = playlistTracks.map(playlistItemMarkup).join('');
    }

    function removePlaylistTrack(trackId) {
        var id = String(trackId || '');
        if (!id) return;
        var removeIdx = -1;
        for (var i = 0; i < playlistTracks.length; i++) {
            if (playlistTracks[i].id === id) {
                removeIdx = i;
                break;
            }
        }
        if (removeIdx < 0) return;

        var removedTrack = playlistTracks.splice(removeIdx, 1)[0];
        var removedIsPlaying = !!(currentPlayingTrack && trackKey(currentPlayingTrack.title, currentPlayingTrack.artist) === trackKey(removedTrack.title, removedTrack.artist));

        if (removedIsPlaying) {
            if (playlistTracks.length) {
                if (playlistPlayMode === 'shuffle') {
                    playRandomTrackFromPlaylist();
                    return;
                }
                var nextIdx = Math.min(removeIdx, playlistTracks.length - 1);
                var nextTrack = playlistTracks[nextIdx];
                playTrack(nextTrack.title, nextTrack.artist, 'playlist', nextTrack);
                return;
            }
            currentPlayingTrack = null;
            if (musicAudioEl) {
                musicAudioEl.pause();
                musicAudioEl.removeAttribute('src');
                musicAudioEl.load();
            }
            setMiniTrack('\u5f53\u524d\u6682\u65e0\u6b63\u5728\u64ad\u653e', '', '');
            setMiniPlayingState(false);
            closePlayerDetail();
        }

        renderPlaylistPanel();
        renderCurrentPlaylistDetail();
        syncPlayerDetailTrackUI();
    }

    function playRandomTrackFromPlaylist() {
        if (!playlistTracks.length) return;
        var candidates = playlistTracks.slice();
        if (currentPlayingTrack && candidates.length > 1) {
            var currentKey = trackKey(currentPlayingTrack.title, currentPlayingTrack.artist);
            candidates = candidates.filter(function(item) {
                return trackKey(item.title, item.artist) !== currentKey;
            });
            if (!candidates.length) {
                candidates = playlistTracks.slice();
            }
        }

        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (!pick) return;
        playTrack(pick.title, pick.artist, 'playlist', pick);
    }

    function togglePlaylistTrackLike(trackId) {
        var track = getPlaylistTrackById(trackId);
        if (!track) return;
        var likedNow = getTrackLiked(track.title, track.artist, false);
        setTrackLikeState(track.title, track.artist, !likedNow);
    }

    function renderMusicTab() {
        var baseData = tabContentMap[currentTab] || tabContentMap.recommend;
        var data = withDailyContent(currentTab, baseData);
        var featureEl = document.getElementById('music-feature-row');
        var replayEl = document.getElementById('music-replay-list');
        var specialEl = document.getElementById('music-special-list');
        var replayTitleEl = document.getElementById('music-replay-title');
        var specialTitleEl = document.getElementById('music-special-title');

        seedTrackLikesFromData(data);

        if (featureEl) featureEl.innerHTML = data.features.map(featureItemMarkup).join('');
        if (replayEl) replayEl.innerHTML = data.replayItems.map(function(item) { return replayItemMarkup(item, true); }).join('');
        if (specialEl) specialEl.innerHTML = data.specialItems.map(specialItemMarkup).join('');
        if (replayTitleEl) replayTitleEl.textContent = data.replayTitle;
        if (specialTitleEl) specialTitleEl.textContent = data.specialTitle;
        rebuildPlaylistFromData(data);
        lastDailyRefreshKey = getDailyKey();
        updateMiniLikeUI();
        updateReplayToggleUI();
    }

    function syncMusicBottomNav() {
        var navItems = document.querySelectorAll('.music-bottom-item[data-page]');
        navItems.forEach(function(item) {
            var page = item.getAttribute('data-page');
            if (page === currentBottomPage) {
                item.classList.add('music-bottom-item--active');
            } else {
                item.classList.remove('music-bottom-item--active');
            }
        });
    }

    function switchMusicPage(pageKey) {
        var homeScroll = document.querySelector('.music-home-scroll');
        var myScroll = document.getElementById('music-my-scroll');
        var detailScroll = getPlaylistDetailScrollEl();
        var showPlaylistDetail = pageKey === 'playlist' && !!getCurrentPlaylist();
        var showHome = pageKey === 'home';
        var showMe = !showHome && !showPlaylistDetail;

        currentBottomPage = showHome ? 'home' : 'me';

        if (homeScroll) homeScroll.style.display = showHome ? 'block' : 'none';
        if (myScroll) myScroll.style.display = showMe ? 'block' : 'none';
        if (detailScroll) detailScroll.style.display = showPlaylistDetail ? 'block' : 'none';

        syncMusicBottomNav();
    }

    function setLikeButtonState(likeBtn, liked) {
        likeBtn.classList.toggle('music-like-btn--filled', liked);
        likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
        likeBtn.innerHTML = heartSvg(liked);
    }

    function updateLikeCountInRightCol(rightCol, delta) {
        if (!rightCol) return;
        var countEl = rightCol.querySelector('.music-like-count');
        if (!countEl) return;

        var currentCount = parseInt(countEl.getAttribute('data-count-value') || '0', 10);
        if (isNaN(currentCount)) currentCount = 0;

        currentCount += delta;
        if (currentCount < 0) currentCount = 0;

        var hasPlus = countEl.getAttribute('data-count-plus') === '1';
        var useK = countEl.getAttribute('data-count-k') === '1';

        countEl.setAttribute('data-count-value', String(currentCount));
        countEl.textContent = formatLikeCount(currentCount, hasPlus, useK);
    }

    function setTrackLikeState(title, artist, liked) {
        var key = trackKey(title, artist);
        if (!key) return;

        rememberTrackLiked(title, artist, liked);

        var rows = document.querySelectorAll('.music-list-item[data-play-title]');
        rows.forEach(function(row) {
            var rowKey = trackKey(row.getAttribute('data-play-title') || '', row.getAttribute('data-play-artist') || '');
            if (rowKey !== key) return;

            var likeBtn = row.querySelector('.music-like-btn');
            if (!likeBtn) return;

            var prevLiked = likeBtn.classList.contains('music-like-btn--filled');
            if (prevLiked === !!liked) return;

            setLikeButtonState(likeBtn, !!liked);
            updateLikeCountInRightCol(likeBtn.closest('.music-item-right'), liked ? 1 : -1);
        });

        updateMiniLikeUI();
        updatePlayerDetailLikeUI();
        renderPlaylistPanel();
        queueMusicLibraryPersist();
    }

    function toggleLikeButton(likeBtn) {
        if (!likeBtn) return;

        var trackNode = likeBtn.closest('[data-play-title]');
        if (!trackNode) {
            var likedNow = likeBtn.classList.contains('music-like-btn--filled');
            setLikeButtonState(likeBtn, !likedNow);
            updateLikeCountInRightCol(likeBtn.closest('.music-item-right'), likedNow ? -1 : 1);
            return;
        }

        var title = String(trackNode.getAttribute('data-play-title') || '').trim();
        var artist = String(trackNode.getAttribute('data-play-artist') || '').trim();
        var likedNowForTrack = getTrackLiked(title, artist, likeBtn.classList.contains('music-like-btn--filled'));
        setTrackLikeState(title, artist, !likedNowForTrack);
    }

    function playTrackFromNode(node) {
        if (!node) return;
        var title = node.getAttribute('data-play-title') || '';
        var artist = node.getAttribute('data-play-artist') || '';
        var source = node.getAttribute('data-play-source') || '';
        var trackId = String(node.getAttribute('data-track-id') || '').trim();
        var playlistId = String(node.getAttribute('data-playlist-id') || '').trim();
        var audioSrc = String(node.getAttribute('data-audio-src') || '').trim();
        var cover = String(node.getAttribute('data-play-cover') || '').trim();
        var song = getSongFromPlaylist(playlistId, trackId);
        playTrack(title, artist, source, {
            audioSrc: getPlayableSongSource(song, audioSrc || (song && song.audioSrc) || ''),
            cover: cover || (song && song.cover) || '',
            lrc: String(song && song.lrc || '').trim(),
            playlistId: playlistId,
            trackId: trackId || (song && song.id) || ''
        });
    }

    function toggleReplayQuickPlay() {
        if (currentPlayingTrack && currentPlayingTrack.audioSrc) {
            setMiniPlayingState(!isMiniPlaying);
            return;
        }
        var firstTrack = playlistTracks[0];
        if (!firstTrack || !firstTrack.audioSrc) {
            alert('\u8bf7\u5148\u5728\u6b4c\u5355\u91cc\u6dfb\u52a0\u53ef\u64ad\u653e\u6b4c\u66f2');
            return;
        }
        playTrack(firstTrack.title, firstTrack.artist, firstTrack.source || 'my-playlist', firstTrack);
    }

    function bindPlayerDetailEvents() {
        var detailEl = getPlayerDetailEl();
        if (!detailEl || detailEl.getAttribute('data-detail-bound') === '1') return;
        detailEl.setAttribute('data-detail-bound', '1');

        var pagesEl = getPlayerDetailPagesEl();
        if (pagesEl) {
            pagesEl.addEventListener('touchstart', function(event) {
                var touch = event.touches && event.touches[0];
                if (!touch) return;
                playerDetailTouchState = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }, { passive: true });

            pagesEl.addEventListener('touchend', function(event) {
                if (!playerDetailTouchState) return;
                var touch = event.changedTouches && event.changedTouches[0];
                if (!touch) {
                    playerDetailTouchState = null;
                    return;
                }
                var deltaX = touch.clientX - playerDetailTouchState.x;
                var deltaY = touch.clientY - playerDetailTouchState.y;
                playerDetailTouchState = null;
                if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY)) return;
                if (deltaX < 0) {
                    setPlayerDetailView('lyrics');
                } else {
                    setPlayerDetailView('record');
                }
            }, { passive: true });

            pagesEl.addEventListener('contextmenu', function(event) {
                if (window.matchMedia && !window.matchMedia('(any-pointer: fine)').matches) return;
                event.preventDefault();
                event.stopPropagation();
                setPlayerDetailView(playerDetailView === 'lyrics' ? 'record' : 'lyrics');
            });
        }

        var progressEl = getPlayerDetailProgressEl();
        if (progressEl) {
            syncPlayerDetailProgressVisual(progressEl, Number(progressEl.value || 0) / 1000);
            progressEl.addEventListener('input', function() {
                if (!musicAudioEl) return;
                var duration = Number(musicAudioEl.duration || 0);
                var ratio = Math.max(0, Math.min(1, Number(progressEl.value || 0) / 1000));
                syncPlayerDetailProgressVisual(progressEl, ratio);
                if (!(duration > 0)) return;
                try {
                    musicAudioEl.currentTime = duration * ratio;
                } catch (e) {}
                syncPlayerDetailProgress();
            });
        }

        var lyricsListEl = document.getElementById('music-player-lyrics-list');
        if (lyricsListEl) {
            lyricsListEl.addEventListener('click', function(event) {
                var lineEl = event.target.closest('.music-player-lyrics-line');
                if (!lineEl || !lyricsListEl.contains(lineEl)) return;
                seekPlayerDetailToLyricLine(lineEl);
            });

            lyricsListEl.addEventListener('keydown', function(event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                var lineEl = event.target.closest('.music-player-lyrics-line');
                if (!lineEl || !lyricsListEl.contains(lineEl)) return;
                event.preventDefault();
                seekPlayerDetailToLyricLine(lineEl);
            });
        }
    }

    function bindLikeEvents() {
        var musicApp = document.getElementById('music-app');
        if (!musicApp || musicApp.getAttribute('data-like-bound') === '1') return;

        musicApp.setAttribute('data-like-bound', '1');

        musicApp.addEventListener('click', function(event) {
            if (event.target === getPlaylistPanel()) {
                setPlaylistPanelOpen(false);
                return;
            }
            if (event.target === getCreatePlaylistModal()) {
                closeCreatePlaylistModal();
                return;
            }
            if (event.target === getAddSongModal()) {
                closeAddSongModal();
                return;
            }

            var playerDetailActionBtn = event.target.closest('[data-player-detail-action]');
            if (playerDetailActionBtn && musicApp.contains(playerDetailActionBtn)) {
                var playerDetailAction = playerDetailActionBtn.getAttribute('data-player-detail-action');
                if (playerDetailAction === 'close') {
                    closePlayerDetail();
                    return;
                }
                if (playerDetailAction === 'toggle') {
                    toggleMiniPlayback();
                    return;
                }
                if (playerDetailAction === 'like') {
                    toggleMiniTrackLike();
                    return;
                }
                if (playerDetailAction === 'playlist') {
                    togglePlaylistPanel();
                    return;
                }
                if (playerDetailAction === 'prev') {
                    playAdjacentTrack(-1);
                    return;
                }
                if (playerDetailAction === 'next') {
                    playAdjacentTrack(1);
                    return;
                }
                if (playerDetailAction === 'mode') {
                    cyclePlaylistPlayMode();
                    return;
                }
                if (playerDetailAction === 'share') {
                    return;
                }
            }

            var myPlaylistActionBtn = event.target.closest('[data-my-playlist-action]');
            if (myPlaylistActionBtn && musicApp.contains(myPlaylistActionBtn)) {
                var myPlaylistAction = myPlaylistActionBtn.getAttribute('data-my-playlist-action');
                if (myPlaylistAction === 'create') {
                    openCreatePlaylistModal();
                    return;
                }
                if (myPlaylistAction === 'close-create' || myPlaylistAction === 'cancel-create') {
                    closeCreatePlaylistModal();
                    return;
                }
                if (myPlaylistAction === 'submit-create') {
                    submitCreatePlaylist();
                    return;
                }
                if (myPlaylistAction === 'back-playlist') {
                    closePlaylistDetail();
                    return;
                }
                if (myPlaylistAction === 'manage') {
                    toggleMyPlaylistManageMode();
                    return;
                }
                if (myPlaylistAction === 'manage-songs') {
                    togglePlaylistSongManageMode();
                    return;
                }
                if (myPlaylistAction === 'toggle-select') {
                    togglePlaylistSelectionMode();
                    return;
                }
                if (myPlaylistAction === 'share-playlist') {
                    shareCurrentPlaylist();
                    return;
                }
                if (myPlaylistAction === 'edit-playlist') {
                    editPlaylistById(myPlaylistActionBtn.getAttribute('data-playlist-id') || '');
                    return;
                }
                if (myPlaylistAction === 'delete-playlist') {
                    deletePlaylistById(myPlaylistActionBtn.getAttribute('data-playlist-id') || '');
                    return;
                }
                if (myPlaylistAction === 'edit-song') {
                    editSongInCurrentPlaylist(myPlaylistActionBtn.getAttribute('data-track-id') || '');
                    return;
                }
                if (myPlaylistAction === 'delete-song') {
                    deleteSongFromCurrentPlaylist(myPlaylistActionBtn.getAttribute('data-track-id') || '');
                    return;
                }
                if (myPlaylistAction === 'add-song') {
                    openAddSongModal();
                    return;
                }
                if (myPlaylistAction === 'close-add-song' || myPlaylistAction === 'cancel-add-song') {
                    closeAddSongModal();
                    return;
                }
                if (myPlaylistAction === 'submit-add-song') {
                    submitAddSongToCurrentPlaylist();
                    return;
                }
                if (myPlaylistAction === 'play-all') {
                    playAllCurrentPlaylist();
                    return;
                }
                if (myPlaylistAction === 'import') {
                    return;
                }
            }

            var myPlaylistCard = event.target.closest('[data-my-playlist-id]');
            if (myPlaylistCard && musicApp.contains(myPlaylistCard)) {
                if (isMyPlaylistManageMode) return;
                openPlaylistDetail(myPlaylistCard.getAttribute('data-my-playlist-id') || '');
                return;
            }

            var playlistActionBtn = event.target.closest('[data-playlist-action]');
            if (playlistActionBtn && musicApp.contains(playlistActionBtn)) {
                var playlistAction = playlistActionBtn.getAttribute('data-playlist-action');
                if (playlistAction === 'close') {
                    setPlaylistPanelOpen(false);
                    return;
                }
                if (playlistAction === 'mode') {
                    cyclePlaylistPlayMode();
                    return;
                }
                var playlistTrackId = playlistActionBtn.getAttribute('data-track-id') || '';
                if (playlistAction === 'like') {
                    togglePlaylistTrackLike(playlistTrackId);
                    return;
                }
                if (playlistAction === 'delete') {
                    removePlaylistTrack(playlistTrackId);
                    return;
                }
            }

            var likeBtn = event.target.closest('.music-like-btn');
            if (likeBtn && musicApp.contains(likeBtn)) {
                toggleLikeButton(likeBtn);
                return;
            }

            var miniOpenNode = event.target.closest('[data-mini-open="detail"]');
            if (miniOpenNode && musicApp.contains(miniOpenNode)) {
                openPlayerDetail('record');
                return;
            }

            var miniBtn = event.target.closest('.music-mini-btn');
            if (miniBtn && musicApp.contains(miniBtn)) {
                var miniAction = miniBtn.getAttribute('data-mini-action');
                if (miniAction === 'toggle') {
                    toggleMiniPlayback();
                } else if (miniAction === 'like') {
                    toggleMiniTrackLike();
                } else if (miniAction === 'playlist') {
                    togglePlaylistPanel();
                }
                return;
            }

            var replayToggleBtn = event.target.closest('#music-replay-toggle-btn');
            if (replayToggleBtn && musicApp.contains(replayToggleBtn)) {
                toggleReplayQuickPlay();
                return;
            }

            var playNode = event.target.closest('[data-play-title]');
            if (!playNode || !musicApp.contains(playNode)) return;
            if (isPlaylistSongManageMode && playNode.getAttribute('data-play-source') === 'my-playlist') {
                return;
            }
            if (isPlaylistSelectionMode && playNode.getAttribute('data-play-source') === 'my-playlist') {
                togglePlaylistSongSelected(playNode.getAttribute('data-track-id') || '');
                return;
            }
            playTrackFromNode(playNode);
        });

        musicApp.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isPlayerDetailOpen) {
                closePlayerDetail();
                return;
            }
            if (event.key === 'Escape' && isPlaylistPanelOpen) {
                setPlaylistPanelOpen(false);
                return;
            }
            if (event.key === 'Escape') {
                var addSongModal = getAddSongModal();
                if (addSongModal && addSongModal.classList.contains('music-add-song-modal--open')) {
                    closeAddSongModal();
                    return;
                }
                var modal = getCreatePlaylistModal();
                if (modal && modal.classList.contains('music-create-playlist-modal--open')) {
                    closeCreatePlaylistModal();
                    return;
                }
                if (isPlaylistSelectionMode) {
                    clearPlaylistSelection();
                    renderCurrentPlaylistDetail();
                    return;
                }
            }
            if (event.key === 'Enter' && event.target && event.target.id === 'music-create-playlist-name-input') {
                event.preventDefault();
                submitCreatePlaylist();
                return;
            }
            if (event.key === 'Enter' && event.target && event.target.id === 'music-add-song-name-input') {
                event.preventDefault();
                submitAddSongToCurrentPlaylist();
                return;
            }

            if (event.target.closest('[data-my-playlist-action]')) {
                return;
            }

            if (event.target.closest('[data-playlist-action]')) {
                return;
            }

            var myPlaylistCard = event.target.closest('[data-my-playlist-id]');
            if (myPlaylistCard && musicApp.contains(myPlaylistCard)) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (isMyPlaylistManageMode) return;
                openPlaylistDetail(myPlaylistCard.getAttribute('data-my-playlist-id') || '');
                return;
            }

            var likeBtn = event.target.closest('.music-like-btn');
            if (likeBtn && musicApp.contains(likeBtn)) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleLikeButton(likeBtn);
                return;
            }

            var miniOpenNode = event.target.closest('[data-mini-open="detail"]');
            if (miniOpenNode && musicApp.contains(miniOpenNode)) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openPlayerDetail('record');
                return;
            }

            var replayToggleBtn = event.target.closest('#music-replay-toggle-btn');
            if (replayToggleBtn && musicApp.contains(replayToggleBtn)) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleReplayQuickPlay();
                return;
            }

            var playNode = event.target.closest('[data-play-title]');
            if (!playNode || !musicApp.contains(playNode)) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            if (isPlaylistSongManageMode && playNode.getAttribute('data-play-source') === 'my-playlist') {
                return;
            }
            if (isPlaylistSelectionMode && playNode.getAttribute('data-play-source') === 'my-playlist') {
                togglePlaylistSongSelected(playNode.getAttribute('data-track-id') || '');
                return;
            }
            playTrackFromNode(playNode);
        });
    }

    function setActiveTab(tabKey) {
        if (!tabContentMap[tabKey]) tabKey = 'recommend';
        currentTab = tabKey;

        var tabs = document.querySelectorAll('.music-tab-pill');
        tabs.forEach(function(tab) {
            var thisTab = tab.getAttribute('data-tab');
            if (thisTab === currentTab) {
                tab.classList.add('music-tab-pill--active');
            } else {
                tab.classList.remove('music-tab-pill--active');
            }
        });

        renderMusicTab();
    }

    function bindTabEvents() {
        var tabs = document.querySelectorAll('.music-tab-pill');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                setActiveTab(tab.getAttribute('data-tab'));
            });
        });
    }

    function updateMusicTime() {
        var timeEl = document.getElementById('music-status-time');
        if (!timeEl) return;

        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = hh + ':' + mm;

        var dailyKey = getDailyKey();
        if (lastDailyRefreshKey && lastDailyRefreshKey !== dailyKey) {
            renderMusicTab();
        }
    }

    function openMusicApp() {
        isMyPlaylistManageMode = false;
        isPlaylistSongManageMode = false;
        renderMusicTab();
        updateMusicTime();
        switchMusicPage('home');
        setPlaylistPanelOpen(false);
        syncPlayerDetailTrackUI();
        syncPlayerDetailProgress();
        renderMyPlaylists();
        syncPlaylistModeButton();
        musicStorageInitPromise.then(function() {
            renderMyPlaylists();
            renderPlaylistPanel();
            if (currentBottomPage === 'playlist' && getCurrentPlaylist()) {
                renderCurrentPlaylistDetail();
            }
        });
        openApp('music-app');
    }

    window.openMusicApp = openMusicApp;

    window.switchMusicBottomPage = function(pageKey) {
        switchMusicPage(pageKey);
    };

    window.handleMusicHomeButton = function() {
        if (currentBottomPage === 'home') {
            window.closeMusicApp();
            return;
        }
        switchMusicPage('home');
    };

    window.closeMusicApp = function() {
        var app = document.getElementById('music-app');
        if (app) app.style.display = 'none';
        setPlaylistPanelOpen(false);
        closePlayerDetail();
        isMyPlaylistManageMode = false;
        isPlaylistSongManageMode = false;
        setMiniPlayingState(false);
        switchMusicPage('home');
    };

    document.addEventListener('DOMContentLoaded', function() {
        bindTabEvents();
        bindLikeEvents();
        bindPlayerDetailEvents();
        setPlaylistPlayMode(playlistPlayMode);
        setActiveTab(currentTab);
        switchMusicPage('home');
        updateMusicTime();
        setMiniPlayingState(false);
        setMiniTrack('', '', '');
        updateMiniLikeUI();
        renderMyPlaylists();
        renderPlaylistPanel();
        setPlaylistPanelOpen(false);
        syncPlayerDetailTrackUI();
        syncPlayerDetailProgress();
        musicStorageInitPromise = loadMusicLibraryFromDb().then(function() {
            renderMyPlaylists();
            renderPlaylistPanel();
            if (getCurrentPlaylist()) {
                renderCurrentPlaylistDetail();
            }
            updateMiniLikeUI();
            syncPlayerDetailTrackUI();
            syncPlayerDetailProgress();
        });

        musicAudioEl = document.getElementById('music-real-audio');
        if (musicAudioEl) {
            musicAudioEl.addEventListener('play', function() {
                if (!isMiniPlaying) {
                    setMiniPlayingState(true, true);
                }
            });
            musicAudioEl.addEventListener('pause', function() {
                if (isMiniPlaying) {
                    setMiniPlayingState(false, true);
                }
            });
            musicAudioEl.addEventListener('timeupdate', function() {
                syncPlayerDetailProgress();
            });
            musicAudioEl.addEventListener('loadedmetadata', function() {
                syncPlayerDetailProgress();
            });
            musicAudioEl.addEventListener('durationchange', function() {
                syncPlayerDetailProgress();
            });
            musicAudioEl.addEventListener('seeking', function() {
                syncPlayerDetailProgress();
            });
            musicAudioEl.addEventListener('ended', function() {
                if (!playlistTracks.length) {
                    setMiniPlayingState(false, true);
                    return;
                }
                if (playlistPlayMode === 'single' && currentPlayingTrack && currentPlayingTrack.audioSrc) {
                    playTrack(currentPlayingTrack.title, currentPlayingTrack.artist, currentPlayingTrack.source || 'playlist', currentPlayingTrack);
                    return;
                }
                if (playlistPlayMode === 'shuffle') {
                    playRandomTrackFromPlaylist();
                    return;
                }
                var currentIdx = currentPlayingTrack ? findPlaylistTrackIndex(currentPlayingTrack.title, currentPlayingTrack.artist) : -1;
                if (currentIdx < 0) currentIdx = 0;
                var nextTrack = playlistTracks[(currentIdx + 1) % playlistTracks.length];
                if (!nextTrack) {
                    setMiniPlayingState(false, true);
                    return;
                }
                playTrack(nextTrack.title, nextTrack.artist, nextTrack.source || 'playlist', nextTrack);
            });
        }

        var coverInput = getCreatePlaylistCoverInput();
        if (coverInput) {
            coverInput.addEventListener('change', function(event) {
                var file = event && event.target && event.target.files && event.target.files[0];
                handleCreatePlaylistCoverFile(file || null);
            });
        }
        var addSongCoverInput = getAddSongCoverFileInput();
        if (addSongCoverInput) {
            addSongCoverInput.addEventListener('change', function(event) {
                var file = event && event.target && event.target.files && event.target.files[0];
                handleAddSongCoverFile(file || null);
            });
        }
        var addSongAudioInput = getAddSongAudioFileInput();
        if (addSongAudioInput) {
            addSongAudioInput.addEventListener('change', function(event) {
                var file = event && event.target && event.target.files && event.target.files[0];
                handleAddSongAudioFile(file || null);
            });
        }
        var addSongLrcInput = getAddSongLrcFileInput();
        if (addSongLrcInput) {
            addSongLrcInput.addEventListener('change', function(event) {
                var file = event && event.target && event.target.files && event.target.files[0];
                handleAddSongLrcFile(file || null);
            });
        }
        window.setInterval(updateMusicTime, 30000);
        window.addEventListener('beforeunload', revokeRuntimeSongObjectUrls);

        var musicBtn = document.getElementById('app-btn-music');
        if (musicBtn) {
            musicBtn.onclick = function(e) {
                e.stopPropagation();
                openMusicApp();
            };
        }
    });
})();

