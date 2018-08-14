import * as ts from "typescript";

import { CompilerOptions } from "./CommandLineParser";
import { TSHelper as tsHelper } from "./TSHelper";

import * as fs from "fs";
import * as path from "path";

/* tslint:disable */
const packageJSON = require("../package.json");
/* tslint:enable */

export class TranspileError extends Error {
    public node: ts.Node;
    constructor(message: string, node: ts.Node) {
        super(message);
        this.node = node;
    }
}

export enum LuaTarget {
    Lua51 = "5.1",
    Lua52 = "5.2",
    Lua53 = "5.3",
    LuaJIT = "JIT",
}

export enum LuaLibFeature {
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayIndexOf = "ArrayIndexOf",
    ArrayMap = "ArrayMap",
    ArrayPush = "ArrayPush",
    ArraySlice = "ArraySlice",
    ArraySome = "ArraySome",
    ArraySplice = "ArraySplice",
    InstanceOf = "InstanceOf",
    Map = "Map",
    Set = "Set",
    StringReplace = "StringReplace",
    StringSplit = "StringSplit",
    Ternary = "Ternary",
}

export enum LuaLibImportKind {
    None = "none",
    Always = "always",
    Inline = "inline",
    Require = "require",
}

interface ExportInfo {
    name: string;
    node: ts.Node;
    dummy: boolean;
}

export abstract class LuaTranspiler {

    public static AvailableLuaTargets = [LuaTarget.LuaJIT, LuaTarget.Lua53];

    public indent: string;
    public checker: ts.TypeChecker;
    public options: CompilerOptions;
    public genVarCounter: number;
    public transpilingSwitch: number;
    public namespace: string[];
    public importCount: number;
    public isModule: boolean;
    public sourceFile: ts.SourceFile;
    public loopStack: number[];
    public classStack: string[];
    public exportStack: ExportInfo[][];

    public luaLibFeatureSet: Set<LuaLibFeature>;

    constructor(checker: ts.TypeChecker, options: CompilerOptions, sourceFile: ts.SourceFile) {
        this.indent = "";
        this.checker = checker;
        this.options = options;
        this.genVarCounter = 0;
        this.transpilingSwitch = 0;
        this.namespace = [];
        this.importCount = 0;
        this.sourceFile = sourceFile;
        this.isModule = tsHelper.isFileModule(sourceFile);
        this.loopStack = [];
        this.classStack = [];
        this.exportStack = [];
        this.luaLibFeatureSet = new Set<LuaLibFeature>();
    }

    public pushIndent(): void {
        this.indent = this.indent + "    ";
    }

    public popIndent(): void {
        this.indent = this.indent.slice(4);
    }

    public definitionName(name: string): string {
        return this.namespace.concat(name as string).join(".");
    }

    public accessPrefix(node?: ts.Node): string {
        return node && (this.isModule || this.namespace.length > 0) ?
            "local " : "";
    }

    public pushExport(nameIn: string, nodeIn: ts.Node, dummyIn: boolean = false): void {
        this.exportStack[this.exportStack.length - 1].push({name: nameIn, node: nodeIn, dummy: dummyIn});
    }

    public makeExport(name: string, node: ts.Node, dummy?: boolean): string {
        let result: string = "";
        if (node &&
            node.modifiers && this.isModule &&
            (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)
           ) {
            if (dummy) {
                result = this.indent + `exports.${this.definitionName(name)} = {}\n`;
            } else {
                result = this.indent + `exports.${this.definitionName(name)} = ${name}\n`;
            }
        }
        if (this.namespace.length !== 0 && !ts.isModuleDeclaration(node)) {
            if (dummy) {
                result += this.indent + `${this.definitionName(name)} = {}\n`;
            } else {
                result += this.indent + `${this.definitionName(name)} = ${name}\n`;
            }
        }
        return result;
    }

    public makeExports(): string {
        let result = "";
        this.exportStack.pop().forEach(exp => result += this.makeExport(exp.name, exp.node, exp.dummy));
        return result;
    }

    public importLuaLibFeature(feature: LuaLibFeature): void {
        // Add additional lib requirements
        if (feature === LuaLibFeature.Map || feature === LuaLibFeature.Set) {
            this.luaLibFeatureSet.add(LuaLibFeature.InstanceOf);
        }

        // TODO inline imported features in output i option set
        this.luaLibFeatureSet.add(feature);
    }

    public getAbsoluteImportPath(relativePath: string): string {
        if (relativePath.charAt(0) !== "." && this.options.baseUrl) {
            return path.resolve(this.options.baseUrl, relativePath);
        }
        return path.resolve(path.dirname(this.sourceFile.fileName), relativePath);
    }

    public getImportPath(relativePath: string): string {
        // Calculate absolute path to import
        const absolutePathToImport = this.getAbsoluteImportPath(relativePath);
        if (this.options.rootDir) {
            // Calculate path relative to project root
            // and replace path.sep with dots (lua doesn't know paths)
            const relativePathToRoot =
                this.pathToLuaRequirePath(absolutePathToImport.replace(this.options.rootDir, "").slice(1));
            return `"${relativePathToRoot}"`;
        }

        return `"${this.pathToLuaRequirePath(relativePath)}"`;
    }

    public pathToLuaRequirePath(filePath: string): string {
        return filePath.replace(new RegExp("\\\\|\/", "g"), ".");
    }

    // Transpile a source file
    public transpileSourceFile(): string {
        let header = "";
        if (this.options.addHeader) {
            header = "-- Generated by TypescriptToLua v" + packageJSON.version + "\n" +
            "-- https://github.com/Perryvw/TypescriptToLua\n";
        }
        let result = header;

        // Transpile content first to gather some info on dependencies
        let fileStatements = "";
        this.exportStack.push([]);
        this.sourceFile.statements.forEach(s => fileStatements += this.transpileNode(s));

        if ((this.options.luaLibImport === LuaLibImportKind.Require && this.luaLibFeatureSet.size > 0)
            || this.options.luaLibImport === LuaLibImportKind.Always) {
            // require helper functions
            result += `require("lualib_bundle")\n`;
        }

        // Inline lualib features
        if (this.options.luaLibImport === LuaLibImportKind.Inline) {
            result += "\n" + "-- Lua Library Imports\n";
            for (const feature of this.luaLibFeatureSet) {
                const featureFile = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
                result += fs.readFileSync(featureFile).toString() + "\n";
            }
        }

        if (this.isModule) {
            // Shadow exports if it already exists
            result += "local exports = exports or {}\n";
        }

        // Add file systems after imports since order matters in Lua
        result += fileStatements;

        // Exports
        result += this.makeExports();

        if (this.isModule) {
            result += "return exports\n";
        }
        return result;
    }

    // Transpile a block
    public transpileBlock(block: ts.Block): string {
        this.exportStack.push([]);

        let result = "";
        for (const statement of block.statements) {
            result += this.transpileNode(statement);

            // Don't transpile any dead code after a return
            if (ts.isReturnStatement(statement)) {
                break;
            }
        }

        result += this.makeExports();

        return result;
    }

    // Transpile a block statement
    public transpileBlockStatement(block: ts.Block): string {
        let result = "do\n";
        for (const statement of block.statements) {
            result += this.transpileNode(statement);
            if (ts.isReturnStatement(statement)) {
                break;
            }
        }

        result += "end\n";
        return result;
    }

