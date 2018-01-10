class testA {
    fieldA: number = 5;
    constructor(a: number) {
        this.fieldA = a;
    }

    testMethod(): number {
        return this.fieldA;
    }
}

class testB extends testA {
    fieldB: number;
    constructor(a: number, b: number) {
        super(a);
        this.fieldB = b;
    }

    mul(): number {
        return this.fieldA * this.fieldB;
    }
}

declare function print(...args:any[]): void;

let instance = new testB(4, 6);
print(instance.fieldA);
print(instance.fieldB);
print(instance.mul());