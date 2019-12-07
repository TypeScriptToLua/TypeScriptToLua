import { InvalidDecoratorContext } from "../../../src/transformation/utils/errors";
import * as util from "../../util";

test("Class decorator with no parameters", () => {
    util.testFunction`
        function setBool<T extends new (...args: any[]) => {}>(constructor: T) {
            return class extends constructor {
                decoratorBool = true;
            }
        }

        @setBool
        class TestClass {
            public decoratorBool = false;
        }

        return new TestClass();
    `.expectToMatchJsResult();
});

test("Class decorator with parameters", () => {
    util.testFunction`
        function setNum(numArg: number) {
            return <T extends new (...args: any[]) => {}>(constructor: T) => {
                return class extends constructor {
                    decoratorNum = numArg;
                };
            };
        }

        @setNum(420)
        class TestClass {
            public decoratorNum;
        }

        return new TestClass();
    `.expectToMatchJsResult();
});

test("Multiple class decorators", () => {
    util.testFunction`
        function setTen<T extends new (...args: any[]) => {}>(constructor: T) {
            return class extends constructor {
                decoratorTen = 10;
            }
        }

        function setNum<T extends new (...args: any[]) => {}>(constructor: T) {
            return class extends constructor {
                decoratorNum = 410;
            }
        }

        @setTen
        @setNum
        class TestClass {
            public decoratorTen;
            public decoratorNum;
        }

        return new TestClass();
    `.expectToMatchJsResult();
});

test("Class decorator with inheritance", () => {
    util.testFunction`
        function setTen<T extends new (...args: any[]) => {}>(constructor: T) {
            return class extends constructor {
                decoratorTen = 10;
            }
        }

        class TestClass {
            public decoratorTen = 0;
        }

        @setTen
        class SubTestClass extends TestClass {
            public decoratorTen = 5;
        }

        return new SubTestClass();
    `.expectToMatchJsResult();
});

test("Class decorators are applied in order and executed in reverse order", () => {
    util.testFunction`
        const order = [];

        function pushOrder(index: number) {
            order.push("eval " + index);
            return (constructor: new (...args: any[]) => {}) => {
                order.push("execute " + index);
            };
        }

        @pushOrder(1)
        @pushOrder(2)
        @pushOrder(3)
        class TestClass {}

        return order;
    `.expectToMatchJsResult();
});

test("Throws error if decorator function has void context", () => {
    util.testFunction`
        function SetBool(this: void, constructor: new (...args: any[]) => {}) {}

        @SetBool
        class TestClass {}
    `.expectToHaveDiagnosticOfError(InvalidDecoratorContext(util.nodeStub));
});

test("Exported class decorator", () => {
    util.testModule`
        function decorator<T extends any>(c: T): T {
            c.bar = "foobar";
            return c;
        }

        @decorator
        export class Foo {}
    `
        .setReturnExport("Foo.bar")
        .expectToMatchJsResult();
});
