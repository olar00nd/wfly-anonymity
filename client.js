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
        { type: 'input', name: 'username', message: 'Enter login:' },
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
        { type: 'input', name: 'username', message: 'Create a login:' },
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
        res.send(getHtmlInterface());
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
    console.log('\x1b[35m%s\x1b[0m', '--- WFLY Messenger Client v3.7 ---');
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

function getHtmlInterface() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WFLY Messenger</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        :root {
            --bg-main: #11101d;
            --bg-sidebar: #1d1b31;
            --bg-content: #11101d;
            --bg-input: #2a2d3e;
            --bg-hover: #2a2d3e;
            --primary-accent: #8e44ad;
            --primary-accent-hover: #9b59b6;
            --text-main: #e0e0e0;
            --text-secondary: #a0a0b0;
            --text-title: #ffffff;
            --border-color: #2a2d3e;
            --online-color: #2ecc71;
            --typing-color: #3498db;
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
            width: 320px;
            background-color: var(--bg-sidebar);
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--border-color);
            transition: width 0.3s ease;
        }
        .sidebar-header {
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-color);
        }
        .sidebar-header h2 { font-size: 24px; color: var(--text-title); }
        #search-user-btn {
            background: none; border: none; cursor: pointer; color: var(--text-secondary);
            padding: 5px; border-radius: 50%; transition: background-color 0.2s, color 0.2s;
        }
        #search-user-btn:hover { background-color: var(--bg-hover); color: var(--text-main); }
        #chat-list { flex-grow: 1; overflow-y: auto; }
        .chat-item {
            display: flex; align-items: center; padding: 15px 20px;
            cursor: pointer; transition: background-color 0.2s;
            border-bottom: 1px solid var(--border-color);
        }
        .chat-item:hover { background-color: var(--bg-hover); }
        .chat-item.active { background-color: var(--primary-accent); }
        .chat-item .avatar {
            width: 48px; height: 48px; border-radius: 50%;
            background-color: var(--primary-accent);
            display: flex; align-items: center; justify-content: center;
            font-weight: 600; font-size: 20px; color: white;
            margin-right: 15px;
        }
        .chat-item .chat-info { flex-grow: 1; }
        .chat-item .partner-name { font-weight: 600; color: var(--text-title); }
        .chat-item .partner-status { 
            font-size: 12px; color: var(--text-secondary); 
            display: flex; align-items: center;
        }
        .status-indicator {
            width: 8px; height: 8px; border-radius: 50%;
            margin-right: 6px; transition: background-color 0.3s;
        }
        .status-indicator.online { background-color: var(--online-color); }
        .status-indicator.offline { background-color: var(--text-secondary); }
        .sidebar-footer {
            padding: 15px 20px; border-top: 1px solid var(--border-color);
            display: flex; justify-content: space-between; align-items: center;
            font-size: 13px; color: var(--text-secondary);
        }
        .sidebar-footer .error { color: var(--error-color); }
        #language-selector {
            background-color: var(--bg-input);
            color: var(--text-main);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            padding: 4px 8px;
            outline: none;
        }
        #main-content { flex-grow: 1; display: flex; flex-direction: column; }
        #welcome-screen {
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            height: 100%; text-align: center; padding: 20px;
        }
        #welcome-screen svg { width: 80px; height: 80px; color: var(--primary-accent); margin-bottom: 20px;}
        #welcome-screen h2 { font-size: 28px; margin-bottom: 10px; color: var(--text-title); }
        #chat-window { display: flex; flex-direction: column; height: 100%; }
        #chat-header {
            padding: 15px 25px; background-color: var(--bg-sidebar);
            border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center;
        }
        #chat-partner-name { font-size: 18px; font-weight: 600; }
        #chat-partner-status { margin-left: auto; font-size: 14px; color: var(--text-secondary); }
        #chat-partner-status.typing { color: var(--typing-color); }
        #message-list {
            flex-grow: 1; padding: 25px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 15px;
        }
        .message {
            max-width: 70%; padding: 12px 18px; border-radius: 20px;
            line-height: 1.5; animation: pop-in 0.3s ease;
        }
        @keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .message.sent {
            background-color: var(--primary-accent); align-self: flex-end;
            border-bottom-right-radius: 5px; color: white;
        }
        .message.received {
            background-color: var(--bg-input); align-self: flex-start;
            border-bottom-left-radius: 5px;
        }
        #chat-footer {
            padding: 20px 25px; border-top: 1px solid var(--border-color);
        }
        #message-form { display: flex; align-items: center; gap: 15px; }
        #message-input {
            flex-grow: 1; padding: 14px 20px; border: none;
            border-radius: 25px; background-color: var(--bg-input);
            color: var(--text-main); font-size: 16px; outline: none;
            transition: box-shadow 0.2s;
        }
        #message-input:focus { box-shadow: 0 0 0 2px var(--primary-accent); }
        #send-btn {
            background-color: var(--primary-accent); color: white;
            border: none; border-radius: 50%; width: 50px; height: 50px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: background-color 0.2s;
        }
        #send-btn:hover { background-color: var(--primary-accent-hover); }
        .modal {
            position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
            opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s;
        }
        .modal.visible { opacity: 1; visibility: visible; }
        .modal-content {
            background-color: var(--bg-sidebar); padding: 30px; border-radius: 12px;
            width: 90%; max-width: 450px; position: relative;
            transform: scale(0.9); transition: transform 0.3s;
        }
        .modal.visible .modal-content { transform: scale(1); }
        .close-btn {
            position: absolute; top: 15px; right: 15px; font-size: 2rem;
            cursor: pointer; color: var(--text-secondary); transition: color 0.2s;
        }
        .close-btn:hover { color: var(--text-main); }
        #search-form { display: flex; margin: 1rem 0; }
        #search-input {
            flex-grow: 1; padding: 12px; border-radius: 8px;
            border: 1px solid var(--border-color); background-color: var(--bg-input);
            color: var(--text-main); font-size: 16px;
        }
        #search-results .user-item {
            padding: 12px; margin-top: 10px; border-radius: 8px;
            cursor: pointer; background-color: var(--bg-input);
            transition: background-color 0.2s;
        }
        #search-results .user-item:hover { background-color: var(--primary-accent); }
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div id="app-container">
        <aside id="sidebar">
            <div class="sidebar-header">
                <h2 data-i18n="chats">Chats</h2>
                <button id="search-user-btn" data-i18n-title="findUserTitle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
            </div>
            <div id="chat-list"></div>
            <div class="sidebar-footer">
                <span id="current-user-info" data-i18n="connecting">Connecting...</span>
                 <select id="language-selector">
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                    <option value="it">Italiano</option>
                </select>
            </div>
        </aside>
        <main id="main-content">
            <div id="welcome-screen">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <h2 data-i18n="welcomeTitle">Welcome to WFLY</h2>
                <p data-i18n="welcomeMessage">Select a chat to start messaging.</p>
            </div>
            <div id="chat-window" class="hidden">
                <header id="chat-header">
                    <h3 id="chat-partner-name"></h3>
                    <span id="chat-partner-status"></span>
                </header>
                <div id="message-list"></div>
                <footer id="chat-footer">
                    <form id="message-form">
                        <input type="text" id="message-input" data-i18n-placeholder="messagePlaceholder" autocomplete="off">
                        <button id="send-btn" type="submit" data-i18n-title="sendTitle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </footer>
            </div>
        </main>
    </div>

    <div id="search-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2 data-i18n="findUser">Find user</h2>
            <form id="search-form">
                <input type="text" id="search-input" data-i18n-placeholder="searchPlaceholder">
            </form>
            <div id="search-results"></div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const i18n = {
            en: {
                chats: "Chats",
                findUserTitle: "Find user",
                connecting: "Connecting...",
                welcomeTitle: "Welcome to WFLY",
                welcomeMessage: "Select a chat to start messaging.",
                messagePlaceholder: "Enter a message...",
                sendTitle: "Send",
                findUser: "Find user",
                searchPlaceholder: "Enter user login...",
                connectionErrorToken: "Error getting token.",
                connectionError: "Connection error. Check the server.",
                connectionLost: "Connection lost. Reconnecting in {seconds}s...",
                loggedInAs: "Logged in as: {username}",
                noChats: "Find a user to start a chat.",
                online: "Online",
                offline: "Offline",
                typing: "typing...",
                usersNotFound: "Users not found.",
            },
            ru: {
                chats: "Чаты",
                findUserTitle: "Найти пользователя",
                connecting: "Подключение...",
                welcomeTitle: "Добро пожаловать в WFLY",
                welcomeMessage: "Выберите чат, чтобы начать общение.",
                messagePlaceholder: "Введите сообщение...",
                sendTitle: "Отправить",
                findUser: "Найти пользователя",
                searchPlaceholder: "Введите логин пользователя...",
                connectionErrorToken: "Ошибка получения токена.",
                connectionError: "Ошибка соединения. Проверьте сервер.",
                connectionLost: "Соединение потеряно. Переподключение через {seconds}с...",
                loggedInAs: "Вы вошли как: {username}",
                noChats: "Найдите пользователя, чтобы начать чат.",
                online: "В сети",
                offline: "Не в сети",
                typing: "печатает...",
                usersNotFound: "Пользователи не найдены.",
            },
            it: {
                chats: "Chat",
                findUserTitle: "Trova utente",
                connecting: "Connessione...",
                welcomeTitle: "Benvenuto in WFLY",
                welcomeMessage: "Seleziona una chat per iniziare a messaggiare.",
                messagePlaceholder: "Scrivi un messaggio...",
                sendTitle: "Invia",
                findUser: "Trova utente",
                searchPlaceholder: "Inserisci il login dell'utente...",
                connectionErrorToken: "Errore nel recupero del token.",
                connectionError: "Errore di connessione. Controlla il server.",
                connectionLost: "Connessione persa. Riconnessione in {seconds}s...",
                loggedInAs: "Accesso come: {username}",
                noChats: "Trova un utente per avviare una chat.",
                online: "Online",
                offline: "Offline",
                typing: "sta scrivendo...",
                usersNotFound: "Utenti non trovati.",
            }
        };

        let currentLang = localStorage.getItem('wfly-lang') || 'en';

        function translateUI(lang) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18n[lang][key]) {
                    el.textContent = i18n[lang][key];
                }
            });
             document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (i18n[lang][key]) {
                    el.placeholder = i18n[lang][key];
                }
            });
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (i18n[lang][key]) {
                    el.title = i18n[lang][key];
                }
            });
            document.documentElement.lang = lang;
            renderChatList();
            updateChatHeaderStatus(state.activeChatId ? state.chats.get(state.activeChatId)?.partnerId : null);
        }

        const state = {
            ws: null, token: null, userId: null, username: null,
            chats: new Map(),
            messages: new Map(),
            activeChatId: null,
            typingTimers: new Map(),
            isUnloading: false, 
            reconnectDelay: 5000,
            maxReconnectDelay: 60000
        };

        const chatListEl = document.getElementById('chat-list');
        const messageListEl = document.getElementById('message-list');
        const messageForm = document.getElementById('message-form');
        const messageInput = document.getElementById('message-input');
        const currentUserInfoEl = document.getElementById('current-user-info');
        const welcomeScreen = document.getElementById('welcome-screen');
        const chatWindow = document.getElementById('chat-window');
        const chatPartnerNameEl = document.getElementById('chat-partner-name');
        const chatPartnerStatusEl = document.getElementById('chat-partner-status');
        const languageSelector = document.getElementById('language-selector');
        
        const searchModal = document.getElementById('search-modal');
        const searchUserBtn = document.getElementById('search-user-btn');
        const closeModalBtn = document.querySelector('.close-btn');
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const searchResultsEl = document.getElementById('search-results');

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
                currentUserInfoEl.innerHTML = \`<span class="error">\${i18n[currentLang].connectionErrorToken}</span>\`;
                console.error('Error getting token:', error);
            }
        }

        function setupWsEvents() {
            state.ws.onopen = () => {
                console.log('WebSocket: Connection established.');
                state.reconnectDelay = 5000;
                sendMessage({ type: 'auth', payload: { token: state.token } });
            };
            state.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                handleServerMessage(message);
            };
            state.ws.onclose = () => {
                if (state.isUnloading) {
                    console.log('WebSocket: Connection closed due to page unload.');
                    return;
                }
                const delaySeconds = state.reconnectDelay / 1000;
                const message = i18n[currentLang].connectionLost.replace('{seconds}', delaySeconds);
                console.log(\`WebSocket: Connection closed. Reconnecting in \${delaySeconds}s...\`);
                currentUserInfoEl.innerHTML = \`<span class="error">\${message}</span>\`;
                
                setTimeout(connect, state.reconnectDelay);
                
                state.reconnectDelay = Math.min(state.reconnectDelay * 2, state.maxReconnectDelay);
            };
            state.ws.onerror = (error) => {
                console.error('WebSocket: Connection error.', error);
                currentUserInfoEl.innerHTML = \`<span class="error">\${i18n[currentLang].connectionError}</span>\`;
            };
        }

        function sendMessage(data) {
            if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                state.ws.send(JSON.stringify(data));
            }
        }

        function handleServerMessage({ type, payload }) {
            switch (type) {
                case 'auth_success':
                    state.userId = payload.userId;
                    state.username = payload.username;
                    currentUserInfoEl.textContent = i18n[currentLang].loggedInAs.replace('{username}', state.username);
                    break;
                case 'chat_list':
                    const newChats = new Map();
                    payload.forEach(chat => {
                        const existingChat = state.chats.get(chat.chatId);
                        newChats.set(chat.chatId, { 
                            ...chat, 
                            status: existingChat?.status || 'offline',
                            lastMessageTimestamp: existingChat?.lastMessageTimestamp || null
                        });
                    });
                    state.chats = newChats;
                    renderChatList();
                    break;
                case 'chat_history':
                    state.messages.set(payload.chatId, payload.messages);
                    if (payload.messages.length > 0) {
                        const chat = state.chats.get(payload.chatId);
                        if(chat) {
                            chat.lastMessageTimestamp = payload.messages[payload.messages.length - 1].timestamp;
                            renderChatList();
                        }
                    }
                    if (payload.chatId === state.activeChatId) {
                        renderMessages(payload.chatId);
                    }
                    break;
                case 'new_message':
                    if (!state.messages.has(payload.chatId)) {
                        state.messages.set(payload.chatId, []);
                    }
                    state.messages.get(payload.chatId).push(payload);

                    const chatToUpdate = state.chats.get(payload.chatId);
                    if (chatToUpdate) {
                        chatToUpdate.lastMessageTimestamp = payload.timestamp;
                        renderChatList();
                    }

                    if (payload.chatId === state.activeChatId) {
                        appendMessage(payload);
                    }
                    break;
                case 'user_status_update':
                    updatePartnerStatus(payload.userId, payload.status);
                    break;
                case 'search_results':
                    renderSearchResults(payload);
                    break;
            }
        }

        function renderChatList() {
            chatListEl.innerHTML = '';
            if (state.chats.size === 0) {
                chatListEl.innerHTML = \`<p style="padding: 20px; text-align: center; color: var(--text-secondary);">\${i18n[currentLang].noChats}</p>\`;
                return;
            }
            
            const sortedChats = Array.from(state.chats.values()).sort((a, b) => {
                const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp) : 0;
                const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp) : 0;
                if (timeB === 0 && timeA === 0) {
                    return a.partnerUsername.localeCompare(b.partnerUsername);
                }
                return timeB - timeA;
            });

            sortedChats.forEach(chat => {
                const initial = chat.partnerUsername.charAt(0).toUpperCase();
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.dataset.chatId = chat.chatId;
                if (chat.chatId === state.activeChatId) chatItem.classList.add('active');
                
                const statusText = chat.status === 'online' ? i18n[currentLang].online : i18n[currentLang].offline;

                chatItem.innerHTML = \`
                    <div class="avatar">\${initial}</div>
                    <div class="chat-info">
                        <div class="partner-name">\${chat.partnerUsername}</div>
                        <div class="partner-status" data-partner-id="\${chat.partnerId}">
                            <div class="status-indicator \${chat.status === 'online' ? 'online' : 'offline'}"></div>
                            <span>\${statusText}</span>
                        </div>
                    </div>
                \`;
                chatItem.addEventListener('click', () => selectChat(chat.chatId));
                chatListEl.appendChild(chatItem);
            });
        }

        function selectChat(chatId) {
            state.activeChatId = chatId;
            renderChatList();
            
            welcomeScreen.classList.add('hidden');
            chatWindow.classList.remove('hidden');
            
            const chat = state.chats.get(chatId);
            chatPartnerNameEl.textContent = chat.partnerUsername;
            updateChatHeaderStatus(chat.partnerId);

            if (state.messages.has(chatId)) {
                renderMessages(chatId);
            } else {
                sendMessage({ type: 'get_history', payload: { chatId } });
            }
        }

        function renderMessages(chatId) {
            messageListEl.innerHTML = '';
            const messages = state.messages.get(chatId) || [];
            messages.forEach(appendMessage);
        }

        function appendMessage(msg) {
            const msgEl = document.createElement('div');
            msgEl.className = 'message';
            msgEl.classList.add(msg.senderId === state.userId ? 'sent' : 'received');
            msgEl.textContent = msg.content;
            messageListEl.appendChild(msgEl);
            messageListEl.scrollTop = messageListEl.scrollHeight;
        }

        function updatePartnerStatus(partnerId, status) {
            let targetChatId = null;
            for (const [chatId, chat] of state.chats.entries()) {
                if (chat.partnerId === partnerId) {
                    chat.status = status;
                    targetChatId = chatId;
                    break;
                }
            }
            
            const statusEl = document.querySelector(\`.partner-status[data-partner-id="\${partnerId}"]\`);
            if (statusEl) {
                const indicator = statusEl.querySelector('.status-indicator');
                const text = statusEl.querySelector('span');
                indicator.className = 'status-indicator';
                if (status === 'online') {
                    indicator.classList.add('online');
                    text.textContent = i18n[currentLang].online;
                } else if (status === 'offline') {
                    indicator.classList.add('offline');
                    text.textContent = i18n[currentLang].offline;
                }
            }

            if (state.activeChatId === targetChatId) {
                updateChatHeaderStatus(partnerId);
            }
        }

        function updateChatHeaderStatus(partnerId) {
            const chat = Array.from(state.chats.values()).find(c => c.partnerId === partnerId);
            if (!chat) {
                 chatPartnerStatusEl.textContent = '';
                 return;
            }

            chatPartnerStatusEl.classList.remove('typing');
            if (chat.status === 'typing') {
                chatPartnerStatusEl.textContent = i18n[currentLang].typing;
                chatPartnerStatusEl.classList.add('typing');
            } else if (chat.status === 'online') {
                chatPartnerStatusEl.textContent = i18n[currentLang].online;
            } else {
                chatPartnerStatusEl.textContent = i18n[currentLang].offline;
            }
        }

        function renderSearchResults(users) {
            searchResultsEl.innerHTML = '';
            if (users.length === 0) {
                searchResultsEl.innerHTML = \`<p>\${i18n[currentLang].usersNotFound}</p>\`;
                return;
            }
            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.textContent = user.username;
                userItem.addEventListener('click', () => {
                    sendMessage({ type: 'start_chat', payload: { userId: user.id } });
                    searchModal.classList.remove('visible');
                });
                searchResultsEl.appendChild(userItem);
            });
        }

        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();
            if (content && state.activeChatId) {
                sendMessage({ type: 'send_message', payload: { chatId: state.activeChatId, content } });
                sendMessage({ type: 'typing_stop', payload: { chatId: state.activeChatId } });
                clearTimeout(state.typingTimers.get(state.activeChatId));
                state.typingTimers.delete(state.activeChatId);
                messageInput.value = '';
            }
        });

        messageInput.addEventListener('input', () => {
            if (!state.activeChatId) return;
            if (!state.typingTimers.has(state.activeChatId)) {
                sendMessage({ type: 'typing_start', payload: { chatId: state.activeChatId } });
            }
            clearTimeout(state.typingTimers.get(state.activeChatId));
            const timer = setTimeout(() => {
                sendMessage({ type: 'typing_stop', payload: { chatId: state.activeChatId } });
                state.typingTimers.delete(state.activeChatId);
            }, 2000);
            state.typingTimers.set(state.activeChatId, timer);
        });

        searchUserBtn.addEventListener('click', () => searchModal.classList.add('visible'));
        closeModalBtn.addEventListener('click', () => searchModal.classList.remove('visible'));
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) searchModal.classList.remove('visible');
        });
        searchForm.addEventListener('submit', (e) => e.preventDefault());
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query) sendMessage({ type: 'search_user', payload: { query } });
        });

        languageSelector.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('wfly-lang', currentLang);
            translateUI(currentLang);
        });

        window.addEventListener('beforeunload', () => {
            if (state.ws) {
                state.isUnloading = true;
                state.ws.close();
            }
        });
        
        languageSelector.value = currentLang;
        translateUI(currentLang);
        connect();
    });
    </script>
</body>
</html>
    `;
}

main();
