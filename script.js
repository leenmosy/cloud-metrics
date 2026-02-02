const statusMessages = [
    "Initializing storage node…",
    "Establishing encrypted channels…",
    "Syncing distributed volumes…",
    "Uploading backups…",
    "Processing file chunks…",
    "Verifying data integrity…"
];

const statusEl = document.getElementById("status");
const inboundEl = document.getElementById("inbound");
const outboundEl = document.getElementById("outbound");
const progressBar = document.getElementById("progressBar");

let statusIndex = 0;
let inbound = 120.35;
let outbound = 87.62;
let progress = 0;

setInterval(() => {
    statusIndex = (statusIndex + 1) % statusMessages.length;
    statusEl.textContent = statusMessages[statusIndex];

    inbound += Math.random() * 2.4;
    outbound += Math.random() * 1.6;

    inboundEl.textContent = inbound.toFixed(2) + " GB";
    outboundEl.textContent = outbound.toFixed(2) + " GB";

    progress += Math.random() * 18;
    if (progress >= 100) progress = 0;
    progressBar.style.width = progress + "%";

}, 2650);

