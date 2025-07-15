const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const express = require('express');
const axios = require('axios');
const https = require('https');
const inquirer = require('inquirer');

const API_BASE_URL = 'https://api.wfly.me:5542';
const LOCAL_SERVER_PORT = 3000;
const SESSION_DIR = path.join(__dirname, 'session');
const TOKEN_FILE = path.join(SESSION_DIR, '89717YU7XHCYYSBX.xxwflyoi');

const api = axios.create({
    baseURL: API_BASE_URL,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

async function ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        await fsp.mkdir(SESSION_DIR);
    }
}

async function getToken() {
    try {
        return await fsp.readFile(TOKEN_FILE, 'utf-8');
    } catch (error) {
        return null;
    }
}

async function saveToken(token) {
    await fsp.writeFile(TOKEN_FILE, token, 'utf-8');
}

async function handleLogin() {
    const answers = await inquirer.prompt([
        { type: 'input', name: 'username', message: 'Enter username:' },
        { type: 'password', name: 'password', message: 'Enter password:', mask: '•' }
    ]);
    try {
        const response = await api.post('/login', answers);
        await saveToken(response.data.token);
        console.log('\x1b[32m%s\x1b[0m', '✓ Login successful!');
        return response.data.token;
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `✗ Login error: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

async function handleRegister() {
    const answers = await inquirer.prompt([
        { type: 'input', name: 'username', message: 'Create a username:' },
        { type: 'password', name: 'password', message: 'Create a password:', mask: '•' }
    ]);
    try {
        await api.post('/register', answers);
        console.log('\x1b[32m%s\x1b[0m', '✓ Registration successful! Now please log in.');
        return await handleLogin();
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `✗ Registration error: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

function startLocalServer(token) {
    const app = express();

    app.get('/', (req, res) => {
        res.send(getHtmlInterface(API_BASE_URL));
    });

    app.get('/get-token', (req, res) => {
        res.json({ token });
    });

    app.listen(LOCAL_SERVER_PORT, () => {
        const url = `http://localhost:${LOCAL_SERVER_PORT}`;
        console.log('\n================================================================');
        console.log('\x1b[35m%s\x1b[0m', `  Local server started.`);
        console.log(`  Opening messenger in browser: \x1b[36m${url}\x1b[0m`);
        console.log('================================================================');
        
        import('open').then(openModule => {
            openModule.default(url);
        }).catch(err => {
            console.log('\x1b[33m%s\x1b[0m', `\n[WARNING] Could not automatically open browser. Please open manually: ${url}`);
            console.log(`(For auto-open, ensure 'open' package is installed: npm install open)`);
        });
    });
}

async function main() {
    console.log('\x1b[35m%s\x1b[0m', '--- WFLY Messenger Client v4.6 ---');
    await ensureSessionDir();
    let token = await getToken();

    if (!token) {
        console.log('Session not found. Please log in or register.');
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: ['Login', 'Register', 'Exit'],
            }
        ]);

        if (action === 'Login') token = await handleLogin();
        else if (action === 'Register') token = await handleRegister();
        else { console.log('Exiting.'); process.exit(0); }

        if (!token) {
            console.log('Failed to get token. Please try again.');
            process.exit(1);
        }
    } else {
        console.log('\x1b[32m%s\x1b[0m', '✓ Active session detected.');
    }

    startLocalServer(token);
}

