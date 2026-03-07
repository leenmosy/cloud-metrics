let currentSection = 0;
const sections = [];
let isAnimating = false;
let animationFrames = {};

let firebaseConfig = {
    apiKey: "AIzaSyAQJSrNF_ry6GybCvDO6hfeRU7vaITUMWc",
    authDomain: "mosychcloud.firebaseapp.com",
    databaseURL: "https://mosychcloud-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mosychcloud",
    storageBucket: "mosychcloud.firebasedostorage.app",
    messagingSenderId: "534844555440",
    appId: "1:534844555440:web:504cc6da63580ad204fb75"
};

let db = null;
let statsRef = null;
let stats = { totalGB: 0, tunnels: 0, currentSpeed: 0 };
let firebaseInitialized = false;
let isWriting = false;

function safeWriteToFirebase(data) {
    if (isWriting || !statsRef) return;
    isWriting = true;
    statsRef.update(data, (error) => {
        isWriting = false;
        if (error) console.error('Firebase write error:', error);
    });
}

function animateCounter(element, start, end, duration, suffix = '') {
    if (animationFrames[element.id]) cancelAnimationFrame(animationFrames[element.id]);
    const startTime = performance.now();
    const startValue = parseFloat(start) || 0;
    const endValue = parseFloat(end) || 0;
    const difference = endValue - startValue;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (difference * easeOutQuart);

        if (suffix.includes('TB') || suffix.includes('Gbps')) {
            element.innerText = currentValue.toFixed(2) + suffix;
        } else {
            element.innerText = Math.floor(currentValue).toString();
        }

        if (progress < 1) {
            animationFrames[element.id] = requestAnimationFrame(update);
        } else {
            delete animationFrames[element.id];
        }
    }

    animationFrames[element.id] = requestAnimationFrame(update);
}

function updateProgressBars(stats) {
    const tunnelsProgress = document.getElementById('tunnels-progress');
    const dataProgress = document.getElementById('data-progress');
    const speedProgress = document.getElementById('speed-progress');

    if (tunnelsProgress) tunnelsProgress.style.width = Math.min((stats.tunnels / 1000) * 100, 100) + '%';
    if (dataProgress) dataProgress.style.width = Math.min((stats.totalGB / 256000) * 100, 100) + '%';
    if (speedProgress) speedProgress.style.width = Math.min((stats.currentSpeed / 5) * 100, 100) + '%';
}

function renderUI() {
    const totalEl = document.getElementById('total-data');
    const speedEl = document.getElementById('current-speed');
    const tunnelsEl = document.getElementById('tunnels');
    const uplinkEl = document.getElementById('uplink-val');

    if (totalEl) {
        const val = Number(stats.totalGB) || 0;
        const displayVal = val >= 1024 ? val / 1024 : val;
        const suffix = val >= 1024 ? ' TB' : ' GB';
        animateCounter(totalEl, parseFloat(totalEl.innerText) || 0, displayVal, 1000, suffix);
    }

    if (speedEl) animateCounter(speedEl, parseFloat(speedEl.innerText) || 0, Number(stats.currentSpeed) || 0, 1000, ' Gbps');
    if (tunnelsEl) animateCounter(tunnelsEl, parseFloat(tunnelsEl.innerText) || 0, Math.floor(Number(stats.tunnels) || 0), 1000);

    if (uplinkEl) {
        const speed = Number(stats.currentSpeed) || 0;
        let capacityPercent = (speed / 5) * 100;
        if (capacityPercent > 99.9) capacityPercent = 99.9;
        uplinkEl.innerText = `Uplink: ${capacityPercent.toFixed(1)}% capacity`;
    }

    updateProgressBars(stats);
}

function updateClock() {
    const timeEl = document.getElementById('local-time');
    if (timeEl) {
        const time = new Date().toLocaleTimeString("ru-RU", {
            timeZone: "Europe/Berlin",
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timeEl.innerText = time;
    }
}

function initializeFirebase() {
    if (firebaseInitialized) return Promise.resolve();

    return new Promise((resolve, reject) => {
        try {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            statsRef = db.ref('mosych_stats');

            statsRef.on('value', snapshot => {
                const data = snapshot.val();
                if (data && !isWriting) {
                    stats = {
                        totalGB: Math.max(0, Number(data.totalGB || 0)),
                        tunnels: Math.max(0, Math.floor(Number(data.tunnels || 0))),
                        currentSpeed: Math.max(0, Number(data.currentSpeed || 0))
                    };
                    renderUI();
                    localStorage.setItem('mosych_stats', JSON.stringify(stats));
                }
            });

            firebaseInitialized = true;
            resolve();
        } catch (error) {
            console.error('Firebase initialization error:', error);
            reject(error);
        }
    });
}

function syncWithLocalStorage() {
    try {
        const storedStats = localStorage.getItem('mosych_stats');
        if (storedStats && !firebaseInitialized) {
            stats = JSON.parse(storedStats);
            renderUI();
        }
    } catch (error) {
        console.error('LocalStorage sync error:', error);
    }
}

window.addEventListener('storage', event => {
    if (event.key === 'mosych_stats') syncWithLocalStorage();
});

setInterval(() => {
    if (!firebaseInitialized) syncWithLocalStorage();
}, 5000);

function initializeSections() {
    const sectionElements = document.querySelectorAll('section');
    sections.push(...sectionElements);

    if (sections.length > 0) {
        sections[0].classList.add('active');
        currentSection = 0;
    }
}

function adjustHeroHeight() {
    const hero = document.querySelector('.full-bg');
    if (hero) hero.style.height = window.innerHeight + 'px';
}

async function runLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.querySelector('.loading-text');

    if (progressBar && loadingText) {
        const statusTexts = ['Initializing', 'Loading resources', 'Connecting', 'Loading data', 'Almost ready'];
        const firebasePromise = initializeFirebase();

        for (let i = 0; i <= 100; i += 5) {
            progressBar.style.width = i + '%';
            const statusIndex = Math.floor((i / 100) * statusTexts.length);
            loadingText.textContent = statusTexts[Math.min(statusIndex, statusTexts.length - 1)];
            await new Promise(r => setTimeout(r, 30));
        }

        await firebasePromise;
    }

    const loadingScreenEl = document.getElementById('loading-screen');
    if (loadingScreenEl) loadingScreenEl.style.display = 'none';

    startApp();
}

function startApp() {
    syncWithLocalStorage();
    initializeFirebase()
        .then(() => console.log('Firebase initialized successfully'))
        .catch(error => {
            console.error('Firebase initialization failed:', error);
            alert('Ошибка: данные недоступны без Firebase');
        });

    updateClock();
    setInterval(updateClock, 1000);
    initializeSections();

    const hero = document.querySelector('.full-bg');
    if (hero) {
        hero.classList.add('active');
        hero.style.height = window.innerHeight + 'px';
    }
}

window.addEventListener('resize', adjustHeroHeight);
window.addEventListener('load', () => {
    adjustHeroHeight();
    runLoader();
});
