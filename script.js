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
let packetRef = null;
let stats = { totalGB: 0, tunnels: 0, currentSpeed: 0 };
let firebaseInitialized = false;

updateClock();

function validatePacket(packet) {
    if (!packet || typeof packet !== 'object') return false;
    
    const ipRegex = /^(\d{1,3}\.){1,3}(\d{1,3}|x)(\.(\d{1,3}|x))*$/;
    if (!packet.ip || typeof packet.ip !== 'string') return false;
    if (!ipRegex.test(packet.ip)) return false;
    
    const validProtocols = [
        'TCP', 'UDP', 'HTTP', 'HTTPS', 'FTP', 
        'TLS_1.2', 'TLS_1.3', 'SSL_3.0', 'SSH', 'SMTP', 'DNS', 'DHCP',
        'CHACHA20', 'AES_256', 'BLOWFISH', 'RC4', 'WPA2', 'WPA3', 'DTLS',
        'QUIC', 'WIREGUARD', 'X25519', 'AES-GCM'
    ];
    
    if (!packet.proto || typeof packet.proto !== 'string') return false;
    const upperProto = packet.proto.toUpperCase();
    if (!validProtocols.includes(upperProto)) packet.proto = upperProto;
    else packet.proto = upperProto;
    
    if (!packet.payload || typeof packet.payload !== 'string') return false;
    packet.payload = String(packet.payload).replace(/[<>]/g, '').substring(0, 20);
    
    return true;
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
            packetRef = db.ref('last_packet');
            
            let dataLoaded = false;
            let packetsLoaded = false;
            
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
                    
                    if (dataLoaded && packetsLoaded) {
                        firebaseInitialized = true;
                        resolve();
                    }
                }
            });
            
            packetRef.on('value', (snapshot) => {
                const packet = snapshot.val();
                if (packet && validatePacket(packet)) {
                    drawRow(packet);
                    packetsLoaded = true;
                    
                    if (dataLoaded && packetsLoaded) {
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

// Обновление UI
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

// Обновление часов
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

// Добавление строки в таблицу
function drawRow(packet) {
    const body = document.getElementById('traffic-body');
    if (!body || !packet) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${packet.ip || '0.0.0.0'}</td>
        <td><span class="protocol-badge">${packet.proto || '---'}</span></td>
        <td>${packet.payload || '---'}</td>
        <td class="status-encrypted">ENCRYPTED</td>
    `;
    
    // Добавляем строку с анимацией
    row.style.opacity = '0';
    row.style.transform = 'translateY(-20px)';
    row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    body.prepend(row);
    
    // Запускаем анимацию появления
    setTimeout(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    }, 50);
    
    // Удаляем лишние строки
    if (body.rows.length > 12) {
        const lastRow = body.rows[body.rows.length - 1];
        lastRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        lastRow.style.opacity = '0';
        lastRow.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            body.deleteRow(body.rows.length - 1);
        }, 300);
    }
}

// Лоадер
async function runLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.querySelector('.loading-text');
    
    if (progressBar && loadingText) {
        const statusTexts = ['Initializing', 'Loading resources', 'Connecting', 'Loading data', 'Almost ready'];
        
        // Инициализируем Firebase во время загрузки
        const firebasePromise = initializeFirebase();
        
        // Анимация прогресса
        for (let i = 0; i <= 100; i += 5) {
            progressBar.style.width = i + '%';
            
            const statusIndex = Math.floor((i / 100) * statusTexts.length);
            loadingText.textContent = statusTexts[Math.min(statusIndex, statusTexts.length - 1)];
            
            await new Promise(r => setTimeout(r, 30));
        }
        
        // Ждем загрузки данных из Firebase
        await firebasePromise;
    }
    
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            startApp();
        }, 800);
    }
}

// Запуск приложения
function startApp() {
    updateClock();
    setInterval(updateClock, 1000);
    
    // Firebase уже инициализирован в лоадере
    
    // Анимации при скролле
    setupScrollAnimations();
    
    // Плавная прокрутка для навигации
    setupSmoothScroll();
    
    // Настройка плавного скролла как у Apple
    setupSmoothScrolling();
    
    // Настройка переключения темы
    setupThemeToggle();
}

// Переключение темы
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Устанавливаем правильный текст кнопки на основе текущей темы
    const isCurrentlyDark = document.body.classList.contains('dark-theme');
    themeToggle.textContent = isCurrentlyDark ? 'LIGHT' : 'DARK';
    
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        
        // Обновляем текст кнопки
        themeToggle.textContent = isDark ? 'LIGHT' : 'DARK';
        
        // Сохраняем тему
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Анимации при скролле
function setupScrollAnimations() {
    // Наблюдаем за всеми секциями
    const sections = document.querySelectorAll('section');
    
    sections.forEach((section, index) => {
        // Начальное состояние - скрыты
        section.style.opacity = '0';
        section.style.transform = 'translateY(50px)';
        
        // Создаем Intersection Observer для каждой секции
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Плавное появление
                    entry.target.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                } else {
                    // Если секция уходит вверх - плавно исчезает
                    const rect = entry.target.getBoundingClientRect();
                    if (rect.bottom < 0) {
                        entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        entry.target.style.opacity = '0';
                        entry.target.style.transform = 'translateY(-30px)';
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px'
        });
        
        observer.observe(section);
    });
    
    // Добавляем плавную анимацию для метрик
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100); // Постепенное появление
                }
            });
        }, {
            threshold: 0.1
        });
        
        cardObserver.observe(card);
    });
}

// Плавная прокрутка
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Плавный скролл как у Apple
function setupSmoothScrolling() {
    // Добавляем плавность для всего скролла
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Улучшаем скролл для touch устройств
    if ('scrollBehavior' in document.documentElement.style) {
        // Браузер поддерживает smooth scrolling
        document.body.style.scrollBehavior = 'smooth';
    }
    
    // Добавляем инерцию для iOS/Mac
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Оптимизируем производительность скролла
    let ticking = false;
    
    function updateScrollAnimation() {
        // Здесь можно добавить дополнительные анимации при скролле
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollAnimation);
            ticking = true;
        }
    }, { passive: true });
}

// Запуск
window.onload = runLoader;