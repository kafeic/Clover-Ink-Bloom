/**
 * 墨雨 & 点击墨晕 Canvas 引擎
 * 轻量级纯 Canvas 2D 实现
 */
class InkCanvas {
    constructor() {
        this.canvas = document.getElementById('ink-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.raindrops = [];
        this.inkRipples = [];
        this.isDark = document.body.dataset.theme === 'dark';

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 鼠标点击墨晕
        document.addEventListener('click', (e) => this.addRipple(e.clientX, e.clientY));

        // 监听主题变化以调整墨雨颜色
        const observer = new MutationObserver(() => {
            this.isDark = document.body.dataset.theme === 'dark';
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

        this.initRain();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initRain() {
        const count = Math.floor(window.innerWidth / 15); // 自适应密度
        for (let i = 0; i < count; i++) {
            this.raindrops.push(this.createDrop());
        }
    }

    createDrop() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 3 + 2,
            opacity: Math.random() * 0.3 + 0.05
        };
    }

    addRipple(x, y) {
        this.inkRipples.push({
            x, y,
            radius: 0,
            maxRadius: Math.random() * 60 + 40,
            opacity: 0.6,
            speed: 1.5
        });
    }

    drawRain() {
        const color = this.isDark ? '232, 230, 225' : '34, 34, 34';
        this.ctx.strokeStyle = `rgba(${color},`;
        this.ctx.lineWidth = 1;

        this.raindrops.forEach(drop => {
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(drop.x, drop.y + drop.length);
            this.ctx.strokeStyle += `${drop.opacity})`;
            this.ctx.stroke();

            drop.y += drop.speed;
            if (drop.y > this.canvas.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.canvas.width;
            }
        });
    }

    drawRipples() {
        const color = this.isDark ? '212, 175, 55' : '74, 107, 83'; // 暗金 / 竹青

        for (let i = this.inkRipples.length - 1; i >= 0; i--) {
            const r = this.inkRipples[i];

            // 径向渐变模拟墨滴入水
            const gradient = this.ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
            gradient.addColorStop(0, `rgba(${color}, ${r.opacity * 0.5})`);
            gradient.addColorStop(0.5, `rgba(${color}, ${r.opacity * 0.2})`);
            gradient.addColorStop(1, `rgba(${color}, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.fill();

            r.radius += r.speed;
            r.opacity -= 0.015;

            if (r.opacity <= 0 || r.radius >= r.maxRadius) {
                this.inkRipples.splice(i, 1);
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawRain();
        this.drawRipples();
        requestAnimationFrame(() => this.animate());
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', () => new InkCanvas());