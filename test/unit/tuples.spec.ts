import * as util from "../util";

test("Tuple loop", () => {
    const result = util.transpileAndExecute(
        `const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        for (const value of tuple) { count += value; }
        return count;`,
    );

    expect(result).toBe(9);
});

test("Tuple foreach", () => {
    const result = util.transpileAndExecute(
        `const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        tuple.forEach(v => count += v);
        return count;`,
    );

    expect(result).toBe(9);
});

test("Tuple access", () => {
    const result = util.transpileAndExecute(
        `const tuple: [number, number, number] = [3,5,1];
        return tuple[1];`,
    );

    expect(result).toBe(5);
});

test("Tuple union access", () => {
    const result = util.transpileAndExecute(
        `function makeTuple(): [number, number, number] | [string, string, string] { return [3,5,1]; }
        const tuple = makeTuple();
        return tuple[1];`,
    );
    expect(result).toBe(5);
});

test("Tuple intersection access", () => {
    const result = util.transpileAndExecute(
        `type I = [number, number, number] & {foo: string};
        function makeTuple(): I {
            let t = [3,5,1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const tuple = makeTuple();
        return tuple[1];`,
    );
    expect(result).toBe(5);
});

test("Tuple Destruct", () => {
    const result = util.transpileAndExecute(
        `function tuple(): [number, number, number] { return [3,5,1]; }
        const [a,b,c] = tuple();
        return b;`,
    );

    expect(result).toBe(5);
});

test("Tuple Destruct Array Literal", () => {
    const code = `
        const [a,b,c] = [3,5,1];
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Destruct Array Literal Extra Values", () => {
    const code = `
        let result = "";
        const set = () => { result = "bar"; };
        const [a] = ["foo", set()];
        return a + result;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple length", () => {
    const result = util.transpileAndExecute(
        `const tuple: [number, number, number] = [3,5,1];
        return tuple.length;`,
    );

    expect(result).toBe(3);
});

test("Tuple Return Access", () => {
    const code = `
        /** @tupleReturn */
        function tuple(): [number, number, number] { return [3,5,1]; }
        return tuple()[2];`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(1);
});

test("Tuple Return Destruct Declaration", () => {
    const code = `
        /** @tupleReturn */
        function tuple(): [number, number, number] { return [3,5,1]; }
        const [a,b,c] = tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Return Destruct Assignment", () => {
    const code = `
        /** @tupleReturn */
        function tuple(): [number, number] { return [3,6]; }
        let [a,b] = [1,2];
        [b,a] = tuple();
        return a - b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(3);
});

test("Tuple Static Method Return Destruct", () => {
    const code = `
        class Test {
            /** @tupleReturn */
            static tuple(): [number, number, number] { return [3,5,1]; }
        }
        const [a,b,c] = Test.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Static Function Property Return Destruct", () => {
    const code = `
        class Test {
            /** @tupleReturn */
            static tuple: () => [number, number, number] = () => [3,5,1];
        }
        const [a,b,c] = Test.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Non-Static Method Return Destruct", () => {
    const code = `
        class Test {
            /** @tupleReturn */
            tuple(): [number, number, number] { return [3,5,1]; }
        }
        const t = new Test();
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Non-Static Function Property Return Destruct", () => {
    const code = `
        class Test {
            /** @tupleReturn */
            tuple: () => [number, number, number] = () => [3,5,1];
        }
        const t = new Test();
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Interface Method Return Destruct", () => {
    const code = `
        interface Test {
            /** @tupleReturn */
            tuple(): [number, number, number];
        }
        const t: Test = {
            tuple() { return [3,5,1]; }
        };
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Interface Function Property Return Destruct", () => {
    const code = `
        interface Test {
            /** @tupleReturn */
            tuple: () => [number, number, number];
        }
        const t: Test = {
            tuple: () => [3,5,1]
        };
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Object Literal Method Return Destruct", () => {
    const code = `
        const t = {
            /** @tupleReturn */
            tuple() { return [3,5,1]; }
        };
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Object Literal Function Property Return Destruct", () => {
    const code = `
        const t = {
            /** @tupleReturn */
            tuple: () => [3,5,1]
        };
        const [a,b,c] = t.tuple();
        return b;`;

    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(5);
});

test("Tuple Return on Arrow Function", () => {
    const code = `
        const fn = /** @tupleReturn */ (s: string) => [s, "bar"];
        const [a, b] = fn("foo");
        return a + b;
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return Inference", () => {
    const code = `
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        const fn: Fn = s => [s, "bar"];
        const [a, b] = fn("foo");
        return a + b;
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return Inference as Argument", () => {
    const code = `
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(fn: Fn) {
            const [a, b] = fn("foo");
            return a + b;
        }
        return foo(s => [s, "bar"]);
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return Inference as Elipsis Argument", () => {
    const code = `
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(a: number, ...fn: Fn[]) {
            const [a, b] = fn[0]("foo");
            return a + b;
        }
        return foo(7, s => [s, "bar"]);
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return Inference as Elipsis Tuple Argument", () => {
    const code = `
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(a: number, ...fn: [number, Fn]) {
            const [a, b] = fn[1]("foo");
            return a + b;
        }
        return foo(7, 17, s => [s, "bar"]);
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return in Spread", () => {
    const code = `
        /** @tupleReturn */ function foo(): [string, string] {
            return ["foo", "bar"];
        }
        function bar(a: string, b: string) {
            return a + b;
        }
        return bar(...foo());
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("foobar");
});

test("Tuple Return on Type Alias", () => {
    const code = `
        /** @tupleReturn */ type Fn = () => [number, number];
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(3);
});

