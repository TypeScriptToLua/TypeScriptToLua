export function __TS__ArrayReverse(this: any[]): any[] {
    let i = 1;
    let j = this.length;
    while (i < j) {
        const temp = this[j - 1];
        this[j - 1] = this[i - 1];
        this[i - 1] = temp;
        i++;
        j--;
    }
    return this;
}
