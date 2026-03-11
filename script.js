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
    const glowBar = document.getElementById('loading-progress-glow');
    const loadingText = document.querySelector('.loading-text');
    const loaderPct = document.getElementById('loader-pct');
    const mainContainer = document.querySelector('main.container');

    const savedScrollPosition = window.pageYOffset;

    initLoaderCanvas();

    function setProgress(pct) {
        if (progressBar) progressBar.style.width = pct + '%';
        if (glowBar) glowBar.style.width = pct + '%';
        if (loaderPct) loaderPct.textContent = Math.floor(pct) + '%';
    }

    if (progressBar && loadingText) {
        const statusTexts = ['Initializing', 'Loading', 'Connecting'];

        loadingText.textContent = statusTexts[0];
        setProgress(5);

        syncWithLocalStorage();
        const firebasePromise = initializeFirebase();

        for (let i = 0; i <= 100; i += 5) {
            setProgress(i);
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
            setTimeout(() => { loadingScreenEl.style.display = 'none'; }, 400);
        }, 300);
    }

    startApp();
}

function initLoaderCanvas() {
    const canvas = document.getElementById('loader-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [], raf;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function makeP() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: 0.5 + Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.15,
            vy: -0.05 - Math.random() * 0.12,
            alpha: 0.1 + Math.random() * 0.4,
            life: 0,
            maxLife: 400 + Math.random() * 500,
        };
    }

    function render() {
        ctx.clearRect(0, 0, W, H);

        const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H) * 0.5);
        grd.addColorStop(0, 'rgba(232,98,42,0.05)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        particles.forEach((p, i) => {
            p.life++;
            p.x += p.vx;
            p.y += p.vy;
            const fade = Math.min(p.life / 60, 1) * Math.min((p.maxLife - p.life) / 60, 1);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232,98,42,${p.alpha * fade})`;
            ctx.fill();
            if (p.life >= p.maxLife || p.y < -10) particles[i] = makeP();
        });

        raf = setTimeout(() => requestAnimationFrame(render), 40);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    for (let i = 0; i < 60; i++) { const p = makeP(); p.life = Math.random() * p.maxLife; particles.push(p); }
    render();
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
    initHeroCanvas();
    initScrollAnimations();
    initNavScroll();
    initParticles();
    initSectionCanvas('metrics-canvas', 'metrics');
    initSectionCanvas('infra-canvas', 'infrastructure');
}

function animateCloudText() {
    const cloudText = document.querySelector('.footer-bg-text.cloud');
    if (!cloudText) return;

    setTimeout(() => {
        cloudText.classList.remove('invisible');
        cloudText.classList.add('typing');

        const text = 'CLOUD';
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
        }, 120);
    }, 1800);
}

function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, animFrame;
    let lines = [];
    let time = 0;

    function resize() {
        W = canvas.offsetWidth;
        H = canvas.offsetHeight;
        canvas.width = W;
        canvas.height = H;
    }

    function createLines() {
        lines = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            lines.push({
                progress: Math.random(),
                speed: 0.0008 + Math.random() * 0.0015,
                opacity: 0.1 + Math.random() * 0.3,
                width: 0.5 + Math.random() * 1,
                curvature: 0.3 + Math.random() * 0.7,
                color: Math.random() > 0.5 ? '#E8622A' : '#c45518',
                yOffset: (Math.random() - 0.5) * 200,
            });
        }
    }

    function drawLine(line) {
        const centerY = H * 0.5;
        const yOffsetScale = W < 600 ? 80 : 160;
        const y = centerY + line.yOffset * (yOffsetScale / 200);
        const cp1x = W * 0.2;
        const cp1y = y - 60 * line.curvature;
        const cp2x = W * 0.8;
        const cp2y = y - 60 * line.curvature;

        ctx.beginPath();
        ctx.moveTo(W * -0.2, y + 20);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, W * 1.2, y + 20);

        ctx.strokeStyle = line.color;
        ctx.globalAlpha = line.opacity * Math.sin(line.progress * Math.PI);
        ctx.lineWidth = line.width;
        ctx.stroke();
        ctx.globalAlpha = 1;

        line.progress += line.speed;
        if (line.progress > 1) {
            line.progress = 0;
            line.yOffset = (Math.random() - 0.5) * 200;
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        time++;
        lines.forEach(drawLine);
        animFrame = requestAnimationFrame(render);
    }

    window.addEventListener('resize', () => {
        resize();
        createLines();
    });

    resize();
    createLines();
    render();
}

function initScrollAnimations() {
    const revealEls = document.querySelectorAll('.reveal-up, .reveal-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
                setTimeout(() => {
                    el.classList.add('visible');
                }, delay);
                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    revealEls.forEach(el => observer.observe(el));

    setTimeout(() => {
        document.querySelectorAll('.hero-section .reveal-up').forEach(el => {
            el.classList.add('visible');
        });
    }, 600);
}

function initNavScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });
}

function initParticles() {
    const section = document.querySelector('.metrics-section');
    if (!section) return;

    function createParticle() {
        const p = document.createElement('div');
        p.style.cssText = `
            position: absolute;
            width: ${2 + Math.random() * 3}px;
            height: ${2 + Math.random() * 3}px;
            border-radius: 50%;
            background: rgba(232,98,42,${0.2 + Math.random() * 0.5});
            left: ${Math.random() * 100}%;
            bottom: ${Math.random() * 30}%;
            pointer-events: none;
            z-index: 0;
            animation: float-up ${4 + Math.random() * 4}s ease-out forwards;
        `;
        section.appendChild(p);
        setTimeout(() => p.remove(), 8000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes float-up {
            0% { transform: translateY(0) scale(1); opacity: 0.7; }
            100% { transform: translateY(-180px) scale(0); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    setInterval(createParticle, 600);
}

document.addEventListener('DOMContentLoaded', function () {

    function smoothScrollTo(targetY, duration = 900) {
        const startY = window.scrollY;
        const diff = targetY - startY;
        let startTime = null;

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startY + diff * easeInOutCubic(progress));
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navH = document.querySelector('.navbar')?.offsetHeight || 70;
                const targetY = target.getBoundingClientRect().top + window.scrollY - navH;
                smoothScrollTo(targetY, 950);
                const mobileMenu = document.getElementById('mobile-menu');
                const hamburger = document.getElementById('hamburger');
                if (mobileMenu && mobileMenu.classList.contains('open')) {
                    mobileMenu.classList.remove('open');
                    hamburger && hamburger.classList.remove('active');
                }
            }
        });
    });

    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });
    }

    const uptimeBars = document.querySelectorAll('.uptime-bar');

    const isMobile = window.innerWidth <= 480;
    if (isMobile) {
        uptimeBars.forEach((bar, i) => {
            if (i >= 15) bar.style.display = 'none';
        });
    }

    const uptimeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                uptimeBars.forEach((bar, i) => {
                    if (bar.style.display === 'none') return;
                    bar.style.opacity = '0';
                    bar.style.transform = 'scaleY(0.3)';
                    bar.style.transformOrigin = 'bottom';
                    bar.style.transition = `opacity 0.3s ease ${i * 30}ms, transform 0.3s ease ${i * 30}ms`;
                    setTimeout(() => {
                        bar.style.opacity = '1';
                        bar.style.transform = 'scaleY(1)';
                    }, 100 + i * 30);
                });
                uptimeObserver.disconnect();
            }
        });
    }, { threshold: 0.5 });

    const uptimeStrip = document.querySelector('.uptime-strip');
    if (uptimeStrip) uptimeObserver.observe(uptimeStrip);

    document.querySelectorAll('.infra-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            const num = card.querySelector('.infra-card-num');
            if (num) {
                num.style.color = 'rgba(232,98,42,0.9)';
                num.style.transition = 'color 0.3s ease';
            }
        });
        card.addEventListener('mouseleave', () => {
            const num = card.querySelector('.infra-card-num');
            if (num) num.style.color = 'rgba(232,98,42,0.4)';
        });
    });

    document.querySelectorAll('.metric-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', x + '%');
            card.style.setProperty('--my', y + '%');
            card.style.background = `
                radial-gradient(circle at ${x}% ${y}%, rgba(232,98,42,0.08) 0%, #161616 60%)
            `;
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = '';
        });
    });

});

window.addEventListener('load', runLoader);

function initSectionCanvas(canvasId, sectionId) {
    const canvas = document.getElementById(canvasId);
    const section = document.getElementById(sectionId);
    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    let W, H, particles = [], connections = [], raf;
    let isVisible = false;

    function resize() {
        W = section.offsetWidth;
        H = section.offsetHeight;
        canvas.width = W;
        canvas.height = H;
    }

    function makeParticle() {
        const isOrange = Math.random() > 0.55;
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.1,
            vy: -0.04 - Math.random() * 0.1,
            r: 0.8 + Math.random() * 2.2,
            alpha: 0.15 + Math.random() * 0.55,
            alphaDir: (Math.random() > 0.5 ? 1 : -1) * 0.003,
            color: isOrange
                ? `rgba(232,${80 + Math.floor(Math.random()*60)},42,`
                : `rgba(255,255,255,`,
            life: 0,
            maxLife: 600 + Math.random() * 800,
        };
    }

    function initParticles() {
        particles = [];
        const count = Math.min(Math.floor(W * H / 18000), 35);
        for (let i = 0; i < count; i++) {
            const p = makeParticle();
            p.life = Math.random() * p.maxLife;
            particles.push(p);
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);

        if (!isVisible) {
            raf = requestAnimationFrame(render);
            return;
        }

        particles.forEach((p, idx) => {
            p.life++;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha += p.alphaDir;
            if (p.alpha > 0.7 || p.alpha < 0.05) p.alphaDir *= -1;

            p.vx += (Math.random() - 0.5) * 0.003;
            p.vy += (Math.random() - 0.5) * 0.002 - 0.0003;
            p.vx = Math.max(-0.18, Math.min(0.18, p.vx));
            p.vy = Math.max(-0.2, Math.min(0.05, p.vy));

            let fadeAlpha = p.alpha;
            const fadeLen = 60;
            if (p.life < fadeLen) fadeAlpha *= p.life / fadeLen;
            if (p.life > p.maxLife - fadeLen) fadeAlpha *= (p.maxLife - p.life) / fadeLen;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color + fadeAlpha + ')';
            ctx.fill();

            if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > W + 20) {
                particles[idx] = makeParticle();
                if (Math.random() > 0.5) particles[idx].y = H + 5;
            }
        });

        raf = setTimeout(() => requestAnimationFrame(render), 33);
    }

    const observer = new IntersectionObserver(entries => {
        isVisible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(section);

    window.addEventListener('resize', () => { resize(); initParticles(); }, { passive: true });

    resize();
    initParticles();
    render();
}