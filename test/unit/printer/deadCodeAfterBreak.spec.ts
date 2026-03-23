import * as util from "../../util";

// In Lua 5.0, 5.1, and LuaJIT, break must be the last statement in a block.
// Any code after break is a syntax error (e.g. `while true do break; local b = 8 end`
// fails with "'end' expected near 'local'"). Lua 5.2+ relaxed this restriction.
// TSTL should strip dead code after break on all targets to avoid these errors.

util.testEachVersion(
    "for dead code after break",
    () => util.testFunction`
        for (let i = 0; i < 10; i++) { break; const b = 8; }
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);

util.testEachVersion(
    "for..in dead code after break",
    () => util.testFunction`
        for (let a in {"a": 5, "b": 8}) { break; const b = 8; }
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);

util.testEachVersion(
    "for..of dead code after break",
    () => util.testFunction`
        for (let a of [1,2,4]) { break; const b = 8; }
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);

util.testEachVersion(
    "while dead code after break",
    () => util.testFunction`
        while (true) { break; const b = 8; }
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);

util.testEachVersion(
    "switch dead code after break",
    () => util.testFunction`
        switch ("abc" as string) {
            case "def":
                break;
                let abc = 4;
            case "abc":
                break;
                let def = 6;
        }
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);

util.testEachVersion(
    "do-while dead code after break",
    () => util.testFunction`
        do { break; const b = 8; } while (true);
    `,
    util.expectEachVersionExceptJit(builder => builder.expectNoExecutionError())
);
