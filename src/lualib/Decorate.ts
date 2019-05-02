function __TS__Decorate(decorators: Function[], target: {}, key: string, desc: any): {} {
    const c = arguments.length;
    let r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;

    for (let i = decorators.length; i >= 0; i--) {
        d = decorators[i];
        if (d) {
            r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        }
    }

    return c > 3 && r && Object.defineProperty(target, key, r), r;
}