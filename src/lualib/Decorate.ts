/**
 * NOTE: will need to be changed to support Method and Property decoration
 *
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
function __TS__Decorate(this: void, decorators: Function[], target: {}, key?: string, desc?: any): {} {
    let r = target;

    for (let i = decorators.length; i >= 0; i--) {
        const d = decorators[i];
        if (d) {
            r = (key === undefined ? d(r) : desc !== undefined ? d(target, key, r) : d(target, key)) || r;
        }
    }

    return r;
}