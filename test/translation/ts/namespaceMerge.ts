declare class MergedClass {
    public propertyFunc: () => void;
    public method(): void;
}
declare namespace MergedClass {
    export function namespaceFunc(): void;
}
const mergedClass = new MergedClass();
mergedClass.method();
mergedClass.propertyFunc();
MergedClass.namespaceFunc();
