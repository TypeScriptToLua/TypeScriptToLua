/* eslint-disable jest/no-standalone-expect */
import * as nativeAssert from "assert";
import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import { stringify } from "javascript-stringify";
import * as path from "path";
import * as prettyFormat from "pretty-format";
import * as ts from "typescript";
import * as vm from "vm";
import * as tstl from "../src";
import { createEmitOutputCollector } from "../src/transpilation/output-collector";

export * from "./legacy-utils";

// Using `test` directly makes eslint-plugin-jest consider this file as a test
const defineTest = test;

export function assert(value: any, message?: string | Error): asserts value {
    nativeAssert(value, message);
}

export const formatCode = (...values: unknown[]) => values.map(e => stringify(e)).join(", ");

export function testEachVersion<T extends TestBuilder>(
    name: string | undefined,
    common: () => T,
    special?: Record<tstl.LuaTarget, ((builder: T) => void) | boolean>
): void {
    for (const version of Object.values(tstl.LuaTarget) as tstl.LuaTarget[]) {
        const specialBuilder = special?.[version];
        if (specialBuilder === false) return;

        const testName = name === undefined ? version : `${name} [${version}]`;
        defineTest(testName, () => {
            const builder = common();
            builder.setOptions({ luaTarget: version });
            if (typeof specialBuilder === "function") {
                specialBuilder(builder);
            }
        });
    }
}

function executeLua(code: string): any {
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
        // Filter out control characters appearing on some systems
        const luaStackString = lua.lua_tostring(L, -1).filter(c => c >= 20);
        const message = to_jsstring(luaStackString).replace(/^\[string "--\.\.\."\]:\d+: /, "");
        return new ExecutionError(message);
    }
}

