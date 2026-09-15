const version = "1.3.17";
import { Animate } from './animate.js';
import { Dimensions } from './dimensions.js';
import { Emitter } from './emitter.js';
import { clamp, modulo } from './maths.js';
import { VirtualScroll } from './virtual-scroll.js';
const defaultEasing = (t)=>Math.min(1, 1.001 - Math.pow(2, -10 * t));
export class Lenis {
    _isScrolling = false;
    _isStopped = false;
    _isLocked = false;
    _preventNextNativeScrollEvent = false;
    _resetVelocityTimeout = null;
    _rafId = null;
    isTouching;
    time = 0;
    userData = {};
    lastVelocity = 0;
    velocity = 0;
    direction = 0;
    options;
    targetScroll;
    animatedScroll;
    animate = new Animate();
    emitter = new Emitter();
    dimensions;
    virtualScroll;
    constructor({ wrapper = window, content = document.documentElement, eventsTarget = wrapper, smoothWheel = true, syncTouch = false, syncTouchLerp = 0.075, touchInertiaExponent = 1.7, duration, easing, lerp = 0.1, infinite = false, orientation = 'vertical', gestureOrientation = orientation === 'horizontal' ? 'both' : 'vertical', touchMultiplier = 1, wheelMultiplier = 1, autoResize = true, prevent, virtualScroll, overscroll = true, autoRaf = false, anchors = false, autoToggle = false, allowNestedScroll = false, __experimental__naiveDimensions = false, naiveDimensions = __experimental__naiveDimensions, stopInertiaOnNavigate = false } = {}){
        window.lenisVersion = version;
        if (!wrapper || wrapper === document.documentElement) {
            wrapper = window;
        }
        if (typeof duration === 'number' && typeof easing !== 'function') {
            easing = defaultEasing;
        } else if (typeof easing === 'function' && typeof duration !== 'number') {
            duration = 1;
        }
        this.options = {
            wrapper,
            content,
            eventsTarget,
            smoothWheel,
            syncTouch,
            syncTouchLerp,
            touchInertiaExponent,
            duration,
            easing,
            lerp,
            infinite,
            gestureOrientation,
            orientation,
            touchMultiplier,
            wheelMultiplier,
            autoResize,
            prevent,
            virtualScroll,
            overscroll,
            autoRaf,
            anchors,
            autoToggle,
            allowNestedScroll,
            naiveDimensions,
            stopInertiaOnNavigate
        };
        this.dimensions = new Dimensions(wrapper, content, {
            autoResize
        });
        this.updateClassName();
        this.targetScroll = this.animatedScroll = this.actualScroll;
        this.options.wrapper.addEventListener('scroll', this.onNativeScroll, false);
        this.options.wrapper.addEventListener('scrollend', this.onScrollEnd, {
            capture: true
        });
        if (this.options.anchors || this.options.stopInertiaOnNavigate) {
            this.options.wrapper.addEventListener('click', this.onClick, false);
        }
        this.options.wrapper.addEventListener('pointerdown', this.onPointerDown, false);
        this.virtualScroll = new VirtualScroll(eventsTarget, {
            touchMultiplier,
            wheelMultiplier
        });
        this.virtualScroll.on('scroll', this.onVirtualScroll);
        if (this.options.autoToggle) {
            this.checkOverflow();
            this.rootElement.addEventListener('transitionend', this.onTransitionEnd, {
                passive: true
            });
        }
        if (this.options.autoRaf) {
            this._rafId = requestAnimationFrame(this.raf);
        }
    }
    destroy() {
        this.emitter.destroy();
        this.options.wrapper.removeEventListener('scroll', this.onNativeScroll, false);
        this.options.wrapper.removeEventListener('scrollend', this.onScrollEnd, {
            capture: true
        });
        this.options.wrapper.removeEventListener('pointerdown', this.onPointerDown, false);
        if (this.options.anchors || this.options.stopInertiaOnNavigate) {
            this.options.wrapper.removeEventListener('click', this.onClick, false);
        }
        this.virtualScroll.destroy();
        this.dimensions.destroy();
        this.cleanUpClassName();
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }
    }
    on(event, callback) {
        return this.emitter.on(event, callback);
    }
    off(event, callback) {
        return this.emitter.off(event, callback);
    }
    onScrollEnd = (e)=>{
        if (!(e instanceof CustomEvent)) {
            if (this.isScrolling === 'smooth' || this.isScrolling === false) {
                e.stopPropagation();
            }
        }
    };
    dispatchScrollendEvent = ()=>{
        this.options.wrapper.dispatchEvent(new CustomEvent('scrollend', {
            bubbles: this.options.wrapper === window,
            detail: {
                lenisScrollEnd: true
            }
        }));
    };
    get overflow() {
        const property = this.isHorizontal ? 'overflow-x' : 'overflow-y';
        return getComputedStyle(this.rootElement)[property];
    }
    checkOverflow() {
        if ([
            'hidden',
            'clip'
        ].includes(this.overflow)) {
            this.internalStop();
        } else {
            this.internalStart();
        }
    }
    onTransitionEnd = (event)=>{
        if (event.propertyName.includes('overflow')) {
            this.checkOverflow();
        }
    };
    setScroll(scroll) {
        if (this.isHorizontal) {
            this.options.wrapper.scrollTo({
                left: scroll,
                behavior: 'instant'
            });
        } else {
            this.options.wrapper.scrollTo({
                top: scroll,
                behavior: 'instant'
            });
        }
    }
    onClick = (event)=>{
        const path = event.composedPath();
        const anchorElements = path.filter((node)=>node instanceof HTMLAnchorElement && node.getAttribute('href'));
        if (this.options.anchors) {
            const anchor = anchorElements.find((node)=>node.getAttribute('href')?.includes('#'));
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href) {
                    const options = typeof this.options.anchors === 'object' && this.options.anchors ? this.options.anchors : undefined;
                    const target = `#${href.split('#')[1]}`;
                    this.scrollTo(target, options);
                }
            }
        }
        if (this.options.stopInertiaOnNavigate) {
            const internalLink = anchorElements.find((node)=>node.host === window.location.host);
            if (internalLink) {
                this.reset();
            }
        }
    };
    onPointerDown = (event)=>{
        if (event.button === 1) {
            this.reset();
        }
    };
    onVirtualScroll = (data)=>{
        if (typeof this.options.virtualScroll === 'function' && this.options.virtualScroll(data) === false) return;
        const { deltaX, deltaY, event } = data;
        this.emitter.emit('virtual-scroll', {
            deltaX,
            deltaY,
            event
        });
        if (event.ctrlKey) return;
        if (event.lenisStopPropagation) return;
        const isTouch = event.type.includes('touch');
        const isWheel = event.type.includes('wheel');
        this.isTouching = event.type === 'touchstart' || event.type === 'touchmove';
        const isClickOrTap = deltaX === 0 && deltaY === 0;
        const isTapToStop = this.options.syncTouch && isTouch && event.type === 'touchstart' && isClickOrTap && !this.isStopped && !this.isLocked;
        if (isTapToStop) {
            this.reset();
            return;
        }
        const isUnknownGesture = this.options.gestureOrientation === 'vertical' && deltaY === 0 || this.options.gestureOrientation === 'horizontal' && deltaX === 0;
        if (isClickOrTap || isUnknownGesture) {
            return;
        }
        let composedPath = event.composedPath();
        composedPath = composedPath.slice(0, composedPath.indexOf(this.rootElement));
        const prevent = this.options.prevent;
        if (!!composedPath.find((node)=>node instanceof HTMLElement && (typeof prevent === 'function' && prevent?.(node) || node.hasAttribute?.('data-lenis-prevent') || isTouch && node.hasAttribute?.('data-lenis-prevent-touch') || isWheel && node.hasAttribute?.('data-lenis-prevent-wheel') || this.options.allowNestedScroll && this.checkNestedScroll(node, {
                deltaX,
                deltaY
            })))) return;
        if (this.isStopped || this.isLocked) {
            if (event.cancelable) {
                event.preventDefault();
            }
            return;
        }
        const isSmooth = this.options.syncTouch && isTouch || this.options.smoothWheel && isWheel;
        if (!isSmooth) {
            this.isScrolling = 'native';
            this.animate.stop();
            event.lenisStopPropagation = true;
            return;
        }
        let delta = deltaY;
        if (this.options.gestureOrientation === 'both') {
            delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
        } else if (this.options.gestureOrientation === 'horizontal') {
            delta = deltaX;
        }
        if (!this.options.overscroll || this.options.infinite || this.options.wrapper !== window && this.limit > 0 && (this.animatedScroll > 0 && this.animatedScroll < this.limit || this.animatedScroll === 0 && deltaY > 0 || this.animatedScroll === this.limit && deltaY < 0)) {
            event.lenisStopPropagation = true;
        }
        if (event.cancelable) {
            event.preventDefault();
        }
        const isSyncTouch = isTouch && this.options.syncTouch;
        const isTouchEnd = isTouch && event.type === 'touchend';
        const hasTouchInertia = isTouchEnd;
        if (hasTouchInertia) {
            delta = Math.sign(this.velocity) * Math.pow(Math.abs(this.velocity), this.options.touchInertiaExponent);
        }
        this.scrollTo(this.targetScroll + delta, {
            programmatic: false,
            ...isSyncTouch ? {
                lerp: hasTouchInertia ? this.options.syncTouchLerp : 1
            } : {
                lerp: this.options.lerp,
                duration: this.options.duration,
                easing: this.options.easing
            }
        });
    };
    resize() {
        this.dimensions.resize();
        this.animatedScroll = this.targetScroll = this.actualScroll;
        this.emit();
    }
    emit() {
        this.emitter.emit('scroll', this);
    }
    onNativeScroll = ()=>{
        if (this._resetVelocityTimeout !== null) {
            clearTimeout(this._resetVelocityTimeout);
            this._resetVelocityTimeout = null;
        }
        if (this._preventNextNativeScrollEvent) {
            this._preventNextNativeScrollEvent = false;
            return;
        }
        if (this.isScrolling === false || this.isScrolling === 'native') {
            const lastScroll = this.animatedScroll;
            this.animatedScroll = this.targetScroll = this.actualScroll;
            this.lastVelocity = this.velocity;
            this.velocity = this.animatedScroll - lastScroll;
            this.direction = Math.sign(this.animatedScroll - lastScroll);
            if (!this.isStopped) {
                this.isScrolling = 'native';
            }
            this.emit();
            if (this.velocity !== 0) {
                this._resetVelocityTimeout = setTimeout(()=>{
                    this.lastVelocity = this.velocity;
                    this.velocity = 0;
                    this.isScrolling = false;
                    this.emit();
                }, 400);
            }
        }
    };
    reset() {
        this.isLocked = false;
        this.isScrolling = false;
        this.animatedScroll = this.targetScroll = this.actualScroll;
        this.lastVelocity = this.velocity = 0;
        this.animate.stop();
    }
    start() {
        if (!this.isStopped) return;
        if (this.options.autoToggle) {
            this.rootElement.style.removeProperty('overflow');
            return;
        }
        this.internalStart();
    }
    internalStart() {
        if (!this.isStopped) return;
        this.reset();
        this.isStopped = false;
        this.emit();
    }
    stop() {
        if (this.isStopped) return;
        if (this.options.autoToggle) {
            this.rootElement.style.setProperty('overflow', 'clip');
            return;
        }
        this.internalStop();
    }
    internalStop() {
        if (this.isStopped) return;
        this.reset();
        this.isStopped = true;
        this.emit();
    }
    raf = (time)=>{
        const deltaTime = time - (this.time || time);
        this.time = time;
        this.animate.advance(deltaTime * 0.001);
        if (this.options.autoRaf) {
            this._rafId = requestAnimationFrame(this.raf);
        }
    };
    scrollTo(target, { offset = 0, immediate = false, lock = false, programmatic = true, lerp = programmatic ? this.options.lerp : undefined, duration = programmatic ? this.options.duration : undefined, easing = programmatic ? this.options.easing : undefined, onStart, onComplete, force = false, userData } = {}) {
        if ((this.isStopped || this.isLocked) && !force) return;
        if (typeof target === 'string' && [
            'top',
            'left',
            'start',
            '#'
        ].includes(target)) {
            target = 0;
        } else if (typeof target === 'string' && [
            'bottom',
            'right',
            'end'
        ].includes(target)) {
            target = this.limit;
        } else {
            let node;
            if (typeof target === 'string') {
                node = document.querySelector(target);
                if (!node) {
                    if (target === '#top') {
                        target = 0;
                    } else {
                        console.warn('Lenis: Target not found', target);
                    }
                }
            } else if (target instanceof HTMLElement && target?.nodeType) {
                node = target;
            }
            if (node) {
                if (this.options.wrapper !== window) {
                    const wrapperRect = this.rootElement.getBoundingClientRect();
                    offset -= this.isHorizontal ? wrapperRect.left : wrapperRect.top;
                }
                const rect = node.getBoundingClientRect();
                target = (this.isHorizontal ? rect.left : rect.top) + this.animatedScroll;
            }
        }
        if (typeof target !== 'number') return;
        target += offset;
        target = Math.round(target);
        if (this.options.infinite) {
            if (programmatic) {
                this.targetScroll = this.animatedScroll = this.scroll;
                const distance = target - this.animatedScroll;
                if (distance > this.limit / 2) {
                    target = target - this.limit;
                } else if (distance < -this.limit / 2) {
                    target = target + this.limit;
                }
            }
        } else {
            target = clamp(0, target, this.limit);
        }
        if (target === this.targetScroll) {
            onStart?.(this);
            onComplete?.(this);
            return;
        }
        this.userData = userData ?? {};
        if (immediate) {
            this.animatedScroll = this.targetScroll = target;
            this.setScroll(this.scroll);
            this.reset();
            this.preventNextNativeScrollEvent();
            this.emit();
            onComplete?.(this);
            this.userData = {};
            requestAnimationFrame(()=>{
                this.dispatchScrollendEvent();
            });
            return;
        }
        if (!programmatic) {
            this.targetScroll = target;
        }
        if (typeof duration === 'number' && typeof easing !== 'function') {
            easing = defaultEasing;
        } else if (typeof easing === 'function' && typeof duration !== 'number') {
            duration = 1;
        }
        this.animate.fromTo(this.animatedScroll, target, {
            duration,
            easing,
            lerp,
            onStart: ()=>{
                if (lock) this.isLocked = true;
                this.isScrolling = 'smooth';
                onStart?.(this);
            },
            onUpdate: (value, completed)=>{
                this.isScrolling = 'smooth';
                this.lastVelocity = this.velocity;
                this.velocity = value - this.animatedScroll;
                this.direction = Math.sign(this.velocity);
                this.animatedScroll = value;
                this.setScroll(this.scroll);
                if (programmatic) {
                    this.targetScroll = value;
                }
                if (!completed) this.emit();
                if (completed) {
                    this.reset();
                    this.emit();
                    onComplete?.(this);
                    this.userData = {};
                    requestAnimationFrame(()=>{
                        this.dispatchScrollendEvent();
                    });
                    this.preventNextNativeScrollEvent();
                }
            }
        });
    }
    preventNextNativeScrollEvent() {
        this._preventNextNativeScrollEvent = true;
        requestAnimationFrame(()=>{
            this._preventNextNativeScrollEvent = false;
        });
    }
    checkNestedScroll(node, { deltaX, deltaY }) {
        const time = Date.now();
        const cache = node._lenis ??= {};
        let hasOverflowX, hasOverflowY, isScrollableX, isScrollableY, scrollWidth, scrollHeight, clientWidth, clientHeight;
        const gestureOrientation = this.options.gestureOrientation;
        if (time - (cache.time ?? 0) > 2000) {
            cache.time = Date.now();
            const computedStyle = window.getComputedStyle(node);
            cache.computedStyle = computedStyle;
            const overflowXString = computedStyle.overflowX;
            const overflowYString = computedStyle.overflowY;
            hasOverflowX = [
                'auto',
                'overlay',
                'scroll'
            ].includes(overflowXString);
            hasOverflowY = [
                'auto',
                'overlay',
                'scroll'
            ].includes(overflowYString);
            cache.hasOverflowX = hasOverflowX;
            cache.hasOverflowY = hasOverflowY;
            if (!hasOverflowX && !hasOverflowY) return false;
            if (gestureOrientation === 'vertical' && !hasOverflowY) return false;
            if (gestureOrientation === 'horizontal' && !hasOverflowX) return false;
            scrollWidth = node.scrollWidth;
            scrollHeight = node.scrollHeight;
            clientWidth = node.clientWidth;
            clientHeight = node.clientHeight;
            isScrollableX = scrollWidth > clientWidth;
            isScrollableY = scrollHeight > clientHeight;
            cache.isScrollableX = isScrollableX;
            cache.isScrollableY = isScrollableY;
            cache.scrollWidth = scrollWidth;
            cache.scrollHeight = scrollHeight;
            cache.clientWidth = clientWidth;
            cache.clientHeight = clientHeight;
        } else {
            isScrollableX = cache.isScrollableX;
            isScrollableY = cache.isScrollableY;
            hasOverflowX = cache.hasOverflowX;
            hasOverflowY = cache.hasOverflowY;
            scrollWidth = cache.scrollWidth;
            scrollHeight = cache.scrollHeight;
            clientWidth = cache.clientWidth;
            clientHeight = cache.clientHeight;
        }
        if (!hasOverflowX && !hasOverflowY || !isScrollableX && !isScrollableY) {
            return false;
        }
        if (gestureOrientation === 'vertical' && (!hasOverflowY || !isScrollableY)) return false;
        if (gestureOrientation === 'horizontal' && (!hasOverflowX || !isScrollableX)) return false;
        let orientation;
        if (gestureOrientation === 'horizontal') {
            orientation = 'x';
        } else if (gestureOrientation === 'vertical') {
            orientation = 'y';
        } else {
            const isScrollingX = deltaX !== 0;
            const isScrollingY = deltaY !== 0;
            if (isScrollingX && hasOverflowX && isScrollableX) {
                orientation = 'x';
            }
            if (isScrollingY && hasOverflowY && isScrollableY) {
                orientation = 'y';
            }
        }
        if (!orientation) return false;
        let scroll, maxScroll, delta, hasOverflow, isScrollable;
        if (orientation === 'x') {
            scroll = node.scrollLeft;
            maxScroll = scrollWidth - clientWidth;
            delta = deltaX;
            hasOverflow = hasOverflowX;
            isScrollable = isScrollableX;
        } else if (orientation === 'y') {
            scroll = node.scrollTop;
            maxScroll = scrollHeight - clientHeight;
            delta = deltaY;
            hasOverflow = hasOverflowY;
            isScrollable = isScrollableY;
        } else {
            return false;
        }
        const willScroll = delta > 0 ? scroll < maxScroll : scroll > 0;
        return willScroll && hasOverflow && isScrollable;
    }
    get rootElement() {
        return this.options.wrapper === window ? document.documentElement : this.options.wrapper;
    }
    get limit() {
        if (this.options.naiveDimensions) {
            if (this.isHorizontal) {
                return this.rootElement.scrollWidth - this.rootElement.clientWidth;
            } else {
                return this.rootElement.scrollHeight - this.rootElement.clientHeight;
            }
        } else {
            return this.dimensions.limit[this.isHorizontal ? 'x' : 'y'];
        }
    }
    get isHorizontal() {
        return this.options.orientation === 'horizontal';
    }
    get actualScroll() {
        const wrapper = this.options.wrapper;
        return this.isHorizontal ? wrapper.scrollX ?? wrapper.scrollLeft : wrapper.scrollY ?? wrapper.scrollTop;
    }
    get scroll() {
        return this.options.infinite ? modulo(this.animatedScroll, this.limit) : this.animatedScroll;
    }
    get progress() {
        return this.limit === 0 ? 1 : this.scroll / this.limit;
    }
    get isScrolling() {
        return this._isScrolling;
    }
    set isScrolling(value) {
        if (this._isScrolling !== value) {
            this._isScrolling = value;
            this.updateClassName();
        }
    }
    get isStopped() {
        return this._isStopped;
    }
    set isStopped(value) {
        if (this._isStopped !== value) {
            this._isStopped = value;
            this.updateClassName();
        }
    }
    get isLocked() {
        return this._isLocked;
    }
    set isLocked(value) {
        if (this._isLocked !== value) {
            this._isLocked = value;
            this.updateClassName();
        }
    }
    get isSmooth() {
        return this.isScrolling === 'smooth';
    }
    get className() {
        let className = 'lenis';
        if (this.options.autoToggle) className += ' lenis-autoToggle';
        if (this.isStopped) className += ' lenis-stopped';
        if (this.isLocked) className += ' lenis-locked';
        if (this.isScrolling) className += ' lenis-scrolling';
        if (this.isScrolling === 'smooth') className += ' lenis-smooth';
        return className;
    }
    updateClassName() {
        this.cleanUpClassName();
        this.rootElement.className = `${this.rootElement.className} ${this.className}`.trim();
    }
    cleanUpClassName() {
        this.rootElement.className = this.rootElement.className.replace(/lenis(-\w+)?/g, '').trim();
    }
}
