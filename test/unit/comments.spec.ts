import * as util from "../util";

test("JSDoc is copied on a function", () => {
    const builder = util.testModule`
        /**
         * This is a function comment.
         * It has multiple lines.
         */
        function foo() {}
    `.expectToHaveNoDiagnostics();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("This is a function comment.");
});

test("JSDoc is copied on a variable", () => {
    const builder = util.testModule`
        /**
         * This is a variable comment.
         * It has multiple lines.
         */
        const foo = 123;
    `.expectToHaveNoDiagnostics();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("This is a variable comment.");
});
