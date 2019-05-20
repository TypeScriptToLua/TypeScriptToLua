import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test("throwString", () => {
    const lua = util.transpileString(`throw "Some Error"`);
    expect(lua).toBe(`error("Some Error")`);
});

test("throwError", () => {
    expect(() => {
        util.transpileString(`throw Error("Some Error")`);
    }).toThrowExactError(TSTLErrors.InvalidThrowExpression(util.nodeStub));
});

test.each([{ i: 0, expected: "A" }, { i: 1, expected: "B" }, { i: 2, expected: "C" }])(
    "re-throw (%p)",
    ({ i, expected }) => {
        const source = `
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
        `;
        const result = util.transpileAndExecute(source);
        expect(result).toBe(expected);
    },
);

test("re-throw (no catch var)", () => {
    const source = `
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
    `;
    const result = util.transpileAndExecute(source);
    expect(result).toBe("z");
});
