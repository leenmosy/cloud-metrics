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
}, 3000);
