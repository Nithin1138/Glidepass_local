const SERVER_URL = 'http://localhost:8000';
let mobileUrl = '';
let injectionMode = null;
let liveSync = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log("GlidePass: Popup Loaded");
    
    if (window.lucide) {
        lucide.createIcons();
    }

    // --- BUTTON DEFINITIONS ---
    const initialView = document.getElementById('initial-view');
    const commandCenterView = document.getElementById('command-center-view');
    const startBtn = document.getElementById('start-btn');
    const startBackendBtn = document.getElementById('start-backend-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const stopServerBtn = document.getElementById('stop-server-btn');
    const terminalBtn = document.getElementById('terminal-btn');
    const sendBtn = document.getElementById('send-btn');
    const remoteText = document.getElementById('remote-text');

    // --- START BACKEND LOGIC (Protocol Launch) ---
    if (startBackendBtn) {
        startBackendBtn.addEventListener('click', () => {
            console.log("GlidePass: Start Backend Clicked");
            
            // Immediate Visual Change
            startBackendBtn.style.background = "#e0e0e0";
            startBackendBtn.style.transform = "scale(0.95)";
            startBackendBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> LAUNCHING...';
            if (window.lucide) lucide.createIcons();
            
            try {
                // Trigger the protocol on the current active tab instead of a new one
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.update(tabs[0].id, { url: "glidepass://start" });
                    }
                });
                
                showToast("🚀 Sending Start Signal...");
                
                // Poll for server status every second for the next 10 seconds
                let attempts = 0;
                const pollInterval = setInterval(() => {
                    checkServerStatus();
                    attempts++;
                    if (attempts >= 10) {
                        startBackendBtn.style.background = "#fff";
                        startBackendBtn.style.transform = "scale(1)";
                        startBackendBtn.innerHTML = '<i data-lucide="zap" size="14"></i> START SERVER';
                        if (window.lucide) lucide.createIcons();
                    }
                }, 1000);
                
                // If server goes online, the checkServerStatus will naturally hide the button anyway.
            } catch (e) {
                console.error("GlidePass: Launch Error", e);
                showToast("❌ Launch Error");
            }
        });
    }

    // --- DISCONNECT ---

    if (stopServerBtn) {
        stopServerBtn.addEventListener('click', async () => {
            if (confirm("Stop the local backend server?")) {
                try {
                    fetch(`${SERVER_URL}/shutdown`).catch(() => {}); 
                    showToast("Server Stopping...");
                    setTimeout(() => {
                        checkServerStatus();
                        initialView.classList.add('active');
                        commandCenterView.classList.remove('active');
                    }, 1000);
                } catch (e) {
                    showToast("Request failed");
                }
            }
        });
    }

    // Initialize state
    checkServerStatus();
    loadState();
});

function resetSession() {
    const remoteText = document.getElementById('remote-text');
    const liveSyncBtn = document.getElementById('live-sync-toggle');
    const injectCard = document.getElementById('inject-mode');
    const typingCard = document.getElementById('typing-mode');

    if (remoteText) remoteText.value = '';
    liveSync = false;
    injectionMode = null;
    if (liveSyncBtn) liveSyncBtn.classList.remove('active');
    if (injectCard) injectCard.classList.remove('active');
    if (typingCard) typingCard.classList.remove('active');
    updateSyncStatus();
}

// Server Status Check
async function checkServerStatus() {
    const statusDot = document.querySelector('.status-dot');
    const qrLoader = document.getElementById('qr-loader');
    const urlBadge = document.getElementById('url-badge-home');
    const qrContainerHome = document.getElementById('qrcode-home');
    const stopServerBtn = document.getElementById('stop-server-btn');
    const startBackendBtn = document.getElementById('start-backend-btn');

    try {
        const response = await fetch(`${SERVER_URL}/get_config`);
        if (response.ok) {
            const data = await response.json();
            mobileUrl = data.mobile_url;
            
            if (statusDot) {
                statusDot.style.background = '#4ade80';
                statusDot.style.boxShadow = '0 0 12px #4ade80';
            }
            if (qrLoader) qrLoader.style.display = 'none';
            if (urlBadge) urlBadge.textContent = mobileUrl;
            if (stopServerBtn) stopServerBtn.style.display = 'flex';
            if (startBackendBtn) startBackendBtn.style.display = 'none';
            
            if (qrContainerHome) {
                qrContainerHome.innerHTML = '';
                new QRCode(qrContainerHome, { text: mobileUrl, width: 100, height: 100 });
            }
        } else {
            throw new Error();
        }
    } catch (e) {
        if (statusDot) {
            statusDot.style.background = '#ff4d4d';
            statusDot.style.boxShadow = '0 0 12px #ff4d4d';
        }
        if (qrLoader) qrLoader.style.display = 'flex';
        if (stopServerBtn) stopServerBtn.style.display = 'none';
        if (startBackendBtn) startBackendBtn.style.display = 'flex';
    }
}

// Live Sync Toggle
const liveSyncBtn = document.getElementById('live-sync-toggle');
const syncStatusText = document.getElementById('sync-status');

