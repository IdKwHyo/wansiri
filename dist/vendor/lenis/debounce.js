export function debounce(callback, delay) {
    let timer;
    return function(...args) {
        let context = this;
        clearTimeout(timer);
        timer = setTimeout(()=>{
            timer = undefined;
            callback.apply(context, args);
        }, delay);
    };
}
