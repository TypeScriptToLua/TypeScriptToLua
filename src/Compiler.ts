import * as ts from "typescript";
import {readFileSync,writeFileSync} from "fs";

import {LuaTranspiler, TranspileError} from "./Transpiler";
import {TSHelper as tsEx} from "./TSHelper";

function compile(fileNames: string[], options: ts.CompilerOptions, projectRoot: string): void {
    // Verify target
    if ((<string><any>options.target) != "lua") {
        console.error("Wrong compilation target! Add \"target\": \"lua\" to your tsconfig.json!");
        process.exit();
    }

    let program = ts.createProgram(fileNames, options);
    let checker = program.getTypeChecker();

    // Get all diagnostics, ignore unsupported extension
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diag => diag.code != 6054);
    diagnostics.forEach(diagnostic => {
       if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
        }
    });

    // If there are errors dont emit
    if (diagnostics.filter(diag => diag.category == ts.DiagnosticCategory.Error).length > 0) {
        console.log("Stopping compilation process because of errors.");
        process.exit();
    }

    program.getSourceFiles().forEach(sourceFile => {
        if (!sourceFile.isDeclarationFile) {       
            // Print AST for debugging
            //printAST(sourceFile, 0);

            try {
                // Transpile AST
                let lua = LuaTranspiler.transpileSourceFile(sourceFile, checker);
                let outPath = sourceFile.fileName.substring(0, sourceFile.fileName.lastIndexOf(".")) + ".lua";
                
                if (options.outDir) {
                    var extension = options.outDir;
                    if (extension[extension.length - 1] != "/") extension = extension + "/";
                    outPath = outPath.replace(projectRoot + "/", projectRoot + "/" + extension);
                    console.log(outPath);
                }

                // Write output
                ts.sys.writeFile(outPath, lua);
            } catch (exception) {
                if (exception.node) {
                    const pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    console.error("Encountered error parsing file: " + exception.message);
                    console.error(sourceFile.fileName + " line: " + (1 + pos.line) + " column: " + pos.character);
                    console.error(exception.stack);
                } else {
                    throw exception;
                }
            }
        }
    });

    process.exit();
}

function printAST(node: ts.Node, indent: number) {
    let indentStr = "";
    for (let i=0;i<indent;i++) indentStr += "    ";

    console.log(indentStr + tsEx.enumName(node.kind, ts.SyntaxKind));
    node.forEachChild(child => printAST(child, indent + 1));
}

// Try to find tsconfig.json
const filename = process.argv[2].split("\\").join("/");
const filepath = filename.substring(0, filename.lastIndexOf("/"));
let configPath = ts.findConfigFile(filepath, ts.sys.fileExists);
 
if (configPath) {
    configPath = configPath.split("\\").join("/");
    const projectRoot = configPath.substring(0, configPath.lastIndexOf("/"));

    // Find all files
    let files = ts.sys.readDirectory(projectRoot, [".ts"]);

    // Read config
    let configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        console.error("Error occured:");
        console.error(configFile.error);
    } else {
        compile(files, configFile.config.compilerOptions, projectRoot);
    }
} else {
    console.error("Could not find tsconfig.json, place one in your project root!");
}
