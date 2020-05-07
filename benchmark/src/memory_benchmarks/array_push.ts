// tslint:disable-next-line:no-default-export
export default function arrayPush(): void {
    const n = 500;
    const numberList: number[] = [];
    for (let i = 0; i < n; i++) {
        numberList.push(i * i);
    }
}
