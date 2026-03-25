import * as tstl from "../../../src";
import * as util from "../../util";

// In Lua 5.0, 5.1, and LuaJIT, break must be the last statement in a block.
// Any code after break is a syntax error (e.g. `while true do break; local b = 8 end`
// fails with "'end' expected near 'local'"). Lua 5.2+ relaxed this restriction.
// TSTL should strip dead code after break on all targets to avoid these errors.

function expectNoDeadCode(builder: util.TestBuilder) {
    const lua = builder.getMainLuaCodeChunk();
    expect(lua).not.toContain("local b = 8");
}

const affectedVersions: Record<tstl.LuaTarget, ((builder: util.TestBuilder) => void) | boolean> = {
    [tstl.LuaTarget.Universal]: false,
    [tstl.LuaTarget.Lua50]: builder => builder.tap(expectNoDeadCode).expectToMatchJsResult(),
    [tstl.LuaTarget.Lua51]: builder => builder.tap(expectNoDeadCode).expectToMatchJsResult(),
    [tstl.LuaTarget.Lua52]: false,
    [tstl.LuaTarget.Lua53]: false,
    [tstl.LuaTarget.Lua54]: false,
    [tstl.LuaTarget.Lua55]: false,
    [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectNoDeadCode),
    [tstl.LuaTarget.Luau]: false,
};

util.testEachVersion(
    "for dead code after break",
    () => util.testFunction`
        let result = 0;
        for (let i = 0; i < 10; i++) { result = i; break; const b = 8; }
        return result;
    `,
    affectedVersions
);

util.testEachVersion(
    "for..in dead code after break",
    () => util.testFunction`
        let result = "";
        for (let a in {"a": 5, "b": 8}) { result = a; break; const b = 8; }
        return result;
    `,
    affectedVersions
);

util.testEachVersion(
    "for..of dead code after break",
    () => util.testFunction`
        let result = 0;
        for (let a of [1,2,4]) { result = a; break; const b = 8; }
        return result;
    `,
    affectedVersions
);

util.testEachVersion(
    "while dead code after break",
    () => util.testFunction`
        let result = "done";
        while (true) { break; const b = 8; }
        return result;
    `,
    affectedVersions
);

util.testEachVersion(
    "switch dead code after break",
    () => util.testFunction`
        let result = "none";
        switch ("abc" as string) {
            case "def":
                result = "def";
                break;
                let abc = 4;
            case "abc":
                result = "abc";
                break;
                let def = 6;
        }
        return result;
    `,
    affectedVersions
);

util.testEachVersion(
    "do-while dead code after break",
    () => util.testFunction`
        let result = "done";
        do { break; const b = 8; } while (true);
        return result;
    `,
    affectedVersions
);
