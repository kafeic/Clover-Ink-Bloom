import { WeatherScene } from '../core/WeatherScene.js';
// import css from './SnowScene.css?inline';
const css = await fetch(new URL('./SnowScene.css', import.meta.url)).then(r => r.text());

export class SnowScene extends WeatherScene {
    constructor(container, options = {}) {
        super(container, Object.assign({
            maxFlakes: 180,
            speedBase: 6,
            windForce: 0.6,
            sizeMin: 4,
            sizeMax: 14,
            accumulate: true,
        }, options));

        this._flakes = [];
        this._wind = 0;
        this._targetWind = 0;
        this._accumulation = [];
        this._animId = null;
        this._canvas = null;
        this._ctx = null;
        this._flakeImages = []; // 预渲染的雪花图片缓存

        this.mount();
    }

    mount() {
        this.injectStyles(css);
        this._buildDOM();
        this._initCanvas();
        this._preRenderFlakes();
        this._initFlakes();
        this.bindResponsive();
        this.bindVisibility();
        this._isPlaying = true;
        this._animId = requestAnimationFrame(() => this._loop());
    }

    _buildDOM() {
        const u = this._uid;
        this.createWrapper(`
            <div class="${u}-scene">
                <canvas class="${u}-canvas"></canvas>
            </div>
        `);
        this._canvas = this._wrapperEl.querySelector(`.${u}-canvas`);
        this._ctx = this._canvas.getContext('2d');
    }

