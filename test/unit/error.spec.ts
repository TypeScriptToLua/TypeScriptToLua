import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test("throwString", () => {
    util.testFunction`
        throw "Some Error"
    `.expectToEqual(new util.ExecutionError("Some Error"));
});

test("throwError", () => {
    util.testFunction`
        throw Error("Some Error")
    `.expectToHaveDiagnosticOfError(TSTLErrors.InvalidThrowExpression(util.nodeStub));
});

test.skip.each([0, 1, 2])("re-throw (%p)", i => {
    util.testFunction`
        const i: number = ${i};
        function foo() {
            try {
                try {
                    if (i === 0) { throw "z"; }
                } catch (e) {
                    throw "a";
                } finally {
                    if (i === 1) { throw "b"; }
                }
            } catch (e) {
                throw (e as string).toUpperCase();
            } finally {
                throw "C";
            }
        }
        let result: string = "x";
        try {
            foo();
        } catch (e) {
            result = (e as string)[(e as string).length - 1];
        }
        return result;
    `.expectToMatchJsResult();
});

test("re-throw (no catch var)", () => {
    util.testFunction`
        let result = "x";
        try {
            try {
                throw "y";
            } catch {
                throw "z";
            }
        } catch (e) {
            result = (e as string)[(e as string).length - 1];
        }
        return result;
    `.expectToMatchJsResult();
});
