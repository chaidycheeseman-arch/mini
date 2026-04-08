(() => {
const STORAGE_KEY = 'music_app_state_v1';
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const HOME_EMPTY_TITLE = '还没有添加歌曲';
let currentTab = 'library';
let multiSelectMode = false;
let selectedSongIds = [];
let isLoaded = false;
let playerVisible = false;
let songDialogVisible = false;
let audio = null;
let lyricsCache = { key: '', lines: [], active: -1 };
let songDraft = createEmptySongDraft();
let state = getDefaultState();

function getDefaultState() {
    return {
        currentSongId: '',
        songs: [],
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

function createEmptySongDraft() {
    return { coverUrl: '', coverData: '', coverName: '', title: '', artist: '', sourceType: 'url', sourceUrl: '', sourceData: '', sourceName: '', lyricsText: '', lyricsName: '' };
}

const text = (v) => String(v == null ? '' : v).trim();
const multiText = (v) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim();
const clone = (v) => JSON.parse(JSON.stringify(v));
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const fmtPlaylistCount = (v) => !text(v) ? '12 首' : /首/.test(text(v)) ? text(v) : /^\d+$/.test(text(v)) ? `${text(v)} 首` : text(v);
const fmtDuration = (s) => !isFinite(s) || s < 0 ? '--:--' : `${String(Math.floor(Math.round(s) / 60)).padStart(2, '0')}:${String(Math.round(s) % 60).padStart(2, '0')}`;
const parseDuration = (v) => (/^(\d{1,2}):(\d{2})$/.exec(text(v)) || []).slice(1).reduce((acc, cur, idx) => acc + (idx === 0 ? Number(cur) * 60 : Number(cur)), 0);
const escapeHtml = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escapeJs = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const bgStyle = (url) => text(url) ? `background-image:url('${String(url).replace(/'/g, '%27').replace(/"/g, '%22')}');` : '';
function setCover(el, url) { if (el) el.style.backgroundImage = text(url) ? `url("${String(url).replace(/"/g, '%22')}")` : ''; }
function currentSong() { return state.songs.find((s) => s.id === state.currentSongId) || state.songs[0] || null; }
function songById(id) { return state.songs.find((s) => s.id === id) || null; }

function normalizeSong(input) {
    const title = text(input && input.title);
    const source = text(input && (input.source || input.audioSrc || input.url));
    if (!title || !source) return null;
    const durationRaw = text(input && input.duration);
    return {
        id: text(input && input.id) || makeId('music-song'),
        title,
        artist: text(input && input.artist) || '未知歌手',
        duration: /^\d{1,2}:\d{2}$/.test(durationRaw) ? (durationRaw.length === 4 ? `0${durationRaw}` : durationRaw) : '--:--',
        cover: text(input && (input.cover || input.coverUrl)),
        source,
        sourceType: input && input.sourceType === 'file' ? 'file' : 'url',
        sourceName: text(input && input.sourceName),
        lyrics: multiText(input && (input.lyrics || input.lyric)),
        lyricsName: text(input && input.lyricsName)
    };
}

function normalizePlaylist(input) {
    const name = text(input && (input.name || input.title));
    if (!name) return null;
    return {
        id: text(input && input.id) || makeId('music-playlist'),
        name,
        count: fmtPlaylistCount(input && (input.count || input.tracks || input.trackCount || '12')),
        desc: text(input && (input.desc || input.description)) || '刚刚收藏进来的私人歌单。'
    };
}

function mergeState(saved) {
    const base = clone(getDefaultState());
    if (!saved || typeof saved !== 'object') return base;
    if (Array.isArray(saved.songs)) base.songs = saved.songs.map(normalizeSong).filter(Boolean);
    if (saved.currentSongId) base.currentSongId = String(saved.currentSongId);
    if (saved.profile && typeof saved.profile === 'object') Object.keys(base.profile).forEach((k) => { if (saved.profile[k] != null) base.profile[k] = String(saved.profile[k]); });
    if (Array.isArray(saved.playlists) && saved.playlists.length) {
        const playlists = saved.playlists.map(normalizePlaylist).filter(Boolean);
        if (playlists.length) base.playlists = playlists;
    }
    if (!base.songs.some((s) => s.id === base.currentSongId)) base.currentSongId = base.songs[0] ? base.songs[0].id : '';
    return base;
}

async function ensureLoaded() {
    if (isLoaded) return;
    if (window.localforage && localforage.getItem) {
        try { state = mergeState(await localforage.getItem(STORAGE_KEY)); }
        catch (error) { console.error('读取音乐页面数据失败', error); state = getDefaultState(); }
    }
    isLoaded = true;
    renderAll();
}

function persist() {
    if (!window.localforage || !localforage.setItem) return;
    localforage.setItem(STORAGE_KEY, state).catch((error) => console.error('保存音乐页面数据失败', error));
}

function renderHeader() {
    const titleEl = document.getElementById('music-header-title');
    const libraryActions = document.getElementById('music-library-actions');
    const profileActions = document.getElementById('music-profile-actions');
    const toggleBtn = document.getElementById('music-multiselect-toggle');
    if (titleEl) titleEl.textContent = currentTab === 'profile' ? '个人' : '音乐';
    if (libraryActions) libraryActions.className = currentTab === 'library' ? 'music-header-actions music-header-actions-active' : 'music-header-actions';
    if (profileActions) profileActions.className = currentTab === 'profile' ? 'music-header-actions music-header-actions-active' : 'music-header-actions';
    if (toggleBtn) toggleBtn.className = multiSelectMode ? 'music-header-btn is-active' : 'music-header-btn';
}

function renderDock() {
    const libraryTab = document.getElementById('music-tab-library');
    const profileTab = document.getElementById('music-tab-profile');
    const libraryDock = document.getElementById('music-dock-library');
    const profileDock = document.getElementById('music-dock-profile');
    const multiBar = document.getElementById('music-multiselect-bar');
    if (libraryTab) libraryTab.className = currentTab === 'library' ? 'music-tab-page active' : 'music-tab-page';
    if (profileTab) profileTab.className = currentTab === 'profile' ? 'music-tab-page active' : 'music-tab-page';
    if (libraryDock) libraryDock.className = currentTab === 'library' ? 'music-dock-btn active' : 'music-dock-btn';
    if (profileDock) profileDock.className = currentTab === 'profile' ? 'music-dock-btn active' : 'music-dock-btn';
    if (multiBar) multiBar.style.display = currentTab === 'library' && multiSelectMode ? 'flex' : 'none';
}

function renderLibrary() {
    const song = currentSong();
    const coverEl = document.getElementById('music-now-cover');
    const titleEl = document.getElementById('music-now-title');
    const artistEl = document.getElementById('music-now-artist');
    const metaEl = document.getElementById('music-now-meta');
    const countEl = document.getElementById('music-song-count-label');
    const listEl = document.getElementById('music-song-list');
    const emptyEl = document.getElementById('music-song-empty');
    setCover(coverEl, song && song.cover);
    if (titleEl) titleEl.textContent = song ? song.title : HOME_EMPTY_TITLE;
    if (artistEl) artistEl.textContent = song ? `${song.artist} · ${song.duration || '--:--'}` : '点击右上角 + 添加第一首真实歌曲';
    if (metaEl) metaEl.textContent = song ? (song.lyrics ? '点这里进入播放页查看大封面和滚动歌词' : '点这里进入播放页查看大封面与播放进度') : '支持封面、歌名、歌手、音源和歌词导入';
    if (countEl) countEl.textContent = state.songs.length ? `${state.songs.length} 首歌 · 点击歌曲切换播放，点最近播放看歌词` : '0 首歌 · 点击右上角 + 添加';
    if (!listEl || !emptyEl) return;
    if (!state.songs.length) { listEl.innerHTML = ''; emptyEl.style.display = 'block'; return; }
    emptyEl.style.display = 'none';
    listEl.innerHTML = state.songs.map((item) => {
        const checked = selectedSongIds.includes(item.id);
        const playing = song && item.id === song.id;
        const artistMeta = item.lyrics ? `${item.artist} · 歌词已导入` : item.artist;
        return `<button class="music-song-row${playing ? ' is-playing' : ''}" type="button" onclick="musicHandleSongClick('${escapeJs(item.id)}')"><span class="music-song-check${multiSelectMode ? ' is-visible' : ''}${checked ? ' is-checked' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></span><span class="music-song-cover" style="${bgStyle(item.cover)}"></span><span class="music-song-main"><span class="music-song-name">${escapeHtml(item.title)}</span><span class="music-song-artist">${escapeHtml(artistMeta)}</span></span><span class="music-song-duration">${escapeHtml(item.duration || '--:--')}</span></button>`;
    }).join('');
}

function renderProfile() {
    setCover(document.getElementById('music-profile-cover'), state.profile.cover);
    const avatar = document.getElementById('music-profile-avatar-img');
    if (avatar) avatar.src = state.profile.avatar || transparentPixel;
    [['music-profile-name', 'nickname'], ['music-profile-vip', 'vip'], ['music-profile-id', 'uid'], ['music-profile-signature', 'signature'], ['music-stat-following', 'following'], ['music-stat-followers', 'followers'], ['music-stat-likes', 'likes'], ['music-playlist-subtitle', 'playlistSubtitle']].forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = state.profile[key];
    });
    const listEl = document.getElementById('music-playlist-list');
    const emptyEl = document.getElementById('music-playlist-empty');
    if (!listEl || !emptyEl) return;
    if (!state.playlists.length) { listEl.innerHTML = ''; emptyEl.style.display = 'block'; return; }
    emptyEl.style.display = 'none';
    listEl.innerHTML = state.playlists.map((item) => `<button class="music-playlist-item" type="button" onclick="musicEditPlaylist('${escapeJs(item.id)}')"><span class="music-playlist-cover"></span><span class="music-playlist-main"><span class="music-playlist-name">${escapeHtml(item.name)}</span><span class="music-playlist-desc">${escapeHtml(item.desc)}</span></span><span class="music-playlist-count">${escapeHtml(item.count)}</span></button>`).join('');
}

function renderAll() {
    renderHeader();
    renderLibrary();
    renderProfile();
    renderDock();
    renderPlayer();
    const home = document.getElementById('text-music');
    if (home) { const song = currentSong(); home.textContent = song ? `${song.title} · ${song.artist}` : HOME_EMPTY_TITLE; }
}

function songSeconds(song) {
    return song && audio && audio.dataset && audio.dataset.songId === song.id && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : parseDuration(song && song.duration);
}

function updateSongDuration(songId, seconds) {
    const song = songById(songId);
    const next = fmtDuration(seconds);
    if (!song || next === '--:--' || song.duration === next) return;
    song.duration = next;
    lyricsCache.key = '';
    persist();
    renderLibrary();
    renderPlayer();
}

function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
        if (audio && audio.dataset && audio.dataset.songId) updateSongDuration(audio.dataset.songId, audio.duration);
        refreshPlayerProgress();
        renderPlayer();
    });
    audio.addEventListener('timeupdate', () => { refreshPlayerProgress(); syncLyrics(false); });
    audio.addEventListener('play', renderPlayer);
    audio.addEventListener('pause', renderPlayer);
    audio.addEventListener('ended', () => { refreshPlayerProgress(); syncLyrics(true); renderPlayer(); });
    audio.addEventListener('error', (error) => { console.error('music audio error', error); renderPlayer(); });
    return audio;
}