const minimalTestLib = fs.readFileSync(path.join(__dirname, "json.lua"), "utf8");
const lualibContent = fs.readFileSync(path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"), "utf8");
export function executeLuaModule(code: string): any {
    const lualibImport = code.includes('require("lualib_bundle")')
        ? `package.preload.lualib_bundle = function()\n${lualibContent}\nend`
        : "";

    return executeLua(`${minimalTestLib}\n${lualibImport}\nreturn JSONStringify((function()\n${code}\nend)())`);
}

function executeJsModule(code: string): any {
    const exports = {};
    const context = vm.createContext({ exports, module: { exports } });
    context.global = context;
    let result: unknown;
    try {
        result = vm.runInContext(code, context);
    } catch (error) {
        return new ExecutionError(error.message);
    }

    function transform(currentValue: any): any {
        if (currentValue === null) {
            return undefined;
        }

        if (Array.isArray(currentValue)) {
            return currentValue.map(transform);
        }

        if (typeof currentValue === "object") {
            for (const [key, value] of Object.entries(currentValue)) {
                currentValue[key] = transform(value);
                if (currentValue[key] === undefined) {
                    delete currentValue[key];
                }
            }

            if (Object.keys(currentValue).length === 0) {
                return [];
            }
        }

        return currentValue;
    }

    return transform(result);
}

const memoize: MethodDecorator = (_target, _propertyKey, descriptor) => {
    const originalFunction = descriptor.value as any;
    const memoized = new WeakMap();
    descriptor.value = function (this: any, ...args: any[]): any {
        if (!memoized.has(this)) {
            memoized.set(this, originalFunction.apply(this, args));
        }

        return memoized.get(this);
    } as any;
    return descriptor;
};

export class ExecutionError extends Error {
    public name = "ExecutionError";
    // https://github.com/typescript-eslint/typescript-eslint/issues/1131
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(message: string) {
        super(message);
    }
}

export type ExecutableTranspiledFile = tstl.TranspiledFile & { lua: string; luaSourceMap: string };
export type TapCallback = (builder: TestBuilder) => void;
export abstract class TestBuilder {
    constructor(protected _tsCode: string) {}

    // Options

    // TODO: Use testModule in these cases?
    protected tsHeader = "";
    public setTsHeader(tsHeader: string): this {
        expect(this.hasProgram).toBe(false);
        this.tsHeader = tsHeader;
        return this;
    }

    private luaHeader = "";
    public setLuaHeader(luaHeader: string): this {
        expect(this.hasProgram).toBe(false);
        this.luaHeader += luaHeader;
        return this;
    }

    protected jsHeader = "";
    public setJsHeader(jsHeader: string): this {
        expect(this.hasProgram).toBe(false);
        this.jsHeader += jsHeader;
        return this;
    }

    protected abstract getLuaCodeWithWrapper: (code: string) => string;
    public setLuaFactory(luaFactory: (code: string) => string): this {
        expect(this.hasProgram).toBe(false);
        this.getLuaCodeWithWrapper = luaFactory;
        return this;
    }

    private semanticCheck = true;
    public disableSemanticCheck(): this {
        expect(this.hasProgram).toBe(false);
        this.semanticCheck = false;
        return this;
    }

    private options: tstl.CompilerOptions = {
        luaTarget: tstl.LuaTarget.Lua53,
        noHeader: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2017,
        lib: ["lib.esnext.d.ts"],
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        resolveJsonModule: true,
        experimentalDecorators: true,
        sourceMap: true,
    };
    public setOptions(options: tstl.CompilerOptions = {}): this {
        expect(this.hasProgram).toBe(false);
        Object.assign(this.options, options);
        return this;
    }

    protected mainFileName = "main.ts";
    public setMainFileName(mainFileName: string): this {
        expect(this.hasProgram).toBe(false);
        this.mainFileName = mainFileName;
        return this;
    }

    private extraFiles: Record<string, string> = {};
    public addExtraFile(fileName: string, code: string): this {
        expect(this.hasProgram).toBe(false);
        this.extraFiles[fileName] = code;
        return this;
    }

    private customTransformers?: ts.CustomTransformers;
    public setCustomTransformers(customTransformers?: ts.CustomTransformers): this {
        expect(this.hasProgram).toBe(false);
        this.customTransformers = customTransformers;
        return this;
    }

    // Transpilation and execution

    public getTsCode(): string {
        return `${this.tsHeader}${this._tsCode}`;
    }

    protected hasProgram = false;
    @memoize
    public getProgram(): ts.Program {
        this.hasProgram = true;
        return tstl.createVirtualProgram({ ...this.extraFiles, [this.mainFileName]: this.getTsCode() }, this.options);
    }

    @memoize
    public getLuaResult(): tstl.TranspileVirtualProjectResult {
        const program = this.getProgram();
        const collector = createEmitOutputCollector();
        const { diagnostics: transpileDiagnostics } = new tstl.Transpiler().emit({
            program,
            customTransformers: this.customTransformers,
            writeFile: collector.writeFile,
        });

        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...ts.getPreEmitDiagnostics(program),
            ...transpileDiagnostics,
        ]);

        return { diagnostics: [...diagnostics], transpiledFiles: collector.files };
    }

    @memoize
    public getMainLuaFileResult(): ExecutableTranspiledFile {
        const { transpiledFiles } = this.getLuaResult();
        const mainFile = this.options.luaBundle
            ? transpiledFiles[0]
            : transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === this.mainFileName));
        expect(mainFile).toMatchObject({ lua: expect.any(String), luaSourceMap: expect.any(String) });
        return mainFile as ExecutableTranspiledFile;
    }

    @memoize
    public getMainLuaCodeChunk(): string {
        const header = this.luaHeader ? `${this.luaHeader.trimRight()}\n` : "";
        return header + this.getMainLuaFileResult().lua.trimRight();
    }

    @memoize
    public getLuaExecutionResult(): any {
        return executeLuaModule(this.getLuaCodeWithWrapper(this.getMainLuaCodeChunk()));
    }

    @memoize
    public getJsResult(): tstl.TranspileVirtualProjectResult {
        const program = this.getProgram();
        program.getCompilerOptions().module = ts.ModuleKind.CommonJS;

        const collector = createEmitOutputCollector();
        const { diagnostics } = program.emit(undefined, collector.writeFile);
        return { transpiledFiles: collector.files, diagnostics: [...diagnostics] };
    }

    @memoize
    protected getMainJsCodeChunk(): string {
        const { transpiledFiles } = this.getJsResult();
        const code = transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === this.mainFileName))
            ?.js;
        assert(code !== undefined);

        const header = this.jsHeader ? `${this.jsHeader.trimRight()}\n` : "";
        return header + code;
    }

    protected abstract getJsCodeWithWrapper(): string;

    @memoize
    public getJsExecutionResult(): any {
        return executeJsModule(this.getJsCodeWithWrapper());
    }

    // Utilities

    private getLuaDiagnostics(): ts.Diagnostic[] {
        const { diagnostics } = this.getLuaResult();
        return diagnostics.filter(d => this.semanticCheck || d.source === "typescript-to-lua");
    }

    // Actions

    public debug(): this {
        const luaCode = this.getMainLuaCodeChunk().replace(/^/gm, "  ");
        const value = prettyFormat(this.getLuaExecutionResult()).replace(/^/gm, "  ");
        console.log(`Lua Code:\n${luaCode}\n\nValue:\n${value}`);
        return this;
    }

    private diagnosticsChecked = false;

    public expectToHaveDiagnostics(expected?: number[]): this {
        if (this.diagnosticsChecked) return this;
        this.diagnosticsChecked = true;

        expect(this.getLuaDiagnostics()).toHaveDiagnostics(expected);
        return this;
    }

    public expectToHaveNoDiagnostics(): this {
        if (this.diagnosticsChecked) return this;
        this.diagnosticsChecked = true;

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
        expect(luaResult).toEqual(jsResult);

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

    public expectDiagnosticsToMatchSnapshot(expected?: number[], diagnosticsOnly = false): this {
        this.expectToHaveDiagnostics(expected);

        const diagnosticMessages = ts.formatDiagnostics(
            this.getLuaDiagnostics().map(tstl.prepareDiagnosticForFormatting),
            { getCurrentDirectory: () => "", getCanonicalFileName: fileName => fileName, getNewLine: () => "\n" }
        );

        expect(diagnosticMessages.trim()).toMatchSnapshot("diagnostics");
        if (!diagnosticsOnly) {
            expect(this.getMainLuaCodeChunk()).toMatchSnapshot("code");
        }

        return this;
    }

    public tap(callback: TapCallback): this {
        callback(this);
        return this;
    }
}

