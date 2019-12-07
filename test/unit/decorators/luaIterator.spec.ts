import * as ts from "typescript";
import * as tstl from "../../../src";
import { UnsupportedNonDestructuringLuaIterator } from "../../../src/transformation/utils/errors";
import * as util from "../../util";

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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return single variable", () => {
    const code = `
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        for (let x of luaIter()) {}
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    expect(() => util.transpileString(code, compilerOptions)).toThrowExactError(
        UnsupportedNonDestructuringLuaIterator(util.nodeStub)
    );
});

test("forof lua iterator tuple-return single existing variable", () => {
    const code = `
        /**
         * @luaIterator
         * @tupleReturn
         */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        let x: [string, string];
        for (x of luaIter()) {}
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    expect(() => util.transpileString(code, compilerOptions)).toThrowExactError(
        UnsupportedNonDestructuringLuaIterator(util.nodeStub)
    );
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
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
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});
