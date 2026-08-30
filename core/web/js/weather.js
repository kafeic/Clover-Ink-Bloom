/**
 * 天气动画组件
 * ------------------------------------------------------------
 * - 标签页隐藏时暂停生成、恢复时继续
 * 用法：在 HTML 中引入此文件即可自动启动。
 */
const WeatherAnim = (function () {
    'use strict';
    const DEFAULTS = {
        maxDrops: 34, // 桌面端最大同时存活雨滴数
        interval: 24 // 每多少 ms 生成一滴
    };
    // SVG 场景尺寸（与内联 SVG 的 viewBox 一致，用户单位）
    const SCENE_W = 200;
    const SCENE_H = 190;
    // 雨滴起点/终点 y（用户单位）：从云底附近落到底部
    const RAIN_TOP = 100;
    const RAIN_BOTTOM = SCENE_H; // 190
    const RAIN_FALL = RAIN_BOTTOM - RAIN_TOP; // 90
    const SVG_NS = 'http://www.w3.org/2000/svg';

    let svg = null; // .weather-anim-lightning-svg
    let timerId = null;
    let dropTimeoutIds = []; // 新增：用于追踪所有雨滴和水纹的定时器
    let maxDrops = DEFAULTS.maxDrops;
    let enabled = true; // 页面可见时才生成
    let isInitialized = false; // 新增：防止重复初始化

    /**
     * 在雨滴落地处生成一个向两侧扩散的椭圆水纹（涟漪）
     */
    function spawnSplash(x) {
        if (!svg) return;
        const splash = document.createElementNS(SVG_NS, 'ellipse');
        splash.setAttribute('cx', x);
        splash.setAttribute('cy', SCENE_H - 6); // 贴近底部（水面/地面）
        splash.setAttribute('rx', 2);
        splash.setAttribute('ry', 1.4);
        splash.setAttribute('class', 'weather-anim-splash');
        svg.appendChild(splash);
        // 涟漪动画约 0.6s，随后移除节点
        const splashTimeout = setTimeout(() => {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 700);
        dropTimeoutIds.push(splashTimeout);
    }

    /**
     * 生成一滴雨（SVG <line>），并在其落地时生成水纹
     */
    function makeDrop() {
        if (!svg) return;
        if (svg.querySelectorAll('.weather-anim-drop').length >= maxDrops) return;
        const x = 22 + Math.random() * (SCENE_W - 44); // 云体水平范围附近
        const len = 6 + Math.random() * 6; // 6~12 用户单位
        const dur = 1 + Math.random() * 0.8; // 1~1.8s
        const drop = document.createElementNS(SVG_NS, 'line');
        drop.setAttribute('x1', x);
        drop.setAttribute('x2', x);
        drop.setAttribute('y1', RAIN_TOP);
        drop.setAttribute('y2', RAIN_TOP + len);
        drop.setAttribute('class', 'weather-anim-drop');
        drop.style.animationDuration = dur + 's';
        // 负延迟让雨滴在动画周期中错开分布，视觉上更连贯
        const delay = Math.random() * -dur;
        drop.style.animationDelay = delay + 's';
        svg.appendChild(drop);
        // 动画结束后移除节点
        const dropTimeout = setTimeout(() => {
            if (drop.parentNode) drop.parentNode.removeChild(drop);
        }, dur * 1000 + 300);
        dropTimeoutIds.push(dropTimeout);

        // 落地水纹：雨滴第一次到达底部（动画 88% 处）时生成涟漪
        // 负延迟会让部分雨滴创建时已过落地时刻，此时顺延到下一轮循环
        let landAt = dur * 0.88 + delay; // 从创建时起算的落地时刻（秒）
        if (landAt <= 0) landAt += dur;
        const splashTimeout = setTimeout(() => spawnSplash(x), Math.max(50, landAt * 1000));
        dropTimeoutIds.push(splashTimeout);
    }

    function start() {
        if (timerId) return;
        timerId = setInterval(() => {
            if (enabled) makeDrop();
        }, DEFAULTS.interval);
    }

    function stop() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        // 清理所有待执行的雨滴和水纹定时器，并移除已生成的节点。
        // 若不移除节点：定时器被清除后，已有雨滴/水纹将永久残留 DOM，
        // 多次切换标签页后 .weather-anim-drop 数量积满 maxDrops，
        // 导致 makeDrop 永远不再生成新雨滴（DOM 泄漏 + 雨停）。
        dropTimeoutIds.forEach(id => clearTimeout(id));
        dropTimeoutIds = [];
        if (svg) {
            const nodes = svg.querySelectorAll('.weather-anim-drop, .weather-anim-splash');
            nodes.forEach(node => node.parentNode && node.parentNode.removeChild(node));
        }
    }

    function init(options) {
        // 防止重复初始化
        if (isInitialized) return;
        isInitialized = true;

        const config = Object.assign({}, DEFAULTS, options || {});
        // 移动端降低雨滴密度
        maxDrops = (window.innerWidth < 768) ? Math.floor(config.maxDrops * 0.6) : config.maxDrops;
        svg = document.querySelector('.weather-anim-lightning-svg');
        if (!svg) {
            console.warn('[WeatherAnim] 未找到 .weather-anim-lightning-svg 元素，请检查 HTML 结构');
            return;
        }
        start();
    }

    function destroy() {
        stop();
        if (svg) {
            const drops = svg.querySelectorAll('.weather-anim-drop');
            drops.forEach(drop => drop.parentNode.removeChild(drop));
            const splashes = svg.querySelectorAll('.weather-anim-splash');
            splashes.forEach(splash => splash.parentNode.removeChild(splash));
        }
        isInitialized = false; // 允许重新初始化
    }

    // 页面可见性：隐藏时暂停生成，恢复时继续
    document.addEventListener('visibilitychange', () => {
        enabled = !document.hidden;
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    });

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    return {
        init: init,
        destroy: destroy,
        start: start,
        stop: stop
    };
})();