function clearAudio() {
    if (!audio) return;
    audio.pause();
    try { audio.removeAttribute('src'); audio.dataset.songId = ''; audio.load(); } catch (error) {}
    refreshPlayerProgress();
    renderPlayer();
}

function loadSong(song, forceReload) {
    const player = ensureAudio();
    if (!song || !song.source) return clearAudio();
    if (!forceReload && player.dataset && player.dataset.songId === song.id && player.getAttribute('src')) return;
    player.pause();
    player.dataset.songId = song.id;
    player.src = song.source;
    player.load();
    lyricsCache.key = '';
}

async function playSongById(songId) {
    const song = songById(songId);
    if (!song) return;
    const changed = state.currentSongId !== songId;
    state.currentSongId = songId;
    persist();
    renderAll();
    loadSong(song, changed);
    try { await ensureAudio().play(); }
    catch (error) { console.error('music play failed', error); alert('音乐播放失败，请检查音源链接或本地文件格式'); }
    renderPlayer();
}

function refreshPlayerProgress() {
    const song = currentSong();
    const total = songSeconds(song);
    const current = audio && song && audio.dataset && audio.dataset.songId === song.id && isFinite(audio.currentTime) ? audio.currentTime : 0;
    const currentEl = document.getElementById('music-player-current-time');
    const totalEl = document.getElementById('music-player-total-time');
    const seekEl = document.getElementById('music-player-seek');
    if (currentEl) currentEl.textContent = fmtDuration(current);
    if (totalEl) totalEl.textContent = total ? fmtDuration(total) : (song ? song.duration || '--:--' : '--:--');
    if (seekEl) { seekEl.disabled = !song || !total; seekEl.value = total ? String(Math.max(0, Math.min(1000, Math.round(current / total * 1000)))) : '0'; }
}

