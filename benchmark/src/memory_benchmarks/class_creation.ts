class A {
    constructor(x: number) {
        this.z = x * x;
    }

    public z: number;
}

class B extends A {}

export default function classCreation(): B[] {
    const arr1 = [];
    const n = 10000;
    for (let i = 0; i < n; i++) {
        arr1.push(new B(i));
    }
    return arr1;
}
