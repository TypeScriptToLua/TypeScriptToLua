export default function arrayConcat(): number[] {
    let arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    const n = 1000;
    for (let i = 0; i < n; i++) {
        arr1 = arr1.concat(arr2);
    }
    return arr1;
}
