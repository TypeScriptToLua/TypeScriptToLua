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
    util.assert(transpiledFile !== undefined);
    const { lua } = transpiledFile;
    util.assert(lua !== undefined);
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
    util.assert(transpiledFile !== undefined);
    const { lua } = transpiledFile;
    util.assert(lua !== undefined);
    expect(lua).toContain("This is a variable comment.");
});
