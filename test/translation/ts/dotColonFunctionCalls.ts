declare class TestClass {
    public colonMethod(): void;
}

declare interface TestInterface {
    colonMethod(): void;
}

declare var wrapperObj: { dotMethod: () => void };

declare const classInstance: TestClass;
declare const interfaceInstance: TestInterface;

classInstance.colonMethod();
interfaceInstance.colonMethod();
wrapperObj.dotMethod();
