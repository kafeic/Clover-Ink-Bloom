/**
 * 黑胶唱片背景音乐播放器
 * ------------------------------------------------------------
 * - 曲目来自 assets/music/
 * - 曲单循环播放（一曲结束自动切下一首）
 * - **跨页面续播**：切换 index / ai 页面时，用 localStorage 保存
 * （曲目索引 + 播放进度 + 播放状态），新页面自动接续（含进度）。
 * - **自动播放**：页面加载即尝试播放（浏览器允许时）；若被自动播放
 * 策略拦截，则用户首次与页面交互（点击/按键，非播放器本身）时开始。
 * - 点击唱片 = 播放/暂停；唱针在播放时摆入。
 */
(function () {
    'use strict';
    // 曲目清单（文件名必须与 assets/music/ 下实际文件一致）
    var TRACKS = [
        { file: 'Luv Letter.mp3', name: 'Luv Letter' },
    ];
    var MUSIC_DIR = '../../assets/music/';
    var KEY_INDEX = 'mh-music-index';
    var KEY_PLAYING = 'mh-music-playing';
    var KEY_TIME = 'mh-music-time';
    var KEY_TIME_TS = 'mh-music-time-ts'; // 新增：进度时间戳
    var KEY_VOLUME = 'mh-music-volume';
    // ===== 音量设置 =====
    // 默认音量（0~1）
    // 用户通过播放器里的音量滑块调节后会记住（localStorage），下次以记住的为准。
    var DEFAULT_VOLUME = 0.35;
    var player = document.getElementById('vinyl-player');
    if (!player) return;
    var disc = document.getElementById('vinyl-disc');
    var playBtn = document.getElementById('vinyl-play');
    var prevBtn = document.getElementById('vinyl-prev');
    var nextBtn = document.getElementById('vinyl-next');
    var trackNameEl = document.getElementById('vinyl-track-name');
    var volumeSlider = document.getElementById('vinyl-volume');
    var index = parseInt(localStorage.getItem(KEY_INDEX) || '0', 10);
    if (isNaN(index) || index < 0 || index >= TRACKS.length) index = 0;

    // 读取进度时，同时读取时间戳进行校验
    var savedTime = 0;
    var savedTimeTs = parseInt(localStorage.getItem(KEY_TIME_TS) || '0', 10);
    var rawTime = parseFloat(localStorage.getItem(KEY_TIME) || '0');
    // 如果时间戳是新的（比如在过去5秒内），才采用保存的进度
    if (!isNaN(savedTimeTs) && !isNaN(rawTime) && (Date.now() - savedTimeTs < 5000)) {
        savedTime = rawTime;
    }
    if (isNaN(savedTime) || savedTime < 0) savedTime = 0;

    var audio = null;
    var isPlaying = false;
    var isTouch = window.matchMedia('(hover: none)').matches;
    var lastSave = 0;

    function currentTrack() {
        return TRACKS[index];
    }
    function trackUrl(track) {
        return MUSIC_DIR + encodeURIComponent(track.file);
    }
    /** 播放状态同步到 UI + 记忆播放状态（供跨页续播） */
    function setPlaying(state) {
        isPlaying = state;
        player.classList.toggle('playing', state);
        if (disc) disc.setAttribute('aria-pressed', state ? 'true' : 'false');
        if (playBtn) playBtn.textContent = state ? '⏸' : '▶';
        if (playBtn) playBtn.setAttribute('aria-label', state ? '暂停' : '播放');
        localStorage.setItem(KEY_PLAYING, state ? '1' : '0');
    }
    /** 保存播放进度（节流），用于跨页续播 */
    function saveTime() {
        if (!audio || isNaN(audio.currentTime)) return;
        localStorage.setItem(KEY_TIME, String(Math.floor(audio.currentTime)));
        localStorage.setItem(KEY_TIME_TS, String(Date.now())); // 新增：保存时间戳
    }
    /** 读取音量：localStorage 记录优先，否则用默认值 */
    function loadVolume() {
        var v = parseFloat(localStorage.getItem(KEY_VOLUME));
        if (isNaN(v)) v = DEFAULT_VOLUME;
        return Math.max(0, Math.min(1, v));
    }
    /** 装载当前曲目（不自动播放） */
    function loadTrack() {
        // 彻底销毁旧音频对象，防止内存泄漏
        if (audio) {
            audio.pause();
            audio.onended = audio.onloadedmetadata = audio.ontimeupdate = null;
            audio.src = '';
            audio.load();
            audio = null;
        }
        var track = currentTrack();
        audio = new Audio(trackUrl(track));
        audio.loop = false;
        audio.volume = loadVolume(); // 应用音量（默认或用户记忆值）
        audio.addEventListener('ended', function () {
            next();
        });
        audio.addEventListener('play', function () {
            setPlaying(true);
        });
        audio.addEventListener('pause', function () {
            setPlaying(false);
        });
        // 恢复上次进度
        audio.addEventListener('loadedmetadata', function () {
            if (savedTime > 0 && audio.duration && savedTime < audio.duration - 1) {
                try {
                    audio.currentTime = savedTime;
                } catch (e) { /* ignore */ }
            }
        });
        // 节流保存进度
        audio.addEventListener('timeupdate', function () {
            var now = Date.now();
            if (now - lastSave > 2000) {
                lastSave = now;
                saveTime();
            }
        });
        if (trackNameEl) trackNameEl.textContent = track.name;
        localStorage.setItem(KEY_INDEX, String(index));
        requestAnimationFrame(updateMarquee);
    }
    function updateMarquee() {
        if (!trackNameEl) return;
        var dist = trackNameEl.scrollWidth - trackNameEl.clientWidth;
        var overflowing = dist > 4;
        trackNameEl.classList.toggle('marquee', overflowing);
        if (overflowing) {
            // 负值：让文本在盒内向左滚动
            trackNameEl.style.setProperty('--marquee-dist', (-dist) + 'px');
        } else {
            trackNameEl.style.removeProperty('--marquee-dist');
        }
    }
    function play() {
        if (!audio) loadTrack();
        if (!audio) return;
        var p = audio.play();
        if (p && p.catch) {
            p.catch(function () {
                setPlaying(false);
            });
        } else {
            setPlaying(true);
        }
    }
    function pause() {
        if (audio) audio.pause();
        setPlaying(false);
    }
    function toggle() {
        if (audio && !audio.paused) pause();
        else play();
    }
    function next() {
        // 先记住状态：loadTrack 会触发旧音频 pause 事件覆盖 isPlaying
        var shouldPlay = isPlaying;
        index = (index + 1) % TRACKS.length;
        savedTime = 0;
        localStorage.setItem(KEY_TIME, '0');
        localStorage.setItem(KEY_TIME_TS, '0'); // 重置时间戳
        loadTrack();
        if (shouldPlay) play();
    }
    function prev() {
        var shouldPlay = isPlaying;
        index = (index - 1 + TRACKS.length) % TRACKS.length;
        savedTime = 0;
        localStorage.setItem(KEY_TIME, '0');
        localStorage.setItem(KEY_TIME_TS, '0'); // 重置时间戳
        loadTrack();
        if (shouldPlay) play();
    }
    // 切换页面（导航）前保存进度
    window.addEventListener('pagehide', saveTime);
    // ---- 事件绑定 ----
    if (disc) {
        disc.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
            // 触屏端同时展开面板
            if (isTouch) player.classList.add('panel-open');
        });
    }
    if (playBtn) playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle();
    });
    if (nextBtn) nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        next();
    });
    if (prevBtn) prevBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        prev();
    });
    // 音量滑块：实时调整并记忆（跨页/下次访问生效）
    if (volumeSlider) {
        volumeSlider.value = String(loadVolume());
        volumeSlider.addEventListener('input', function (e) {
            e.stopPropagation();
            var v = parseFloat(volumeSlider.value);
            if (isNaN(v)) v = DEFAULT_VOLUME;
            v = Math.max(0, Math.min(1, v));
            localStorage.setItem(KEY_VOLUME, String(v));
            if (audio) audio.volume = v;
        });
    }
    // 触屏端：点击播放器外部收起面板
    if (isTouch) {
        document.addEventListener('click', function (e) {
            if (!player.contains(e.target)) player.classList.remove('panel-open');
        });
    }
    // ---- 自动播放 ----
    // 1) 页面加载即尝试播放（浏览器允许时直接出声）
    loadTrack();
    try {
        play();
    } catch (e) { /* 忽略：等首次交互 */ }
    // 2) 被自动播放策略拦截时，等用户首次与页面交互再播放
    // （点击播放器本身交给播放器逻辑，避免重复切换）
    var onFirstInteraction = function (e) {
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
        window.removeEventListener('touchstart', onFirstInteraction);
        if (e && e.target && player.contains(e.target)) return;
        if (audio && audio.paused) play();
    };
    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);
    window.addEventListener('touchstart', onFirstInteraction);
})();
