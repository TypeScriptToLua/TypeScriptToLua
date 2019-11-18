import * as util from "../../util";

test("enables noSelfInFile behaviour for functions", () => {
    util.testFunction`
        function fooBar() {}
        const test: (this: void) => void = fooBar;
    `
        .setOptions({ noImplicitSelf: true })
        .expectToHaveNoErrorDiagnostics();
});

test("enables noSelfInFile behaviour for methods", () => {
    util.testFunction`
        class FooBar {
            fooBar() {}
        }
        const fooBar = new FooBar();
        const test: (this: any) => void = fooBar.fooBar;
    `
        .setOptions({ noImplicitSelf: true })
        .expectToHaveNoErrorDiagnostics();
});

test("generates declaration files with @noSelfInFile", () => {
    const builder = util.testModule`
        export function bar() {}
    `
        .setOptions({ declaration: true, noImplicitSelf: true })
        .expectToHaveNoErrorDiagnostics();

    const declarationFile = builder.getLuaResult().transpiledFiles.find(f => f.declaration);
    if (!util.expectToBeDefined(declarationFile) || !util.expectToBeDefined(declarationFile.declaration)) return;

    util.testModule`
        import { bar } from "./foo.d";
        const test: (this: void) => void = bar;
    `
        .addExtraFile("foo.d.ts", declarationFile.declaration)
        .expectToHaveNoErrorDiagnostics();
});
