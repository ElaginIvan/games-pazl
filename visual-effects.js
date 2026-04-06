/**
 * visual-effects.js
 * Создаёт звёздный фон с планетами и падающими звёздами.
 * Чтобы отключить — удали или закомментируй строку подключения в index.html.
 */

(function () {
    'use strict';

    // --- Создание звёздного фона ---
    function createStarsBackground() {
        const container = document.createElement('div');
        container.className = 'stars-bg';
        container.id = 'starsContainer';

        // звёзды
        const starCount = 120;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 2.5 + 0.5;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--twinkle-duration', (Math.random() * 3 + 2) + 's');
            star.style.setProperty('--twinkle-delay', (Math.random() * 4) + 's');
            container.appendChild(star);
        }

        // падающие звёзды
        const shootingStarCount = 6;
        for (let i = 0; i < shootingStarCount; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.left = (Math.random() * 60 + 20) + '%';
            shootingStar.style.top = (Math.random() * 30 + 5) + '%';
            shootingStar.style.setProperty('--star-width', (Math.random() * 2 + 2) + 'px');
            shootingStar.style.setProperty('--shoot-duration', (Math.random() * 2 + 1.5) + 's');
            shootingStar.style.setProperty('--shoot-delay', (Math.random() * 8 + i * 3) + 's');
            shootingStar.style.setProperty('--shoot-x', (Math.random() * -300 - 200) + 'px');
            shootingStar.style.setProperty('--shoot-y', (Math.random() * 200 + 150) + 'px');
            shootingStar.style.setProperty('--shoot-angle', (Math.random() * 20 - 45) + 'deg');
            shootingStar.style.setProperty('--tail-length', (Math.random() * 40 + 40) + 'px');
            container.appendChild(shootingStar);
        }

        // планеты
        const planets = [
            { size: 40, color: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', x: 85, y: 15, duration: 25, floatY: -20, floatX: 15 },
            { size: 25, color: 'linear-gradient(135deg, #60a5fa, #3b82f6)', x: 10, y: 80, duration: 18, floatY: -15, floatX: 10 },
            { size: 55, color: 'linear-gradient(135deg, #f9a8d4, #ec4899)', x: 70, y: 75, duration: 30, floatY: -25, floatX: 20 },
            { size: 20, color: 'linear-gradient(135deg, #fbbf24, #f59e0b)', x: 25, y: 25, duration: 22, floatY: -12, floatX: 8 },
        ];

        planets.forEach(function (p) {
            const planet = document.createElement('div');
            planet.className = 'planet';
            planet.style.width = p.size + 'px';
            planet.style.height = p.size + 'px';
            planet.style.background = p.color;
            planet.style.left = p.x + '%';
            planet.style.top = p.y + '%';
            planet.style.boxShadow = '0 0 ' + (p.size * 0.5) + 'px ' + (p.size * 0.2) + 'px rgba(167, 139, 250, 0.3)';
            planet.style.setProperty('--planet-duration', p.duration + 's');
            planet.style.setProperty('--planet-delay', (Math.random() * 5) + 's');
            planet.style.setProperty('--float-y', p.floatY + 'px');
            planet.style.setProperty('--float-x', p.floatX + 'px');
            container.appendChild(planet);
        });

        document.body.insertBefore(container, document.body.firstChild);
    }

    // --- Запуск после загрузки DOM ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createStarsBackground);
    } else {
        createStarsBackground();
    }

})();
