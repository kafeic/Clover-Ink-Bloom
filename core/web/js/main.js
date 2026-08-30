/**
 * 墨花·文学茶话会 - 核心交互逻辑
 * Clover-Ink-Bloom
 * --作者：kafeic
 *
 */
document.addEventListener('DOMContentLoaded', () => {

    console.log("\n" +
        "                                          ====        ++++        \n" +
        "       @@@@@@@@@@@@@@@@@@@@@@@@@          @@@@.       @@@@        \n" +
        "       @@@@ =@@.  @@@#  %@% +@@@   :@@@@@@@@@@@@@@@@@@@@@@@@@@@@* \n" +
        "       @@@@  @@@+ @@@#.@@@= +@@@   :@@@@@@@@@@@@@@@@@@@@@@@@@@@@* \n" +
        "       @@@@@@@@@@@@@@@@@@@@@@@@@          @@@@.       @@@@        \n" +
        "                  @@@#                   -@@@@    @@@@            \n" +
        "       @@@@@@@@@@@@@@@@@@@@@@@@@%       @@@@@     @@@@    #@@@@   \n" +
        "                  @@@#                .@@@@%      @@@@ %@@@@@@#   \n" +
        "     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@   @@@@@@#      @@@@@@@@@#      \n" +
        "       @@@@  @@@@     @@@#  @@@@-  @@@@@@@@#   -@@@@@@@@=         \n" +
        "     *@@@@    @@@.@@@% @@*   +@@@%  @@% @@@#@@@@@@@@@@       @@+  \n" +
        "       @@@@@@@@@@@@@@@@@@@@@@@@@        @@@# %@@% @@@@      .@@@% \n" +
        "       ...........@@@%..........        @@@#      @@@@+     @@@@  \n" +
        "     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@:     @@@#      +@@@@@@@@@@@@%  \n" +
        "     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@:     @@@#        #@@@@@@@@*    ")
    console.log("欢迎来到「墨花·文学茶话会」！如果希望共建社区网站，请联系kafeic-邮箱:gclover777@163.com，有什么问题欢迎探讨！");
    console.log("version:0.0.1-rc20260830")

    // === 1. 雨滴背景效果 ===
    // 抽取为函数：支持 resize 重建与标签页隐藏暂停
    let rainyEngine = null;

    function initRainy() {
        const bgImage = document.getElementById('rainy-bg');
        if (!bgImage || typeof RainyDay === 'undefined') return;

        // 重建前销毁旧引擎，避免定时器/玻璃层泄漏
        if (rainyEngine) {
            rainyEngine.destroy();
            rainyEngine = null;
        }

        const startEngine = () => {
            try {
                const isMobile = window.innerWidth < 768;
                const engine = new RainyDay('rainy-canvas', 'rainy-bg', window.innerWidth, window.innerHeight);
                engine.trail = engine.TRAIL_DROPS;
                // 桌面端用高质量反射
                // 移动端用纯色填充（性能优先）
                engine.reflection = isMobile ? engine.REFLECTION_NONE : engine.REFLECTION_HQ;
                engine.gravity = engine.GRAVITY_SIMPLE;
                // 移动端减少雨量，桌面端维持原版密度
                const dropCount = isMobile ? 30 : 50;
                engine.rain([
                    engine.preset(0, 2, 0.88),
                    engine.preset(3, 3, 1)
                ], dropCount);
                rainyEngine = engine;
            } catch (e) {
                // file:// 等场景 canvas 被污染无法 getImageData，会走到这里：
                // 降级为无雨滴背景，不影响页面其它功能（HTTP 部署下正常）
                if (rainyEngine) { rainyEngine.destroy(); rainyEngine = null; }
                console.warn('[RainyDay] 雨滴背景初始化失败（file:// 下属正常现象），已降级。', e);
            }
        };

        if (bgImage.complete && bgImage.naturalWidth !== 0) {
            startEngine();
        } else {
            bgImage.onload = startEngine;
        }
    }

    initRainy();

    // 窗口 resize 防抖重建（F12 打开/关闭会触发 resize，需同步画布尺寸）
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initRainy, 300);
    }, { passive: true });

    // 标签页隐藏时暂停雨滴，恢复时重建
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rainyEngine) {
                rainyEngine.destroy();
                rainyEngine = null;
            }
        } else {
            initRainy();
        }
    });

    // === 2. 语言切换 ===
    const langBtn = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('mh-lang') || 'zh';

    let typeTimeout = null;
    let typeEpoch = 0; // 打字机"代际"：每次启动递增，用于作废被打断的旧打字链
    const typeTarget = document.getElementById('typewriter-target');

    function setLang(lang) {
        currentLang = lang;
        document.body.dataset.lang = lang;
        if (langBtn) langBtn.textContent = lang === 'zh' ? 'EN' : '中文';
        localStorage.setItem('mh-lang', lang);
        resetTypewriter();
    }

    function resetTypewriter() {
        if (typeTimeout) {
            clearTimeout(typeTimeout);
            typeTimeout = null;
        }
        startTypewriter();
    }

    setLang(currentLang);
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            setLang(currentLang === 'zh' ? 'en' : 'zh');
        });
    }

    // === 3. 主题切换 ===
    const themeBtn = document.getElementById('theme-toggle');
    let currentTheme = localStorage.getItem('mh-theme') || 'light';

    function setTheme(theme) {
        currentTheme = theme;
        document.body.dataset.theme = theme;
        if (themeBtn) themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('mh-theme', theme);
    }

    setTheme(currentTheme);
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            setTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    // === 4. 打字机效果 ===
    function startTypewriter() {
        typeEpoch++; // 作废旧打字链（含尚未启动的 rAF），防止并发/残留
        if (!typeTarget) return;

        const el = typeTarget.querySelector(`.t-${currentLang}`);
        if (!el) return;
        // 首次运行把完整原文保存到 data 属性：打字机会改写 el.textContent
        if (!el.dataset.typeText) el.dataset.typeText = el.textContent;
        const fullText = el.dataset.typeText;
        if (!fullText) return;

        // 清除上一轮所有定时器
        if (typeTimeout) {
            clearTimeout(typeTimeout);
            typeTimeout = null;
        }

        // 设置配置
        const TYPE_SPEED = 120;         // 打字速度（ms）
        const DELETE_SPEED = 60;        // 删除速度（ms）
        const PAUSE_AFTER_TYPE = 2600;  // 打完后停顿（ms）
        const PAUSE_AFTER_DELETE = 700; // 删完后停顿（ms）

        // 清空内容，准备从头开始打
        el.textContent = '';
        el.style.borderRight = '2px solid var(--accent-color)';
        el.style.animation = 'none';

        const myEpoch = typeEpoch; // 本次启动的代际
        let i = 0;
        let phase = 'typing'; // 'typing' | 'pausing' | 'deleting'

        function tick() {
            if (myEpoch !== typeEpoch) return; // 已被新的语言切换作废，停止
            if (phase === 'typing') {
                if (i < fullText.length) {
                    el.textContent += fullText.charAt(i);
                    i++;
                    typeTimeout = setTimeout(tick, TYPE_SPEED);
                } else {
                    phase = 'pausing';
                    typeTimeout = setTimeout(tick, PAUSE_AFTER_TYPE);
                }
            } else if (phase === 'pausing') {
                phase = 'deleting';
                typeTimeout = setTimeout(tick, 0);
            } else if (phase === 'deleting') {
                if (i > 0) {
                    i--;
                    el.textContent = fullText.substring(0, i);
                    typeTimeout = setTimeout(tick, DELETE_SPEED);
                } else {
                    phase = 'typing';
                    typeTimeout = setTimeout(tick, PAUSE_AFTER_DELETE);
                }
            }
        }

        requestAnimationFrame(() => {
            if (myEpoch !== typeEpoch) return; // rAF 前已被切走，不再启动
            typeTimeout = setTimeout(tick, TYPE_SPEED);
        });
    }

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `@keyframes blink { 50% { border-color: transparent; } }`;
    document.head.appendChild(styleSheet);
    startTypewriter();

    // === 5. 滚动显现 ===
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => observer.observe(el));

    // === 6. 导航栏滚动效果 ===
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        // 用 rAF 节流：scroll 事件高频触发（每秒可达数十上百次），每次直接改
        // style 会频繁触发重排/重绘；节流到每帧最多执行一次，滚动流畅度不变。
        let scrollThrottled = false;
        window.addEventListener('scroll', () => {
            if (scrollThrottled) return;
            scrollThrottled = true;
            requestAnimationFrame(() => {
                scrollThrottled = false;
                if (window.scrollY > 50) {
                    navbar.style.boxShadow = 'var(--shadow)';
                } else {
                    navbar.style.boxShadow = 'none';
                }
            });
        }, { passive: true });
    }

    // === 7. 移动端汉堡菜单 ===
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuOverlay = document.getElementById('mobile-menu-overlay');
    if (menuToggle && mobileMenu) {
        const setMenuOpen = (isOpen) => {
            mobileMenu.classList.toggle('open', isOpen);
            if (menuOverlay) menuOverlay.classList.toggle('open', isOpen);
            menuToggle.classList.toggle('active', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };
        const closeMenu = () => setMenuOpen(false);

        menuToggle.addEventListener('click', () => {
            setMenuOpen(!mobileMenu.classList.contains('open'));
        });
        // 点击菜单项后关闭
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
        // 点击遮罩关闭
        if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);
        // 按 Esc 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }
});
