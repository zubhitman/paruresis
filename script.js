// script.js - Версия 10.0 (Accordion fixed + Theme toggle + Optimized game)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Script v10.0: All systems ready");

    // ========== 1. АККОРДЕОН (для therapy.html) ==========
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const content = this.nextElementSibling;
            const isActive = this.classList.contains('active');

            // Закрываем все остальные (аккордеон-style, только один открыт)
            accordionHeaders.forEach(btn => {
                if (btn !== this && btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    const otherContent = btn.nextElementSibling;
                    if (otherContent) {
                        otherContent.style.maxHeight = null;
                        otherContent.classList.remove('open');
                    }
                }
            });

            // Переключаем текущий
            if (!isActive) {
                this.classList.add('active');
                if (content) {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.classList.add('open');
                }
            } else {
                this.classList.remove('active');
                if (content) {
                    content.style.maxHeight = null;
                    content.classList.remove('open');
                }
            }
        });
    });

    // ========== 2. ТЕМА (тёмная по умолчанию, но с корректным переключением) ==========
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Если нет сохранённой темы — ставим тёмную
    if (!localStorage.getItem('theme')) {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            html.setAttribute('data-theme', 'dark');
            if (themeToggle) themeToggle.textContent = '☀️';
        } else {
            html.removeAttribute('data-theme');
            if (themeToggle) themeToggle.textContent = '🌙';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = html.getAttribute('data-theme') === 'dark';
            if (isDark) {
                html.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
            } else {
                html.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            }
        });
    }

    // ========== 3. ЗАКРЫТИЕ БАННЕРА ==========
    const closeBtn = document.getElementById('close-btn');
    const warning = document.getElementById('warning-banner');
    if (closeBtn && warning) {
        closeBtn.addEventListener('click', () => warning.style.display = 'none');
    }

    // ========== 4. АУДИО ДЛЯ ИГРЫ (Web Audio) ==========
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx, noiseNode, gainNode;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
            const bufferSize = audioCtx.sampleRate * 2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = buffer;
            noiseNode.loop = true;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0;

            noiseNode.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            noiseNode.start();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function setStreamSound(active) {
        if (!gainNode || !audioCtx) return;
        const now = audioCtx.currentTime;
        if (active) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
        } else {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        }
    }

    // ========== 5. ИГРА-СИМУЛЯТОР ==========
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        const targetWrapper = document.getElementById('target-wrapper');
        const streamBeam = document.getElementById('stream-beam');
        const aimSight = document.getElementById('aim-sight');
        const startScreen = document.getElementById('start-screen');
        const scoreSpan = document.getElementById('score');
        const splashDiv = document.getElementById('splash-effect');

        let isPlaying = false, isFiring = false;
        let score = 0, lastScoreUpdate = 0;
        let mouseX = 0, mouseY = 0, aimX = 0, aimY = 0;
        let noiseX = 0, noiseY = 0;
        let targetX = 0, targetY = 0;
        let speedX = 2, speedY = 1.5;

        function getClosestPoint(px, py, x1, y1, x2, y2) {
            const ax = x2 - x1, ay = y2 - y1;
            const t = ((px - x1) * ax + (py - y1) * ay) / (ax * ax + ay * ay || 1);
            const clamped = Math.min(1, Math.max(0, t));
            return { x: x1 + ax * clamped, y: y1 + ay * clamped };
        }

        function startGame() {
            if (isPlaying) return;
            initAudio();
            isPlaying = true;
            if (startScreen) startScreen.style.display = 'none';
            score = 0;
            if (scoreSpan) scoreSpan.innerText = '0';
            requestAnimationFrame(gameLoop);
        }

        if (startScreen) startScreen.addEventListener('click', startGame);

        // Управление
        gameContainer.addEventListener('mousemove', (e) => {
            const rect = gameContainer.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        const startFire = () => { if (isPlaying) { isFiring = true; setStreamSound(true); } };
        const stopFire = () => { isFiring = false; setStreamSound(false); };
        gameContainer.addEventListener('mousedown', startFire);
        gameContainer.addEventListener('mouseup', stopFire);
        gameContainer.addEventListener('mouseleave', stopFire);
        gameContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isPlaying) startGame();
            else {
                startFire();
                const rect = gameContainer.getBoundingClientRect();
                const touch = e.touches[0];
                mouseX = touch.clientX - rect.left;
                mouseY = touch.clientY - rect.top;
            }
        });
        gameContainer.addEventListener('touchend', stopFire);
        gameContainer.addEventListener('touchmove', (e) => {
            if (isPlaying) {
                const rect = gameContainer.getBoundingClientRect();
                const touch = e.touches[0];
                mouseX = touch.clientX - rect.left;
                mouseY = touch.clientY - rect.top;
                e.preventDefault();
            }
        });

        function gameLoop(now) {
            if (!isPlaying) return;
            requestAnimationFrame(gameLoop);

            const w = gameContainer.offsetWidth;
            const h = gameContainer.offsetHeight;
            if (w === 0) return;

            const difficulty = 1 + score / 1800;
            targetX += speedX * difficulty;
            if (targetX > w/2 - 60 || targetX < -w/2 + 60) speedX *= -1;
            targetY += speedY * difficulty;
            if (targetY > h/2 - 70 || targetY < -h/2 + 70) speedY *= -1;
            if (targetWrapper) {
                targetWrapper.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) rotateX(45deg)`;
            }

            const shake = (isFiring ? 3.2 : 1.8) * difficulty * 0.7;
            noiseX += (Math.random() - 0.5) * shake;
            noiseY += (Math.random() - 0.5) * shake;
            noiseX *= 0.9; noiseY *= 0.9;
            aimX = Math.min(w, Math.max(0, mouseX + noiseX));
            aimY = Math.min(h, Math.max(0, mouseY + noiseY));
            if (aimSight) {
                aimSight.style.left = aimX + 'px';
                aimSight.style.top = aimY + 'px';
            }

            if (isFiring) {
                gameContainer.classList.add('firing');
                const startX = w/2, startY = h;
                const endX = aimX, endY = aimY;
                const dx = endX - startX, dy = endY - startY;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
                const length = Math.min(Math.hypot(dx, dy), h);
                if (streamBeam) {
                    streamBeam.style.height = length + 'px';
                    streamBeam.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                }
                const targetCenterX = w/2 + targetX;
                const targetCenterY = h/2 + targetY;
                const closest = getClosestPoint(targetCenterX, targetCenterY, startX, startY, endX, endY);
                const dist = Math.hypot(closest.x - targetCenterX, (closest.y - targetCenterY) * 1.4);
                if (dist < 58) {
                    if (now - lastScoreUpdate > 35) {
                        score += 5;
                        lastScoreUpdate = now;
                        if (scoreSpan) scoreSpan.innerText = Math.floor(score);
                    }
                    if (splashDiv) {
                        splashDiv.style.opacity = '1';
                        splashDiv.style.left = closest.x + 'px';
                        splashDiv.style.top = closest.y + 'px';
                        splashDiv.classList.add('splashing');
                        setTimeout(() => splashDiv.classList.remove('splashing'), 200);
                    }
                    if (scoreSpan) scoreSpan.style.color = '#facc15';
                } else {
                    if (splashDiv) splashDiv.style.opacity = '0';
                    if (scoreSpan) scoreSpan.style.color = '#55efc4';
                }
            } else {
                gameContainer.classList.remove('firing');
                if (splashDiv) splashDiv.style.opacity = '0';
            }
        }
    }
});