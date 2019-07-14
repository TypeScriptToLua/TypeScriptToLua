import * as util from "../../util";

test("instanceof", () => {
    util.testFunction`
        class myClass {}
        let inst = new myClass();
        return inst instanceof myClass;
    `.expectToMatchJsResult();
});

test("instanceof inheritance", () => {
    util.testFunction`
        class myClass {}
        class childClass extends myClass {}
        let inst = new childClass();
        return inst instanceof myClass;
    `.expectToMatchJsResult();
});

test("instanceof inheritance false", () => {
    util.testFunction`
        class myClass {}
        class childClass extends myClass {}
        let inst = new myClass();
        return inst instanceof childClass;
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

test("instanceof export", () => {
    util.testModule`
        export class myClass {}
        let inst = new myClass();
        export const result = inst instanceof myClass;
    `
        .setExport("result")
        .expectToMatchJsResult();
});

test("instanceof Symbol.hasInstance", () => {
    util.testFunction`
        class myClass {
            static [Symbol.hasInstance]() {
                return false;
            }
        }

        const inst = new myClass();
        const isInstanceOld = inst instanceof myClass;
        myClass[Symbol.hasInstance] = () => true;
        const isInstanceNew = inst instanceof myClass;
        return isInstanceOld !== isInstanceNew;
    `.expectToMatchJsResult();
});
