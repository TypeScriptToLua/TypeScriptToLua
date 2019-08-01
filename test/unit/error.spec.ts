import * as TSTLErrors from "../../src/TSTLErrors";
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

test("return from try", () => {
    const code = `
        function foobar() {
            try {
                return "foobar";
            } catch {
            }
        }
        return foobar();
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("return nil from try", () => {
    const code = `
        let x = "unset";
        function foobar() {
            try {
                return;
            } catch {
            }
            x = "set";
        }
        foobar();
        return x;
    `;
    expect(util.transpileAndExecute(code)).toBe("unset");
});

test("tuple return from try", () => {
    const code = `
        /** @tupleReturn */
        function foobar() {
            try {
                return ["foo", "bar"];
            } catch {
            }
        }
        const [foo, bar] = foobar();
        return foo + bar;
    `;
    expect(util.transpileString(code)).not.toMatch("unpack(foobar");
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("return from catch", () => {
    const code = `
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return e + " catch";
            }
        }
        return foobar();
    `;
    expect(util.transpileAndExecute(code)).toMatch(/foobar catch$/);
});

test("return nil from catch", () => {
    const code = `
        let x = "unset";
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return;
            }
            x = "set";
        }
        foobar();
        return x;
    `;
    expect(util.transpileAndExecute(code)).toBe("unset");
});

test("tuple return from catch", () => {
    const code = `
        /** @tupleReturn */
        function foobar(): [string, string] {
            try {
                throw "foobar";
            } catch (e) {
                return [e.toString(), " catch"];
            }
        }
        const [foo, bar] = foobar();
        return foo + bar;
    `;
    expect(util.transpileString(code)).not.toMatch("unpack(foobar");
    expect(util.transpileAndExecute(code)).toMatch(/foobar catch$/);
});

test("return from nested try", () => {
    const code = `
        function foobar() {
            try {
                try {
                    return "foobar";
                } catch {
                }
            } catch {
            }
        }
        return foobar();
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("return from nested catch", () => {
    const code = `
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                try {
                    throw e + " catch1";
                } catch (f) {
                    return f + " catch2";
                }
            }
        }
        return foobar();
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toMatch("catch1");
    expect(result).toMatch("catch2");
    expect(result).toMatch("foobar");
});

test("return from try->finally", () => {
    const code = `
        let x = "unevaluated";
        function evaluate(arg: unknown) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                return evaluate("foobar");
            } catch {
            } finally {
                return "finally";
            }
        }
        return foobar() + " " + x;
    `;
    expect(util.transpileAndExecute(code)).toBe("finally evaluated");
});

test("return from catch->finally", () => {
    const code = `
        let x = "unevaluated";
        function evaluate(arg: unknown) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return evaluate(e);
            } finally {
                return "finally";
            }
        }
        return foobar() + " " + x;
    `;
    expect(util.transpileAndExecute(code)).toBe("finally evaluated");
});

test("tuple return from try->finally", () => {
    const code = `
        let x = "unevaluated";
        function evaluate(arg: string) {
            x = "evaluated";
            return arg;
        }
        /** @tupleReturn */
        function foobar() {
            try {
                return [evaluate("foo"), "bar"];
            } catch {
            } finally {
                return ["final", "ly"];
            }
        }
        const [foo, bar] = foobar();
        return foo + bar + " " + x;
    `;
    expect(util.transpileAndExecute(code)).toBe("finally evaluated");
});

test("tuple return from catch->finally", () => {
    const code = `
        let x = "unevaluated";
        function evaluate(arg: string) {
            x = "evaluated";
            return arg;
        }
        /** @tupleReturn */
        function foobar() {
            try {
                throw "foo";
            } catch (e) {
                return [evaluate(e), "bar"];
            } finally {
                return ["final", "ly"];
            }
        }
        const [foo, bar] = foobar();
        return foo + bar + " " + x;
    `;
    expect(util.transpileAndExecute(code)).toBe("finally evaluated");
});

test("return from nested finally", () => {
    const code = `
        let x = "";
        function foobar() {
            try {
                try {
                } finally {
                    x += "A";
                    return "foobar";
                }
            } finally {
                x += "B";
                return "finally";
            }
        }
        return foobar() + " " + x;
    `;
    expect(util.transpileAndExecute(code)).toBe("finally AB");
});
