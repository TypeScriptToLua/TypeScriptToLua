export default function arrayPush(): number[] {
    const n = 1000000;
    const numberList: number[] = [];
    for (let i = 0; i < n; i++) {
        numberList[numberList.length] = i * i;
    }
    return numberList;
}