function getHtmlInterface(apiBaseUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WFLY Messenger</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        :root {
            --bg-main: #0e1621;
            --bg-sidebar: #17212b;
            --bg-content: #0e1621;
            --bg-input: #243447;
            --bg-hover: #2a3b4c;
            --primary-accent: #5288c1;
            --primary-accent-hover: #639cd1;
            --text-main: #e0e0e0;
            --text-secondary: #8a9ba8;
            --text-title: #ffffff;
            --border-color: #243447;
            --online-color: #4ec95d;
            --typing-color: #5288c1;
            --error-color: #e74c3c;
            --font-main: 'Inter', sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { 
            height: 100%; 
            font-family: var(--font-main); 
            background-color: var(--bg-main); 
            color: var(--text-main);
            overflow: hidden;
        }
        #app-container { display: flex; height: 100vh; }

        #sidebar {
            width: 340px;
            background-color: var(--bg-sidebar);
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--border-color);
        }
        .sidebar-header {
            padding: 10px 15px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        #settings-btn, #search-user-btn {
            background: none; border: none; cursor: pointer; color: var(--text-secondary);
            padding: 8px; border-radius: 50%; transition: background-color 0.2s, color 0.2s;
        }
        #settings-btn:hover, #search-user-btn:hover { background-color: var(--bg-hover); color: white; }
        #search-chats-input {
            flex-grow: 1;
            padding: 8px 15px;
            border-radius: 20px;
            border: none;
            background-color: var(--bg-input);
            color: var(--text-main);
            outline: none;
        }
        #chat-list { flex-grow: 1; overflow-y: auto; }
        .chat-item {
            display: flex; align-items: center; padding: 10px 15px;
            cursor: pointer; transition: background-color 0.2s;
            border-bottom: 1px solid var(--border-color);
        }
        .chat-item:hover { background-color: var(--bg-hover); }
        .chat-item.active { background-color: var(--primary-accent); }
        .avatar {
            width: 50px; height: 50px; border-radius: 50%;
            background-color: var(--primary-accent);
            display: flex; align-items: center; justify-content: center;
            font-weight: 600; font-size: 22px; color: white;
            margin-right: 15px;
            background-size: cover;
            background-position: center;
            flex-shrink: 0;
        }
        .chat-item .chat-info { flex-grow: 1; overflow: hidden; }
        .chat-item .partner-name { font-weight: 600; color: var(--text-title); }
        .chat-item .last-message { 
            font-size: 14px; color: var(--text-secondary); 
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .last-message.typing { color: var(--typing-color); font-style: italic; }
        
        #main-content { flex-grow: 1; display: flex; flex-direction: column; background-image: url('https://i.imgur.com/E39S2vI.png'); }
        #welcome-screen {
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            height: 100%; text-align: center; padding: 20px;
        }
        #welcome-screen .welcome-box { background-color: rgba(23, 33, 43, 0.8); padding: 30px; border-radius: 10px; }
        #welcome-screen h2 { font-size: 24px; margin-bottom: 10px; color: var(--text-title); }
        #chat-window { display: flex; flex-direction: column; height: 100%; }
        #chat-header {
            padding: 10px 15px; background-color: var(--bg-sidebar);
            border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center; cursor: pointer;
        }
        #chat-header .avatar { margin-right: 10px; width: 40px; height: 40px; font-size: 18px; }
        #chat-header-info { display: flex; flex-direction: column; }
        #chat-partner-name { font-size: 16px; font-weight: 600; }
        #chat-partner-status-header { font-size: 13px; color: var(--text-secondary); transition: color 0.2s; }
        #chat-partner-status-header.online, #chat-partner-status-header.typing { color: var(--primary-accent); }
        
        #message-list {
            flex-grow: 1; padding: 20px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 5px;
        }
        .message {
            max-width: 65%; padding: 8px 15px; border-radius: 18px;
            line-height: 1.5; margin-bottom: 2px;
            word-wrap: break-word;
            animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .message.sent {
            background-color: var(--primary-accent); color: white;
            align-self: flex-end; border-bottom-right-radius: 5px;
        }
        .message.received {
            background-color: var(--bg-sidebar);
            align-self: flex-start; border-bottom-left-radius: 5px;
        }
        
        #chat-footer {
            padding: 10px 20px; background-color: var(--bg-sidebar);
        }
        #message-form { display: flex; align-items: center; gap: 15px; }
        #message-input {
            flex-grow: 1; padding: 12px 20px; border: none;
            border-radius: 20px; background-color: var(--bg-input);
            color: var(--text-main); font-size: 15px; outline: none;
        }
        #send-btn {
            background-color: var(--primary-accent); color: white;
            border: none; border-radius: 50%; width: 44px; height: 44px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, background-color 0.2s;
        }
        #send-btn:hover { transform: scale(1.1); }
        #send-btn:active { transform: scale(0.9); }
        
        .modal {
            position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
            opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s;
        }
        .modal.visible { opacity: 1; visibility: visible; }
        .modal-content {
            background-color: var(--bg-sidebar); padding: 0; border-radius: 12px;
            width: 90%; max-width: 400px; position: relative;
            transform: scale(0.9); transition: transform 0.3s;
            overflow: hidden;
        }
        .modal.visible .modal-content { transform: scale(1); }
        .modal-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { color: var(--text-title); }
        .close-btn { background:none; border:none; font-size: 2rem; cursor: pointer; color: var(--text-secondary); }
        .modal-body { padding: 0 20px 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-size: 14px; color: var(--text-secondary); }
        .form-group input, .form-group textarea {
            width: 100%; padding: 10px; border-radius: 8px;
            border: 1px solid var(--border-color); background-color: var(--bg-input);
            color: var(--text-main); font-size: 15px;
        }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .file-upload-label {
            display: block; padding: 10px; border: 2px dashed var(--border-color);
            border-radius: 8px; text-align: center; cursor: pointer; transition: border-color 0.2s;
        }
        .file-upload-label:hover { border-color: var(--primary-accent); }
        .modal-footer { padding: 20px; text-align: right; background-color: var(--bg-input); }
        .btn-primary {
            padding: 10px 20px; background-color: var(--primary-accent); color: white;
            border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s;
        }
        .btn-primary:hover { background-color: var(--primary-accent-hover); }
        .hidden { display: none !important; }

        #avatar-preview, #banner-preview {
            max-width: 100px; max-height: 100px; border-radius: 50%; margin-top: 10px; object-fit: cover;
        }
        #banner-preview { max-width: 100%; border-radius: 8px; }
        #profile-view-banner {
            width: 100%; height: 150px; background-size: cover; background-position: center;
            background-color: var(--primary-accent);
        }
        #profile-view-avatar {
            width: 100px; height: 100px; border-radius: 50%;
            border: 4px solid var(--bg-sidebar);
            margin: -50px auto 0;
            position: relative;
            background-size: cover; background-position: center;
        }
        #profile-view-username { text-align: center; font-size: 22px; font-weight: bold; margin-top: 10px; }
        #profile-view-bio { text-align: center; color: var(--text-secondary); margin-top: 5px; padding: 0 20px 20px; }
    </style>
