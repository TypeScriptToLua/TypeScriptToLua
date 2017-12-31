import * as ts from "typescript";
import {readFileSync,writeFileSync} from "fs";

import {LuaTranspiler} from "./Transpiler";
import {TSHelper as tsEx} from "./TSHelper";

function compile(fileNames: string[], options: ts.CompilerOptions): void {
    fileNames.forEach(fileName => {
        const sourceFile = ts.createSourceFile(fileName, readFileSync(fileName).toString(), ts.ScriptTarget.ES2017);
        
        // Print AST for debugging
        printAST(sourceFile, 0);

        // Transpile AST
        console.log(LuaTranspiler.transpileSourceFile(sourceFile));
    });

    process.exit();
}

function printAST(node: ts.Node, indent: number) {
    let indentStr = "";
    for (let i=0;i<indent;i++) indentStr += "    ";

    console.log(indentStr + tsEx.enumName(node.kind, ts.SyntaxKind));
    node.forEachChild(child => printAST(child, indent + 1));
}

compile(process.argv.slice(2), {
    noEmitOnError: true, noImplicitAny: true,
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
});