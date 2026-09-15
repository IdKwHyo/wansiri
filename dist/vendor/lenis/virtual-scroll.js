import { Emitter } from './emitter.js';
const LINE_HEIGHT = 100 / 6;
const listenerOptions = {
    passive: false
};
export class VirtualScroll {
    element;
    options;
    touchStart = {
        x: 0,
        y: 0
    };
    lastDelta = {
        x: 0,
        y: 0
    };
    window = {
        width: 0,
        height: 0
    };
    emitter = new Emitter();
    constructor(element, options = {
        wheelMultiplier: 1,
        touchMultiplier: 1
    }){
        this.element = element;
        this.options = options;
        window.addEventListener('resize', this.onWindowResize, false);
        this.onWindowResize();
        this.element.addEventListener('wheel', this.onWheel, listenerOptions);
        this.element.addEventListener('touchstart', this.onTouchStart, listenerOptions);
        this.element.addEventListener('touchmove', this.onTouchMove, listenerOptions);
        this.element.addEventListener('touchend', this.onTouchEnd, listenerOptions);
    }
    on(event, callback) {
        return this.emitter.on(event, callback);
    }
    destroy() {
        this.emitter.destroy();
        window.removeEventListener('resize', this.onWindowResize, false);
        this.element.removeEventListener('wheel', this.onWheel, listenerOptions);
        this.element.removeEventListener('touchstart', this.onTouchStart, listenerOptions);
        this.element.removeEventListener('touchmove', this.onTouchMove, listenerOptions);
        this.element.removeEventListener('touchend', this.onTouchEnd, listenerOptions);
    }
    onTouchStart = (event)=>{
        const { clientX, clientY } = event.targetTouches ? event.targetTouches[0] : event;
        this.touchStart.x = clientX;
        this.touchStart.y = clientY;
        this.lastDelta = {
            x: 0,
            y: 0
        };
        this.emitter.emit('scroll', {
            deltaX: 0,
            deltaY: 0,
            event
        });
    };
    onTouchMove = (event)=>{
        const { clientX, clientY } = event.targetTouches ? event.targetTouches[0] : event;
        const deltaX = -(clientX - this.touchStart.x) * this.options.touchMultiplier;
        const deltaY = -(clientY - this.touchStart.y) * this.options.touchMultiplier;
        this.touchStart.x = clientX;
        this.touchStart.y = clientY;
        this.lastDelta = {
            x: deltaX,
            y: deltaY
        };
        this.emitter.emit('scroll', {
            deltaX,
            deltaY,
            event
        });
    };
    onTouchEnd = (event)=>{
        this.emitter.emit('scroll', {
            deltaX: this.lastDelta.x,
            deltaY: this.lastDelta.y,
            event
        });
    };
    onWheel = (event)=>{
        let { deltaX, deltaY, deltaMode } = event;
        const multiplierX = deltaMode === 1 ? LINE_HEIGHT : deltaMode === 2 ? this.window.width : 1;
        const multiplierY = deltaMode === 1 ? LINE_HEIGHT : deltaMode === 2 ? this.window.height : 1;
        deltaX *= multiplierX;
        deltaY *= multiplierY;
        deltaX *= this.options.wheelMultiplier;
        deltaY *= this.options.wheelMultiplier;
        this.emitter.emit('scroll', {
            deltaX,
            deltaY,
            event
        });
    };
    onWindowResize = ()=>{
        this.window = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    };
}