</head>
<body>
    <div id="app-container">
        <aside id="sidebar">
            <div class="sidebar-header">
                <button id="settings-btn" title="Settings">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <input type="text" id="search-chats-input" placeholder="Search">
                 <button id="search-user-btn" title="Find User">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
            </div>
            <div id="chat-list"></div>
        </aside>
        <main id="main-content">
            <div id="welcome-screen">
                <div class="welcome-box">
                    <h2>WFLY Messenger</h2>
                    <p>Select a chat to start messaging.</p>
                </div>
            </div>
            <div id="chat-window" class="hidden">
                <header id="chat-header">
                    <div class="avatar" id="chat-header-avatar"></div>
                    <div id="chat-header-info">
                        <h3 id="chat-partner-name"></h3>
                        <span id="chat-partner-status-header"></span>
                    </div>
                </header>
                <div id="message-list"></div>
                <footer id="chat-footer">
                    <form id="message-form">
                        <input type="text" id="message-input" placeholder="Message" autocomplete="off">
                        <button id="send-btn" type="submit" title="Send">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-8.4c.8-.4.8-1.6 0-2L3.4 1.6c-.7-.3-1.4.4-1.2 1.2l2.3 7.2H12c.6 0 1 .4 1 1s-.4 1-1 1H4.5l-2.3 7.2c-.2.8.5 1.5 1.2 1.2z"/></svg>
                        </button>
                    </form>
                </footer>
            </div>
        </main>
    </div>

    <div id="search-modal" class="modal">
        <div class="modal-content">
             <div class="modal-header"><h2>Find User</h2><button class="close-btn">&times;</button></div>
             <div class="modal-body">
                <form id="search-form"><input type="text" id="search-input" placeholder="Enter username..."></form>
                <div id="search-results"></div>
             </div>
        </div>
    </div>
    
    <div id="settings-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h2>Settings</h2><button class="close-btn">&times;</button></div>
            <div class="modal-body">
                <form id="profile-form">
                    <div class="form-group"><label>Banner</label><img id="banner-preview" class="hidden"><label for="profile-banner-input" class="file-upload-label">Click to upload banner</label><input type="file" id="profile-banner-input" accept="image/*" class="hidden"></div>
                    <div class="form-group"><label>Avatar</label><img id="avatar-preview" class="hidden"><label for="profile-avatar-input" class="file-upload-label">Click to upload avatar</label><input type="file" id="profile-avatar-input" accept="image/*" class="hidden"></div>
                    <div class="form-group"><label>Username</label><input type="text" id="profile-username" disabled></div>
                    <div class="form-group"><label>Bio</label><textarea id="profile-bio" placeholder="Write something about yourself..."></textarea></div>
                </form>
            </div>
            <div class="modal-footer"><button type="submit" form="profile-form" class="btn-primary">Save Changes</button></div>
        </div>
    </div>

    <div id="profile-view-modal" class="modal">
        <div class="modal-content">
            <div id="profile-view-banner"></div>
            <div id="profile-view-avatar"></div>
            <div class="modal-body">
                <h2 id="profile-view-username"></h2>
                <p id="profile-view-bio"></p>
            </div>
            <div class="modal-footer"><button class="close-btn btn-primary">Close</button></div>
        </div>
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const API_BASE_URL = '${apiBaseUrl}';
        const state = {
            ws: null, token: null, user: null,
            chats: new Map(),
            messages: new Map(),
            activeChatId: null,
            typingTimers: new Map(),
            isUnloading: false, 
            reconnectDelay: 1000,
        };

        const $ = (selector) => document.querySelector(selector);
        const $$ = (selector) => document.querySelectorAll(selector);
        
        const apiClient = {
            async get(endpoint) {
                return axios.get(\`\${API_BASE_URL}\${endpoint}\`, {
                    headers: { 'Authorization': \`Bearer \${state.token}\` }
                });
            },
            async updateProfile(formData) {
                return axios.put(\`\${API_BASE_URL}/profile\`, formData, {
                    headers: { 
                        'Authorization': \`Bearer \${state.token}\`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
        };

        async function connect() {
            try {
                if (!state.token) {
                    const response = await fetch('/get-token');
                    if (!response.ok) throw new Error('Failed to get token');
                    const data = await response.json();
                    state.token = data.token;
                }
                state.ws = new WebSocket('wss://api.wfly.me:5542');
                setupWsEvents();
            } catch (error) {
                console.error('Connection setup error:', error);
            }
        }

        function setupWsEvents() {
            state.ws.onopen = () => {
                console.log('WebSocket: Connected.');
                sendMessage({ type: 'auth', payload: { token: state.token } });
            };
            state.ws.onmessage = (event) => handleServerMessage(JSON.parse(event.data));
            state.ws.onclose = () => {
                if (state.isUnloading) return;
                console.log(\`WebSocket: Disconnected. Reconnecting in 1 second...\`);
                setTimeout(connect, state.reconnectDelay);
            };
            state.ws.onerror = (error) => console.error('WebSocket Error:', error);
        }

        function sendMessage(data) {
            if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                state.ws.send(JSON.stringify(data));
            }
        }

        function handleServerMessage({ type, payload }) {
            switch (type) {
                case 'auth_success':
                    state.user = payload;
                    sendMessage({ type: 'get_chat_list' });
                    break;
                case 'chat_list':
                    payload.forEach(chat => {
                        const existing = state.chats.get(chat.chatId);
                        state.chats.set(chat.chatId, { ...existing, ...chat });
                    });
                    renderChatList();
                    break;
                case 'chat_history':
                    state.messages.set(payload.chatId, payload.messages);
                    renderMessages(payload.chatId);
                    break;
                case 'new_message':
                    if (!state.messages.has(payload.chatId)) state.messages.set(payload.chatId, []);
                    state.messages.get(payload.chatId).push(payload);
                    const chat = state.chats.get(payload.chatId);
                    if (chat) {
                        chat.lastMessageTimestamp = payload.timestamp;
                        chat.lastMessage = payload.content;
                    }
                    renderChatList();
                    if (payload.chatId === state.activeChatId) appendMessage(payload);
                    break;
                case 'user_status_update':
                    updatePartnerStatus(payload);
                    break;
                case 'search_results':
                    renderSearchResults(payload);
                    break;
            }
        }

        function renderChatList() {
            const list = $('#chat-list');
            const sortedChats = Array.from(state.chats.values()).sort((a, b) => 
                new Date(b.lastMessageTimestamp || 0) - new Date(a.lastMessageTimestamp || 0)
            );

            list.innerHTML = '';
            if (sortedChats.length === 0) {
                list.innerHTML = '<p style="padding: 20px; text-align: center;">No chats yet. Find a user to start!</p>';
                return;
            }

            sortedChats.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'chat-item';
                item.dataset.chatId = chat.chatId;
                if (chat.chatId === state.activeChatId) item.classList.add('active');
                
                const avatarUrl = chat.partnerAvatar ? \`\${API_BASE_URL}\${chat.partnerAvatar}\` : '';
                const initial = chat.partnerUsername.charAt(0).toUpperCase();
                const lastMessage = chat.lastMessage || 'No messages yet...';

                item.innerHTML = \`
                    <div class="avatar" style="background-image: url('\${avatarUrl}')">\${!avatarUrl ? initial : ''}</div>
                    <div class="chat-info">
                        <div class="partner-name">\${chat.partnerUsername}</div>
                        <div class="last-message" data-partner-id="\${chat.partnerId}">\${lastMessage}</div>
                    </div>
                \`;
                item.addEventListener('click', () => selectChat(chat.chatId));
                list.appendChild(item);
            });
        }
        
        function selectChat(chatId) {
            state.activeChatId = chatId;
            $('#welcome-screen').classList.add('hidden');
            $('#chat-window').classList.remove('hidden');
            renderChatList();
            
            const chat = state.chats.get(chatId);
            $('#chat-partner-name').textContent = chat.partnerUsername;
            
            const avatarUrl = chat.partnerAvatar ? \`\${API_BASE_URL}\${chat.partnerAvatar}\` : '';
            const initial = chat.partnerUsername.charAt(0).toUpperCase();
            $('#chat-header-avatar').style.backgroundImage = \`url('\${avatarUrl}')\`;
            $('#chat-header-avatar').textContent = !avatarUrl ? initial : '';

            updateChatHeaderStatus(chat.partnerId);
            
            sendMessage({ type: 'get_history', payload: { chatId } });
        }
        
        function renderMessages(chatId) {
            const list = $('#message-list');
            list.innerHTML = '';
            const messages = state.messages.get(chatId) || [];
            messages.forEach(appendMessage);
        }
        
        function appendMessage(msg) {
            const item = document.createElement('div');
            item.className = \`message \${msg.senderId === state.user.id ? 'sent' : 'received'}\`;
            item.textContent = msg.content;
            $('#message-list').appendChild(item);
            $('#message-list').scrollTop = $('#message-list').scrollHeight;
        }

        function updatePartnerStatus({ userId, status, chatId }) {
            const chat = Array.from(state.chats.values()).find(c => c.partnerId === userId);
            if (chat) {
                chat.status = status;
                const statusEl = $(\`.last-message[data-partner-id="\${userId}"]\`);
                if (statusEl) {
                    if (status === 'typing') {
                        statusEl.textContent = 'typing...';
                        statusEl.classList.add('typing');
                    } else {
                        statusEl.textContent = chat.lastMessage || 'No messages yet...';
                        statusEl.classList.remove('typing');
                    }
                }
            }
            if (state.activeChatId === chatId) {
                updateChatHeaderStatus(userId);
            }
        }
        
        function updateChatHeaderStatus(partnerId) {
             const chat = Array.from(state.chats.values()).find(c => c.partnerId === partnerId);
             if (chat) {
                $('#chat-partner-status-header').textContent = chat.status;
                $('#chat-partner-status-header').className = \`partner-status \${chat.status}\`;
             }
        }

        function renderSearchResults(users) {
            const resultsEl = $('#search-results');
            resultsEl.innerHTML = '';
            if (users.length === 0) {
                resultsEl.innerHTML = '<p>No users found.</p>';
                return;
            }
            users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'chat-item';
                const avatarUrl = user.avatar_url ? \`\${API_BASE_URL}\${user.avatar_url}\` : '';
                const initial = user.username.charAt(0).toUpperCase();
                item.innerHTML = \`
                    <div class="avatar" style="background-image: url('\${avatarUrl}')">\${!avatarUrl ? initial : ''}</div>
                    <div class="chat-info"><div class="partner-name">\${user.username}</div></div>
                \`;
                item.onclick = () => {
                    sendMessage({ type: 'start_chat', payload: { userId: user.id } });
                    $('#search-modal').classList.remove('visible');
                };
                resultsEl.appendChild(item);
            });
        }

        async function openProfileModal(userId) {
            try {
                const { data: profile } = await apiClient.get(\`/users/\${userId}\`);
                $('#profile-view-banner').style.backgroundImage = \`url(\${API_BASE_URL}\${profile.banner_url || ''})\`;
                const avatarUrl = profile.avatar_url ? \`\${API_BASE_URL}\${profile.avatar_url}\` : '';
                $('#profile-view-avatar').style.backgroundImage = \`url('\${avatarUrl}')\`;
                $('#profile-view-username').textContent = profile.username;
                $('#profile-view-bio').textContent = profile.bio || 'No bio yet.';
                $('#profile-view-modal').classList.add('visible');
            } catch (error) {
                console.error("Failed to load user profile:", error);
            }
        }
        
        async function openSettingsModal() {
            try {
                const { data: profile } = await apiClient.get('/profile');
                $('#profile-username').value = profile.username;
                $('#profile-bio').value = profile.bio || '';
                
                $('#avatar-preview').classList.toggle('hidden', !profile.avatar_url);
                if (profile.avatar_url) $('#avatar-preview').src = \`\${API_BASE_URL}\${profile.avatar_url}\`;
                
                $('#banner-preview').classList.toggle('hidden', !profile.banner_url);
                if (profile.banner_url) $('#banner-preview').src = \`\${API_BASE_URL}\${profile.banner_url}\`;
                
                $('#settings-modal').classList.add('visible');
            } catch (error) {
                console.error("Failed to load profile:", error);
                alert("Could not load your profile.");
            }
        }
        
        function handleImagePreview(input, preview) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            }
        }

        $('#settings-btn').addEventListener('click', openSettingsModal);
        
        $$('.modal .close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('visible');
            });
        });
        
        $('#search-user-btn').addEventListener('click', () => $('#search-modal').classList.add('visible'));
        
        $('#chat-header').addEventListener('click', () => {
            const chat = state.chats.get(state.activeChatId);
            if (chat) openProfileModal(chat.partnerId);
        });

        $('#search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const query = $('#search-input').value.trim();
            if (query) sendMessage({ type: 'search_user', payload: { query } });
        });

        $('#profile-avatar-input').addEventListener('change', () => handleImagePreview($('#profile-avatar-input'), $('#avatar-preview')));
        $('#profile-banner-input').addEventListener('change', () => handleImagePreview($('#profile-banner-input'), $('#banner-preview')));
        
        $('#profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('bio', $('#profile-bio').value);
            if ($('#profile-avatar-input').files[0]) formData.append('avatar', $('#profile-avatar-input').files[0]);
            if ($('#profile-banner-input').files[0]) formData.append('banner', $('#profile-banner-input').files[0]);

            try {
                await apiClient.updateProfile(formData);
                alert("Profile updated successfully!");
                $('#settings-modal').classList.remove('visible');
            } catch (error) {
                console.error("Profile update failed:", error);
                alert("Failed to update profile.");
            }
        });
        
        $('#message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const content = $('#message-input').value.trim();
            if (content && state.activeChatId) {
                sendMessage({ type: 'send_message', payload: { chatId: state.activeChatId, content } });
                $('#message-input').value = '';
            }
        });
        
        window.addEventListener('beforeunload', () => {
            if (state.ws) {
                state.isUnloading = true;
                state.ws.close();
            }
        });

        connect();
    });
    </script>
</body>
</html>
    `;
}

main();
