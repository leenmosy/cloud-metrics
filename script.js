let currentSection = 0;
const sections = [];
let isAnimating = false;

let firebaseConfig = {
    apiKey: "AIzaSyAQJSrNF_ry6GybCvDO6hfeRU7vaITUMWc",
    authDomain: "mosychcloud.firebaseapp.com",
    databaseURL: "https://mosychcloud-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mosychcloud",
    storageBucket: "mosychcloud.firebasestorage.app",
    messagingSenderId: "534844555440",
    appId: "1:534844555440:web:504cc6da63580ad204fb75"
};

let db = null;
let statsRef = null;
let stats = { totalGB: 0, tunnels: 0, currentSpeed: 0 };
let firebaseInitialized = false;

function useDemoData() {
    stats = {
        totalGB: Math.random() * 5000 + 1000,
        tunnels: Math.floor(Math.random() * 50) + 10,
        currentSpeed: Math.random() * 3 + 0.5
    };
    renderUI();
    
    setInterval(() => {
        stats.currentSpeed = Math.max(0.1, stats.currentSpeed + (Math.random() - 0.5) * 0.5);
        stats.totalGB += Math.random() * 0.01;
        stats.tunnels = Math.max(1, stats.tunnels + Math.floor(Math.random() - 0.3));
        renderUI();
    }, 3000);
}

function renderUI() {
    const totalEl = document.getElementById('total-data');
    const speedEl = document.getElementById('current-speed');
    const tunnelsEl = document.getElementById('tunnels');
    const uplinkEl = document.getElementById('uplink-val');

    if (totalEl) {
        const val = Number(stats.totalGB) || 0;
        totalEl.innerText = val >= 1024 ? (val / 1024).toFixed(2) + " TB" : val.toFixed(2) + " GB";
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
        const time = new Date().toLocaleTimeString("ru-RU", {
            timeZone: "Europe/Berlin", 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        });
        timeEl.innerText = time;
        
        const words = timeEl.innerText.split(' ');
        const capitalizedWords = words.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        timeEl.innerText = capitalizedWords.join(' ');
    }
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
    
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        startApp();
    }
}

function startApp() {
    updateClock();
    setInterval(updateClock, 1000);
    initializeSections();
    setupScrollAnimations();
    document.getElementById('loading-screen').style.display = 'none';
    document.querySelector('.hero-section').classList.add('active');
}

function initializeFirebase() {
    if (firebaseInitialized) return;
    
    return new Promise((resolve, reject) => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            db = firebase.database();
            statsRef = db.ref('mosych_stats');
            
            let dataLoaded = false;
            
            statsRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    stats = {
                        totalGB: Math.max(0, Number(data.totalGB) || 0),
                        tunnels: Math.max(0, Math.floor(Number(data.tunnels) || 0)),
                        currentSpeed: Math.max(0, Number(data.currentSpeed) || 0)
                    };
                    renderUI();
                    dataLoaded = true;
                    
                    if (dataLoaded) {
                        firebaseInitialized = true;
                        resolve();
                    }
                }
            });
            
            setTimeout(() => {
                if (!firebaseInitialized) {
                    firebaseInitialized = true;
                    resolve();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            reject(error);
        }
    });
}

function initializeSections() {
    const sectionElements = document.querySelectorAll('section');
    sections.push(...sectionElements);
    
    if (sections.length > 0) {
        sections[0].classList.add('active');
        currentSection = 0;
        
        sections.forEach(section => {
            const bgImage = window.getComputedStyle(section).backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage !== 'url("none")') {
                const img = new Image();
                img.onload = () => {
                };
                img.onerror = () => {
                    console.warn('Background image failed to load for section:', section.id);
                };
                img.src = bgImage.slice(5, -2);
            }
        });
    }
    
    window.removeEventListener('wheel', setupSectionNavigation);
    window.removeEventListener('keydown', setupSectionNavigation);
}

function setupScrollAnimations() {
}

updateClock();
useDemoData();

window.onload = runLoader;
