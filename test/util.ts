import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import {
    createStringCompilerProgram,
    transpileString as compilerTranspileString,
} from "../src/Compiler";
import { CompilerOptions, LuaLibImportKind, LuaTarget } from "../src/CompilerOptions";
import { LuaTransformer } from "../src/LuaTransformer";

declare global {
    namespace jest {
        interface Matchers<R> {
            toThrowExactError(error: Error): void;
        }
    }
}

expect.extend({
    toThrowExactError(actual: () => void, error: Error): { pass: boolean; message: () => string } {
        if (this.isNot) {
            return { pass: true, message: () => "Inverted toThrowExactError is not implemented" };
        }

        let executionError: Error | undefined;
        try {
            actual();
        } catch (err) {
            executionError = err;
        }

        expect(() => {
            if (executionError) throw executionError;
        }).toThrowError(error);
        expect(() => {
            if (executionError) throw executionError;
        }).toThrowError(error.constructor as ErrorConstructor);

        return { pass: true, message: () => "" };
    },
});

export function transpileString(
    str: string | { [filename: string]: string },
    options: CompilerOptions = {},
    ignoreDiagnostics = true,
    filePath = "file.ts",
): string {
    if (!ignoreDiagnostics) {
        ignoreDiagnostics = Boolean(process.env.JEST_IGNORE_DIAGNOSTICS);
    }

    return compilerTranspileString(
        str,
        {
            luaLibImport: LuaLibImportKind.Require,
            luaTarget: LuaTarget.Lua53,
            target: ts.ScriptTarget.ESNext,
            lib: [
                "lib.es2015.d.ts",
                "lib.es2016.d.ts",
                "lib.es2017.d.ts",
                "lib.es2018.d.ts",
                "lib.esnext.d.ts",
            ],
            noHeader: true,
            ...options,
        },
        ignoreDiagnostics,
        filePath,
    );
}

const lualibContent = fs.readFileSync(
    path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
    "utf8",
);
const minimalTestLib = fs.readFileSync(path.join(__dirname, "json.lua"), "utf8") + "\n";
export function executeLua(luaStr: string, withLib = true): any {
    luaStr = luaStr.replace(/require\("lualib_bundle"\)/g, lualibContent);
    if (withLib) {
        luaStr = minimalTestLib + luaStr;
    }

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    const status = lauxlib.luaL_dostring(L, to_luastring(luaStr));

    if (status === lua.LUA_OK) {
        // Read the return value from stack depending on its type.
        if (lua.lua_isboolean(L, -1)) {
            return lua.lua_toboolean(L, -1);
        } else if (lua.lua_isnil(L, -1)) {
            return undefined;
        } else if (lua.lua_isnumber(L, -1)) {
            return lua.lua_tonumber(L, -1);
        } else if (lua.lua_isstring(L, -1)) {
            return lua.lua_tojsstring(L, -1);
        } else {
            throw new Error(
                "Unsupported lua return type: " +
                    to_jsstring(lua.lua_typename(L, lua.lua_type(L, -1))),
            );
        }
    } else {
        // If the lua VM did not terminate with status code LUA_OK an error occurred.
        // Throw a JS error with the message, retrieved by reading a string from the stack.

        // Filter control characters out of string which are in there because ????
        throw new Error("LUA ERROR: " + to_jsstring(lua.lua_tostring(L, -1).filter(c => c >= 20)));
    }
}

// Get a mock transformer to use for testing
export function makeTestTransformer(target: LuaTarget = LuaTarget.Lua53): LuaTransformer {
    const options = { luaTarget: target };
    return new LuaTransformer(ts.createProgram([], options), options);
}

export function transpileAndExecute(
    tsStr: string,
    compilerOptions?: CompilerOptions,
    luaHeader?: string,
    tsHeader?: string,
    ignoreDiagnostics = process.argv[2] === "--ignoreDiagnostics",
): any {
    const wrappedTsString = `${tsHeader ? tsHeader : ""}
        declare function JSONStringify(this: void, p: any): string;
        function __runTest(this: void): any {${tsStr}}`;

    const lua = `${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, ignoreDiagnostics)}
        return __runTest();`;

    return executeLua(lua);
}

export function transpileExecuteAndReturnExport(
    tsStr: string,
    returnExport: string,
    compilerOptions?: CompilerOptions,
    luaHeader?: string,
): any {
    const wrappedTsString = `declare function JSONStringify(this: void, p: any): string;
        ${tsStr}`;

    const lua = `return (function()
        ${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, false)}
        end)().${returnExport}`;

    return executeLua(lua);
}

export function parseTypeScript(
    typescript: string,
    target: LuaTarget = LuaTarget.Lua53,
): [ts.SourceFile, ts.TypeChecker] {
    const program = createStringCompilerProgram(typescript, { luaTarget: target });
    return [program.getSourceFile("file.ts"), program.getTypeChecker()];
}

export function findFirstChild(
    node: ts.Node,
    predicate: (node: ts.Node) => boolean,
): ts.Node | undefined {
    for (const child of node.getChildren()) {
        if (predicate(child)) {
            return child;
        }

        const childChild = findFirstChild(child, predicate);
        if (childChild !== undefined) {
            return childChild;
        }
    }
    return undefined;
}
