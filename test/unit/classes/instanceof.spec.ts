import * as util from "../../util";

test("instanceof", () => {
    util.testFunction`
        class myClass {}
        const instance = new myClass();
        return instance instanceof myClass;
    `.expectToMatchJsResult();
});

test("instanceof inheritance", () => {
    util.testFunction`
        class myClass {}
        class childClass extends myClass {}
        const instance = new childClass();
        return instance instanceof myClass;
    `.expectToMatchJsResult();
});

test("instanceof inheritance false", () => {
    util.testFunction`
        class myClass {}
        class childClass extends myClass {}
        const instance = new myClass();
        return instance instanceof childClass;
    `.expectToMatchJsResult();
});

test("{} instanceof Object", () => {
    util.testExpression`{} instanceof Object`.expectToMatchJsResult();
});

test("function instanceof Object", () => {
    util.testExpression`(() => {}) instanceof Object`.expectToMatchJsResult();
});

test("null instanceof Object", () => {
    util.testExpression`(null as any) instanceof Object`.expectToMatchJsResult();
});

test("instanceof undefined", () => {
    util.testExpression`{} instanceof (undefined as any)`.expectToMatchJsResult(true);
});

test("null instanceof Class", () => {
    util.testFunction`
        class myClass {}
        return (null as any) instanceof myClass;
    `.expectToMatchJsResult();
});

test("function instanceof Class", () => {
    util.testFunction`
        class myClass {}
        const noop = () => {};
        return (noop as any) instanceof myClass;
    `.expectToMatchJsResult();
});

test("boolean instanceof Class", () => {
    util.testFunction`
        class myClass {}
        return (false as any) instanceof myClass;
    `.expectToMatchJsResult();
});

test("number instanceof Class", () => {
    util.testFunction`
        class myClass {}
        return (5 as any) instanceof myClass;
    `.expectToMatchJsResult();
});

test("instanceof export", () => {
    util.testModule`
        export class myClass {}
        const instance = new myClass();
        export const result = instance instanceof myClass;
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test("instanceof Symbol.hasInstance", () => {
    util.testFunction`
        class myClass {
            static [Symbol.hasInstance]() {
                return false;
            }
        }

        const instance = new myClass();
        const isInstanceOld = instance instanceof myClass;
        myClass[Symbol.hasInstance] = () => true;
        const isInstanceNew = instance instanceof myClass;
        return { isInstanceOld, isInstanceNew };
    `.expectToMatchJsResult();
});
