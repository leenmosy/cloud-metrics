const firebaseConfig = {
    apiKey: "AIzaSyAQJSrNF_ry6GybCvDO6hfeRU7vaITUMWc",
    authDomain: "mosychcloud.firebaseapp.com",
    databaseURL: "https://mosychcloud-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mosychcloud",
    storageBucket: "mosychcloud.firebasestorage.app",
    messagingSenderId: "534844555440",
    appId: "1:534844555440:web:504cc6da63580ad204fb75"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const statsRef = db.ref('mosych_stats');
const packetRef = db.ref('last_packet');

let stats = { totalGB: 0, tunnels: 0, currentSpeed: 0 };

statsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        stats = data;
        renderUI();
    }
});

packetRef.on('value', (snapshot) => {
    const packet = snapshot.val();
    if (packet) drawRow(packet);
});

function renderUI() {
    const totalEl = document.getElementById('total-data');
    const speedEl = document.getElementById('current-speed');
    const tunnelsEl = document.getElementById('tunnels');
    const uplinkEl = document.getElementById('uplink-val');

    if (totalEl) {
        const val = Number(stats.totalGB) || 0;
        totalEl.innerText = val >= 1024 ? (val / 1024).toFixed(4) + " TB" : val.toFixed(2) + " GB";
    }
    
    if (speedEl) {
        speedEl.innerText = (Number(stats.currentSpeed) || 0).toFixed(2) + " Gbps";
    }
    
    if (tunnelsEl) {
        tunnelsEl.innerText = Math.floor(Number(stats.tunnels) || 0);
    }
    
    if (uplinkEl) {
        const speed = Number(stats.currentSpeed) || 0;
        let capacityPercent = (speed / 5) * 100;
        capacityPercent += (Math.random() * 1.4 + 0.1); 
        if (capacityPercent > 99.9) capacityPercent = 99.9;
        uplinkEl.innerText = `↑ Uplink: ${capacityPercent.toFixed(1)}% capacity`;
    }
}

function updateClock() {
    const timeEl = document.getElementById('local-time');
    if (timeEl) {
        timeEl.innerText = new Date().toLocaleTimeString("ru-RU", {
            timeZone: "Europe/Berlin", 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        }) + " (CET)";
    }
}
setInterval(updateClock, 1000);

function drawRow(packet) {
    const body = document.getElementById('traffic-body');
    if (!body || !packet) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-4 border-r-2 border-black td-ip font-black">${packet.ip || '0.0.0.0'}</td>
        <td class="p-4 border-r-2 border-black td-protocol font-black">${packet.proto || '---'}</td>
        <td class="p-4 border-r-2 border-black td-payload font-black">${packet.payload || '---'}</td>
        <td class="p-4 border-r-2 border-black td-status font-black text-green-600">ENCRYPTED</td>
    `;
    body.prepend(row);
    if (body.rows.length > 12) body.deleteRow(12);
}

async function runLoader() {
    const bar = document.getElementById('loader-bar');
    if (bar) {
        for (let i = 0; i <= 100; i += 5) {
            bar.style.width = i + '%';
            await new Promise(r => setTimeout(r, 20));
        }
    }
    
    const loader = document.getElementById('terminal-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            startApp();
        }, 500);
    } else {
        startApp();
    }
}

function startApp() {
    updateClock();
    document.getElementById('h-main')?.classList.add('show');
    document.querySelectorAll('.reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), 300 + (i * 150));
    });
    setTimeout(() => {
        document.getElementById('t-main')?.classList.add('show');
    }, 1000);
}

window.onload = runLoader;
