var RENDERER = {
    POINT_INTERVAL : 5,
    FISH_COUNT : 3,
    MAX_INTERVAL_COUNT : 50,
    INIT_HEIGHT_RATE : 0.5,
    THRESHOLD : 50,

    init : function(){
        this.setParameters();
        this.reconstructMethods();
        this.setup();
        this.bindEvent();
        this.render();
    },
    /* 暂停/恢复 rAF 循环，标签页隐藏时停止消耗 CPU */
    pause : function(){
        this.paused = true;
        // 取消待执行的 rAF，避免恢复时与 resume() 的调度重复（双循环加速）
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },
    resume : function(){
        if (this.paused) {
            this.paused = false;
            this.render();
        }
    },
    setParameters : function(){
        this.$window = window;
        this.$document = document.body
        this.$container = document.getElementById('jsi-flying-fish-container');
        this.$canvas = document.createElement('canvas');
        this.$container.appendChild(this.$canvas)
        this.context = this.$canvas.getContext('2d');
        this.points = [];
        this.fishes = [];
        this.watchIds = [];
        // 用于追踪动画循环的状态
        this.animationId = null;
    },
    createSurfacePoints : function(){
        //小屏加大步长，减少采样点以降低 CPU 占用
        var step = (window.innerWidth < 768) ? this.POINT_INTERVAL * 2 : this.POINT_INTERVAL;
        var count = Math.round(this.width / step);
        this.pointInterval = this.width / (count - 1);
        this.points.push(new SURFACE_POINT(this, 0));

        for(var i = 1; i < count; i++){
            var point = new SURFACE_POINT(this, i * this.pointInterval),
                previous = this.points[i - 1];

            point.setPreviousPoint(previous);
            previous.setNextPoint(point);
            this.points.push(point);
        }
    },
    reconstructMethods : function(){
        this.watchWindowSize = this.watchWindowSize.bind(this);
        this.jdugeToStopResize = this.jdugeToStopResize.bind(this);
        this.startEpicenter = this.startEpicenter.bind(this);
        this.moveEpicenter = this.moveEpicenter.bind(this);
        this.reverseVertical = this.reverseVertical.bind(this);
        this.render = this.render.bind(this);
    },
    setup : function(){
        this.points.length = 0;
        this.fishes.length = 0;
        this.watchIds.length = 0;
        this.intervalCount = this.MAX_INTERVAL_COUNT;
        this.width = this.$container.offsetWidth;
        this.height = this.$container.offsetHeight;
        this.fishCount = this.FISH_COUNT * this.width / 500 * this.height / 500;
        this.$canvas.width = this.width;
        this.$canvas.height = this.height;
        this.reverse = false;

        this.fishes.push(new FISH(this));
        this.createSurfacePoints();
    },
    watchWindowSize : function(){
        this.clearTimer();
        this.tmpWidth = this.$window.innerWidth;
        this.tmpHeight = this.$window.innerHeight;
        this.watchIds.push(setTimeout(this.jdugeToStopResize, this.WATCH_INTERVAL));
    },
    clearTimer : function(){
        while(this.watchIds.length > 0){
            clearTimeout(this.watchIds.pop());
        }
    },
    jdugeToStopResize : function(){
        var width = this.$window.innerWidth,
            height = this.$window.innerHeight,
            stopped = (width == this.tmpWidth && height == this.tmpHeight);

        this.tmpWidth = width;
        this.tmpHeight = height;

        if(stopped){
            this.setup();
        }
    },
    bindEvent : function(){

        this.$window.onresize = this.watchWindowSize;
        // 鱼容器 z-index:-1 且被内容层覆盖，直接监听容器收不到鼠标事件，
        // 只在"水面"高度带内产生轻微波纹。
        this.$window.addEventListener('mousemove', function(self){
            return function(event){
                self.mouseRipple(event);
            };
        }(this), { passive: true });

        // 标签页隐藏时暂停渲染，恢复时继续
        document.addEventListener('visibilitychange', function(self){
            return function(){ document.hidden ? self.pause() : self.resume(); };
        }(this));

    },
    /* 鼠标靠近水面时产生轻微涟漪 */
    mouseRipple : function(event){
        var rect = this.$container.getBoundingClientRect();
        // 容器为 fixed 定位，直接用视口相对坐标（滚动不影响）
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var velocity = this.axis ? (y - this.axis.y) : 0;
        this.axis = { x : x, y : y };
        // 几乎没动就不打扰水面
        if (Math.abs(velocity) < 0.5) return;
        // 限制力度，保持"轻微的抖动"
        this.generateEpicenter(x, y, Math.max(-3, Math.min(3, velocity)));
    },
    getAxis : function(event){

        var offset = this.getOffset(this.$container);
        return {
            x : event.clientX - offset.left + this.$document.scrollLeft,
            y : event.clientY - offset.top + this.$document.scrollTop
        };
    },

    getOffset: function(Node, offset) {
        if (!offset) {
              offset = {};
              offset.top = 0;
              offset.left = 0;
        }
        if (Node == document.body) {
                //当该节点为body节点时，结束递归
                return offset;
         }
        offset.top += Node.offsetTop;    offset.left += Node.offsetLeft;
        return this.getOffset(Node.parentNode, offset);//向上累加offset里的值
    },
    startEpicenter : function(event){
        this.axis = this.getAxis(event);
    },
    moveEpicenter : function(event){
        var axis = this.getAxis(event);

        if(!this.axis){
            this.axis = axis;
        }
        this.generateEpicenter(axis.x, axis.y, axis.y - this.axis.y);
        this.axis = axis;
    },
    generateEpicenter : function(x, y, velocity){
        if(y < this.height / 2 - this.THRESHOLD || y > this.height / 2 + this.THRESHOLD){
            return;
        }
        var index = Math.round(x / this.pointInterval);

        if(index < 0 || index >= this.points.length){
            return;
        }
        this.points[index].interfere(y, velocity);
    },
    reverseVertical : function(){
        this.reverse = !this.reverse;

        for(var i = 0, count = this.fishes.length; i < count; i++){
            this.fishes[i].reverseVertical();
        }
    },
    controlStatus : function(){
        // 水面与鱼均用原始逐帧积分
        for(var i = 0, count = this.points.length; i < count; i++){
            this.points[i].updateSelf();
        }
        for(var i = 0, count = this.points.length; i < count; i++){
            this.points[i].updateNeighbors();
        }
        if(this.fishes.length < this.fishCount){
            if(--this.intervalCount == 0){
                this.intervalCount = this.MAX_INTERVAL_COUNT;
                this.fishes.push(new FISH(this));
            }
        }
    },
    render : function(){
        // 隐藏标签页时暂停，不再请求下一帧
        if (this.paused) {
            this.animationId = null; // 清空标记
            return;
        }
        // 每帧都重新调度下一帧
        this.animationId = requestAnimationFrame(this.render);
        this.controlStatus();
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.fillStyle = 'hsl(0, 0%, 95%)';

        for(var i = 0, count = this.fishes.length; i < count; i++){
            this.fishes[i].render(this.context);
        }
        // 原代码的 xor 部分替换为：
        this.context.save();
        this.context.beginPath();
        this.context.moveTo(0, this.reverse ? 0 : this.height);
        for(var i = 0, count = this.points.length; i < count; i++){
            this.points[i].render(this.context);
        }
        this.context.lineTo(this.width, this.reverse ? 0 : this.height);
        this.context.closePath();
        this.context.fillStyle = 'skyblue'; // 切换海洋的颜色 skyblue || SeaGreen || DarkMagenta
        this.context.fill();
        this.context.restore();

    }
};
var SURFACE_POINT = function(renderer, x){
    this.renderer = renderer;
    this.x = x;
    this.init();
};
SURFACE_POINT.prototype = {
    SPRING_CONSTANT : 0.03,
    SPRING_FRICTION : 0.9,
    WAVE_SPREAD : 0.3,
    ACCELARATION_RATE : 0.01,

    init : function(){
        this.initHeight = this.renderer.height * this.renderer.INIT_HEIGHT_RATE;
        this.height = this.initHeight;
        this.fy = 0;
        this.force = {previous : 0, next : 0};
    },
    setPreviousPoint : function(previous){
        this.previous = previous;
    },
    setNextPoint : function(next){
        this.next = next;
    },
    interfere : function(y, velocity){
        this.fy = this.renderer.height * this.ACCELARATION_RATE * ((this.renderer.height - this.height - y) >= 0 ? -1 : 1) * Math.abs(velocity);
    },
    updateSelf : function(){
        this.fy += this.SPRING_CONSTANT * (this.initHeight - this.height);
        this.fy *= this.SPRING_FRICTION;
        this.height += this.fy;
    },
    updateNeighbors : function(){
        if(this.previous){
            this.force.previous = this.WAVE_SPREAD * (this.height - this.previous.height);
        }
        if(this.next){
            this.force.next = this.WAVE_SPREAD * (this.height - this.next.height);
        }
    },
    render : function(context){
        if(this.previous){
            this.previous.height += this.force.previous;
            this.previous.fy += this.force.previous;
        }
        if(this.next){
            this.next.height += this.force.next;
            this.next.fy += this.force.next;
        }
        context.lineTo(this.x, this.renderer.height - this.height);
    }
};
var FISH = function(renderer){
    this.renderer = renderer;
    this.init();
};
FISH.prototype = {
    GRAVITY : 0.4,

    init : function(){
        this.direction = Math.random() < 0.5;
        this.x = this.direction ? (this.renderer.width + this.renderer.THRESHOLD) : -this.renderer.THRESHOLD;
        this.previousY = this.y;
        this.vx = this.getRandomValue(4, 6) * (this.direction ? -1 : 1);

        if(this.renderer.reverse){
            this.y = this.getRandomValue(this.renderer.height * 1 / 10, this.renderer.height * 4 / 10);
            this.vy = this.getRandomValue(2, 5);
            this.ay = this.getRandomValue(0.05, 0.2);
        }else{
            this.y = this.getRandomValue(this.renderer.height * 6 / 10, this.renderer.height * 9 / 10);
            this.vy = this.getRandomValue(-5, -2);
            this.ay = this.getRandomValue(-0.2, -0.05);
        }
        this.isOut = false;
        this.theta = 0;
        this.phi = 0;
    },
    getRandomValue : function(min, max){
        return min + (max - min) * Math.random();
    },
    reverseVertical : function(){
        this.isOut = !this.isOut;
        this.ay *= -1;
    },
    controlStatus : function(){
        this.previousY = this.y;
        // 逐帧物理：速度是固定值，不随时间累积
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.ay;

        if(this.renderer.reverse){
            if(this.y > this.renderer.height * this.renderer.INIT_HEIGHT_RATE){
                this.vy -= this.GRAVITY;
                this.isOut = true;
            }else{
                if(this.isOut){
                    this.ay = this.getRandomValue(0.05, 0.2);
                }
                this.isOut = false;
            }
        }else{
            if(this.y < this.renderer.height * this.renderer.INIT_HEIGHT_RATE){
                this.vy += this.GRAVITY;
                this.isOut = true;
            }else{
                if(this.isOut){
                    this.ay = this.getRandomValue(-0.2, -0.05);
                }
                this.isOut = false;
            }
        }
        if(!this.isOut){
            this.theta += Math.PI / 20;
            this.theta %= Math.PI * 2;
            this.phi += Math.PI / 30;
            this.phi %= Math.PI * 2;
        }
        this.renderer.generateEpicenter(this.x + (this.direction ? -1 : 1) * this.renderer.THRESHOLD, this.y, this.y - this.previousY);

        if(this.vx > 0 && this.x > this.renderer.width + this.renderer.THRESHOLD || this.vx < 0 && this.x < -this.renderer.THRESHOLD){
            this.init();
        }
    },

    render : function(context){

        // 鱼头
        context.save();
        context.translate(this.x, this.y);
        context.rotate(Math.PI + Math.atan2(this.vy, this.vx));
        context.scale(1, this.direction ? 1 : -1);
        context.beginPath();
        context.moveTo(-30, 0);
        context.bezierCurveTo(-20, 15, 15, 10, 40, 0);
        context.bezierCurveTo(15, -10, -20, -15, -30, 0);
        context.fill();

        // 鱼尾
        context.save();
        context.translate(40, 0);
        // context.scale(0.9 + 0.2 * Math.sin(this.theta), 1);
        // 1. 计算摆动幅度：由跳跃速度决定
        // 鱼向上跳时 vy 是负值，我们取反并乘以一个系数
        var swingAmplitude = -this.vy * 0.1;

        // 2. 限制最大摆动幅度，防止甩得太夸张，0.4为弧度
        var maxAmplitude = Math.min(swingAmplitude, 0.4);

        // 3. 计算摆动频率：使用已有的 this.theta 变量
        // this.theta 在鱼的代码中是持续增加的，作为动画计时器
        var swingFrequency = Math.sin(this.theta * 4); // 乘以4可以加快摆动频率

        // 4. 结合幅度和频率，得到最终的旋转角度
        // 最终角度 = 最大摆动幅度 * 摆动频率
        context.rotate(maxAmplitude * swingFrequency);

        context.beginPath();
        context.moveTo(0, 0);
        context.quadraticCurveTo(5, 10, 20, 8);
        context.quadraticCurveTo(12, 5, 10, 0);
        context.quadraticCurveTo(12, -5, 20, -8);
        context.quadraticCurveTo(5, -10, 0, 0);
        context.fill();
        context.restore();

        // 鱼鳍↓
        context.save();
        // 1. 计算动态摆动幅度：直接使用垂直速度 this.vy
        // 因为向上跳跃时 vy 是负值，所以用 -this.vy 转为正值，并乘以一个系数来调整灵敏度
        var swing = -this.vy * 0.2;
        // 2. 限制最大摆动角度，防止摆动过于夸张
        var maxSwing = Math.min(swing, 0.8);
        // 3. 应用新的旋转逻辑
        // 基础角度 (Math.PI / 3) + 动态摆动幅度 (maxSwing)
        var rotateAngle = (Math.PI / 3 + maxSwing) * (this.renderer.reverse ? -1 : 1);
        context.rotate(rotateAngle);
        context.beginPath();

        if(this.renderer.reverse){
            context.moveTo(5, 0);
            context.bezierCurveTo(10, 10, 10, 30, 0, 40);
            context.bezierCurveTo(-12, 25, -8, 10, 0, 0);
        }else{
            context.moveTo(-5, 0);
            context.bezierCurveTo(-10, -10, -10, -30, 0, -40);
            context.bezierCurveTo(12, -25, 8, -10, 0, 0);
        }
        context.closePath();
        context.fill();
        context.restore();
        context.restore();
        this.controlStatus();
        context.fillStyle = '#2F4F4F'; // 修改鱼颜色
    }
};