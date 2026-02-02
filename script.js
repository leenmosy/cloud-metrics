const messages = [
    "Initializing…",
    "Loading resources…",
    "Setting up interface…",
    "Almost ready…"
];

const statusEl = document.getElementById("status");

let index = 0;
setInterval(() => {
    index = (index + 1) % messages.length;
    statusEl.textContent = messages[index];
}, 2700);

const inboundEl = document.getElementById("inbound");
const outboundEl = document.getElementById("outbound");
const progressBar = document.getElementById("progressBar");
const activityEl = document.getElementById("activity");

let inbound = parseFloat(localStorage.getItem("inbound")) || 128.42;
let outbound = parseFloat(localStorage.getItem("outbound")) || 64.17;
let progress = Math.random() * 100;

const activities = [
    "Syncing files…",
    "Uploading backups…",
    "Downloading media…",
    "Processing chunks…",
    "Verifying integrity…"
];

function tick() {
    inbound += Math.random() * 2.2;
    outbound += Math.random() * 1.4;

    inboundEl.textContent = inbound.toFixed(2) + " GB";
    outboundEl.textContent = outbound.toFixed(2) + " GB";

    localStorage.setItem("inbound", inbound);
    localStorage.setItem("outbound", outbound);

    progress += Math.random() * 14;
    if (progress >= 100) progress = 0;
    progressBar.style.width = progress + "%";

    activityEl.textContent =
        activities[Math.floor(Math.random() * activities.length)];
}

tick();
setInterval(tick, 1200);
