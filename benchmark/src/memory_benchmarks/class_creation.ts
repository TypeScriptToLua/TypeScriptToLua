class A {
    constructor(x: number) {
        this.z = x * x;
    }

    public z: number;
}

class B extends A {
    constructor(y: number) {
        super(y);
    }
}

// tslint:disable-next-line:no-default-export
export default function classCreation(): void {
    const arr1 = [];
    const n = 500;
    for (let i = 0; i < n; i++) {
        arr1.push(new B(i));
    }
}
