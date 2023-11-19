import {
    decoratorInvalidContext,
    incompleteFieldDecoratorWarning,
} from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test("Class decorator with no parameters", () => {
    util.testFunction`
        let classDecoratorContext;

        function classDecorator<T extends new (...args: any[]) => {}>(constructor: T, context: ClassDecoratorContext) {
            classDecoratorContext = context;

            return class extends constructor {
                decoratorBool = true;
            }
        }

        @classDecorator
        class TestClass {
            public decoratorBool = false;
        }

        return { decoratedClass: new TestClass(), context: {
            kind: classDecoratorContext.kind,
            name: classDecoratorContext.name,
        } };
    `.expectToMatchJsResult();
});

test("Class decorator with parameters", () => {
    util.testFunction`
        function setNum(numArg: number) {
            return <T extends new (...args: any[]) => {}>(constructor: T, context: ClassDecoratorContext) => {
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
        function setTen<T extends new (...args: any[]) => {}>(constructor: T, context: ClassDecoratorContext) {
            return class extends constructor {
                decoratorTen = 10;
            }
        }

        function setNum<T extends new (...args: any[]) => {}>(constructor: T, context: ClassDecoratorContext) {
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
        function setTen<T extends new (...args: any[]) => {}>(constructor: T, context: ClassDecoratorContext) {
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
            return (constructor: new (...args: any[]) => {}, context: ClassDecoratorContext) => {
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
        function decorator(this: void, constructor: new (...args: any[]) => {}, context: ClassDecoratorContext) {}

        @decorator
        class TestClass {}
    `.expectDiagnosticsToMatchSnapshot([decoratorInvalidContext.code]);
});

