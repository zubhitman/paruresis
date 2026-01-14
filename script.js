// script.js - Версия 8.0 (Звук + Прогрессия сложности)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Скрипт v8.0: Audio Engine Ready");

    // ==========================================
    // 1. АУДИО ДВИЖОК (Web Audio API)
    // Генерируем звуки кодом, без mp3 файлов
    // ==========================================
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;
    let noiseNode;
    let gainNode;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
            
            // Создаем буфер для белого шума (звук воды)
            const bufferSize = audioCtx.sampleRate * 2; // 2 секунды
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1; // Белый шум
            }

            noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = buffer;
            noiseNode.loop = true;

            // Фильтр, чтобы звук был мягче (Lowpass)
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            // Контроль громкости
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0; // Сначала тишина

            // Цепочка: Шум -> Фильтр -> Громкость -> Динамики
            noiseNode.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            noiseNode.start();
        }
        // Возобновляем контекст, если браузер его приостановил
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function setStreamSound(isFlowing) {
        if (!gainNode) return;
        // Плавное включение/выключение звука
        const now = audioCtx.currentTime;
        if (isFlowing) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1); // Громкость 15%
        } else {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.1); // Тишина
        }
    }


    // ==========================================
    // 2. ОБЩАЯ ЛОГИКА САЙТА
    // ==========================================
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    if (themeToggle) {
        themeToggle.textContent = htmlElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
        themeToggle.addEventListener('click', function() {
            const isDark = htmlElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                htmlElement.removeAttribute('data-theme');
                themeToggle.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                themeToggle.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    const closeBtn = document.getElementById('close-btn');
    const warningBanner = document.getElementById('warning-banner');
    if (closeBtn && warningBanner) {
        closeBtn.addEventListener('click', () => warningBanner.style.display = 'none');
    }

    // ==========================================
    // 3. ИГРА-СИМУЛЯТОР
    // ==========================================
    
    const container = document.getElementById("game-container");
    
    if (container) {
        const targetWrapper = document.getElementById("target-wrapper");
        const streamBeam = document.getElementById("stream-beam");
        const aimSight = document.getElementById("aim-sight");
        const startScreen = document.getElementById("start-screen");
        const scoreDisplay = document.getElementById("score");
        const splash = document.getElementById("splash-effect");

        let isPlaying = false;
        let isFiring = false;
        let score = 0;
        
        // Координаты
        let mouseX = 0; let mouseY = 0;
        let currentAimX = 0; let currentAimY = 0;
        let noiseX = 0; let noiseY = 0;

        // Мишень
        let targetX = 0;
        let targetY = 0;
        let baseSpeedX = 2; // Базовая скорость
        let baseSpeedY = 1.5;
        let currentSpeedX = 2;
        let currentSpeedY = 1.5;


        // Вспомогательная функция (Raycast)
        function getClosestPointOnSegment(px, py, x1, y1, x2, y2) {
            const C = x2 - x1;
            const D = y2 - y1;
            const dot = (px - x1) * C + (py - y1) * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            let xx, yy;
            if (param < 0) { xx = x1; yy = y1; }
            else if (param > 1) { xx = x2; yy = y2; }
            else { xx = x1 + param * C; yy = y1 + param * D; }
            return { x: xx, y: yy };
        }

        function tryStartGame() {
            initAudio(); // Включаем звук при первом клике
            if (!isPlaying) {
                isPlaying = true;
                startScreen.style.display = 'none';
                score = 0;
                scoreDisplay.innerText = "0";
                requestAnimationFrame(gameLoop);
            }
        }
        if (startScreen) startScreen.addEventListener('click', tryStartGame);

        // Управление
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        
        // Кнопка мыши / Тач
        const startFire = () => { if(isPlaying) { isFiring = true; setStreamSound(true); } };
        const stopFire = () => { isFiring = false; setStreamSound(false); };

        container.addEventListener('mousedown', startFire);
        container.addEventListener('mouseup', stopFire);
        container.addEventListener('mouseleave', stopFire); // Если курсор ушел с поля

        container.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            if(!isPlaying) { tryStartGame(); } 
            else { 
                startFire();
                const rect = container.getBoundingClientRect();
                mouseX = e.touches[0].clientX - rect.left;
                mouseY = e.touches[0].clientY - rect.top;
            }
        });
        container.addEventListener('touchend', stopFire);
        container.addEventListener('touchmove', (e) => {
             if(isPlaying) {
                const rect = container.getBoundingClientRect();
                mouseX = e.touches[0].clientX - rect.left;
                mouseY = e.touches[0].clientY - rect.top;
             }
        });

        // --- ИГРОВОЙ ЦИКЛ ---
        function gameLoop() {
            if (!isPlaying) return;

            const width = container.offsetWidth;
            const height = container.offsetHeight;

            // 1. СЛОЖНОСТЬ (Ускоряем мишень каждые 500 очков)
            // Множитель сложности: 1.0 в начале, 1.5 при 1000 очках и т.д.
            const difficultyMultiplier = 1 + (score / 2000); 
            
            // 2. ДВИЖЕНИЕ МИШЕНИ
            targetX += currentSpeedX * difficultyMultiplier;
            if (targetX > width / 2 - 50 || targetX < -width / 2 + 50) currentSpeedX *= -1;

            targetY += currentSpeedY * difficultyMultiplier;
            if (targetY > height / 2 - 60 || targetY < -height / 2 + 60) currentSpeedY *= -1;

            if(targetWrapper) {
                targetWrapper.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) rotateX(45deg)`;
            }

            // 3. ДРОЖАНИЕ (Тоже растет от сложности)
            const shakeAmount = (isFiring ? 3 : 1.5) * (difficultyMultiplier * 0.8);
            noiseX += (Math.random() - 0.5) * shakeAmount;
            noiseY += (Math.random() - 0.5) * shakeAmount;
            noiseX *= 0.9; noiseY *= 0.9;

            currentAimX = mouseX + noiseX;
            currentAimY = mouseY + noiseY;

            if(aimSight) {
                aimSight.style.left = currentAimX + 'px';
                aimSight.style.top = currentAimY + 'px';
            }

            // 4. ОТРИСОВКА И ПРОВЕРКА
            if (isFiring) {
                container.classList.add('firing');
                
                const startX = width / 2;
                const startY = height;
                const endX = currentAimX;
                const endY = currentAimY;

                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
                const length = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

                if(streamBeam) {
                    streamBeam.style.height = length + 'px';
                    streamBeam.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                }
                
                // Проверка луча
                const targetCenterX = (width / 2) + targetX;
                const targetCenterY = (height / 2) + targetY;
                const closest = getClosestPointOnSegment(targetCenterX, targetCenterY, startX, startY, endX, endY);
                
                const dx = Math.abs(closest.x - targetCenterX);
                const dy = Math.abs(closest.y - targetCenterY) * 1.5; 
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 60) {
                    score += 5;
                    if(splash) {
                        splash.style.opacity = 1;
                        splash.style.left = closest.x + 'px';
                        splash.style.top = closest.y + 'px';
                        splash.classList.add('splashing');
                    }
                    if(scoreDisplay) scoreDisplay.style.color = "#fff"; 
                } else {
                    if(splash) {
                        splash.style.opacity = 0;
                        splash.classList.remove('splashing');
                    }
                    if(scoreDisplay) scoreDisplay.style.color = "#55efc4";
                }

            } else {
                container.classList.remove('firing');
                if(splash) splash.style.opacity = 0;
                if(scoreDisplay) scoreDisplay.style.color = "#55efc4";
            }

            if(scoreDisplay) scoreDisplay.innerText = Math.floor(score);
            requestAnimationFrame(gameLoop);
        }
    } else {
        console.log("Игра не найдена.");
    }
});