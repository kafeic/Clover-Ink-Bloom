/**
 * 顶层管理器
 * 负责场景注册、切换、事件分发
 */
export class WeatherComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container) : container;

        // 确保容器可定位
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }

        this.options = Object.assign({ fallback: 'thunderstorm' }, options);
        this._sceneClasses = {};
        this._activeScene = null;
        this._activeType = null;
        this._listeners = {};
        this._isDestroyed = false;
    }

    /** 注册场景类型 */
    registerScene(type, SceneClass) {
        this._sceneClasses[type] = SceneClass;
        return this;
    }

    /** 切换到指定天气 */
    async switchTo(type, sceneOptions = {}) {
        if (this._isDestroyed) return;
        if (!this._sceneClasses[type]) {
            console.warn(`[WeatherComponent] 未注册的场景: ${type}`);
            return;
        }
        if (this._activeType === type) return;

        // 淡出旧场景
        if (this._activeScene) {
            await this._activeScene.fadeOut(400);
            this._activeScene.destroy();
            this._activeScene = null;
        }

        // 创建新场景
        const opts = Object.assign({}, this.options.scenes?.[type] || {}, sceneOptions);
        this._activeScene = new this._sceneClasses[type](this.container, opts);
        this._activeType = type;
        this._activeScene.fadeIn(400);

        this._emit('change', { type, scene: this._activeScene });
    }

    play()  { this._activeScene?.play(); }
    pause() { this._activeScene?.pause(); }

    destroy() {
        this._isDestroyed = true;
        if (this._activeScene) this._activeScene.destroy();
        this._activeScene = null;
    }

    on(event, cb) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(cb);
        return this;
    }

    _emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }
}