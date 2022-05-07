import * as util from "../../util";

test("noImplicitGlobalVariables does not create any global variables", () => {
    const fooBuilder = util.testModule`
        function foo() {}
        const bar = 123;
    `
        .setOptions({ noImplicitGlobalVariables: true })
        .expectToHaveNoDiagnostics();

    const transpiledFile = fooBuilder.getLuaResult().transpiledFiles[0];
    util.assert(transpiledFile !== undefined);
    const { lua } =  transpiledFile;
    util.assert(lua !== undefined);
    expect(lua).toContain("local function foo(");
    expect(lua).toContain("local bar =");
});
