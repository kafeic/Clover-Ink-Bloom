/**
 * 墨花·文学茶话会 - 水墨池塘引擎 & 核心交互
 */

// ==========================================
// 1. 水墨池塘与墨鱼 Canvas 引擎
// ==========================================
class InkPond {
    constructor() {
        this.canvas = document.getElementById('pond-canvas');
        if (!this.canvas) return console.error('Canvas not found');

        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.fishes = [];
        this.ripples = [];
        this.time = 0;
        this.isDark = document.body.dataset.theme === 'dark';

        this.resize();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('click', (e) => this.addRipple(e.clientX, e.clientY));

        // 监听主题变化
        const observer = new MutationObserver(() => {
            this.isDark = document.body.dataset.theme === 'dark';
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

        // 初始化两条墨鱼
        this.fishes.push(new Fish(this, 0.3));
        this.fishes.push(new Fish(this, 0.7));

        // 【关键修复】延迟一帧启动动画，确保 CSS 变量已就绪
        requestAnimationFrame(() => this.animate());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    addRipple(x, y) {
        this.ripples.push({ x, y, radius: 0, maxRadius: Math.random() * 80 + 60, opacity: 0.5, speed: 1.2 });
    }

    drawBackground() {
        const style = getComputedStyle(document.body);
        const centerColor = style.getPropertyValue('--pond-center').trim() || '#E8EAE5';
        const edgeColor = style.getPropertyValue('--pond-edge').trim() || '#D0D4CD';

        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.8
        );
        gradient.addColorStop(0, centerColor);
        gradient.addColorStop(1, edgeColor);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawRipples() {
        const color = this.isDark ? '212, 175, 55' : '74, 107, 83';
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            const gradient = this.ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
            gradient.addColorStop(0, `rgba(${color}, 0)`);
            gradient.addColorStop(0.8, `rgba(${color}, ${r.opacity * 0.3})`);
            gradient.addColorStop(1, `rgba(${color}, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.fill();

            r.radius += r.speed;
            r.opacity -= 0.008;
            if (r.opacity <= 0 || r.radius >= r.maxRadius) this.ripples.splice(i, 1);
        }
    }

    animate() {
        this.time += 0.01;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        this.fishes.forEach(fish => { fish.update(this); fish.draw(this.ctx, this.isDark); });
        this.drawRipples();
        requestAnimationFrame(() => this.animate());
    }
}

class Fish {
    constructor(pond, startYRatio) {
        this.pond = pond;
        this.x = Math.random() * pond.width;
        this.y = pond.height * startYRatio;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.8 + Math.random() * 0.5;
        this.size = 30 + Math.random() * 20;
        this.wiggleOffset = Math.random() * Math.PI * 2;
        this.turnTimer = 0;
        this.targetAngle = this.angle;
    }

    update(pond) {
        this.turnTimer--;
        if (this.turnTimer <= 0) {
            this.targetAngle = this.angle + (Math.random() - 0.5) * 1.5;
            this.turnTimer = 100 + Math.random() * 200;
        }
        let angleDiff = this.targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * 0.02;

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const buffer = 100;
        if (this.x < -buffer) this.x = pond.width + buffer;
        if (this.x > pond.width + buffer) this.x = -buffer;
        if (this.y < -buffer) this.y = pond.height + buffer;
        if (this.y > pond.height + buffer) this.y = -buffer;
    }

    draw(ctx, isDark) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const color = isDark ? 'rgba(200, 200, 200, 0.6)' : 'rgba(40, 40, 40, 0.7)';
        const wiggle = Math.sin(this.pond.time * 3 + this.wiggleOffset) * 0.2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.bezierCurveTo(this.size * 0.6, -this.size * 0.4, this.size * 0.2, -this.size * 0.3 + wiggle * 10, -this.size * 0.5, wiggle * 15);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.3 + wiggle * 20);
        ctx.lineTo(-this.size * 0.6, wiggle * 15);
        ctx.lineTo(-this.size * 0.8, this.size * 0.3 + wiggle * 20);
        ctx.lineTo(-this.size * 0.5, wiggle * 15);
        ctx.bezierCurveTo(this.size * 0.2, this.size * 0.3 + wiggle * 10, this.size * 0.6, this.size * 0.4, this.size, 0);
        ctx.fill();

        ctx.fillStyle = isDark ? '#121418' : '#F5F5F0';
        ctx.beginPath();
        ctx.arc(this.size * 0.6, -this.size * 0.1, this.size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// 2. UI 交互逻辑
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.remove('no-js');
    try { new InkPond(); } catch(e) { console.error('Pond init failed:', e); }

    // === 语言切换 ===
    const langBtn = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('mh-lang') || 'zh';
    function setLang(lang) {
        currentLang = lang;
        document.body.dataset.lang = lang;
        langBtn.textContent = lang === 'zh' ? 'EN' : '中文';
        localStorage.setItem('mh-lang', lang);
        startTypewriter();
    }
    setLang(currentLang);
    langBtn.addEventListener('click', () => setLang(currentLang === 'zh' ? 'en' : 'zh'));

    // === 主题切换 ===
    const themeBtn = document.getElementById('theme-toggle');
    let currentTheme = localStorage.getItem('mh-theme') || 'light';
    function setTheme(theme) {
        currentTheme = theme;
        document.body.dataset.theme = theme;
        themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('mh-theme', theme);
    }
    setTheme(currentTheme);
    themeBtn.addEventListener('click', () => setTheme(currentTheme === 'light' ? 'dark' : 'light'));

    // === 打字机效果 ===
    const typeTarget = document.getElementById('typewriter-target');
    let typeTimeout;
    function startTypewriter() {
        clearTimeout(typeTimeout);
        // 使用新的 t-zh / t-en 类名
        const el = typeTarget.querySelector(`.t-${currentLang}`);
        if (!el) return;

        const fullText = el.textContent.trim();
        el.textContent = '';
        el.style.borderRight = '2px solid var(--accent-color)';
        el.style.animation = 'none';

        let i = 0;
        function type() {
            if (i < fullText.length) {
                el.textContent += fullText.charAt(i);
                i++;
                typeTimeout = setTimeout(type, 60);
            } else {
                el.style.animation = 'blink 1s step-end infinite';
            }
        }
        type();
    }

    if (!document.getElementById('blink-style')) {
        const style = document.createElement('style');
        style.id = 'blink-style';
        style.textContent = `@keyframes blink { 50% { border-color: transparent; } }`;
        document.head.appendChild(style);
    }
    startTypewriter();

    // === 滚动显现 ===
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => observer.observe(el));
});