function parseLyrics(raw) {
    const lines = multiText(raw).split('\n').filter(Boolean);
    const timed = [];
    const plain = [];
    let hasTime = false;
    lines.forEach((line) => {
        const tags = line.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g);
        const content = line.replace(/\[[^\]]*\]/g, '').trim();
        if (tags && tags.length) {
            hasTime = true;
            tags.forEach((tag) => {
                const parts = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/.exec(tag);
                if (!parts) return;
                timed.push({ time: Number(parts[1]) * 60 + Number(parts[2]) + (parts[3] ? Number(parts[3].padEnd(3, '0').slice(0, 3)) / 1000 : 0), text: content || '...' });
            });
        } else if (!/^\[[a-z]{2,3}:/i.test(line)) plain.push({ text: line });
    });
    if (hasTime && timed.length) return { mode: 'timed', lines: timed.sort((a, b) => a.time - b.time) };
    return { mode: plain.length ? 'plain' : 'empty', lines: plain };
}

function lyricsModel(song) {
    if (!song) return { lines: [] };
    const total = songSeconds(song);
    const key = `${song.id}|${song.lyrics || ''}|${total}`;
    if (lyricsCache.key === key) return lyricsCache;
    const parsed = parseLyrics(song.lyrics);
    let lines = [];
    if (parsed.mode === 'timed') lines = parsed.lines.slice();
    if (parsed.mode === 'plain') {
        const duration = total || Math.max(parsed.lines.length * 4, 1);
        const step = parsed.lines.length > 1 ? duration / parsed.lines.length : duration;
        lines = parsed.lines.map((line, index) => ({ time: step * index, text: line.text }));
    }
    lyricsCache = { key, lines, active: -1 };
    return lyricsCache;
}

