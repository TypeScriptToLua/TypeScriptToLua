"use strict";
exports.__esModule = true;
var ts = require("typescript");
var Transpiler_1 = require("./Transpiler");
var TSHelper_1 = require("./TSHelper");
function compile(fileNames, options, projectRoot) {
    // Verify target
    if (options.target != "lua") {
        console.error("Wrong compilation target! Add \"target\": \"lua\" to your tsconfig.json!");
        process.exit(1);
    }
    var program = ts.createProgram(fileNames, options);
    var checker = program.getTypeChecker();
    // Get all diagnostics, ignore unsupported extension
    var diagnostics = ts.getPreEmitDiagnostics(program).filter(function (diag) { return diag.code != 6054; });
    diagnostics.forEach(function (diagnostic) {
        if (diagnostic.file) {
            var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
        }
        else {
            console.log("" + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });
    // If there are errors dont emit
    if (diagnostics.filter(function (diag) { return diag.category == ts.DiagnosticCategory.Error; }).length > 0) {
        console.log("Stopping compilation process because of errors.");
        process.exit(1);
    }
    program.getSourceFiles().forEach(function (sourceFile) {
        if (!sourceFile.isDeclarationFile) {
            // Print AST for debugging
            //printAST(sourceFile, 0);
            try {
                // Transpile AST
                var addHeader = options.noHeader === true ? false : true;
                var lua = Transpiler_1.LuaTranspiler.transpileSourceFile(sourceFile, checker, addHeader);
                var outPath = sourceFile.fileName.substring(0, sourceFile.fileName.lastIndexOf(".")) + ".lua";
                if (options.outDir) {
                    var extension = options.outDir;
                    if (extension[extension.length - 1] != "/")
                        extension = extension + "/";
                    outPath = outPath.replace(projectRoot + "/", projectRoot + "/" + extension);
                    console.log(outPath);
                }
                // Write output
                ts.sys.writeFile(outPath, lua);
            }
            catch (exception) {
                if (exception.node) {
                    var pos = ts.getLineAndCharacterOfPosition(sourceFile, exception.node.pos);
                    // Graciously handle transpilation errors
                    console.error("Encountered error parsing file: " + exception.message);
                    console.error(sourceFile.fileName + " line: " + (1 + pos.line) + " column: " + pos.character);
                    console.error(exception.stack);
                    process.exit(1);
                }
                else {
                    throw exception;
                }
            }
        }
    });
    process.exit(0);
}
function printAST(node, indent) {
    var indentStr = "";
    for (var i = 0; i < indent; i++)
        indentStr += "    ";
    console.log(indentStr + TSHelper_1.TSHelper.enumName(node.kind, ts.SyntaxKind));
    node.forEachChild(function (child) { return printAST(child, indent + 1); });
}
// Try to find tsconfig.json
var filename = process.argv[2].split("\\").join("/");
var filepath = filename.substring(0, filename.lastIndexOf("/"));
var configPath = ts.findConfigFile(filepath, ts.sys.fileExists);
if (configPath) {
    configPath = configPath.split("\\").join("/");
    var projectRoot = configPath.substring(0, configPath.lastIndexOf("/"));
    // Find all files
    var files = ts.sys.readDirectory(projectRoot, [".ts"]);
    // Read config
    var configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        console.error("Error occured:");
        console.error(configFile.error);
    }
    else {
        compile(files, configFile.config.compilerOptions, projectRoot);
    }
}
else {
    console.error("Could not find tsconfig.json, place one in your project root!");
}
