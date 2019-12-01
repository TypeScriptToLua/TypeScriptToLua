import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as tstl from "../src";
import { formatPathToLuaPath } from "../src/utils";

export function transpileString(
    str: string | { [filename: string]: string },
    options: tstl.CompilerOptions = {},
    ignoreDiagnostics = true
): string {
    const { diagnostics, file } = transpileStringResult(str, options);
    expect(file.lua).toBeDefined();

    const errors = diagnostics.filter(d => !ignoreDiagnostics || d.source === "typescript-to-lua");
    expect(errors).not.toHaveDiagnostics();

    return file.lua!.trim();
}

export function transpileStringsAsProject(
    input: Record<string, string>,
    options: tstl.CompilerOptions = {}
): tstl.TranspileResult {
    const optionsWithDefaults = {
        luaTarget: tstl.LuaTarget.Lua53,
        noHeader: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
        lib: ["lib.esnext.d.ts"],
        experimentalDecorators: true,
        ...options,
    };

    return tstl.transpileVirtualProject(input, optionsWithDefaults);
}

export function transpileStringResult(
    input: string | Record<string, string>,
    options: tstl.CompilerOptions = {}
): Required<tstl.TranspileStringResult> {
    const { diagnostics, transpiledFiles } = transpileStringsAsProject(
        typeof input === "string" ? { "main.ts": input } : input,
        options
    );

    const file = transpiledFiles.find(({ fileName }) => /\bmain\.[a-z]+$/.test(fileName));
    if (file === undefined) {
        throw new Error('Program should have a file named "main"');
    }

    return { diagnostics, file };
}

const lualibContent = fs.readFileSync(path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"), "utf8");
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
            throw new Error("Unsupported lua return type: " + to_jsstring(lua.lua_typename(L, lua.lua_type(L, -1))));
        }
    } else {
        // If the lua VM did not terminate with status code LUA_OK an error occurred.
        // Throw a JS error with the message, retrieved by reading a string from the stack.

        // Filter control characters out of string which are in there because ????
        throw new Error("LUA ERROR: " + to_jsstring(lua.lua_tostring(L, -1).filter(c => c >= 20)));
    }
}

export function transpileAndExecute(
    tsStr: string,
    compilerOptions?: tstl.CompilerOptions,
    luaHeader?: string,
    tsHeader?: string
): any {
    const wrappedTsString = `${tsHeader ? tsHeader : ""}
        declare function JSONStringify(this: void, p: any): string;
        function __runTest(this: void): any {${tsStr}}`;

    const lua = `${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, false)}
        return __runTest();`;

    return executeLua(lua);
}

function getExportPath(fileName: string, options: ts.CompilerOptions): string {
    const rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(".");

    const absolutePath = path.resolve(fileName.replace(/.ts$/, ""));
    const absoluteRootDirPath = path.format(path.parse(rootDir));
    return formatPathToLuaPath(absolutePath.replace(absoluteRootDirPath, "").slice(1));
}

export function transpileAndExecuteProjectReturningMainExport(
    typeScriptFiles: Record<string, string>,
    exportName: string,
    options: tstl.CompilerOptions = {}
): [any, string] {
    const mainFile = Object.keys(typeScriptFiles).find(typeScriptFileName => typeScriptFileName === "main.ts");
    if (!mainFile) {
        throw new Error("An entry point file needs to be specified. This should be called main.ts");
    }

    const joinedTranspiledFiles = Object.keys(typeScriptFiles)
        .filter(typeScriptFileName => typeScriptFileName !== "main.ts")
        .map(typeScriptFileName => {
            const modulePath = getExportPath(typeScriptFileName, options);
            const tsCode = typeScriptFiles[typeScriptFileName];
            const luaCode = transpileString(tsCode, options);
            return `package.preload["${modulePath}"] = function()
                ${luaCode}
            end`;
        })
        .join("\n");

    const luaCode = `return (function()
        ${joinedTranspiledFiles}
        ${transpileString(typeScriptFiles[mainFile])}
    end)().${exportName}`;

    try {
        return [executeLua(luaCode), luaCode];
    } catch (err) {
        throw new Error(`
            Encountered an error when executing the following Lua code:

            ${luaCode}

            ${err}
        `);
    }
}

export function transpileExecuteAndReturnExport(
    tsStr: string,
    returnExport: string,
    compilerOptions?: tstl.CompilerOptions,
    luaHeader?: string
): any {
    const wrappedTsString = `declare function JSONStringify(this: void, p: any): string;
        ${tsStr}`;

    const lua = `return (function()
        ${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, false)}
        end)().${returnExport}`;

    return executeLua(lua);
}