function syncLyrics(force) {
    const song = currentSong();
    const box = document.getElementById('music-player-lyrics');
    if (!song || !box) return;
    const model = lyricsModel(song);
    if (!model.lines.length) return;
    const time = audio && audio.dataset && audio.dataset.songId === song.id && isFinite(audio.currentTime) ? audio.currentTime : 0;
    let active = 0;
    model.lines.forEach((line, index) => { if (time + 0.18 >= line.time) active = index; });
    if (!force && active === lyricsCache.active) return;
    lyricsCache.active = active;
    box.querySelectorAll('.music-player-line').forEach((el) => el.classList.toggle('active', Number(el.dataset.lyricIndex) === active));
    const target = box.querySelector(`[data-lyric-index="${active}"]`);
    if (target) box.scrollTo({ top: Math.max(0, target.offsetTop - box.clientHeight / 2 + target.clientHeight / 2), behavior: 'smooth' });
}

function renderLyrics(song) {
    const box = document.getElementById('music-player-lyrics');
    if (!box) return;
    if (!song) return void (box.innerHTML = '<div class="music-player-empty">先添加一首真实音乐，再进入这里查看大封面和滚动歌词。</div>');
    const model = lyricsModel(song);
    if (!model.lines.length) return void (box.innerHTML = '<div class="music-player-empty">这首歌还没有导入歌词。重新添加歌曲时可选择 txt 或 lrc 文件。</div>');
    box.innerHTML = model.lines.map((line, index) => `<div class="music-player-line" data-lyric-index="${index}">${escapeHtml(line.text)}</div>`).join('');
    syncLyrics(true);
}

