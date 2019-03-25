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

test("Tuple length", () => {
    const result = util.transpileAndExecute(
        `const tuple: [number, number, number] = [3,5,1];
        return tuple.length;`,
    );

    expect(result).toBe(3);
});

test("Tuple Return Access", () => {
    const result = util.transpileAndExecute(
        `/** @tupleReturn */
        function tuple(): [number, number, number] { return [3,5,1]; }
        return tuple()[2];`,
    );

    expect(result).toBe(1);
});

test("Tuple Return Destruct Declaration", () => {
    const result = util.transpileAndExecute(
        `/** @tupleReturn */
        function tuple(): [number, number, number] { return [3,5,1]; }
        const [a,b,c] = tuple();
        return b;`,
    );

    expect(result).toBe(5);
});

test("Tuple Return Destruct Assignment", () => {
    const result = util.transpileAndExecute(
        `/** @tupleReturn */
        function tuple(): [number, number] { return [3,6]; }
        let [a,b] = [1,2];
        [b,a] = tuple();
        return a - b;`,
    );

    expect(result).toBe(3);
});

test("Tuple Static Method Return Destruct", () => {
    const result = util.transpileAndExecute(
        `class Test {
            /** @tupleReturn */
            static tuple(): [number, number, number] { return [3,5,1]; }
        }
        const [a,b,c] = Test.tuple();
        return b;`,
    );

    expect(result).toBe(5);
});

test("Tuple Non-Static Method Return Destruct", () => {
    const result = util.transpileAndExecute(
        `class Test {
            /** @tupleReturn */
            tuple(): [number, number, number] { return [3,5,1]; }
        }
        const t = new Test();
        const [a,b,c] = t.tuple();
        return b;`,
    );

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
