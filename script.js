let stats = JSON.parse(localStorage.getItem('mosych_stats')) || { 
    totalGB: 1420.55, 
    tunnels: 300, 
    currentSpeed: 2.50,
    lastUpdate: Date.now() 
};

function getFrankfurtHour() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Berlin"})).getHours();
}

function getActivityMultiplier() {
    const hour = getFrankfurtHour();
    const baseActivity = 0.5 + 0.5 * Math.cos((hour - 21) * Math.PI / 12);
    const noise = (Math.random() * 0.3 - 0.15); 
    return Math.max(0.05, Math.min(1.0, baseActivity + noise));
}

function compensateOfflineTime() {
    const now = Date.now();
    const msPassed = now - stats.lastUpdate;
    
    if (msPassed > 0) {
        const secondsPassed = msPassed / 1000;
        const offlineGrowth = secondsPassed * (0.0006 * getActivityMultiplier());
        stats.totalGB += offlineGrowth;
        stats.lastUpdate = now;
        saveStats();
    }
}

function saveStats() {
    stats.lastUpdate = Date.now();
    localStorage.setItem('mosych_stats', JSON.stringify(stats));
}

function updateSystemMetrics() {
    const act = getActivityMultiplier();
    stats.totalGB += (0.0001 + (0.0005 * act));
    stats.tunnels = Math.floor((200 + (200 * act)) + (Math.random() * 10 - 5));
    stats.currentSpeed = (1.5 + (2.3 * act)) + (Math.random() * 0.2 - 0.1);
    saveStats();
    renderUI();
}

function renderUI() {
    const totalEl = document.getElementById('total-data');
    const speedEl = document.getElementById('current-speed');
    const tunnelsEl = document.getElementById('tunnels');
    const timeEl = document.getElementById('local-time');
    if (totalEl) {
        const val = Number(stats.totalGB) || 0;
        if (val >= 1024) {
            totalEl.innerText = (val / 1024).toFixed(4) + " TB";
        } else {
            totalEl.innerText = val.toFixed(2) + " GB";
        }
    }
    
    if (speedEl) speedEl.innerText = (Number(stats.currentSpeed) || 0).toFixed(2) + " Gbps";
    if (tunnelsEl) tunnelsEl.innerText = Math.floor(Number(stats.tunnels) || 0);
    if (timeEl) {
        timeEl.innerText = new Date().toLocaleTimeString("ru-RU", {
            timeZone: "Europe/Berlin", hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) + " (CET)";
    }
}

function addTrafficRow() {
    const body = document.getElementById('traffic-body');
    if (!body) return;
    const protocols = ['TLS_1.3', 'WireGuard', 'AES-GCM', 'ChaCha20', 'QUIC', 'DTLS', 'X25519'];
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-4 border-r-2 border-black td-ip font-black">
            ${[80, 91, 178, 192][Math.floor(Math.random()*4)]}.${Math.floor(Math.random()*255)}.x.x
        </td>
        <td class="p-4 border-r-2 border-black td-protocol font-black">
            ${protocols[Math.floor(Math.random()*protocols.length)]}
        </td>
        <td class="p-4 border-r-2 border-black td-payload font-black">
            PKT_${Math.random().toString(16).slice(2, 7).toUpperCase()}
        </td>
        <td class="p-4 border-r-2 border-black td-status font-black text-green-600">
            ENCRYPTED
        </td>
    `;
    body.prepend(row);
    if (body.rows.length > 12) body.deleteRow(12);
    const packetSizeGB = (Math.random() * (0.06 - 0.01) + 0.01);
    stats.totalGB += packetSizeGB;
    saveStats();
    renderUI(); 
}

async function runLoader() {
    const bar = document.getElementById('loader-bar');
    if (!bar) return;
    for (let i = 0; i <= 100; i += 5) {
        bar.style.width = i + '%';
        await new Promise(r => setTimeout(r, 30));
    }
    const loader = document.getElementById('terminal-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            startApp();
        }, 700);
    }
}

function startApp() {
    const sound = document.getElementById('boot-sound');
    if (sound) sound.play().catch(() => {});
    document.getElementById('h-main')?.classList.add('show');
    document.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('show'), 400 + (i * 200)));
    setTimeout(() => {
        document.getElementById('t-main')?.classList.add('show');
        setInterval(updateSystemMetrics, 3000);
        const loop = () => {
            addTrafficRow();
            const nextTick = 10000 - (8500 * getActivityMultiplier());
            setTimeout(loop, nextTick);
        };
        loop();
    }, 1100);
}

window.onload = () => { 
    compensateOfflineTime(); 
    renderUI(); 
    runLoader(); 
};