function renderPlayer() {
    const song = currentSong();
    const playing = !!(audio && song && audio.dataset && audio.dataset.songId === song.id && !audio.paused && !audio.ended);
    const screen = document.getElementById('music-player-screen');
    if (screen) screen.style.display = playerVisible ? 'flex' : 'none';
    setCover(document.getElementById('music-player-cover'), song && song.cover);
    const titleEl = document.getElementById('music-player-title');
    const artistEl = document.getElementById('music-player-artist');
    const hintEl = document.getElementById('music-player-lyrics-hint');
    const toggleBtn = document.getElementById('music-player-toggle');
    if (titleEl) titleEl.textContent = song ? song.title : HOME_EMPTY_TITLE;
    if (artistEl) artistEl.textContent = song ? `${song.artist} · ${song.duration || '--:--'}` : '点击右上角添加真实音乐';
    if (hintEl) hintEl.textContent = song && song.lyrics ? ((song.lyricsName || '').toLowerCase().includes('.lrc') ? '已导入 lrc 歌词' : '已导入 txt 歌词') : '支持 txt / lrc';
    if (toggleBtn) {
        toggleBtn.innerHTML = playing ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h3v14H8zM13 5h3v14h-3z"></path></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
        toggleBtn.setAttribute('aria-label', playing ? '暂停播放' : '开始播放');
    }
    refreshPlayerProgress();
    renderLyrics(song);
}

function captureSongDialog() {
    if (!songDialogVisible) return;
    const coverUrl = document.getElementById('music-song-cover-url');
    const title = document.getElementById('music-song-title-input');
    const artist = document.getElementById('music-song-artist-input');
    const sourceUrl = document.getElementById('music-song-source-url');
    if (coverUrl) songDraft.coverUrl = coverUrl.value;
    if (title) songDraft.title = title.value;
    if (artist) songDraft.artist = artist.value;
    if (sourceUrl) songDraft.sourceUrl = sourceUrl.value;
}

