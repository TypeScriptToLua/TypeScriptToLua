import { lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";
import * as fs from "fs";
import { stringify } from "javascript-stringify";
import * as path from "path";
import * as prettyFormat from "pretty-format";
import * as ts from "typescript";
import * as vm from "vm";
import * as tstl from "../src";

export * from "./legacy-utils";

export const nodeStub = ts.createNode(ts.SyntaxKind.Unknown);

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

export const formatCode = (...values: unknown[]) => values.map(e => stringify(e)).join(", ");

export function testEachVersion<T extends TestBuilder>(
    name: string | undefined,
    common: () => T,
    special: Record<tstl.LuaTarget, ((builder: T) => T) | false>
): void {
    for (const version of Object.values(tstl.LuaTarget) as tstl.LuaTarget[]) {
        const specialBuilder = special[version];
        if (specialBuilder === false) return;

        const testName = name === undefined ? version : `${name} [${version}]`;
        test(testName, () => {
            const builder = common();
            builder.setOptions({ luaTarget: version });
            specialBuilder(builder);
        });
    }
}

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

export function executeLuaModule(code: string): any {
    return executeLua(`${minimalTestLib}return JSONStringify((function()\n${code}\nend)())`);
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

export type ExecutableTranspiledFile = tstl.TranspiledFile & { lua: string; sourceMap: string };
export type TapCallback = (builder: TestBuilder) => void;
export type DiagnosticMatcher = (diagnostic: ts.Diagnostic) => boolean;
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
        experimentalDecorators: true,
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
    public getMainLuaFileResult(): ExecutableTranspiledFile {
        const { transpiledFiles } = this.getLuaResult();
        const mainFile = this.options.luaBundle
            ? transpiledFiles[0]
            : transpiledFiles.find(x => x.fileName === this.mainFileName);
        expect(mainFile).toMatchObject({ lua: expect.any(String), sourceMap: expect.any(String) });
        return mainFile as ExecutableTranspiledFile;
    }

    @memoize
    public getMainLuaCodeChunk(): string {
        const header = this.luaHeader ? `${this.luaHeader.trimRight()}\n` : "";
        return header + this.getMainLuaFileResult().lua.trimRight();
    }

    public abstract getLuaCodeWithWrapper(): string;

    @memoize
    public getLuaExecutionResult(): any {
        return executeLua(this.getLuaCodeWithWrapper());
    }

    @memoize
    public getJsResult(): TranspileJsResult {
        const program = this.getProgram();
        program.getCompilerOptions().module = ts.ModuleKind.CommonJS;
        return transpileJs(program);
    }

    @memoize
    protected getMainJsCodeChunk(): string {
        const { transpiledFiles } = this.getJsResult();
        const mainFile = transpiledFiles.find(x => x.fileName === this.mainFileName);
        expect(mainFile).toBeDefined();

        const header = this.jsHeader ? `${this.jsHeader.trimRight()}\n` : "";
        return header + mainFile!.js!;
    }

    protected abstract getJsCodeWithWrapper(): string;

    @memoize
    public getJsExecutionResult(): any {
        const exports = {};
        const context = vm.createContext({ exports, module: { exports } });
        context.global = context;
        let result: unknown;
        try {
            result = vm.runInContext(this.getJsCodeWithWrapper(), context);
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

    public expectToHaveDiagnostic(matcher: DiagnosticMatcher): this {
        expect(this.getLuaDiagnostics().find(matcher)).toBeDefined();
        return this;
    }

    public expectToHaveExactDiagnostic(diagnostic: ts.Diagnostic): this {
        expect(this.getLuaDiagnostics()).toContainEqual(diagnostic);
        return this;
    }

    public expectToHaveDiagnostics(): this {
        expect(this.getLuaDiagnostics()).toHaveDiagnostics();
        return this;
    }

    public expectToHaveDiagnosticOfError(error: Error): this {
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

const lualibContent = fs.readFileSync(path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"), "utf8");
const minimalTestLib = fs.readFileSync(path.join(__dirname, "json.lua"), "utf8") + "\n";
class AccessorTestBuilder extends TestBuilder {
    protected accessor = "";

    @memoize
    public getLuaCodeWithWrapper(): string {
        let code = this.getMainLuaCodeChunk();
        if (code.includes('require("lualib_bundle")')) {
            code = `package.preload.lualib_bundle = function()\n${lualibContent}\nend\n${code}`;
        }

        return `${minimalTestLib}\nreturn JSONStringify((function()\n${code}\nend)()${this.accessor})`;
    }

    @memoize
    protected getJsCodeWithWrapper(): string {
        return this.getMainJsCodeChunk() + `\n;module.exports = module.exports${this.accessor}`;
    }
}

class BundleTestBuilder extends AccessorTestBuilder {
    public constructor(_tsCode: string) {
        super(_tsCode);
        this.setOptions({ luaBundle: "main.lua", luaBundleEntry: this.mainFileName });
    }

    public setEntryPoint(fileName: string): this {
        return this.setOptions({ luaBundleEntry: fileName });
    }
}

class ModuleTestBuilder extends AccessorTestBuilder {
    public setReturnExport(name: string): this {
        expect(this.hasProgram).toBe(false);
        this.accessor = `.${name}`;
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
        let [template, ...substitutions] = args;
        if (serializeSubstitutions) {
            substitutions = substitutions.map(s => formatCode(s));
        }

        tsCode = template.map((chunk, index) => (substitutions[index - 1] ?? "") + chunk).join("");
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
