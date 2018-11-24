function __TS__ArrayReverse(arr: any[]): any[] {
    let i = 0;
    let j = arr.length - 1;
    while (i < j) {
        const temp = arr[j];
        arr[j] = arr[i];
        arr[i] = temp;
        i = i + 1;
        j = j - 1;
    }
    return arr;
}