if (liveSyncBtn) {
    liveSyncBtn.addEventListener('click', () => {
        liveSync = !liveSync;
        liveSyncBtn.classList.toggle('active', liveSync);
        updateSyncStatus();
        saveState();
    });
}

function updateSyncStatus() {
    const syncStatusText = document.getElementById('sync-status');
    if (!syncStatusText) return;
    if (liveSync) {
        syncStatusText.innerHTML = `<span class="icon" style="color: #4ade80;">📡</span> <span style="color: #888;">Live Sync ON: Your text is being typed live on the laptop.</span>`;
    } else {
        syncStatusText.innerHTML = `<span class="icon">⏸️</span> <span>Live Sync OFF: Type freely. Press 'Send' to blink or type content.</span>`;
    }
}

// Mode Selection
const injectCard = document.getElementById('inject-mode');
const typingCard = document.getElementById('typing-mode');
const wpmSelect = document.getElementById('wpm-select');

if (injectCard) {
    injectCard.addEventListener('click', () => {
        if (injectionMode === 'inject') {
            injectionMode = null;
            injectCard.classList.remove('active');
        } else {
            injectionMode = 'inject';
            injectCard.classList.add('active');
            if (typingCard) typingCard.classList.remove('active');
        }
        saveState();
    });
}

if (typingCard) {
    typingCard.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT') return;
        if (injectionMode === 'typing') {
            injectionMode = null;
            typingCard.classList.remove('active');
        } else {
            injectionMode = 'typing';
            typingCard.classList.add('active');
            if (injectCard) injectCard.classList.remove('active');
        }
        saveState();
    });
}

// Send Action
const sendBtn = document.getElementById('send-btn');
const remoteText = document.getElementById('remote-text');

if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
        const text = remoteText.value.trim();
        if (!text) return;
        const originalContent = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i data-lucide="loader" class="spin"></i>';
        if (window.lucide) lucide.createIcons();
        try {
            let mode = 'flash';
            if (injectionMode === 'inject') mode = 'inject';
            if (injectionMode === 'typing') mode = 'type';
            const response = await fetch(`${SERVER_URL}/paste`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, mode: mode, wpm: parseInt(wpmSelect.value) })
            });
            if (response.ok) {
                showToast('Dispatched!');
                if (!liveSync) remoteText.value = '';
            }
        } catch (e) {
            showToast('Connection Error');
        } finally {
            setTimeout(() => {
                sendBtn.innerHTML = originalContent;
                if (window.lucide) lucide.createIcons();
            }, 800);
        }
    });
}

if (remoteText) {
    remoteText.addEventListener('input', () => {
        if (liveSync) syncToBackend();
    });
}

async function syncToBackend() {
    const remoteText = document.getElementById('remote-text');
    const wpmSelect = document.getElementById('wpm-select');
    try {
        await fetch(`${SERVER_URL}/paste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: remoteText.value, mode: 'type', wpm: parseInt(wpmSelect.value) })
        });
    } catch (e) {}
}

// Footer Actions
const stopBtn = document.getElementById('stop-btn');
const historyBtn = document.getElementById('history-btn');

if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        const remoteText = document.getElementById('remote-text');
        if (remoteText) remoteText.value = '';
        showToast('Reset Area');
    });
}

if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        const qrOverlay = document.getElementById('qr-overlay');
        const qrContainer = document.getElementById('qrcode-share');
        if (mobileUrl) {
            qrOverlay.classList.add('active');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, { text: mobileUrl, width: 180, height: 180 });
            }
            document.getElementById('mobile-url-display').textContent = mobileUrl;
        } else {
            showToast('Server Offline');
        }
    });
}

const closeQr = document.getElementById('close-qr');
if (closeQr) {
    closeQr.addEventListener('click', () => {
        document.getElementById('qr-overlay').classList.remove('active');
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function saveState(extra = {}) {
    const wpmSelect = document.getElementById('wpm-select');
    const remoteText = document.getElementById('remote-text');
    chrome.storage.local.set({ 
        liveSync, 
        injectionMode,
        text: remoteText ? remoteText.value : '',
        wpm: wpmSelect ? wpmSelect.value : '40',
        ...extra
    });
}

function loadState() {
    const initialView = document.getElementById('initial-view');
    const commandCenterView = document.getElementById('command-center-view');
    const wpmSelect = document.getElementById('wpm-select');
    const remoteText = document.getElementById('remote-text');
    const liveSyncBtn = document.getElementById('live-sync-toggle');
    const injectCard = document.getElementById('inject-mode');
    const typingCard = document.getElementById('typing-mode');

    chrome.storage.local.get(['liveSync', 'injectionMode', 'text', 'wpm'], (data) => {
        if (data.liveSync !== undefined) {
            liveSync = data.liveSync;
            if (liveSyncBtn) liveSyncBtn.classList.toggle('active', liveSync);
            updateSyncStatus();
        }
        if (data.injectionMode) {
            injectionMode = data.injectionMode;
            if (injectionMode === 'inject' && injectCard) injectCard.classList.add('active');
            if (injectionMode === 'typing' && typingCard) typingCard.classList.add('active');
        }
        if (data.text && remoteText) remoteText.value = data.text;
        if (data.wpm && wpmSelect) wpmSelect.value = data.wpm;
    });
}