test("Exported class decorator", () => {
    util.testModule`
        function decorator<T extends new (...args: any[]) => any>(Class: T, context: ClassDecoratorContext): T {
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

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1149
test("exported class with decorator", () => {
    util.testModule`
        import { MyClass } from "./other";
        const inst = new MyClass();
        export const result = inst.foo();
    `
        .addExtraFile(
            "other.ts",
            `function myDecorator(target: {new(): any}, context: ClassDecoratorContext) {
                return class extends target {
                    foo() {
                        return "overridden";
                    }
                }
            }

            @myDecorator
            export class MyClass {
                foo() {
                    return "foo";
                }
            }`
        )
        .expectToEqual({ result: "overridden" });
});

test("default exported class with decorator", () => {
    util.testModule`
        import MyClass from "./other";
        const inst = new MyClass();
        export const result = inst.foo();
    `
        .addExtraFile(
            "other.ts",
            `function myDecorator(target: {new(): any}, context: ClassDecoratorContext) {
                return class extends target {
                    foo() {
                        return "overridden";
                    }
                }
            }

            @myDecorator
            export default class {
                foo() {
                    return "foo";
                }
            }`
        )
        .expectToEqual({ result: "overridden" });
});

test("class method decorator", () => {
    util.testFunction`
        let methodDecoratorContext;

        function methodDecorator(method: (v: number) => number, context: ClassMethodDecoratorContext) {
            methodDecoratorContext = context;

            return (v: number) => {
                return method(v) + 10;
            };
        }

        class TestClass {
            @methodDecorator
            public myMethod(x: number) {
                return x * 23;
            }
        }

        return { result: new TestClass().myMethod(4), context: {
            kind: methodDecoratorContext.kind,
            name: methodDecoratorContext.name,
            private: methodDecoratorContext.private,
            static: methodDecoratorContext.static
        } };
    `.expectToMatchJsResult();
});

test("this in decorator points to class being decorated", () => {
    util.testFunction`
        function methodDecorator(method: (v: number) => number, context: ClassMethodDecoratorContext) {
            return function() {
                const thisCallTime = this.myInstanceVariable;
                return thisCallTime;
            };
        }

        class TestClass {
            constructor(protected myInstanceVariable: number) { }

            @methodDecorator
            public myMethod() {
                return 0;
            }
        }

        return new TestClass(5).myMethod();
    `.expectToMatchJsResult();
});

test("class getter decorator", () => {
    util.testFunction`
        let getterDecoratorContext;

        function getterDecorator(getter: () => number, context: ClassGetterDecoratorContext) {
            getterDecoratorContext = context;

            return () => {
                return getter() + 10;
            };
        }

        class TestClass {
            @getterDecorator
            get getterValue() { return 10; }
        }

        return { result: new TestClass().getterValue, context: {
            kind: getterDecoratorContext.kind,
            name: getterDecoratorContext.name,
            private: getterDecoratorContext.private,
            static: getterDecoratorContext.static
        } };
    `.expectToMatchJsResult();
});

test("class setter decorator", () => {
    util.testFunction`
        let setterDecoratorContext;

        function setterDecorator(setter: (v: number) => void, context: ClassSetterDecoratorContext) {
            setterDecoratorContext = context;

            return function(v: number) {
                setter.call(this, v + 15);
            };
        }

        class TestClass {
            public value: number;

            @setterDecorator
            set valueSetter(v: number) { this.value = v; }
        }

        const instance = new TestClass();
        instance.valueSetter = 23;
        return { result: instance.value, context: {
            kind: setterDecoratorContext.kind,
            name: setterDecoratorContext.name,
            private: setterDecoratorContext.private,
            static: setterDecoratorContext.static
        } };
    `.expectToMatchJsResult();
});

test("class field decorator", () => {
    util.testFunction`
        let fieldDecoratorContext;

        function fieldDecorator(_: undefined, context: ClassFieldDecoratorContext) {
            fieldDecoratorContext = context;
        }

        class TestClass {
            @fieldDecorator
            public value: number = 22;
        }

        return { result: new TestClass(), context: { 
            kind: fieldDecoratorContext.kind,
            name: fieldDecoratorContext.name,
            private: fieldDecoratorContext.private,
            static: fieldDecoratorContext.static,
        } };
    `.expectToEqual({
        result: {
            value: 22, // Different from JS because we ignore the value initializer
        },
        context: {
            kind: "field",
            name: "value",
            private: false,
            static: false,
        },
    });
});

test("class field decorator warns the return value is ignored", () => {
    util.testFunction`
        let fieldDecoratorContext;

        function fieldDecorator(_: undefined, context: ClassFieldDecoratorContext) {
            fieldDecoratorContext = context;

            return (initialValue: number) => initialValue * 12;
        }

        class TestClass {
            @fieldDecorator
            public value: number = 22;
        }
    `.expectDiagnosticsToMatchSnapshot([incompleteFieldDecoratorWarning.code]);
});

describe("legacy experimentalDecorators", () => {
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
    });

    test("Throws error if decorator function has void context", () => {
        util.testFunction`
            function decorator(this: void, constructor: new (...args: any[]) => {}) {}

            @decorator
            class TestClass {}
        `
            .setOptions({ experimentalDecorators: true })
            .expectDiagnosticsToMatchSnapshot([decoratorInvalidContext.code]);
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
            .setOptions({ experimentalDecorators: true })
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
        ["constructor(@decorator a) {}"],
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
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
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
            `
                .setOptions({ experimentalDecorators: true })
                .expectToMatchJsResult();
        });

        test.each(["return { value: true }", "desc.value = true"])(
            "Use decorator to override method value %s",
            overrideStatement => {
                util.testFunction`
                    const decorator = (target, key, desc): any => { ${overrideStatement} };
                    class Foo { @decorator static method() {} }
                    return Foo.method;
                `
                    .setOptions({ experimentalDecorators: true })
                    .expectToMatchJsResult();
            }
        );
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1149
    test("exported class with decorator", () => {
        util.testModule`
            import { MyClass } from "./other";
            const inst = new MyClass();
            export const result = inst.foo();
        `
            .addExtraFile(
                "other.ts",
                `function myDecorator(target: {new(): any}) {
                    return class extends target {
                        foo() {
                            return "overridden";
                        }
                    }
                }

                @myDecorator
                export class MyClass {
                    foo() {
                        return "foo";
                    }
                }`
            )
            .setOptions({ experimentalDecorators: true })
            .expectToEqual({ result: "overridden" });
    });

    test("default exported class with decorator", () => {
        util.testModule`
            import MyClass from "./other";
            const inst = new MyClass();
            export const result = inst.foo();
        `
            .addExtraFile(
                "other.ts",
                `function myDecorator(target: {new(): any}) {
                    return class extends target {
                        foo() {
                            return "overridden";
                        }
                    }
                }

                @myDecorator
                export default class {
                    foo() {
                        return "foo";
                    }
                }`
            )
            .setOptions({ experimentalDecorators: true })
            .expectToEqual({ result: "overridden" });
    });

    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1453
    test("Class methods with legacy decorators can still be called ($1453)", () => {
        util.testFunction`
            function decorator<Class>(
            target: Class,
            propertyKey: keyof Class,
            ): void {}

            class Foo {
                @decorator
                public method2() { return 4; }
            }

            return new Foo().method2();
        `
            .setOptions({ experimentalDecorators: true })
            .expectToMatchJsResult();
    });
});
