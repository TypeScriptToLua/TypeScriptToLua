import * as path from "path";
import { transpileFiles } from "../../../src";
import { couldNotResolveRequire } from "../../../src/transpilation/diagnostics";
import * as util from "../../util";

test("enables noSelfInFile behavior for functions", () => {
    util.testFunction`
        function fooBar() {}
        const test: (this: void) => void = fooBar;
        fooBar();
    `
        .setOptions({ noImplicitSelf: true })
        .expectToHaveNoDiagnostics();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1084
test.each(["\\", "/"])("transpileFiles handles paths with noImplicitSelf and %s separator (#1084)", separator => {
    const projectDir = `${path.dirname(path.dirname(__dirname))}${separator}transpile${separator}project`;
    const emittedFiles: Record<string, string> = {};
    const { diagnostics } = transpileFiles(
        [
            `${projectDir}${separator}index.ts`,
            `${projectDir}${separator}api.d.ts`,
            `${projectDir}${separator}otherFile.ts`,
        ],
        { noImplicitSelf: true },
        (fileName, text) => (emittedFiles[fileName] = text)
    );
    expect(diagnostics).toHaveLength(0);
    expect(Object.keys(emittedFiles)).not.toHaveLength(0);
    for (const fileContent of Object.values(emittedFiles)) {
        expect(fileContent).toContain("getNumber()");
        expect(fileContent).not.toContain("getNumber(self)");
        expect(fileContent).not.toContain("getNumber(_G)");
    }
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

    expect(fooDeclaration).toContain("@noSelfInFile");

    util.testModule`
        import { bar } from "./foo";
        const test: (this: void) => void = bar;
    `
        .addExtraFile("foo.d.ts", fooDeclaration)
        .ignoreDiagnostics([couldNotResolveRequire.code]) // no foo implementation in the project to create foo.lua
        .expectToHaveNoDiagnostics();
});
