import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as vm from "vm";
import * as prettyFormat from "pretty-format";
import * as tstl from "../src";

export const nodeStub = ts.createNode(ts.SyntaxKind.Unknown);

export function transpileString(
    str: string | { [filename: string]: string },
    options: tstl.CompilerOptions = {},
    ignoreDiagnostics = true
): string {
    const { diagnostics, file } = transpileStringResult(str, options);
    if (!expectToBeDefined(file) || !expectToBeDefined(file.lua)) return "";

    const errors = diagnostics.filter(d => !ignoreDiagnostics || d.source === "typescript-to-lua");
    expect(errors).not.toHaveDiagnostics();

    return file.lua.trim();
}

export function transpileStringResult(
    input: string | Record<string, string>,
    options: tstl.CompilerOptions = {}
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
        optionsWithDefaults
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

// Get a mock transformer to use for testing
export function makeTestTransformer(luaTarget = tstl.LuaTarget.Lua53): tstl.LuaTransformer {
    return new tstl.LuaTransformer(ts.createProgram([], { luaTarget }));
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

export function parseTypeScript(
    typescript: string,
    target: tstl.LuaTarget = tstl.LuaTarget.Lua53
): [ts.SourceFile, ts.TypeChecker] {
    const program = tstl.createVirtualProgram({ "main.ts": typescript }, { luaTarget: target });
    const sourceFile = program.getSourceFile("main.ts");

    if (sourceFile === undefined) {
        throw new Error("Could not find source file main.ts in program.");
    }

    return [sourceFile, program.getTypeChecker()];
}

export function findFirstChild(node: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node | undefined {
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
    (typeof value === "number" && (!Number.isFinite(value) || Number.isNaN(value))) || typeof value === "function"
        ? String(value)
        : JSON.stringify(value);

export const valuesToString = (values: unknown[]) => values.map(valueToString).join(", ");

interface TranspiledJsFile {
    fileName: string;
    js?: string;
    sourceMap?: string;
}

interface TranspileJsResult {
    diagnostics: ts.Diagnostic[];
    transpiledFiles: TranspiledJsFile[];
}

function transpileJs(program: ts.Program): TranspileJsResult {
    const transpiledFiles: TranspiledJsFile[] = [];
    // TODO: Included in TS3.5
    type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
    const updateTranspiledFile = (fileName: string, update: Omit<TranspiledJsFile, "fileName">) => {
        const file = transpiledFiles.find(f => f.fileName === fileName);
        if (file) {
            Object.assign(file, update);
        } else {
            transpiledFiles.push({ fileName, ...update });
        }
    };

    const { diagnostics } = program.emit(undefined, (fileName, data, _bom, _onError, sourceFiles = []) => {
        for (const sourceFile of sourceFiles) {
            const isJs = fileName.endsWith(".js");
            const isSourceMap = fileName.endsWith(".js.map");
            if (isJs || isSourceMap) {
                updateTranspiledFile(sourceFile.fileName, { js: data });
            } else if (isSourceMap) {
                updateTranspiledFile(sourceFile.fileName, { sourceMap: data });
            }
        }
    });

    return { transpiledFiles, diagnostics: [...diagnostics] };
}

const memoize: MethodDecorator = (_target, _propertyKey, descriptor) => {
    const originalFunction = descriptor.value as any;
    const memoized = new WeakMap<object, any>();
    descriptor.value = function(this: any, ...args: any[]): any {
        if (!memoized.has(this)) {
            memoized.set(this, originalFunction.apply(this, args));
        }

        return memoized.get(this);
    } as any;
    return descriptor;
};

export class ExecutionError extends Error {
    public name = "ExecutionError";
    constructor(message: string) {
        super(message);
    }
}

export type TapCallback = (builder: TestBuilder) => void;
export class TestBuilder {
    protected accessor = "";
    constructor(protected _tsCode: string) {}

    // Options

    // TODO: Use testModule in these cases?
    protected tsHeader = "";
    public setTsHeader(tsHeader: string): this {
        expect(this._hasProgram).toBe(false);
        this.tsHeader = tsHeader;
        return this;
    }

    private luaHeader = "";
    public setLuaHeader(luaHeader: string): this {
        expect(this._hasProgram).toBe(false);
        this.luaHeader += luaHeader;
        return this;
    }

    private jsHeader = "";
    public setJsHeader(jsHeader: string): this {
        expect(this._hasProgram).toBe(false);
        this.jsHeader += jsHeader;
        return this;
    }

    private semanticCheck = true;
    public disableSemanticCheck(): this {
        expect(this._hasProgram).toBe(false);
        this.semanticCheck = false;
        return this;
    }

    private options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.Lua53,
        noHeader: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2017,
        lib: ["lib.esnext.d.ts"],
        experimentalDecorators: true,
    };
    public setOptions(options: tstl.CompilerOptions = {}): this {
        expect(this._hasProgram).toBe(false);
        Object.assign(this.options, options);
        return this;
    }

    protected mainFileName = "main.ts";
    public setMainFileName(mainFileName: string): this {
        expect(this._hasProgram).toBe(false);
        this.mainFileName = mainFileName;
        return this;
    }

    private extraFiles: Record<string, string> = {};
    public addExtraFile(fileName: string, code: string): this {
        expect(this._hasProgram).toBe(false);
        this.extraFiles[fileName] = code;
        return this;
    }

    // Transpilation and execution

    public getTsCode(): string {
        return `${this.tsHeader}${this._tsCode}`;
    }

    private _hasProgram = false;
    @memoize
    public getProgram(): ts.Program {
        this._hasProgram = true;
        return tstl.createVirtualProgram({ ...this.extraFiles, [this.mainFileName]: this.getTsCode() }, this.options);
    }

    @memoize
    public getLuaResult(): tstl.TranspileResult {
        const program = this.getProgram();
        const result = tstl.transpile({ program });
        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...ts.getPreEmitDiagnostics(program),
            ...result.diagnostics,
        ]);

        return { ...result, diagnostics: [...diagnostics] };
    }

    @memoize
    public getMainLuaCodeChunk(): string {
        const { transpiledFiles } = this.getLuaResult();
        const mainFile = transpiledFiles.find(x => x.fileName === this.mainFileName);
        expect(mainFile).toBeDefined();

        const header = this.luaHeader ? `${this.luaHeader.trimRight()}\n` : "";
        return header + mainFile!.lua!.trimRight();
    }

    @memoize
    private getLuaCodeWithWrapper(): string {
        let code = this.getMainLuaCodeChunk();
        if (code.includes('require("lualib_bundle")')) {
            code = `package.preload.lualib_bundle = function()\n${lualibContent}\nend\n${code}`;
        }

        return `${minimalTestLib}\nreturn JSONStringify((function()\n${code}\nend)()${this.accessor})`;
    }

    @memoize
    public getLuaExecutionResult(): any {
        const code = this.getLuaCodeWithWrapper();
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        const status = lauxlib.luaL_dostring(L, to_luastring(code));

        if (status === lua.LUA_OK) {
            if (lua.lua_isstring(L, -1)) {
                const result = eval(`(${lua.lua_tojsstring(L, -1)})`);
                return result === null ? undefined : result;
            } else {
                const returnType = to_jsstring(lua.lua_typename(L, lua.lua_type(L, -1)));
                throw new Error(`Unsupported Lua return type: ${returnType}`);
            }
        } else {
            const message = to_jsstring(lua.lua_tostring(L, -1)).replace(/^\[string "--\.\.\."\]:\d+: /, "");
            return new ExecutionError(message);
        }
    }

    @memoize
    public getJsResult(): TranspileJsResult {
        const program = this.getProgram();
        program.getCompilerOptions().module = ts.ModuleKind.CommonJS;
        return transpileJs(program);
    }

    @memoize
    protected getJsCode(): string {
        const { transpiledFiles } = this.getJsResult();
        const mainFile = transpiledFiles.find(x => x.fileName === this.mainFileName);
        expect(mainFile).toBeDefined();

        const header = this.jsHeader ? `${this.jsHeader.trimRight()}\n` : "";
        return header + mainFile!.js! + `;module.exports = exports${this.accessor}`;
    }

    @memoize
    public getJsExecutionResult(): any {
        const exports = {};
        const context = vm.createContext({ exports, module: { exports } });
        context.global = context;
        try {
            return vm.runInContext(this.getJsCode(), context);
        } catch (error) {
            return new ExecutionError(error.message);
        }
    }

    // Utilities

    private getLuaDiagnostics(): ts.Diagnostic[] {
        const { diagnostics } = this.getLuaResult();
        return diagnostics.filter(d => this.semanticCheck || d.source === "typescript-to-lua");
    }

    // Actions

    public debug(): this {
        const luaCode = this.getMainLuaCodeChunk().replace(/(^|\n)/g, "\n    ");
        const value = prettyFormat(this.getLuaExecutionResult());
        console.log(`Lua Code:${luaCode}\nValue: ${value}`);
        return this;
    }

    public expectToHaveDiagnostics(): this {
        expect(this.getLuaDiagnostics()).toHaveDiagnostics();
        return this;
    }

    public expectToHaveDiagnosticOfError(error: tstl.TranspileError): this {
        this.expectToHaveDiagnostics();
        expect(this.getLuaDiagnostics()).toHaveLength(1);
        const firstDiagnostic = this.getLuaDiagnostics()[0];
        expect(firstDiagnostic).toMatchObject({ messageText: error.message });
        return this;
    }

    public expectToHaveNoDiagnostics(): this {
        expect(this.getLuaDiagnostics()).not.toHaveDiagnostics();
        return this;
    }

    public expectNoExecutionError(): this {
        const luaResult = this.getLuaExecutionResult();
        if (luaResult instanceof ExecutionError) {
            throw luaResult;
        }

        return this;
    }

    public expectToMatchJsResult(allowErrors = false): this {
        this.expectToHaveNoDiagnostics();
        if (!allowErrors) this.expectNoExecutionError();

        const luaResult = this.getLuaExecutionResult();
        const jsResult = this.getJsExecutionResult();
        // tslint:disable-next-line: no-null-keyword
        if (luaResult !== undefined || jsResult != null) {
            expect(luaResult).toEqual(jsResult);
        }

        return this;
    }

    public expectToEqual(expected: any): this {
        this.expectToHaveNoDiagnostics();
        const luaResult = this.getLuaExecutionResult();
        expect(luaResult).toEqual(expected);
        return this;
    }

    public expectLuaToMatchSnapshot(): this {
        this.expectToHaveNoDiagnostics();
        expect(this.getMainLuaCodeChunk()).toMatchSnapshot();
        return this;
    }

    public expectResultToMatchSnapshot(): this {
        this.expectToHaveNoDiagnostics();
        expect(this.getLuaExecutionResult()).toMatchSnapshot();
        return this;
    }

    public tap(callback: TapCallback): this {
        callback(this);
        return this;
    }
}

class ModuleTestBuilder extends TestBuilder {
    public setExport(name: string): this {
        this.accessor = `.${name}`;
        return this;
    }
}

class FunctionTestBuilder extends TestBuilder {
    protected accessor = ".__main()";
    public getTsCode(): string {
        return `${this.tsHeader}export function __main() {${this._tsCode}}`;
    }
}

class ExpressionTestBuilder extends TestBuilder {
    protected accessor = ".__result";
    public getTsCode(): string {
        return `${this.tsHeader}export const __result = ${this._tsCode};`;
    }
}

const createTestBuilderFactory = <T extends TestBuilder>(
    builderClass: new (_tsCode: string) => T,
    serializeSubstitutions: boolean
) => (...args: [string] | [TemplateStringsArray, ...any[]]): T => {
    let tsCode: string;
    if (typeof args[0] === "string") {
        expect(serializeSubstitutions).toBe(false);
        tsCode = args[0];
    } else {
        let [template, ...substitutions] = args;
        if (serializeSubstitutions) {
            substitutions = substitutions.map(valueToString);
        }

        tsCode = template
            .map((chunk, index) => (substitutions[index - 1] !== undefined ? substitutions[index - 1] : "") + chunk)
            .join("");
    }

    return new builderClass(tsCode);
};

export const testModule = createTestBuilderFactory(ModuleTestBuilder, false);
export const testModuleTemplate = createTestBuilderFactory(ModuleTestBuilder, true);
export const testFunction = createTestBuilderFactory(FunctionTestBuilder, false);
export const testFunctionTemplate = createTestBuilderFactory(FunctionTestBuilder, true);
export const testExpression = createTestBuilderFactory(ExpressionTestBuilder, false);
export const testExpressionTemplate = createTestBuilderFactory(ExpressionTestBuilder, true);
