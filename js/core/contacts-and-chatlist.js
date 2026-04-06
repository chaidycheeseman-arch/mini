// Auto-split from js/core/bootstrap.js (2063-2669)

    // ====== 联系人功能逻辑 (核心持久化: Dexie.js + IndexedDB) ======
    const contactDb = new Dexie("miniPhoneContactDB");
    contactDb.version(1).stores({ contacts: 'id' });
    let tempRoleAvatarBase64 = '';
    let tempUserAvatarBase64 = '';
    let tempContactNpcs = [];
        // 渲染联系人列表 (新增性别、语言直观展示，确保信息严格区分)
    async function renderContacts() {
        const listContainer = document.getElementById('contact-list-container');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        try {
            const allContacts = await contactDb.contacts.toArray();
            const activeGroupFilter = typeof window.getActiveContactGroupFilter === 'function'
                ? window.getActiveContactGroupFilter()
                : 'ALL';
            const contacts = activeGroupFilter === 'ALL'
                ? allContacts
                : allContacts.filter(function(contact) {
                    return (contact.roleGroup || '') === activeGroupFilter;
                });
            if (allContacts.length === 0) {
                listContainer.innerHTML = `
                    <div style="margin-top: 12px; padding: 24px 20px; width: 100%; background: #fff; border-radius: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); text-align: center;">
                        <div style="font-size: 14px; font-weight: 600; color: #444;">还没有联系人</div>
                        <div style="margin-top: 8px; font-size: 12px; color: #aaa; line-height: 1.6;">先添加一个角色，WeChat 和信息页才能正常开始聊天。</div>
                        <div onclick="openContactEditor()" style="margin: 18px auto 0; width: fit-content; min-width: 132px; height: 40px; padding: 0 18px; border-radius: 20px; background: #f5f5f7; color: #555; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            + 添加联系人
                        </div>
                    </div>
                `;
                return;
            }
            if (contacts.length === 0) {
                listContainer.innerHTML = `
                    <div style="margin-top: 12px; padding: 24px 20px; width: 100%; background: #fff; border-radius: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); text-align: center;">
                        <div style="font-size: 14px; font-weight: 600; color: #444;">${activeGroupFilter} 分组暂无联系人</div>
                        <div style="margin-top: 8px; font-size: 12px; color: #aaa; line-height: 1.6;">切换上方分组，或者给联系人设置为这个分组。</div>
                    </div>
                `;
                return;
            }
            contacts.forEach(c => {
                const item = document.createElement('div');
                item.style.cssText = 'width:100%; min-width:0; box-sizing:border-box; background:#fff; border-radius:16px; padding:14px; box-shadow:0 2px 10px rgba(0,0,0,0.02); display:flex; align-items:center; justify-content:space-between;';
                let avatarHtml = c.roleAvatar ? `<img src="${c.roleAvatar}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async">` : `<span style="color: #ccc; font-size: 12px;">无</span>`;
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
                        <div style="width: 45px; height: 45px; border-radius: 50%; background: #fdfdfd; border: 1px solid #f0f0f0; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 5px;">
                            <div style="font-size: 15px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span>${c.roleName || '未命名'}</span>
                                <span style="font-size: 10px; color: #777; font-weight: normal; background: #eef2f5; padding: 2px 6px; border-radius: 8px;">${c.roleGender || '男'}</span>
                                <span style="font-size: 10px; color: #777; font-weight: normal; background: #f5f0ee; padding: 2px 6px; border-radius: 8px;">${c.roleLanguage || '中'}</span>
                                <span style="font-size: 10px; color: #999; font-weight: normal; background: #f5f5f5; padding: 2px 6px; border-radius: 8px;">${c.roleGroup || 'ALL'}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.roleDetail || '暂无设定'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; flex-shrink: 0; margin-left: 10px;">
                        <div class="wb-action-icon" onclick="openContactEditor('${c.id}')">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div class="wb-action-icon" onclick="deleteContact('${c.id}')">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        } catch (e) {
            console.error("加载联系人失败", e);
        }
    }
    // 打开联系人编辑器 (加固重置逻辑，绝对杜绝信息残留与串联)
    async function openContactEditor(id = null) {
        const modal = document.getElementById('contact-editor-modal');
        const title = document.getElementById('contact-editor-title');
        // 更新分组下拉框
        const groupSelect = document.getElementById('contact-role-group');
        groupSelect.innerHTML = '<option value="">ALL (不分组)</option>';
        contactGroups.forEach(g => {
            groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
        });
        // 加载面具预设到下拉框
        const maskSelect = document.getElementById('contact-mask-select');
        maskSelect.innerHTML = '<option value="">使用面具...</option>';
        try {
            const presets = await maskDb.presets.toArray();
            presets.forEach(p => {
                maskSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        } catch (e) {}
        modal.style.display = 'flex';
        // 【核心隔离】彻底清空所有临时变量
        tempRoleAvatarBase64 = '';
        tempUserAvatarBase64 = '';
        tempContactNpcs = [];
        // 加载世界书列表到复选框
        const wbListContainer = document.getElementById('contact-worldbook-list');
        wbListContainer.innerHTML = '';
        try {
            const allWbs = await db.entries.toArray();
            if(allWbs.length === 0) {
                wbListContainer.innerHTML = '<div style="color:#bbb; font-size:12px; text-align:center;">暂无世界书设定</div>';
            } else {
                allWbs.forEach(wb => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; cursor: pointer;';
                    label.innerHTML = `<input type="checkbox" class="contact-wb-checkbox" value="${wb.id}" style="accent-color: #666; width: 14px; height: 14px;"> <span>${wb.title}</span> <span style="font-size:10px; color:#999;">(${wb.category==='global'?'全局':'局部'})</span>`;
                    wbListContainer.appendChild(label);
                });
            }
        } catch (e) {
            console.error("加载世界书失败", e);
        }
document.getElementById('contact-edit-id').value = '';
        document.getElementById('contact-role-name').value = '';
        document.getElementById('contact-role-group').value = '';
        document.getElementById('contact-role-gender').value = '男'; // 下拉框重置
        document.getElementById('contact-role-lang').value = '中';
        document.getElementById('contact-role-detail').value = '';
        document.getElementById('contact-role-avatar-preview').src = '';
        document.getElementById('contact-role-avatar-preview').style.display = 'none';
        document.getElementById('contact-role-avatar-text').style.display = 'block';
        document.getElementById('contact-user-name').value = '';
        document.getElementById('contact-user-gender').value = '女'; // 下拉框重置
        document.getElementById('contact-user-detail').value = '';
        document.getElementById('contact-user-avatar-preview').src = '';
        document.getElementById('contact-user-avatar-preview').style.display = 'none';
        document.getElementById('contact-user-avatar-text').style.display = 'block';
        if (id) {
            title.textContent = '编辑联系人';
            const c = await contactDb.contacts.get(id);
            if (c) {
                document.getElementById('contact-edit-id').value = c.id;
                document.getElementById('contact-role-name').value = c.roleName || '';
                if (c.roleGroup && contactGroups.includes(c.roleGroup)) {
                    document.getElementById('contact-role-group').value = c.roleGroup;
                }
                if (c.roleGender) document.getElementById('contact-role-gender').value = c.roleGender; // 下拉框回显
                if (c.roleLanguage) document.getElementById('contact-role-lang').value = c.roleLanguage;
                document.getElementById('contact-role-detail').value = c.roleDetail || '';
                if (c.roleAvatar) {
                    tempRoleAvatarBase64 = c.roleAvatar;
                    document.getElementById('contact-role-avatar-preview').src = c.roleAvatar;
                    document.getElementById('contact-role-avatar-preview').style.display = 'block';
                    document.getElementById('contact-role-avatar-text').style.display = 'none';
                }
                document.getElementById('contact-user-name').value = c.userName || '';
                if (c.userGender) document.getElementById('contact-user-gender').value = c.userGender; // 下拉框回显
                document.getElementById('contact-user-detail').value = c.userDetail || '';
                if (c.userAvatar) {
                    tempUserAvatarBase64 = c.userAvatar;
                    document.getElementById('contact-user-avatar-preview').src = c.userAvatar;
                    document.getElementById('contact-user-avatar-preview').style.display = 'block';
                    document.getElementById('contact-user-avatar-text').style.display = 'none';
                }
                if (c.npcs && Array.isArray(c.npcs)) {
                    tempContactNpcs = JSON.parse(JSON.stringify(c.npcs)); 
                }
                if (c.worldbooks && Array.isArray(c.worldbooks)) {
                    const checkboxes = document.querySelectorAll('.contact-wb-checkbox');
                    checkboxes.forEach(cb => {
                        if (c.worldbooks.includes(parseInt(cb.value))) {
                            cb.checked = true;
                        }
                    });
                }
            }
        } else {
            title.textContent = '添加新朋友';
            const myNameEl = document.getElementById('text-wechat-me-name');
            if (myNameEl) {
                document.getElementById('contact-user-name').value = (myNameEl.textContent || '').trim();
            }
        }
        renderContactNpcs();
    }
    function closeContactEditor() {
        document.getElementById('contact-editor-modal').style.display = 'none';
        document.getElementById('contact-role-avatar-input').value = '';
        document.getElementById('contact-user-avatar-input').value = '';
    }
    function handleContactAvatarChange(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'role') {
                tempRoleAvatarBase64 = e.target.result;
                const preview = document.getElementById('contact-role-avatar-preview');
                preview.src = tempRoleAvatarBase64;
                preview.style.display = 'block';
                document.getElementById('contact-role-avatar-text').style.display = 'none';
            } else {
                tempUserAvatarBase64 = e.target.result;
                const preview = document.getElementById('contact-user-avatar-preview');
                preview.src = tempUserAvatarBase64;
                preview.style.display = 'block';
                document.getElementById('contact-user-avatar-text').style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
    // 应用面具预设到用户设定
    async function applyMaskToContact() {
        const maskId = document.getElementById('contact-mask-select').value;
        if (!maskId) return;
        try {
            const p = await maskDb.presets.get(maskId);
            if (p) {
                document.getElementById('contact-user-name').value = p.name || '';
                if (p.gender) document.getElementById('contact-user-gender').value = p.gender; // 下拉框赋值
                document.getElementById('contact-user-detail').value = p.detail || '';
                if (p.avatar) {
                    tempUserAvatarBase64 = p.avatar;
                    const preview = document.getElementById('contact-user-avatar-preview');
                    preview.src = tempUserAvatarBase64;
                    preview.style.display = 'block';
                    document.getElementById('contact-user-avatar-text').style.display = 'none';
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    // NPC 拓展逻辑
    function renderContactNpcs() {
        const list = document.getElementById('contact-npc-list');
        list.innerHTML = '';
        tempContactNpcs.forEach((npc, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; position: relative;';
            item.innerHTML = `
                <div style="position: absolute; top: 10px; right: 10px; color: #ff4d4f; font-size: 16px; cursor: pointer; line-height: 1;" onclick="removeContactNpc(${index})">×</div>
                <input type="text" class="settings-input" style="padding: 6px 10px; font-size: 13px; width: 85%;" placeholder="NPC姓名" value="${npc.name}" onchange="updateContactNpc(${index}, 'name', this.value)">
                <textarea class="settings-input" style="height: 40px; padding: 6px 10px; font-size: 13px;" placeholder="NPC设定" onchange="updateContactNpc(${index}, 'detail', this.value)">${npc.detail}</textarea>
            `;
            list.appendChild(item);
        });
    }
    function addContactNpc() {
        tempContactNpcs.push({ name: '', detail: '' });
        renderContactNpcs();
    }
    function removeContactNpc(index) {
        tempContactNpcs.splice(index, 1);
        renderContactNpcs();
    }
    function updateContactNpc(index, field, value) {
        tempContactNpcs[index][field] = value;
    }
    // 保存联系人
    async function saveContact() {
        const id = document.getElementById('contact-edit-id').value;
        const roleName = document.getElementById('contact-role-name').value.trim();
        if (!roleName) return alert('请输入角色姓名');
        const myNameEl = document.getElementById('text-wechat-me-name');
        const fallbackUserName = myNameEl ? (myNameEl.textContent || '').trim() : '';
        // 获取选中的世界书
        const wbCheckboxes = document.querySelectorAll('.contact-wb-checkbox:checked');
        const selectedWorldbooks = Array.from(wbCheckboxes).map(cb => parseInt(cb.value));
        const data = {
            id: id || Date.now().toString(),
            roleName,
            roleGroup: document.getElementById('contact-role-group').value,
            roleGender: document.getElementById('contact-role-gender').value,
            roleLanguage: document.getElementById('contact-role-lang').value,
            roleDetail: document.getElementById('contact-role-detail').value.trim(),
            roleAvatar: tempRoleAvatarBase64,
            userName: document.getElementById('contact-user-name').value.trim() || fallbackUserName,
            userGender: document.getElementById('contact-user-gender').value,
            userDetail: document.getElementById('contact-user-detail').value.trim(),
            userAvatar: tempUserAvatarBase64,
            worldbooks: selectedWorldbooks,
            npcs: JSON.parse(JSON.stringify(tempContactNpcs || []))
        };
        try {
            await contactDb.contacts.put(data);
            if (typeof activeChatContact !== 'undefined' && activeChatContact && activeChatContact.id === data.id) {
                Object.assign(activeChatContact, data);
                if (typeof refreshChatWindow === 'function') {
                    await refreshChatWindow();
                }
            }
            closeContactEditor();
            await renderContacts();
            if (typeof renderChatList === 'function') {
                await renderChatList();
            }
        } catch (e) {
            alert('保存失败');
            console.error(e);
        }
    }
    async function deleteContact(id) {
        if (confirm('确定要删除这个联系人吗？')) {
            try {
                await contactDb.contacts.delete(id);
                renderContacts();
            } catch (e) {
                alert('删除失败');
                console.error(e);
            }
        }
    }
    // ====== 聊天列表功能逻辑 ======
    // 新增：获取 AM/PM 格式时间
    function getAmPmTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0点变成12点
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }
    const chatListDb = new Dexie("miniPhoneChatListDB");
    chatListDb.version(1).stores({ chats: 'id, contactId, lastTime' });
    chatListDb.version(2).stores({
        chats: 'id, contactId, lastTime',
        messages: '++id, contactId, sender, content, timeStr'
    });
    chatListDb.version(3).stores({
        chats: 'id, contactId, lastTime, pinned',
        messages: '++id, contactId, sender, content, timeStr'
    });
    chatListDb.version(4).stores({
        chats: 'id, contactId, lastTime, pinned',
        messages: '++id, contactId, sender, content, timeStr, source'
    });
    function openChatTypeModal() {
        document.getElementById('chat-type-modal').style.display = 'flex';
    }
    function closeChatTypeModal() {
        document.getElementById('chat-type-modal').style.display = 'none';
    }
    async function openSingleChatSelect() {
        closeChatTypeModal();
        const modal = document.getElementById('single-chat-select-modal');
        const listContainer = document.getElementById('single-chat-contact-list');
        listContainer.innerHTML = '';
        try {
            const contacts = await contactDb.contacts.toArray();
            if (contacts.length === 0) {
                listContainer.innerHTML = '<div style="color:#bbb; font-size:13px; text-align:center; margin-top:20px;">暂无联系人，请先添加新朋友</div>';
            } else {
                contacts.forEach(c => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: #f9f9f9; border-radius: 12px; padding: 10px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; border: 1px solid #eee;';
                    item.onclick = () => createSingleChat(c.id);
                    let avatarHtml = c.roleAvatar ? `<img src="${c.roleAvatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="color: #ccc; font-size: 12px;">无</span>`;
                    item.innerHTML = `
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fff; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center; border: 1px solid #f0f0f0;">
                            ${avatarHtml}
                        </div>
                        <div style="font-size: 14px; font-weight: 500; color: #333;">${c.roleName || '未命名'}</div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        } catch (e) {
            console.error("加载联系人失败", e);
        }
        modal.style.display = 'flex';
    }
    function closeSingleChatSelect() {
        document.getElementById('single-chat-select-modal').style.display = 'none';
    }
    async function createSingleChat(contactId) {
        try {
            const existingChat = await chatListDb.chats.where('contactId').equals(contactId).first();
            if (!existingChat) {
                const timeStr = getAmPmTime();
                await chatListDb.chats.add({
                    id: Date.now().toString(),
                    contactId: contactId,
                    lastTime: timeStr
                });
            }
            closeSingleChatSelect();
            renderChatList();
        } catch (e) {
            console.error("创建聊天失败", e);
        }
    }
    let chatListRenderToken = 0;
    async function renderChatList() {
        const renderToken = ++chatListRenderToken;
        const container = document.getElementById('chat-list-container');
        if (!container) return;
        try {
            let chats = await chatListDb.chats.toArray();
            if (renderToken !== chatListRenderToken) return;
            if (chats.length === 0) {
                container.innerHTML = '<div id="no-msg-tip" style="color:#bbb; font-size:13px; margin-top:100px; text-align:center;">暂无新消息</div>';
                return;
            }
            // 置顶的排前面，其余保持原始顺序（倒序）
            chats.reverse();
            const seenContactIds = new Set();
            chats = chats.filter(chat => {
                if (!chat || !chat.contactId) return false;
                if (seenContactIds.has(chat.contactId)) return false;
                seenContactIds.add(chat.contactId);
                return true;
            });
            chats.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

            const fragment = document.createDocumentFragment();

            for (let chat of chats) {
                if (renderToken !== chatListRenderToken) return;
                const contact = await contactDb.contacts.get(chat.contactId);
                if (!contact) continue;
                const msgs = await chatListDb.messages.where('contactId').equals(contact.id).toArray();
                let lastMsgText = '点击开始聊天...';
                if (msgs && msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg.isRecalled) {
                        lastMsgText = '撤回了一条消息';
                    } else {
                        lastMsgText = extractMsgPureText(lastMsg.content);
                    }
                }

                const isPinned = !!chat.pinned;
                let avatarHtml = contact.roleAvatar
                    ? `<img src="${contact.roleAvatar}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" decoding="async">`
                    : `<span style="color:#ccc;font-size:12px;">无</span>`;

                // 外层滑动容器
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-swipe-wrapper';
                if (isPinned) wrapper.classList.add('chat-item-pinned-wrap');
                wrapper.setAttribute('data-chat-id', chat.id);
                wrapper.setAttribute('data-contact-id', contact.id);

                // 操作按钮区（右侧，左滑后显示）
                const actions = document.createElement('div');
                actions.className = 'chat-swipe-actions';
                actions.innerHTML = `
                    <div class="chat-swipe-btn chat-swipe-pin${isPinned ? ' pinned' : ''}" onclick="togglePinChat('${chat.id}', this)">
                        ${isPinned ? '取消置顶' : '置顶'}
                    </div>
                    <div class="chat-swipe-btn chat-swipe-delete" onclick="deleteChatItem('${chat.id}', this)">删除</div>
                `;

                // 主内容区
                const item = document.createElement('div');
                item.className = 'chat-swipe-item';
                if (isPinned) item.classList.add('chat-item-pinned');
                // 读取备注
                let displayName = contact.roleName || '未命名';
                try {
                    const remark = await localforage.getItem('cd_settings_' + contact.id + '_remark');
                    if (remark && remark !== '未设置') displayName = remark;
                } catch(e) {}
                const blockedTag = contact.blocked ? '<span style="font-size:10px;color:#e74c3c;font-weight:600;background:#fff0f0;padding:1px 5px;border-radius:6px;margin-left:4px;">[已拉黑]</span>' : '';
                item.innerHTML = `
                    <div style="width:45px;height:45px;border-radius:50%;background:#fdfdfd;border:1px solid #f0f0f0;overflow:hidden;flex-shrink:0;display:flex;justify-content:center;align-items:center;">
                        ${avatarHtml}
                    </div>
                    <div style="flex:1;margin-left:12px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                                ${isPinned ? '<span class="chat-pin-tag">置顶</span>' : ''}
                                <span style="font-size:15px;font-weight:600;color:#333;">${displayName}</span>${blockedTag}
                            </div>
                            <span style="font-size:11px;color:#999;flex-shrink:0;">${chat.lastTime || ''}</span>
                        </div>
                        <span style="font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lastMsgText}</span>
                    </div>
                `;
                item.onclick = () => enterChatWindow(contact.id);

                // 绑定左滑手势
                bindSwipeGesture(wrapper, item);

                wrapper.appendChild(actions);
                wrapper.appendChild(item);
                fragment.appendChild(wrapper);
            }

            if (renderToken !== chatListRenderToken) return;
            if (!fragment.childNodes.length) {
                container.innerHTML = '<div id="no-msg-tip" style="color:#bbb;font-size:13px;margin-top:100px;text-align:center;">暂无新消息</div>';
                return;
            }
            container.replaceChildren(fragment);
        } catch (e) {
            console.error("加载聊天列表失败", e);
        }
    }

    // 左滑手势绑定（同时支持触摸和鼠标）
    function bindSwipeGesture(wrapper, item) {
        let startX = 0, startY = 0, currentX = 0;
        let dragging = false, isHorizontal = null;
        const ACTION_WIDTH = 130;

        function closeOtherSwipes(except) {
            document.querySelectorAll('.chat-swipe-item.swiped').forEach(el => {
                if (el !== except) {
                    el.style.transition = 'transform 0.25s ease';
                    el.style.transform = 'translateX(0)';
                    el.classList.remove('swiped');
                }
            });
        }

        function snapItem() {
            item.style.transition = 'transform 0.25s ease';
            const alreadySwiped = item.classList.contains('swiped');
            const threshold = ACTION_WIDTH * 0.35;
            if (!alreadySwiped && currentX < -threshold) {
                item.style.transform = `translateX(-${ACTION_WIDTH}px)`;
                item.classList.add('swiped');
                closeOtherSwipes(item);
            } else if (alreadySwiped && currentX > threshold) {
                item.style.transform = 'translateX(0)';
                item.classList.remove('swiped');
            } else if (alreadySwiped) {
                item.style.transform = `translateX(-${ACTION_WIDTH}px)`;
            } else {
                item.style.transform = 'translateX(0)';
            }
        }

        // ===== 触摸 =====
        wrapper.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = 0; dragging = false; isHorizontal = null;
            item.style.transition = 'none';
        }, { passive: true });

        wrapper.addEventListener('touchmove', e => {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (isHorizontal === null) {
                if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                isHorizontal = Math.abs(dx) > Math.abs(dy);
            }
            if (!isHorizontal) return;
            dragging = true;
            currentX = dx;
            const base = item.classList.contains('swiped') ? -ACTION_WIDTH : 0;
            const offset = Math.max(-ACTION_WIDTH, Math.min(0, base + dx));
            item.style.transform = `translateX(${offset}px)`;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            if (dragging) snapItem();
            dragging = false;
        });

        // ===== 鼠标（电脑端）=====
        wrapper.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            currentX = 0; dragging = false; isHorizontal = null;
            item.style.transition = 'none';

            const onMove = ev => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (isHorizontal === null) {
                    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                    isHorizontal = Math.abs(dx) > Math.abs(dy);
                }
                if (!isHorizontal) return;
                dragging = true;
                currentX = dx;
                const base = item.classList.contains('swiped') ? -ACTION_WIDTH : 0;
                const offset = Math.max(-ACTION_WIDTH, Math.min(0, base + dx));
                item.style.transform = `translateX(${offset}px)`;
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (dragging) snapItem();
                dragging = false;
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // 点击已展开项时收回
        item.addEventListener('click', e => {
            if (item.classList.contains('swiped')) {
                e.stopPropagation();
                item.style.transition = 'transform 0.25s ease';
                item.style.transform = 'translateX(0)';
                item.classList.remove('swiped');
            }
        }, true);
    }

    // 置顶/取消置顶
    async function togglePinChat(chatId, btnEl) {
        try {
            const chat = await chatListDb.chats.get(chatId);
            if (!chat) return;
            const newPinned = !chat.pinned;
            await chatListDb.chats.update(chatId, { pinned: newPinned });
            renderChatList();
        } catch (e) {
            console.error("置顶操作失败", e);
        }
    }

    // 删除聊天项（从列表移除，保留消息记录）
    async function deleteChatItem(chatId, btnEl) {
        try {
            await chatListDb.chats.delete(chatId);
            renderChatList();
        } catch (e) {
            console.error("删除聊天失败", e);
        }
    }

    // 初始化渲染联系人列表与聊天列表，并恢复钱包数据
    document.addEventListener('DOMContentLoaded', () => {
        renderContacts();
        renderChatList();
        initWalletData();
    });
// 小说应用控制逻辑
    const novelBtn = document.getElementById('app-btn-novel');
    if(novelBtn) {
        novelBtn.onclick = (e) => { 
            e.stopPropagation(); 
            openApp('novel-app');
        };
    }
    function closeNovelApp() {
        document.getElementById('novel-app').style.display = 'none';
    }
