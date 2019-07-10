import * as TSTLErrors from "../../src/TSTLErrors";
import * as util from "../util";

test("Class decorator with no parameters", () => {
    util.testFunction`
        function SetBool<T extends { new(...args: any[]): {} }>(constructor: T) {
            return class extends constructor {
                decoratorBool = true;
            }
        }

        @SetBool
        class TestClass {
            public decoratorBool = false;
        }

        const classInstance = new TestClass();
        return classInstance.decoratorBool;
    `.expectToMatchJsResult();
});

test("Class decorator with parameters", () => {
    util.testFunction`
        function SetNum(numArg: number) {
            return <T extends new(...args: any[]) => {}>(constructor: T) => {
                return class extends constructor {
                    decoratorNum = numArg;
                };
            };
        }

        @SetNum(420)
        class TestClass {
            public decoratorNum;
        }

        const classInstance = new TestClass();
        return classInstance.decoratorNum;
    `.expectToMatchJsResult();
});

test("Class decorator with variable parameters", () => {
    util.testFunction`
        function SetNumbers(...numArgs: number[]) {
            return <T extends new(...args: any[]) => {}>(constructor: T) => {
                return class extends constructor {
                    decoratorNums = new Set<number>(numArgs);
                };
            };
        }

        @SetNumbers(120, 30, 54)
        class TestClass {
            public decoratorNums;
        }

        const classInstance = new TestClass();
        let sum = 0;
        for (const value of classInstance.decoratorNums) {
            sum += value;
        }
        return sum;
    `.expectToMatchJsResult();
});

test("Multiple class decorators", () => {
    util.testFunction`
        function SetTen<T extends { new(...args: any[]): {} }>(constructor: T) {
            return class extends constructor {
                decoratorTen = 10;
            }
        }

        function SetNum(numArg: number) {
            return <T extends new(...args: any[]) => {}>(constructor: T) => {
                return class extends constructor {
                    decoratorNum = numArg;
                };
            };
        }

        @SetTen
        @SetNum(410)
        class TestClass {
            public decoratorTen;
            public decoratorNum;
        }

        const classInstance = new TestClass();
        return classInstance.decoratorNum + classInstance.decoratorTen;
    `.expectToMatchJsResult();
});

test("Class decorator with inheritance", () => {
    util.testFunction`
        function SetTen<T extends { new(...args: any[]): {} }>(constructor: T) {
            return class extends constructor {
                decoratorTen = 10;
            }
        }

        function SetNum(numArg: number) {
            return <T extends new(...args: any[]) => {}>(constructor: T) => {
                return class extends constructor {
                    decoratorNum = numArg;
                };
            };
        }

        class TestClass {
            public decoratorTen = 0;
            public decoratorNum = 0;
        }

        @SetTen
        @SetNum(410)
        class SubTestClass extends TestClass {}

        const classInstance = new SubTestClass();
        return classInstance.decoratorNum + classInstance.decoratorTen;
    `.expectToMatchJsResult();
});

test("Class decorators are applied in order and executed in reverse order", () => {
    util.testFunction`
        const order = [];

        function SetString(stringArg: string) {
            order.push("eval " + stringArg);
            return <T extends new (...args: any[]) => {}>(constructor: T) => {
                order.push("execute " + stringArg);
                return class extends constructor {
                    decoratorString = stringArg;
                };
            };
        }

        @SetString("fox")
        @SetString("jumped")
        @SetString("over dog")
        class TestClass {
            public static decoratorString = "";
        }

        const inst = new TestClass();
        return order.join(" ");
    `.expectToMatchJsResult();
});

test("Throws error if decorator function has void context", () => {
    const source = `
        function SetBool<T extends { new(...args: any[]): {} }>(this: void, constructor: T) {
            return class extends constructor {
                decoratorBool = true;
            }
        }

        @SetBool
        class TestClass {
            public decoratorBool = false;
        }

        const classInstance = new TestClass();
        return classInstance.decoratorBool;
    `;

    expect(() => util.transpileAndExecute(source)).toThrowExactError(TSTLErrors.InvalidDecoratorContext(util.nodeStub));
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
        .setExport("Foo.bar")
        .expectToMatchJsResult();
});
