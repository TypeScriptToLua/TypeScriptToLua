import * as ts from "typescript";
import * as path from "path";

import { LuaTranspiler, TranspileError } from "../../src/Transpiler";
import { CompilerOptions } from "../../src/CommandLineParser";

const LuaVM = require("lua.vm.js");
const fs = require("fs");

const libSource = fs.readFileSync(path.join(path.dirname(require.resolve('typescript')), 'lib.d.ts')).toString();

export function transpileString(str: string, options: CompilerOptions = { dontRequireLuaLib: true }): string {
    let compilerHost = {
        getSourceFile: (filename, languageVersion) => {
            if (filename === "file.ts") {
                return ts.createSourceFile(filename, str, ts.ScriptTarget.Latest, false);
            }
            if (filename === "lib.d.ts") {
                return ts.createSourceFile(filename, libSource, ts.ScriptTarget.Latest, false);
            }
            return undefined;
        },
        writeFile: (name, text, writeByteOrderMark) => {
            // we dont care about the js output
        },
        getDefaultLibFileName: () => "lib.d.ts",
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName): boolean => true,
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => []
    };
    let program = ts.createProgram(["file.ts"], options, compilerHost);

    const result = LuaTranspiler.transpileSourceFile(program.getSourceFile("file.ts"), program.getTypeChecker(), options);
    return result.trim();
}

export function transpileFile(path: string): string {
    const program = ts.createProgram([path], {});
    const checker = program.getTypeChecker();

    // Output errors
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code != 6054);
    diagnostics.forEach(diagnostic => console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`));

    const options: ts.CompilerOptions = { dontRequireLuaLib: true };
    const lua = LuaTranspiler.transpileSourceFile(program.getSourceFile(path), checker, options);
    return lua.trim();
}

export function executeLua(lua: string, withLib = true): any {
    if (withLib) {
        lua = minimalTestLib + lua
    }
    const luavm = new LuaVM.Lua.State();
    return luavm.execute(lua)[0];
}

const lualib = fs.readFileSync("dist/lualib/typescript.lua") + "\n";

const jsonlib = fs.readFileSync("test/src/json.lua") + "\n";

export const minimalTestLib = lualib + jsonlib;
