const SERVER_URL = 'http://localhost:8000';
let mobileUrl = '';
let injectionMode = null;
let liveSync = false;
let sessionId = null;

const BOOKMARKLET_TEMPLATE = `javascript:(function(){
  if(window.__glidepad_active) {
    showN("ALREADY ACTIVE", "#f59e0b");
    return;
  }
  window.__glidepad_active=true;
  window.__gp_abort=false;
  
  const op=Event.prototype.preventDefault;
  Event.prototype.preventDefault=function(){
    if(["copy","paste","cut","beforeinput","selectstart"].includes(this.type))return;
    return op.apply(this,arguments)
  };

  function ul(r){
    const ev=["copy","paste","cut","contextmenu","selectstart","beforeinput"];
    ev.forEach(t=>r.addEventListener(t,e=>e.stopImmediatePropagation(),true));
    const al=r.querySelectorAll?r.querySelectorAll("*"):[];
    al.forEach(el=>{if(el.shadowRoot)ul(el.shadowRoot)})
  };
  ul(document);
  const ob=new MutationObserver(()=>ul(document));
  ob.observe(document.documentElement,{childList:true,subtree:true});
  
  const s=document.createElement("style");
  s.innerHTML="*{-webkit-user-select:text!important;user-select:text!important;pointer-events:auto!important;}";
  document.head.appendChild(s);
  
  const n=document.createElement("div");
  n.id="__gp_container";
  n.innerHTML='<div id="__gp_note" style="position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#0a0a0a;color:#fff;padding:14px 24px;border-radius:16px;border:1px solid #d97757;font-family:sans-serif;font-weight:900;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px rgba(0,0,0,0.5);transition:all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);opacity:0;transform:translate(-50%, -40px);"><span style="color:#d97757;font-size:18px;">🛰️</span> BYPASS ACTIVATED</div>';
  document.body.appendChild(n);
  
  function showN(t,c="#d97757"){
    const e=document.getElementById("__gp_note");
    if(!e)return;
    e.innerHTML=\`<span style="color:\${c};font-size:18px;">🛰️</span> \${t}\`;
    e.style.opacity="1";
    e.style.transform="translate(-50%, 0)";
    setTimeout(()=>{
      e.style.opacity="0";
      e.style.transform="translate(-50%, -40px)"
    },3000)
  }
  
  setTimeout(()=>showN("BYPASS ACTIVATED"),10);
  
  let lastId=localStorage.getItem("__gp_last_id")||"";
  let seenIds=new Set();
  let seenTxt=new Map();
  let queue=[];
  
  const wait=(ms)=>new Promise(res=>setTimeout(res,ms));
  
  async function poller(){
    while(true){
      if(window.__gp_abort_poller) break;
      try{
        const res=await fetch("https://bypass-backend-nms1.onrender.com/api/v1/paste/poll?last_id="+lastId+"&t="+Date.now(),{
          headers:{"x-device-id":"b8b989d6-dca0-4d98-a0e4-2556c5fbc4a1"},
          cache:"no-store",
          mode: "cors",
          credentials: "omit"
        });
        const data=await res.json();
        if(data.status==="success"){
          lastId=data.id;
          localStorage.setItem("__gp_last_id",lastId);
          const txt=data.text||"";
          const mode=data.mode||"";
          if(mode==="system"||txt.indexOf("STOP_PASTE")!==-1){
            window.__gp_abort=true;
            queue=[];
            showN("PASTING STOPPED","#ef4444");
            continue;
          }
          const now=Date.now();
          const txtHash=btoa(txt.substring(0,100)).replace(/=/g,"");
          if(seenIds.has(data.id)||(seenTxt.has(txtHash)&&now-seenTxt.get(txtHash)<2000))continue;
          seenIds.add(data.id);
          seenTxt.set(txtHash,now);
          queue.push(data);
        }else{
          await wait(500)
        }
      }catch(e){
        console.log("GP Poll Error:", e);
        await wait(2000);
      }
    }
  }
  
  async function executor(){
    while(true){
      if(window.__gp_abort){
        queue=[];
        window.__gp_abort=false;
        await wait(100);
        continue;
      }
      if(queue.length>0){
        const data=queue.shift();
        if(!data)continue;
        let wpm=data.wpm||40;
        let txt=data.text;
        let isRealistic=data.realistic||false;
        
        const el=document.activeElement;
        if(el&&("value" in el||el.isContentEditable)){
          const inject=(c)=>{
            if("value" in el){
              const start=el.selectionStart;
              const end=el.selectionEnd;
              if(start!==undefined&&start!==null){
                el.value=el.value.substring(0,start)+c+el.value.substring(end);
                el.selectionStart=el.selectionEnd=start+c.length;
              }else{
                el.value+=c;
              }
            }else{
               const sel=window.getSelection();
               if(sel.rangeCount){
                 const range=sel.getRangeAt(0);
                 range.deleteContents();
                 range.insertNode(document.createTextNode(c));
                 range.collapse(false);
                 sel.removeAllRanges();
                 sel.addRange(range);
               }
            }
            el.dispatchEvent(new Event("input",{bubbles:true}));
            el.dispatchEvent(new Event("change",{bubbles:true}))
          };
          
          if(isRealistic){
            for(let i=0;i<txt.length;i++){
              if(window.__gp_abort)break;
              inject(txt[i]);
              let d=60000/(wpm*5);
              if(txt[i]===" ")d*=1.2;
              await wait(d*(0.8+Math.random()*0.4));
            }
          }else{
            if(!window.__gp_abort)inject(txt);
          }
        }
      }
      await wait(100);
    }
  }
  
  poller();
  executor();
})();`;

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
    const unblockerBtn = document.getElementById('unblocker-btn');
    const openBypassBtn = document.getElementById('open-bypass-btn');
    const bypassView = document.getElementById('bypass-view');
    const backFromBypass = document.getElementById('back-from-bypass');

    // Navigation for Bypass View
    if (openBypassBtn) {
        openBypassBtn.addEventListener('click', () => {
            initialView.classList.remove('active');
            bypassView.classList.add('active');
        });
    }

    if (backFromBypass) {
        backFromBypass.addEventListener('click', () => {
            bypassView.classList.remove('active');
            initialView.classList.add('active');
        });
    }

    // Set the bookmarklet URL immediately so it's ready for dragging
    if (unblockerBtn) {
        unblockerBtn.href = BOOKMARKLET_TEMPLATE;
        
        unblockerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast("👆 Drag this to your Bookmark Bar!");
        });
    }

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
            sessionId = data.session_id;
            
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
                const pairingUrl = data.pairing_qr || mobileUrl;
                new QRCode(qrContainerHome, { text: pairingUrl, width: 100, height: 100 });
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
