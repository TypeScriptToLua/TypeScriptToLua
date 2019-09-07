import * as util from "../../util";

test.each([["foo: string, bar: string", `this: void, foo: string, bar: string`]])(
    'enables noSelfInFile behaviour for functions ("%s" equivalent to "%s")',
    (expectedParameters, assignmentParameters) => {
        util.testFunction`
            function fooBar(${expectedParameters}) {}

            const test: (${assignmentParameters}) => void = fooBar;
        `
            .setOptions({ noSelf: true })
            .expectToHaveNoDiagnostics();
    }
);

test.each([["foo: string, bar: string", `this: any, foo: string, bar: string`]])(
    'enables noSelfInFile behaviour for methods ("%s" equivalent to "%s")',
    (expectedParameters, assignmentParameters) => {
        util.testFunction`
            class FooBar {
                fooBar(${expectedParameters}) {
                    return foo + bar;
                }
            }
            const fooBar = new FooBar();

            const test: (${assignmentParameters}) => void = fooBar.fooBar;
        `
            .setOptions({ noSelf: true })
            .expectToHaveNoDiagnostics();
    }
);

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