function renderSongDialog() {
    const dialog = document.getElementById('music-song-dialog');
    if (!dialog) return;
    dialog.style.display = songDialogVisible ? 'flex' : 'none';
    if (!songDialogVisible) return;
    const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setValue('music-song-cover-url', songDraft.coverUrl);
    setValue('music-song-title-input', songDraft.title);
    setValue('music-song-artist-input', songDraft.artist);
    setValue('music-song-source-url', songDraft.sourceUrl);
    setValue('music-song-lyrics-preview', songDraft.lyricsText);
    setText('music-song-cover-file-name', songDraft.coverName || '未选择本地封面');
    setText('music-song-audio-file-name', songDraft.sourceName || '未选择本地音源');
    setText('music-song-lyrics-file-name', songDraft.lyricsName || '未导入歌词');
    setCover(document.getElementById('music-song-cover-preview'), songDraft.coverUrl || songDraft.coverData);
    const urlBtn = document.getElementById('music-song-source-mode-url');
    const fileBtn = document.getElementById('music-song-source-mode-file');
    const urlRow = document.getElementById('music-song-source-url-row');
    const fileRow = document.getElementById('music-song-source-file-row');
    if (urlBtn) urlBtn.className = songDraft.sourceType === 'url' ? 'music-song-source-switch-btn active' : 'music-song-source-switch-btn';
    if (fileBtn) fileBtn.className = songDraft.sourceType === 'file' ? 'music-song-source-switch-btn active' : 'music-song-source-switch-btn';
    if (urlRow) urlRow.className = songDraft.sourceType === 'url' ? 'music-song-source-row' : 'music-song-source-row is-hidden';
    if (fileRow) fileRow.className = songDraft.sourceType === 'file' ? 'music-song-source-row' : 'music-song-source-row is-hidden';
}

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e && e.target ? e.target.result : ''); reader.onerror = reject; reader.readAsDataURL(file); });
const readFileAsText = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e && e.target ? e.target.result : ''); reader.onerror = reject; reader.readAsText(file, 'utf-8'); });
function probeSongDuration(song) { if (!song || !song.source) return; const probe = new Audio(); const clean = () => { try { probe.removeAttribute('src'); probe.load(); } catch (error) {} }; probe.preload = 'metadata'; probe.addEventListener('loadedmetadata', () => { updateSongDuration(song.id, probe.duration); clean(); }, { once: true }); probe.addEventListener('error', clean, { once: true }); probe.src = song.source; }

window.openMusicApp = async function() {
    await ensureLoaded();
    currentTab = 'library';
    playerVisible = false;
    songDialogVisible = false;
    multiSelectMode = false;
    selectedSongIds = [];
    if (typeof openApp === 'function') openApp('music-app');
    else { const app = document.getElementById('music-app'); if (app) app.style.display = 'flex'; }
    renderAll();
    renderSongDialog();
};

window.closeMusicApp = function() {
    const app = document.getElementById('music-app');
    if (app) app.style.display = 'none';
    currentTab = 'library';
    playerVisible = false;
    songDialogVisible = false;
    multiSelectMode = false;
    selectedSongIds = [];
    renderAll();
    renderSongDialog();
};

window.musicSwitchTab = function(tab) { currentTab = tab === 'profile' ? 'profile' : 'library'; if (currentTab !== 'library') { multiSelectMode = false; selectedSongIds = []; } renderAll(); };
window.musicToggleMultiSelect = function() { if (currentTab !== 'library') return; multiSelectMode = !multiSelectMode; selectedSongIds = []; renderAll(); };
window.musicCancelMultiSelect = function() { multiSelectMode = false; selectedSongIds = []; renderAll(); };
window.musicHandleSongClick = function(songId) { if (multiSelectMode) { selectedSongIds = selectedSongIds.includes(songId) ? selectedSongIds.filter((id) => id !== songId) : selectedSongIds.concat(songId); renderLibrary(); renderDock(); return; } playSongById(songId); };
window.musicSelectAllSongs = function() { selectedSongIds = state.songs.map((song) => song.id); renderLibrary(); renderDock(); };

window.musicDeleteSelectedSongs = function() {
    if (!selectedSongIds.length) return alert('请先选择歌曲');
    const removedCurrent = selectedSongIds.includes(state.currentSongId);
    state.songs = state.songs.filter((song) => !selectedSongIds.includes(song.id));
    if (!state.songs.some((song) => song.id === state.currentSongId)) state.currentSongId = state.songs[0] ? state.songs[0].id : '';
    if (removedCurrent) { clearAudio(); if (!state.currentSongId) playerVisible = false; }
    multiSelectMode = false;
    selectedSongIds = [];
    persist();
    renderAll();
};

