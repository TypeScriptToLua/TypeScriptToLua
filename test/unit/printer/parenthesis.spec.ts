import * as util from "../../util";

test("binary expression with 'as' type assertion wrapped in parenthesis", () => {
    expect(util.transpileAndExecute("return 2 * (3 - 2 as number);")).toBe(2);
});

test.each([
    "(x as any).foo;",
    "(y.x as any).foo;",
    "(y['x'] as any).foo;",
    "(z() as any).foo;",
    "(y.z() as any).foo;",
    "(<any>x).foo;",
    "(<any>y.x).foo;",
    "(<any>y['x']).foo;",
    "(<any>z()).foo;",
    "(<any>y.z()).foo;",
    "(x as unknown as any).foo;",
    "(<unknown>x as any).foo;",
    "((x as unknown) as any).foo;",
    "((<unknown>x) as any).foo;",
])("'as' type assertion should strip parenthesis (%p)", expression => {
    const code = `
        declare let x: unknown;
        declare let y: { x: unknown; z(this: void): unknown; };
        declare function z(this: void): unknown;
        ${expression}`;

    const lua = util.transpileString(code, undefined, false);
    expect(lua).not.toMatch(/\(.+\)/);
});

test.each([
    "(x + 1 as any).foo;",
    "(!x as any).foo;",
    "(x ** 2 as any).foo;",
    "(x < 2 as any).foo;",
    "(x in y as any).foo;",
    "(<any>x + 1).foo;",
    "(<any>!x).foo;",
    "(x + 1 as unknown as any).foo;",
    "((x + 1 as unknown) as any).foo;",
    "(!x as unknown as any).foo;",
    "((!x as unknown) as any).foo;",
    "(<unknown>!x as any).foo;",
    "((<unknown>!x) as any).foo;",
])("'as' type assertion should not strip parenthesis (%p)", expression => {
    const code = `
        declare let x: number;
        declare let y: {};
        ${expression}`;

    const lua = util.transpileString(code, undefined, false);
    expect(lua).toMatch(/\(.+\)/);
});

test("not operator precedence (%p)", () => {
    const code = `
        const a = true;
        const b = false;
        return !a && b;`;

    expect(util.transpileAndExecute(code)).toBe(false);
});
