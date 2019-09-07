import * as util from "../../util";

test.each([
    ["foo: string, bar: string", `"foo", "bar"`, "foobar"],
    ["this: any, foo: string, bar: string", `"foo", "bar"`, "barnil"],
])("enables noSelfInFile behaviour for functions (%s)", (expectedParameters, suppliedParameters, result) => {
    const transpiledCode = util.transpileString(
        `function fooBar(${expectedParameters}) {
            return foo + bar;
        }`,
        {
            noSelf: true,
        }
    );

    const lua = `
        ${transpiledCode}
        return fooBar(${suppliedParameters})
    `;

    expect(util.executeLua(lua)).toBe(result);
});

test.each([
    ["foo: string, bar: string", `"foo", "bar"`, "barnil"],
    ["this: void, foo: string, bar: string", `"foo", "bar"`, "foobar"],
    ["foo: string, bar: string", `fooBar, "foo", "bar"`, "foobar"],
])("enables noSelfInFile behaviour for methods (%s)", (expectedParameters, suppliedParameters, result) => {
    const transpiledCode = util.transpileString(
        `class FooBar {
            fooBar(${expectedParameters}) {
                return foo + bar;
            }
        }
        const fooBar = new FooBar();`,
        {
            noSelf: true,
        }
    );

    const lua = `
        ${transpiledCode}
        return fooBar.fooBar(${suppliedParameters})
    `;

    expect(util.executeLua(lua)).toBe(result);
});

test("generates declaration files with @noSelfInFile", () => {
    const result = util.transpileStringsAsProject(
        {
            "main.ts": `function fooBar(foo: string, bar: string) {
                return foo + bar;
            }`,
        },
        {
            noSelf: true,
            declaration: true,
        }
    );

    const declarationFile = result.transpiledFiles.find(transpiledFile => transpiledFile.declaration);

    if (util.expectToBeDefined(declarationFile) && util.expectToBeDefined(declarationFile.declaration)) {
        expect(declarationFile.declaration).toMatch(/^\/\*\* \@noSelfInFile \*\//);
    }
});
