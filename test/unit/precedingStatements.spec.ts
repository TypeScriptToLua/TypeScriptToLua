import * as util from "../util";

test.each([
    { x: 1, op: "&&" },
    { x: false, op: "&&" },
    { x: null, op: "&&" },
    { x: 1, op: "&&=" },
    { x: false, op: "&&=" },
    { x: null, op: "&&=" },
    { x: 1, op: "||" },
    { x: false, op: "||" },
    { x: null, op: "||" },
    { x: 1, op: "||=" },
    { x: false, op: "||=" },
    { x: null, op: "||=" },
    { x: 1, op: "??" },
    { x: false, op: "??" },
    { x: null, op: "??" },
    { x: 1, op: "??=" },
    { x: false, op: "??=" },
    { x: null, op: "??=" },
])("short circuit operator (%p)", input => {
    util.testFunction`
        let x: unknown = ${input.x};
        let y = 1;
        const z = x ${input.op} y++;
        return {x, y, z};
    `.expectToMatchJsResult();
});
