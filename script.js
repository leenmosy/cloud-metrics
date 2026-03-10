(function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const ACCENT   = '194,238,0';
    const WHITE    = '255,255,255';
    const COUNT    = 72;
    const MAX_DIST = 160;
    const SPEED    = 0.18;

    let W, H, particles;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function createParticle() {
        const isAccent = Math.random() < 0.08;
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * SPEED,
            vy: (Math.random() - 0.5) * SPEED,
            r: Math.random() * 1.2 + 0.4,
            color: isAccent ? ACCENT : WHITE,
            opacity: Math.random() * 0.4 + 0.1,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.008 + Math.random() * 0.012,
        };
    }

    function init() {
        resize();
        particles = Array.from({ length: COUNT }, createParticle);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.pulse += p.pulseSpeed;

            
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;

            const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

            
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    const lineAlpha = (1 - dist / MAX_DIST) * 0.07;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `rgba(${WHITE},${lineAlpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }

            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${alpha})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
        resize();
    });

    init();
    draw();
})();

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

function animateCounter(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    const startValue = parseFloat(start) || 0;
    const endValue = parseFloat(end) || 0;
    const difference = endValue - startValue;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (difference * easeOutQuart);

        if (suffix.includes('TB') || suffix.includes('GBPS')) {
            element.innerText = currentValue.toFixed(2) + suffix;
        } else {
            element.innerText = Math.floor(currentValue).toString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
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

    if (totalEl) {
        const val = Number(stats.totalGB) || 0;
        const displayVal = val >= 1024 ? val / 1024 : val;
        const suffix = val >= 1024 ? ' TB' : ' GB';
        animateCounter(totalEl, parseFloat(totalEl.innerText) || 0, displayVal, 1000, suffix);
    }

    if (speedEl) animateCounter(speedEl, parseFloat(speedEl.innerText) || 0, Number(stats.currentSpeed) || 0, 1000, ' GBPS');
    if (tunnelsEl) animateCounter(tunnelsEl, parseFloat(tunnelsEl.innerText) || 0, Math.floor(Number(stats.tunnels) || 0), 1000);

    updateProgressBars(stats);

    setTimeout(() => {
        if (speedEl && speedEl.innerText.includes('gbps')) {
            speedEl.innerText = speedEl.innerText.replace('gbps', 'GBPS');
        }
    }, 50);
}

function updateClock() {
    const timeEl = document.getElementById('local-time');
    if (timeEl) {
        const time = new Date().toLocaleTimeString("en", {
            timeZone: "Europe/Berlin",
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        timeEl.innerText = `${time} (CET)`;
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

async function runLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.querySelector('.loading-text');
    const mainContainer = document.querySelector('main.container');

    const savedScrollPosition = window.pageYOffset;

    if (progressBar && loadingText) {
        const statusTexts = ['Initializing', 'Loading', 'Connecting'];

        loadingText.textContent = statusTexts[0];
        progressBar.style.width = '25%';

        syncWithLocalStorage();

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
    if (loadingScreenEl) {
        loadingScreenEl.style.opacity = '0';
        window.scrollTo(0, savedScrollPosition);
        setTimeout(() => {
            if (mainContainer) mainContainer.classList.add('loaded');
            setTimeout(() => { loadingScreenEl.style.display = 'none'; }, 300);
        }, 200);
    }

    startApp();
}

function startApp() {
    syncWithLocalStorage();
    initializeFirebase()
        .then(() => {})
        .catch(error => {
            console.error('Firebase initialization failed:', error);
        });

    updateClock();
    setInterval(updateClock, 1000);

    animateCloudText();
    initScrollReveal();
}

function animateCloudText() {
    const cloudText = document.querySelector('.cloud');
    if (!cloudText) return;

    setTimeout(() => {
        cloudText.classList.remove('invisible');
        cloudText.classList.add('typing');

        const text = 'scales';
        cloudText.innerText = '';
        let index = 0;

        const typeInterval = setInterval(() => {
            if (index < text.length) {
                cloudText.innerText += text[index];
                index++;
            } else {
                clearInterval(typeInterval);
                cloudText.classList.add('typing-complete');
            }
        }, 100);
    }, 1000);
}

function initCursor() {
    const cursor = document.querySelector('.custom-cursor');
    const trail = document.querySelector('.cursor-trail');
    if (!cursor) return;

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });

    
    function animateTrail() {
        trailX += (mouseX - trailX) * 0.14;
        trailY += (mouseY - trailY) * 0.14;
        if (trail) {
            trail.style.left = trailX + 'px';
            trail.style.top = trailY + 'px';
        }
        requestAnimationFrame(animateTrail);
    }
    animateTrail();

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        if (trail) trail.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        if (trail) trail.style.opacity = '0.5';
    });

    
    const hoverElements = document.querySelectorAll(
        '.cloud, .block-3-logo, .block-4-button-metrics, .block-2-button-home, .btn, .nav-link, .tech-icon, .infra-card, .metric-card, a'
    );

    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        element.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    
    document.addEventListener('mousedown', () => cursor.style.transform = 'translate(-50%, -50%) scale(0.7)');
    document.addEventListener('mouseup', () => cursor.style.transform = 'translate(-50%, -50%) scale(1)');
}

function initScrollReveal() {
    
    const targets = [
        { selector: '.section-label', delay: 0 },
        { selector: '.hero-title', delay: 1 },
        { selector: '.hero-sub', delay: 2 },
        { selector: '.hero-cta', delay: 3 },
        { selector: '.section-title', delay: 1 },
        { selector: '.section-desc', delay: 2 },
        { selector: '.metric-card', delay: 0 },
        { selector: '.infra-card', delay: 0 },
        { selector: '.infra-desc', delay: 2 },
        { selector: '.tech-stack', delay: 3 },
    ];

    targets.forEach(({ selector, delay }) => {
        document.querySelectorAll(selector).forEach((el, i) => {
            el.classList.add('reveal');
            if (delay > 0 || i > 0) {
                el.classList.add(`reveal-delay-${Math.min(delay || i, 4)}`);
            }
        });
    });

    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', function () {

    
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.style.padding = '0.85rem 3rem';
        } else {
            nav.style.padding = '1.5rem 3rem';
        }
    });

    
    const footer = document.querySelector('.footer');

    window.addEventListener('scroll', () => {
        const glow = document.querySelector('.hero-glow');
        if (glow) {
            const offset = window.scrollY * 0.3;
            glow.style.transform = `translate(-50%, calc(-50% + ${offset}px))`;
        }
    });

    
    initCursor();
});

window.addEventListener('load', runLoader);
