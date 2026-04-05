(function() {
    var STORAGE_KEY = 'music_app_state_v1';
    var transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    var currentTab = 'library';
    var multiSelectMode = false;
    var selectedSongIds = [];
    var isLoaded = false;
    var state = getDefaultState();

    function getDefaultState() {
        return {
            currentSongId: 'music-song-1',
            songs: [
                { id: 'music-song-1', title: '慢冷', artist: '梁静茹', duration: '04:35' },
                { id: 'music-song-2', title: '开始懂了', artist: '孙燕姿', duration: '04:29' },
                { id: 'music-song-3', title: '交换余生', artist: '林俊杰', duration: '04:47' },
                { id: 'music-song-4', title: '唯一', artist: '告五人', duration: '04:22' },
                { id: 'music-song-5', title: '我怀念的', artist: '孙燕姿', duration: '04:49' },
                { id: 'music-song-6', title: '嘉宾', artist: '张远', duration: '05:19' }
            ],
            profile: {
                cover: '',
                avatar: '',
                nickname: '兔兔丸',
                vip: 'SVIP 9',
                uid: 'ID: 20260405',
                signature: '把喜欢的旋律都装进今天。',
                following: '0',
                followers: '9M',
                likes: '6K',
                playlistSubtitle: '收藏每一段认真听过的心情。'
            },
            playlists: [
                { id: 'music-playlist-1', name: '凌晨循环', count: '28 首', desc: '适合一个人发呆的夜晚。' },
                { id: 'music-playlist-2', name: '通勤轻晴天', count: '16 首', desc: '地铁耳机里最稳的安全区。' },
                { id: 'music-playlist-3', name: '心动备忘录', count: '21 首', desc: '每次喜欢一个人都会更新。' }
            ]
        };
    }

    function cloneDefaultState() {
        return JSON.parse(JSON.stringify(getDefaultState()));
    }

    function normalizeSong(input) {
        if (!input || typeof input !== 'object') return null;
        var title = String(input.title || '').trim();
        if (!title) return null;
        return {
            id: String(input.id || makeId('music-song')),
            title: title,
            artist: String(input.artist || '未知歌手').trim() || '未知歌手',
            duration: String(input.duration || '03:30').trim() || '03:30'
        };
    }

    function normalizePlaylist(input) {
        if (!input || typeof input !== 'object') return null;
        var name = String(input.name || input.title || '').trim();
        if (!name) return null;
        return {
            id: String(input.id || makeId('music-playlist')),
            name: name,
            count: formatPlaylistCount(input.count || input.tracks || input.trackCount || '12'),
            desc: String(input.desc || input.description || '刚刚收藏进来的私人歌单。').trim() || '刚刚收藏进来的私人歌单。'
        };
    }

    function mergeState(saved) {
        var base = cloneDefaultState();
        if (!saved || typeof saved !== 'object') return base;

        if (Array.isArray(saved.songs) && saved.songs.length) {
            var mergedSongs = saved.songs.map(normalizeSong).filter(Boolean);
            if (mergedSongs.length) base.songs = mergedSongs;
        }

        if (saved.currentSongId) base.currentSongId = String(saved.currentSongId);

        if (saved.profile && typeof saved.profile === 'object') {
            Object.keys(base.profile).forEach(function(key) {
                if (saved.profile[key] !== undefined && saved.profile[key] !== null) {
                    base.profile[key] = String(saved.profile[key]);
                }
            });
        }

        if (Array.isArray(saved.playlists) && saved.playlists.length) {
            var mergedPlaylists = saved.playlists.map(normalizePlaylist).filter(Boolean);
            if (mergedPlaylists.length) base.playlists = mergedPlaylists;
        }

        if (!base.songs.some(function(song) { return song.id === base.currentSongId; })) {
            base.currentSongId = base.songs[0] ? base.songs[0].id : '';
        }
        return base;
    }

    async function ensureLoaded() {
        if (isLoaded) return;
        if (window.localforage && localforage.getItem) {
            try {
                state = mergeState(await localforage.getItem(STORAGE_KEY));
            } catch (error) {
                console.error('读取音乐页面数据失败', error);
                state = cloneDefaultState();
            }
        }
        isLoaded = true;
        renderAll();
    }

    function persistState() {
        if (!window.localforage || !localforage.setItem) return;
        localforage.setItem(STORAGE_KEY, state).catch(function(error) {
            console.error('保存音乐页面数据失败', error);
        });
    }

    function makeId(prefix) {
        return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function formatPlaylistCount(value) {
        var raw = String(value || '').trim();
        if (!raw) return '12 首';
        if (/首$/.test(raw)) return raw;
        if (/^\d+$/.test(raw)) return raw + ' 首';
        return raw;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function(char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    function escapeJsString(value) {
        return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function getCurrentSong() {
        for (var i = 0; i < state.songs.length; i++) {
            if (state.songs[i].id === state.currentSongId) return state.songs[i];
        }
        return state.songs[0] || null;
    }

    function getSongCoverStyle() {
        return state.profile.cover ? 'background-image:url(' + state.profile.cover + ');' : '';
    }

    function renderAll() {
        renderHeader();
        renderLibrary();
        renderProfile();
        renderDock();
        syncHomeMusicTitle();
    }

    function renderHeader() {
        var titleEl = document.getElementById('music-header-title');
        var libraryActions = document.getElementById('music-library-actions');
        var profileActions = document.getElementById('music-profile-actions');
        var toggleBtn = document.getElementById('music-multiselect-toggle');
        if (titleEl) titleEl.textContent = currentTab === 'profile' ? '个人' : '音乐';
        if (libraryActions) libraryActions.className = currentTab === 'library' ? 'music-header-actions music-header-actions-active' : 'music-header-actions';
        if (profileActions) profileActions.className = currentTab === 'profile' ? 'music-header-actions music-header-actions-active' : 'music-header-actions';
        if (toggleBtn) toggleBtn.className = multiSelectMode ? 'music-header-btn is-active' : 'music-header-btn';
    }

    function renderDock() {
        var libraryTab = document.getElementById('music-tab-library');
        var profileTab = document.getElementById('music-tab-profile');
        var libraryDock = document.getElementById('music-dock-library');
        var profileDock = document.getElementById('music-dock-profile');
        var multiBar = document.getElementById('music-multiselect-bar');

        if (libraryTab) libraryTab.className = currentTab === 'library' ? 'music-tab-page active' : 'music-tab-page';
        if (profileTab) profileTab.className = currentTab === 'profile' ? 'music-tab-page active' : 'music-tab-page';
        if (libraryDock) libraryDock.className = currentTab === 'library' ? 'music-dock-btn active' : 'music-dock-btn';
        if (profileDock) profileDock.className = currentTab === 'profile' ? 'music-dock-btn active' : 'music-dock-btn';
        if (multiBar) multiBar.style.display = currentTab === 'library' && multiSelectMode ? 'flex' : 'none';
    }

    function renderLibrary() {
        var currentSong = getCurrentSong();
        var coverEl = document.getElementById('music-now-cover');
        var titleEl = document.getElementById('music-now-title');
        var artistEl = document.getElementById('music-now-artist');
        var countEl = document.getElementById('music-song-count-label');
        var listEl = document.getElementById('music-song-list');
        var emptyEl = document.getElementById('music-song-empty');

        if (coverEl) coverEl.style.cssText = getSongCoverStyle();
        if (titleEl) titleEl.textContent = currentSong ? currentSong.title : '还没有歌曲';
        if (artistEl) artistEl.textContent = currentSong ? currentSong.artist + ' · ' + currentSong.duration : '点击右上角添加第一首歌';
        if (countEl) countEl.textContent = state.songs.length + ' 首歌 · 点击歌曲可切换当前播放';

        if (!listEl || !emptyEl) return;

        if (!state.songs.length) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';
        listEl.innerHTML = state.songs.map(function(song) {
            var checked = selectedSongIds.indexOf(song.id) !== -1;
            var isPlaying = currentSong && song.id === currentSong.id;
            return '' +
                '<button class="music-song-row' + (isPlaying ? ' is-playing' : '') + '" type="button" onclick="musicHandleSongClick(\'' + escapeJsString(song.id) + '\')">' +
                    '<span class="music-song-check' + (multiSelectMode ? ' is-visible' : '') + (checked ? ' is-checked' : '') + '">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>' +
                    '</span>' +
                    '<span class="music-song-cover" style="' + getSongCoverStyle() + '"></span>' +
                    '<span class="music-song-main">' +
                        '<span class="music-song-name">' + escapeHtml(song.title) + '</span>' +
                        '<span class="music-song-artist">' + escapeHtml(song.artist) + '</span>' +
                    '</span>' +
                    '<span class="music-song-duration">' + escapeHtml(song.duration) + '</span>' +
                '</button>';
        }).join('');
    }

    function renderProfile() {
        var coverEl = document.getElementById('music-profile-cover');
        var avatarImg = document.getElementById('music-profile-avatar-img');
        var nameEl = document.getElementById('music-profile-name');
        var vipEl = document.getElementById('music-profile-vip');
        var idEl = document.getElementById('music-profile-id');
        var signEl = document.getElementById('music-profile-signature');
        var followingEl = document.getElementById('music-stat-following');
        var followersEl = document.getElementById('music-stat-followers');
        var likesEl = document.getElementById('music-stat-likes');
        var subtitleEl = document.getElementById('music-playlist-subtitle');
        var playlistList = document.getElementById('music-playlist-list');
        var playlistEmpty = document.getElementById('music-playlist-empty');

        if (coverEl) coverEl.style.backgroundImage = state.profile.cover ? 'url(' + state.profile.cover + ')' : '';
        if (avatarImg) avatarImg.src = state.profile.avatar || transparentPixel;
        if (nameEl) nameEl.textContent = state.profile.nickname;
        if (vipEl) vipEl.textContent = state.profile.vip;
        if (idEl) idEl.textContent = state.profile.uid;
        if (signEl) signEl.textContent = state.profile.signature;
        if (followingEl) followingEl.textContent = state.profile.following;
        if (followersEl) followersEl.textContent = state.profile.followers;
        if (likesEl) likesEl.textContent = state.profile.likes;
        if (subtitleEl) subtitleEl.textContent = state.profile.playlistSubtitle;

        if (!playlistList || !playlistEmpty) return;

        if (!state.playlists.length) {
            playlistList.innerHTML = '';
            playlistEmpty.style.display = 'block';
            return;
        }

        playlistEmpty.style.display = 'none';
        playlistList.innerHTML = state.playlists.map(function(playlist) {
            return '' +
                '<button class="music-playlist-item" type="button" onclick="musicEditPlaylist(\'' + escapeJsString(playlist.id) + '\')">' +
                    '<span class="music-playlist-cover"></span>' +
                    '<span class="music-playlist-main">' +
                        '<span class="music-playlist-name">' + escapeHtml(playlist.name) + '</span>' +
                        '<span class="music-playlist-desc">' + escapeHtml(playlist.desc) + '</span>' +
                    '</span>' +
                    '<span class="music-playlist-count">' + escapeHtml(playlist.count) + '</span>' +
                '</button>';
        }).join('');
    }

    function syncHomeMusicTitle() {
        var homeMusic = document.getElementById('text-music');
        var currentSong = getCurrentSong();
        if (homeMusic && currentSong) {
            homeMusic.textContent = currentSong.title + ' · ' + currentSong.artist;
        }
    }

    function resetSelection() {
        multiSelectMode = false;
        selectedSongIds = [];
    }

    window.openMusicApp = async function() {
        await ensureLoaded();
        currentTab = 'library';
        resetSelection();
        if (typeof openApp === 'function') openApp('music-app');
        else {
            var app = document.getElementById('music-app');
            if (app) app.style.display = 'flex';
        }
        renderAll();
    };

    window.closeMusicApp = function() {
        var app = document.getElementById('music-app');
        if (app) app.style.display = 'none';
        currentTab = 'library';
        resetSelection();
        renderAll();
    };

    window.musicSwitchTab = function(tab) {
        currentTab = tab === 'profile' ? 'profile' : 'library';
        if (currentTab !== 'library') resetSelection();
        renderAll();
    };

    window.musicToggleMultiSelect = function() {
        if (currentTab !== 'library') return;
        multiSelectMode = !multiSelectMode;
        selectedSongIds = [];
        renderAll();
    };

    window.musicCancelMultiSelect = function() {
        resetSelection();
        renderAll();
    };

    window.musicHandleSongClick = function(songId) {
        if (multiSelectMode) {
            var index = selectedSongIds.indexOf(songId);
            if (index === -1) selectedSongIds.push(songId);
            else selectedSongIds.splice(index, 1);
            renderLibrary();
            renderDock();
            return;
        }
        state.currentSongId = songId;
        persistState();
        renderLibrary();
        syncHomeMusicTitle();
    };

    window.musicSelectAllSongs = function() {
        selectedSongIds = state.songs.map(function(song) { return song.id; });
        renderLibrary();
        renderDock();
    };

    window.musicDeleteSelectedSongs = function() {
        if (!selectedSongIds.length) {
            alert('请先选择歌曲');
            return;
        }
        state.songs = state.songs.filter(function(song) {
            return selectedSongIds.indexOf(song.id) === -1;
        });
        if (!state.songs.some(function(song) { return song.id === state.currentSongId; })) {
            state.currentSongId = state.songs[0] ? state.songs[0].id : '';
        }
        resetSelection();
        persistState();
        renderAll();
    };

    window.musicAddSong = function() {
        var raw = prompt('输入歌曲，格式：歌名 - 歌手', '晴天 - 周杰伦');
        if (raw === null) return;
        raw = String(raw || '').trim();
        if (!raw) return;

        var pieces = raw.split('-');
        var title = pieces[0] ? pieces[0].trim() : '';
        var artist = pieces.slice(1).join('-').trim() || '未知歌手';
        if (!title) {
            alert('歌曲名称不能为空');
            return;
        }
        var duration = prompt('输入时长', '03:45');
        if (duration === null) return;

        var song = normalizeSong({
            id: makeId('music-song'),
            title: title,
            artist: artist,
            duration: String(duration || '03:45').trim() || '03:45'
        });
        if (!song) return;

        state.songs.unshift(song);
        state.currentSongId = song.id;
        persistState();
        renderAll();
    };

    window.musicPlayNextSong = function() {
        if (!state.songs.length) return;
        var currentIndex = state.songs.findIndex(function(song) { return song.id === state.currentSongId; });
        var nextIndex = currentIndex >= 0 ? (currentIndex + 1) % state.songs.length : 0;
        state.currentSongId = state.songs[nextIndex].id;
        persistState();
        renderLibrary();
        syncHomeMusicTitle();
    };

    window.musicEditProfileField = function(field, label) {
        var current = state.profile[field] || '';
        var next = prompt(label, current);
        if (next === null) return;
        next = String(next || '').trim();
        if (!next) return;
        state.profile[field] = next;
        persistState();
        renderAll();
    };

    window.musicEditStat = function(field, label) {
        var next = prompt('修改' + label, state.profile[field] || '');
        if (next === null) return;
        next = String(next || '').trim();
        if (!next) return;
        state.profile[field] = next;
        persistState();
        renderProfile();
    };

    window.musicAddPlaylist = function() {
        var name = prompt('输入歌单名称', '新建歌单');
        if (name === null) return;
        name = String(name || '').trim();
        if (!name) return;
        var count = prompt('输入歌曲数量', '12');
        if (count === null) return;
        var desc = prompt('输入一句简介', '刚刚收藏进来的私人歌单。');
        if (desc === null) return;

        var playlist = normalizePlaylist({
            id: makeId('music-playlist'),
            name: name,
            count: count,
            desc: desc
        });
        if (!playlist) return;

        state.playlists.unshift(playlist);
        persistState();
        renderProfile();
    };

    window.musicEditPlaylist = function(playlistId) {
        var playlist = state.playlists.find(function(item) { return item.id === playlistId; });
        if (!playlist) return;

        var name = prompt('修改歌单名称', playlist.name);
        if (name === null) return;
        name = String(name || '').trim();
        if (!name) return;
        var count = prompt('修改歌曲数量', playlist.count);
        if (count === null) return;
        var desc = prompt('修改歌单简介', playlist.desc);
        if (desc === null) return;

        playlist.name = name;
        playlist.count = formatPlaylistCount(count);
        playlist.desc = String(desc || '').trim() || playlist.desc;
        persistState();
        renderProfile();
    };

    window.musicConfigurePlaylists = function() {
        var next = prompt('修改歌单副标题', state.profile.playlistSubtitle);
        if (next === null) return;
        state.profile.playlistSubtitle = String(next || '').trim() || '收藏每一段认真听过的心情。';
        persistState();
        renderProfile();
    };

    window.musicHandleImageChange = function(type, event) {
        var input = event && event.target;
        if (!input || !input.files || !input.files[0]) return;
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function(loadEvent) {
            var result = loadEvent && loadEvent.target ? loadEvent.target.result : '';
            if (!result) return;
            if (type === 'cover') state.profile.cover = result;
            else state.profile.avatar = result;
            persistState();
            renderAll();
            input.value = '';
        };
        reader.readAsDataURL(file);
    };

    function parseImportedPlaylists(rawText) {
        var text = String(rawText || '').trim();
        if (!text) return [];

        try {
            var parsed = JSON.parse(text);
            var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.playlists) ? parsed.playlists : []);
            return list.map(function(item) {
                return typeof item === 'string' ? normalizePlaylist({ name: item }) : normalizePlaylist(item);
            }).filter(Boolean);
        } catch (error) {
            return text
                .split(/\r?\n|,/)
                .map(function(item) { return item.trim(); })
                .filter(Boolean)
                .map(function(name) { return normalizePlaylist({ name: name }); })
                .filter(Boolean);
        }
    }

    window.musicHandlePlaylistImport = function(event) {
        var input = event && event.target;
        if (!input || !input.files || !input.files[0]) return;
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function(loadEvent) {
            var imported = parseImportedPlaylists(loadEvent && loadEvent.target ? loadEvent.target.result : '');
            if (!imported.length) {
                alert('没有识别到可导入的歌单');
                input.value = '';
                return;
            }
            state.playlists = imported.concat(state.playlists);
            persistState();
            renderProfile();
            input.value = '';
        };
        reader.readAsText(file, 'utf-8');
    };

    var musicBtn = document.getElementById('app-btn-music');
    if (musicBtn) {
        musicBtn.onclick = function(event) {
            event.stopPropagation();
            openMusicApp();
        };
    }

    ensureLoaded();
})();
