import * as TSTLErrors from "../../../src/TSTLErrors";
import * as util from "../../util";

test("Const assignment (%p)", () => {
    const lua = util.transpileString(`const foo = true;`);
    expect(lua).toBe(`local foo = true`);
});

test("Let assignment (%p)", () => {
    const lua = util.transpileString(`let foo = true;`);
    expect(lua).toBe(`local foo = true`);
});

test("Var assignment (%p)", () => {
    const lua = util.transpileString(`var foo = true;`);
    expect(lua).toBe(`foo = true`);
});

test.each(["var myvar;", "let myvar;", "const myvar = null;", "const myvar = undefined;"])(
    "Null assignments (%p)",
    declaration => {
        const result = util.transpileAndExecute(declaration + " return myvar;");
        expect(result).toBe(undefined);
    }
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
    expect(() => util.transpileString("let [a, b, ...c] = [1,2,3];")).toThrowExactError(
        TSTLErrors.ForbiddenEllipsisDestruction(util.nodeStub)
    );
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