    // Transpile a node of unknown kind.
    public transpileNode(node: ts.Node): string {
        // Ignore declarations
        if (node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
            return "";
        }

        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
                return this.transpileImport(node as ts.ImportDeclaration);
            case ts.SyntaxKind.ClassDeclaration:
                return this.transpileClass(node as ts.ClassDeclaration);
            case ts.SyntaxKind.ModuleDeclaration:
                return this.transpileNamespace(node as ts.ModuleDeclaration);
            case ts.SyntaxKind.ModuleBlock:
                return this.transpileBlock(node as ts.Block);
            case ts.SyntaxKind.EnumDeclaration:
                return this.transpileEnum(node as ts.EnumDeclaration);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.transpileFunctionDeclaration(node as ts.FunctionDeclaration);
            case ts.SyntaxKind.VariableStatement:
                return this.indent + this.transpileVariableStatement(node as ts.VariableStatement) + "\n";
            case ts.SyntaxKind.ExpressionStatement:
                return this.indent + this.transpileExpression((node as ts.ExpressionStatement).expression) + "\n";
            case ts.SyntaxKind.ReturnStatement:
                return this.indent + this.transpileReturn(node as ts.ReturnStatement) + "\n";
            case ts.SyntaxKind.IfStatement:
                return this.transpileIf(node as ts.IfStatement);
            case ts.SyntaxKind.WhileStatement:
                return this.transpileWhile(node as ts.WhileStatement);
            case ts.SyntaxKind.DoStatement:
                return this.transpileDoStatement(node as ts.DoStatement);
            case ts.SyntaxKind.ForStatement:
                return this.transpileFor(node as ts.ForStatement);
            case ts.SyntaxKind.ForOfStatement:
                return this.transpileForOf(node as ts.ForOfStatement);
            case ts.SyntaxKind.ForInStatement:
                return this.transpileForIn(node as ts.ForInStatement);
            case ts.SyntaxKind.SwitchStatement:
                return this.transpileSwitch(node as ts.SwitchStatement);
            case ts.SyntaxKind.BreakStatement:
                return this.transpileBreak();
            case ts.SyntaxKind.TryStatement:
                return this.transpileTry(node as ts.TryStatement);
            case ts.SyntaxKind.ThrowStatement:
                return this.transpileThrow(node as ts.ThrowStatement);
            case ts.SyntaxKind.ContinueStatement:
                return this.transpileContinue(node as ts.ContinueStatement);
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                // Ignore these
                return "";
            case ts.SyntaxKind.Block:
                return this.transpileBlockStatement(node as ts.Block);
            default:
                return this.indent + this.transpileExpression(node) + "\n";
        }
    }

    public transpileLuaLibFunction(func: LuaLibFeature, ...params: string[]): string {
        this.importLuaLibFeature(func);
        return `__TS__${func}(${params.join(", ")})`;
    }

    public transpileImport(node: ts.ImportDeclaration): string {
        const importPath = this.transpileExpression(node.moduleSpecifier);
        const importPathWithoutQuotes = importPath.replace(new RegExp("\"", "g"), "");

        if (!node.importClause || !node.importClause.namedBindings) {
            throw new TranspileError(
                "Default Imports are not supported, please use named imports instead!",
                node
            );
        }

        const imports = node.importClause.namedBindings;

        if (ts.isNamedImports(imports)) {
            const fileImportTable = path.basename(importPathWithoutQuotes) + this.importCount;
            const resolvedImportPath = this.getImportPath(importPathWithoutQuotes);

            let result = `local ${fileImportTable} = require(${resolvedImportPath})\n`;
            this.importCount++;

            imports.elements.forEach(element => {
                const nameText = this.transpileIdentifier(element.name);
                if (element.propertyName) {
                    const propertyText = this.transpileIdentifier(element.propertyName);
                    result += `local ${nameText} = ${fileImportTable}.${propertyText}\n`;
                } else {
                    result += `local ${nameText} = ${fileImportTable}.${nameText}\n`;
                }
            });

            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const resolvedImportPath = this.getImportPath(importPathWithoutQuotes);
            return `local ${this.transpileIdentifier(imports.name)} = require(${resolvedImportPath})\n`;
        } else {
            throw new TranspileError("Unsupported import type.", node);
        }
    }

    public transpileNamespace(node: ts.ModuleDeclaration): string {
        // If phantom namespace just transpile the body as normal
        if (tsHelper.isPhantom(this.checker.getTypeAtLocation(node), this.checker) && node.body) {
            return this.transpileNode(node.body);
        }

        const defName = this.definitionName(node.name.text);
        let result =
            this.indent +
            this.accessPrefix(node) +
            `${node.name.text} = ${node.name.text} or {}\n`;

        if (this.namespace.length > 0) {
            result += this.indent + `${defName} = ${node.name.text} or {}\n`;
        }
        this.pushExport(defName, node);
        // Create closure
        result += this.indent + "do\n";
        this.pushIndent();
        this.namespace.push(node.name.text);
        if (node.body) {
            result += this.transpileNode(node.body);
        }
        this.namespace.pop();
        this.popIndent();
        result += this.indent + "end\n";
        return result;
    }

    public transpileEnum(node: ts.EnumDeclaration): string {
        let val: number | string = 0;
        let result = "";

        const type = this.checker.getTypeAtLocation(node);
        const membersOnly = tsHelper.isCompileMembersOnlyEnum(type, this.checker);

        if (!membersOnly) {
            const name = this.transpileIdentifier(node.name);
            result += this.indent + this.accessPrefix(node) + `${name}={}\n`;
            this.pushExport(name, node);
        }

        let hasStringInitializers = false;
        node.members.forEach(member => {
            if (member.initializer) {
                if (ts.isNumericLiteral(member.initializer)) {
                    val = parseInt(member.initializer.text);
                } else if (ts.isStringLiteral(member.initializer)) {
                    hasStringInitializers = true;
                    val = `"${member.initializer.text}"`;
                } else {
                    throw new TranspileError("Only numeric or string initializers allowed for enums.", node);
                }
            } else if (hasStringInitializers) {
                throw new TranspileError("Invalid heterogeneous enum.", node);
            }

            if (membersOnly) {
                const defName = this.definitionName(this.transpileIdentifier(member.name as ts.Identifier));
                result += this.indent + `${defName}=${val}\n`;
            } else {
                const defName = this.definitionName(
                    `${this.transpileIdentifier(node.name)}.${this.transpileIdentifier((member.name as ts.Identifier))}`
                );
                result += this.indent + `${defName}=${val}\n`;
            }

            if (typeof val === "number") {
              val++;
            }
        });
        return result;
    }

    public transpileBreak(): string {
        if (this.transpilingSwitch > 0) {
            return "";
        } else {
            return this.indent + "break\n";
        }
    }

    public transpileContinue(node: ts.ContinueStatement): string {
        throw new TranspileError(
            `Unsupported continue statement, ` +
            `continue is not supported for target Lua ${this.options.luaTarget}.`,
            node
        );
    }

    public transpileIf(node: ts.IfStatement): string {
        const condition = this.transpileExpression(node.expression);

        let result = this.indent + `if ${condition} then\n`;
        this.pushIndent();
        result += this.transpileStatement(node.thenStatement);
        this.popIndent();

        if (node.elseStatement) {
            result += this.indent + "else\n";
            this.pushIndent();
            result += this.transpileStatement(node.elseStatement);
            this.popIndent();
        }

        return result + this.indent + "end\n";
    }

    public transpileLoopBody(
        node: ts.WhileStatement
            | ts.DoStatement
            | ts.ForStatement
            | ts.ForOfStatement
            | ts.ForInStatement
    ): string {
        this.loopStack.push(this.genVarCounter);
        this.genVarCounter++;
        let result = this.indent + "do\n";
        this.pushIndent();
        result += this.transpileStatement(node.statement);
        this.popIndent();
        result += this.indent + "end\n";
        return result;
    }

    public transpileWhile(node: ts.WhileStatement): string {
        const condition = this.transpileExpression(node.expression);

        let result = this.indent + `while ${condition} do\n`;
        this.pushIndent();
        result += this.transpileLoopBody(node);
        this.popIndent();
        return result + this.indent + "end\n";
    }

    public transpileDoStatement(node: ts.DoStatement): string {
        let result = this.indent + `repeat\n`;

        this.pushIndent();
        result += this.transpileLoopBody(node);
        this.popIndent();

        // Negate the expression because we translate from do-while to repeat-until (repeat-while-not)
        result += this.indent + `until not ${this.transpileExpression(node.expression, true)}\n`;

        return result;
    }

    public transpileFor(node: ts.ForStatement): string {
        // Add header
        let result = "";
        for (const variableDeclaration of (node.initializer as ts.VariableDeclarationList).declarations) {
            result += this.indent + this.transpileVariableDeclaration(variableDeclaration);
        }
        result += this.indent + `while(${this.transpileExpression(node.condition)}) do\n`;

        // Add body
        this.pushIndent();
        result += this.transpileLoopBody(node);
        result += this.indent + this.transpileExpression(node.incrementor) + "\n";
        this.popIndent();

        result += this.indent + "end\n";

        return result;
    }

    public transpileForOf(node: ts.ForOfStatement): string {
        // Get variable identifier
        const variable = (node.initializer as ts.VariableDeclarationList).declarations[0];

        // Transpile expression
        const expression = this.transpileExpression(node.expression);

        // Use ipairs for array types, pairs otherwise
        const isArray = tsHelper.isArrayType(this.checker.getTypeAtLocation(node.expression), this.checker);
        const pairs = isArray ? "ipairs" : "pairs";

        // Make header
        let result = "";
        if (ts.isIdentifier(variable.name)) {
            result = this.indent + `for _, ${this.transpileIdentifier(variable.name)} in ${pairs}(${expression}) do\n`;
        } else if (ts.isArrayBindingPattern(variable.name)) {
            const valueVar =  "__forOfValue" + this.genVarCounter;
            result = this.indent + `for _, ${valueVar} in ${pairs}(${expression}) do\n`;
            const declaration = ts.createVariableDeclaration(variable.name, undefined, ts.createIdentifier(valueVar));
            result += this.indent + this.transpileVariableDeclaration(declaration);
        }

        // For body
        this.pushIndent();
        result += this.transpileLoopBody(node);
        this.popIndent();

        return result + this.indent + "end\n";
    }

    public transpileForIn(node: ts.ForInStatement): string {
        // Get variable identifier
        const variable = (node.initializer as ts.VariableDeclarationList).declarations[0] as ts.VariableDeclaration;
        const identifier = variable.name as ts.Identifier;

        // Transpile expression
        const expression = this.transpileExpression(node.expression);

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(node.expression), this.checker)) {
            throw new TranspileError("Iterating over arrays with 'for in' is not allowed.", node);
        }

        // Make header
        let result = this.indent + `for ${this.transpileIdentifier(identifier)}, _ in pairs(${expression}) do\n`;

        // For body
        this.pushIndent();
        result += this.transpileLoopBody(node);
        this.popIndent();

        return result + this.indent + "end\n";
    }

    public transpileStatement(node: ts.Statement): string {
        if (ts.isBlock(node)) {
            return this.transpileBlock(node);
        } else {
            return this.transpileNode(node);
        }
    }

    public transpileSwitch(node: ts.SwitchStatement): string {
        const expression = this.transpileExpression(node.expression, true);
        const clauses = node.caseBlock.clauses;

        let result = this.indent + "-------Switch statement start-------\n";

        const jumpTableName = "____switch" + this.genVarCounter;
        this.genVarCounter++;

        result += this.indent + `local ${jumpTableName} = {}\n`;

        // If statement to go to right entry label
        clauses.forEach((clause, index) => {
            if (ts.isCaseClause(clause)) {
                result += this.indent + `-- case:\n`;
                result += this.indent +
                          `${jumpTableName}[${this.transpileExpression(clause.expression, true)}] = function()\n`;
            }
            if (ts.isDefaultClause(clause)) {
                result += this.indent + `-- default:\n`;
                result += this.indent + `${jumpTableName}["____default${this.genVarCounter}"] = function()\n`;
            }
            this.pushIndent();

            this.transpilingSwitch++;
            result += this.transpileBlock(ts.createBlock(clause.statements));
            this.transpilingSwitch--;

            let i = index + 1;
            if (i < clauses.length
                && !tsHelper.containsStatement(clause.statements, ts.SyntaxKind.BreakStatement)
                && !tsHelper.containsStatement(clause.statements, ts.SyntaxKind.ReturnStatement)
            ) {
                let nextClause = clauses[i];
                while (i < clauses.length
                    && ts.isCaseClause(nextClause)
                    && nextClause.statements.length === 0
                ) {
                    i++;
                    nextClause = clauses[i];
                }

                if (i !== index && nextClause) {
                    if (ts.isCaseClause(nextClause)) {
                        const nextValue = this.transpileExpression(nextClause.expression, true);
                        result += this.indent + `return ${jumpTableName}[${nextValue}]()\n`;
                    } else {
                        result += this.indent + `${jumpTableName}["____default${this.genVarCounter}"]()\n`;
                    }
                }
            } else {
                result += this.indent + `-- break;\n`;
            }

            this.popIndent();

            result += this.indent + `end\n`;
        });
        result += this.indent + `if ${jumpTableName}[${expression}] then\n`
            + this.indent + `   local ${jumpTableName}Return = ${jumpTableName}[${expression}]()\n`
            + this.indent + `   if ${jumpTableName}Return ~= nil then return ${jumpTableName}Return end\n`;
        result += this.indent + `elseif ${jumpTableName}["____default${this.genVarCounter}"] then\n`
            + this.indent + `   local ${jumpTableName}Return = ${jumpTableName}["____default${this.genVarCounter}"]()\n`
            + this.indent + `   if ${jumpTableName}Return ~= nil then return ${jumpTableName}Return end\n`
            + this.indent + `end\n`;
        result += this.indent +
                  "--------Switch statement end--------\n";

        // Increment counter for next switch statement
        this.genVarCounter += clauses.length;
        return result;
    }

    public transpileTry(node: ts.TryStatement): string {
        let tryFunc = "function()\n";
        this.pushIndent();
        tryFunc += this.transpileBlock(node.tryBlock);
        this.popIndent();
        tryFunc += "end";
        let catchFunc = "function(e)\nend";
        if (node.catchClause && node.catchClause.variableDeclaration) {
            const variableName = this.transpileIdentifier(node.catchClause.variableDeclaration.name as ts.Identifier);
            catchFunc = this.indent + `function(${variableName})\n`;
            this.pushIndent();
            catchFunc += this.transpileBlock(node.catchClause.block);
            this.popIndent();
            catchFunc += "end";
        }
        let result = this.indent + `xpcall(${tryFunc},\n${catchFunc})\n`;
        if (node.finallyBlock) {
            result += this.transpileBlock(node.finallyBlock);
        }
        return result;
    }

    public transpileThrow(node: ts.ThrowStatement): string {
        if (ts.isStringLiteral(node.expression)) {
            return `error("${node.expression.text}")`;
        } else {
            throw new TranspileError(
                "Unsupported throw expression, only string literals are supported",
                node.expression
            );
        }
    }

    public transpileReturn(node: ts.ReturnStatement): string {
        if (node.expression) {
            // If parent function is a TupleReturn function
            // and return expression is an array literal, leave out brackets.
            const declaration = tsHelper.findFirstNodeAbove(node, ts.isFunctionDeclaration);
            if (declaration && tsHelper.isTupleReturnFunction(this.checker.getTypeAtLocation(declaration), this.checker)
                && ts.isArrayLiteralExpression(node.expression)) {
                return "return " + node.expression.elements.map(elem => this.transpileExpression(elem)).join(",");
            }

            return "return " + this.transpileExpression(node.expression);
        } else {
            // Empty return
            return "return";
        }
    }

    public escapeString(text: string): string {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
        const escapeSequences: Array<[RegExp, string]> = [
            [/[\\]/g, "\\\\"],
            [/[\']/g, "\\\'"],
            [/[\`]/g, "\\\`"],
            [/[\"]/g, "\\\""],
            [/[\n]/g, "\\n"],
            [/[\r]/g, "\\r"],
            [/[\v]/g, "\\v"],
            [/[\t]/g, "\\t"],
            [/[\b]/g, "\\b"],
            [/[\f]/g, "\\f"],
            [/[\0]/g, "\\0"],
        ];

        if (text.length > 0) {
            for (const [regex, replacement] of escapeSequences) {
                text = text.replace(regex, replacement);
            }
        }
        return text;
    }

    public transpileExpression(node: ts.Node, brackets?: boolean): string {
        switch (node.kind) {
            case ts.SyntaxKind.BinaryExpression:
                // Add brackets to preserve ordering
                return this.transpileBinaryExpression(node as ts.BinaryExpression, brackets);
            case ts.SyntaxKind.ConditionalExpression:
                // Add brackets to preserve ordering
                return this.transpileConditionalExpression(node as ts.ConditionalExpression, brackets);
            case ts.SyntaxKind.CallExpression:
                return this.transpileCallExpression(node as ts.CallExpression);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.transpilePropertyAccessExpression(node as ts.PropertyAccessExpression);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.transpileElementAccessExpression(node as ts.ElementAccessExpression);
            case ts.SyntaxKind.Identifier:
                // Catch undefined which is passed as identifier
                if ((node as ts.Identifier).originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
                    return "nil";
                }
                // Otherwise simply return the name
                return this.transpileIdentifier(node as ts.Identifier);
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                const text = this.escapeString((node as ts.StringLiteral).text);
                return `"${text}"`;
            case ts.SyntaxKind.TemplateExpression:
                return this.transpileTemplateExpression(node as ts.TemplateExpression);
            case ts.SyntaxKind.NumericLiteral:
                return (node as ts.NumericLiteral).text;
            case ts.SyntaxKind.TrueKeyword:
                return "true";
            case ts.SyntaxKind.FalseKeyword:
                return "false";
            case ts.SyntaxKind.NullKeyword:
            case ts.SyntaxKind.UndefinedKeyword:
                return "nil";
            case ts.SyntaxKind.ThisKeyword:
                return "self";
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.transpilePostfixUnaryExpression(node as ts.PostfixUnaryExpression);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.transpilePrefixUnaryExpression(node as ts.PrefixUnaryExpression);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transpileArrayLiteral(node as ts.ArrayLiteralExpression);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transpileObjectLiteral(node as ts.ObjectLiteralExpression);
            case ts.SyntaxKind.DeleteExpression:
                return this.transpileExpression((node as ts.DeleteExpression).expression) + "=nil";
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return this.transpileFunctionExpression(node as ts.ArrowFunction);
            case ts.SyntaxKind.NewExpression:
                return this.transpileNewExpression(node as ts.NewExpression);
            case ts.SyntaxKind.ComputedPropertyName:
                return "[" + this.transpileExpression((node as ts.ComputedPropertyName).expression) + "]";
            case ts.SyntaxKind.ParenthesizedExpression:
                return "(" + this.transpileExpression((node as ts.ParenthesizedExpression).expression) + ")";
            case ts.SyntaxKind.SuperKeyword:
                return "self.__base";
            case ts.SyntaxKind.TypeAssertionExpression:
                // Simply ignore the type assertion
                return this.transpileExpression((node as ts.TypeAssertion).expression);
            case ts.SyntaxKind.AsExpression:
                // Also ignore as casts
                return this.transpileExpression((node as ts.AsExpression).expression);
            case ts.SyntaxKind.TypeOfExpression:
                return this.transpileTypeOfExpression(node as ts.TypeOfExpression);
            case ts.SyntaxKind.EmptyStatement:
                    return "";
            default:
                throw new TranspileError(
                    "Unsupported expression kind: " + tsHelper.enumName(node.kind, ts.SyntaxKind),
                    node
                );
        }
    }

    public transpileBinaryExpression(node: ts.BinaryExpression, brackets?: boolean): string {
        // Check if this is an assignment token, then handle accordingly
        const [isAssignment, operator] = tsHelper.isBinaryAssignmentToken(node.operatorToken.kind);
        if (isAssignment) {
            return this.transpileAssignmentExpression(
                node.left,
                ts.createBinary(node.left, operator, node.right),
                tsHelper.isExpressionStatement(node),
                false
            );
        }

        // Transpile operands
        const lhs = this.transpileExpression(node.left, true);
        const rhs = this.transpileExpression(node.right, true);

        if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken && !tsHelper.isExpressionStatement(node)) {
            return `(function() ${lhs} = ${rhs}; return ${lhs} end)()`;
        }

        let result = "";

        // Transpile Bitops
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                result = this.transpileBitOperation(node, lhs, rhs);
        }

        // Transpile operators
        if (result === "") {
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.AmpersandAmpersandToken:
                    result = `${lhs} and ${rhs}`;
                    break;
                case ts.SyntaxKind.BarBarToken:
                    result = `${lhs} or ${rhs}`;
                    break;
                case ts.SyntaxKind.PlusToken:
                    // Replace string + with ..
                    const typeLeft = this.checker.getTypeAtLocation(node.left);
                    const typeRight = this.checker.getTypeAtLocation(node.right);
                    if ((typeLeft.flags & ts.TypeFlags.String) || ts.isStringLiteral(node.left)
                        ||  (typeRight.flags & ts.TypeFlags.String) || ts.isStringLiteral(node.right)) {
                        return lhs + " .. " + rhs;
                    }
                    result = `${lhs}+${rhs}`;
                    break;
                case ts.SyntaxKind.MinusToken:
                    result = `${lhs}-${rhs}`;
                    break;
                case ts.SyntaxKind.AsteriskToken:
                    result = `${lhs}*${rhs}`;
                    break;
                case ts.SyntaxKind.AsteriskAsteriskToken:
                    result = `${lhs}^${rhs}`;
                    break;
                case ts.SyntaxKind.SlashToken:
                    result = `${lhs}/${rhs}`;
                    break;
                case ts.SyntaxKind.PercentToken:
                    result = `${lhs}%${rhs}`;
                    break;
                case ts.SyntaxKind.GreaterThanToken:
                    result = `${lhs}>${rhs}`;
                    break;
                case ts.SyntaxKind.GreaterThanEqualsToken:
                    result = `${lhs}>=${rhs}`;
                    break;
                case ts.SyntaxKind.LessThanToken:
                    result = `${lhs}<${rhs}`;
                    break;
                case ts.SyntaxKind.LessThanEqualsToken:
                    result = `${lhs}<=${rhs}`;
                    break;
                case ts.SyntaxKind.EqualsToken:
                    if (tsHelper.hasSetAccessor(node.left, this.checker)) {
                        return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, rhs);
                    }

                    result = `${lhs} = ${rhs}`;
                    break;
                case ts.SyntaxKind.EqualsEqualsToken:
                case ts.SyntaxKind.EqualsEqualsEqualsToken:
                    result = `${lhs}==${rhs}`;
                    break;
                case ts.SyntaxKind.ExclamationEqualsToken:
                case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    result = `${lhs}~=${rhs}`;
                    break;
                case ts.SyntaxKind.InKeyword:
                    result = `${rhs}[${lhs}]~=nil`;
                    break;
                case ts.SyntaxKind.InstanceOfKeyword:
                    result = this.transpileLuaLibFunction(LuaLibFeature.InstanceOf, lhs, rhs);
                    break;
                default:
                    throw new TranspileError(
                        "Unsupported binary operator kind: " + ts.tokenToString(node.operatorToken.kind),
                        node
                    );
            }
        }

        // Optionally put brackets around result
        if (brackets) {
            return `(${result})`;
        } else {
            return result;
        }
    }

    public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
        throw new TranspileError(`Bit operations are not supported for target Lua ${this.options.target}`, node);
    }

    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        throw new TranspileError(`Bit operations are not supported for target Lua ${this.options.target}`, node);
    }

    public transpileTemplateExpression(node: ts.TemplateExpression): string {
        const parts = [`"${this.escapeString(node.head.text)}"`];
        node.templateSpans.forEach(span => {
            const expr = this.transpileExpression(span.expression, true);
            const text = this.escapeString(span.literal.text);

            if (ts.isTemplateTail(span.literal)) {
                parts.push(`tostring(${expr}).."${text}"`);
            } else {
                parts.push(`tostring(${expr}).."${text}"`);
            }
        });
        return parts.join("..");
    }

    public transpileConditionalExpression(node: ts.ConditionalExpression, brackets?: boolean): string {
        const condition = this.transpileExpression(node.condition);
        const val1 = this.transpileExpression(node.whenTrue);
        const val2 = this.transpileExpression(node.whenFalse);

        return this.transpileLuaLibFunction(LuaLibFeature.Ternary, condition,
                                            `function() return ${val1} end`, `function() return ${val2} end`);
    }

    public transpileAssignmentExpression(
        lhs: ts.Expression,
        replacementExpression: ts.BinaryExpression,
        isStatement: boolean,
        returnValueBefore: boolean): string {
        // Assign replacement expression to its left-hand side
        const assignment = ts.createAssignment(lhs, replacementExpression);

        if (isStatement) {
            return this.transpileExpression(assignment);
        } else {
            if (returnValueBefore) {
                const oldValueName = `__originalValue${this.transpileExpression(lhs)}${this.genVarCounter++}`;
                const oldValueAssignment = ts.createVariableStatement(
                [], [ts.createVariableDeclaration(oldValueName, undefined, lhs)]);

                const valueReturn = ts.createReturn(ts.createIdentifier(oldValueName));

                return this.transpileExpression(ts.createImmediatelyInvokedArrowFunction(
                    [oldValueAssignment, ts.createStatement(assignment), valueReturn]));
            } else {
                const valueReturn = ts.createReturn(lhs);
                return this.transpileExpression(
                    ts.createImmediatelyInvokedArrowFunction([ts.createStatement(assignment), valueReturn]));
            }
        }
    }

    public transpilePostfixUnaryExpression(node: ts.PostfixUnaryExpression): string {
        const operand = this.transpileExpression(node.operand, true);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.createBinary(node.operand, ts.SyntaxKind.PlusToken, ts.createLiteral(1)),
                    tsHelper.isExpressionStatement(node),
                    true
                );
            }
            case ts.SyntaxKind.MinusMinusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.createBinary(node.operand, ts.SyntaxKind.MinusToken, ts.createLiteral(1)),
                    tsHelper.isExpressionStatement(node),
                    true
                );
            }
            default:
                const operator = tsHelper.enumName(node.operator, ts.SyntaxKind);
                throw new TranspileError("Unsupported unary postfix: " + operator, node);
        }
    }

    public transpilePrefixUnaryExpression(node: ts.PrefixUnaryExpression): string {
        const operand = this.transpileExpression(node.operand, true);
        switch (node.operator) {
            case ts.SyntaxKind.TildeToken:
                return this.transpileUnaryBitOperation(node, operand);
            case ts.SyntaxKind.PlusPlusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.createBinary(node.operand, ts.SyntaxKind.PlusToken, ts.createLiteral(1)),
                    tsHelper.isExpressionStatement(node),
                    false
                );
            }
            case ts.SyntaxKind.MinusMinusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.createBinary(node.operand, ts.SyntaxKind.MinusToken, ts.createLiteral(1)),
                    tsHelper.isExpressionStatement(node),
                    false
                );
            }
            case ts.SyntaxKind.ExclamationToken:
                return `(not ${operand})`;
            case ts.SyntaxKind.MinusToken:
                return `-${operand}`;
            default:
                const operator = tsHelper.enumName(node.operator, ts.SyntaxKind);
                throw new TranspileError("Unsupported unary prefix: " + operator,
                                         node);
        }
    }

    public transpileNewExpression(node: ts.NewExpression): string {
        const name = this.transpileExpression(node.expression);
        const params = node.arguments ? this.transpileArguments(node.arguments, ts.createTrue()) : "true";

        this.checkForLuaLibType(this.checker.getTypeAtLocation(node));

        return `${name}.new(${params})`;
    }

    public transpileCallExpression(node: ts.CallExpression): string {
        // Check for calls on primitives to override
        let params;
        let callPath;

        const isTupleReturn = tsHelper.isTupleReturnCall(node, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(node);

        if (ts.isPropertyAccessExpression(node.expression)) {
            const result = this.transpilePropertyCall(node);
            return isTupleReturn && !isInDestructingAssignment ? `({ ${result} })` : result;
        }

        // Handle super calls properly
        if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
            params = this.transpileArguments(node.arguments, ts.createNode(ts.SyntaxKind.ThisKeyword) as ts.Expression);
            const className = this.classStack[this.classStack.length - 1];
            return `${className}.__base.constructor(${params})`;
        }

        callPath = this.transpileExpression(node.expression);
        params = this.transpileArguments(node.arguments);
        return isTupleReturn && !isInDestructingAssignment ? `({ ${callPath}(${params}) })` : `${callPath}(${params})`;
    }

    public transpilePropertyCall(node: ts.CallExpression): string {
        let params;
        let callPath;

        // Check if call is actually on a property access expression
        if (!ts.isPropertyAccessExpression(node.expression)) {
            throw new TranspileError("Tried to transpile a non-property call as property call.", node);
        }

        // If the function being called is of type owner.func, get the type of owner
        const ownerType = this.checker.getTypeAtLocation(node.expression.expression);

        if (ownerType.symbol && ownerType.symbol.escapedName === "Math") {
            params = this.transpileArguments(node.arguments);
            return this.transpileMathExpression(node.expression.name) + `(${params})`;
        }

        if (this.transpileExpression((node.expression as ts.PropertyAccessExpression).expression) === "String") {
            params = this.transpileArguments(node.arguments);
            return this.transpileStringExpression(node.expression.name) + `(${params})`;
        }

        switch (ownerType.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transpileStringCallExpression(node);

        }

        if (tsHelper.isArrayType(ownerType, this.checker)) {
            return this.transpileArrayCallExpression(node);
        }

        // Get the type of the function
        const functionType = this.checker.getTypeAtLocation(node.expression);
        // Don't replace . with : for namespaces
        if ((ownerType.symbol && (ownerType.symbol.flags & ts.SymbolFlags.Namespace))
            // If function is defined as property with lambda type use . instead of :
            || (functionType.symbol && (functionType.symbol.flags & ts.SymbolFlags.TypeLiteral))) {
            callPath = this.transpileExpression(node.expression);
            params = this.transpileArguments(node.arguments);
            return `${callPath}(${params})`;
        } else {
            // Replace last . with : here
            const name = this.transpileIdentifier(node.expression.name);
            callPath =
                `${this.transpileExpression(node.expression.expression)}:${name}`;
            params = this.transpileArguments(node.arguments);
            return `${callPath}(${params})`;
        }
    }

    public transpileStringCallExpression(node: ts.CallExpression): string {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transpileArguments(node.arguments);
        const caller = this.transpileExpression(expression.expression);
        const expressionName = this.transpileIdentifier(expression.name);
        switch (expressionName) {
            case "replace":
                return this.transpileLuaLibFunction(LuaLibFeature.StringReplace, caller, params);
            case "indexOf":
                if (node.arguments.length === 1) {
                    return `(string.find(${caller},${params},1,true) or 0)-1`;
                } else {
                    return `(string.find(${caller},${params}+1,true) or 0)-1`;
                }
            case "substr":
                if (node.arguments.length === 1) {
                    return `string.sub(${caller},${params}+1)`;
                } else {
                    const arg1 = this.transpileExpression(node.arguments[0]);
                    const arg2 = this.transpileExpression(node.arguments[1]);
                    return `string.sub(${caller},${arg1}+1,${arg1}+${arg2})`;
                }
            case "substring":
                if (node.arguments.length === 1) {
                    return `string.sub(${caller},${params}+1)`;
                } else {
                    const arg1 = this.transpileExpression(node.arguments[0]);
                    const arg2 = this.transpileExpression(node.arguments[1]);
                    return `string.sub(${caller},${arg1}+1,${arg2})`;
                }
            case "toLowerCase":
                return `string.lower(${caller})`;
            case "toUpperCase":
                return `string.upper(${caller})`;
            case "split":
                return this.transpileLuaLibFunction(LuaLibFeature.StringSplit, caller, params);
            case "charAt":
                return `string.sub(${caller},${params}+1,${params}+1)`;
            default:
                throw new TranspileError("Unsupported string function: " + expressionName, node);
        }
    }

    public getValidStringProperties(): {[js: string]: string} {
        return {
            fromCharCode: "string.char",
        };
    }

    // Transpile a String._ property
    public transpileStringExpression(identifier: ts.Identifier): string {
        const translation = this.getValidStringProperties();
        const identifierString = this.transpileIdentifier(identifier);

        if (translation[identifierString]) {
            return `${translation[identifierString]}`;
        } else {
            throw new TranspileError(`Unsupported string property ${identifierString}, ` +
                                     `is not supported for target Lua ${this.options.luaTarget}.`,
                                     identifier);
        }
    }

    public transpileArrayCallExpression(node: ts.CallExpression): string {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transpileArguments(node.arguments);
        const caller = this.transpileExpression(expression.expression);
        const expressionName = this.transpileIdentifier(expression.name);
        switch (expressionName) {
            case "push":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayPush, caller, params);
            case "forEach":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayForEach, caller, params);
            case "indexOf":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayIndexOf, caller, params);
            case "map":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayMap, caller, params);
            case "filter":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayFilter, caller, params);
            case "some":
                return this.transpileLuaLibFunction(LuaLibFeature.ArraySome, caller, params);
            case "every":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayEvery, caller, params);
            case "slice":
                return this.transpileLuaLibFunction(LuaLibFeature.ArraySlice, caller, params);
            case "splice":
                return this.transpileLuaLibFunction(LuaLibFeature.ArraySplice, caller, params);
            case "join":
                if (node.arguments.length === 0) {
                    // if separator is omitted default separator is ","
                    return `table.concat(${caller}, ",")`;
                } else {
                    return `table.concat(${caller}, ${params})`;
                }
            default:
                throw new TranspileError("Unsupported array function: " + expressionName, node);
        }
    }

    public transpileArguments(params: ts.NodeArray<ts.Expression>, context?: ts.Expression): string {
        const parameters: string[] = [];

        // Add context as first param if present
        if (context) {
            parameters.push(this.transpileExpression(context));
        }

        params.forEach(param => {
            parameters.push(this.transpileExpression(param));
        });

        return parameters.join(",");
    }

    public transpilePropertyAccessExpression(node: ts.PropertyAccessExpression): string {
        const property = node.name.text;

        // Check for primitive types to override
        const type = this.checker.getTypeAtLocation(node.expression);
        switch (type.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transpileStringProperty(node);
            case ts.TypeFlags.Object:
                if (tsHelper.isArrayType(type, this.checker)) {
                    return this.transpileArrayProperty(node);
                } else if (tsHelper.hasGetAccessor(node, this.checker)) {
                    return this.transpileGetAccessor(node);
                }
        }

        this.checkForLuaLibType(type);

        // Do not output path for member only enums
        if (tsHelper.isCompileMembersOnlyEnum(type, this.checker)) {
            return property;
        }

        // Catch math expressions
        if (ts.isIdentifier(node.expression) && this.transpileIdentifier(node.expression) === "Math") {
            return this.transpileMathExpression(node.name);
        }

        const callPath = this.transpileExpression(node.expression);
        return `${callPath}.${property}`;
    }

    public transpileGetAccessor(node: ts.PropertyAccessExpression): string {
        const name = this.transpileIdentifier(node.name);
        const expression = this.transpileExpression(node.expression);
        return `${expression}:get__${name}()`;
    }

    public transpileSetAccessor(node: ts.PropertyAccessExpression, value: string): string {
        const name = this.transpileIdentifier(node.name);
        const expression = this.transpileExpression(node.expression);
        return `${expression}:set__${name}(${value})`;
    }

    // Transpile a Math._ property
    public transpileMathExpression(identifier: ts.Identifier): string {
        const translation = {
            PI: "pi",
            abs: "abs",
            acos: "acos",
            asin: "asin",
            atan: "atan",
            ceil: "ceil",
            cos: "cos",
            exp: "exp",
            floor: "floor",
            log: "log",
            max: "max",
            min: "min",
            pow: "pow",
            random: "random",
            round: "round",
            sin: "sin",
            sqrt: "sqrt",
            tan: "tan",
        };

        const identifierString = this.transpileIdentifier(identifier);

        if (translation[identifierString]) {
            return `math.${translation[identifierString]}`;
        } else {
            throw new TranspileError(`Unsupported math property: ${identifierString}.`, identifier);
        }
    }

    // Transpile access of string properties, only supported properties are allowed
    public transpileStringProperty(node: ts.PropertyAccessExpression): string {
        const propertyName = this.transpileIdentifier(node.name);
        switch (propertyName) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw new TranspileError("Unsupported string property: " + propertyName, node);
        }
    }

    // Transpile access of array properties, only supported properties are allowed
    public transpileArrayProperty(node: ts.PropertyAccessExpression): string {
        const propertyName = this.transpileIdentifier(node.name);
        switch (propertyName) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw new TranspileError("Unsupported array property: " + propertyName, node);
        }
    }

    public transpileElementAccessExpression(node: ts.ElementAccessExpression): string {
        const element = this.transpileExpression(node.expression);
        const index = this.transpileExpression(node.argumentExpression);

        const type = this.checker.getTypeAtLocation(node.expression);
        if (tsHelper.isArrayType(type, this.checker)) {
            return `${element}[${index}+1]`;
        } else if (tsHelper.isStringType(type)) {
            return `string.sub(${element},${index}+1,${index}+1)`;
        } else {
            return `${element}[${index}]`;
        }
    }

    // Counter-act typescript's identifier escaping:
    // https://github.com/Microsoft/TypeScript/blob/master/src/compiler/utilities.ts#L556
    public transpileIdentifier(identifier: ts.Identifier): string {
        const escapedText = identifier.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3
            && escapedText.charCodeAt(0) === underScoreCharCode
            && escapedText.charCodeAt(1) === underScoreCharCode
            && escapedText.charCodeAt(2) === underScoreCharCode) {
            return escapedText.substr(1);
        }
        return escapedText;
    }

    public transpileArrayBindingElement(name: ts.ArrayBindingElement): string {
        if (ts.isOmittedExpression(name)) {
            return "__";
        } else if (ts.isIdentifier(name)) {
            return this.transpileIdentifier(name);
        } else if (ts.isBindingElement(name) && ts.isIdentifier(name.name)) {
            return this.transpileIdentifier(name.name);
        } else {
            const kind = tsHelper.enumName(name.kind, ts.SyntaxKind);
            throw new TranspileError(`Encountered not-supported array binding element kind: ${kind}`, name);
        }
    }

    public transpileTypeOfExpression(node: ts.TypeOfExpression): string {
        const expression = this.transpileExpression(node.expression);
        return `(type(${expression}) == "table" and "object" or type(${expression}))`;
    }

    // Transpile a variable statement
    public transpileVariableStatement(node: ts.VariableStatement): string {
        let result = "";

        node.declarationList.declarations.forEach(declaration => {
            result += this.transpileVariableDeclaration(declaration as ts.VariableDeclaration);
            if (ts.isIdentifier(declaration.name)) {
                this.pushExport(this.transpileIdentifier(declaration.name as ts.Identifier), node);
            }
        });

        return result;
    }

    public transpileDestructingAssignmentValue(node: ts.Expression): string {
        throw new TranspileError(
            `Unsupported destructing statement, ` +
            `destructing statements are not supported for target Lua ${this.options.luaTarget}.`,
            node
        );
    }

    public transpileVariableDeclaration(node: ts.VariableDeclaration): string {
        if (ts.isIdentifier(node.name)) {
            // Find variable identifier
            const identifierName = this.transpileIdentifier(node.name);
            if (node.initializer) {
                const value = this.transpileExpression(node.initializer);
                return `local ${identifierName} = ${value}\n`;
            } else {
                return `local ${identifierName} = nil\n`;
            }
        } else if (ts.isArrayBindingPattern(node.name)) {
            // Destructuring type

            // Disallow ellipsis destruction
            if (node.name.elements.some(elem => !ts.isBindingElement(elem) || elem.dotDotDotToken !== undefined)) {
                throw new TranspileError(`Ellipsis destruction is not allowed.`, node);
            }

            const vars = node.name.elements.map(e => this.transpileArrayBindingElement(e)).join(",");

            // Don't unpack TupleReturn decorated functions
            if (tsHelper.isTupleReturnCall(node.initializer, this.checker)) {
                return `local ${vars}=${this.transpileExpression(node.initializer)}\n`;
            } else {
                return `local ${vars}=${this.transpileDestructingAssignmentValue(node.initializer)}\n`;
            }
        } else {
            throw new TranspileError(
                "Unsupported variable declaration type: " + tsHelper.enumName(node.name.kind, ts.SyntaxKind),
                node
            );
        }
    }

    public transpileFunctionDeclaration(node: ts.FunctionDeclaration): string {
        // Don't transpile functions without body (overload declarations)
        if (!node.body) { return ""; }

        let result = "";
        const identifier = node.name;
        const methodName = this.transpileIdentifier(identifier);
        const parameters = node.parameters;
        const body = node.body;

        // Build parameter string
        const paramNames: string[] = [];

        let spreadIdentifier = "";

        // Only push parameter name to paramName array if it isn't a spread parameter
        for (const param of parameters) {
            const paramName = this.transpileIdentifier(param.name as ts.Identifier);

            // This parameter is a spread parameter (...param)
            if (!param.dotDotDotToken) {
                paramNames.push(paramName);
            } else {
                spreadIdentifier = paramName;
                // Push the spread operator into the paramNames array
                paramNames.push("...");
            }
        }

        // Build function header
        result += this.indent + this.accessPrefix(node) + `function ${methodName}(${paramNames.join(",")})\n`;

        this.pushIndent();

        // Push spread operator here
        if (spreadIdentifier !== "") {
            result += this.indent + `local ${spreadIdentifier} = { ... }\n`;
        }

        result += this.transpileBlock(body);
        this.popIndent();

        // Close function block
        result += this.indent + "end\n";

        this.pushExport(methodName, node);

        return result;
    }

    public transpileMethodDeclaration(node: ts.MethodDeclaration, callPath: string): string {
        // Don't transpile methods without body (overload declarations)
        if (!node.body) { return ""; }

        let result = "";
        const identifier = node.name as ts.Identifier;
        const methodName = this.transpileIdentifier(identifier);
        const parameters = node.parameters;
        const body = node.body;

        // Build parameter string
        const paramNames: string[] = ["self"];

        let spreadIdentifier = "";

        // Only push parameter name to paramName array if it isn't a spread parameter
        for (const param of parameters) {
            const paramName = this.transpileIdentifier(param.name as ts.Identifier);

            // This parameter is a spread parameter (...param)
            if (!param.dotDotDotToken) {
                paramNames.push(paramName);
            } else {
                spreadIdentifier = paramName;
                // Push the spread operator into the paramNames array
                paramNames.push("...");
            }
        }
        // Parameters with default values
        const defaultValueParams = node.parameters.filter(declaration => declaration.initializer !== undefined);

        // Build function header
        result += this.indent + `function ${callPath}${methodName}(${paramNames.join(",")})\n`;

        this.pushIndent();

        // Push spread operator here
        if (spreadIdentifier !== "") {
            result += this.indent + `local ${spreadIdentifier} = { ... }\n`;
        }

        result += this.transpileParameterDefaultValues(defaultValueParams);
        result += this.transpileBlock(body);
        this.popIndent();

        // Close function block
        result += this.indent + "end\n";

        return result;
    }

    // Transpile a class declaration
    public transpileClass(node: ts.ClassDeclaration): string {
        if (!node.name) {
            throw new TranspileError("Class declaration has no name.", node);
        }

        let className = this.transpileIdentifier(node.name);

        // Find out if this class is extension of existing class
        const isExtension = tsHelper.isExtensionClass(this.checker.getTypeAtLocation(node), this.checker);

        // Get type that is extended
        const extendsType = tsHelper.getExtendedType(node, this.checker);

        // Get all properties with value
        const properties = node.members.filter(ts.isPropertyDeclaration)
            .filter(member => member.initializer);

        // Divide properties into static and non-static
        const isStatic = prop => prop.modifiers && prop.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
        const staticFields = properties.filter(isStatic);
        const instanceFields = properties.filter(prop => !isStatic(prop));

        let result = "";

        if (!isExtension) {
            result += this.transpileClassCreationMethods(node, instanceFields, extendsType);
        } else {
            // export empty table
            this.pushExport(className, node, true);
        }

        // Overwrite the original className with the class we are overriding for extensions
        if (isExtension && extendsType) {
            className = extendsType.symbol.escapedName as string;
        }

        // Add static declarations
        for (const field of staticFields) {
            const fieldName = this.transpileIdentifier(field.name as ts.Identifier);
            const value = this.transpileExpression(field.initializer);
            result += this.indent + `${className}.${fieldName} = ${value}\n`;
        }

        // Try to find constructor
        const constructor = node.members.filter(ts.isConstructorDeclaration)[0];
        if (constructor) {
            // Add constructor plus initialization of instance fields
            result += this.transpileConstructor(constructor, className);
        } else if (!isExtension) {
            // Generate a constructor if none was defined
            result += this.transpileConstructor(ts.createConstructor([], [], [], ts.createBlock([], true)),
                                                className);
        }

        // Transpile get accessors
        node.members.filter(ts.isGetAccessor).forEach(getAccessor => {
            result += this.transpileGetAccessorDeclaration(getAccessor, className);
        });

        // Transpile set accessors
        node.members.filter(ts.isSetAccessor).forEach(setAccessor => {
            result += this.transpileSetAccessorDeclaration(setAccessor, className);
        });

        // Transpile methods
        node.members.filter(ts.isMethodDeclaration).forEach(method => {
            result += this.transpileMethodDeclaration(method, `${className}.`);
        });

        return result;
    }

    public transpileClassCreationMethods(node: ts.ClassDeclaration, instanceFields: ts.PropertyDeclaration[],
                                         extendsType: ts.Type): string {
        const className = this.transpileIdentifier(node.name);

        const noClassOr = extendsType && tsHelper.hasCustomDecorator(extendsType, this.checker, "!NoClassOr");

        let result = "";

        // Write class declaration
        const classOr = noClassOr ? "" : `${className} or `;
        if (!extendsType) {
            result += this.indent + this.accessPrefix(node) + `${className} = ${classOr}{}\n`;
            this.pushExport(className, node);
        } else {
            const baseName = extendsType.symbol.escapedName;
            result += this.indent + this.accessPrefix(node) + `${className} = ${classOr}${baseName}.new()\n`;
            this.pushExport(className, node);
        }
        result += this.indent + `${className}.__index = ${className}\n`;
        if (extendsType) {
            const baseName = extendsType.symbol.escapedName;
            result += this.indent + `${className}.__base = ${baseName}\n`;
        }
        result += this.indent + `function ${className}.new(construct, ...)\n`;
        result += this.indent + `    local instance = setmetatable({}, ${className})\n`;

        for (const f of instanceFields) {
            // Get identifier
            const fieldIdentifier = f.name as ts.Identifier;
            const fieldName = this.transpileIdentifier(fieldIdentifier);

            const value = this.transpileExpression(f.initializer);

            result += this.indent + `    instance.${fieldName} = ${value}\n`;
        }

        result += this.indent + `    if construct and ${className}.constructor then `
                      + `${className}.constructor(instance, ...) end\n`;

        result += this.indent + `    return instance\n`;
        result += this.indent + `end\n`;

        return result;
    }

    public transpileGetAccessorDeclaration(getAccessor: ts.GetAccessorDeclaration, className: string): string {
        const name = this.transpileIdentifier(getAccessor.name as ts.Identifier);

        let result = this.indent + `function ${className}.get__${name}(self)\n`;

        this.pushIndent();
        result += this.transpileBlock(getAccessor.body);
        this.popIndent();

        result += this.indent + `end\n`;

        return result;
    }

    public transpileSetAccessorDeclaration(setAccessor: ts.SetAccessorDeclaration, className: string): string {
        const name = this.transpileIdentifier(setAccessor.name as ts.Identifier);

        const paramNames: string[] = ["self"];
        setAccessor.parameters.forEach(param => {
            paramNames.push(this.transpileIdentifier(param.name as ts.Identifier));
        });

        let result = this.indent + `function ${className}.set__${name}(${paramNames.join(",")})\n`;

        this.pushIndent();
        result += this.transpileBlock(setAccessor.body);
        this.popIndent();

        result += this.indent + `end\n`;

        return result;
    }

    public transpileConstructor(node: ts.ConstructorDeclaration,
                                className: string): string {
        const extraInstanceFields = [];

        const parameters = ["self"];
        node.parameters.forEach(param => {
            // If param has decorators, add extra instance field
            if (param.modifiers !== undefined) {
                extraInstanceFields.push(this.transpileIdentifier(param.name as ts.Identifier));
            }
            // Add to parameter list
            parameters.push(this.transpileIdentifier(param.name as ts.Identifier));
        });

        let result = this.indent + `function ${className}.constructor(${parameters.join(",")})\n`;

        // Add in instance field declarations
        for (const f of extraInstanceFields) {
            result += this.indent + `    self.${f} = ${f}\n`;
        }

        // Transpile constructor body
        this.pushIndent();
        this.classStack.push(className);
        result += this.transpileBlock(node.body);
        this.classStack.pop();
        this.popIndent();

        return result + this.indent + "end\n";
    }

    public transpileArrayLiteral(node: ts.ArrayLiteralExpression): string {
        const values: string[] = [];

        node.elements.forEach(child => {
            values.push(this.transpileExpression(child));
        });

        return "{" + values.join(",") + "}";
    }

    public transpileObjectLiteral(node: ts.ObjectLiteralExpression): string {
        const properties: string[] = [];
        // Add all property assignments
        node.properties.forEach(element => {
            let name = "";
            if (ts.isIdentifier(element.name)) {
                name = this.transpileIdentifier(element.name);
            } else if (ts.isComputedPropertyName(element.name)) {
                name = this.transpileExpression(element.name);
            } else {
                name = `[${this.transpileExpression(element.name)}]`;
            }

            if (ts.isPropertyAssignment(element)) {
                const expression = this.transpileExpression(element.initializer);
                properties.push(`${name} = ${expression}`);
            } else {
                const elementKind = tsHelper.enumName(element.kind, ts.SyntaxKind);
                throw new TranspileError(`Encountered unsupported object literal element: ${elementKind}.`, node);
            }
        });

        return "{" + properties.join(",") + "}";
    }

    public transpileFunctionExpression(node: ts.ArrowFunction): string {
        // Build parameter string
        const paramNames: string[] = [];
        node.parameters.forEach(param => {
            paramNames.push(this.transpileIdentifier(param.name as ts.Identifier));
        });

        const defaultValueParams = node.parameters.filter(declaration => declaration.initializer !== undefined);

        if (ts.isBlock(node.body) || defaultValueParams.length > 0) {
            let result = `function(${paramNames.join(",")})\n`;
            this.pushIndent();
            result += this.transpileParameterDefaultValues(defaultValueParams);
            result += this.transpileBlock(node.body as ts.Block);
            this.popIndent();
            return result + this.indent + "end\n";
        } else {
            // Transpile as return value
            const returnVal = this.transpileReturn(ts.createReturn(node.body));
            return `function(${paramNames.join(",")}) ${returnVal} end`;
        }
    }

    public transpileParameterDefaultValues(params: ts.ParameterDeclaration[]): string {
        let result = "";

        params.filter(declaration => declaration.initializer !== undefined).forEach(declaration => {
            const paramName = this.transpileIdentifier(declaration.name as ts.Identifier);
            const paramValue = this.transpileExpression(declaration.initializer);
            result += this.indent + `if ${paramName}==nil then ${paramName}=${paramValue} end\n`;
        });

        return result;
    }

    public checkForLuaLibType(type: ts.Type): void {
        if (type.symbol) {
            switch (this.checker.getFullyQualifiedName(type.symbol)) {
                case "Map":
                    this.importLuaLibFeature(LuaLibFeature.Map);
                    return;
                case "Set":
                    this.importLuaLibFeature(LuaLibFeature.Set);
                    return;
            }
        }
    }
}
