/**
 * RainyDay.js - 雨滴玻璃特效核心逻辑
 * ------------------------------------------------------------
 */
(function () {
    'use strict';

    function RainyDay(canvasid, sourceid, width, height, opacity, blur) {
        this.canvasid = canvasid;
        this.canvas = document.getElementById(canvasid);
        this.sourceid = sourceid;
        this.img = document.getElementById(sourceid);

        this.prepareBackground(blur ? blur : 20, width, height);
        this.w = this.canvas.width;
        this.h = this.canvas.height;

        // 所有雨滴集中管理，由单一 rAF 循环驱动
        this.drops = [];

        this.prepareGlass(opacity ? opacity : 0.9);
        this.prepareMiniatures();

        // 运行时状态
        this.animationId = null;   // rAF 循环 ID（destroy 时统一取消）
        this.intervalId = null;    // 雨滴生成定时器 ID

        // 渲染/运动钩子，由 main.js 覆写
        this.gravity = null;
        this.trail = null;
        this.reflection = null;
    }

    /**
     * 绘制模糊背景：以容器实际渲染尺寸初始化 Canvas 缓冲区，
     */
    RainyDay.prototype.prepareBackground = function (blur, width, height) {
        var displayWidth = this.canvas.clientWidth || width || window.innerWidth;
        var displayHeight = this.canvas.clientHeight || height || window.innerHeight;

        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;

        var context = this.canvas.getContext('2d');
        context.clearRect(0, 0, displayWidth, displayHeight);
        context.drawImage(this.img, 0, 0, displayWidth, displayHeight);

        if (isNaN(blur) || blur < 1) return;
        this.stackBlurCanvasRGB(0, 0, displayWidth, displayHeight, blur);
    };

    /** stackBlur 原地高斯模糊 */
    RainyDay.prototype.stackBlurCanvasRGB = function (top_x, top_y, width, height, radius) {
        radius |= 0;

        var context = this.canvas.getContext('2d');
        var imageData = context.getImageData(top_x, top_y, width, height);
        var pixels = imageData.data;

        var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
            r_out_sum, g_out_sum, b_out_sum,
            r_in_sum, g_in_sum, b_in_sum,
            pr, pg, pb, rbs;

        var div = radius + radius + 1;
        var w4 = width << 2;
        var widthMinus1 = width - 1;
        var heightMinus1 = height - 1;
        var radiusPlus1 = radius + 1;
        var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

        var stackStart = new BlurStack();
        var stack = stackStart;
        for (i = 1; i < div; i++) {
            stack = stack.next = new BlurStack();
            if (i == radiusPlus1) var stackEnd = stack;
        }
        stack.next = stackStart;
        var stackIn = null;
        var stackOut = null;

        yw = yi = 0;
        var mul_sum = mul_table[radius];
        var shg_sum = shg_table[radius];

        for (y = 0; y < height; y++) {
            r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

            r_out_sum = radiusPlus1 * (pr = pixels[yi]);
            g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;

            stack = stackStart;

            for (i = 0; i < radiusPlus1; i++) {
                stack.r = pr;
                stack.g = pg;
                stack.b = pb;
                stack = stack.next;
            }

            for (i = 1; i < radiusPlus1; i++) {
                p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
                r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
                g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
                b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;

                r_in_sum += pr;
                g_in_sum += pg;
                b_in_sum += pb;

                stack = stack.next;
            }

            stackIn = stackStart;
            stackOut = stackEnd;
            for (x = 0; x < width; x++) {
                pixels[yi] = (r_sum * mul_sum) >> shg_sum;
                pixels[yi + 1] = (g_sum * mul_sum) >> shg_sum;
                pixels[yi + 2] = (b_sum * mul_sum) >> shg_sum;

                r_sum -= r_out_sum;
                g_sum -= g_out_sum;
                b_sum -= b_out_sum;

                r_out_sum -= stackIn.r;
                g_out_sum -= stackIn.g;
                b_out_sum -= stackIn.b;

                p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

                r_in_sum += (stackIn.r = pixels[p]);
                g_in_sum += (stackIn.g = pixels[p + 1]);
                b_in_sum += (stackIn.b = pixels[p + 2]);

                r_sum += r_in_sum;
                g_sum += g_in_sum;
                b_sum += b_in_sum;

                stackIn = stackIn.next;

                r_out_sum += (pr = stackOut.r);
                g_out_sum += (pg = stackOut.g);
                b_out_sum += (pb = stackOut.b);

                r_in_sum -= pr;
                g_in_sum -= pg;
                b_in_sum -= pb;

                stackOut = stackOut.next;

                yi += 4;
            }
            yw += width;
        }

        for (x = 0; x < width; x++) {
            g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

            yi = x << 2;
            r_out_sum = radiusPlus1 * (pr = pixels[yi]);
            g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;

            stack = stackStart;

            for (i = 0; i < radiusPlus1; i++) {
                stack.r = pr;
                stack.g = pg;
                stack.b = pb;
                stack = stack.next;
            }

            yp = width;

            for (i = 1; i <= radius; i++) {
                yi = (yp + x) << 2;

                r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
                g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
                b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;

                r_in_sum += pr;
                g_in_sum += pg;
                b_in_sum += pb;

                stack = stack.next;

                if (i < heightMinus1) {
                    yp += width;
                }
            }

            yi = x;
            stackIn = stackStart;
            stackOut = stackEnd;
            for (y = 0; y < height; y++) {
                p = yi << 2;
                pixels[p] = (r_sum * mul_sum) >> shg_sum;
                pixels[p + 1] = (g_sum * mul_sum) >> shg_sum;
                pixels[p + 2] = (b_sum * mul_sum) >> shg_sum;

                r_sum -= r_out_sum;
                g_sum -= g_out_sum;
                b_sum -= b_out_sum;

                r_out_sum -= stackIn.r;
                g_out_sum -= stackIn.g;
                b_out_sum -= stackIn.b;

                p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

                r_sum += (r_in_sum += (stackIn.r = pixels[p]));
                g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
                b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));

                stackIn = stackIn.next;

                r_out_sum += (pr = stackOut.r);
                g_out_sum += (pg = stackOut.g);
                b_out_sum += (pb = stackOut.b);

                r_in_sum -= pr;
                g_in_sum -= pg;
                b_in_sum -= pb;

                stackOut = stackOut.next;

                yi += width;
            }
        }

        context.putImageData(imageData, top_x, top_y);
    };

    /**
     * 创建"玻璃"覆盖层：透明 canvas 叠加在主画布之上，
     * 雨滴绘制在其上即可直接可见
     */
    RainyDay.prototype.prepareGlass = function (opacity) {
        this.glass = document.createElement('canvas');
        this.glass.width = this.canvas.width;
        this.glass.height = this.canvas.height;
        this.glass.style.position = 'absolute';
        this.glass.style.top = '0';
        this.glass.style.left = '0';
        this.glass.style.width = '100%';
        this.glass.style.height = '100%';
        this.glass.style.pointerEvents = 'none'; // 不遮挡交互
        this.glass.style.opacity = opacity;
        this.context = this.glass.getContext('2d');
        // 与主画布同层挂载（#rainy-container 的 z-index 为 -1，不会盖住内容）
        if (this.canvas.parentNode) {
            this.canvas.parentNode.appendChild(this.glass);
        }
    };

    /** 生成倒置缩略图，用于雨滴的镜面反射效果 */
    RainyDay.prototype.prepareMiniatures = function () {
        this.mini = document.createElement('canvas');
        this.mini.width = Math.max(1, Math.floor(this.canvas.width / 2));
        this.mini.height = Math.max(1, Math.floor(this.canvas.height / 2));
        var miniContext = this.mini.getContext('2d');
        miniContext.translate(this.mini.width / 2, this.mini.height / 2);
        miniContext.rotate(Math.PI);
        miniContext.drawImage(this.img, -this.mini.width / 2, -this.mini.height / 2, this.mini.width, this.mini.height);
    };

    /**
     * 开始下雨：speed > 0 时按该毫秒间隔持续生成雨滴
     * main.js 传入 30/50 即每 30/50ms 生成一滴）；speed <= 0 时一次性生成。
     */
    RainyDay.prototype.rain = function (presets, speed) {
        if (speed > 0) {
            this.presets = presets;
            var self = this;
            this.intervalId = setInterval(function () {
                var random = Math.random();
                var preset = null;
                for (var i = 0; i < presets.length; i++) {
                    if (random < presets[i].quan) {
                        preset = presets[i];
                        break;
                    }
                }
                if (preset) {
                    self.putDrop(new Drop(self, Math.random() * self.w, Math.random() * self.h, preset.min, preset.base));
                }
            }, speed);
            this.startAnimation();
        } else {
            for (var i = 0; i < presets.length; i++) {
                var preset = presets[i];
                for (var c = 0; c < preset.quan; ++c) {
                    this.putDrop(new Drop(this, Math.random() * this.w, Math.random() * this.h, preset.min, preset.base));
                }
            }
        }
    };

    /** 生成一滴雨：绘制到玻璃层并登记到统一管理数组 */
    RainyDay.prototype.putDrop = function (drop) {
        drop.draw();
        this.drops.push(drop);
        this.startAnimation();
    };

    /** 单一 rAF 动画循环：统一推进所有雨滴（替换原每滴一个 setInterval） */
    RainyDay.prototype.startAnimation = function () {
        // 已运行或未配置重力（纯静态图）则不重复启动
        if (this.animationId || !this.gravity) return;
        var self = this;
        function step() {
            for (var i = self.drops.length - 1; i >= 0; i--) {
                if (self.advanceDrop(self.drops[i])) {
                    self.drops.splice(i, 1); // 落地/出界后移除，防止数组无限增长
                }
            }
            // 无雨滴且不再生成时停止循环，避免 rAF 空转耗电（连续模式下定时器仍在，会持续生成）
            if (self.drops.length === 0 && !self.intervalId) {
                self.animationId = null;
                return;
            }
            self.animationId = requestAnimationFrame(step);
        }
        step();
    };

    /** 推进单滴雨：应用重力；未结束时生成尾迹；返回 true 表示该滴已结束 */
    RainyDay.prototype.advanceDrop = function (drop) {
        if (!this.gravity) return false;
        var stopped = this.gravity(drop);
        if (!stopped && this.trail) {
            this.trail(drop);
        }
        return stopped;
    };

    /**
     * 销毁引擎：停止生成定时器与 rAF 循环，清空雨滴数组，
     */
    RainyDay.prototype.destroy = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.drops.length = 0;
        if (this.glass && this.glass.parentNode) {
            this.glass.parentNode.removeChild(this.glass);
            this.glass = null;
            this.context = null;
        }
        if (this.canvas) {
            var ctx = this.canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    /** 预设参数（min：最小半径，base：随机半径增量，quan：累计概率） */
    RainyDay.prototype.preset = function (min, base, quan) {
        return { 'min': min, 'base': base, 'quan': quan };
    };

    /** 生成水滴的随机不规则轮廓（5 次迭代中点位移） */
    RainyDay.prototype.getLinepoints = function (iterations) {
        var pointList = {};
        pointList.first = { x: 0, y: 1 };
        var lastPoint = { x: 1, y: 1 };
        var minY = 1;
        var maxY = 1;
        var point, nextPoint;
        var dx, newX, newY;

        pointList.first.next = lastPoint;
        for (var i = 0; i < iterations; i++) {
            point = pointList.first;
            while (point.next != null) {
                nextPoint = point.next;
                dx = nextPoint.x - point.x;
                newX = 0.5 * (point.x + nextPoint.x);
                newY = 0.5 * (point.y + nextPoint.y);
                newY += dx * (Math.random() * 2 - 1);

                var newPoint = { x: newX, y: newY };
                if (newY < minY) {
                    minY = newY;
                } else if (newY > maxY) {
                    maxY = newY;
                }

                newPoint.next = nextPoint;
                point.next = newPoint;
                point = nextPoint;
            }
        }

        // 归一化到 0~1
        if (maxY != minY) {
            var normalizeRate = 1 / (maxY - minY);
            point = pointList.first;
            while (point != null) {
                point.y = normalizeRate * (point.y - minY);
                point = point.next;
            }
        } else {
            point = pointList.first;
            while (point != null) {
                point.y = 1;
                point = point.next;
            }
        }

        return pointList;
    };

    // ===== 雨滴 =====

    function Drop(rainyday, centerX, centerY, min, base) {
        this.x = Math.floor(centerX);
        this.y = Math.floor(centerY);
        this.r1 = (Math.random() * base) + min;
        this.rainyday = rainyday;
        var iterations = 5;
        this.r2 = 0.88 * this.r1;
        this.linepoints = rainyday.getLinepoints(iterations);
        this.context = rainyday.context;
        this.mini = rainyday.mini;
    }

    /** 按随机轮廓绘制一滴雨（裁剪 + 反射/纯色填充） */
    Drop.prototype.draw = function () {
        var phase = 0;
        var point;
        var rad, theta;
        var x0, y0;

        this.context.save();
        this.context.beginPath();
        point = this.linepoints.first;
        theta = phase;
        rad = this.r2 + point.y * (this.r1 - this.r2);
        x0 = this.x + rad * Math.cos(theta);
        y0 = this.y + rad * Math.sin(theta);
        this.context.lineTo(x0, y0);
        while (point.next != null) {
            point = point.next;
            theta = (Math.PI * 2 * point.x) + phase;
            rad = this.r2 + point.y * (this.r1 - this.r2);
            x0 = this.x + rad * Math.cos(theta);
            y0 = this.y + rad * Math.sin(theta);
            this.context.lineTo(x0, y0);
        }
        this.context.clip();

        if (this.rainyday.reflection) {
            this.rainyday.reflection(this);
        }
        this.context.restore();
    };

    // ===== 运动 / 尾迹 / 反射钩子（main.js 会挂载到实例上） =====

    /**
     * 简单重力：向下加速；雨滴小于阈值或落出底部时返回 true（结束）。
     * 每帧先擦除自身旧位置，再移动重绘——玻璃层会保留落定的小水滴。
     */
    RainyDay.prototype.GRAVITY_SIMPLE = function (drop) {
        if (drop.r1 < 3) {
            // 立即从数组移除，不占遍历开销
            // 延迟 5 秒后再擦除画布上的像素
            var ctx = this.context;
            var x = drop.x - drop.r1 - 1;
            var y = drop.y - drop.r1 - 1;
            var w = 2 * drop.r1 + 2;
            var h = 2 * drop.r1 + 2;
            setTimeout(function () {
                ctx.clearRect(x, y, w, h);
            }, 5000); // 5秒后逐渐消失
            return true;
        }


        this.context.clearRect(drop.x - drop.r1 - 1, drop.y - drop.r1 - 1, 2 * drop.r1 + 2, 2 * drop.r1 + 2);
        if (drop.y - drop.r1 > this.glass.height) {
            return true;
        }
        if (drop.speed) {
            drop.speed += 0.005 * Math.floor(drop.r1);
        } else {
            drop.speed = 0.1;
        }
        drop.y += drop.speed;
        drop.draw();
        return false;
    };

    /** 尾迹：大滴下落途中不断甩出小滴 */
    RainyDay.prototype.TRAIL_DROPS = function (drop) {
        if (!drop.trail_y || drop.y - drop.trail_y >= Math.random() * 10 * drop.r1) {
            drop.trail_y = drop.y;
            this.putDrop(new Drop(this, drop.x, drop.y - drop.r1 - 5, 0, Math.ceil(drop.r1 / 5)));
        }
    };

    /** 无反射：纯色填充（移动端性能优先） */
    RainyDay.prototype.REFLECTION_NONE = function (drop) {
        this.context.fillStyle = '#8ED6FF';
        this.context.fill();
    };

    /** 高质量反射：截取倒置缩略图填充水滴内部 */
    RainyDay.prototype.REFLECTION_HQ = function (drop) {
        var mx = (drop.x * this.mini.width) / this.glass.width;
        var my = (drop.y * this.mini.height) / this.glass.height;
        var mw = drop.r1 * 10;
        var mh = drop.r1 * 10;
        this.context.drawImage(this.mini,
            (mx - mw) < 0 ? 0 : (mx - mw), (my - mh) < 0 ? 0 : (my - mh),
            mw * 2, mh * 2,
            drop.x - drop.r1, drop.y - drop.r1,
            2 * drop.r1, 2 * drop.r1);
    };

    // ===== stackBlur 查询表与辅助结构（与原版一致） =====

    var mul_table = [
        512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
        454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
        482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
        437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
        497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
        320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
        446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
        329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
        505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
        399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
        324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
        268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
        451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
        385, 381, 377, 374, 370, 367, 363, 360, 357, 353, 350, 347, 344, 341, 338, 335,
        332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
        289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259];

    var shg_table = [
        9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
        17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
        19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
        20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24];

    function BlurStack() {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.a = 0;
        this.next = null;
    }

    window.RainyDay = RainyDay;
})();
