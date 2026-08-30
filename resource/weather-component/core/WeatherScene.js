/**
 * 天气场景基类
 * 所有天气场景继承此类，实现 mount() 和 teardown()
 */
export class WeatherScene {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this._isPlaying = false;
        this._isDestroyed = false;
        this._uid = this.constructor.name.toLowerCase() + '_' + Math.random().toString(36).slice(2, 8);
        this._wrapperEl = null;
        this._styleEl = null;
        this._resizeHandler = null;
        this._visHandler = null;
    }

    /** 子类实现：创建 DOM 和启动效果 */
    mount() {}

    /** 子类实现：清理定时器、画布等资源 */
    teardown() {}

    play() {
        this._isPlaying = true;
        this._setAnimState('running');
    }

    pause() {
        this._isPlaying = false;
        this._setAnimState('paused');
    }

    destroy() {
        this._isDestroyed = true;
        this.teardown();
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this._visHandler) document.removeEventListener('visibilitychange', this._visHandler);
        if (this._styleEl?.parentNode) this._styleEl.remove();
        if (this._wrapperEl?.parentNode) this._wrapperEl.remove();
    }

    fadeIn(duration = 400) {
        if (!this._wrapperEl) return;
        this._wrapperEl.style.opacity = '0';
        this._wrapperEl.style.transition = `opacity ${duration}ms ease-in`;
        requestAnimationFrame(() => { this._wrapperEl.style.opacity = '1'; });
    }

    fadeOut(duration = 400) {
        return new Promise(resolve => {
            if (!this._wrapperEl) return resolve();
            this._wrapperEl.style.transition = `opacity ${duration}ms ease-out`;
            this._wrapperEl.style.opacity = '0';
            setTimeout(resolve, duration);
        });
    }

    /** 响应式缩放 */
    bindResponsive(baseW = 600, baseH = 500) {
        this._resizeHandler = () => {
            if (this._isDestroyed) return;
            const scale = Math.min(1, window.innerWidth / baseW, window.innerHeight / baseH);
            const target = this._wrapperEl?.querySelector(`.${this._uid}-scene`);
            if (target) {
                target.style.transform = `scale(${scale})`;
                target.style.transformOrigin = 'center center';
            }
        };
        window.addEventListener('resize', this._resizeHandler);
        this._resizeHandler();
    }

    /** 页面不可见时自动暂停 */
    bindVisibility() {
        this._visHandler = () => {
            if (this._isDestroyed) return;
            document.hidden ? this.pause() : this.play();
        };
        document.addEventListener('visibilitychange', this._visHandler);
    }

    _setAnimState(state) {
        this._wrapperEl?.querySelectorAll('*').forEach(el => {
            el.style.animationPlayState = state;
        });
    }

    /** 注入 CSS，自动替换 __UID__ 占位符 */
    injectStyles(css) {
        const id = this._uid + '_style';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css.replace(/__UID__/g, this._uid);
        document.head.appendChild(style);
        this._styleEl = style;
    }

    /** 创建 wrapper 并挂载到容器 */
    createWrapper(innerHtml) {
        const wrapper = document.createElement('div');
        wrapper.className = `${this._uid}-wrapper`;
        wrapper.innerHTML = innerHtml;
        this.container.appendChild(wrapper);
        this._wrapperEl = wrapper;
        return wrapper;
    }
}