export default function arrayEvery(): boolean {
    const arr = [];
    const n = 10000;
    for (let i = 0; i < n; i++) {
        arr[i] = i;
    }
    const isSmallerN = arr.every(e => e < n);
    return isSmallerN;
}
