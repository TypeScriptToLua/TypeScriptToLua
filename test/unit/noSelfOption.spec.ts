import * as util from "../util";

test.each([
    ["foo: string, bar: string", `"foo", "bar"`, "foobar"],
    ["this: any, foo: string, bar: string", `"foo", "bar"`, "barnil"],
])(
    "noSelf option enables noSelfInFile behaviour for functions (%s)",
    (expectedParameters, suppliedParameters, result) => {
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
    }
);

test.each([
    ["foo: string, bar: string", `"foo", "bar"`, "barnil"],
    ["this: void, foo: string, bar: string", `"foo", "bar"`, "foobar"],
    ["foo: string, bar: string", `fooBar, "foo", "bar"`, "foobar"],
])(
    "noSelf option enables noSelfInFile behaviour for methods (%s)",
    (expectedParameters, suppliedParameters, result) => {
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
    }
);

test("noSelf option generates declaration files with @noSelfInFile", () => {
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

    expect(declarationFile).not.toBeUndefined();

    if (declarationFile && declarationFile.declaration) {
        expect(declarationFile.declaration).toMatch(/^\/\*\* \@noSelfInFile \*\//);
    }
});
