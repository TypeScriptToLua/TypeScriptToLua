import * as util from "../util";

test("Tuple loop", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        for (const value of tuple) { count += value; }
        return count;
    `.expectToMatchJsResult();
});

test("Tuple foreach", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        tuple.forEach(v => count += v);
        return count;
    `.expectToMatchJsResult();
});

test("Tuple access", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple union access", () => {
    util.testFunction`
        function makeTuple(): [number, number, number] | [string, string, string] { return [3,5,1]; }
        const tuple = makeTuple();
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple intersection access", () => {
    util.testFunction`
        type I = [number, number, number] & {foo: string};
        function makeTuple(): I {
            let t = [3,5,1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const tuple = makeTuple();
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple Destruct", () => {
    util.testFunction`
        function tuple(): [number, number, number] { return [3,5,1]; }
        const [a,b,c] = tuple();
        return b;
    `.expectToMatchJsResult();
});

const expectNoUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).not.toContain("unpack");

test("Tuple Destruct Array Literal", () => {
    util.testFunction`
        const [a, b, c] = [3, 5, 1];
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Destruct Array Literal Extra Values", () => {
    util.testFunction`
        let result = "";
        const set = () => { result = "bar"; };
        const [a] = ["foo", set()];
        return a + result;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple length", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3, 5, 1];
        return tuple.length;
    `.expectToMatchJsResult();
});

test("Tuple Return Access", () => {
    util.testFunction`
        /** @tupleReturn */
        function tuple(): [number, number, number] { return [3, 5, 1]; }
        return tuple()[2];
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Destruct Declaration", () => {
    util.testFunction`
        /** @tupleReturn */
        function tuple(): [number, number, number] { return [3,5,1]; }
        const [a,b,c] = tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Destruct Assignment", () => {
    util.testFunction`
        /** @tupleReturn */
        function tuple(): [number, number] { return [3,6]; }
        let [a,b] = [1,2];
        [b,a] = tuple();
        return a - b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Static Method Return Destruct", () => {
    util.testFunction`
        class Test {
            /** @tupleReturn */
            static tuple(): [number, number, number] { return [3,5,1]; }
        }
        const [a,b,c] = Test.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Static Function Property Return Destruct", () => {
    util.testFunction`
        class Test {
            /** @tupleReturn */
            static tuple: () => [number, number, number] = () => [3,5,1];
        }
        const [a,b,c] = Test.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Non-Static Method Return Destruct", () => {
    util.testFunction`
        class Test {
            /** @tupleReturn */
            tuple(): [number, number, number] { return [3,5,1]; }
        }
        const t = new Test();
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Non-Static Function Property Return Destruct", () => {
    util.testFunction`
        class Test {
            /** @tupleReturn */
            tuple: () => [number, number, number] = () => [3,5,1];
        }
        const t = new Test();
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Interface Method Return Destruct", () => {
    util.testFunction`
        interface Test {
            /** @tupleReturn */
            tuple(): [number, number, number];
        }
        const t: Test = {
            tuple() { return [3,5,1]; }
        };
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Interface Function Property Return Destruct", () => {
    util.testFunction`
        interface Test {
            /** @tupleReturn */
            tuple: () => [number, number, number];
        }
        const t: Test = {
            tuple: () => [3,5,1]
        };
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Object Literal Method Return Destruct", () => {
    util.testFunction`
        const t = {
            /** @tupleReturn */
            tuple() { return [3,5,1]; }
        };
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Object Literal Function Property Return Destruct", () => {
    util.testFunction`
        const t = {
            /** @tupleReturn */
            tuple: () => [3,5,1]
        };
        const [a,b,c] = t.tuple();
        return b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Arrow Function", () => {
    util.testFunction`
        const fn = /** @tupleReturn */ (s: string) => [s, "bar"];
        const [a, b] = fn("foo");
        return a + b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Inference", () => {
    util.testFunction`
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        const fn: Fn = s => [s, "bar"];
        const [a, b] = fn("foo");
        return a + b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Inference as Argument", () => {
    util.testFunction`
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(fn: Fn) {
            const [a, b] = fn("foo");
            return a + b;
        }
        return foo(s => [s, "bar"]);
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Inference as Elipsis Argument", () => {
    util.testFunction`
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(_: number, ...fn: Fn[]) {
            const [a, b] = fn[0]("foo");
            return a + b;
        }
        return foo(0, s => [s, "bar"]);
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return Inference as Elipsis Tuple Argument", () => {
    util.testFunction`
        /** @tupleReturn */ interface Fn { (s: string): [string, string] }
        function foo(_: number, ...fn: [number, Fn]) {
            const [a, b] = fn[1]("foo");
            return a + b;
        }
        return foo(0, 0, s => [s, "bar"]);
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return in Spread", () => {
    util.testFunction`
        /** @tupleReturn */ function foo(): [string, string] {
            return ["foo", "bar"];
        }
        function bar(a: string, b: string) {
            return a + b;
        }
        return bar(...foo());
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Type Alias", () => {
    util.testFunction`
        /** @tupleReturn */ type Fn = () => [number, number];
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Interface", () => {
    util.testFunction`
        /** @tupleReturn */ interface Fn { (): [number, number]; }
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Interface Signature", () => {
    util.testFunction`
        interface Fn {
            /** @tupleReturn */ (): [number, number];
        }
        const fn: Fn = () => [1, 2];
        const [a, b] = fn();
        return a + b;
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Overload", () => {
    util.testFunction`
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
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Interface Overload", () => {
    util.testFunction`
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
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
});

test("Tuple Return on Interface Method Overload", () => {
    util.testFunction`
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
    `
        .tap(expectNoUnpack)
        .expectToMatchJsResult();
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

    util.testFunction`
        const [a, b] = fn(3);
        const [c, d] = fn("foo", "bar");
        return (a + b) + c + d;
    `
        .tsHeader(tsHeader)
        .luaHeader(luaHeader)
        .expectToEqual("7foobar");
});
