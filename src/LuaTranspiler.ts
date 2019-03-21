import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import * as tstl from "./LuaAST";

import {CompilerOptions, LuaLibImportKind, LuaTarget} from "./CompilerOptions";
import {LuaPrinter} from "./LuaPrinter";
import {LuaTransformer} from "./LuaTransformer";

export class LuaTranspiler {
    private program: ts.Program;

    private options: CompilerOptions;

    private luaTransformer: LuaTransformer;

    private luaPrinter: LuaPrinter;

    constructor(program: ts.Program) {
        this.program = program;
        this.options = this.getOptions(program);
        this.luaTransformer = new LuaTransformer(this.program, this.options);
        this.luaPrinter = new LuaPrinter(this.options);
    }

    private getOptions(program: ts.Program): CompilerOptions {
        const options = program.getCompilerOptions() as CompilerOptions;

        // Make options case-insenstive
        if (options.luaTarget) {
            options.luaTarget = options.luaTarget.toLowerCase() as LuaTarget;
        }
        if (options.luaLibImport) {
            options.luaLibImport = options.luaLibImport.toLocaleLowerCase() as LuaLibImportKind;
        }

        return options;
    }

    public reportErrors(): number {
        // Get all diagnostics, ignore unsupported extension
        const diagnostics = ts.getPreEmitDiagnostics(this.program).filter(diag => diag.code !== 6054);
        diagnostics.forEach(diag => this.reportDiagnostic(diag));

        // If there are errors dont emit
        if (diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error).length > 0) {
            if (!this.options.watch) {
                process.exit(1);
            } else {
                return 1;
            }
        }

        return 0;
    }

    public emitLuaLib(): string {
        const outPath = path.join(this.options.outDir, "lualib_bundle.lua");
        fs.copyFileSync(
            path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
            outPath
        );
        return outPath;
    }

    public emitFilesAndReportErrors(): number {
        let status = this.reportErrors();

        if (status > 0) {
            return status;
        }

        this.program.getSourceFiles().forEach(sourceFile => {
            const sourceStatus = this.emitSourceFile(sourceFile);
            status |= sourceStatus;
        });

        // Copy lualib to target dir
        if (this.options.luaLibImport === LuaLibImportKind.Require
            || this.options.luaLibImport === LuaLibImportKind.Always
        ) {
            this.emitLuaLib();
        }

        return status;
    }

    public emitSourceFile(sourceFile: ts.SourceFile): number {
        if (!sourceFile.isDeclarationFile) {
            try {
                const rootDir = this.options.rootDir;

                const lua = this.transpileSourceFile(sourceFile);

                let outPath = sourceFile.fileName;
                if (this.options.outDir !== this.options.rootDir) {
                    const relativeSourcePath = path.resolve(sourceFile.fileName).replace(path.resolve(rootDir), "");
                    outPath = path.join(this.options.outDir, relativeSourcePath);
                }

                // change extension or rename to outFile
                if (this.options.outFile) {
                    if (path.isAbsolute(this.options.outFile)) {
                        outPath = this.options.outFile;
                    } else {
                        // append to workingDir or outDir
                        outPath = path.resolve(this.options.outDir, this.options.outFile);
                    }
                } else {
                    const fileNameLua = path.basename(outPath, path.extname(outPath)) + ".lua";
                    outPath = path.join(path.dirname(outPath), fileNameLua);
                }

                // Write output
                ts.sys.writeFile(outPath, lua);
            } catch (exception) {
                /* istanbul ignore else: Testing else part would require to add a bug/exception to our code */
                if (exception.node) {
                    const pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    console.error("Encountered error parsing file: " + exception.message);
                    console.error(`${sourceFile.fileName} (${1 + pos.line},${pos.character})\n${exception.stack}`);
                    return 1;
                } else {
                    throw exception;
                }
            }
        }
        return 0;
    }

    public transpileSourceFile(sourceFile: ts.SourceFile): string {
        // Transform AST
        const [luaAST, lualibFeatureSet] = this.luaTransformer.transformSourceFile(sourceFile);
        // Print AST
        return this.luaPrinter.print(luaAST, lualibFeatureSet);
    }

    public transpileSourceFileKeepAST(sourceFile: ts.SourceFile): [tstl.Block, string] {
        // Transform AST
        const [luaAST, lualibFeatureSet] = this.luaTransformer.transformSourceFile(sourceFile);
        // Print AST
        return [luaAST, this.luaPrinter.print(luaAST, lualibFeatureSet)];
    }

    public reportDiagnostic(diagnostic: ts.Diagnostic): void {
        if (diagnostic.file) {
            const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.code}: ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(`${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
        }
    }
}
