declare class TestClass {
    public dotMethod: () => void;
    public colonMethod(): void;
}

declare interface TestInterface {
    dotMethod: () => void;
    colonMethod(): void;
}

declare namespace TestNameSpace {
    var dotMethod: () => void;
    function dotMethod2(): void;
}

declare const classInstance: TestClass;
declare const interfaceInstance: TestInterface;

classInstance.colonMethod();
classInstance.dotMethod();
interfaceInstance.colonMethod();
interfaceInstance.dotMethod();
TestNameSpace.dotMethod();
TestNameSpace.dotMethod2();
