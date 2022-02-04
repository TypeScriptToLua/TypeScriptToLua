export default function arrayPush(): number[] {
    const n = 200000;
    const numberList: number[] = [];
    function pushArgs(...args: number[]): void {
        numberList.push(...args);
    }

    for (let i = 0; i < n; i++) {
        pushArgs(3, 4);
    }
    return numberList;
}
