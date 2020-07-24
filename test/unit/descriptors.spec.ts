import * as util from "../util";

const trueFalseUndefTests = [["true"], ["false"], ["undefined"]];

describe("Object.defineProperty", () => {
    test.each(trueFalseUndefTests)("writable (%p)", value => {
        util.testFunction`
            const foo = { bar: true };
            Object.defineProperty(foo, "bar", { writable: ${value} });
            try { foo.bar = false } catch {}
            return foo.bar;
        `.expectToMatchJsResult();
    });

    test.each(trueFalseUndefTests)("configurable (%p)", value => {
        util.testFunction`
            const foo = { bar: true };
            Object.defineProperty(foo, "bar", { configurable: ${value} });
            try { delete foo.bar } catch {}
            return foo.bar;
        `.expectToMatchJsResult();
    });

    test("defines a new property", () => {
        util.testFunction`
            const foo: any = {};
            Object.defineProperty(foo, "bar", { value: true });
            return foo.bar;
        `.expectToMatchJsResult();
    });

    test("overwrites an existing property", () => {
        util.testFunction`
            const foo = { bar: false };
            Object.defineProperty(foo, "bar", { value: true });
            return foo.bar;
        `.expectToMatchJsResult();
    });

    test("default descriptor", () => {
        util.testFunction`
            const foo = {};
            Object.defineProperty(foo, "bar", {});
            return Object.getOwnPropertyDescriptor(foo, "bar");
        `.expectToMatchJsResult();
    });

    test.each([
        ["{ value: true, get: () => true }"],
        ["{ value: true, set: value => {} }"],
        ["{ writable: true, get: () => true }"],
    ])("invalid descriptor (%p)", props => {
        util.testFunction`
            const foo: any = {};
            let err = false;

            try {
                Object.defineProperty(foo, "bar", ${props});
            } catch {
                err = true;
            }

            return { prop: foo.bar, err };
        `.expectToMatchJsResult();
    });
});

describe("Decorators /w descriptors", () => {
    test("Decorated methods are not writable", () => {
        util.testFunction`
            const decorator = (...args) => {};
            class Foo { @decorator static method() {} }
            const { value, ...rest } = Object.getOwnPropertyDescriptor(Foo, "method");
            return rest;
        `.expectToMatchJsResult();
    });

    test.each([
        ["return { writable: true }", "return { configurable: true }"],
        ["desc.writable = true", "desc.configurable = true"],
        ["desc.writable = true", "return { configurable: true }"],
        ["return { writable: true }", "desc.configurable = true"],
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