test("Tuple Return on Interface", () => {
    const code = `
        /** @tupleReturn */ interface Fn { (): [number, number]; }
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(3);
});

test("Tuple Return on Interface Signature", () => {
    const code = `
        interface Fn {
            /** @tupleReturn */ (): [number, number];
        }
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe(3);
});

test("Tuple Return on Overload", () => {
    const code = `
        function fn(a: number): number;
        /** @tupleReturn */ function fn(a: string, b: string): [string, string];
        function fn(a: number | string, b?: string): number | [string, string] {
            if (typeof a === "number") {
                return a;
            } else {
                return [a, b as string];
            }
        }
        const a = fn(3);
        const [b, c] = fn("foo", "bar");
        return a + b + c
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("3foobar");
});

test("Tuple Return on Interface Overload", () => {
    const code = `
        interface Fn {
            (a: number): number;
            /** @tupleReturn */ (a: string, b: string): [string, string];
        }
        const fn = ((a: number | string, b?: string): number | [string, string] => {
            if (typeof a === "number") {
                return a;
            } else {
                return [a, b as string];
            }
        }) as Fn;
        const a = fn(3);
        const [b, c] = fn("foo", "bar");
        return a + b + c
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("3foobar");
});

test("Tuple Return on Interface Method Overload", () => {
    const code = `
        interface Foo {
            foo(a: number): number;
            /** @tupleReturn */ foo(a: string, b: string): [string, string];
        }
        const bar = ({
            foo: (a: number | string, b?: string): number | [string, string] => {
                if (typeof a === "number") {
                    return a;
                } else {
                    return [a, b as string];
                }
            }
        }) as Foo;
        const a = bar.foo(3);
        const [b, c] = bar.foo("foo", "bar");
        return a + b + c
    `;
    const lua = util.transpileString(code);
    expect(lua).not.toContain("unpack");
    const result = util.executeLua(lua);
    expect(result).toBe("3foobar");
});

test("Tuple Return vs Non-Tuple Return Overload", () => {
    const luaHeader = `
        function fn(a, b)
            if type(a) == "number" then
                return {a, a + 1}
            else
                return a, b
            end
        end
    `;
    const tsHeader = `
        declare function fn(this: void, a: number): [number, number];
        /** @tupleReturn */ declare function fn(this: void, a: string, b: string): [string, string];
    `;
    const code = `
        const [a, b] = fn(3);
        const [c, d] = fn("foo", "bar");
        return (a + b) + c + d;
    `;
    const result = util.transpileAndExecute(code, undefined, luaHeader, tsHeader);
    expect(result).toBe("7foobar");
});
