import * as util from "../../util";

test("enables noSelfInFile behavior for functions", () => {
    util.testFunction`
        function fooBar() {}
        const test: (this: void) => void = fooBar;
    `
        .setOptions({ noImplicitSelf: true })
        .expectToHaveNoDiagnostics();
});

test("enables noSelfInFile behavior for methods", () => {
    util.testFunction`
        class FooBar {
            fooBar() {}
        }
        const fooBar = new FooBar();
        const test: (this: any) => void = fooBar.fooBar;
    `
        .setOptions({ noImplicitSelf: true })
        .expectToHaveNoDiagnostics();
});

test("generates declaration files with @noSelfInFile", () => {
    const fooBuilder = util.testModule`
        export function bar() {}
    `
        .setOptions({ declaration: true, noImplicitSelf: true })
        .expectToHaveNoDiagnostics();

    const fooDeclaration = fooBuilder.getLuaResult().transpiledFiles.find(f => f.declaration)?.declaration;
    util.assert(fooDeclaration !== undefined);

    util.testModule`
        import { bar } from "./foo.d";
        const test: (this: void) => void = bar;
    `
        .addExtraFile("foo.d.ts", fooDeclaration)
        .expectToHaveNoDiagnostics();
});
