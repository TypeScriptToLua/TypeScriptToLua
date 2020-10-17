import { decoratorInvalidContext } from "../../../src/transformation/utils/diagnostics";
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
        function decorator(this: void, constructor: new (...args: any[]) => {}) {}

        @decorator
        class TestClass {}
    `.expectDiagnosticsToMatchSnapshot([decoratorInvalidContext.code]);
});

test("Exported class decorator", () => {
    util.testModule`
        function decorator<T extends new (...args: any[]) => any>(Class: T): T {
            return class extends Class {
                public bar = "foobar";
            };
        }

        @decorator
        export class Foo {}
    `
        .setReturnExport("Foo", "bar")
        .expectToMatchJsResult();
});

test.each([
    ["@decorator method() {}"],
    ["@decorator property;"],
    ["@decorator propertyWithInitializer = () => {};"],
    ["@decorator ['evaluated property'];"],
    ["@decorator get getter() { return 5 }"],
    ["@decorator set setter(value) {}"],
    ["@decorator static method() {}"],
    ["@decorator static property;"],
    ["@decorator static propertyWithInitializer = () => {}"],
    ["@decorator static get getter() { return 5 }"],
    ["@decorator static set setter(value) {}"],
    ["@decorator static ['evaluated property'];"],
    ["method(@decorator a) {}"],
    ["static method(@decorator a) {}"],
])("Decorate class member (%p)", classMember => {
    util.testFunction`
        let decoratorParameters: any;

        const decorator = (target, key, index?) => {
            const targetKind = target === Foo ? "Foo" : target === Foo.prototype ? "Foo.prototype" : "unknown";
            decoratorParameters = { targetKind, key, index: typeof index };
        };

        class Foo {
            ${classMember}
        }

        return decoratorParameters;
    `.expectToMatchJsResult();
});

describe("Decorators /w descriptors", () => {
    test.each([
        ["return { writable: true }", "return { configurable: true }"],
        ["desc.writable = true", "return { configurable: true }"],
    ])("Combine decorators (%p + %p)", (decorateA, decorateB) => {
        util.testFunction`
            const A = (target, key, desc): any => { ${decorateA} };
            const B = (target, key, desc): any => { ${decorateB} };
            class Foo { @A @B static method() {} }
            const { value, ...rest } = Object.getOwnPropertyDescriptor(Foo, "method");
            return rest;
        `.expectToMatchJsResult();
    });

    test.each(["return { value: true }", "desc.value = true"])(
        "Use decorator to override method value",
        overrideStatement => {
            util.testFunction`
                const decorator = (target, key, desc): any => { ${overrideStatement} };
                class Foo { @decorator static method() {} }
                return Foo.method;
            `.expectToMatchJsResult();
        }
    );
});
