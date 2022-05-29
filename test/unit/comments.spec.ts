import * as util from "../util";

test("Single-line JSDoc is copied on a function", () => {
    const builder = util.testModule`
        /** This is a function comment. */
        function foo() {}
    `
        .expectToHaveNoDiagnostics()
        .expectDiagnosticsToMatchSnapshot();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("This is a function comment.");
});

test("Multi-line JSDoc with one block is copied on a function", () => {
    const builder = util.testModule`
        /**
         * This is a function comment.
         * It has more than one line.
         */
        function foo() {}
    `
        .expectToHaveNoDiagnostics()
        .expectDiagnosticsToMatchSnapshot();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("It has more than one line.");
});

test("Multi-line JSDoc with two blocks is copied on a function", () => {
    const builder = util.testModule`
        /**
         * This is a function comment.
         * It has more than one line.
         *
         * It also has more than one block.
         */
        function foo() {}
    `
        .expectToHaveNoDiagnostics()
        .expectDiagnosticsToMatchSnapshot();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("It also has more than one block.");
});

test("JSDoc is copied on a function with tags", () => {
    const builder = util.testModule`
        /**
         * This is a function comment.
         * It has multiple lines.
         *
         * @param arg1 This is the first argument.
         * @param arg2 This is the second argument.
         * @returns A very powerful string.
         */
        function foo(arg1: boolean, arg2: number): string {
            return "bar";
        }
    `
        .expectToHaveNoDiagnostics()
        .expectDiagnosticsToMatchSnapshot();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("This is the first argument.");
    expect(lua).toContain("This is the second argument.");
    expect(lua).toContain("A very powerful string.");
});

test("JSDoc is copied on a variable", () => {
    const builder = util.testModule`
        /** This is a variable comment. */
        const foo = 123;
    `
        .expectToHaveNoDiagnostics()
        .expectDiagnosticsToMatchSnapshot();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    expect(transpiledFile).toBeDefined();
    const { lua } = transpiledFile;
    expect(lua).toBeDefined();
    expect(lua).toContain("This is a variable comment.");
});