window.musicAddSong = function() { songDraft = createEmptySongDraft(); songDialogVisible = true; renderSongDialog(); };
window.musicCloseSongDialog = function() { songDialogVisible = false; renderSongDialog(); };
window.musicSyncSongCoverPreview = function() { const preview = document.getElementById('music-song-cover-preview'); const input = document.getElementById('music-song-cover-url'); setCover(preview, text(input && input.value) || songDraft.coverData); };
window.musicSetSongSourceMode = function(mode) { captureSongDialog(); songDraft.sourceType = mode === 'file' ? 'file' : 'url'; renderSongDialog(); };
window.musicOpenPlayer = function(autoPlay) { if (!currentSong()) return alert('请先添加歌曲'); playerVisible = true; renderPlayer(); if (autoPlay) window.musicTogglePlayback(true); };
window.musicClosePlayer = function() { playerVisible = false; renderPlayer(); };

window.musicTogglePlayback = async function(forcePlay) {
    const song = currentSong();
    if (!song) return alert('请先添加歌曲');
    const player = ensureAudio();
    loadSong(song, player.dataset.songId !== song.id);
    try { if (forcePlay === true || player.paused) await player.play(); else player.pause(); }
    catch (error) { console.error('music toggle failed', error); alert('音乐播放失败，请检查音源链接或本地文件格式'); }
    renderPlayer();
};

window.musicSeek = function(event) {
    const song = currentSong();
    const total = songSeconds(song);
    if (!song || !total) return;
    const player = ensureAudio();
    loadSong(song, player.dataset.songId !== song.id);
    player.currentTime = total * (Number(event && event.target ? event.target.value : 0) / 1000);
    refreshPlayerProgress();
    syncLyrics(true);
};

window.musicPlayNextSong = function() {
    if (!state.songs.length) return;
    const currentIndex = state.songs.findIndex((song) => song.id === state.currentSongId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % state.songs.length : 0;
    playSongById(state.songs[nextIndex].id);
};

window.musicHandleSongCoverFile = async function(event) { captureSongDialog(); const input = event && event.target; const file = input && input.files && input.files[0]; if (!file) return; try { songDraft.coverData = await readFileAsDataUrl(file); songDraft.coverName = file.name; renderSongDialog(); } catch (error) { console.error(error); alert('读取封面失败'); } input.value = ''; };
window.musicHandleSongAudioFile = async function(event) { captureSongDialog(); const input = event && event.target; const file = input && input.files && input.files[0]; if (!file) return; try { songDraft.sourceType = 'file'; songDraft.sourceData = await readFileAsDataUrl(file); songDraft.sourceName = file.name; renderSongDialog(); } catch (error) { console.error(error); alert('读取音源失败'); } input.value = ''; };
window.musicHandleSongLyricsFile = async function(event) { captureSongDialog(); const input = event && event.target; const file = input && input.files && input.files[0]; if (!file) return; try { songDraft.lyricsText = multiText(await readFileAsText(file)); songDraft.lyricsName = file.name; renderSongDialog(); } catch (error) { console.error(error); alert('读取歌词失败'); } input.value = ''; };

window.musicSaveSong = function() {
    captureSongDialog();
    const title = text(songDraft.title);
    const artist = text(songDraft.artist) || '未知歌手';
    const sourceType = songDraft.sourceType === 'file' ? 'file' : 'url';
    const source = sourceType === 'file' ? text(songDraft.sourceData) : text(songDraft.sourceUrl);
    if (!title) return alert('歌名不能为空');
    if (!source) return alert('请添加可播放的音源');
    const song = normalizeSong({ id: makeId('music-song'), title, artist, duration: '--:--', cover: text(songDraft.coverUrl) || songDraft.coverData, source, sourceType, sourceName: sourceType === 'file' ? songDraft.sourceName : source, lyrics: songDraft.lyricsText, lyricsName: songDraft.lyricsName });
    if (!song) return;
    state.songs.unshift(song);
    state.currentSongId = song.id;
    songDialogVisible = false;
    persist();
    renderAll();
    renderSongDialog();
    probeSongDuration(song);
};

window.musicEditProfileField = async function(field, label) { const next = await window.showMiniPrompt(label, state.profile[field] || ''); if (next == null || !text(next)) return; state.profile[field] = text(next); persist(); renderAll(); };
window.musicEditStat = async function(field, label) { const next = await window.showMiniPrompt(`修改${label}`, state.profile[field] || ''); if (next == null || !text(next)) return; state.profile[field] = text(next); persist(); renderProfile(); };
window.musicAddPlaylist = async function() { const name = await window.showMiniPrompt('输入歌单名称', '新建歌单'); if (name == null || !text(name)) return; const count = await window.showMiniPrompt('输入歌曲数量', '12'); if (count == null) return; const desc = await window.showMiniPrompt('输入一句简介', '刚刚收藏进来的私人歌单。'); if (desc == null) return; const item = normalizePlaylist({ id: makeId('music-playlist'), name, count, desc }); if (!item) return; state.playlists.unshift(item); persist(); renderProfile(); };
window.musicEditPlaylist = async function(playlistId) { const item = state.playlists.find((playlist) => playlist.id === playlistId); if (!item) return; const name = await window.showMiniPrompt('修改歌单名称', item.name); if (name == null || !text(name)) return; const count = await window.showMiniPrompt('修改歌曲数量', item.count); if (count == null) return; const desc = await window.showMiniPrompt('修改歌单简介', item.desc); if (desc == null) return; item.name = text(name); item.count = fmtPlaylistCount(count); item.desc = text(desc) || item.desc; persist(); renderProfile(); };
window.musicConfigurePlaylists = async function() { const next = await window.showMiniPrompt('修改歌单副标题', state.profile.playlistSubtitle); if (next == null) return; state.profile.playlistSubtitle = text(next) || '收藏每一段认真听过的心情。'; persist(); renderProfile(); };
window.musicHandleImageChange = function(type, event) { const input = event && event.target; const file = input && input.files && input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const result = e && e.target ? e.target.result : ''; if (!result) return; if (type === 'cover') state.profile.cover = result; else state.profile.avatar = result; persist(); renderAll(); input.value = ''; }; reader.readAsDataURL(file); };

