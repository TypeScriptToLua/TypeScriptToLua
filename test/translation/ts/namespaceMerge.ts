class MergedClass {
    public static staticMethodA(): void {}
    public static staticMethodB(): void {
        this.staticMethodA();
    }

    public propertyFunc: () => void = () => {};

    public methodA(): void {}
    public methodB(): void {
        this.methodA();
        this.propertyFunc();
    }
}

namespace MergedClass {
    export function namespaceFunc(): void {}
}

const mergedClass = new MergedClass();
mergedClass.methodB();
mergedClass.propertyFunc();
MergedClass.staticMethodB();
MergedClass.namespaceFunc();
