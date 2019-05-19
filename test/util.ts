import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as tstl from "../src";

export const nodeStub = ts.createNode(ts.SyntaxKind.Unknown);

export function transpileString(
    str: string | { [filename: string]: string },
    options: tstl.CompilerOptions = {},
    ignoreDiagnostics = true,
): string {
    const { diagnostics, file } = transpileStringResult(str, options);
    if (!expectToBeDefined(file) || !expectToBeDefined(file.lua)) return "";

    const errors = diagnostics.filter(d => !ignoreDiagnostics || d.source === "typescript-to-lua");
    expect(errors).not.toHaveDiagnostics();

    return file.lua.trim();
}

export function transpileStringResult(
    input: string | Record<string, string>,
    options: tstl.CompilerOptions = {},
): Required<tstl.TranspileStringResult> {
    const optionsWithDefaults = {
        luaTarget: tstl.LuaTarget.Lua53,
        noHeader: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
        lib: ["lib.esnext.d.ts"],
        experimentalDecorators: true,
        ...options,
    };

    const { diagnostics, transpiledFiles } = tstl.transpileVirtualProject(
        typeof input === "string" ? { "main.ts": input } : input,
        optionsWithDefaults,
    );

    const file = transpiledFiles.find(({ fileName }) => /\bmain\.[a-z]+$/.test(fileName));
    if (file === undefined) {
        throw new Error('Program should have a file named "main"');
    }

    return { diagnostics, file };
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
export function makeTestTransformer(luaTarget = tstl.LuaTarget.Lua53): tstl.LuaTransformer {
    return new tstl.LuaTransformer(ts.createProgram([], { luaTarget }));
}

export function transpileAndExecute(
    tsStr: string,
    compilerOptions?: tstl.CompilerOptions,
    luaHeader?: string,
    tsHeader?: string,
): any {
    const wrappedTsString = `${tsHeader ? tsHeader : ""}
        declare function JSONStringify(this: void, p: any): string;
        function __runTest(this: void): any {${tsStr}}`;

    const lua = `${luaHeader ? luaHeader : ""}
        ${transpileString(wrappedTsString, compilerOptions, false)}
        return __runTest();`;

    return executeLua(lua);
}

export function transpileExecuteAndReturnExport(
    tsStr: string,
    returnExport: string,
    compilerOptions?: tstl.CompilerOptions,
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
    target: tstl.LuaTarget = tstl.LuaTarget.Lua53,
): [ts.SourceFile, ts.TypeChecker] {
    const program = tstl.createVirtualProgram({ "main.ts": typescript }, { luaTarget: target });
    const sourceFile = program.getSourceFile("main.ts");

    if (sourceFile === undefined) {
        throw new Error("Could not find source file main.ts in program.");
    }

    return [sourceFile, program.getTypeChecker()];
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

export function expectToBeDefined<T>(subject: T | null | undefined): subject is T {
    expect(subject).toBeDefined();
    expect(subject).not.toBeNull();
    return true; // If this was false the expect would have thrown an error
}

export const valueToString = (value: unknown) =>
    value === Infinity || value === -Infinity || (typeof value === "number" && Number.isNaN(value))
        ? String(value)
        : JSON.stringify(value);

export const valuesToString = (values: unknown[]) => values.map(valueToString).join(", ");
