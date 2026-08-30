import { WeatherScene } from '../core/WeatherScene.js';
// import css from './ThunderstormScene.css?inline';
const css = await fetch(new URL('./ThunderstormScene.css', import.meta.url)).then(r => r.text());

export class ThunderstormScene extends WeatherScene {
    constructor(container, options = {}) {
        super(container, Object.assign({
            maxDrops: 70,
            rainInterval: 20,
            showLightning: true,
            showRain: true,
            showFlash: true,
        }, options));

        this._rainTimer = null;
        this._cloudEl = null;
        this.mount();
    }

    mount() {
        this.injectStyles(css);
        this._buildDOM();
        this.bindResponsive();
        this.bindVisibility();
        if (this.options.showRain) this._startRain();
        this._isPlaying = true;
    }

    _buildDOM() {
        const u = this._uid;
        this.createWrapper(`
            ${this.options.showFlash ? `<div class="${u}-flash"></div>` : ''}
            <div class="${u}-scene">
                <div class="${u}-cloud">
                    ${this.options.showLightning ? `
                    <svg class="${u}-lightning" viewBox="0 0 200 300">
                        <defs>
                            <filter id="${u}-glow">
                                <feGaussianBlur stdDeviation="4" result="blur1"/>
                                <feGaussianBlur stdDeviation="10" result="blur2"/>
                                <feMerge>
                                    <feMergeNode in="blur2"/>
                                    <feMergeNode in="blur1"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <path class="${u}-bolt-main"
                              d="M100,0 L88,45 L112,55 L78,120 L105,130 L68,210 L95,218 L80,300"/>
                        <path class="${u}-bolt-branch1"
                              d="M78,120 L55,155 L68,162 L40,210"/>
                        <path class="${u}-bolt-branch2"
                              d="M105,130 L132,162 L118,170 L148,215"/>
                    </svg>` : ''}
                </div>
            </div>
        `);
        this._cloudEl = this._wrapperEl.querySelector(`.${u}-cloud`);
    }

    _startRain() {
        this._rainTimer = setInterval(() => this._createDrop(), this.options.rainInterval);
    }

    _createDrop() {
        if (this._isDestroyed || !this._isPlaying || !this._cloudEl) return;
        if (this._cloudEl.querySelectorAll(`.${this._uid}-drop`).length >= this.options.maxDrops) return;

        const drop = document.createElement('div');
        drop.className = `${this._uid}-drop`;
        drop.style.left = Math.floor(Math.random() * (this._cloudEl.offsetWidth - 10)) + 'px';
        drop.style.width  = (0.5 + Math.random() * 5) + 'px';
        drop.style.height = (0.5 + Math.random() * 50) + 'px';
        drop.style.animationDuration = (1 + Math.random() * 0.5) + 's';
        this._cloudEl.appendChild(drop);
        setTimeout(() => drop.remove(), 2000);
    }

    play() {
        super.play();
        if (!this._rainTimer && this.options.showRain) this._startRain();
    }

    pause() {
        super.pause();
        if (this._rainTimer) { clearInterval(this._rainTimer); this._rainTimer = null; }
    }

    teardown() {
        if (this._rainTimer) clearInterval(this._rainTimer);
    }
}