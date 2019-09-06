import * as util from "../util";

test("noSelf option enables noSelfInFile behaviour", () => {
    const transpiledCode = util.transpileString(
        `function fooBar(foo: string, bar: string) {
            return foo + bar;
        }`,
        {
            noSelf: true,
        }
    );

    const lua = `
        ${transpiledCode}
        return fooBar("foo", "bar")
    `;

    expect(util.executeLua(lua)).toBe("foobar");
});

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
