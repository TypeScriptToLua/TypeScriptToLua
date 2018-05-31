/** !DotMethod */
declare class TestClass {
    public dotMethod(): void;
}

/** !DotMethod */
declare interface TestInterface {
    dotMethod(): void;
}

declare class MixedClass {
    public static staticMethod(): void;

    /** !DotMethod */
    public dotMethod(): void;

    public regularMethod(): void;
}

declare const classInstance: TestClass;
declare const interfaceInstance: TestInterface;
declare const mixedInstance: MixedClass;

classInstance.dotMethod();
interfaceInstance.dotMethod();
MixedClass.staticMethod();
mixedInstance.dotMethod();
mixedInstance.regularMethod();
