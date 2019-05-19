import { TSTLErrors } from "../../../src/TSTLErrors";
import * as util from "../../util";

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{\n    1,\n    2,\n    3,\n}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{\n    a = 3,\n    b = "4",\n}` },
])("Const assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`const myvar = ${inp}`);
    expect(lua).toBe(`local myvar = ${out}`);
});

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{\n    1,\n    2,\n    3,\n}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{\n    a = 3,\n    b = "4",\n}` },
])("Let assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`let myvar = ${inp}`);
    expect(lua).toBe(`local myvar = ${out}`);
});

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{\n    1,\n    2,\n    3,\n}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{\n    a = 3,\n    b = "4",\n}` },
])("Var assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`var myvar = ${inp}`);
    expect(lua).toBe(`myvar = ${out}`);
});

test.each(["var myvar;", "let myvar;", "const myvar = null;", "const myvar = undefined;"])(
    "Null assignments (%p)",
    declaration => {
        const result = util.transpileAndExecute(declaration + " return myvar;");
        expect(result).toBe(undefined);
    },
);

test.each([
    { input: ["a", "b"], values: ["e", "f"] },
    { input: ["a", "b"], values: ["e", "f", "g"] },
    { input: ["a", "b", "c"], values: ["e", "f", "g"] },
])("Binding pattern assignment (%p)", ({ input, values }) => {
    const pattern = input.join(",");
    const initializer = values.map(v => `"${v}"`).join(",");

    const tsCode = `const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`;
    const result = util.transpileAndExecute(tsCode);

    expect(result).toBe(values.slice(0, input.length).join("-"));
});

test("Ellipsis binding pattern", () => {
    expect(() => util.transpileString("let [a,b,...c] = [1,2,3];")).toThrowExactError(
        TSTLErrors.ForbiddenEllipsisDestruction(util.nodeStub),
    );
});

test("Tuple Assignment", () => {
    const code = `
        function abc(): [number, number] { return [1, 2]; };
        let t: [number, number] = abc();
        return t[0] + t[1];
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(3);
});

test("TupleReturn assignment", () => {
    const code = `
        /** @tupleReturn */
        declare function abc(this: void): number[]
        let [a,b] = abc();
    `;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = abc()");
});

test("TupleReturn Single assignment", () => {
    const code = `
        /** @tupleReturn */
        declare function abc(this: void): [number, string];
        let a = abc();
        a = abc();
    `;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a = ({abc()})\na = ({abc()})");
});

test("TupleReturn interface assignment", () => {
    const code = `
        interface def {
        /** @tupleReturn */
        abc();
        } declare const jkl : def;
        let [a,b] = jkl.abc();
    `;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = jkl:abc()");
});

test("TupleReturn namespace assignment", () => {
    const code = `
        declare namespace def {
        /** @tupleReturn */
        function abc(this: void) {}
        }
        let [a,b] = def.abc();
    `;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = def.abc()");
});

test("TupleReturn method assignment", () => {
    const code = `
        declare class def {
        /** @tupleReturn */
        abc() { return [1,2,3]; }
        } const jkl = new def();
        let [a,b] = jkl.abc();
    `;

    const lua = util.transpileString(code);
    expect(lua).toBe("local jkl = def.new()\nlocal a, b = jkl:abc()");
});

test("TupleReturn functional", () => {
    const code = `
        /** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const [a, b] = abc();
        return b + a;
    `;

    const result = util.transpileAndExecute(code);

    expect(result).toBe("a3");
});

test("TupleReturn single", () => {
    const code = `
        /** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const res = abc();
        return res.length
    `;

    const result = util.transpileAndExecute(code);

    expect(result).toBe(2);
});

test("TupleReturn in expression", () => {
    const code = `
        /** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        return abc()[1] + abc()[0];
    `;

    const result = util.transpileAndExecute(code);

    expect(result).toBe("a3");
});

test("String table access", () => {
    const code = `
        const dict : {[key:string]:any} = {};
        dict["a b"] = 3;
        return dict["a b"];
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(3);
});