class AccessorTestBuilder extends TestBuilder {
    protected accessor = "";

    protected getLuaCodeWithWrapper = (code: string) => `return (function()\n${code}\nend)()${this.accessor}`;

    @memoize
    protected getJsCodeWithWrapper(): string {
        return this.getMainJsCodeChunk() + `\n;module.exports = module.exports${this.accessor}`;
    }
}

class BundleTestBuilder extends AccessorTestBuilder {
    constructor(_tsCode: string) {
        super(_tsCode);
        this.setOptions({ luaBundle: "main.lua", luaBundleEntry: this.mainFileName });
    }

    public setEntryPoint(fileName: string): this {
        return this.setOptions({ luaBundleEntry: fileName });
    }
}

class ModuleTestBuilder extends AccessorTestBuilder {
    public setReturnExport(...names: string[]): this {
        expect(this.hasProgram).toBe(false);
        this.accessor = names.map(n => `[${tstl.escapeString(n)}]`).join("");
        return this;
    }
}

class FunctionTestBuilder extends AccessorTestBuilder {
    protected accessor = ".__main()";
    public getTsCode(): string {
        return `${this.tsHeader}export function __main() {${this._tsCode}}`;
    }
}

class ExpressionTestBuilder extends AccessorTestBuilder {
    protected accessor = ".__result";
    public getTsCode(): string {
        return `${this.tsHeader}export const __result = ${this._tsCode};`;
    }
}

const createTestBuilderFactory = <T extends TestBuilder>(
    builder: new (_tsCode: string) => T,
    serializeSubstitutions: boolean
) => (...args: [string] | [TemplateStringsArray, ...any[]]): T => {
    let tsCode: string;
    if (typeof args[0] === "string") {
        expect(serializeSubstitutions).toBe(false);
        tsCode = args[0];
    } else {
        let [raw, ...substitutions] = args;
        if (serializeSubstitutions) {
            substitutions = substitutions.map(s => formatCode(s));
        }

        tsCode = String.raw(Object.assign([], { raw }), ...substitutions);
    }

    return new builder(tsCode);
};

export const testBundle = createTestBuilderFactory(BundleTestBuilder, false);
export const testModule = createTestBuilderFactory(ModuleTestBuilder, false);
export const testModuleTemplate = createTestBuilderFactory(ModuleTestBuilder, true);
export const testFunction = createTestBuilderFactory(FunctionTestBuilder, false);
export const testFunctionTemplate = createTestBuilderFactory(FunctionTestBuilder, true);
export const testExpression = createTestBuilderFactory(ExpressionTestBuilder, false);
export const testExpressionTemplate = createTestBuilderFactory(ExpressionTestBuilder, true);