function parseImportedPlaylists(rawText) {
    const source = text(rawText);
    if (!source) return [];
    try {
        const parsed = JSON.parse(source);
        const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.playlists) ? parsed.playlists : [];
        return list.map((item) => typeof item === 'string' ? normalizePlaylist({ name: item }) : normalizePlaylist(item)).filter(Boolean);
    } catch (error) {
        return source.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).map((name) => normalizePlaylist({ name })).filter(Boolean);
    }
}

window.musicHandlePlaylistImport = function(event) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const playlists = parseImportedPlaylists(e && e.target ? e.target.result : '');
        if (!playlists.length) { alert('没有识别到可导入的歌单'); input.value = ''; return; }
        state.playlists = playlists.concat(state.playlists);
        persist();
        renderProfile();
        input.value = '';
    };
    reader.readAsText(file, 'utf-8');
};

const musicBtn = document.getElementById('app-btn-music');
if (musicBtn) musicBtn.onclick = function(event) { event.stopPropagation(); window.openMusicApp(); };
function syncMusicHeaderSubtitle() { const subtitle = document.getElementById('music-header-subtitle'); const profileTab = document.getElementById('music-tab-profile'); if (subtitle) subtitle.textContent = profileTab && profileTab.classList.contains('active') ? '主页与歌单' : '收藏与播放'; }
const tabTargets = [document.getElementById('music-tab-library'), document.getElementById('music-tab-profile')].filter(Boolean);
if (tabTargets.length) { const observer = new MutationObserver(syncMusicHeaderSubtitle); tabTargets.forEach((target) => observer.observe(target, { attributes: true, attributeFilter: ['class'] })); syncMusicHeaderSubtitle(); }

ensureLoaded();
})();
