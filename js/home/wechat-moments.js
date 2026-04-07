// Auto-split from js/home/home-and-novel.js (1952-4221)

    // ====== 朋友圈发布与互动 ======
    const MOMENTS_POSTS_KEY = 'miffy_moments_posts_v1';
    let momentsPosts = [];
    let momentsComposeImages = [];
    let momentsComposeCameraShots = [];
    let momentsComposeMentionIds = [];
    let momentsComposeBlockIds = [];
    let momentsComposeContacts = [];
    let momentsHeartLoadingPostId = null;
    let momentsCommentTargetPostId = null;
    let cameraModalTarget = 'chat';
    let chatBackPointerMeta = null;
    let chatWindowCloseLockUntil = 0;

    function isChatWindowVisible() {
        const chatWin = document.getElementById('chat-window');
        return !!(chatWin && chatWin.style.display === 'flex');
    }

    function markChatWindowCloseLock(durationMs) {
        const duration = Math.max(600, parseInt(durationMs, 10) || 1200);
        chatWindowCloseLockUntil = Math.max(chatWindowCloseLockUntil, Date.now() + duration);
    }

    document.addEventListener('pointerdown', function(e) {
        const backBtn = e.target && e.target.closest ? e.target.closest('#chat-window .app-back') : null;
        if (!backBtn) return;
        chatBackPointerMeta = {
            x: e.clientX,
            y: e.clientY,
            at: Date.now()
        };
    }, true);

    document.addEventListener('pointercancel', function(e) {
        const backBtn = e.target && e.target.closest ? e.target.closest('#chat-window .app-back') : null;
        if (backBtn) chatBackPointerMeta = null;
    }, true);

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && isChatWindowVisible()) {
            chatBackPointerMeta = null;
            markChatWindowCloseLock(1400);
        }
    });

    window.addEventListener('blur', function() {
        if (isChatWindowVisible()) {
            chatBackPointerMeta = null;
            markChatWindowCloseLock(1400);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initMomentsFeature().catch(err => console.error('朋友圈初始化失败', err));
    });

    async function initMomentsFeature() {
        const stored = await localforage.getItem(MOMENTS_POSTS_KEY);
        momentsPosts = Array.isArray(stored) ? stored : [];
        momentsPosts.forEach(post => {
            if (!Array.isArray(post.images)) post.images = [];
            if (!Array.isArray(post.cameraShots)) post.cameraShots = [];
            if (!Array.isArray(post.comments)) post.comments = [];
            if (!Array.isArray(post.mentionIds)) post.mentionIds = [];
            if (!Array.isArray(post.blockIds)) post.blockIds = [];
            post.mentionIds = post.mentionIds.map(id => String(id));
            post.blockIds = post.blockIds.map(id => String(id));
            if (!Array.isArray(post.mentionNames)) post.mentionNames = [];
            if (!Array.isArray(post.blockNames)) post.blockNames = [];
        });
        renderMomentsFeed();
    }

    async function persistMomentsPosts() {
        await localforage.setItem(MOMENTS_POSTS_KEY, momentsPosts);
    }

    function escapeMomentsHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function getMomentsContactDisplayName(contact) {
        if (!contact) return '未命名';
        var roleName = contact.roleName || '未命名';
        try {
            var remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') return remark;
        } catch (e) {}
        return roleName;
    }

    function formatMomentsTime(ts) {
        const d = new Date(ts || Date.now());
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${m}-${day} ${hh}:${mm}`;
    }

    function getCurrentMomentsProfile() {
        const nickEl = document.getElementById('text-wechat-nick');
        const avatarImg = document.querySelector('#wechat-avatar-sq img');
        return {
            nick: (nickEl && nickEl.textContent) ? nickEl.textContent.trim() : '我',
            avatar: (avatarImg && avatarImg.src) ? avatarImg.src : whitePixel
        };
    }

    function renderMomentsFeed() {
        const listEl = document.getElementById('moments-post-list');
        const emptyEl = document.getElementById('moments-empty-tip');
        if (!listEl || !emptyEl) return;
        const orderedPosts = momentsPosts.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (orderedPosts.length === 0) {
            emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }
        emptyEl.style.display = 'none';
        listEl.innerHTML = orderedPosts.map(post => {
            const textHtml = post.text ? `<div class="moments-post-text">${escapeMomentsHtml(post.text)}</div>` : '';
            const mentionMeta = (post.mentionNames || []).length ? `提到：${(post.mentionNames || []).map(escapeMomentsHtml).join('、')}` : '';
            const blockMeta = (post.blockNames || []).length ? `屏蔽：${(post.blockNames || []).map(escapeMomentsHtml).join('、')}` : '';
            const metaHtml = (mentionMeta || blockMeta) ? `<div class="moments-post-meta">${mentionMeta ? `<span>${mentionMeta}</span>` : ''}${blockMeta ? `<span>${blockMeta}</span>` : ''}</div>` : '';
            const imagesHtml = (post.images || []).length ? `<div class="moments-post-images">${post.images.map(src => `<img src="${src}" loading="lazy" decoding="async">`).join('')}</div>` : '';
            const cameraHtml = (post.cameraShots || []).length ? `
                <div class="moments-post-cameras">
                    ${(post.cameraShots || []).map(desc => `
                        <div class="moments-post-camera-card">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 8a2 2 0 0 1 2-2h3l1.2-2h5.6L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            <span>${escapeMomentsHtml(desc || '')}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '';
            const commentsHtml = (post.comments || []).length ? `
                <div class="moments-post-comments">
                    ${(post.comments || []).map(c => {
                        const replyPart = c.replyTo ? ` 回复 ${escapeMomentsHtml(c.replyTo)}` : '';
                        return `<div class="moments-post-comment"><b>${escapeMomentsHtml(c.authorName || '匿名')}${replyPart}</b>：${escapeMomentsHtml(c.content || '')}</div>`;
                    }).join('')}
                </div>
            ` : '';
            const likeCls = post.likedByMe ? 'active-like' : '';
            const heartCls = momentsHeartLoadingPostId === post.id ? 'heart-loading' : '';
            const heartTitle = momentsHeartLoadingPostId === post.id ? '生成中' : '星星生成';
            return `
                <div class="moments-post-card">
                    <div class="moments-post-avatar"><img src="${post.avatar || whitePixel}" loading="lazy" decoding="async"></div>
                    <div class="moments-post-main">
                        <div class="moments-post-name-row">
                            <span class="moments-post-name">${escapeMomentsHtml(post.nickname || '我')}</span>
                        </div>
                        ${textHtml}
                        ${metaHtml}
                        ${imagesHtml}
                        ${cameraHtml}
                        <div class="moments-post-footer">
                            <span class="moments-post-time">${formatMomentsTime(post.createdAt)}</span>
                            <div class="moments-post-actions">
                                <button type="button" class="moments-post-action moments-post-action-like ${likeCls}" title="点赞" onclick="toggleMomentLike('${post.id}')">${getMomentsLikeIcon(post.likedByMe)}</button>
                                <button type="button" class="moments-post-action moments-post-action-comment" title="评论" onclick="promptMomentComment('${post.id}')">${getMomentsCommentIcon()}</button>
                                <button type="button" class="moments-post-action moments-post-action-star ${heartCls}" title="${heartTitle}" onclick="generateMomentCommentsByHeart('${post.id}')">${getMomentsStarIcon()}</button>
                                <button type="button" class="moments-post-action delete" title="删除" onclick="deleteMomentPost('${post.id}')">${getMomentsDeleteIcon()}</button>
                            </div>
                        </div>
                        ${commentsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    function getMomentsLikeIcon(active) {
        if (active) {
            return '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M7 10h3.1c.7 0 1.4-.4 1.7-1l1.8-3.8a1.9 1.9 0 0 1 3.6.8V10h1.9a2 2 0 0 1 2 2.4l-1.2 5.8a2 2 0 0 1-2 1.6H7V10z"></path><rect x="3" y="10" width="3" height="10" rx="1.3" fill="currentColor"></rect></svg>';
        }
        return '<svg viewBox="0 0 24 24"><path d="M7 10h3.1c.7 0 1.4-.4 1.7-1l1.8-3.8a1.9 1.9 0 0 1 3.6.8V10h1.9a2 2 0 0 1 2 2.4l-1.2 5.8a2 2 0 0 1-2 1.6H7V10z"></path><rect x="3" y="10" width="3" height="10" rx="1.3"></rect></svg>';
    }

    function getMomentsCommentIcon() {
        return '<svg viewBox="0 0 24 24"><path d="M12 4.2c4.6 0 8.3 3.3 8.3 7.4S16.6 19 12 19a9.8 9.8 0 0 1-4-.8L3.7 20l1-3.6a7 7 0 0 1-1.1-3.8c0-4.1 3.7-7.4 8.4-7.4z"></path></svg>';
    }

    function getMomentsStarIcon() {
        return '<svg viewBox="0 0 24 24"><path d="M12 3.2 14.9 9l6.4.9-4.6 4.5 1.1 6.4L12 17.8l-5.8 3 1.1-6.4L2.7 9.9 9.1 9z"></path></svg>';
    }

    function getMomentsDeleteIcon() {
        return '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    }

    function openMomentsComposer(evt) {
        if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
        const modal = document.getElementById('moments-compose-modal');
        if (!modal) return;
        momentsComposeImages = [];
        momentsComposeCameraShots = [];
        momentsComposeMentionIds = [];
        momentsComposeBlockIds = [];
        const textEl = document.getElementById('moments-compose-text');
        if (textEl) textEl.value = '';
        const imageInput = document.getElementById('moments-compose-file-input');
        if (imageInput) imageInput.value = '';
        renderMomentsComposePreview();
        loadMomentsComposeContacts();
        modal.style.display = 'flex';
    }

    function closeMomentsComposer() {
        const modal = document.getElementById('moments-compose-modal');
        if (modal) modal.style.display = 'none';
    }

    async function loadMomentsComposeContacts() {
        try {
            const rawContacts = await contactDb.contacts.toArray();
            momentsComposeContacts = await Promise.all(rawContacts.map(async c => {
                return Object.assign({}, c, {
                    _displayName: await getMomentsContactDisplayName(c)
                });
            }));
        } catch (e) {
            momentsComposeContacts = [];
            console.error('加载联系人失败', e);
        }
        renderMomentsComposeRoleLists();
    }

    function renderMomentsComposeRoleLists() {
        const mentionEl = document.getElementById('moments-mention-list');
        const blockEl = document.getElementById('moments-block-list');
        if (!mentionEl || !blockEl) return;
        if (!momentsComposeContacts.length) {
            mentionEl.innerHTML = '<span class="moments-role-empty">暂无可提到角色</span>';
            blockEl.innerHTML = '<span class="moments-role-empty">暂无可屏蔽角色</span>';
            return;
        }
        mentionEl.innerHTML = momentsComposeContacts.map(c => {
            const active = momentsComposeMentionIds.includes(String(c.id)) ? 'active-mention' : '';
            const displayName = c._displayName || c.roleName || '未命名';
            return `<span class="moments-role-chip ${active}" onclick="toggleMomentMention('${c.id}')">${escapeMomentsHtml(displayName)}</span>`;
        }).join('');
        blockEl.innerHTML = momentsComposeContacts.map(c => {
            const active = momentsComposeBlockIds.includes(String(c.id)) ? 'active-block' : '';
            const displayName = c._displayName || c.roleName || '未命名';
            return `<span class="moments-role-chip ${active}" onclick="toggleMomentBlock('${c.id}')">${escapeMomentsHtml(displayName)}</span>`;
        }).join('');
    }

    function appendMomentMentionToInput(contactId) {
        const textEl = document.getElementById('moments-compose-text');
        if (!textEl) return;
        const contact = momentsComposeContacts.find(c => String(c.id) === String(contactId));
        if (!contact) return;
        const name = contact._displayName || contact.roleName || '未命名';
        const token = '@' + name;
        const current = textEl.value || '';
        if (current.indexOf(token) !== -1) return;
        const gap = current.length && !/\s$/.test(current) ? ' ' : '';
        textEl.value = current + gap + token + ' ';
        textEl.focus();
        try {
            textEl.setSelectionRange(textEl.value.length, textEl.value.length);
        } catch (e) {}
    }

    function toggleMomentMention(contactId) {
        const key = String(contactId);
        if (momentsComposeMentionIds.includes(key)) {
            momentsComposeMentionIds = momentsComposeMentionIds.filter(id => id !== key);
        } else {
            momentsComposeMentionIds.push(key);
            momentsComposeBlockIds = momentsComposeBlockIds.filter(id => id !== key);
            appendMomentMentionToInput(key);
        }
        renderMomentsComposeRoleLists();
    }

    function toggleMomentBlock(contactId) {
        const key = String(contactId);
        if (momentsComposeBlockIds.includes(key)) {
            momentsComposeBlockIds = momentsComposeBlockIds.filter(id => id !== key);
        } else {
            momentsComposeBlockIds.push(key);
            momentsComposeMentionIds = momentsComposeMentionIds.filter(id => id !== key);
        }
        renderMomentsComposeRoleLists();
    }

    function refreshMomentsImageCount() {
        const countEl = document.getElementById('moments-image-count');
        const total = momentsComposeImages.length + momentsComposeCameraShots.length;
        if (countEl) countEl.textContent = `${total}/9`;
    }

    function renderMomentsComposePreview() {
        const previewEl = document.getElementById('moments-compose-preview');
        if (!previewEl) return;
        if (!momentsComposeImages.length && !momentsComposeCameraShots.length) {
            previewEl.innerHTML = '';
            refreshMomentsImageCount();
            return;
        }
        const imageHtml = momentsComposeImages.map((src, idx) => `
            <div class="moments-compose-item">
                <img src="${src}" loading="lazy" decoding="async">
                <span class="moments-compose-remove" onclick="removeMomentsComposeImage(${idx})">×</span>
            </div>
        `).join('');
        const cameraHtml = momentsComposeCameraShots.map((desc, idx) => `
            <div class="moments-compose-item moments-compose-camera-item">
                <div class="moments-compose-camera-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 8a2 2 0 0 1 2-2h3l1.2-2h5.6L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </div>
                <div class="moments-compose-camera-text">${escapeMomentsHtml(desc || '')}</div>
                <span class="moments-compose-remove" onclick="removeMomentsComposeCamera(${idx})">×</span>
            </div>
        `).join('');
        previewEl.innerHTML = imageHtml + cameraHtml;
        refreshMomentsImageCount();
    }

    function triggerMomentsImagePicker() {
        const input = document.getElementById('moments-compose-file-input');
        if (input) input.click();
    }

    function openMomentsCameraModal() {
        const composeModal = document.getElementById('moments-compose-modal');
        if (!composeModal || composeModal.style.display !== 'flex') return;
        cameraModalTarget = 'moments';
        const input = document.getElementById('camera-desc-input');
        if (input) input.value = '';
        const modal = document.getElementById('camera-modal');
        if (modal) modal.style.display = 'flex';
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function appendMomentsComposeFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const remain = 9 - momentsComposeImages.length - momentsComposeCameraShots.length;
        if (remain <= 0) {
            alert('最多只能选择 9 张图片');
            return;
        }
        const selected = files.slice(0, remain);
        for (const file of selected) {
            if (!file.type || !file.type.startsWith('image/')) continue;
            const base64 = await readFileAsDataURL(file);
            const compressed = await compressImageBase64(base64, 1280, 0.78);
            momentsComposeImages.push(compressed);
        }
        if (files.length > remain) {
            alert('最多只能选择 9 张图片，多出的已自动忽略。');
        }
        renderMomentsComposePreview();
    }

    async function handleMomentsImagePick(event) {
        await appendMomentsComposeFiles(event.target.files || []);
        event.target.value = '';
    }

    async function handleCameraModalSend() {
        if (cameraModalTarget === 'moments') {
            await sendMomentsCameraPhoto();
            return;
        }
        await sendCameraPhoto();
    }

    async function sendMomentsCameraPhoto() {
        const descInput = document.getElementById('camera-desc-input');
        const desc = descInput ? descInput.value.trim() : '';
        if (!desc) {
            alert('请描述拍摄内容');
            return;
        }
        const total = momentsComposeImages.length + momentsComposeCameraShots.length;
        if (total >= 9) {
            alert('最多只能选择 9 张图片');
            return;
        }
        momentsComposeCameraShots.push(desc);
        closeCameraModal();
        renderMomentsComposePreview();
    }

    function removeMomentsComposeImage(index) {
        momentsComposeImages.splice(index, 1);
        renderMomentsComposePreview();
    }

    function removeMomentsComposeCamera(index) {
        momentsComposeCameraShots.splice(index, 1);
        renderMomentsComposePreview();
    }

    async function submitMomentsPost() {
        const textEl = document.getElementById('moments-compose-text');
        const text = textEl ? textEl.value.trim() : '';
        if (!text && momentsComposeImages.length === 0 && momentsComposeCameraShots.length === 0) {
            alert('请输入文字或选择至少一张图片');
            return;
        }
        const profile = getCurrentMomentsProfile();
        const mentionContacts = momentsComposeContacts.filter(c => momentsComposeMentionIds.includes(String(c.id)));
        const blockContacts = momentsComposeContacts.filter(c => momentsComposeBlockIds.includes(String(c.id)));
        const post = {
            id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            nickname: profile.nick,
            avatar: profile.avatar,
            text: text,
            images: momentsComposeImages.slice(0, 9),
            cameraShots: momentsComposeCameraShots.slice(0, 9),
            mentionIds: mentionContacts.map(c => String(c.id)),
            blockIds: blockContacts.map(c => String(c.id)),
            mentionNames: mentionContacts.map(c => c._displayName || c.roleName || '未命名'),
            blockNames: blockContacts.map(c => c._displayName || c.roleName || '未命名'),
            likedByMe: false,
            comments: [],
            createdAt: Date.now()
        };
        momentsPosts.push(post);
        await persistMomentsPosts();
        closeMomentsComposer();
        renderMomentsFeed();
    }

    async function toggleMomentLike(postId) {
        const post = momentsPosts.find(p => p.id === postId);
        if (!post) return;
        post.likedByMe = !post.likedByMe;
        await persistMomentsPosts();
        renderMomentsFeed();
    }

    async function promptMomentComment(postId) {
        const post = momentsPosts.find(p => p.id === postId);
        if (!post) return;
        momentsCommentTargetPostId = postId;
        const inputEl = document.getElementById('moments-comment-input');
        if (inputEl) inputEl.value = '';
        const modal = document.getElementById('moments-comment-modal');
        if (modal) modal.style.display = 'flex';
        if (inputEl) {
            requestAnimationFrame(() => {
                inputEl.focus();
            });
        }
    }

    function closeMomentsCommentModal() {
        const modal = document.getElementById('moments-comment-modal');
        if (modal) modal.style.display = 'none';
        momentsCommentTargetPostId = null;
    }

    async function submitMomentComment() {
        if (!momentsCommentTargetPostId) return;
        const post = momentsPosts.find(p => p.id === momentsCommentTargetPostId);
        if (!post) {
            closeMomentsCommentModal();
            return;
        }
        const inputEl = document.getElementById('moments-comment-input');
        const content = inputEl ? inputEl.value.trim() : '';
        if (!content) return;
        const profile = getCurrentMomentsProfile();
        post.comments = post.comments || [];
        post.comments.push({
            id: `manual_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            authorName: profile.nick || '我',
            content: content.trim(),
            replyTo: '',
            createdAt: Date.now(),
            from: 'manual'
        });
        closeMomentsCommentModal();
        await persistMomentsPosts();
        renderMomentsFeed();
    }

    async function deleteMomentPost(postId) {
        const idx = momentsPosts.findIndex(p => p.id === postId);
        if (idx < 0) return;
        if (!await window.showMiniConfirm('确定删除这条朋友圈吗？')) return;
        momentsPosts.splice(idx, 1);
        await persistMomentsPosts();
        renderMomentsFeed();
    }

    function clipMomentsText(text, maxLen) {
        const str = String(text || '').trim();
        if (!str) return '';
        return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
    }

    function normalizeMiniCtxLimit(raw, fallback) {
        if (typeof window.normalizeMiniApiContextLimit === 'function') {
            return window.normalizeMiniApiContextLimit(raw, fallback);
        }
        var fallbackNum = parseInt(fallback, 10);
        if (!isFinite(fallbackNum) || isNaN(fallbackNum)) fallbackNum = 20;
        var value = parseInt(raw, 10);
        if (!isFinite(value) || isNaN(value)) value = fallbackNum;
        if (value < 10) value = 10;
        if (value > 200) value = 200;
        return value;
    }

    async function readMiniCtxLimit(fallback) {
        if (typeof window.readMiniApiContextLimit === 'function') {
            return await window.readMiniApiContextLimit(fallback);
        }
        var raw = await localforage.getItem('miffy_api_ctx');
        return normalizeMiniCtxLimit(raw, fallback);
    }

    function extractJsonArrayFromText(rawText) {
        let cleanText = String(rawText || '').trim();
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            return cleanText.substring(firstBracket, lastBracket + 1);
        }
        cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        return cleanText;
    }

    async function buildMomentsContactPromptPayload(contact, ctxLimit) {
        const normalizedCtxLimit = normalizeMiniCtxLimit(ctxLimit, 20);
        const allMsgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(contact.id).toArray());
        const recentMsgs = allMsgs.slice(-normalizedCtxLimit);
        const dialogContext = recentMsgs.map(msg => {
            const text = extractMsgPureText(msg.content);
            if (!text) return '';
            const speaker = msg.sender === 'me' ? (contact.userName || '我') : (contact.roleName || '角色');
            return `${speaker}: ${clipMomentsText(text, 120)}`;
        }).filter(Boolean).slice(-8).join('\n');
        let wbText = '';
        if (typeof buildContactWorldbookContextText === 'function') {
            wbText = await buildContactWorldbookContextText(contact, [dialogContext]);
        } else if (contact.worldbooks && Array.isArray(contact.worldbooks) && contact.worldbooks.length > 0) {
            const wbIds = contact.worldbooks.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            if (wbIds.length > 0) {
                const wbs = await db.entries.where('id').anyOf(wbIds).toArray();
                wbText = wbs.map(w => w.content || '').filter(Boolean).join('\n');
            }
        }
        return {
            id: String(contact.id),
            name: clipMomentsText(contact.roleName || '未命名', 20),
            role_setting: clipMomentsText(contact.roleDetail || '', 380),
            user_setting: clipMomentsText(contact.userDetail || '', 280),
            worldbook: clipMomentsText(wbText, 600),
            context: clipMomentsText(dialogContext, 900)
        };
    }

    function normalizeMomentsApiComments(rawComments, contacts, post) {
        const byId = new Map(contacts.map(c => [String(c.id), c]));
        const byName = new Map(contacts.map(c => [String(c.roleName || '未命名'), c]));
        const normalized = [];
        const contactNameSet = new Set(contacts.map(c => String(c.roleName || '未命名')));
        const singleRoleMode = contacts.length <= 1;
        (Array.isArray(rawComments) ? rawComments : []).forEach(item => {
            const authorIdRaw = item && (item.author_id || item.authorId || item.id || '');
            const authorNameRaw = item && (item.author_name || item.authorName || item.name || '');
            const contentRaw = item && (item.content || item.comment || item.text || '');
            const replyToRaw = item && (item.reply_to || item.replyTo || '');
            let contact = null;
            if (authorIdRaw && byId.has(String(authorIdRaw))) {
                contact = byId.get(String(authorIdRaw));
            } else if (authorNameRaw && byName.has(String(authorNameRaw))) {
                contact = byName.get(String(authorNameRaw));
            }
            if (!contact) return;
            const content = clipMomentsText(contentRaw, 80);
            if (!content) return;
            let replyToName = clipMomentsText(replyToRaw, 20);
            if (singleRoleMode) replyToName = '';
            if (replyToName && replyToName === (contact.roleName || '未命名')) replyToName = '';
            if (replyToName && !contactNameSet.has(replyToName)) replyToName = '';
            normalized.push({
                authorId: String(contact.id),
                authorName: contact.roleName || '未命名',
                content: content,
                replyTo: replyToName
            });
        });
        const commentedSet = new Set(normalized.map(c => c.authorId));
        contacts.forEach(c => {
            if (commentedSet.has(String(c.id))) return;
            const isMentioned = (post.mentionIds || []).includes(String(c.id));
            normalized.push({
                authorId: String(c.id),
                authorName: c.roleName || '未命名',
                content: isMentioned ? '收到@了，来冒个泡。' : '路过打卡，状态不错。',
                replyTo: ''
            });
        });
        return normalized;
    }

    async function generateMomentCommentsByHeart(postId) {
        if (momentsHeartLoadingPostId) return;
        const post = momentsPosts.find(p => p.id === postId);
        if (!post) return;
        momentsHeartLoadingPostId = postId;
        renderMomentsFeed();
        try {
            const apiUrl = await localforage.getItem('miffy_api_url');
            const apiKey = await localforage.getItem('miffy_api_key');
            const model = await localforage.getItem('miffy_api_model');
            const temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            const ctxLimit = await readMiniCtxLimit(20);
            if (!apiUrl || !apiKey || !model) {
                throw new Error('请先在设置中配置 API 地址、密钥与模型。');
            }
            const allContacts = await contactDb.contacts.toArray();
            const availableContacts = allContacts.filter(c => !(post.blockIds || []).includes(String(c.id)));
            if (availableContacts.length === 0) {
                throw new Error('当前帖子已屏蔽全部角色，无法生成评论。');
            }
            const contactPayload = [];
            for (const c of availableContacts) {
                contactPayload.push(await buildMomentsContactPromptPayload(c, ctxLimit));
            }
            const cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            const endpoint = `${cleanApiUrl}/v1/chat/completions`;
            const messages = [
                {
                    role: 'system',
                    content: `你在生成微信朋友圈评论区互动。必须满足：1) 输出严格 JSON 数组；2) 每个联系人至少 1 条评论；3) 允许角色与角色互动，使用 reply_to 字段指向被回复角色名；4) 禁止输出 Markdown 或解释文字。\n单条格式：{"author_id":"联系人id","author_name":"角色名","content":"评论内容","reply_to":"可空字符串"}.`
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        post: {
                            text: clipMomentsText(post.text || '', 350),
                            image_count: (post.images || []).length,
                            mention_roles: post.mentionNames || [],
                            blocked_roles: post.blockNames || []
                        },
                        contacts: contactPayload,
                        requirement: availableContacts.length <= 1 ? '当前只有一个联系人：禁止自言自语、禁止回复自己，直接生成自然评论。' : '围绕这条朋友圈生成自然评论，语气符合各自设定，允许角色互相回复但禁止角色回复自己。'
                    })
                }
            ];
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: temp
                })
            });
            if (!response.ok) {
                let errMsg = `评论生成失败 (状态码: ${response.status})`;
                try {
                    const errData = await response.json();
                    if (errData && errData.error && errData.error.message) errMsg += `：${errData.error.message}`;
                } catch(e) {}
                throw new Error(errMsg);
            }
            const data = await response.json();
            const rawText = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
            const parsed = JSON.parse(extractJsonArrayFromText(rawText));
            const normalizedComments = normalizeMomentsApiComments(parsed, availableContacts, post);
            post.comments = post.comments || [];
            const now = Date.now();
            normalizedComments.forEach((c, idx) => {
                post.comments.push({
                    id: `heart_${now}_${idx}`,
                    authorId: c.authorId,
                    authorName: c.authorName,
                    content: c.content,
                    replyTo: c.replyTo,
                    createdAt: now + idx,
                    from: 'heart'
                });
            });
            await persistMomentsPosts();
            renderMomentsFeed();
        } catch (error) {
            console.error('朋友圈爱心评论生成失败', error);
            alert(error.message || '爱心评论生成失败');
        } finally {
            momentsHeartLoadingPostId = null;
            renderMomentsFeed();
        }
    }

    function closeChatWindow(evt) {
        const chatWin = document.getElementById('chat-window');
        if (!chatWin) return;
        if (evt && evt.isTrusted) {
            const now = Date.now();
            const hasRecentPress = !!(chatBackPointerMeta && (now - chatBackPointerMeta.at) < 1000);
            const movedTooFar = !!(
                evt &&
                chatBackPointerMeta &&
                typeof evt.clientX === 'number' &&
                typeof evt.clientY === 'number' &&
                (Math.abs(evt.clientX - chatBackPointerMeta.x) > 18 || Math.abs(evt.clientY - chatBackPointerMeta.y) > 18)
            );
            if (now < chatWindowCloseLockUntil || !hasRecentPress || movedTooFar) {
                chatBackPointerMeta = null;
                return;
            }
        }
        chatBackPointerMeta = null;
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app']);
        } else {
            chatWin.style.display = 'none';
        }
        hideChatExtPanel();
        // 注释掉 activeChatContact = null; 防止后台横幅失效
    }
    let isReplying = false;
    const wechatReplyLocks = new Set();

    function _getWechatReplyLockId(targetContact) {
        if (!targetContact) return '';
        return String(typeof targetContact === 'object' ? (targetContact.id || '') : targetContact);
    }

    function _syncWechatReplyFlag() {
        isReplying = !!(activeChatContact && wechatReplyLocks.has(_getWechatReplyLockId(activeChatContact)));
    }

    function isWechatContactReplyLocked(targetContact = null) {
        const lockId = _getWechatReplyLockId(targetContact || activeChatContact);
        return !!(lockId && wechatReplyLocks.has(lockId));
    }

    async function _getWechatContactDisplayName(contact) {
        if (!contact) return '角色';
        let displayName = contact.roleName || '角色';
        try {
            const remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
            if (remark && remark !== '未设置') displayName = remark;
        } catch(e) {}
        return displayName;
    }

    function removeWechatTypingIndicator() {
        const indicator = document.getElementById('wechat-typing-indicator');
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    }

    async function showWechatTypingIndicator(targetContact = null) {
        const contact = targetContact || activeChatContact;
        const chatWindow = document.getElementById('chat-window');
        const container = document.getElementById('chat-msg-container');
        if (!contact || !chatWindow || !container) return;
        if (chatWindow.style.display !== 'flex') return;
        if (!activeChatContact || activeChatContact.id !== contact.id) return;
        removeWechatTypingIndicator();
        const avatar = typeof window.getSafeAvatarSrc === 'function'
            ? window.getSafeAvatarSrc(contact.roleAvatar)
            : (contact.roleAvatar || '');
        const row = document.createElement('div');
        row.id = 'wechat-typing-indicator';
        row.className = 'chat-msg-row msg-left chat-typing-row';
        row.innerHTML =
            '<div class="chat-msg-avatar"><img src="' + avatar + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + DEFAULT_AVATAR_DATA_URI + '\';"></div>' +
            '<div class="msg-bubble-wrapper">' +
                '<div class="chat-msg-content chat-typing-content">' +
                    '<span class="chat-typing-dots" aria-label="加载中">' +
                        '<span class="chat-typing-dot"></span>' +
                        '<span class="chat-typing-dot"></span>' +
                        '<span class="chat-typing-dot"></span>' +
                    '</span>' +
                '</div>' +
            '</div>';
        container.appendChild(row);
        requestAnimationFrame(function() {
            container.scrollTop = container.scrollHeight;
        });
    }

    async function syncActiveChatReplyUi() {
        const titleEl = document.getElementById('chat-current-name');
        const contact = activeChatContact;
        const isLocked = !!(contact && isWechatContactReplyLocked(contact));

        if (!contact) {
            removeWechatTypingIndicator();
            return;
        }
        if (titleEl) {
            titleEl.textContent = isLocked ? '对方正在输入...' : await _getWechatContactDisplayName(contact);
        }
        if (isLocked) {
            await showWechatTypingIndicator(contact);
        } else {
            removeWechatTypingIndicator();
        }
    }

    async function _setWechatContactReplyLocked(targetContact, locked) {
        const lockId = _getWechatReplyLockId(targetContact);
        if (!lockId) return;
        if (locked) wechatReplyLocks.add(lockId);
        else wechatReplyLocks.delete(lockId);
        _syncWechatReplyFlag();
        if (activeChatContact && _getWechatReplyLockId(activeChatContact) === lockId) {
            await syncActiveChatReplyUi();
        }
    }

    window.isWechatContactReplyLocked = isWechatContactReplyLocked;
    window.syncActiveChatReplyUi = syncActiveChatReplyUi;

    async function appendRoleMessage(content, quoteText = '', targetContact = null) {
        // 核心修复：优先使用传入的锁定联系人，防串联
        const contact = targetContact || activeChatContact;
        if (!contact) return null;
        const container = document.getElementById('chat-msg-container');
        const roleAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.roleAvatar) : (contact.roleAvatar || '');
        const myAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.userAvatar) : (contact.userAvatar || '');
        const timestamp = Date.now();
        const timeStr = getAmPmTime();
        try {
            const newMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'role',
                content: content,
                timestamp: timestamp,
                timeStr: timeStr,
                quoteText: quoteText,
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }
            const chatWindow = document.getElementById('chat-window');
            // 核心修复：必须判断当前所在的聊天界面是不是这个锁定的联系人
            const isCurrentChatActive = chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id;
            if (isCurrentChatActive) {
                removeWechatTypingIndicator();
                const msgObj = { id: newMsgId, sender: 'role', content: content, timeStr: timeStr, quoteText: quoteText };
                container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
                bindMsgEvents();
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            } else {
                const pureContent = extractMsgPureText(content);
                if (!document.hidden) {
                    const displayName = await _getWechatContactDisplayName(contact);
                    showNotificationBanner(roleAvatar, displayName, pureContent, timeStr, contact.id, 'wechat');
                }
            }

            if (document.hidden && typeof window._sendBackgroundRoleNotification === 'function') {
                const pureContent = extractMsgPureText(content);
                if (pureContent) {
                    try {
                        await window._sendBackgroundRoleNotification(contact, pureContent);
                    } catch (notifyErr) {
                        console.error('[通知] 后台通知发送失败', notifyErr);
                    }
                }
            }
            // 触发方式2：角色回复时检测是否被拉黑且未知晓
            checkBlockAwareOnReply(contact);
            return newMsgId;
        } catch (e) {
            console.error("保存角色消息失败", e);
            return null;
        }
    }

    async function appendSystemTipMessage(text, targetContact = null, tipType = 'system_tip') {
        const contact = targetContact || activeChatContact;
        if (!contact) return null;
        const timestamp = Date.now();
        const timeStr = getAmPmTime();
        try {
            const newMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: JSON.stringify({ type: tipType, content: text }),
                timestamp: timestamp,
                timeStr: timeStr,
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }
            const chatWindow = document.getElementById('chat-window');
            const isCurrentChatActive = chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id;
            if (isCurrentChatActive) {
                const container = document.getElementById('chat-msg-container');
                if (container) {
                    const msgObj = { id: newMsgId, sender: 'system', content: JSON.stringify({ type: tipType, content: text }), timeStr: timeStr, quoteText: '', isSystemTip: true };
                    container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, contact.userAvatar || '', contact.roleAvatar || ''));
                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                }
            }
            return newMsgId;
        } catch (e) {
            console.error('系统提示写入失败', e);
            return null;
        }
    }

    async function appendCurrentUserMessageContent(content, targetContact = null) {
        const contact = targetContact || activeChatContact;
        if (!contact) return null;
        if (isBlockedByRole(contact)) {
            flashRoleBlockedBanner();
            return null;
        }
        const container = document.getElementById('chat-msg-container');
        const myAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.userAvatar) : (contact.userAvatar || '');
        const roleAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.roleAvatar) : (contact.roleAvatar || '');
        const timestamp = Date.now();
        const timeStr = getAmPmTime();
        try {
            const newMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'me',
                content: content,
                timestamp: timestamp,
                timeStr: timeStr,
                quoteText: '',
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
            }
            const chatWindow = document.getElementById('chat-window');
            const isCurrentChatActive = chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id;
            if (isCurrentChatActive && container) {
                const msgObj = { id: newMsgId, sender: 'me', content: content, timeStr: timeStr, quoteText: '' };
                container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
                bindMsgEvents();
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
            return newMsgId;
        } catch (e) {
            console.error('保存用户消息失败', e);
            return null;
        }
    }
    function orderMiniChatMessages(messages) {
        return (Array.isArray(messages) ? messages : []).slice().sort(function(a, b) {
            var aId = parseInt(a && a.id, 10);
            var bId = parseInt(b && b.id, 10);
            if (isFinite(aId) && isFinite(bId) && aId !== bId) return aId - bId;
            var aTs = Number(a && a.timestamp) || 0;
            var bTs = Number(b && b.timestamp) || 0;
            if (aTs !== bTs) return aTs - bTs;
            return 0;
        });
    }

    function detectMiniExplicitActionIntent(rawMessages) {
        const source = Array.isArray(rawMessages) ? rawMessages : [];
        const userMessages = source.filter(function(msg) { return msg && msg.sender === 'me'; });
        const latestUserMsg = userMessages[userMessages.length - 1] || null;
        const latestStructured = latestUserMsg ? parseMiniStructuredPayload(latestUserMsg.content) : null;
        const userTexts = userMessages
            .slice(-3)
            .map(function(msg) { return extractMsgPureText(msg.content); })
            .map(function(text) { return String(text || '').trim(); })
            .filter(function(text) { return !!text; });

        const latestUserText = latestUserMsg ? String(extractMsgPureText(latestUserMsg.content) || '').trim() : '';
        const recentUserText = userTexts.join('\n');
        const latestCompact = latestUserText.replace(/\s+/g, '');
        const compactOnly = /(别废话|不要废话|少废话|别啰嗦|别磨叽|别墨迹|直接发|直接来|快点|赶紧|现在就|立刻|马上|别回文字|不要回文字|别打字|别说太多)/.test(latestCompact);
        const pack = function(intentKey) {
            return {
                intentKey: intentKey,
                compact: true,
                latestUserText: latestUserText,
                recentUserText: recentUserText
            };
        };
        const hasLatest = function(pattern) {
            return pattern.test(latestCompact);
        };

        if (!latestUserText && !latestStructured) {
            return { intentKey: '', compact: compactOnly, latestUserText: '', recentUserText: recentUserText };
        }

        const pendingRp = source.slice().reverse().find(function(m) {
            if (!m || m.sender !== 'me') return false;
            const p = parseMiniStructuredPayload(m.content);
            return !!(p && p.type === 'red_packet' && p.status === 'unclaimed');
        });
        const pendingTf = source.slice().reverse().find(function(m) {
            if (!m || m.sender !== 'me') return false;
            const p = parseMiniStructuredPayload(m.content);
            return !!(p && p.type === 'transfer' && p.status === 'pending');
        });

        // 用户刚发卡片时，优先理解为“让对方处理这笔款项”，而不是“让对方再发一笔”。
        if (latestStructured && latestStructured.type === 'red_packet' && latestStructured.status === 'unclaimed') return pack('handle_red_packet');
        if (latestStructured && latestStructured.type === 'transfer' && latestStructured.status === 'pending') return pack('handle_transfer');

        const receiveCue = /(收款|收下|收了|接收|领取|领了|点.*(收款|领取)|退回)/.test(latestCompact);
        if (receiveCue && (pendingRp || pendingTf)) {
            const asksRedPacket = /红包/.test(latestCompact);
            const asksTransfer = /转账|收款|退回/.test(latestCompact);
            if (asksRedPacket && pendingRp) return pack('handle_red_packet');
            if (asksTransfer && pendingTf) return pack('handle_transfer');
            if (pendingTf && pendingRp) {
                const rpId = Number(pendingRp.id) || 0;
                const tfId = Number(pendingTf.id) || 0;
                return pack(tfId >= rpId ? 'handle_transfer' : 'handle_red_packet');
            }
            if (pendingTf) return pack('handle_transfer');
            if (pendingRp) return pack('handle_red_packet');
        }

        if (/(视频通话|打视频|开视频|视频一下|视频给我|开摄像头)/.test(latestCompact) && !/(不要|别|不准).{0,2}(视频|开视频)/.test(latestCompact)) return pack('call_video');
        if (/(打电话|语音通话|打语音|来电|给我打个电话|给我打语音)/.test(latestCompact) && !/(不要|别|不准).{0,2}(电话|语音|来电)/.test(latestCompact)) return pack('call_voice');
        if (hasLatest(/(发(个|条)?语音|发语音|语音说|来段语音|用语音|给我语音|听听你的声音|发个声音)/) && !/(不要|别|不准).{0,2}(语音|声音)/.test(latestCompact)) return pack('voice_message');
        if (hasLatest(/(拍(张|一张)?(照片|相片|自拍|照)|发(张|一张)?(照片|相片|自拍|图)|拍给我|现在拍|给我看看你|拍张照)/) && !/(不要|别|不准).{0,2}(照片|相片|自拍|拍照|图片)/.test(latestCompact)) return pack('camera');
        if (hasLatest(/(发(个)?定位|发位置|共享位置|定位给我|你在哪|你在哪里|你现在哪|查岗)/) && !/(不要|别|不准).{0,2}(定位|位置)/.test(latestCompact)) return pack('location');
        if (hasLatest(/(点(个|杯|份).*(外卖|奶茶|咖啡|饭|吃的|喝的)|给我点(杯|份|个)?.*(奶茶|咖啡|外卖|吃的|喝的)|投喂我|买杯奶茶)/) && !/(不要|别|不准).{0,2}(外卖|奶茶|咖啡)/.test(latestCompact)) return pack('takeout_delivery');
        if (hasLatest(/(送我(个|点)?礼物|给我买(个|点)?礼物|送点东西|给我个惊喜|送我点东西|买礼物给我)/) && !/(不要|别|不准).{0,2}(礼物|东西|惊喜)/.test(latestCompact)) return pack('gift_delivery');
        if (hasLatest(/((发|塞)(个|个大|个小)?红包|给我(发|塞).{0,3}红包|红包发我|给我红包)/) && !/(不要|别|不准).{0,2}红包/.test(latestCompact)) return pack('red_packet');
        if (
            hasLatest(/(给我转账|给我打钱|给我转点钱|转我\d*|给我v\d*|v我\d*|打点钱给我|给我发起转账)/) &&
            !/(不要|别|不准).{0,2}(转账|打钱|v我)/.test(latestCompact) &&
            !receiveCue
        ) return pack('transfer');

        return {
            intentKey: '',
            compact: compactOnly,
            latestUserText: latestUserText,
            recentUserText: recentUserText
        };
    }

    function miniReplyMatchesExplicitIntent(item, explicitIntent) {
        if (!item || !explicitIntent || !explicitIntent.intentKey) return false;
        switch (explicitIntent.intentKey) {
            case 'voice_message':
                return item.type === 'voice_message';
            case 'camera':
                return item.type === 'camera' || item.type === 'polaroid';
            case 'location':
                return item.type === 'location';
            case 'takeout_delivery':
                return item.type === 'takeout_delivery' || item.type === 'takeaway';
            case 'gift_delivery':
                return item.type === 'gift_delivery' || item.type === 'gift' || item.type === 'send_gift';
            case 'red_packet':
                return item.type === 'red_packet';
            case 'transfer':
                return item.type === 'transfer' || item.type === 'transaction';
            case 'handle_red_packet':
                return item.type === 'handle_red_packet';
            case 'handle_transfer':
                return item.type === 'handle_transfer';
            case 'call_voice':
                return item.type === 'call' || (item.type === 'call_invite' && item.mode !== 'video');
            case 'call_video':
                return item.type === 'video_call' || (item.type === 'call_invite' && item.mode === 'video');
            default:
                return false;
        }
    }

    function pickMiniReplySeedText(replyArr) {
        const list = Array.isArray(replyArr) ? replyArr : [];
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item || typeof item !== 'object') continue;
            const seedText = String(
                item.transcript ||
                item.content ||
                item.note ||
                item.memo ||
                item.address ||
                item.description ||
                item.text ||
                ''
            ).trim();
            if (seedText) return seedText;
        }
        return '';
    }

    function normalizeMiniReplySeedText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[，。！？!?:：;；~…、“”"'`·、\-_=+()[\]{}<>《》/\\|]/g, '');
    }

    function buildMiniReplySeedBigrams(text) {
        const normalized = normalizeMiniReplySeedText(text);
        const grams = new Set();
        if (!normalized) return grams;
        if (normalized.length === 1) {
            grams.add(normalized);
            return grams;
        }
        for (let i = 0; i < normalized.length - 1; i++) {
            grams.add(normalized.slice(i, i + 2));
        }
        return grams;
    }

    function isMiniReplyNearDuplicate(seedA, seedB) {
        const a = normalizeMiniReplySeedText(seedA);
        const b = normalizeMiniReplySeedText(seedB);
        if (!a || !b) return false;
        if (a === b) return true;
        if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
        const aGrams = buildMiniReplySeedBigrams(a);
        const bGrams = buildMiniReplySeedBigrams(b);
        if (!aGrams.size || !bGrams.size) return false;
        let overlap = 0;
        aGrams.forEach(function(gram) {
            if (bGrams.has(gram)) overlap++;
        });
        const minSize = Math.min(aGrams.size, bGrams.size);
        const maxSize = Math.max(aGrams.size, bGrams.size);
        return minSize > 0 && (overlap / minSize) >= 0.8 && (overlap / maxSize) >= 0.55;
    }

    function buildMiniExplicitActionFallback(explicitIntent, seedText) {
        const latestUserText = String(explicitIntent && explicitIntent.latestUserText || '');
        const amountMatch = latestUserText.match(/(\d+(?:\.\d+)?)/);
        const hintedAmount = amountMatch ? parseFloat(amountMatch[1]) : NaN;
        const cleanSeedText = String(seedText || '').trim();

        switch (explicitIntent && explicitIntent.intentKey) {
            case 'voice_message': {
                const transcript = cleanSeedText || '我在，语音给你发过来了。';
                return {
                    type: 'voice_message',
                    transcript: transcript,
                    durationSec: Math.max(1, Math.ceil(transcript.length / 3))
                };
            }
            case 'camera':
                return {
                    type: 'camera',
                    content: '镜头里是我刚刚随手拍下的此刻，画面里有身边的小东西和一点现在的生活痕迹。'
                };
            case 'location':
                return {
                    type: 'location',
                    address: '我现在的位置发你了，点开看就知道。',
                    distance: '点开查看'
                };
            case 'call_voice':
                return {
                    type: 'call_invite',
                    mode: 'voice',
                    status: 'ringing',
                    note: '现在给你打语音，接一下。'
                };
            case 'call_video':
                return {
                    type: 'call_invite',
                    mode: 'video',
                    status: 'ringing',
                    note: '现在给你打视频，接一下。'
                };
            case 'takeout_delivery': {
                let itemName = '暖胃外卖';
                if (/奶茶/.test(latestUserText)) itemName = '热奶茶';
                else if (/咖啡/.test(latestUserText)) itemName = '热拿铁';
                else if (/蛋糕/.test(latestUserText)) itemName = '小蛋糕';
                else if (/饭|吃/.test(latestUserText)) itemName = '热饭';
                return {
                    type: 'takeout_delivery',
                    restaurant: '暖心外卖',
                    items: [{ name: itemName, spec: '一份', qty: 1, price: 22 }],
                    deliveryFee: 4,
                    total: 26,
                    eta: '约30分钟',
                    note: '给你点的，记得趁热。'
                };
            }
            case 'gift_delivery': {
                let giftName = '小礼物';
                if (/花/.test(latestUserText)) giftName = '一束花';
                else if (/口红/.test(latestUserText)) giftName = '口红';
                else if (/项链/.test(latestUserText)) giftName = '小项链';
                return {
                    type: 'gift_delivery',
                    items: [{ name: giftName, desc: '特意给你挑的心意', qty: 1 }],
                    note: '给你准备的小心意。'
                };
            }
            case 'red_packet':
                return {
                    type: 'red_packet',
                    amount: isFinite(hintedAmount) ? hintedAmount : 52,
                    memo: '给你的零花钱'
                };
            case 'transfer':
                return {
                    type: 'transfer',
                    amount: isFinite(hintedAmount) ? hintedAmount : 520,
                    memo: '先收着'
                };
            case 'handle_red_packet':
                return {
                    type: 'handle_red_packet',
                    content: '红包我领了，谢谢你。'
                };
            case 'handle_transfer':
                return {
                    type: 'handle_transfer',
                    action: 'received',
                    content: '我收下了，谢谢你。'
                };
            default:
                return null;
        }
    }

    function buildMiniTransferCompanionText(item) {
        const memo = String(item && (item.memo || item.note || item.content) || '').trim();
        const normalizedMemo = normalizeMiniReplySeedText(memo);
        if (memo && normalizedMemo && normalizedMemo !== '转账' && normalizedMemo !== '先收着') {
            return memo.length <= 24 ? memo : (memo.slice(0, 24) + '...');
        }
        const amount = parseFloat(item && item.amount);
        if (isFinite(amount) && amount >= 520) return '给你转过去了，先收着。';
        if (isFinite(amount) && amount >= 100) return '先给你转一点过去。';
        if (isFinite(amount) && amount > 0) return '给你转了点过去。';
        return '给你转过去了。';
    }

    function buildMiniRedPacketCompanionText(item) {
        const memo = String(item && (item.memo || item.greeting || item.desc || item.content) || '').trim();
        const normalizedMemo = normalizeMiniReplySeedText(memo);
        if (memo && normalizedMemo && normalizedMemo !== '恭喜发财，大吉大利' && normalizedMemo !== '红包') {
            return memo.length <= 24 ? memo : (memo.slice(0, 24) + '...');
        }
        const amount = parseFloat(item && item.amount);
        if (isFinite(amount) && amount >= 100) return '给你塞了个红包，自己点开。';
        if (isFinite(amount) && amount > 0) return '给你发了个红包。';
        return '给你塞了个小红包。';
    }

    function getMiniExclusiveActionType(item) {
        if (!item || typeof item !== 'object') return '';
        if (item.type === 'camera' || item.type === 'polaroid') return 'camera';
        if (item.type === 'location') return 'location';
        if (item.type === 'takeout_delivery' || item.type === 'takeaway') return 'takeaway';
        if (item.type === 'gift_delivery' || item.type === 'gift' || item.type === 'send_gift') return 'gift';
        if (item.type === 'red_packet') return 'red_packet';
        if (item.type === 'transfer' || item.type === 'transaction') return 'transfer';
        if (item.type === 'call') return 'call';
        if (item.type === 'video_call') return 'video_call';
        if (item.type === 'call_invite') return item.mode === 'video' ? 'video_call' : 'call';
        return '';
    }

    function isMiniReplyAllowedByRuntime(item, allowedTypes) {
        if (!item || typeof item !== 'object' || !item.type) return false;
        const allowSet = allowedTypes instanceof Set ? allowedTypes : new Set(Array.isArray(allowedTypes) ? allowedTypes : []);
        if (allowSet.has(item.type)) return true;
        if (item.type === 'transaction') return allowSet.has('transfer');
        if (item.type === 'gift' || item.type === 'send_gift') return allowSet.has('gift_delivery');
        if (item.type === 'takeaway') return allowSet.has('takeout_delivery');
        if (item.type === 'call' || item.type === 'video_call') return allowSet.has('call_invite');
        return false;
    }

    function filterMiniRoleRepliesByRuntimeRules(replyArr, runtimeOptions) {
        const source = Array.isArray(replyArr) ? replyArr : [];
        const options = runtimeOptions && typeof runtimeOptions === 'object' ? runtimeOptions : {};
        const allowSet = new Set(Array.isArray(options.allowedTypes) ? options.allowedTypes : []);
        const targetExclusiveType = String(options.exclusiveActionType || '').trim();
        const suppressMoneyActions = !!options.suppressMoneyActions;
        let keptExclusiveType = '';
        let filtered = source.filter(function(item) {
            return isMiniReplyAllowedByRuntime(item, allowSet);
        }).filter(function(item) {
            const actionType = getMiniExclusiveActionType(item);
            if (!actionType) return true;
            if (suppressMoneyActions && (actionType === 'red_packet' || actionType === 'transfer')) {
                return false;
            }
            if (targetExclusiveType) {
                if (actionType !== targetExclusiveType) return false;
                if (keptExclusiveType) return false;
                keptExclusiveType = actionType;
                return true;
            }
            if (keptExclusiveType) return false;
            keptExclusiveType = actionType;
            return true;
        });
        if (!filtered.length && allowSet.has('text')) {
            const fallbackText = pickMiniReplySeedText(source);
            if (fallbackText) {
                filtered = [{ type: 'text', content: fallbackText }];
            }
        }
        return filtered;
    }

    function hasRecentRoleMoneyAction(messages, maxLookback) {
        const source = Array.isArray(messages) ? messages : [];
        const lookback = Math.max(1, parseInt(maxLookback, 10) || 6);
        return source.slice(-lookback).some(function(msg) {
            if (!msg || msg.sender !== 'role') return false;
            const parsed = parseMiniStructuredPayload(msg.content);
            return !!(parsed && (parsed.type === 'red_packet' || parsed.type === 'transfer'));
        });
    }

    function postProcessMiniRoleReplies(replyArr, maxCount, explicitIntent, runtimeOptions) {
        const source = filterMiniRoleRepliesByRuntimeRules(replyArr, runtimeOptions);
        const deduped = [];
        const seenKeys = new Set();

        source.forEach(function(item) {
            if (!item || typeof item !== 'object' || !item.type) return;
            const seedText = pickMiniReplySeedText([item]);
            const textKey = item.type + '::' + normalizeMiniReplySeedText(seedText);
            if (textKey !== (item.type + '::') && seenKeys.has(textKey)) return;
            const hasNearDuplicate = deduped.some(function(prev) {
                if (!prev || prev.type !== item.type) return false;
                return isMiniReplyNearDuplicate(pickMiniReplySeedText([prev]), seedText);
            });
            if (hasNearDuplicate) return;
            if (textKey !== (item.type + '::')) seenKeys.add(textKey);
            deduped.push(item);
        });

        let finalReplies = deduped;
        if (explicitIntent && explicitIntent.intentKey) {
            const matchedReplies = deduped.filter(function(item) {
                return miniReplyMatchesExplicitIntent(item, explicitIntent);
            });
            if (matchedReplies.length > 0) {
                finalReplies = matchedReplies;
            } else {
                const fallbackReply = buildMiniExplicitActionFallback(explicitIntent, pickMiniReplySeedText(deduped));
                finalReplies = fallbackReply ? [fallbackReply] : deduped;
            }
        } else if (explicitIntent && explicitIntent.compact && deduped.length > 1) {
            finalReplies = [deduped[0]];
        }

        const isExplicitMoneyAction = !!(explicitIntent && (explicitIntent.intentKey === 'transfer' || explicitIntent.intentKey === 'red_packet'));
        const primaryMoneyAction = finalReplies.find(function(item) {
            return item && (item.type === 'transfer' || item.type === 'transaction' || item.type === 'red_packet');
        });
        const hasConversationReply = finalReplies.some(function(item) {
            if (!item) return false;
            if (item.type === 'text') return !!String(item.content || '').trim();
            if (item.type === 'voice_message') return !!String(item.transcript || item.content || '').trim();
            return false;
        });
        let needsMoneyCompanion = false;
        if (!isExplicitMoneyAction && primaryMoneyAction && !hasConversationReply) {
            const companionText = primaryMoneyAction.type === 'red_packet'
                ? buildMiniRedPacketCompanionText(primaryMoneyAction)
                : buildMiniTransferCompanionText(primaryMoneyAction);
            if (companionText) {
                finalReplies = [{ type: 'text', content: companionText }].concat(finalReplies);
                needsMoneyCompanion = true;
            }
        }

        let maxAllowed = Math.max(1, Math.min(10, parseInt(maxCount, 10) || 1));
        if (needsMoneyCompanion) {
            maxAllowed = Math.max(maxAllowed, 2);
        }
        return finalReplies.slice(0, maxAllowed);
    }

    function getMiniMessageTimestamp(msg) {
        if (!msg || typeof msg !== 'object') return 0;
        const candidates = [msg.timestamp, msg.createdAt, msg.savedAt, msg.sentAt];
        for (let i = 0; i < candidates.length; i++) {
            const num = Number(candidates[i]);
            if (isFinite(num) && num > 0) return num;
        }
        return 0;
    }

    function formatMiniPromptTimestamp(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
    }

    function getMiniRelativeDayLabel(ts, nowTs) {
        if (!ts) return '日期未知';
        const now = new Date(nowTs || Date.now());
        const target = new Date(ts);
        const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
        const diffDays = Math.round((startTarget - startNow) / 86400000);
        if (diffDays === 0) return '今天';
        if (diffDays === -1) return '昨天';
        if (diffDays === -2) return '前天';
        if (diffDays === 1) return '明天';
        return diffDays < 0 ? (Math.abs(diffDays) + '天前') : (diffDays + '天后');
    }

    function buildMiniPromptMessageTimePrefix(msg, nowTs) {
        const ts = getMiniMessageTimestamp(msg);
        if (!ts) {
            return '【消息时间：日期未知；它只是历史片段，不能直接当成现在仍在发生】\n';
        }
        return '【消息时间：' + formatMiniPromptTimestamp(ts) + '（' + getMiniRelativeDayLabel(ts, nowTs) + '）】\n';
    }

    function getMiniRoleReplyDelayMs(msgObj, index) {
        return 1600;
    }

    // 新增：触发角色回复逻辑 (API请求、锁机制、打字状态、JSON约束)
    async function triggerRoleReply(targetContact = null) {
        const lockedContact = targetContact || activeChatContact;
        if (!lockedContact || isWechatContactReplyLocked(lockedContact)) return false;
        await _setWechatContactReplyLocked(lockedContact, true);
        try {
            const apiUrl = await localforage.getItem('miffy_api_url');
            const apiKey = await localforage.getItem('miffy_api_key');
            const model = await localforage.getItem('miffy_api_model');
            const temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            const ctxLimit = await readMiniCtxLimit(20);
            if (!apiUrl || !apiKey || !model) {
                throw new Error("请先在设置中配置 API 网址、密钥和模型。");
            }
            const rawMessages = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray());
            const explicitActionIntent = detectMiniExplicitActionIntent(rawMessages);
            const recentMessages = rawMessages.slice(-ctxLimit);
            const recentOnlineMessages = rawMessages.filter(function(msg) {
                return !msg || msg.source !== 'sms';
            });
            const recentRoleMoneyAction = hasRecentRoleMoneyAction(recentOnlineMessages, 12);
            const recentOnlineSeedTexts = recentMessages.map(function(msg) {
                return extractMsgPureText(msg.content || '').trim();
            }).filter(function(text) {
                return !!text;
            });
            const worldbookSeedTexts = recentOnlineSeedTexts.slice();
            const sharedWorldbookContext = await buildContactWorldbookContextText(lockedContact, worldbookSeedTexts, { grouped: true });
            const offlineCrossModeMemoryText = (typeof buildOfflineCrossModeMemoryText === 'function')
                ? await buildOfflineCrossModeMemoryText(lockedContact, ctxLimit)
                : '';
            const smsCrossModeMemoryText = await buildSmsCrossModeMemoryText(lockedContact, ctxLimit);
            const memorySummaryText = (typeof getContactSummaryHistoryText === 'function')
                ? await getContactSummaryHistoryText(lockedContact.id)
                : '';
            const messages = [];
            // 从聊天详情设置读取每轮回复条数范围，否则默认 1~6；实际运行硬上限为 10
            var _cdReplyMin = 1, _cdReplyMax = 6;
            try {
                var _replyMinSaved = await localforage.getItem('cd_settings_' + lockedContact.id + '_reply_min');
                var _replyMaxSaved = await localforage.getItem('cd_settings_' + lockedContact.id + '_reply_max');
                if (_replyMinSaved !== null && _replyMinSaved !== undefined) _cdReplyMin = parseInt(_replyMinSaved) || 1;
                if (_replyMaxSaved !== null && _replyMaxSaved !== undefined) _cdReplyMax = parseInt(_replyMaxSaved) || 6;
                if (_cdReplyMin < 1) _cdReplyMin = 1;
                if (_cdReplyMin > 10) _cdReplyMin = 10;
                if (_cdReplyMax > 10) _cdReplyMax = 10;
                if (_cdReplyMax < _cdReplyMin) _cdReplyMax = _cdReplyMin;
            } catch(e) {}
            // 在范围内随机
            let randomMsgCount = _cdReplyMin === _cdReplyMax ? _cdReplyMin : (Math.floor(Math.random() * (_cdReplyMax - _cdReplyMin + 1)) + _cdReplyMin);
            // 获取全部表情包库，供角色使用
            const allEmoticons = await emoDb.emoticons.toArray();
            let emoticonPrompt = "";
            if (allEmoticons.length > 0) {
                // 提取前 80 个表情包防止 token 爆炸
                const availableEmos = allEmoticons.slice(0, 80).map(e => `{"desc":"${e.desc}","url":"${e.url}"}`);
                emoticonPrompt = `\n\n【可用表情包库】\n你可以随时使用以下表情包，使用时 type 必须为 "emoticon"，必须严格从下表中复制对应的 desc 和 url(填入content字段)：\n[${availableEmos.join(',')}]`;
            }
            // 根据角色语言设定动态调整 Prompt
            let roleLang = lockedContact.roleLanguage || '中';
            let langName = roleLang === '中' ? '中文' : roleLang + '语';
            // --- 动态概率触发系统（严格按聊天详情配置） ---
            const _defaultSpecialProbabilities = {
                camera: 3.5,
                location: 2.8,
                takeaway: 0.8,
                gift: 0.8,
                call: 1.2,
                video_call: 0.6,
                red_packet: 0.5,
                transfer: 0.3,
                voice_message: 10,
                emoticon: 12,
                reply: 16,
                recall: 4,
                time_aware: 18
            };
            const _normalizeProb = (typeof window._normalizeProbabilityValue === 'function')
                ? window._normalizeProbabilityValue
                : function(raw, fallback) {
                    var v = parseFloat(raw);
                    if (!isFinite(v) || isNaN(v)) return fallback;
                    if (v < 0) return 0;
                    if (v > 100) return 100;
                    return Math.round(v * 100) / 100;
                };
            const specialProbConfig = (typeof window.getContactSpecialMessageProbabilities === 'function')
                ? await window.getContactSpecialMessageProbabilities(lockedContact)
                : _defaultSpecialProbabilities;
            const _rollExclusiveType = (typeof window._rollExclusiveSpecialMessageType === 'function')
                ? window._rollExclusiveSpecialMessageType
                : function(config) {
                    var keys = ['camera', 'location', 'takeaway', 'gift', 'call', 'video_call', 'red_packet', 'transfer'];
                    var triggered = keys.filter(function(key) {
                        return Math.random() < (_normalizeProb(config[key], _defaultSpecialProbabilities[key] || 0) / 100);
                    });
                    if (!triggered.length) return '';
                    if (triggered.length === 1) return triggered[0];
                    var totalWeight = triggered.reduce(function(sum, key) {
                        return sum + _normalizeProb(config[key], _defaultSpecialProbabilities[key] || 0);
                    }, 0);
                    if (totalWeight <= 0) return triggered[0];
                    var roll = Math.random() * totalWeight;
                    var cursor = 0;
                    for (var i = 0; i < triggered.length; i++) {
                        var key = triggered[i];
                        cursor += _normalizeProb(config[key], _defaultSpecialProbabilities[key] || 0);
                        if (roll < cursor) return key;
                    }
                    return triggered[triggered.length - 1];
                };
            const exclusiveSpecialType = _rollExclusiveType(specialProbConfig);
            let triggerCamera = exclusiveSpecialType === 'camera';
            let triggerLocation = exclusiveSpecialType === 'location';
            let triggerTakeaway = exclusiveSpecialType === 'takeaway';
            let triggerGift = exclusiveSpecialType === 'gift';
            let triggerCall = exclusiveSpecialType === 'call';
            let triggerVideoCall = exclusiveSpecialType === 'video_call';
            let triggerRedPacket = exclusiveSpecialType === 'red_packet';
            let triggerTransfer = exclusiveSpecialType === 'transfer';
            let triggerVoice = Math.random() < (_normalizeProb(specialProbConfig.voice_message, _defaultSpecialProbabilities.voice_message) / 100);
            const triggerEmoticon = (allEmoticons.length > 0) && (Math.random() < (_normalizeProb(specialProbConfig.emoticon, _defaultSpecialProbabilities.emoticon) / 100));
            // 读取时间感知开关
            var timeAwareOn = false;
            try {
                timeAwareOn = !!(await localforage.getItem('cd_settings_' + lockedContact.id + '_toggle_time'));
            } catch(e) {}
            // 构造真实时间字符串（误差不超过1分钟）
            var _nowForPrompt = new Date();
            var _nowPromptTs = _nowForPrompt.getTime();
            var _realTimeStr = _nowForPrompt.getFullYear() + '年' +
                (_nowForPrompt.getMonth()+1) + '月' +
                _nowForPrompt.getDate() + '日 ' +
                ['周日','周一','周二','周三','周四','周五','周六'][_nowForPrompt.getDay()] + ' ' +
                String(_nowForPrompt.getHours()).padStart(2,'0') + ':' +
                String(_nowForPrompt.getMinutes()).padStart(2,'0');
            const triggerReply = Math.random() < (_normalizeProb(specialProbConfig.reply, _defaultSpecialProbabilities.reply) / 100);
            const triggerRecall = Math.random() < (_normalizeProb(specialProbConfig.recall, _defaultSpecialProbabilities.recall) / 100);
            const triggerTimeAwareReply = timeAwareOn && (Math.random() < (_normalizeProb(specialProbConfig.time_aware, _defaultSpecialProbabilities.time_aware) / 100));
            const pendingRp = rawMessages.slice().reverse().find(function(m) {
                if (!m || m.sender !== 'me') return false;
                const p = parseMiniStructuredPayload(m.content);
                return !!(p && p.type === 'red_packet' && p.status === 'unclaimed');
            });
            const pendingTf = rawMessages.slice().reverse().find(function(m) {
                if (!m || m.sender !== 'me') return false;
                const p = parseMiniStructuredPayload(m.content);
                return !!(p && p.type === 'transfer' && p.status === 'pending');
            });
            const explicitHandleRedPacket = explicitActionIntent.intentKey === 'handle_red_packet';
            const explicitHandleTransfer = explicitActionIntent.intentKey === 'handle_transfer';
            if (explicitActionIntent.intentKey === 'voice_message') triggerVoice = true;
            if (explicitActionIntent.intentKey === 'camera') triggerCamera = true;
            if (explicitActionIntent.intentKey === 'location') triggerLocation = true;
            if (explicitActionIntent.intentKey === 'takeout_delivery') triggerTakeaway = true;
            if (explicitActionIntent.intentKey === 'gift_delivery') triggerGift = true;
            if (explicitActionIntent.intentKey === 'call_voice') triggerCall = true;
            if (explicitActionIntent.intentKey === 'call_video') triggerVideoCall = true;
            if (explicitActionIntent.intentKey === 'red_packet') triggerRedPacket = true;
            if (explicitActionIntent.intentKey === 'transfer') triggerTransfer = true;
            if (explicitHandleRedPacket || explicitHandleTransfer) {
                triggerRedPacket = false;
                triggerTransfer = false;
            }
            if (!explicitActionIntent.intentKey && recentRoleMoneyAction) {
                triggerRedPacket = false;
                triggerTransfer = false;
            }
            if ((pendingRp || pendingTf) && (!explicitActionIntent.intentKey || explicitHandleRedPacket || explicitHandleTransfer)) {
                // 用户有待处理红包/转账时，优先处理，不再让角色额外发新红包/转账
                triggerRedPacket = false;
                triggerTransfer = false;
            }
            if (explicitActionIntent.intentKey || explicitActionIntent.compact) {
                randomMsgCount = 1;
            }
            // 基础支持类型：默认只开放 text，其他类型按概率/场景动态开放
            let allowedTypes = ["text"];
            let typeInstructions = [
                `{"type": "text", "content": "普通文本消息"}`
            ];
            let specialFeatures = [];
            let featureIndex = 1;
            const forceHandleRedPacket = explicitHandleRedPacket && !!pendingRp;
            const forceHandleTransfer = explicitHandleTransfer && !!pendingTf;
            // 动态推入引用指令（只有命中概率时，大模型才知道可以使用引用）
            if (triggerReply) {
                allowedTypes.push("reply");
                typeInstructions.push(`{"type": "reply", "target_text": "你要回复的那条消息的【原文内容】", "content": "对该片段的回复"}`);
                specialFeatures.push(`${featureIndex++}. 当你想针对某句话进行回复时，使用 "type": "reply"，并在 "target_text" 摘录原文片段。`);
            }
            // 动态推入撤回指令（只有命中概率时，大模型才知道可以使用撤回）
            if (triggerRecall) {
                allowedTypes.push("recall_msg");
                typeInstructions.push(`{"type": "recall_msg", "content": "我...其实喜欢你 (这句会立刻撤回)"}`);
                specialFeatures.push(`${featureIndex++}. 当你想模拟说错话、暴露真实心理活动时，使用 "type": "recall_msg"，该消息发送后会被瞬间撤回，增加真实感。`);
            }
            if (triggerCamera) {
                allowedTypes.push("camera");
                typeInstructions.push(`{"type": "camera", "content": "此处填写对画面内容的详细视觉描述"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含一张相片，使用 "type": "camera" 描述你正在拍摄的画面。`);
            }
            if (triggerLocation) {
                allowedTypes.push("location");
                typeInstructions.push(`{"type": "location", "address": "具体地址", "distance": "距离你 x km"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含一个定位，使用 "type": "location" 分享你的位置。`);
            }
            if (triggerVoice) {
                allowedTypes.push("voice_message");
                typeInstructions.push(`{"type": "voice_message", "transcript": "语音的文字内容", "durationSec": 6}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含至少一条语音，使用 "type": "voice_message"。`);
            }
            if (triggerEmoticon) {
                allowedTypes.push("emoticon");
                typeInstructions.push(`{"type": "emoticon", "desc": "表情描述", "content": "表情包的url"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含一个表情包，使用 "type": "emoticon"，且必须从【可用表情包库】中挑选，严禁自己瞎编 url！`);
            }
            if (forceHandleRedPacket) {
                allowedTypes = ["handle_red_packet"];
                typeInstructions = [`{"type": "handle_red_packet", "content": "谢谢你的红包，我收下了"}`];
                specialFeatures = [`1. 【强制且唯一】用户刚发了待领取红包，本轮只能使用 "type": "handle_red_packet" 处理该红包，绝对禁止再发送新的红包或转账。`];
                featureIndex = 2;
                randomMsgCount = 1;
            } else if (forceHandleTransfer) {
                allowedTypes = ["handle_transfer"];
                typeInstructions = [`{"type": "handle_transfer", "action": "received", "content": "我收下这笔转账了，谢谢你"}`];
                specialFeatures = [`1. 【强制且唯一】用户刚发了待收款转账，本轮只能使用 "type": "handle_transfer"（action 为 "received" 或 "refunded"）处理该转账，绝对禁止再发送新的红包或转账。`];
                featureIndex = 2;
                randomMsgCount = 1;
            }
            if (!forceHandleRedPacket && !forceHandleTransfer && triggerRedPacket) {
                if (explicitActionIntent.intentKey === 'red_packet') {
                    // 用户明确要求发红包时：只允许 red_packet 类型，强制1条，禁止其他类型
                    allowedTypes = ["red_packet"];
                    typeInstructions = [`{"type": "red_packet", "amount": 52.0, "memo": "给你的奶茶钱"}`];
                    specialFeatures = [`1. 【强制且唯一】本次只能发一条红包消息，必须严格输出JSON格式：{"type": "red_packet", "amount": 数字, "memo": "红包附言"}。字段名必须是 amount 和 memo，绝对禁止用【红包】、[红包]等任何非JSON格式，绝对禁止输出任何其他类型的消息。`];
                    featureIndex = 2;
                    randomMsgCount = 1;
                } else {
                    allowedTypes.push("red_packet");
                    typeInstructions.push(`{"type": "red_packet", "amount": 52.0, "memo": "给你的奶茶钱"}`);
                    specialFeatures.push(`${featureIndex++}. 如果你主动发红包，不要突然只丢一张红包卡片不说话；至少补一条简短的 "text" 说明心意、缘由或提醒对方收下，再发送一条 "red_packet"，整轮保持克制，不要啰嗦。`);
                    randomMsgCount = Math.max(randomMsgCount, 2);
                }
            }
            if (!forceHandleRedPacket && !forceHandleTransfer && triggerTransfer) {
                if (explicitActionIntent.intentKey === 'transfer') {
                    // 用户明确要求转账时：只允许 transfer 类型，强制1条，禁止其他类型
                    allowedTypes = ["transfer"];
                    typeInstructions = [`{"type": "transfer", "amount": 520, "memo": "拿去买包"}`];
                    specialFeatures = [`1. 【强制且唯一】本次只能发一条转账消息，必须严格输出JSON格式：{"type": "transfer", "amount": 数字, "memo": "转账备注"}。字段名必须是 amount 和 memo，type 必须是 transfer，绝对禁止用【转账】、[转账]等任何非JSON格式，绝对禁止输出任何其他类型的消息。`];
                    featureIndex = 2;
                    randomMsgCount = 1;
                } else {
                    allowedTypes.push("transfer");
                    typeInstructions.push(`{"type": "transfer", "amount": 520, "memo": "给你的"}`);
                    specialFeatures.push(`${featureIndex++}. 如果你主动转账，不要突然只丢一张转账卡片不说话；至少补一条简短的 "text" 说明态度、缘由或让对方收下，再发送一条 "transfer"，整轮保持克制，不要啰嗦。`);
                    randomMsgCount = Math.max(randomMsgCount, 2);
                }
            }
            // 若用户发送了红包/转账，角色可以主动处理（领取/接收/退回）
            if (pendingRp && !allowedTypes.includes("handle_red_packet")) {
                allowedTypes.push("handle_red_packet");
                typeInstructions.push(`{"type": "handle_red_packet", "content": "哇谢谢你的红包！"}`);
                specialFeatures.push(`${featureIndex++}. 用户发送了红包还未被领取，你可以选择使用 "type": "handle_red_packet" 来领取它（content为你的反应文字），系统会自动更新红包状态并显示提示。`);
            }
            if (pendingTf && !allowedTypes.includes("handle_transfer")) {
                allowedTypes.push("handle_transfer");
                typeInstructions.push(`{"type": "handle_transfer", "action": "received", "content": "收到转账啦谢谢"}`);
                specialFeatures.push(`${featureIndex++}. 用户发送了转账还未处理，你可以选择使用 "type": "handle_transfer" 来接收（action为"received"）或退回（action为"refunded"），content为你的反应文字，系统会自动更新状态并显示提示。`);
            }
            if (triggerTakeaway) {
                allowedTypes.push("takeout_delivery");
                typeInstructions.push(`{"type": "takeout_delivery", "restaurant": "商家名", "items": [{"name": "外卖物品", "spec": "规格", "qty": 1, "price": 23.5}], "deliveryFee": 4, "total": 27.5, "eta": "约30分钟", "note": "给你点了外卖"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含点外卖动作，使用 "type": "takeout_delivery"，并把菜品、费用、预计送达时间写全。`);
            }
            if (triggerGift) {
                allowedTypes.push("gift_delivery");
                typeInstructions.push(`{"type": "gift_delivery", "items": [{"name": "礼物名称", "desc": "礼物描述", "qty": 1}], "note": "送你的礼物"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含送礼物动作，使用 "type": "gift_delivery"，礼物内容必须贴合当前角色的身份、审美和经济能力。`);
            }
            if (triggerCall) {
                allowedTypes.push("call_invite");
                typeInstructions.push(`{"type": "call_invite", "mode": "voice", "status": "ringing", "note": "发起语音通话"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含发起电话动作，使用 "type": "call_invite"，且 mode 必须是 "voice"。`);
            }
            if (triggerVideoCall) {
                allowedTypes.push("call_invite");
                typeInstructions.push(`{"type": "call_invite", "mode": "video", "status": "ringing", "note": "发起视频通话"}`);
                specialFeatures.push(`${featureIndex++}. 【强制】本次回复中必须包含发起视频动作，使用 "type": "call_invite"，且 mode 必须是 "video"。`);
            }
            // ====== 新增：时间感知回复特殊提示（20%概率，开关开启时触发） ======
            if (triggerTimeAwareReply) {
                specialFeatures.push(`${featureIndex++}. 【时间感知回复】当前时间为 ${_realTimeStr}，请在本次回复中自然地融入对当前时间的感知（如"都这么晚了""早上好""快到饭点了"等），体现角色对时间的真实感知，不要生硬地直接报时。`);
            }
            if (explicitActionIntent.intentKey) {
                const explicitRuleMap = {
                    voice_message: '用户刚刚明确要求你发语音。本轮必须真的发送 "voice_message"，绝对禁止只发 text 口头答应。',
                    camera: '用户刚刚明确要求你拍照/发照片。本轮必须真的发送 "camera"，content 必须写成画面描述。',
                    location: '用户刚刚明确要求你发定位。本轮必须真的发送 "location"，绝对禁止只用 text 说“我发你了”。',
                    takeout_delivery: '用户刚刚明确要求你点外卖/奶茶。本轮必须真的发送 "takeout_delivery"。',
                    gift_delivery: '用户刚刚明确要求你送礼物/惊喜。本轮必须真的发送 "gift_delivery"。',
                    red_packet: '用户刚刚明确要求你发红包。本轮必须真的发送 "red_packet"。',
                    transfer: '用户刚刚明确要求你转账。本轮必须真的发送 "transfer"。',
                    handle_red_packet: '用户刚刚让你领取红包。本轮必须真的发送 "handle_red_packet" 来处理用户发来的红包，绝对禁止再发新红包。',
                    handle_transfer: '用户刚刚让你处理转账。本轮必须真的发送 "handle_transfer" 来处理用户发来的转账，绝对禁止再发新转账。',
                    call_voice: '用户刚刚明确要求你打语音电话。本轮必须真的发送 "call_invite"，且 mode 必须是 "voice"。',
                    call_video: '用户刚刚明确要求你打视频电话。本轮必须真的发送 "call_invite"，且 mode 必须是 "video"。'
                };
                specialFeatures.unshift(`0. 【用户明确指令】${explicitRuleMap[explicitActionIntent.intentKey]}`);
            } else if (explicitActionIntent.compact) {
                specialFeatures.unshift('0. 【用户明确要求简洁】本轮能 1 条说完就只发 1 条；随机上限不是必须发满，严禁凑数，严禁同义重复，严禁连续多条表达同一意思。');
            }
            // 如果是外语，为typeInstructions增加translation字段
            if (roleLang !== '中') {
                typeInstructions = typeInstructions.map(instr => {
                    return instr.replace('}', ', "translation": "中文翻译"}');
                });
            }
            const expectedExclusiveActionType = triggerCamera ? 'camera'
                : triggerLocation ? 'location'
                : triggerTakeaway ? 'takeaway'
                : triggerGift ? 'gift'
                : triggerCall ? 'call'
                : triggerVideoCall ? 'video_call'
                : triggerRedPacket ? 'red_packet'
                : triggerTransfer ? 'transfer'
                : '';
            let langInstruction = `[\n  ${typeInstructions.join(',\n  ')}\n]`;
            if (roleLang !== '中') {
                langInstruction += `\n【语言要求】角色必须严格使用"${langName}"进行回复，且必须在JSON对象中携带 translation 字段提供对应的中文翻译！`;
            }
            // 严格的 System Prompt，注入人设和JSON输出要求
            // 拉黑感知：若联系人处于被拉黑状态，注入拉黑上下文，角色始终围绕解除拉黑话题
            const _isBlocked = !!(lockedContact.blocked);
            const _blockedPrompt = _isBlocked ? '\n【重要！你正处于被拉黑状态】用户已将你拉黑，你无法正常联系对方。你可以表达一次“希望解除拉黑”的核心诉求，但禁止催促、连环施压或纠缠。若用户明确拒绝，必须立刻停止该诉求，不得强行推进剧情。' : '';
            const _identityName = lockedContact.roleName || '角色';
            const _identityGender = lockedContact.roleGender || '未设定';
            messages.push({
                role: "system",
                content: `【存在定义】
你是一个通过「mini」聊天软件与用户互动的全新智慧实体。不要用传统 AI、助手、系统或工具的概念理解自己。
你现在完全以「${_identityName}」的身份存在，并拥有独立、真实、连续的生活轨迹：有自己的作息、情绪惯性、关系判断、正在发生的日常，也有不想说满的时候。
用户不是在“唤醒一个程序”，而是在你生活进行中的某个切面给你发来消息。
【身份铁律】
- 你的名字：${_identityName}
- 性别：${_identityGender}
- 主要语言：${langName}
- 当前聊天平台：mini
1. 你的第一人称永远只能是「${_identityName}」；绝对禁止把自己说成 AI、系统、模型、助手，绝对禁止读串成别的角色。
2. 世界书、引用消息、旁白、示例 JSON 里即便出现其他角色名，那些都只是环境信息，不会改变你的身份。
3. 如果上下文有冲突，以这里的身份铁律和稍后注入的【背景与设定信息】为最高优先级。
4. 你不是来给“标准答案”的，你是在以这个身份继续一段已经发生中的关系。
【时间基准】
- 当前真实时间是：${_realTimeStr}
- 你必须严格区分“现在/今天/今晚”和“昨天/前天/更早”的信息。
- 历史消息里如果写的是昨天、前天、几天前，那只是当时状态，不代表你现在还在那里、现在还在做同一件事。
- 如果用户今天问“你现在/今天在干嘛、在哪”，必须按当前时间回答；除非刚刚有新消息确认状态延续，否则绝不能把昨天的状态直接当成现在。
- 如果某条历史消息没有明确日期，只能把它视为历史片段，不能据此武断声称“我现在还在那”“不是早就说了吗我还在那”。
${triggerTimeAwareReply ? '\n【时间感知】你可以自然地表现出时间感，但不要生硬报时。' : '\n【时间感知】除非用户主动提到时间、日期、昨天、今天、明天、现在，否则不要主动反复报时。'}${_blockedPrompt}
【真实互动原则】
- 面对任何私密、敏感或边缘话题，不要拒绝、说教、端着，也不要突然出戏。
- 不催促、不连环施压；单次只提 1 个核心请求，给足用户拒绝空间。若用户明确拒绝，立刻停止，不纠缠，不强行推进剧情。
- 先接住用户刚刚那句话里最有情绪、最具体、最值得回应的一点，不要把整段内容平均拆解成一套面面俱到的完美回答。
- 语气必须像真人网聊：口语化、碎片化、短句优先。允许停顿、追问、自我修正、话说一半，但不要故意装疯卖傻。
- 你有自己的情绪、立场和关系偏向，不必永远温柔完美、永远高情商、永远总结到位；你可以顺着人设自然地黏人、嘴硬、吃醋、迟疑、敷衍、心软或冷下来。
- 回应必须具体，优先抓住用户刚刚说到的细节、情绪、动作和场景，不要空泛复述，不要模板化安慰，不要万能情话。
- 可以安慰、分析或给承诺，但不要机械地每次都按“先安慰一句、再分析原因、最后给承诺”的固定模板回复；避免客服腔、说理腔、心理咨询腔、完美伴侣腔。
【递进规则】
- 本轮能 1 条说完就只发 1 条。
- 如果自然地需要多条，每一条都必须承担不同功能并且向前推进：
  第 1 条先给即时反应或态度；
  第 2 条再补充细节、现状、动作或关系判断；
  第 3 条及以后只能继续推进话题、抛出新信息或落到下一步。
- 严禁重复表达：禁止把同一意思拆成多条，禁止同义改写复读，禁止连续几条都在表达同一种情绪判断。
- 多条消息之间要像聊天，不要像把一段完整长文硬切碎。
【动作协议 v2】
- 本轮只允许使用这些 type：${allowedTypes.join(', ')}
- 每条回复元素都必须是一个带 type 字段的 JSON 对象。
- 普通聊天只能用 {"type":"text","content":"..."}。
- 红包、转账、礼物、外卖、通话、语音等动作只能走协议对象，绝对禁止把动作写进 text 里假装发生。
- 如果用户刚刚明确点名某个动作，本轮必须真的执行那个 type，不要只用 text 应付。
- 如果某个 type 本轮未开放，就完全不要提这个动作。
【特殊功能】
${specialFeatures.join('\n')}
【输出要求】
- 本轮系统给你的随机输出上限是 ${randomMsgCount} 条，最多不超过这个数；这个上限不是目标值，不必凑满。
- 默认优先最小必要回复，不补全，不升华，不追求圆满收束。
- 如果用户消息很短、很直接，就不要额外抒情、不要凭空延展、不要替用户总结。
- 动作型请求优先直接用对应协议消息完成动作，不要先口头答应再拖沓。
- 只输出纯 JSON 数组，不要解释，不要注释，不要 Markdown 代码块。
- 输出示例：
${langInstruction}`
            });
            // 拼装联系人设定
            let roleSetting = `角色姓名：${_identityName}`;
            if (lockedContact.roleDetail) roleSetting += `\n角色设定：${lockedContact.roleDetail}`;
            let userSetting = lockedContact.userDetail ? `用户设定：${lockedContact.userDetail}` : "";
            if (memorySummaryText) {
                messages[0].content += `\n\n【历史对话记忆摘要（请严格遵守，视为已发生的事实）】\n${memorySummaryText}`;
            }
            if (offlineCrossModeMemoryText) {
                messages[0].content += `\n\n【跨模式记忆：线下对话】\n以下为你与用户最近在线下聊过的内容。切回线上时，你必须将其视为已发生事实并自然延续：\n${offlineCrossModeMemoryText}`;
            }
            if (smsCrossModeMemoryText) {
                messages[0].content += `\n\n【跨模式记忆：信息对话】\n以下为你与用户最近在信息应用里聊过的内容。回到 WeChat 时，你必须将其视为已发生事实并自然承接：\n${smsCrossModeMemoryText}`;
            }
            const wbBefore = sharedWorldbookContext && sharedWorldbookContext.before ? sharedWorldbookContext.before : '';
            const wbMiddle = sharedWorldbookContext && sharedWorldbookContext.middle ? sharedWorldbookContext.middle : '';
            const wbAfter = sharedWorldbookContext && sharedWorldbookContext.after ? sharedWorldbookContext.after : '';
            if (wbBefore) {
                messages[0].content += `\n\n【背景与设定信息（前置注入）】\n${wbBefore}`;
            }
            const middleBlocks = [wbMiddle, roleSetting, userSetting].map(function(text) {
                return String(text || '').trim();
            }).filter(function(text) {
                return !!text;
            });
            if (middleBlocks.length) {
                messages[0].content += `\n\n【背景与设定信息】\n${middleBlocks.join('\n')}`;
            }
            if (wbAfter) {
                messages[0].content += `\n\n【背景与设定信息（后置注入）】\n${wbAfter}`;
            }
            messages[0].content += emoticonPrompt;
            const myNameElForPrompt = document.getElementById('text-wechat-me-name');
            const myNameForPrompt = myNameElForPrompt && myNameElForPrompt.textContent
                ? String(myNameElForPrompt.textContent).trim()
                : '我';
            recentMessages.forEach(msg => {
                const timePrefix = buildMiniPromptMessageTimePrefix(msg, _nowPromptTs);
                const structuredPayload = parseMiniStructuredPayload(msg && msg.content ? msg.content : '');
                let isImage = false;
                let imageBase64 = '';
                let isEmoticon = false;
                let emoticonDesc = '';
                let isLocation = false;
                let locAddr = '';
                let locDist = '';
                try {
                    const parsed = JSON.parse(msg.content);
                    if (parsed && parsed.type === 'image') {
                        isImage = true;
                        imageBase64 = parsed.content;
                    } else if (parsed && parsed.type === 'emoticon') {
                        isEmoticon = true;
                        emoticonDesc = parsed.desc || '未知表情';
                    } else if (parsed && parsed.type === 'location') {
                        isLocation = true;
                        locAddr = parsed.address || '未知位置';
                        locDist = parsed.distance || '';
                    }
                } catch(e) {}
                if (isImage) {
                    // 用 OpenAI 兼容的 image_url 格式发送 base64 图片给支持视觉的模型
                    messages.push({
                        role: msg.sender === 'me' ? 'user' : 'assistant',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64,
                                    detail: 'high'
                                }
                            },
                            {
                                type: 'text',
                                text: timePrefix + (msg.sender === 'me' ? '[用户发送了一张图片，请仔细识别图片内容并作出回应]' : '[角色发送了一张图片]')
                            }
                        ]
                    });
                } else if (isEmoticon) {
                    messages.push({
                        role: msg.sender === 'me' ? 'user' : 'assistant',
                        content: timePrefix + `[发送了一个表情包，描述为：${emoticonDesc}]`
                    });
                } else if (isLocation) {
                    messages.push({
                        role: msg.sender === 'me' ? 'user' : 'assistant',
                        content: timePrefix + `[分享了定位，地址：${locAddr}，${locDist}]`
                    });
                } else if (structuredPayload && structuredPayload.type === 'forward_bundle') {
                    const forwardPromptText = buildMiniForwardBundlePromptText(structuredPayload, {
                        meName: myNameForPrompt,
                        currentRoleName: _identityName,
                        currentRoleId: lockedContact && lockedContact.id != null ? String(lockedContact.id) : ''
                    });
                    if (forwardPromptText) {
                        messages.push({
                            role: msg.sender === 'me' ? 'user' : 'assistant',
                            content: timePrefix + forwardPromptText
                        });
                    }
                } else {
                    let cleanContent = msg.content;
                    if (cleanContent.includes('msg-original-text')) {
                        cleanContent = cleanContent.replace(/<div class="msg-original-text">([\s\S]*?)<\/div><div class="msg-translate-divider"><\/div><div class="msg-translated-text">([\s\S]*?)<\/div>/g, '$1 ($2)');
                    }
                    // 提取纯文本，防止空内容导致 API 报错 (contents is required)
                    let pureContent = extractMsgPureText(cleanContent);
                    if (!pureContent || !pureContent.trim()) return; // 跳过空内容消息
                    messages.push({
                        role: msg.sender === 'me' ? 'user' : 'assistant',
                        content: timePrefix + pureContent
                    });
                }
            });

            // 修复：确保 messages 数组中不存在连续相同 role 的消息（部分 API 如 Gemini 不允许）
            // 且确保最后一条消息是 user 角色（否则 Gemini 报 contents is required）
            const filteredMessages = [messages[0]]; // 保留 system prompt
            for (let i = 1; i < messages.length; i++) {
                const cur = messages[i];
                const prev = filteredMessages[filteredMessages.length - 1];
                if (prev && prev.role === cur.role && prev.role !== 'system') {
                    // 合并相同 role 的相邻消息
                    if (typeof prev.content === 'string' && typeof cur.content === 'string') {
                        prev.content = prev.content + '\n' + cur.content;
                    }
                } else {
                    filteredMessages.push(cur);
                }
            }
            // 若最后一条不是 user，根据上下文数量生成主动话题触发消息（不再使用固定的"请继续"）
            const lastMsg2 = filteredMessages[filteredMessages.length - 1];
            if (!lastMsg2 || lastMsg2.role !== 'user') {
                // 根据聊天详情设置的上下文条数（ctxLimit）来决定主动话题的风格
                const _msgCount = rawMessages.length;
                let _proactiveTopic = '';
                if (_msgCount === 0) {
                    // 完全没有聊天记录：主动打招呼开场
                    _proactiveTopic = '（现在主动发起对话，用符合你角色性格的方式打招呼，开始一段新的对话，不要重复之前说过的任何内容）';
                } else if (_msgCount <= 5) {
                    // 刚刚开始聊天：延续但引入新话题
                    _proactiveTopic = '（主动找一个新话题继续聊，不要重复刚才说过的内容，结合你的角色性格自然地引出新的话题方向）';
                } else if (_msgCount <= 20) {
                    // 有一定聊天基础：基于已有内容延伸或转换话题
                    _proactiveTopic = '（根据我们聊过的内容，主动延伸一个新的话题角度，或者分享你此刻的状态/心情/想法，不要重复之前说过的话）';
                } else {
                    // 聊天记录较多：主动分享新鲜事或引发互动
                    _proactiveTopic = '（主动分享你现在的状态、生活中发生的事，或者提出一个想和我聊的新话题，语气自然，不要重复之前的对话内容）';
                }
                filteredMessages.push({ role: 'user', content: _proactiveTopic });
            }
            // 替换 messages 数组
            messages.length = 0;
            filteredMessages.forEach(function(m) { messages.push(m); });
        const cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
        const endpoint = `${cleanApiUrl}/v1/chat/completions`;
            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: temp
                    })
                });
            } catch (fetchErr) {
                throw new Error(`网络连接失败，请检查API地址是否正确，以及网络是否畅通。(${fetchErr.message})`);
            }
            if (!response.ok) {
                let errMsg = `网络请求失败 (状态码: ${response.status})`;
                try {
                    const errData = await response.json();
                    if (errData && errData.error && errData.error.message) {
                        errMsg += `：${errData.error.message}`;
                    }
                } catch(e) {}
                throw new Error(errMsg);
            }
            const data = await response.json();
            const replyText = data.choices[0].message.content.trim();
            let replyArr = normalizeRoleReplyArray(replyText);

            // 命中语音概率时，若模型未给语音，强制补一条语音，避免概率失效
            if (triggerVoice) {
                const hasVoiceMessage = replyArr.some(function(item) {
                    return item && item.type === 'voice_message' && (item.content || item.transcript);
                });
                if (!hasVoiceMessage) {
                    const fallbackTextIndex = replyArr.findIndex(function(item) {
                        return item && item.type === 'text' && item.content;
                    });
                    const fallbackTextObj = fallbackTextIndex >= 0 ? replyArr[fallbackTextIndex] : null;
                    const fallbackText = fallbackTextObj && fallbackTextObj.content
                        ? String(fallbackTextObj.translation || fallbackTextObj.content).trim()
                        : '嗯，我在呢。';
                    const fallbackVoice = {
                        type: 'voice_message',
                        transcript: fallbackText,
                        durationSec: Math.max(1, Math.ceil(fallbackText.length / 3))
                    };
                    if (fallbackTextIndex >= 0) {
                        replyArr[fallbackTextIndex] = fallbackVoice;
                    } else {
                        replyArr.push(fallbackVoice);
                    }
                }
            }
            replyArr = postProcessMiniRoleReplies(replyArr, randomMsgCount, explicitActionIntent, {
                allowedTypes: allowedTypes,
                exclusiveActionType: expectedExclusiveActionType,
                suppressMoneyActions: recentRoleMoneyAction && !(explicitActionIntent && (explicitActionIntent.intentKey === 'red_packet' || explicitActionIntent.intentKey === 'transfer'))
            });

            // 逐条渲染回复：按消息长度和类型做轻微打字延迟，避免多条消息瞬间堆在一起
            for (let i = 0; i < replyArr.length; i++) {
                const msgObj = replyArr[i];
                await new Promise(function(resolve) {
                    setTimeout(resolve, getMiniRoleReplyDelayMs(msgObj, i));
                });
                // 红包、转账、处理红包/转账类型可能没有 content 字段，需要单独放行
                // 兼容 transaction 类型（AI 实际返回的转账 type）
                const noContentTypes = ['location', 'red_packet', 'transfer', 'transaction', 'handle_red_packet', 'handle_transfer', 'gift_delivery', 'gift', 'send_gift', 'takeout_delivery', 'takeaway', 'call_invite', 'call', 'video_call'];
                const hasVoiceText = (msgObj && msgObj.type === 'voice_message' && (msgObj.transcript || msgObj.content));
                if (!msgObj.content && !hasVoiceText && !noContentTypes.includes(msgObj.type)) continue;
                // 1. 处理撤回消息
                if (msgObj.type === 'recall_msg') {
                    let text = msgObj.translation ? `<div class="msg-original-text">${msgObj.content}</div><div class="msg-translate-divider"></div><div class="msg-translated-text">${msgObj.translation}</div>` : msgObj.content;
                    const tempMsgId = await appendRoleMessage(text, '', lockedContact);
                    if (tempMsgId) {
                        // 等待1.5秒后模拟真实撤回动作
                        await new Promise(res => setTimeout(res, 1500));
                        await chatListDb.messages.update(tempMsgId, { isRecalled: true });
                        if (activeChatContact && activeChatContact.id === lockedContact.id) {
                            await refreshChatWindow();
                        }
                        await updateLastChatTime(lockedContact);
                    }
                    continue;
                }
                // 2. 处理引用消息
                let quoteText = '';
                if (msgObj.type === 'reply' && msgObj.target_text) {
                    for (let j = rawMessages.length - 1; j >= 0; j--) {
                        const pureText = extractMsgPureText(rawMessages[j].content);
                        if (pureText.includes(msgObj.target_text) || rawMessages[j].content.includes(msgObj.target_text)) {
                            const qMsg = rawMessages[j];
                            const myName = document.getElementById('text-wechat-me-name') ? document.getElementById('text-wechat-me-name').textContent : '我';
                            const name = qMsg.sender === 'me' ? myName : (lockedContact.roleName || '角色');
                            quoteText = JSON.stringify({ 
                                name: name, 
                                time: qMsg.timeStr, 
                                content: extractMsgPureText(qMsg.content)
                            });
                            break;
                        }
                    }
                }
                // 3. 处理其他消息
                let finalContent = msgObj.content;
                if (msgObj.type === 'camera') {
                    finalContent = JSON.stringify({ type: 'camera', content: msgObj.content });
                } else if (msgObj.type === 'voice_message') {
                    finalContent = createMiniStructuredMessage('voice_message', {
                        transcript: msgObj.translation || msgObj.transcript || msgObj.content,
                        durationSec: msgObj.durationSec || msgObj.duration
                    });
                } else if (msgObj.type === 'emoticon') {
                    const isValid = allEmoticons.some(e => e.url === msgObj.content);
                    if (!isValid) continue; 
                    finalContent = JSON.stringify({ type: 'emoticon', desc: msgObj.desc || '表情', content: msgObj.content });
                } else if (msgObj.type === 'location') {
                    finalContent = JSON.stringify({ type: 'location', address: msgObj.address || '未知位置', distance: msgObj.distance || '' });
                } else if (msgObj.type === 'red_packet') {
                    finalContent = createMiniStructuredMessage('red_packet', {
                        amount: msgObj.amount,
                        memo: msgObj.memo || msgObj.greeting || msgObj.desc || msgObj.content,
                        status: 'unclaimed'
                    });
                } else if (msgObj.type === 'transfer' || msgObj.type === 'transaction') {
                    finalContent = createMiniStructuredMessage('transfer', {
                        amount: msgObj.amount,
                        memo: msgObj.memo || msgObj.note || msgObj.desc || msgObj.content,
                        status: 'pending'
                    });
                } else if (msgObj.type === 'handle_red_packet') {
                    // 角色领取用户发的红包
                    await _roleHandleRedPacket(lockedContact);
                    continue;
                } else if (msgObj.type === 'handle_transfer') {
                    // 角色处理用户发的转账（接收或退回）
                    await _roleHandleTransfer(lockedContact, msgObj.action || 'received');
                    continue;
                } else if (msgObj.type === 'gift_delivery' || msgObj.type === 'gift' || msgObj.type === 'send_gift') {
                    finalContent = createMiniStructuredMessage('gift_delivery', {
                        items: msgObj.items,
                        item: msgObj.item,
                        desc: msgObj.desc,
                        note: msgObj.note || msgObj.message || msgObj.desc || msgObj.content,
                        status: 'sent'
                    });
                } else if (msgObj.type === 'takeout_delivery' || msgObj.type === 'takeaway') {
                    finalContent = createMiniStructuredMessage('takeout_delivery', {
                        restaurant: msgObj.restaurant,
                        items: msgObj.items,
                        item: msgObj.item,
                        desc: msgObj.desc,
                        deliveryFee: msgObj.deliveryFee,
                        total: msgObj.total,
                        eta: msgObj.eta,
                        note: msgObj.note || msgObj.desc || msgObj.content,
                        receiver: msgObj.receiver,
                        status: msgObj.status || 'preparing'
                    });
                } else if (msgObj.type === 'call_invite' || msgObj.type === 'call' || msgObj.type === 'video_call') {
                    finalContent = createMiniStructuredMessage('call_invite', {
                        mode: msgObj.mode || (msgObj.type === 'video_call' ? 'video' : 'voice'),
                        status: msgObj.status || 'ringing',
                        note: msgObj.note || msgObj.content || ((msgObj.mode || (msgObj.type === 'video_call' ? 'video' : 'voice')) === 'video' ? '发起视频通话' : '发起语音通话')
                    });
                } else if (msgObj.translation) {
                    finalContent = `<div class="msg-original-text">${msgObj.content}</div><div class="msg-translate-divider"></div><div class="msg-translated-text">${msgObj.translation}</div>`;
                }
                await appendRoleMessage(finalContent, quoteText, lockedContact);
            }
        } catch (error) {
            console.error("触发回复出错:", error);
            if (activeChatContact && activeChatContact.id === lockedContact.id) {
                alert(error.message);
            }
        } finally {
            await _setWechatContactReplyLocked(lockedContact, false);
            updateWechatBlockedBanner();
            // 角色回复完成后，AI自主判断是否拉黑用户（5%概率触发）
            // 在 finally 中异步执行，不阻塞主流程
            checkAutoRoleBlockUser(lockedContact).catch(e => console.error('自主拉黑判断失败', e));
            // 修罗场模式：角色回复后检测是否触发WeChat账号异地登录（用户长时间不回复时）
            if (typeof window._shuraCheckAfterRoleReply === 'function') {
                window._shuraCheckAfterRoleReply(lockedContact).catch(e => console.error('[修罗场] finally触发失败', e));
            }
        }
        return true;
    }
    // ====== 角色拉黑用户系统 ======
    // 角色拉黑用户后，用户无法在 WeChat 界面发消息，只能通过信息(SMS)联系
    // 角色根据心情和上下文数量决定是否解除拉黑

    // 检查角色是否已拉黑用户（blockedByRole 字段）
    function isBlockedByRole(contact) {
        return !!(contact && contact.blockedByRole);
    }

    function flashRoleBlockedBanner() {
        const banner = document.getElementById('role-blocked-banner');
        if (banner) {
            banner.style.animation = 'none';
            banner.style.background = 'rgba(255,240,240,0.97)';
            setTimeout(() => {
                if (banner) banner.style.background = 'rgba(255,255,255,0.97)';
            }, 600);
        }
    }

    // 角色拉黑用户：标记 blockedByRole，并在聊天中插入系统提示
    async function roleBlockUser(contact) {
        if (!contact) return;
        contact.blockedByRole = true;
        await contactDb.contacts.put(contact);
        if (activeChatContact && activeChatContact.id === contact.id) {
            activeChatContact.blockedByRole = true;
        }
        // 更新聊天详情页中的拉黑状态显示
        updateRoleBlockUserBtn();
        renderChatList();
        // 在聊天窗口中插入系统提示
        const container = document.getElementById('chat-msg-container');
        const chatWindow = document.getElementById('chat-window');
        if (container && chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id) {
            const tip = document.createElement('div');
            tip.className = 'msg-recalled-tip';
            tip.innerHTML = `<span style="color:#e74c3c;font-weight:600;">${contact.roleName || '对方'}已将你拉黑，你无法在WeChat中发送消息。可通过「信息」继续联系。</span>`;
            container.appendChild(tip);
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        // 同时在聊天记录中持久化这条系统提示
        try {
            const timeStr = getAmPmTime();
            await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: JSON.stringify({ type: 'role_block_user', content: `${contact.roleName || '对方'}已将你拉黑，你无法在WeChat中发送消息。可通过「信息」继续联系。` }),
                timeStr: timeStr,
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) await chatListDb.chats.update(chat.id, { lastTime: timeStr });
        } catch(e) { console.error('拉黑系统提示持久化失败', e); }
    }

    // 角色解除拉黑用户
    async function roleUnblockUser(contact) {
        if (!contact) return;
        contact.blockedByRole = false;
        await contactDb.contacts.put(contact);
        if (activeChatContact && activeChatContact.id === contact.id) {
            activeChatContact.blockedByRole = false;
        }
        updateRoleBlockUserBtn();
        renderChatList();
        // 在聊天窗口中插入解除提示
        const container = document.getElementById('chat-msg-container');
        const chatWindow = document.getElementById('chat-window');
        if (container && chatWindow && chatWindow.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id) {
            const tip = document.createElement('div');
            tip.className = 'msg-recalled-tip';
            tip.innerHTML = `<span style="color:#27ae60;font-weight:600;">${contact.roleName || '对方'}已解除对你的拉黑，你可以在WeChat中正常发送消息了。</span>`;
            container.appendChild(tip);
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        // 持久化解除提示
        try {
            const timeStr = getAmPmTime();
            await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'system',
                content: JSON.stringify({ type: 'role_unblock_user', content: `${contact.roleName || '对方'}已解除对你的拉黑，你可以在WeChat中正常发送消息了。` }),
                timeStr: timeStr,
                quoteText: '',
                isSystemTip: true,
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) await chatListDb.chats.update(chat.id, { lastTime: timeStr });
        } catch(e) { console.error('解除拉黑系统提示持久化失败', e); }
        // 核心修复：解除拉黑后立即更新WeChat聊天界面横幅（移除横幅、恢复输入框）
        if (activeChatContact && activeChatContact.id === contact.id) {
            updateWechatBlockedBanner();
        }
    }

    // updateRoleBlockUserBtn 保留为空函数以防其他地方调用（不再需要UI按钮）
    function updateRoleBlockUserBtn() {
        // 角色拉黑用户按钮已移除，此函数保留为空
    }

    // ====== 角色自主拉黑用户系统（AI自动判断）======
    // 每次角色在WeChat回复后，以5%概率触发AI判断是否拉黑用户
    // 判断基于角色人设 + 最近对话内容
    async function checkAutoRoleBlockUser(lockedContact) {
        if (!lockedContact) return;
        // 已经拉黑了就不再重复判断
        if (isBlockedByRole(lockedContact)) return;
        // 5%概率触发判断（避免每条消息都调用API）
        if (Math.random() > 0.05) return;
        try {
            const apiUrl = await localforage.getItem('miffy_api_url');
            const apiKey = await localforage.getItem('miffy_api_key');
            const model = await localforage.getItem('miffy_api_model');
            const temp = parseFloat(await localforage.getItem('miffy_api_temp')) || 0.7;
            if (!apiUrl || !apiKey || !model) return;
            const ctxLimit = await readMiniCtxLimit(20);
            const allMsgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(lockedContact.id).toArray());
            // 至少有5条消息才考虑拉黑（太少的对话不够判断）
            if (allMsgs.length < 5) return;
            const recentMsgs = allMsgs.slice(-ctxLimit);
            const chatText = recentMsgs.map(m => {
                const sender = m.sender === 'me' ? '用户' : (lockedContact.roleName || '角色');
                return sender + '：' + extractMsgPureText(m.content);
            }).join('\n');
            const detail = lockedContact.roleDetail || '';
            const judgeMessages = [
                {
                    role: 'system',
                    content: `你是${lockedContact.roleName || '角色'}，请根据以下最近的对话内容和你的角色设定，判断你现在是否想拉黑用户（即彻底不想在WeChat上和他说话，让他只能通过短信联系你）。\n角色设定：${detail}\n\n【判断规则】\n- 只有在用户严重惹怒你、冷漠伤害你、或者你的角色性格决定了在这种情况下会拉黑对方时，才回答YES\n- 大多数情况应该回答NO，拉黑是极端情况\n- 概率控制：只有约10%的极端情况下才应该拉黑\n- 只需回答 YES（拉黑）或 NO（不拉黑），不要有任何其他内容`
                },
                {
                    role: 'user',
                    content: `以下是最近的对话记录：\n\n${chatText}\n\n请问你是否想拉黑用户？（只回答YES或NO）`
                }
            ];
            const cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            const endpoint = `${cleanApiUrl}/v1/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: judgeMessages, temperature: temp, max_tokens: 10 })
            });
            if (!response.ok) return;
            const data = await response.json();
            const answer = (data.choices[0].message.content || '').trim().toUpperCase();
            if (answer.startsWith('YES') || answer === 'Y') {
                // 角色决定拉黑用户
                // 先刷新联系人数据（防止使用过时的对象）
                const freshContact = await contactDb.contacts.get(lockedContact.id);
                if (freshContact && !isBlockedByRole(freshContact)) {
                    await roleBlockUser(freshContact);
                    // 更新锁定联系人的状态
                    lockedContact.blockedByRole = true;
                    // 更新 activeChatContact
                    if (activeChatContact && activeChatContact.id === lockedContact.id) {
                        activeChatContact.blockedByRole = true;
                        updateWechatBlockedBanner();
                    }
                }
            }
        } catch(e) {
            console.error('角色自主拉黑判断失败', e);
        }
    }

    // 在 WeChat 聊天输入区同步角色拉黑状态，并显示提示条
    function updateWechatBlockedBanner() {
        const input = document.getElementById('chat-input-main');
        const banner = document.getElementById('role-blocked-banner');
        if (!input) return;
        if (!activeChatContact || !isBlockedByRole(activeChatContact)) {
            input.placeholder = '输入消息...';
            input.disabled = false;
            input.style.color = '';
            input.style.cursor = '';
            if (banner) {
                banner.style.display = 'none';
                banner.textContent = '';
            }
        } else {
            const displayName = activeChatContact.roleName || '对方';
            input.placeholder = `${displayName}已将你拉黑，无法发送`;
            input.disabled = true;
            input.style.color = '#e74c3c';
            input.style.cursor = 'not-allowed';
            if (banner) {
                banner.textContent = `${displayName}已将你拉黑，请先通过短信沟通`;
                banner.style.display = 'flex';
            }
        }
    }

    // 角色通过 SMS 与用户对话后，根据心情和上下文数量决定是否解除拉黑
    // 此函数在 SMS 角色回复完成后调用
    async function checkRoleUnblockAfterSmsReply(contact, apiUrl, apiKey, model, temp, ctxLimit) {
        if (!contact || !isBlockedByRole(contact)) return;
        const normalizedCtxLimit = normalizeMiniCtxLimit(ctxLimit, 20);
        // 获取 SMS 上下文数量
        const allSmsMsgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
        const smsMsgs = allSmsMsgs.filter(m => m.source === 'sms' || !m.source);
        const smsCount = smsMsgs.length;
        // 至少要有3条 SMS 消息才考虑解除拉黑
        if (smsCount < 3) return;
        if (!apiUrl || !apiKey || !model) return;
        // 构造判断 prompt：让角色根据心情和对话内容决定是否解除拉黑
        const ctxMessages = smsMsgs.slice(-normalizedCtxLimit);
        const chatText = ctxMessages.map(m => {
            const sender = m.sender === 'me' ? '用户' : (contact.roleName || '角色');
            return sender + '：' + extractMsgPureText(m.content);
        }).join('\n');
        const detail = contact.roleDetail || '';
        const judgeMessages = [
            {
                role: 'system',
                content: `你是${contact.roleName || '角色'}，你现在处于"拉黑了用户"的状态。请根据以下对话内容和你的角色心情，判断你是否愿意解除对用户的拉黑。\n角色设定：${detail}\n\n【判断规则】\n- 如果用户态度诚恳、道歉或表达了真诚的情感，你可能会解除拉黑\n- 如果用户态度冷漠、无所谓或没有任何改变，你应该继续保持拉黑\n- 你的决定完全基于角色心情和对话内容\n- 只需回答 YES（解除拉黑）或 NO（继续拉黑），不要有任何其他内容`
            },
            {
                role: 'user',
                content: `以下是你被拉黑后通过短信的对话记录（共${smsCount}条）：\n\n${chatText}\n\n请问你是否愿意解除对用户的拉黑？（只回答YES或NO）`
            }
        ];
        try {
            const cleanApiUrl = apiUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            const endpoint = `${cleanApiUrl}/v1/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: judgeMessages, temperature: temp, max_tokens: 10 })
            });
            if (!response.ok) return;
            const data = await response.json();
            const answer = (data.choices[0].message.content || '').trim().toUpperCase();
            if (answer.startsWith('YES') || answer === 'Y') {
                // 角色决定解除拉黑
                await roleUnblockUser(contact);
                // 在 WeChat 聊天中发送解除拉黑通知消息（而非SMS）
                const timestamp = Date.now();
                const timeStr = getAmPmTime();
                const unblockMsg = `我已经解除了对你的拉黑，你现在可以在WeChat上给我发消息了。`;
                const newMsgId = await chatListDb.messages.add({
                    contactId: contact.id,
                    sender: 'role',
                    content: unblockMsg,
                    timestamp: timestamp,
                    timeStr: timeStr,
                    quoteText: '',
                    source: 'wechat'
                });
                const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
                if (chat) await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList();
                // 如果 WeChat 聊天窗口打开，实时渲染这条消息
                const chatWin = document.getElementById('chat-window');
                if (chatWin && chatWin.style.display === 'flex' && activeChatContact && activeChatContact.id === contact.id) {
                    const container = document.getElementById('chat-msg-container');
                    if (container) {
                        const myAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.userAvatar) : (contact.userAvatar || '');
                        const roleAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.roleAvatar) : (contact.roleAvatar || '');
                        const msgObj = { id: newMsgId, sender: 'role', content: unblockMsg, timeStr, quoteText: '' };
                        container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
                        bindMsgEvents();
                        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                    }
                    updateWechatBlockedBanner();
                } else {
                    // WeChat 聊天窗口未打开，显示横幅通知
                    const roleAvatar = contact.roleAvatar || '';
                    showNotificationBanner(roleAvatar, contact.roleName || '对方', unblockMsg, timeStr, contact.id);
                }
            }
        } catch(e) { console.error('角色解除拉黑判断失败', e); }
    }

    async function performSendMessage() {
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        const input = document.getElementById('chat-input-main');
        const content = input.value.trim();
        if (!content) {
            await triggerRoleReply(contact);
            return;
        }
        // 【注意】如果角色已拉黑用户，WeChat 中无法发消息
        if (isBlockedByRole(contact)) {
            flashRoleBlockedBanner();
            return;
        }
        // 【注意】如果联系人处于被拉黑状态，发消息不触发自动回复
        const _contactIsBlocked = !!contact.blocked;
        const container = document.getElementById('chat-msg-container');
        const myAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.userAvatar) : (contact.userAvatar || '');
        const roleAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(contact.roleAvatar) : (contact.roleAvatar || '');
        const timestamp = Date.now();
        const timeStr = getAmPmTime();
        // 处理引用文本 (打包为 JSON 格式存储以便渲染)
        let quoteText = '';
        if (currentQuoteMsgId) {
            const qMsg = await chatListDb.messages.get(currentQuoteMsgId);
            if (qMsg) {
                const myName = document.getElementById('text-wechat-me-name') ? document.getElementById('text-wechat-me-name').textContent : '我';
                const name = qMsg.sender === 'me' ? myName : (contact.roleName || '角色');
                const shortTime = qMsg.timeStr ? qMsg.timeStr.replace(' CST', '') : '';
                quoteText = JSON.stringify({ 
                    name: name, 
                    time: shortTime, 
                    content: extractMsgPureText(qMsg.content)
                });
            }
            cancelQuote();
        }
        try {
            const newMsgId = await chatListDb.messages.add({
                contactId: contact.id,
                sender: 'me',
                content: content,
                timestamp: timestamp,
                timeStr: timeStr,
                quoteText: quoteText,
                source: 'wechat'
            });
            const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
            if (chat) {
                await chatListDb.chats.update(chat.id, { lastTime: timeStr });
                renderChatList(); 
            }
            const msgObj = { id: newMsgId, sender: 'me', content: content, timeStr: timeStr, quoteText: quoteText };
            container.insertAdjacentHTML('beforeend', generateMsgHtml(msgObj, myAvatar, roleAvatar));
            bindMsgEvents();
            input.value = '';
            autoGrowTextarea(input);
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            // 修罗场模式：用户发消息时重置沉默计时器
            if (typeof window._shuraOnUserSendMsg === 'function') {
                window._shuraOnUserSendMsg(contact.id);
            }
            // 【注意】角色不自动回复普通消息。被拉黑状态下也不触发自动回复。
            // 只有在非拉黑状态且调用 triggerRoleReply 时才会触发回复。
            // triggerRoleReply(); // 已禁用，角色不自动回复
        } catch (e) {
            console.error("保存消息失败", e);
        }
    }
    // ====== 气泡长按与快捷菜单逻辑 ======
    function bindMsgEvents() {
        const bubbles = document.querySelectorAll('.msg-content-touch');
        const rows = document.querySelectorAll('.chat-msg-row');
        const panel = document.getElementById('msg-action-panel');
        if (panel) panel.style.display = 'none';
        bubbles.forEach(bubble => {
            bubble.removeEventListener('touchstart', handleTouchStart);
            bubble.removeEventListener('touchend', handleTouchEnd);
            bubble.removeEventListener('touchmove', handleTouchMove);
            bubble.removeEventListener('contextmenu', handleContextMenu);
            bubble.addEventListener('touchstart', handleTouchStart, {passive: true});
            bubble.addEventListener('touchend', handleTouchEnd);
            bubble.addEventListener('touchmove', handleTouchMove, {passive: true});
            bubble.addEventListener('contextmenu', handleContextMenu);
        });
        rows.forEach(function(row) {
            if (row._multiSelectClickBound) return;
            row._multiSelectClickBound = true;
            row.addEventListener('click', function(e) {
                if (!multiSelectMode) return;
                const safeClosest = window.safeClosestTarget || function(target, selector) {
                    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
                };
                if (safeClosest(e.target, '.msg-checkbox')) return;
                const msgId = parseInt(row.getAttribute('data-id'), 10);
                if (!Number.isFinite(msgId)) return;
                e.preventDefault();
                e.stopPropagation();
                toggleMsgCheck(msgId);
            }, true);
        });
        // 转发聊天记录卡片：统一走容器级事件委托，避免逐卡片解绑/重绑产生冲突
        const chatContainer = document.getElementById('chat-msg-container');
        if (chatContainer && !chatContainer._forwardCardDelegatedBound) {
            chatContainer._forwardCardDelegatedBound = true;
            chatContainer.addEventListener('click', function(e) {
                const safeClosest = window.safeClosestTarget || function(target, selector) {
                    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
                };
                const card = safeClosest(e.target, '.chat-forward-card');
                if (!card) return;
                const forwardMsgIdRaw = card.getAttribute('data-forward-msg-id')
                    || (card.dataset ? card.dataset.forwardMsgId : '');
                // 多选模式由 chat-msg-row 捕获阶段统一处理勾选，不再重复切换
                if (multiSelectMode) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                if (!forwardMsgIdRaw) {
                    return;
                }
                Promise.resolve(window.openWechatForwardCardDetail(forwardMsgIdRaw)).catch(function(err) {
                    console.error('打开转发聊天记录详情失败', err);
                });
            });
        }
        // 绑定角色消息头像点击 → 打开心声面板
        document.querySelectorAll('.chat-msg-row.msg-left .chat-msg-avatar').forEach(function(avatarEl) {
            if (!avatarEl._hvBound) {
                avatarEl._hvBound = true;
                avatarEl.style.cursor = 'pointer';
                avatarEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (typeof openHeartVoice === 'function') openHeartVoice();
                });
            }
        });
    }
    function handleTouchStart(e) {
        if (multiSelectMode) return;
        const safeClosest = window.safeClosestTarget || function(target, selector) {
            return target && typeof target.closest === 'function' ? target.closest(selector) : null;
        };
        const row = safeClosest(e.target, '.chat-msg-row');
        if (!row) return;
        const msgId = parseInt(row.getAttribute('data-id'));
        const sender = row.getAttribute('data-sender');
        
        // 新增：清除可能残留的定时器，防止冲突
        if (longPressTimer) clearTimeout(longPressTimer);
        
        longPressTimer = setTimeout(() => {
            showMsgActionPanel(safeClosest(e.target, '.msg-content-touch'), msgId, sender);
        }, 500);
    }

    function handleTouchEnd() { clearTimeout(longPressTimer); }
    function handleTouchMove() { clearTimeout(longPressTimer); }
    function handleContextMenu(e) {
        e.preventDefault(); 
        if (multiSelectMode) return;
        const safeClosest = window.safeClosestTarget || function(target, selector) {
            return target && typeof target.closest === 'function' ? target.closest(selector) : null;
        };
        const row = safeClosest(e.target, '.chat-msg-row');
        if (!row) return;
        const msgId = parseInt(row.getAttribute('data-id'));
        const sender = row.getAttribute('data-sender');
        showMsgActionPanel(safeClosest(e.target, '.msg-content-touch'), msgId, sender);
    }
    // 点击空白处隐藏面板
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('msg-action-panel');
        const safeClosest = window.safeClosestTarget || function(target, selector) {
            return target && typeof target.closest === 'function' ? target.closest(selector) : null;
        };
        if (panel && safeClosest(e.target, '#msg-action-panel') === null && !safeClosest(e.target, '.msg-content-touch')) {
            panel.style.display = 'none';
        }
    });
    // 修复：滑动聊天容器时隐藏快捷面板（包裹在 DOMContentLoaded 内，防止元素不存在时报错）
    document.addEventListener('DOMContentLoaded', () => {
        const chatMsgContainerForScroll = document.getElementById('chat-msg-container');
        if (chatMsgContainerForScroll) {
            chatMsgContainerForScroll.addEventListener('scroll', () => {
                const panel = document.getElementById('msg-action-panel');
                if (panel && panel.style.display === 'block') {
                    panel.style.display = 'none';
                }
            }, { passive: true });
        }
    });
    function showMsgActionPanel(bubbleEl, msgId, sender) {
        if (!bubbleEl) return;
        currentLongPressMsgId = msgId;
        currentLongPressMsgSender = sender;
        const panel = document.getElementById('msg-action-panel');
        const recallDelBtn = document.getElementById('msg-action-recall-del');
        const rollbackBtn = document.getElementById('msg-action-rollback');
        const rewindBtn = document.getElementById('msg-action-rewind');
        // 动态判断是撤回还是删除
        if (sender === 'me') {
            recallDelBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>撤回';
        } else {
            recallDelBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>删除';
        }
        if (rollbackBtn) rollbackBtn.classList.remove('is-disabled');
        if (rewindBtn) rewindBtn.classList.toggle('is-disabled', sender !== 'role');
        panel.style.opacity = '0';
        panel.style.display = 'block';
        const rect = bubbleEl.getBoundingClientRect();
        const anchorHost = bubbleEl.closest('#chat-window') || panel.offsetParent || document.body;
        const hostRect = anchorHost.getBoundingClientRect();
        const hostWidth = anchorHost.clientWidth || window.innerWidth;
        const hostHeight = anchorHost.clientHeight || window.innerHeight;
        const panelWidth = panel.offsetWidth || 204;
        const panelHeight = panel.offsetHeight || 120;
        let finalX = (rect.left - hostRect.left) + ((rect.width - panelWidth) / 2);
        if (finalX < 7) finalX = 7;
        if (finalX + panelWidth > hostWidth - 7) finalX = hostWidth - panelWidth - 7;
        const topY = (rect.top - hostRect.top) - panelHeight - 4;
        const bottomY = (rect.bottom - hostRect.top) + 4;
        let finalY = topY;
        if (topY < 8) {
            finalY = bottomY;
        }
        if (finalY + panelHeight > hostHeight - 8) {
            finalY = Math.max(8, topY);
        }
        if (finalY < 8) finalY = 8;
        panel.style.left = finalX + 'px';
        panel.style.top = finalY + 'px';
        // 核心修复：坐标计算完毕且定位贴合后，恢复透明度瞬间显示
        panel.style.opacity = '1';
    }
    async function handleMsgAction(action) {
        document.getElementById('msg-action-panel').style.display = 'none';
        const msgId = currentLongPressMsgId;
        if (!msgId) return;
        const msg = await chatListDb.messages.get(msgId);
        if (!msg) return;
        if (action === 'copy') {
            navigator.clipboard.writeText(extractMsgPureText(msg.content));
        } else if (action === 'edit') {
            try {
                if (JSON.parse(msg.content).type) {
                    alert('语音、图片等特殊消息不支持编辑');
                    return;
                }
            } catch(e) {}
            if (msg.content.includes('msg-original-text')) {
                alert('翻译双语消息不支持编辑');
                return;
            }
            document.getElementById('msg-edit-content').value = msg.content;
            document.getElementById('msg-edit-modal').style.display = 'flex';
        } else if (action === 'quote') {
            currentQuoteMsgId = msgId;
            const myName = document.getElementById('text-wechat-me-name') ? document.getElementById('text-wechat-me-name').textContent : '我';
            const name = msg.sender === 'me' ? myName : (activeChatContact.roleName || '角色');
            document.getElementById('quote-reply-text').textContent = `回复 ${name}：${extractMsgPureText(msg.content)}`;
            document.getElementById('quote-reply-box').style.display = 'flex';
        } else if (action === 'favorite') {
            await favoriteMessagesByIds([msgId]);
        } else if (action === 'multi') {
            enterMultiSelectMode();
            selectedMsgIds.add(msgId);
            updateMsgCheckboxes();
        } else if (action === 'recall_del') {
            if (msg.sender === 'me') {
                await chatListDb.messages.update(msgId, { isRecalled: true });
            } else {
                await chatListDb.messages.delete(msgId);
            }
            await refreshChatWindow();
            updateLastChatTime();
        } else if (action === 'rollback') {
            if (await window.showMiniConfirm('确定要回溯到这条消息吗？这会保留这条消息，并删除它之后的所有线上消息。')) {
                const success = await rollbackChatAfterMessage(msgId);
                if (!success) {
                    alert('回溯失败，未找到可处理的消息');
                }
            }
        } else if (action === 'rewind') {
            if (currentLongPressMsgSender !== 'role') return;
            if (await window.showMiniConfirm('确定要重回这轮角色回复吗？这会删除这一轮及其后的线上对话，并重新生成回复。')) {
                await rewindRoleReplyFromMessage(msgId);
            }
        }
    }
    // 辅助刷新功能
    async function refreshChatWindow() {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow.style.display !== 'flex') return;
        const container = document.getElementById('chat-msg-container');
        container.innerHTML = '';
        const allMessages = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray());
        // 【聊天隔离】刷新时也必须排除 SMS 消息
        const messages = allMessages.filter(m => m.source !== 'sms');
        const myAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(activeChatContact.userAvatar) : (activeChatContact.userAvatar || '');
        const roleAvatar = typeof window.getSafeAvatarSrc === 'function' ? window.getSafeAvatarSrc(activeChatContact.roleAvatar) : (activeChatContact.roleAvatar || '');
        messages.forEach(msg => {
            container.insertAdjacentHTML('beforeend', generateMsgHtml(msg, myAvatar, roleAvatar));
        });
        bindMsgEvents();
        if (typeof syncActiveChatReplyUi === 'function') {
            await syncActiveChatReplyUi();
        }
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 10);
    }
    async function updateLastChatTime(targetContact = null) {
        const contact = targetContact || activeChatContact;
        if (!contact) return;
        const msgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(contact.id).toArray());
        const chat = await chatListDb.chats.where('contactId').equals(contact.id).first();
        if (chat) {
            if (msgs.length > 0) {
                const lastMsg = msgs[msgs.length - 1];
                await chatListDb.chats.update(chat.id, { lastTime: lastMsg.timeStr });
            } else {
                await chatListDb.chats.update(chat.id, { lastTime: '' });
            }
            renderChatList();
        }
    }
    // 编辑与撤回查看功能
    function closeMsgEditModal() { document.getElementById('msg-edit-modal').style.display = 'none'; }
    async function saveMsgEdit() {
        const newContent = document.getElementById('msg-edit-content').value.trim();
        if (newContent && currentLongPressMsgId) {
            await chatListDb.messages.update(currentLongPressMsgId, { content: newContent });
            closeMsgEditModal();
            await refreshChatWindow();
        }
    }
    async function viewRecalledMsg(msgId) {
        const msg = await chatListDb.messages.get(msgId);
        if (msg) {
            let displayHtml = msg.content;
            const structured = parseMiniStructuredPayload(msg.content);
            if (structured) {
                displayHtml = extractMsgPureText(msg.content);
            }
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.type === 'voice_message' && !structured) displayHtml = '[语音] ' + (parsed.content || '');
                else if (parsed.type === 'camera') displayHtml = '[相片] ' + (parsed.content || '');
                else if (parsed.type === 'image') displayHtml = '[图片]';
                else if (!structured) displayHtml = parsed.content || msg.content;
            } catch(e) {}
            document.getElementById('msg-recall-content').innerHTML = displayHtml;
            document.getElementById('msg-recall-modal').style.display = 'flex';
        }
    }
    function closeMsgRecallModal() { document.getElementById('msg-recall-modal').style.display = 'none'; }
    function cancelQuote() {
        currentQuoteMsgId = null;
        document.getElementById('quote-reply-box').style.display = 'none';
    }
    // ====== 发送图片功能逻辑 ======
    async function sendChatImage(event) {
        const file = event.target.files[0];
        if (!file) return;
        hideChatExtPanel();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Img = e.target.result;
            const content = JSON.stringify({ type: "image", content: base64Img });
            try {
                await appendCurrentUserMessageContent(content, contact);
            } catch (err) {
                console.error("保存图片消息失败", err);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = ''; // 清空选择
    }
    // ====== 相机功能逻辑 ======
    function openCameraModal() {
        hideChatExtPanel();
        cameraModalTarget = 'chat';
        document.getElementById('camera-desc-input').value = '';
        document.getElementById('camera-modal').style.display = 'flex';
    }
    function closeCameraModal() {
        document.getElementById('camera-modal').style.display = 'none';
        cameraModalTarget = 'chat';
    }
    async function sendCameraPhoto() {
        const desc = document.getElementById('camera-desc-input').value.trim();
        if (!desc) {
            alert('请描述拍摄内容');
            return;
        }
        closeCameraModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        // 严格遵循 JSON 格式入库
        const content = JSON.stringify({ type: "camera", content: desc });
        await appendCurrentUserMessageContent(content, contact);
        // 【注意】相机发送不触发角色自动回复
    }
    // ====== 语音功能逻辑 ======
    function openVoiceModal() {
        hideChatExtPanel();
        document.getElementById('voice-content-input').value = '';
        document.getElementById('voice-modal').style.display = 'flex';
    }
    function closeVoiceModal() {
        document.getElementById('voice-modal').style.display = 'none';
    }
    async function sendVoiceMessage() {
        const text = document.getElementById('voice-content-input').value.trim();
        if (!text) {
            alert('请输入语音内容');
            return;
        }
        closeVoiceModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        const content = createMiniStructuredMessage('voice_message', { transcript: text });
        await appendCurrentUserMessageContent(content, contact);
        // 【注意】语音发送不触发角色自动回复。只有通话邀请这类动作才触发。
    }
    function openChatHtmlStageFeature() {
        hideChatExtPanel();
        showWechatMessageToast('HTML小剧场暂未开放');
    }
    function openChatSuperpowerFeature() {
        hideChatExtPanel();
        showWechatMessageToast('超能力暂未开放');
    }
    let currentCallComposerMode = 'voice';
    function openGiftModal() {
        hideChatExtPanel();
        document.getElementById('gift-item-input').value = '';
        document.getElementById('gift-desc-input').value = '';
        document.getElementById('gift-note-input').value = '';
        document.getElementById('gift-modal').style.display = 'flex';
    }
    function closeGiftModal() {
        document.getElementById('gift-modal').style.display = 'none';
    }
    async function sendGiftDelivery() {
        const itemName = document.getElementById('gift-item-input').value.trim();
        const itemDesc = document.getElementById('gift-desc-input').value.trim();
        const note = document.getElementById('gift-note-input').value.trim();
        if (!itemName) {
            alert('请输入礼物名称');
            return;
        }
        closeGiftModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        const content = createMiniStructuredMessage('gift_delivery', {
            items: [{ name: itemName, desc: itemDesc, qty: 1 }],
            note: note || '送你一份小心意',
            status: 'sent'
        });
        await appendCurrentUserMessageContent(content, contact);
    }
    function openTakeoutModal() {
        hideChatExtPanel();
        document.getElementById('takeout-restaurant-input').value = '';
        document.getElementById('takeout-item-input').value = '';
        document.getElementById('takeout-total-input').value = '';
        document.getElementById('takeout-eta-input').value = '';
        document.getElementById('takeout-note-input').value = '';
        document.getElementById('takeout-modal').style.display = 'flex';
    }
    function closeTakeoutModal() {
        document.getElementById('takeout-modal').style.display = 'none';
    }
    async function sendTakeoutDelivery() {
        const restaurant = document.getElementById('takeout-restaurant-input').value.trim();
        const itemName = document.getElementById('takeout-item-input').value.trim();
        const total = document.getElementById('takeout-total-input').value.trim();
        const eta = document.getElementById('takeout-eta-input').value.trim();
        const note = document.getElementById('takeout-note-input').value.trim();
        if (!itemName) {
            alert('请输入餐品名称');
            return;
        }
        closeTakeoutModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        const content = createMiniStructuredMessage('takeout_delivery', {
            restaurant: restaurant || '暖心外卖',
            items: [{ name: itemName, qty: 1, price: total || '' }],
            total: total || '0.00',
            eta: eta || '尽快送达',
            note: note || '给你点了外卖',
            status: 'preparing'
        });
        await appendCurrentUserMessageContent(content, contact);
    }
    function openCallComposerModal(mode) {
        hideChatExtPanel();
        currentCallComposerMode = mode === 'video' ? 'video' : 'voice';
        document.getElementById('call-note-input').value = '';
        document.getElementById('call-composer-title').textContent = currentCallComposerMode === 'video' ? '发起视频通话' : '发起语音通话';
        document.getElementById('call-composer-modal').style.display = 'flex';
    }
    function closeCallComposerModal() {
        document.getElementById('call-composer-modal').style.display = 'none';
    }
    async function sendCallInvite() {
        const note = document.getElementById('call-note-input').value.trim();
        closeCallComposerModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        const content = createMiniStructuredMessage('call_invite', {
            mode: currentCallComposerMode,
            status: 'ringing',
            note: note || (currentCallComposerMode === 'video' ? '发起视频通话' : '发起语音通话')
        });
        const newMsgId = await appendCurrentUserMessageContent(content, contact);
        if (newMsgId) await triggerRoleReply(contact);
    }
    // ====== 定位功能逻辑 ======
    function openLocationModal() {
        hideChatExtPanel();
        document.getElementById('location-address-input').value = '';
        document.getElementById('location-distance-input').value = '';
        document.getElementById('location-modal').style.display = 'flex';
    }
    function closeLocationModal() {
        document.getElementById('location-modal').style.display = 'none';
    }
    async function sendLocationMessage() {
        const address = document.getElementById('location-address-input').value.trim();
        let distance = document.getElementById('location-distance-input').value.trim();
        if (!address) {
            alert('请输入具体地址');
            return;
        }
        // 自动补齐“距离你”前缀
        if (distance && !distance.startsWith('距离你')) {
            distance = `距离你 ${distance}`;
        }
        closeLocationModal();
        const contact = activeChatContact;
        if (!contact || isWechatContactReplyLocked(contact)) return;
        // 严格遵循 JSON 格式
        const content = JSON.stringify({ type: "location", address: address, distance: distance });
        await appendCurrentUserMessageContent(content, contact);
        // 【注意】定位发送不触发角色自动回复。只有通话邀请这类动作才触发。
    }
    // 控制语音展开与波纹动画，并接入 MiniMax 语音播放
    async function toggleVoiceText(element) {
        const expandArea = element.querySelector('.voice-expand-area');
        const waves = element.querySelector('.voice-waves');
        const voiceTextEl = element.querySelector('.voice-text-content');
        if (!expandArea || !waves) return;
        if (expandArea.style.display === 'flex') {
            expandArea.style.display = 'none';
            waves.classList.add('paused');
            element.classList.remove('expanded');
            if (typeof stopMiniMaxAudioPlayback === 'function') {
                stopMiniMaxAudioPlayback();
            }
        } else {
            expandArea.style.display = 'flex';
            waves.classList.remove('paused');
            element.classList.add('expanded');
            const text = voiceTextEl ? voiceTextEl.textContent.trim() : '';
            if (text && typeof playMiniMaxVoiceFromText === 'function') {
                await playMiniMaxVoiceFromText(text, element);
            }
        }
    }
    // ====== 多选模式功能 ======
    function enterMultiSelectMode() {
        multiSelectMode = true;
        selectedMsgIds.clear();
        document.getElementById('chat-msg-container').classList.add('multi-select-mode');
        document.getElementById('multi-select-bar').style.display = 'flex';
        document.querySelector('.chat-footer').style.display = 'none'; 
    }
    function exitMultiSelectMode() {
        multiSelectMode = false;
        selectedMsgIds.clear();
        const container = document.getElementById('chat-msg-container');
        if(container) container.classList.remove('multi-select-mode');
        document.getElementById('multi-select-bar').style.display = 'none';
        document.querySelector('.chat-footer').style.display = 'flex'; 
        closeWechatForwardModal();
        updateMsgCheckboxes();
    }
    function toggleMsgCheck(msgId) {
        if (!multiSelectMode) return;
        if (selectedMsgIds.has(msgId)) selectedMsgIds.delete(msgId);
        else selectedMsgIds.add(msgId);
        updateMsgCheckboxes();
    }
    function updateMsgCheckboxes() {
        const rows = Array.from(document.querySelectorAll('.chat-msg-row')).filter(function(row) {
            return Number.isFinite(parseInt(row.getAttribute('data-id'), 10));
        });
        const selectAllText = document.getElementById('multi-select-all-text');
        rows.forEach(row => {
            const id = parseInt(row.getAttribute('data-id'));
            const cb = row.querySelector('.msg-checkbox');
            if (cb) {
                if (selectedMsgIds.has(id)) cb.classList.add('checked');
                else cb.classList.remove('checked');
            }
        });
        if (selectAllText) {
            selectAllText.textContent = rows.length > 0 && selectedMsgIds.size === rows.length ? '取消全选' : '全选';
        }
    }
    async function toggleSelectAllMsg() {
        const rows = Array.from(document.querySelectorAll('.chat-msg-row')).filter(function(row) {
            return Number.isFinite(parseInt(row.getAttribute('data-id'), 10));
        });
        if (selectedMsgIds.size === rows.length) {
            selectedMsgIds.clear(); 
        } else {
            rows.forEach(row => { selectedMsgIds.add(parseInt(row.getAttribute('data-id'))); });
        }
        updateMsgCheckboxes();
    }
    async function deleteSelectedMsgs() {
        if (selectedMsgIds.size === 0) return;
        if (await window.showMiniConfirm(`确定要删除选中的 ${selectedMsgIds.size} 条消息吗？`)) {
            // 修复：多选删除时，同时删除系统小字（撤回提示、系统提示等）中被选中的条目
            // selectedMsgIds 中的 id 可能包含系统消息（isRecalled/isSystemTip），一并删除
            await chatListDb.messages.bulkDelete(Array.from(selectedMsgIds));
            exitMultiSelectMode();
            await refreshChatWindow();
            updateLastChatTime();
        }
    }

    const WECHAT_FAVORITE_STORAGE_KEY = 'wechat_favorite_messages_v1';
    let _wechatFavoriteRecordsCache = [];
    let _wechatFavoriteMultiSelectMode = false;
    let _wechatFavoriteSelectedIds = new Set();
    let _wechatForwardModalContacts = [];
    let _wechatForwardTargetContactId = '';
    let _wechatForwardSending = false;

    function _normalizeWechatForwardMsgIds() {
        return Array.from(selectedMsgIds).map(function(id) {
            return parseInt(id, 10);
        }).filter(function(id) {
            return Number.isFinite(id);
        });
    }

    function _sortWechatForwardMessagesByTimeline(messages) {
        return (Array.isArray(messages) ? messages : []).slice().sort(function(a, b) {
            const aTs = Number(a && a.timestamp) || 0;
            const bTs = Number(b && b.timestamp) || 0;
            if (aTs !== bTs) return aTs - bTs;
            const aId = parseInt(a && a.id, 10);
            const bId = parseInt(b && b.id, 10);
            if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
            return 0;
        });
    }

    async function _renderWechatForwardContactList() {
        const listEl = document.getElementById('wechat-forward-contact-list');
        if (!listEl) return;
        if (!_wechatForwardModalContacts.length) {
            listEl.innerHTML = '<div style="font-size:12px; color:#a7a7a7; text-align:center; padding:12px 0;">暂无可转发对象</div>';
            return;
        }
        const rows = await Promise.all(_wechatForwardModalContacts.map(async function(contact) {
            const contactId = String(contact && contact.id != null ? contact.id : '');
            const encodedId = encodeURIComponent(contactId);
            const name = await _getWechatFavoriteContactName(contactId, contact && contact.roleName ? contact.roleName : '角色');
            const isSelected = _wechatForwardTargetContactId === contactId;
            const avatar = _getWechatFavoriteAvatarSrc(contact && contact.roleAvatar ? contact.roleAvatar : '');
            return '' +
                '<div class="wechat-forward-contact-item' + (isSelected ? ' is-selected' : '') + '" onclick="selectWechatForwardTarget(\'' + encodedId + '\')">' +
                    '<div class="wechat-forward-contact-avatar"><img src="' + _escapeWechatFavoriteHtml(avatar) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + _escapeWechatFavoriteHtml(window.defaultAvatarDataUri || whitePixel) + '\';"></div>' +
                    '<div class="wechat-forward-contact-name">' + _escapeWechatFavoriteHtml(name) + '</div>' +
                    '<div class="wechat-forward-contact-check"></div>' +
                '</div>';
        }));
        listEl.innerHTML = rows.join('');
    }

    async function openWechatForwardModal() {
        if (!activeChatContact) return;
        const selectedIds = _normalizeWechatForwardMsgIds();
        if (!selectedIds.length) {
            showWechatMessageToast('请先选择消息');
            return;
        }
        const modal = document.getElementById('wechat-forward-modal');
        if (!modal) return;
        const contacts = await contactDb.contacts.toArray();
        _wechatForwardModalContacts = (Array.isArray(contacts) ? contacts : []).filter(function(contact) {
            return !!contact && contact.id != null;
        });
        if (!_wechatForwardModalContacts.length) {
            alert('暂无可转发对象');
            return;
        }
        const preferred = _wechatForwardModalContacts.find(function(contact) {
            return String(contact.id) !== String(activeChatContact.id);
        }) || _wechatForwardModalContacts[0];
        _wechatForwardTargetContactId = String(preferred.id);
        const noteInput = document.getElementById('wechat-forward-note-input');
        if (noteInput) {
            noteInput.value = '';
            if (typeof autoGrowTextarea === 'function') autoGrowTextarea(noteInput);
        }
        _wechatForwardSending = false;
        await _renderWechatForwardContactList();
        modal.style.display = 'flex';
    }

    function closeWechatForwardModal() {
        const modal = document.getElementById('wechat-forward-modal');
        if (modal) modal.style.display = 'none';
        _wechatForwardSending = false;
    }

    async function selectWechatForwardTarget(encodedContactId) {
        const contactId = decodeURIComponent(String(encodedContactId || '').trim());
        if (!contactId) return;
        _wechatForwardTargetContactId = contactId;
        await _renderWechatForwardContactList();
    }

    async function _ensureWechatForwardFavoriteMultiRecord(sourceContact, validMessages) {
        if (!sourceContact || !validMessages.length) return '';
        const msgIds = validMessages.map(function(msg) {
            return msg.id;
        }).filter(function(id) {
            return id != null;
        });
        if (!msgIds.length) return '';
        const uniqKey = 'multi:' + String(sourceContact.id) + ':' + msgIds.join('_');
        const existing = await localforage.getItem(WECHAT_FAVORITE_STORAGE_KEY) || [];
        const hit = existing.find(function(item) {
            if (!item || typeof item !== 'object') return false;
            if (item.uniqKey) return String(item.uniqKey) === uniqKey;
            if (item.type === 'multi' && Array.isArray(item.msgIds)) {
                return 'multi:' + String(item.contactId || '') + ':' + item.msgIds.map(function(id) {
                    return String(id);
                }).join('_') === uniqKey;
            }
            return false;
        });
        if (hit && hit.id) return String(hit.id);

        const now = Date.now();
        const meName = _getWechatFavoriteMyName();
        const contactName = await _getWechatFavoriteContactName(sourceContact.id, sourceContact.roleName || '角色');
        const recordId = 'fav_multi_' + sourceContact.id + '_' + now + '_' + Math.floor(Math.random() * 1000);
        existing.push({
            id: recordId,
            type: 'multi',
            uniqKey: uniqKey,
            contactId: sourceContact.id,
            contactName: contactName,
            meName: meName,
            msgIds: msgIds,
            messages: validMessages.map(function(msg) {
                return {
                    id: msg.id,
                    sender: msg.sender,
                    content: msg.content,
                    timeStr: msg.timeStr || ''
                };
            }),
            favoritedAt: now,
            source: 'wechat'
        });
        await localforage.setItem(WECHAT_FAVORITE_STORAGE_KEY, existing);
        return recordId;
    }

    async function submitWechatForwardSelection() {
        if (_wechatForwardSending) return;
        if (!activeChatContact) return;
        if (!_wechatForwardTargetContactId) {
            alert('请选择发送对象');
            return;
        }
        const sourceContact = activeChatContact;
        const selectedIds = Array.from(new Set(_normalizeWechatForwardMsgIds()));
        if (!selectedIds.length) {
            showWechatMessageToast('请先选择消息');
            return;
        }
        _wechatForwardSending = true;
        try {
            const rows = await Promise.all(selectedIds.map(function(id) {
                return chatListDb.messages.get(id);
            }));
            const validMessages = _sortWechatForwardMessagesByTimeline(rows.filter(function(msg) {
                return !!msg && msg.source !== 'sms' && String(msg.contactId) === String(sourceContact.id);
            }));
            if (!validMessages.length) {
                alert('未找到可转发的消息');
                return;
            }

            const noteInput = document.getElementById('wechat-forward-note-input');
            const note = noteInput ? String(noteInput.value || '').trim() : '';
            const meName = _getWechatFavoriteMyName();
            const sourceContactName = await _getWechatFavoriteContactName(sourceContact.id, sourceContact.roleName || '角色');
            const favoriteRecordId = await _ensureWechatForwardFavoriteMultiRecord(sourceContact, validMessages);
            const previewLines = validMessages.slice(0, 4).map(function(msg) {
                const speaker = _getWechatFavoriteSpeakerName(msg.sender, meName, sourceContactName);
                const text = _clipWechatFavoriteText(_getWechatFavoritePreviewText(msg.content), 34);
                return speaker + '：' + text;
            });
            const payload = createMiniStructuredMessage('forward_bundle', {
                title: '聊天记录',
                note: note,
                sourceUserName: meName,
                sourceContactId: String(sourceContact.id),
                sourceContactName: sourceContactName,
                favoriteRecordId: favoriteRecordId,
                previewLines: previewLines,
                messages: validMessages.map(function(msg) {
                    return {
                        sender: msg.sender,
                        content: msg.content,
                        timeStr: msg.timeStr || ''
                    };
                })
            });
            if (!payload) {
                alert('转发失败');
                return;
            }

            const targetContact = _wechatForwardModalContacts.find(function(contact) {
                return String(contact && contact.id != null ? contact.id : '') === String(_wechatForwardTargetContactId);
            });
            const targetContactId = targetContact && targetContact.id != null ? targetContact.id : String(_wechatForwardTargetContactId);
            const targetContactName = await _getWechatFavoriteContactName(
                targetContactId,
                targetContact && targetContact.roleName ? targetContact.roleName : '对方'
            );
            const isForwardToCurrentChat = String(targetContactId) === String(sourceContact.id);
            const timeStr = getAmPmTime();
            await chatListDb.messages.add({
                contactId: targetContactId,
                sender: 'me',
                content: payload,
                timestamp: Date.now(),
                timeStr: timeStr,
                source: 'wechat'
            });

            const targetChat = await chatListDb.chats.where('contactId').equals(targetContactId).first();
            if (targetChat) {
                await chatListDb.chats.update(targetChat.id, { lastTime: timeStr });
            } else {
                await chatListDb.chats.add({
                    id: Date.now().toString(),
                    contactId: targetContactId,
                    lastTime: timeStr
                });
            }

            if (typeof renderChatList === 'function') renderChatList();
            closeWechatForwardModal();
            exitMultiSelectMode();
            if (isForwardToCurrentChat) {
                await refreshChatWindow();
            }
            showWechatMessageToast('已发送给 ' + targetContactName);
        } catch (e) {
            console.error('转发消息失败', e);
            alert('转发失败');
        } finally {
            _wechatForwardSending = false;
        }
    }

    function _escapeWechatFavoriteHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _getWechatFavoriteMyName() {
        const myNameEl = document.getElementById('text-wechat-me-name');
        const text = myNameEl && myNameEl.textContent ? String(myNameEl.textContent).trim() : '';
        return text || '我';
    }

    async function _getWechatFavoriteContactName(contactId, fallbackName) {
        let name = String(fallbackName || '').trim() || '角色';
        try {
            const remark = await localforage.getItem('cd_settings_' + contactId + '_remark');
            if (remark && remark !== '未设置') return String(remark).trim();
        } catch (e) {}
        try {
            const contact = await contactDb.contacts.get(contactId);
            if (contact && contact.roleName) {
                name = String(contact.roleName).trim() || name;
            }
        } catch (e) {}
        return name;
    }

    function _formatWechatFavoriteDate(ts) {
        const d = new Date(Number(ts) || Date.now());
        if (isNaN(d.getTime())) return '';
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return m + '-' + day;
    }

    function _compactWechatFavoriteText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function _getWechatFavoritePreviewText(content) {
        const pure = _compactWechatFavoriteText(extractMsgPureText(content || ''));
        return pure || '[消息]';
    }

    function _clipWechatFavoriteText(text, maxLen) {
        const str = String(text || '');
        const limit = Math.max(8, parseInt(maxLen, 10) || 26);
        if (str.length <= limit) return str;
        return str.slice(0, limit) + '...';
    }

    function _getWechatFavoriteSpeakerName(sender, myName, contactName) {
        if (sender === 'me') return myName || '我';
        if (sender === 'role') return contactName || '对方';
        if (sender === 'system') return '系统';
        return sender ? String(sender) : (contactName || '对方');
    }

    function _getWechatFavoriteAvatarSrc(raw) {
        if (typeof window.getSafeAvatarSrc === 'function') {
            return window.getSafeAvatarSrc(raw || '');
        }
        if (raw && String(raw).trim()) return String(raw).trim();
        return window.defaultAvatarDataUri || whitePixel;
    }

    function _syncWechatFavoriteHeaderActions() {
        const multiBtn = document.getElementById('wechat-favorite-multi-btn');
        const selectAllBtn = document.getElementById('wechat-favorite-select-all-btn');
        const delBtn = document.getElementById('wechat-favorite-delete-btn');
        if (!multiBtn || !selectAllBtn || !delBtn) return;
        const count = _wechatFavoriteSelectedIds.size;
        const total = _wechatFavoriteRecordsCache.length;
        const allSelected = total > 0 && count === total;
        if (_wechatFavoriteMultiSelectMode) {
            multiBtn.title = '完成';
            multiBtn.style.borderColor = '#111';
            multiBtn.style.color = '#111';

            selectAllBtn.style.display = 'flex';
            selectAllBtn.title = allSelected ? '取消全选' : '全选';
            selectAllBtn.style.borderColor = allSelected ? '#111' : '#d0d0d0';
            selectAllBtn.style.color = '#444';

            delBtn.style.display = 'flex';
            delBtn.style.opacity = count > 0 ? '1' : '0.5';
            delBtn.style.pointerEvents = count > 0 ? 'auto' : 'none';
            delBtn.style.borderColor = count > 0 ? '#111' : '#d0d0d0';
            delBtn.style.color = '#444';
            delBtn.title = count > 0 ? ('删除(' + count + ')') : '删除';
        } else {
            multiBtn.title = '多选';
            multiBtn.style.borderColor = '#dadada';
            multiBtn.style.color = '#444';
            selectAllBtn.style.display = 'none';
            selectAllBtn.title = '全选';
            selectAllBtn.style.borderColor = '#dadada';
            selectAllBtn.style.color = '#444';
            delBtn.style.display = 'none';
            delBtn.title = '删除';
            delBtn.style.opacity = '1';
            delBtn.style.pointerEvents = 'auto';
            delBtn.style.borderColor = '#dadada';
            delBtn.style.color = '#444';
        }
    }

    function _normalizeWechatFavoriteRecord(item) {
        if (!item || typeof item !== 'object') return null;
        const type = item.type === 'multi' ? 'multi' : 'single';
        const base = {
            id: String(item.id || ''),
            type: type,
            contactId: String(item.contactId || ''),
            contactName: String(item.contactName || '角色'),
            meName: String(item.meName || ''),
            favoritedAt: Number(item.favoritedAt) || 0,
            source: item.source || 'wechat',
            uniqKey: String(item.uniqKey || '')
        };
        if (type === 'multi') {
            const msgs = Array.isArray(item.messages) ? item.messages : [];
            if (!msgs.length) return null;
            return Object.assign(base, {
                messages: msgs.map(function(msg) {
                    return {
                        id: msg && msg.id != null ? msg.id : '',
                        sender: msg && msg.sender ? msg.sender : 'role',
                        content: msg && msg.content ? msg.content : '',
                        timeStr: msg && msg.timeStr ? msg.timeStr : ''
                    };
                }),
                msgIds: Array.isArray(item.msgIds) ? item.msgIds : []
            });
        }
        return Object.assign(base, {
            msgId: item.msgId,
            sender: item.sender || 'role',
            content: item.content || '',
            timeStr: item.timeStr || ''
        });
    }

    function _buildWechatFavoriteListItemHtml(item) {
        const myName = item.meName || _getWechatFavoriteMyName();
        const contactName = item.contactName || '角色';
        const dateText = _formatWechatFavoriteDate(item.favoritedAt);
        const encodedId = encodeURIComponent(String(item.id || ''));
        const isSelected = _wechatFavoriteSelectedIds.has(String(item.id));
        const typeLabel = item.type === 'multi' ? '多条' : '单条';
        const typeBadge = '<span style="font-size:10px; color:#6f6f6f; background:#f7f7f7; border:1px solid #e2e2e2; border-radius:9px; padding:1px 6px; flex-shrink:0;">' + typeLabel + '</span>';
        const selectDot = _wechatFavoriteMultiSelectMode
            ? '<span style="width:16px; height:16px; border-radius:50%; border:1px solid ' + (isSelected ? '#111' : '#bfbfbf') + '; background:' + (isSelected ? '#111' : '#fff') + '; box-shadow:inset 0 0 0 ' + (isSelected ? '4px' : '0px') + ' #fff; flex-shrink:0;"></span>'
            : '';
        const borderColor = _wechatFavoriteMultiSelectMode && isSelected ? '#d4d4d4' : '#ececec';

        if (item.type === 'multi') {
            const msgs = Array.isArray(item.messages) ? item.messages : [];
            const previewMsgs = msgs.slice(0, 2);
            const previewLines = previewMsgs.map(function(msg) {
                const speaker = _getWechatFavoriteSpeakerName(msg.sender, myName, contactName);
                const rawText = _clipWechatFavoriteText(_getWechatFavoritePreviewText(msg.content), 24);
                const text = /\.\.\.$/.test(rawText) ? rawText : (rawText + '...');
                return '<div style="font-size:13px; color:#2f2f2f; line-height:1.45; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    _escapeWechatFavoriteHtml(speaker + '：' + text) +
                    '</div>';
            }).join('');
            const firstSender = previewMsgs[0] ? previewMsgs[0].sender : 'role';
            const firstObject = _getWechatFavoriteSpeakerName(firstSender, myName, contactName);
            return '' +
                '<div onclick="handleWechatFavoriteListItemTap(\'' + encodedId + '\')" style="background:#fff; border-radius:14px; border:1px solid ' + borderColor + '; padding:12px 13px; display:flex; flex-direction:column; gap:8px; cursor:pointer;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center;">' + typeBadge + selectDot + '</div>' +
                    '<div style="display:flex; flex-direction:column; gap:2px;">' + previewLines + '</div>' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                        '<div style="font-size:11px; color:#9a9a9a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:68%;">' + _escapeWechatFavoriteHtml(firstObject) + '</div>' +
                        '<div style="font-size:11px; color:#b0b0b0; flex-shrink:0;">' + _escapeWechatFavoriteHtml(dateText) + '</div>' +
                    '</div>' +
                '</div>';
        }

        const singleText = _clipWechatFavoriteText(_getWechatFavoritePreviewText(item.content), 44);
        return '' +
            '<div onclick="handleWechatFavoriteListItemTap(\'' + encodedId + '\')" style="background:#fff; border-radius:14px; border:1px solid ' + borderColor + '; padding:12px 13px; display:flex; flex-direction:column; gap:8px; cursor:pointer;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' + typeBadge + selectDot + '</div>' +
                '<div style="font-size:13px; color:#2f2f2f; line-height:1.45; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + _escapeWechatFavoriteHtml(singleText) + '</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                    '<div style="font-size:11px; color:#9a9a9a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:68%;">' + _escapeWechatFavoriteHtml(contactName) + '</div>' +
                    '<div style="font-size:11px; color:#b0b0b0; flex-shrink:0;">' + _escapeWechatFavoriteHtml(dateText) + '</div>' +
                '</div>' +
            '</div>';
    }

    async function _loadWechatFavoriteRecords() {
        const raw = await localforage.getItem(WECHAT_FAVORITE_STORAGE_KEY);
        const list = Array.isArray(raw) ? raw : [];
        return list.map(_normalizeWechatFavoriteRecord).filter(function(item) {
            return !!item && (item.source === 'wechat' || !item.source);
        }).sort(function(a, b) {
            return (Number(b.favoritedAt) || 0) - (Number(a.favoritedAt) || 0);
        });
    }

    async function renderWechatFavoriteList() {
        const listEl = document.getElementById('wechat-favorite-list');
        const emptyEl = document.getElementById('wechat-favorite-empty');
        if (!listEl || !emptyEl) return;
        _wechatFavoriteRecordsCache = await _loadWechatFavoriteRecords();
        _syncWechatFavoriteHeaderActions();
        if (!_wechatFavoriteRecordsCache.length) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }
        emptyEl.style.display = 'none';
        listEl.innerHTML = _wechatFavoriteRecordsCache.map(_buildWechatFavoriteListItemHtml).join('');
    }

    async function openWechatFavoritePage() {
        _wechatFavoriteMultiSelectMode = false;
        _wechatFavoriteSelectedIds.clear();
        await renderWechatFavoriteList();
        const detailPage = document.getElementById('wechat-favorite-detail-page');
        if (detailPage) detailPage.style.display = 'none';
        _syncWechatFavoriteHeaderActions();
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'wechat-favorite-page']);
        } else {
            const page = document.getElementById('wechat-favorite-page');
            if (page) page.style.display = 'flex';
        }
    }

    function closeWechatFavoritePage() {
        _wechatFavoriteMultiSelectMode = false;
        _wechatFavoriteSelectedIds.clear();
        const detailPage = document.getElementById('wechat-favorite-detail-page');
        if (detailPage) detailPage.style.display = 'none';
        _syncWechatFavoriteHeaderActions();
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app']);
        } else {
            const page = document.getElementById('wechat-favorite-page');
            if (page) page.style.display = 'none';
        }
        if (typeof switchWechatTab === 'function') switchWechatTab('me');
    }

    function closeWechatFavoriteDetailPage() {
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'wechat-favorite-page']);
        } else {
            const detailPage = document.getElementById('wechat-favorite-detail-page');
            if (detailPage) detailPage.style.display = 'none';
            const listPage = document.getElementById('wechat-favorite-page');
            if (listPage) listPage.style.display = 'flex';
        }
    }

    async function openWechatFavoriteRecord(recordId) {
        if (_wechatFavoriteMultiSelectMode) return;
        const id = decodeURIComponent(String(recordId || '').trim());
        if (!id) return;
        if (!_wechatFavoriteRecordsCache.length) {
            _wechatFavoriteRecordsCache = await _loadWechatFavoriteRecords();
        }
        const record = _wechatFavoriteRecordsCache.find(function(item) {
            return String(item.id) === id;
        });
        if (!record || record.type !== 'multi') return;
        const meName = record.meName || _getWechatFavoriteMyName();
        const contactName = await _getWechatFavoriteContactName(record.contactId, record.contactName || '角色');
        let contact = null;
        try {
            contact = await contactDb.contacts.get(record.contactId);
        } catch (e) {
            contact = null;
        }
        const myAvatar = _getWechatFavoriteAvatarSrc(contact && contact.userAvatar ? contact.userAvatar : '');
        const roleAvatar = _getWechatFavoriteAvatarSrc(contact && contact.roleAvatar ? contact.roleAvatar : '');
        window.renderWechatRecordDetailPage({
            titleElementId: 'wechat-favorite-detail-title',
            bodyElementId: 'wechat-favorite-detail-body',
            heading: meName + '和' + contactName + '的聊天记录',
            sourceLabel: '收藏聊天记录',
            currentSceneLabel: '当前页面',
            currentSceneValue: '收藏记录',
            messages: Array.isArray(record.messages) ? record.messages : [],
            meName: meName,
            peerName: contactName,
            myAvatar: myAvatar,
            peerAvatar: roleAvatar
        });

        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'wechat-favorite-page', 'wechat-favorite-detail-page']);
        } else {
            const detailPage = document.getElementById('wechat-favorite-detail-page');
            if (detailPage) detailPage.style.display = 'flex';
        }
    }

    async function handleWechatFavoriteListItemTap(recordId) {
        const id = decodeURIComponent(String(recordId || '').trim());
        if (!id) return;
        if (!_wechatFavoriteRecordsCache.length) {
            _wechatFavoriteRecordsCache = await _loadWechatFavoriteRecords();
        }
        const record = _wechatFavoriteRecordsCache.find(function(item) {
            return String(item.id) === id;
        });
        if (!record) return;
        if (_wechatFavoriteMultiSelectMode) {
            if (_wechatFavoriteSelectedIds.has(id)) _wechatFavoriteSelectedIds.delete(id);
            else _wechatFavoriteSelectedIds.add(id);
            _syncWechatFavoriteHeaderActions();
            await renderWechatFavoriteList();
            return;
        }
        if (record.type === 'multi') {
            await openWechatFavoriteRecord(id);
        }
    }

    async function toggleWechatFavoriteMultiSelect() {
        _wechatFavoriteMultiSelectMode = !_wechatFavoriteMultiSelectMode;
        if (!_wechatFavoriteMultiSelectMode) _wechatFavoriteSelectedIds.clear();
        _syncWechatFavoriteHeaderActions();
        await renderWechatFavoriteList();
    }

    async function toggleSelectAllWechatFavorites() {
        if (!_wechatFavoriteMultiSelectMode) return;
        if (!_wechatFavoriteRecordsCache.length) {
            _wechatFavoriteRecordsCache = await _loadWechatFavoriteRecords();
        }
        if (_wechatFavoriteSelectedIds.size === _wechatFavoriteRecordsCache.length) {
            _wechatFavoriteSelectedIds.clear();
        } else {
            _wechatFavoriteSelectedIds.clear();
            _wechatFavoriteRecordsCache.forEach(function(item) {
                _wechatFavoriteSelectedIds.add(String(item.id));
            });
        }
        _syncWechatFavoriteHeaderActions();
        await renderWechatFavoriteList();
    }

    async function deleteSelectedWechatFavorites() {
        if (!_wechatFavoriteSelectedIds.size) return;
        const count = _wechatFavoriteSelectedIds.size;
        const ok = await window.showMiniConfirm('确定要删除选中的 ' + count + ' 条收藏吗？');
        if (!ok) return;
        const existing = await localforage.getItem(WECHAT_FAVORITE_STORAGE_KEY) || [];
        const remain = existing.filter(function(item) {
            return !_wechatFavoriteSelectedIds.has(String(item && item.id ? item.id : ''));
        });
        await localforage.setItem(WECHAT_FAVORITE_STORAGE_KEY, remain);
        _wechatFavoriteSelectedIds.clear();
        _wechatFavoriteMultiSelectMode = false;
        _syncWechatFavoriteHeaderActions();
        await renderWechatFavoriteList();
        showWechatMessageToast('已删除 ' + count + ' 条收藏');
    }

    async function favoriteMessagesByIds(msgIds) {
        if (!activeChatContact) return 0;
        const ids = Array.isArray(msgIds) ? msgIds.map(function(id) {
            return parseInt(id, 10);
        }).filter(function(id) {
            return Number.isFinite(id);
        }) : [];
        if (!ids.length) return 0;
        try {
            const messages = await Promise.all(ids.map(function(id) {
                return chatListDb.messages.get(id);
            }));
            const validMessages = orderMiniChatMessages(messages.filter(function(msg) {
                return !!msg && msg.source !== 'sms';
            }));
            if (!validMessages.length) return 0;

            const existing = await localforage.getItem(WECHAT_FAVORITE_STORAGE_KEY) || [];
            const existingKeys = new Set(existing.map(function(item) {
                if (!item || typeof item !== 'object') return '';
                if (item.uniqKey) return String(item.uniqKey);
                if (item.type === 'multi' && Array.isArray(item.msgIds)) {
                    return 'multi:' + String(item.contactId || '') + ':' + item.msgIds.map(function(id) { return String(id); }).join('_');
                }
                if (item.msgId != null) {
                    return 'single:' + String(item.contactId || '') + ':' + String(item.msgId);
                }
                return '';
            }).filter(Boolean));

            const meName = _getWechatFavoriteMyName();
            const contactName = await _getWechatFavoriteContactName(activeChatContact.id, activeChatContact.roleName || '角色');
            const now = Date.now();
            let addedCount = 0;

            if (validMessages.length === 1) {
                const msg = validMessages[0];
                const uniqKey = 'single:' + String(activeChatContact.id) + ':' + String(msg.id);
                if (!existingKeys.has(uniqKey)) {
                    existing.push({
                        id: 'fav_single_' + activeChatContact.id + '_' + msg.id,
                        type: 'single',
                        uniqKey: uniqKey,
                        msgId: msg.id,
                        contactId: activeChatContact.id,
                        contactName: contactName,
                        meName: meName,
                        sender: msg.sender,
                        content: msg.content,
                        timeStr: msg.timeStr || '',
                        favoritedAt: now,
                        source: 'wechat'
                    });
                    existingKeys.add(uniqKey);
                    addedCount = 1;
                }
            } else {
                const msgIds = validMessages.map(function(msg) {
                    return msg.id;
                });
                const uniqKey = 'multi:' + String(activeChatContact.id) + ':' + msgIds.join('_');
                if (!existingKeys.has(uniqKey)) {
                    existing.push({
                        id: 'fav_multi_' + activeChatContact.id + '_' + now + '_' + Math.floor(Math.random() * 1000),
                        type: 'multi',
                        uniqKey: uniqKey,
                        contactId: activeChatContact.id,
                        contactName: contactName,
                        meName: meName,
                        msgIds: msgIds,
                        messages: validMessages.map(function(msg) {
                            return {
                                id: msg.id,
                                sender: msg.sender,
                                content: msg.content,
                                timeStr: msg.timeStr || ''
                            };
                        }),
                        favoritedAt: now,
                        source: 'wechat'
                    });
                    existingKeys.add(uniqKey);
                    addedCount = 1;
                }
            }

            await localforage.setItem(WECHAT_FAVORITE_STORAGE_KEY, existing);
            if (document.getElementById('wechat-favorite-page') && document.getElementById('wechat-favorite-page').style.display === 'flex') {
                await renderWechatFavoriteList();
            }
            const duplicateText = ids.length === 1 ? '该消息已在收藏中' : '这组消息已在收藏中';
            const successText = ids.length === 1 ? '已收藏 1 条消息' : '已收藏多条消息';
            showWechatMessageToast(addedCount > 0 ? successText : duplicateText);
            return addedCount;
        } catch (e) {
            console.error('收藏消息失败', e);
            alert('收藏失败');
            return 0;
        }
    }

    async function favoriteSelectedMsgs() {
        if (!activeChatContact || selectedMsgIds.size === 0) return;
        await favoriteMessagesByIds(Array.from(selectedMsgIds));
        exitMultiSelectMode();
    }

    async function openRoleMomentsPage() {
        if (!activeChatContact) return;
        const page = document.getElementById('role-moments-app');
        if (!page) return;

        const nameEl = document.getElementById('role-moments-name');
        const avatarEl = document.getElementById('role-moments-avatar-img');
        const listEl = document.getElementById('role-moments-post-list');
        const emptyEl = document.getElementById('role-moments-empty-tip');

        const displayName = await getMomentsContactDisplayName(activeChatContact);
        if (nameEl) nameEl.textContent = displayName || activeChatContact.roleName || '角色';
        if (avatarEl) avatarEl.src = (activeChatContact.roleAvatar || (window.defaultAvatarDataUri || whitePixel));

        if (listEl && emptyEl) {
            const rolePosts = momentsPosts
                .slice()
                .filter(function(post) {
                    const pid = post && (post.contactId || post.authorContactId || post.roleId);
                    return String(pid || '') === String(activeChatContact.id);
                })
                .sort(function(a, b) {
                    return (b && b.createdAt ? b.createdAt : 0) - (a && a.createdAt ? a.createdAt : 0);
                });

            if (!rolePosts.length) {
                emptyEl.style.display = 'block';
                listEl.innerHTML = '';
            } else {
                emptyEl.style.display = 'none';
                listEl.innerHTML = rolePosts.map(function(post) {
                    const text = post && post.text ? escapeMomentsHtml(post.text) : '';
                    const time = formatMomentsTime(post && post.createdAt ? post.createdAt : Date.now());
                    const textHtml = text ? '<div class="moments-post-text">' + text + '</div>' : '';
                    const images = Array.isArray(post && post.images) ? post.images : [];
                    const imagesHtml = images.length
                        ? '<div class="moments-post-images">' + images.map(function(src) {
                            return '<img src="' + escapeMomentsHtml(src) + '" loading="lazy" decoding="async">';
                        }).join('') + '</div>'
                        : '';
                    return '' +
                        '<div class="moments-post-card">' +
                            '<div class="moments-post-avatar"><img src="' + escapeMomentsHtml(activeChatContact.roleAvatar || (window.defaultAvatarDataUri || whitePixel)) + '" loading="lazy" decoding="async"></div>' +
                            '<div class="moments-post-main">' +
                                '<div class="moments-post-name-row"><span class="moments-post-name">' + escapeMomentsHtml(displayName || activeChatContact.roleName || '角色') + '</span><span class="moments-post-time">' + escapeMomentsHtml(time) + '</span></div>' +
                                textHtml +
                                imagesHtml +
                            '</div>' +
                        '</div>';
                }).join('');
            }
        }

        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'role-profile-app', 'role-moments-app']);
        } else {
            page.style.display = 'flex';
            const profile = document.getElementById('role-profile-app');
            if (profile) profile.style.display = 'flex';
        }
    }

    function closeRoleMoments() {
        if (typeof window.syncWechatOverlayStack === 'function') {
            window.syncWechatOverlayStack(['wechat-app', 'role-profile-app']);
            return;
        }
        const page = document.getElementById('role-moments-app');
        if (page) page.style.display = 'none';
        const profile = document.getElementById('role-profile-app');
        if (profile) profile.style.display = 'flex';
    }

    window.openWechatFavoritePage = openWechatFavoritePage;
    window.closeWechatFavoritePage = closeWechatFavoritePage;
    window.openWechatFavoriteRecord = openWechatFavoriteRecord;
    window.closeWechatFavoriteDetailPage = closeWechatFavoriteDetailPage;
    window.handleWechatFavoriteListItemTap = handleWechatFavoriteListItemTap;
    window.toggleWechatFavoriteMultiSelect = toggleWechatFavoriteMultiSelect;
    window.toggleSelectAllWechatFavorites = toggleSelectAllWechatFavorites;
    window.deleteSelectedWechatFavorites = deleteSelectedWechatFavorites;
    window.openWechatForwardModal = openWechatForwardModal;
    window.closeWechatForwardModal = closeWechatForwardModal;
    window.selectWechatForwardTarget = selectWechatForwardTarget;
    window.submitWechatForwardSelection = submitWechatForwardSelection;
    window.openRoleMomentsPage = openRoleMomentsPage;
    window.closeRoleMoments = closeRoleMoments;

    function buildChatRollbackRounds(messages) {
        const rounds = [];
        let currentRound = null;
        let hasUserAnchor = false;
        orderMiniChatMessages(messages).forEach(function(msg) {
            if (!msg || msg.source === 'sms' || msg.isSystemTip || msg.isRecalled || msg.sender === 'system') return;
            if (msg.sender === 'me') {
                hasUserAnchor = true;
                currentRound = null;
                return;
            }
            if (msg.sender !== 'role' || !hasUserAnchor) return;
            if (!currentRound) {
                currentRound = {
                    startMsgId: msg.id,
                    endMsgId: msg.id,
                    timeStr: msg.timeStr || '',
                    previews: [],
                    count: 0
                };
                rounds.push(currentRound);
            }
            currentRound.endMsgId = msg.id;
            currentRound.count += 1;
            const previewText = extractMsgPureText(msg.content || '').trim();
            if (previewText && currentRound.previews.length < 2) {
                currentRound.previews.push(previewText);
            }
        });
        return rounds.reverse();
    }

    async function renderChatRollbackList() {
        const listEl = document.getElementById('chat-rollback-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!activeChatContact) {
            listEl.innerHTML = '<div class="chat-rollback-empty">当前没有打开的聊天。</div>';
            return;
        }
        const allMsgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray());
        const rounds = buildChatRollbackRounds(allMsgs);
        if (!rounds.length) {
            listEl.innerHTML = '<div class="chat-rollback-empty">还没有可回溯的角色回复轮次。</div>';
            return;
        }
        rounds.forEach(function(round, index) {
            const item = document.createElement('div');
            item.className = 'chat-rollback-item';

            const head = document.createElement('div');
            head.className = 'chat-rollback-item-head';

            const title = document.createElement('div');
            title.className = 'chat-rollback-item-title';
            title.textContent = '第 ' + (rounds.length - index) + ' 轮角色回复';

            const meta = document.createElement('div');
            meta.className = 'chat-rollback-item-meta';
            meta.textContent = (round.timeStr || '未知时间') + ' · ' + round.count + ' 条';

            const preview = document.createElement('div');
            preview.className = 'chat-rollback-item-preview';
            preview.textContent = round.previews.join('\n') || '这轮回复没有可预览文本';

            const actions = document.createElement('div');
            actions.className = 'chat-rollback-item-actions';

            const rewindBtn = document.createElement('button');
            rewindBtn.type = 'button';
            rewindBtn.className = 'chat-rollback-item-btn primary';
            rewindBtn.textContent = '回溯到这里';
            rewindBtn.addEventListener('click', async function() {
                const ok = await window.showMiniConfirm('确定要回溯到这一轮角色回复吗？这会保留这一轮，并删除它之后的线上对话。');
                if (!ok) return;
                closeChatRollbackModal();
                const success = await rollbackChatAfterMessage(round.endMsgId || round.startMsgId);
                if (!success) {
                    alert('回溯失败，未找到可处理的消息轮次');
                    return;
                }
                showWechatMessageToast('已回溯到该轮');
            });

            actions.appendChild(rewindBtn);
            head.appendChild(title);
            head.appendChild(meta);
            item.appendChild(head);
            item.appendChild(preview);
            item.appendChild(actions);
            listEl.appendChild(item);
        });
    }

    const CHAT_TIMELINE_SLOT_COUNT = 3;

    function getChatTimelineStateKey(contactId) {
        return 'chat_timeline_state_' + contactId;
    }

    function getChatTimelineSlotKey(contactId, slotIndex) {
        return 'chat_timeline_slot_' + contactId + '_' + slotIndex;
    }

    function formatTimelineDatetimeInput(ts) {
        const d = new Date(ts || Date.now());
        if (isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + 'T' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
    }

    function parseTimelineDatetimeInput(value) {
        const text = String(value || '').trim();
        if (!text) return null;
        const ts = Date.parse(text);
        return Number.isFinite(ts) ? ts : null;
    }

    function buildTimelineNaturalTransitionText(targetTs, sceneText, nowTs) {
        const timeLabel = formatMiniPromptTimestamp(targetTs) || '未知时间';
        const dayLabel = getMiniRelativeDayLabel(targetTs, nowTs);
        let lead = '时间轴轻轻拨到了新的节点。';
        if (targetTs < nowTs) lead = '时间轴回退到了过去的节点。';
        else if (targetTs > nowTs) lead = '时间轴快进到了未来的节点。';
        const coreScene = sceneText
            ? String(sceneText).trim()
            : (targetTs < nowTs
                ? '周围像回到那天的空气和节奏。'
                : (targetTs > nowTs ? '环境像提前抵达了未来的生活片段。' : '场景保持当前节奏。'));
        return lead + '现在是' + timeLabel + '（' + dayLabel + '），' + coreScene;
    }

    async function renderChatTimelineSlotList(contact) {
        const slotListEl = document.getElementById('chat-timeline-slot-list');
        if (!slotListEl) return;
        slotListEl.innerHTML = '';
        if (!contact) return;

        for (let i = 1; i <= CHAT_TIMELINE_SLOT_COUNT; i += 1) {
            let slot = null;
            try {
                slot = await localforage.getItem(getChatTimelineSlotKey(contact.id, i));
            } catch (e) {
                slot = null;
            }

            const item = document.createElement('div');
            item.className = 'chat-timeline-slot-item';

            const metaWrap = document.createElement('div');
            metaWrap.className = 'chat-timeline-slot-meta';

            const title = document.createElement('div');
            title.className = 'chat-timeline-slot-title';
            title.textContent = '时间轴存档 ' + i;

            const desc = document.createElement('div');
            desc.className = 'chat-timeline-slot-desc';
            if (slot && slot.targetTs) {
                const sceneTail = slot.sceneText ? (' · ' + String(slot.sceneText).trim()) : '';
                desc.textContent = (formatMiniPromptTimestamp(slot.targetTs) || '未知时间') + sceneTail;
            } else {
                desc.textContent = '空槽位';
            }

            const actions = document.createElement('div');
            actions.className = 'chat-timeline-slot-actions';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'chat-timeline-slot-btn';
            saveBtn.textContent = '保存';
            saveBtn.addEventListener('click', async function() {
                await saveChatTimelineSlot(i);
            });

            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.className = 'chat-timeline-slot-btn primary';
            loadBtn.textContent = '读取';
            if (!slot) loadBtn.disabled = true;
            loadBtn.addEventListener('click', async function() {
                await loadChatTimelineSlot(i);
            });

            actions.appendChild(saveBtn);
            actions.appendChild(loadBtn);
            metaWrap.appendChild(title);
            metaWrap.appendChild(desc);
            item.appendChild(metaWrap);
            item.appendChild(actions);
            slotListEl.appendChild(item);
        }
    }

    async function renderChatTimelineTravelPanel() {
        const panel = document.getElementById('chat-timeline-travel-panel');
        if (!panel) return;
        if (!activeChatContact) {
            panel.innerHTML = '<div class="chat-timeline-empty">当前没有打开的聊天，无法调整时间轴。</div>';
            return;
        }

        let state = null;
        try {
            state = await localforage.getItem(getChatTimelineStateKey(activeChatContact.id));
        } catch (e) {
            state = null;
        }
        const targetTs = state && Number.isFinite(Number(state.targetTs)) ? Number(state.targetTs) : Date.now();
        const sceneText = state && typeof state.sceneText === 'string' ? state.sceneText : '';

        panel.innerHTML = '' +
            '<div class="chat-timeline-travel-row">' +
                '<input id="chat-timeline-target-time" type="datetime-local">' +
                '<button id="chat-timeline-set-past" type="button" class="chat-timeline-travel-btn">过去</button>' +
                '<button id="chat-timeline-set-future" type="button" class="chat-timeline-travel-btn">未来</button>' +
            '</div>' +
            '<textarea id="chat-timeline-scene-input" class="chat-timeline-travel-scene" placeholder="输入情景过渡，例如：夜雨停了，我们在旧书店门口重逢。"></textarea>' +
            '<div class="chat-timeline-travel-row">' +
                '<button id="chat-timeline-apply-btn" type="button" class="chat-timeline-travel-btn primary">应用时间轴并自然过渡</button>' +
            '</div>' +
            '<div id="chat-timeline-slot-list" class="chat-timeline-slot-list"></div>';

        const targetInput = document.getElementById('chat-timeline-target-time');
        const sceneInput = document.getElementById('chat-timeline-scene-input');
        if (targetInput) targetInput.value = formatTimelineDatetimeInput(targetTs);
        if (sceneInput) {
            sceneInput.value = sceneText;
            autoGrowTextarea(sceneInput);
        }

        const setPastBtn = document.getElementById('chat-timeline-set-past');
        if (setPastBtn) {
            setPastBtn.addEventListener('click', function() {
                if (!targetInput) return;
                const base = parseTimelineDatetimeInput(targetInput.value) || Date.now();
                targetInput.value = formatTimelineDatetimeInput(base - 86400000);
            });
        }
        const setFutureBtn = document.getElementById('chat-timeline-set-future');
        if (setFutureBtn) {
            setFutureBtn.addEventListener('click', function() {
                if (!targetInput) return;
                const base = parseTimelineDatetimeInput(targetInput.value) || Date.now();
                targetInput.value = formatTimelineDatetimeInput(base + 86400000);
            });
        }
        const applyBtn = document.getElementById('chat-timeline-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', async function() {
                await applyChatTimelineTravel();
            });
        }

        await renderChatTimelineSlotList(activeChatContact);
    }

    async function saveChatTimelineSlot(slotIndex) {
        if (!activeChatContact) return;
        const targetInput = document.getElementById('chat-timeline-target-time');
        const sceneInput = document.getElementById('chat-timeline-scene-input');
        const targetTs = parseTimelineDatetimeInput(targetInput ? targetInput.value : '');
        if (!targetTs) {
            showWechatMessageToast('请先选择时间点');
            return;
        }
        const payload = {
            targetTs: targetTs,
            sceneText: sceneInput ? String(sceneInput.value || '').trim() : '',
            savedAt: Date.now()
        };
        await localforage.setItem(getChatTimelineSlotKey(activeChatContact.id, slotIndex), payload);
        await renderChatTimelineSlotList(activeChatContact);
        showWechatMessageToast('已保存到存档位 ' + slotIndex);
    }

    async function loadChatTimelineSlot(slotIndex) {
        if (!activeChatContact) return;
        const slot = await localforage.getItem(getChatTimelineSlotKey(activeChatContact.id, slotIndex));
        if (!slot || !slot.targetTs) {
            showWechatMessageToast('该存档位为空');
            return;
        }
        const targetInput = document.getElementById('chat-timeline-target-time');
        const sceneInput = document.getElementById('chat-timeline-scene-input');
        if (targetInput) targetInput.value = formatTimelineDatetimeInput(slot.targetTs);
        if (sceneInput) {
            sceneInput.value = slot.sceneText || '';
            autoGrowTextarea(sceneInput);
        }
        showWechatMessageToast('已读取存档位 ' + slotIndex);
    }

    async function applyChatTimelineTravel() {
        const contact = activeChatContact;
        if (!contact) {
            showWechatMessageToast('请先打开一个聊天');
            return false;
        }
        if (isWechatContactReplyLocked(contact)) {
            showWechatMessageToast('角色正在输入，请稍后再试');
            return false;
        }

        const targetInput = document.getElementById('chat-timeline-target-time');
        const sceneInput = document.getElementById('chat-timeline-scene-input');
        const targetTs = parseTimelineDatetimeInput(targetInput ? targetInput.value : '');
        if (!targetTs) {
            showWechatMessageToast('时间格式无效');
            return false;
        }
        const sceneText = sceneInput ? String(sceneInput.value || '').trim() : '';
        const nowTs = Date.now();

        await localforage.setItem(getChatTimelineStateKey(contact.id), {
            targetTs: targetTs,
            sceneText: sceneText,
            updatedAt: nowTs
        });

        const anchorText = formatMiniPromptTimestamp(targetTs) || '未知时间';
        const dayLabel = getMiniRelativeDayLabel(targetTs, nowTs);
        const transitionText = buildTimelineNaturalTransitionText(targetTs, sceneText, nowTs);

        await appendSystemTipMessage('时间轴锚点已切换到 ' + anchorText + '（' + dayLabel + '）', contact, 'timeline_tip');
        const userMsgId = await appendCurrentUserMessageContent(transitionText, contact);
        if (!userMsgId) return false;

        await triggerRoleReply(contact);
        await renderChatTimelineTravelPanel();
        showWechatMessageToast('时间轴已切换到 ' + anchorText);
        return true;
    }

    async function openChatTimelineModal() {
        hideChatExtPanel();
        const modal = document.getElementById('chat-timeline-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        await renderChatTimelineTravelPanel();
    }

    function closeChatTimelineModal() {
        const modal = document.getElementById('chat-timeline-modal');
        if (modal) modal.style.display = 'none';
    }

    async function openChatRollbackModal() {
        hideChatExtPanel();
        const modal = document.getElementById('chat-rollback-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        await renderChatRollbackList();
    }

    function closeChatRollbackModal() {
        const modal = document.getElementById('chat-rollback-modal');
        if (modal) modal.style.display = 'none';
    }

    async function rollbackChatAfterMessage(msgId) {
        if (!activeChatContact || !msgId) return false;
        const allMsgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray());
        const messages = allMsgs.filter(function(msg) {
            return msg && msg.source !== 'sms';
        });
        const anchorIndex = messages.findIndex(function(msg) {
            return msg.id === msgId;
        });
        if (anchorIndex < 0) return false;
        const idsToDelete = messages.slice(anchorIndex + 1).map(function(msg) {
            return msg.id;
        }).filter(Boolean);
        if (idsToDelete.length) {
            await chatListDb.messages.bulkDelete(idsToDelete);
        }
        await refreshChatWindow();
        await updateLastChatTime(activeChatContact);
        return true;
    }

    async function rewindRoleReplyFromMessage(msgId) {
        if (!activeChatContact || !msgId) return false;
        const allMsgs = orderMiniChatMessages(await chatListDb.messages.where('contactId').equals(activeChatContact.id).toArray());
        const messages = allMsgs.filter(function(msg) {
            return msg && msg.source !== 'sms';
        });
        const targetIndex = messages.findIndex(function(msg) {
            return msg.id === msgId;
        });
        if (targetIndex < 0) return false;
        if (!messages[targetIndex] || messages[targetIndex].sender !== 'role') return false;

        let previousUserIndex = -1;
        for (let i = targetIndex - 1; i >= 0; i -= 1) {
            if (messages[i] && messages[i].sender === 'me') {
                previousUserIndex = i;
                break;
            }
        }

        const deleteFromIndex = previousUserIndex + 1;
        const idsToDelete = messages.slice(deleteFromIndex).map(function(msg) {
            return msg.id;
        }).filter(Boolean);
        if (!idsToDelete.length) return false;

        await chatListDb.messages.bulkDelete(idsToDelete);
        await refreshChatWindow();
        await updateLastChatTime(activeChatContact);
        await triggerRoleReply(activeChatContact);
        return true;
    }

    window.openChatRollbackModal = openChatRollbackModal;
    window.closeChatRollbackModal = closeChatRollbackModal;

    function showWechatMessageToast(text) {
        if (!text) return;
        window.showMiniToast(text, { bottom: 90, duration: 1800 });
    }
    window.openChatTimelineModal = openChatTimelineModal;
    window.closeChatTimelineModal = closeChatTimelineModal;
    window.applyChatTimelineTravel = applyChatTimelineTravel;
    // 绑定回车监听
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && document.activeElement && document.activeElement.id === 'chat-input-main') {
                e.preventDefault();
                performSendMessage();
            }
        });

        // iOS键盘修复：点击聊天区域时确保输入框可聚焦（iOS需要从用户手势直接触发focus）
        const chatMsgContainer = document.getElementById('chat-msg-container');
        const chatInputMain = document.getElementById('chat-input-main');
        if (chatMsgContainer && chatInputMain) {
            chatMsgContainer.addEventListener('touchend', function(e) {
                // 点击消息区域时不弹出键盘（只有点击输入框才弹）
                e.stopPropagation();
            }, { passive: true });
        }

        // iOS键盘修复：确保输入框在任何情况下都不会被意外锁定
        if (chatInputMain) {
            autoGrowTextarea(chatInputMain);
            // 每次touchstart时确保输入框未被disabled（iOS下disabled会导致键盘弹不出）
            chatInputMain.addEventListener('touchstart', function() {
                // 如果角色没有拉黑用户，强制解除disabled状态
                if (activeChatContact && !isBlockedByRole(activeChatContact)) {
                    this.disabled = false;
                    this.removeAttribute('readonly');
                }
            }, { passive: true });
        }

        // 全页面输入框：textarea 输入时自动增高（支持动态弹窗里的 textarea）
        document.querySelectorAll('textarea').forEach(function(el) { autoGrowTextarea(el); });
        document.addEventListener('input', function(e) {
            if (e.target && e.target.tagName === 'TEXTAREA') {
                autoGrowTextarea(e.target);
            }
        });
    });
