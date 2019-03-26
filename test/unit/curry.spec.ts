import * as util from "../util";

test.each([{ x: 2, y: 3 }, { x: 5, y: 4 }])("curryingAdd (%p)", ({ x, y }) => {
    const result = util.transpileAndExecute(
        `let add = (x: number) => (y: number) => x + y;
        return add(${x})(${y})`,
    );

    expect(result).toBe(x + y);
});