    _initCanvas() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = rect.width * dpr;
        this._canvas.height = rect.height * dpr;
        this._canvas.style.width = rect.width + 'px';
        this._canvas.style.height = rect.height + 'px';
        this._ctx.scale(dpr, dpr);
        this._accumulation = new Array(Math.ceil(rect.width)).fill(0);
    }

    /** 生成单个雪花 SVG 字符串 */
    _flakeSVG(size, arms, style) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.4; // 臂长
        const branchLen = r * 0.35;
        let paths = '';

        for (let i = 0; i < arms; i++) {
            const angle = (Math.PI * 2 / arms) * i - Math.PI / 2;
            const ex = cx + Math.cos(angle) * r;
            const ey = cy + Math.sin(angle) * r;

            // 主臂
            paths += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" 
                       stroke="white" stroke-width="${Math.max(0.8, size * 0.06)}" stroke-linecap="round"/>`;

            // 分叉（风格1：对称分叉）
            if (style === 1) {
                const bx = cx + Math.cos(angle) * r * 0.55;
                const by = cy + Math.sin(angle) * r * 0.55;
                const b1x = bx + Math.cos(angle + 0.7) * branchLen;
                const b1y = by + Math.sin(angle + 0.7) * branchLen;
                const b2x = bx + Math.cos(angle - 0.7) * branchLen;
                const b2y = by + Math.sin(angle - 0.7) * branchLen;
                paths += `<line x1="${bx}" y1="${by}" x2="${b1x}" y2="${b1y}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.04)}" stroke-linecap="round"/>`;
                paths += `<line x1="${bx}" y1="${by}" x2="${b2x}" y2="${b2y}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.04)}" stroke-linecap="round"/>`;
            }

            // 分叉（风格2：菱形末端）
            if (style === 2) {
                const bx = cx + Math.cos(angle) * r * 0.65;
                const by = cy + Math.sin(angle) * r * 0.65;
                const b1x = bx + Math.cos(angle + 0.5) * branchLen * 0.8;
                const b1y = by + Math.sin(angle + 0.5) * branchLen * 0.8;
                const b2x = bx + Math.cos(angle - 0.5) * branchLen * 0.8;
                const b2y = by + Math.sin(angle - 0.5) * branchLen * 0.8;
                paths += `<line x1="${bx}" y1="${by}" x2="${b1x}" y2="${b1y}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.04)}" stroke-linecap="round"/>`;
                paths += `<line x1="${bx}" y1="${by}" x2="${b2x}" y2="${b2y}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.04)}" stroke-linecap="round"/>`;
                // 末端小圆点
                paths += `<circle cx="${ex}" cy="${ey}" r="${Math.max(0.6, size * 0.04)}" fill="white"/>`;
            }

            // 分叉（风格3：双层分叉）
            if (style === 3) {
                // 外分叉
                const bx1 = cx + Math.cos(angle) * r * 0.7;
                const by1 = cy + Math.sin(angle) * r * 0.7;
                paths += `<line x1="${bx1}" y1="${by1}" x2="${bx1 + Math.cos(angle + 0.6) * branchLen}" y2="${by1 + Math.sin(angle + 0.6) * branchLen}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.035)}" stroke-linecap="round"/>`;
                paths += `<line x1="${bx1}" y1="${by1}" x2="${bx1 + Math.cos(angle - 0.6) * branchLen}" y2="${by1 + Math.sin(angle - 0.6) * branchLen}" 
                         stroke="white" stroke-width="${Math.max(0.5, size * 0.035)}" stroke-linecap="round"/>`;
                // 内分叉
                const bx2 = cx + Math.cos(angle) * r * 0.38;
                const by2 = cy + Math.sin(angle) * r * 0.38;
                const sBranch = branchLen * 0.6;
                paths += `<line x1="${bx2}" y1="${by2}" x2="${bx2 + Math.cos(angle + 0.7) * sBranch}" y2="${by2 + Math.sin(angle + 0.7) * sBranch}" 
                         stroke="white" stroke-width="${Math.max(0.4, size * 0.03)}" stroke-linecap="round"/>`;
                paths += `<line x1="${bx2}" y1="${by2}" x2="${bx2 + Math.cos(angle - 0.7) * sBranch}" y2="${by2 + Math.sin(angle - 0.7) * sBranch}" 
                         stroke="white" stroke-width="${Math.max(0.4, size * 0.03)}" stroke-linecap="round"/>`;
            }
        }

        // 中心小圆
        paths += `<circle cx="${cx}" cy="${cy}" r="${Math.max(0.8, size * 0.05)}" fill="white"/>`;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
    }

    /** 预渲染多种雪花到离屏 canvas，生成 Image 对象缓存 */
    _preRenderFlakes() {
        this._flakeImages = [];
        const sizes = [8, 12, 16, 22, 28];
        const armOptions = [6, 6, 8, 6, 8];
        const styles = [1, 2, 3, 2, 3];

        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const svgStr = this._flakeSVG(size, armOptions[i], styles[i]);
            const blob = new Blob([svgStr], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.src = url;
            this._flakeImages.push({ img, size });
        }
    }

    _initFlakes() {
        this._flakes = [];
        for (let i = 0; i < this.options.maxFlakes; i++) {
            this._flakes.push(this._createFlake(true));
        }
    }

    _createFlake(randomY = false) {
        const o = this.options;
        const w = this._canvas.width / (window.devicePixelRatio || 1);
        const h = this._canvas.height / (window.devicePixelRatio || 1);
        const depth = Math.random();
        const imgIdx = Math.floor(Math.random() * this._flakeImages.length);

        return {
            x: Math.random() * w,
            y: randomY ? Math.random() * h : -(Math.random() * 30),
            imgIdx: imgIdx,
            scale: o.sizeMin / this._flakeImages[imgIdx].size +
                   ((o.sizeMax - o.sizeMin) / this._flakeImages[imgIdx].size) * depth,
            speed: (o.speedBase * (0.4 + depth * 0.6)) + 0.3,
            opacity: 0.25 + (0.75 * depth),
            swingOffset: Math.random() * Math.PI * 2,
            swingSpeed: 0.008 + (0.025 * depth),
            swingAmp: 0.3 + (0.7 * depth),
            depth: depth,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
        };
    }

    _loop() {
        if (this._isDestroyed) return;

        const ctx = this._ctx;
        const dpr = window.devicePixelRatio || 1;
        const w = this._canvas.width / dpr;
        const h = this._canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        // 风力平滑过渡
        if (Math.random() < 0.01) {
            this._targetWind = (Math.random() - 0.5) * this.options.windForce;
        }
        this._wind += (this._targetWind - this._wind) * 0.02;

        // 更新并绘制雪花
        for (let i = 0; i < this._flakes.length; i++) {
            const f = this._flakes[i];
            const cached = this._flakeImages[f.imgIdx];

            // 图片还没加载完就跳过
            if (!cached || !cached.img.complete) continue;

            f.swingOffset += f.swingSpeed;
            f.rotation += f.rotSpeed;
            f.x += Math.sin(f.swingOffset) * f.swingAmp + this._wind;
            f.y += f.speed;

            // 绘制雪花图片
            const drawSize = cached.size * f.scale;
            ctx.save();
            ctx.globalAlpha = f.opacity;
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);
            ctx.drawImage(cached.img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            ctx.restore();

            // 落地
            if (f.y >= h) {
                if (this.options.accumulate) {
                    const idx = Math.floor(f.x);
                    if (idx >= 0 && idx < this._accumulation.length) {
                        this._accumulation[idx] += f.scale * 0.03;
                    }
                }
                this._flakes[i] = this._createFlake(false);
            } else if (f.x < -30 || f.x > w + 30) {
                this._flakes[i] = this._createFlake(false);
            }
        }

        // 绘制积雪
        if (this.options.accumulate) {
            ctx.beginPath();
            ctx.moveTo(0, h);

            for (let x = 0; x < this._accumulation.length; x++) {
                const y = h - (this._accumulation[x] || 0);
                const nextY = h - (this._accumulation[x + 1] || 0);
                const cx = x + 0.5;
                const cy = (y + nextY) / 2;
                ctx.quadraticCurveTo(x, y, cx, cy);
            }

            ctx.lineTo(w, h);
            ctx.closePath();

            const snowGrad = ctx.createLinearGradient(0, h - 60, 0, h);
            snowGrad.addColorStop(0, 'rgba(230, 240, 255, 0.9)');
            snowGrad.addColorStop(1, 'rgba(200, 215, 240, 0.7)');
            ctx.fillStyle = snowGrad;
            ctx.fill();
        }

        if (this._isPlaying) {
            this._animId = requestAnimationFrame(() => this._loop());
        }
    }

    play() {
        super.play();
        if (!this._animId) {
            this._animId = requestAnimationFrame(() => this._loop());
        }
    }

    pause() {
        super.pause();
        if (this._animId) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }
    }

    teardown() {
        if (this._animId) cancelAnimationFrame(this._animId);
        this._flakes = [];
        this._accumulation = [];
    }
}