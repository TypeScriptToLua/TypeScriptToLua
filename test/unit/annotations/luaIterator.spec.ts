import * as util from "../../util";
import { luaIteratorForbiddenUsage } from "../../../src/transformation/utils/diagnostics";

test("forof lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        for (let e of luaIter()) { result += e; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("abc");
});

test("forof array lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Array<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        for (let e of luaIter()) { result += e; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("abc");
});

test("forof lua iterator with existing variable", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        let e: string;
        for (e of luaIter()) { result += e; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("abc");
});

test("forof lua iterator destructuring", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i] && [i.toString(), arr[i++]]) as any;
        }
        let result = "";
        for (let [a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator destructuring with existing variables", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i] && [i.toString(), arr[i++]]) as any;
        }
        let result = "";
        let a: string;
        let b: string;
        for ([a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        let result = "";
        for (let [a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return with existing variables", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        let result = "";
        let a: string;
        let b: string;
        for ([a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return single variable", () => {
    util.testModule`
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        for (let x of luaIter()) {}
    `.expectDiagnosticsToMatchSnapshot([luaIteratorForbiddenUsage.code]);
});

test("forof lua iterator tuple-return single existing variable", () => {
    util.testModule`
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        let x: [string, string];
        for (x of luaIter()) {}
    `.expectDiagnosticsToMatchSnapshot([luaIteratorForbiddenUsage.code]);
});

test("forof forwarded lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            function iter() { return arr[i++]; }
            return iter as any;
        }
        function forward() {
            const iter = luaIter();
            return iter;
        }
        let result = "";
        for (let a of forward()) { result += a; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("abc");
});

test("forof forwarded lua iterator with tupleReturn", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        function forward() {
            const iter = luaIter();
            return iter;
        }
        let result = "";
        for (let [a, b] of forward()) { result += a + b; }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("0a1b2c");
});
