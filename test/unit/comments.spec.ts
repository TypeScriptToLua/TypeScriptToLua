import * as util from "../util";

test("JSDoc is copied", () => {
    const builder = util.testModule`
        /**
         * LOL
         */
        function foo() {}
        // POOP
    `
        .expectToHaveNoDiagnostics();

    const transpiledFile = builder.getLuaResult().transpiledFiles[0];
    util.assert(transpiledFile !== undefined);
    const { lua } =  transpiledFile;
    util.assert(lua !== undefined);
    console.log(lua);
    expect(lua).toContain("LOL");
});
