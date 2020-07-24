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
    ["method() {}"],
    ["property;"],
    ["propertyWithInitializer = () => {};"],
    ["['evaluated property'];"],
    ["get getter() { return 5 }"],
    ["set setter(value) {}"],
    ["static method() {}"],
    ["static property;"],
    ["static propertyWithInitializer = () => {}"],
    ["static get getter() { return 5 }"],
    ["static set setter(value) {}"],
    ["static ['evaluated property'];"],
])("Decorate class member (%p)", memberStatement => {
    util.testFunction`
        let decoratorTarget: any | undefined;
        let decoratorTargetKey: string | undefined;

        const decorator = (target, key) => {
            decoratorTarget = target;
            decoratorTargetKey = key;
        };

        class Foo {
            @decorator
            ${memberStatement}
        }

        const targetKind = decoratorTarget === Foo.prototype ? "prototype" : "class";
        return [targetKind, decoratorTargetKey];
    `.expectToMatchJsResult();
});

test.each([["method(@decorator a) {}"], ["static method(@decorator a) {}"]])(
    "Decorate method parameter (%p)",
    methodStatement => {
        util.testFunction`
            let decoratorTarget;
            let decoratorTargetKey;
            let decoratorTargetKeyIndex;

            const decorator = (target, key, index) => {
                decoratorTarget = target;
                decoratorTargetKey = key;
                decoratorTargetKeyIndex = index;
            };

            class Foo {
                ${methodStatement}
            }

            const targetKind = decoratorTarget === Foo.prototype ? "prototype" : "class";
            return [targetKind, decoratorTargetKey, decoratorTargetKeyIndex];
        `.expectToMatchJsResult();
    }
);
