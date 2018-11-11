import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { CompilerOptions } from "./CompilerOptions";
import { DecoratorKind } from "./Decorator";
import { TSTLErrors } from "./Errors";
import { TSHelper as tsHelper } from "./TSHelper";

/* tslint:disable */
const packageJSON = require("../package.json");
/* tslint:enable */

export enum LuaTarget {
    Lua51 = "5.1",
    Lua52 = "5.2",
    Lua53 = "5.3",
    LuaJIT = "jit",
}

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayIndexOf = "ArrayIndexOf",
    ArrayMap = "ArrayMap",
    ArrayPush = "ArrayPush",
    ArrayReverse = "ArrayReverse",
    ArrayShift = "ArrayShift",
    ArrayUnshift = "ArrayUnshift",
    ArraySort = "ArraySort",
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
    // Lua key words for this Lua target
    // https://www.lua.org/manual/5.0/manual.html#2.1
    public luaKeywords: Set<string> = new Set(
        ["and", "break", "do", "else", "elseif",
         "end", "false", "for", "function", "if",
         "in", "local", "nil", "not", "or",
         "repeat", "return", "then", "until", "while"]);

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

        if (!this.options.luaTarget) {
            this.options.luaTarget = LuaTarget.LuaJIT;
        }
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
            this.namespace.length === 0 &&
            (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export)
           ) {
            if (dummy) {
                result = this.indent + `exports.${this.definitionName(name)} = {}\n`;
            } else {
                result = this.indent + `exports.${this.definitionName(name)} = ${name}\n`;
            }
        }
        if (this.namespace.length !== 0 &&
            (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export)) {
            if (dummy) {
                result += this.indent + `${this.namespace[this.namespace.length - 1]}.${name} = {}\n`;
            } else {
                result += this.indent + `${this.namespace[this.namespace.length - 1]}.${name} = ${name}\n`;
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

    public computeEnumMembers(node: ts.EnumDeclaration): Array<{ name: string, value: string | number }> {
        let val: number | string = 0;
        let hasStringInitializers = false;

        return node.members.map(member => {
            if (member.initializer) {
                if (ts.isNumericLiteral(member.initializer)) {
                    val = parseInt(member.initializer.text);
                } else if (ts.isStringLiteral(member.initializer)) {
                    hasStringInitializers = true;
                    val = `"${member.initializer.text}"`;
                } else {
                    throw TSTLErrors.InvalidEnumMember(member.initializer);
                }
            } else if (hasStringInitializers) {
                throw TSTLErrors.HeterogeneousEnum(node);
            }

            const enumMember = { name: this.transpileIdentifier(member.name as ts.Identifier), value: val };

            if (typeof val === "number") {
              val++;
            }

            return enumMember;
        });
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
        if (this.options.luaLibImport === LuaLibImportKind.Inline && this.luaLibFeatureSet.size > 0) {
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
                return this.indent + this.transpileVariableStatement(node as ts.VariableStatement);
            case ts.SyntaxKind.ExpressionStatement:
                return this.indent + this.transpileExpression((node as ts.ExpressionStatement).expression) + ";\n";
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
                return this.indent + this.transpileThrow(node as ts.ThrowStatement) + ";\n";
            case ts.SyntaxKind.ContinueStatement:
                return this.transpileContinue(node as ts.ContinueStatement);
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                // Ignore these
                return "";
            default:
                return this.indent + this.transpileExpression(node) + "\n";
        }
    }

    public transpileLuaLibFunction(func: LuaLibFeature, ...params: string[]): string {
        this.importLuaLibFeature(func);
        params = params.filter(element => element.toString() !== "");
        return `__TS__${func}(${params.join(", ")})`;
    }

    public transpileImport(node: ts.ImportDeclaration): string {
        const importPath = this.transpileExpression(node.moduleSpecifier);
        const importPathWithoutQuotes = importPath.replace(new RegExp("\"", "g"), "");

        if (!node.importClause || !node.importClause.namedBindings) {
            throw TSTLErrors.DefaultImportsNotSupported(node);
        }

        const imports = node.importClause.namedBindings;

        const requireKeyword = "require";

        if (ts.isNamedImports(imports)) {
            const fileImportTable = path.basename(importPathWithoutQuotes) + this.importCount;
            const resolvedImportPath = this.getImportPath(importPathWithoutQuotes);

            let result = `local ${fileImportTable} = ${requireKeyword}(${resolvedImportPath})\n`;
            this.importCount++;

            const filteredElements = imports.elements.filter(e => {
                const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(e), this.checker);
                return !decorators.has(DecoratorKind.Extension) && !decorators.has(DecoratorKind.MetaExtension);
            });

            if (filteredElements.length === 0) {
                return "";
            }

            filteredElements.forEach(element => {
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
            return `local ${this.transpileIdentifier(imports.name)} = ${requireKeyword}(${resolvedImportPath})\n`;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }

    public transpileNamespace(node: ts.ModuleDeclaration): string {
        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(node), this.checker);
        // If phantom namespace just transpile the body as normal
        if (decorators.has(DecoratorKind.Phantom) && node.body) {
            return this.transpileNode(node.body);
        }

        const defName = this.definitionName(node.name.text);
        // Initialize to pre-existing export if one exists
        const prefix = (this.namespace.length === 0 && this.isModule &&
            (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) ? `exports.${node.name.text} or ` : "";
        let result =
            this.indent +
            this.accessPrefix(node) +
            `${node.name.text} = ${prefix}${node.name.text} or {}\n`;

        this.pushExport(node.name.text, node);
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
        const type = this.checker.getTypeAtLocation(node);

        // Const enums should never appear in the resulting code
        if (type.symbol.getFlags() & ts.SymbolFlags.ConstEnum) {
            return "";
        }

        const membersOnly = tsHelper.getCustomDecorators(type, this.checker)
                                    .has(DecoratorKind.CompileMembersOnly);

        let result = "";

        if (!membersOnly) {
            const name = this.transpileIdentifier(node.name);
            result += this.indent + this.accessPrefix(node) + `${name}={}\n`;
            this.pushExport(name, node);
        }

        this.computeEnumMembers(node).forEach(enumMember => {
            if (membersOnly) {
                const defName = this.definitionName(enumMember.name);
                result += this.indent + `${defName}=${enumMember.value}\n`;
            } else {
                const defName = `${this.transpileIdentifier(node.name)}.${enumMember.name}`;
                result += this.indent + `${defName}=${enumMember.value}\n`;
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
        throw TSTLErrors.UnsupportedForTarget("Continue statement", this.options.luaTarget, node);
    }

    public transpileIf(node: ts.IfStatement): string {
        const condition = this.transpileExpression(node.expression);

        let result = this.indent + `if ${condition} then\n`;
        this.pushIndent();
        result += this.transpileStatement(node.thenStatement);
        this.popIndent();

        let elseStatement = node.elseStatement;
        while (elseStatement && ts.isIfStatement(elseStatement)) {
            const elseIfCondition = this.transpileExpression(elseStatement.expression);
            result += this.indent + `elseif ${elseIfCondition} then\n`;
            this.pushIndent();
            result += this.transpileStatement(elseStatement.thenStatement);
            this.popIndent();
            elseStatement = elseStatement.elseStatement;
        }

        if (elseStatement) {
            result += this.indent + "else\n";
            this.pushIndent();
            result += this.transpileStatement(elseStatement);
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
            result += this.indent + this.transpileVariableDeclaration(variableDeclaration) + "\n";
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
        const iterable = this.transpileExpression(node.expression);

        // Use ipairs for array types, pairs otherwise
        const isArray = tsHelper.isArrayType(this.checker.getTypeAtLocation(node.expression), this.checker);

        let result = "";

        if (!isArray && ts.isIdentifier(variable.name)) {
            result = this.indent + `for _, ${this.transpileIdentifier(variable.name)} in pairs(${iterable}) do\n`;
        } else {
            let itemVariable: ts.Identifier;
            if (isArray) {
                // Cache the expression result
                result += this.indent + `local __loopVariable${this.genVarCounter} = ${iterable};\n`;
                result += this.indent + `for i${this.genVarCounter}=1, #__loopVariable${this.genVarCounter} do\n`;
                itemVariable = ts.createIdentifier(`__loopVariable${this.genVarCounter}[i${this.genVarCounter}]`);
            } else {
                const variableName = `__forOfValue${this.genVarCounter}`;
                itemVariable =  ts.createIdentifier(variableName);
                result += this.indent + `for _, ${variableName} in pairs(${iterable}) do\n`;
            }

            const declaration = ts.createVariableDeclaration(variable.name, undefined, itemVariable);
            this.pushIndent();
            result += this.indent + this.transpileVariableDeclaration(declaration) + ";\n";
            this.popIndent();
        }

        // For body
        this.pushIndent();
        result += this.transpileLoopBody(node);
        this.popIndent();

        this.genVarCounter++;

        return result + this.indent + "end\n";
    }

    public transpileForIn(node: ts.ForInStatement): string {
        // Get variable identifier
        const variable = (node.initializer as ts.VariableDeclarationList).declarations[0] as ts.VariableDeclaration;
        const identifier = variable.name as ts.Identifier;

        // Transpile expression
        const expression = this.transpileExpression(node.expression);

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(node.expression), this.checker)) {
            throw TSTLErrors.ForbiddenForIn(node);
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
        throw TSTLErrors.UnsupportedForTarget("Switch statements", this.options.luaTarget, node);
    }

    public transpileTry(node: ts.TryStatement): string {
        let result = this.indent + "do\n";
        this.pushIndent();

        result += this.indent;
        if (node.catchClause) {
            result += "local __TS_try";
            if (node.catchClause.variableDeclaration) {
                const variableName = this.transpileIdentifier(
                    node.catchClause.variableDeclaration.name as ts.Identifier);
                result += ", " + variableName;
            }
            result += " = ";
        }

        result += "pcall(function()\n";
        this.pushIndent();
        result += this.transpileBlock(node.tryBlock);
        this.popIndent();
        result += this.indent + "end);\n";

        if (node.catchClause) {
            result += this.indent + `if not __TS_try then\n`;
            this.pushIndent();
            result += this.transpileBlock(node.catchClause.block);
            this.popIndent();
            result += this.indent + "end\n";
        }

        if (node.finallyBlock) {
            result += this.indent + "do\n";
            this.pushIndent();
            result += this.transpileBlock(node.finallyBlock);
            this.popIndent();
            result += this.indent + "end\n";
        }

        this.popIndent();
        result += this.indent + "end\n";
        return result;
    }

    public transpileThrow(node: ts.ThrowStatement): string {
        const type = this.checker.getTypeAtLocation(node.expression);
        if (tsHelper.isStringType(type)) {
            return `error(${this.transpileExpression(node.expression)})`;
        } else {
            throw TSTLErrors.InvalidThrowExpression(node.expression);
        }
    }

    public transpileReturn(node: ts.ReturnStatement): string {
        if (node.expression) {
            if (tsHelper.isInTupleReturnFunction(node, this.checker)) {
                // Parent function is a TupleReturn function
                if (ts.isArrayLiteralExpression(node.expression)) {
                    // If return expression is an array literal, leave out brackets.
                    return "return " + node.expression.elements.map(elem => this.transpileExpression(elem)).join(",");
                } else if (!tsHelper.isTupleReturnCall(node.expression, this.checker)) {
                    // If return expression is not another TupleReturn call, unpack it
                    return `return ${this.transpileDestructingAssignmentValue(node.expression)}`;
                }
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
            case ts.SyntaxKind.SpreadElement:
                return this.transpileSpreadElement(node as ts.SpreadElement);
            case ts.SyntaxKind.NonNullExpression:
                return this.transpileExpression((node as ts.NonNullExpression).expression);
            case ts.SyntaxKind.ClassExpression:
                this.namespace.push("");
                const classDeclaration =  this.transpileClass(node as ts.ClassExpression, "_");
                this.namespace.pop();
                return `(function() ${classDeclaration}; return _ end)()`;
            case ts.SyntaxKind.Block:
                this.pushIndent();
                const ret = "do \n" + this.transpileBlock(node as ts.Block) + "end\n";
                this.popIndent();
                return ret;
            default:
                throw TSTLErrors.UnsupportedKind("expression", node.kind, node);
        }
    }

    public transpileBinaryExpression(node: ts.BinaryExpression, brackets?: boolean): string {
        // Check if this is an assignment token, then handle accordingly
        const [isAssignment, operator] = tsHelper.isBinaryAssignmentToken(node.operatorToken.kind);
        if (isAssignment) {
            return this.transpileAssignmentExpression(
                node.left,
                operator,
                node.right,
                tsHelper.isExpressionStatement(node),
                false
            );
        }

        // Transpile operands
        const lhs = this.transpileExpression(node.left, true);
        const rhs = this.transpileExpression(node.right, true);

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
                    result = this.transpileAssignment(node, lhs, rhs);
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
                    throw TSTLErrors.UnsupportedKind("binary operator", node.kind, node);
            }
        }

        // Optionally put brackets around result
        if (brackets) {
            return `(${result})`;
        } else {
            return result;
        }
    }

    public transpileAssignment(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        if (tsHelper.hasSetAccessor(node.left, this.checker)) {
            return this.transpileSetAccessor(node.left as ts.PropertyAccessExpression, rhs);
        }

        if (ts.isArrayLiteralExpression(node.left)) {
            // Destructing assignment
            const vars = node.left.elements.map(e => this.transpileExpression(e)).join(",");
            const vals = tsHelper.isTupleReturnCall(node.right, this.checker)
                ? rhs : this.transpileDestructingAssignmentValue(node.right);
            if (tsHelper.isExpressionStatement(node)) {
                // In JS, the right side of a destructuring assignment is evaluated before the left
                const tmps = node.left.elements.map((_, i) => `__TS_tmp${i}`).join(",");
                return `do local ${tmps} = ${vals}; ${vars} = ${tmps} end`;
            } else {
                return `(function(...) ${vars} = ...; return {...} end)(${vals})`;
            }
        }

        if (tsHelper.isExpressionStatement(node)) {
            return `${lhs} = ${rhs}`;
        }

        const [hasEffects, objExp, indexExp] = tsHelper.isAccessExpressionWithEvaluationEffects(
            node.left, this.checker);
        if (hasEffects) {
            // Property/element access expressions need to have individual parts cached
            const obj = this.transpileExpression(objExp);
            const index = this.transpileExpression(indexExp);
            return `(function(o, i, v) o[i] = v; return v end)(${obj}, ${index}, ${rhs})`;
        } else if (tsHelper.isExpressionWithEvaluationEffect(node.right)) {
            // Cache right-hand express in temp
            return `(function() local __TS_tmp = ${rhs}; ${lhs} = __TS_tmp; return __TS_tmp end)()`;
        } else {
            return `(function() ${lhs} = ${rhs}; return ${rhs} end)()`;
        }
    }

    public transpileUnaryBitOperation(node: ts.PrefixUnaryExpression, operand: string): string {
        throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.options.luaTarget, node);
    }

    public transpileBitOperation(node: ts.BinaryExpression, lhs: string, rhs: string): string {
        throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.options.luaTarget, node);
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

    public transpileBinaryAssignmentExpression(
        assignee: ts.Expression,
        lhs: ts.Expression,
        operator: ts.BinaryOperator,
        rhs: ts.Expression,
        pos: number): string {
        const opExp = ts.createBinary(lhs, operator, rhs);
        opExp.pos = pos;
        const assignExp = ts.createAssignment(assignee, opExp);
        return this.transpileBinaryExpression(assignExp);
    }

    public transpileAssignmentExpression(
        lhs: ts.Expression,
        operator: ts.BinaryOperator,
        rhs: ts.Expression,
        isStatement: boolean,
        returnValueBefore: boolean): string {
        let statement: string; // Assignment statement
        let result: string; // Result if expression
        let wrap = true; // Wrap statement in do...end
        const pos = (lhs.parent ? lhs.parent : lhs).pos;
        const [hasEffects, objExp, indexExp] = tsHelper.isAccessExpressionWithEvaluationEffects(lhs, this.checker);
        if (hasEffects) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            const objIdent = ts.createIdentifier("__TS_obj");
            const indexIdent = ts.createIdentifier("__TS_index");
            const tempIdent = ts.createIdentifier("__TS_tmp");
            const accessExp = ts.createElementAccess(objIdent, indexIdent);
            rhs = ts.createParen(rhs);
            const obj = this.transpileExpression(objExp);
            const index = this.transpileExpression(indexExp);
            let assignTemp: string;
            let assign: string;
            if (returnValueBefore) {
                // Postfix
                assignTemp = this.transpileBinaryExpression(ts.createAssignment(tempIdent, accessExp));
                assign = this.transpileBinaryAssignmentExpression(accessExp, tempIdent, operator, rhs, pos);
            } else {
                assignTemp = this.transpileBinaryAssignmentExpression(tempIdent, accessExp, operator, rhs, pos);
                assign = this.transpileBinaryExpression(ts.createAssignment(accessExp, tempIdent));
            }
            statement = `local __TS_obj, __TS_index = ${obj}, ${index}; local ${assignTemp}; ${assign}`;
            result = "__TS_tmp";

        } else if (!isStatement && returnValueBefore) {
            // Postfix expressions need to cache original value in temp
            const tempIdent = ts.createIdentifier("__TS_tmp");
            const assignTemp = this.transpileBinaryExpression(ts.createAssignment(tempIdent, lhs));
            const assign = this.transpileBinaryAssignmentExpression(lhs, tempIdent, operator, rhs, pos);
            statement = `local ${assignTemp}; ${assign}`;
            result = "__TS_tmp";

        } else if (!isStatement && (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs))) {
            // Simple property/element access expressions need to cache in temp to avoid double-evaluation
            const tempIdent = ts.createIdentifier("__TS_tmp");
            const assignTemp = this.transpileBinaryAssignmentExpression(tempIdent, lhs, operator, rhs, pos);
            const assign = this.transpileBinaryExpression(ts.createAssignment(lhs, tempIdent));
            statement = `local ${assignTemp}; ${assign}`;
            result = "__TS_tmp";

        } else {
            // Simple statements/expressions
            statement = this.transpileBinaryAssignmentExpression(lhs, lhs, operator, rhs, pos);
            result = this.transpileExpression(lhs);
            wrap = false;
        }

        if (isStatement) {
            return wrap ? `do ${statement}; end` : statement;
        } else {
            return `(function() ${statement}; return ${result} end)()`;
        }
    }

    public transpilePostfixUnaryExpression(node: ts.PostfixUnaryExpression): string {
        const operand = this.transpileExpression(node.operand, true);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.SyntaxKind.PlusToken,
                    ts.createLiteral(1),
                    tsHelper.isExpressionStatement(node),
                    true
                );
            }
            case ts.SyntaxKind.MinusMinusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.SyntaxKind.MinusToken,
                    ts.createLiteral(1),
                    tsHelper.isExpressionStatement(node),
                    true
                );
            }
            default:
                throw TSTLErrors.UnsupportedKind("unary postfix operator", node.operator, node);
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
                    ts.SyntaxKind.PlusToken,
                    ts.createLiteral(1),
                    tsHelper.isExpressionStatement(node),
                    false
                );
            }
            case ts.SyntaxKind.MinusMinusToken: {
                return this.transpileAssignmentExpression(
                    node.operand,
                    ts.SyntaxKind.MinusToken,
                    ts.createLiteral(1),
                    tsHelper.isExpressionStatement(node),
                    false
                );
            }
            case ts.SyntaxKind.ExclamationToken:
                return `(not ${operand})`;
            case ts.SyntaxKind.MinusToken:
                return `-${operand}`;
            case ts.SyntaxKind.PlusToken:
                return `tonumber(${operand})`;
            default:
                throw TSTLErrors.UnsupportedKind("unary prefix operator", node.operator, node);
        }
    }

    public transpileNewExpression(node: ts.NewExpression): string {
        const name = this.transpileExpression(node.expression);
        const params = node.arguments ? this.transpileArguments(node.arguments, ts.createTrue()) : "true";
        const type = this.checker.getTypeAtLocation(node);
        const classDecorators = tsHelper.getCustomDecorators(type, this.checker);

        this.checkForLuaLibType(type);

        if (classDecorators.has(DecoratorKind.Extension) || classDecorators.has(DecoratorKind.MetaExtension)) {
            throw TSTLErrors.InvalidNewExpressionOnExtension(node);
        }

        if (classDecorators.has(DecoratorKind.CustomConstructor)) {
            const customDecorator = classDecorators.get(DecoratorKind.CustomConstructor);
            if (!customDecorator.args[0]) {
                throw TSTLErrors.InvalidDecoratorArgumentNumber("!CustomConstructor", 0, 1, node);
            }
            return `${customDecorator.args[0]}(${this.transpileArguments(node.arguments)})`;
        }

        return `${name}.new(${params})`;
    }

    public transpileCallExpression(node: ts.CallExpression): string {
        // Check for calls on primitives to override
        let params;
        let callPath;

        const isTupleReturn = tsHelper.isTupleReturnCall(node, this.checker);
        const isTupleReturnForward = node.parent && ts.isReturnStatement(node.parent)
            && tsHelper.isInTupleReturnFunction(node, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(node);
        const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);

        if (ts.isPropertyAccessExpression(node.expression)) {
            const result = this.transpilePropertyCall(node);
            return isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment && returnValueIsUsed
                ? `({ ${result} })` : result;
        }

        // Handle super calls properly
        if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
            params = this.transpileArguments(node.arguments, ts.createNode(ts.SyntaxKind.ThisKeyword) as ts.Expression);
            const className = this.classStack[this.classStack.length - 1];
            return `${className}.__base.constructor(${params})`;
        }

        callPath = this.transpileExpression(node.expression);
        params = this.transpileArguments(node.arguments);
        return isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment && returnValueIsUsed
            ? `({ ${callPath}(${params}) })` : `${callPath}(${params})`;
    }

    public transpilePropertyCall(node: ts.CallExpression): string {
        let params;
        let callPath;

        // Check if call is actually on a property access expression
        if (!ts.isPropertyAccessExpression(node.expression)) {
            throw TSTLErrors.InvalidPropertyCall(node);
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
        // Don't replace . with : for namespaces or functions defined as properties with lambdas
        if ((functionType.symbol && !(functionType.symbol.flags & ts.SymbolFlags.Method))
            // Check explicitly for method calls on 'this', since they don't have the Method flag set
            || (node.expression.expression.kind === ts.SyntaxKind.ThisType)) {
            callPath = this.transpileExpression(node.expression);
            params = this.transpileArguments(node.arguments);
            return `${callPath}(${params})`;
        } else if (node.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
            // Super calls take the format of super.call(self,...)
            params = this.transpileArguments(node.arguments, ts.createNode(ts.SyntaxKind.ThisKeyword) as ts.Expression);
            return `${this.transpileExpression(node.expression)}(${params})`;
        } else {
            // Replace last . with : here
            const name = this.transpileIdentifier(node.expression.name);
            if (name === "toString") {
                return  `tostring(${this.transpileExpression(node.expression.expression)})`;
            } else if (name === "hasOwnProperty") {
                const expr = this.transpileExpression(node.expression.expression);
                params = this.transpileArguments(node.arguments);
                return `(rawget(${expr}, ${params} )~=nil)`;
            } else {
                callPath =
                `${this.transpileExpression(node.expression.expression)}:${name}`;
                params = this.transpileArguments(node.arguments);
                return `${callPath}(${params})`;
            }
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
                    const arg1 = this.transpileExpression(node.arguments[0]);
                    const arg2 = this.transpileExpression(node.arguments[1]);
                    return `(string.find(${caller},${arg1},(${arg2})+1,true) or 0)-1`;
                }
            case "substr":
                if (node.arguments.length === 1) {
                    return `string.sub(${caller},(${params})+1)`;
                } else {
                    const arg1 = this.transpileExpression(node.arguments[0]);
                    const arg2 = this.transpileExpression(node.arguments[1]);
                    return `string.sub(${caller},(${arg1})+1,(${arg1})+(${arg2}))`;
                }
            case "substring":
                if (node.arguments.length === 1) {
                    return `string.sub(${caller},(${params})+1)`;
                } else {
                    const arg1 = this.transpileExpression(node.arguments[0]);
                    const arg2 = this.transpileExpression(node.arguments[1]);
                    return `string.sub(${caller},(${arg1})+1,${arg2})`;
                }
            case "toLowerCase":
                return `string.lower(${caller})`;
            case "toUpperCase":
                return `string.upper(${caller})`;
            case "split":
                return this.transpileLuaLibFunction(LuaLibFeature.StringSplit, caller, params);
            case "charAt":
                return `string.sub(${caller},(${params})+1,(${params})+1)`;
            default:
                throw TSTLErrors.UnsupportedProperty("string", expressionName, node);
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
            throw TSTLErrors.UnsupportedForTarget(`string property ${identifierString}`,
                                                  this.options.luaTarget,
                                                  identifier);
        }
    }

    public transpileArrayCallExpression(node: ts.CallExpression): string {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transpileArguments(node.arguments);
        const caller = this.transpileExpression(expression.expression);
        const expressionName = this.transpileIdentifier(expression.name);
        switch (expressionName) {
            case "concat":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayConcat, caller, params);
            case "push":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayPush, caller, params);
            case "reverse":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayReverse, caller);
            case "shift":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayShift, caller);
            case "unshift":
                return this.transpileLuaLibFunction(LuaLibFeature.ArrayUnshift, caller, params);
            case "sort":
                return this.transpileLuaLibFunction(LuaLibFeature.ArraySort, caller);
            case "pop":
                 return `table.remove(${caller})`;
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
                throw TSTLErrors.UnsupportedProperty("array", expressionName, node);
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

        if (tsHelper.hasGetAccessor(node, this.checker)) {
            return this.transpileGetAccessor(node);
        }

        // Check for primitive types to override
        const type = this.checker.getTypeAtLocation(node.expression);
        switch (type.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transpileStringProperty(node);
            case ts.TypeFlags.Object:
                if (tsHelper.isArrayType(type, this.checker)) {
                    return this.transpileArrayProperty(node);
                }
        }

        if (type.symbol && (type.symbol.flags & ts.SymbolFlags.ConstEnum)) {
            const propertyValueDeclaration = this.checker.getTypeAtLocation(node).symbol.valueDeclaration;

            if (propertyValueDeclaration && propertyValueDeclaration.kind === ts.SyntaxKind.EnumMember) {
                const enumMember = propertyValueDeclaration as ts.EnumMember;

                if (enumMember.initializer) {
                    return this.transpileExpression(enumMember.initializer);
                } else {
                    const enumMembers = this.computeEnumMembers(enumMember.parent);
                    const memberPosition = enumMember.parent.members.indexOf(enumMember);

                    if (memberPosition === -1) {
                        throw TSTLErrors.UnsupportedProperty(type.symbol.name, property, node);
                    }

                    const value = enumMembers[memberPosition].value;

                    if (typeof value === "string") {
                        return `"${value}"`;
                    }

                    return value.toString();
                }
            }
        }

        this.checkForLuaLibType(type);

        const decorators = tsHelper.getCustomDecorators(type, this.checker);
        // Do not output path for member only enums
        if (decorators.has(DecoratorKind.CompileMembersOnly)) {
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
            throw TSTLErrors.UnsupportedProperty("math", identifierString, identifier);
        }
    }

    // Transpile access of string properties, only supported properties are allowed
    public transpileStringProperty(node: ts.PropertyAccessExpression): string {
        const propertyName = this.transpileIdentifier(node.name);
        switch (propertyName) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw TSTLErrors.UnsupportedProperty("string", propertyName, node);
        }
    }

    // Transpile access of array properties, only supported properties are allowed
    public transpileArrayProperty(node: ts.PropertyAccessExpression): string {
        const propertyName = this.transpileIdentifier(node.name);
        switch (propertyName) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw TSTLErrors.UnsupportedProperty("array", propertyName, node);
        }
    }

    public transpileElementAccessExpression(node: ts.ElementAccessExpression): string {
        const element = this.transpileExpression(node.expression);
        const index = this.transpileExpression(node.argumentExpression);

        const type = this.checker.getTypeAtLocation(node.expression);
        if (tsHelper.isArrayType(type, this.checker)) {
            return `${element}[(${index})+1]`;
        } else if (tsHelper.isStringType(type)) {
            return `string.sub(${element},(${index})+1,(${index})+1)`;
        } else {
            return `${element}[${index}]`;
        }
    }

    // Counter-act typescript's identifier escaping:
    // https://github.com/Microsoft/TypeScript/blob/master/src/compiler/utilities.ts#L556
    public transpileIdentifier(identifier: ts.Identifier): string {
        let escapedText = identifier.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3
            && escapedText.charCodeAt(0) === underScoreCharCode
            && escapedText.charCodeAt(1) === underScoreCharCode
            && escapedText.charCodeAt(2) === underScoreCharCode) {
            escapedText = escapedText.substr(1);
        }

        if (this.luaKeywords.has(escapedText)) {
            throw TSTLErrors.KeywordIdentifier(identifier);
        }

        return escapedText;
    }

    public transpileSpreadElement(node: ts.SpreadElement): string {
       return "unpack(" + this.transpileExpression(node.expression) + ")";
    }

    public transpileArrayBindingElement(name: ts.ArrayBindingElement): string {
        if (ts.isOmittedExpression(name)) {
            return "__";
        } else if (ts.isIdentifier(name)) {
            return this.transpileIdentifier(name);
        } else if (ts.isBindingElement(name) && ts.isIdentifier(name.name)) {
            return this.transpileIdentifier(name.name);
        } else {
            throw TSTLErrors.UnsupportedKind("array binding element", name.kind, name);
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
            result += this.transpileVariableDeclaration(declaration as ts.VariableDeclaration) + ";\n";
            if (ts.isIdentifier(declaration.name)) {
                this.pushExport(this.transpileIdentifier(declaration.name as ts.Identifier), node);
            }
        });

        return result;
    }

    public transpileDestructingAssignmentValue(node: ts.Expression): string {
        return `unpack(${this.transpileExpression(node)})`;
    }

    public transpileVariableDeclaration(node: ts.VariableDeclaration): string {
        if (ts.isIdentifier(node.name)) {
            // Find variable identifier
            const identifierName = this.transpileIdentifier(node.name);
            if (node.initializer) {
                const value = this.transpileExpression(node.initializer);
                if (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) {
                    // Separate declaration and assignment for functions to allow recursion
                    return `local ${identifierName}; ${identifierName} = ${value}`;
                } else {
                    return `local ${identifierName} = ${value}`;
                }
            } else {
                return `local ${identifierName} = nil`;
            }
        } else if (ts.isArrayBindingPattern(node.name)) {
            // Destructuring type

            // Disallow ellipsis destruction
            if (node.name.elements.some(elem => !ts.isBindingElement(elem) || elem.dotDotDotToken !== undefined)) {
                throw TSTLErrors.ForbiddenEllipsisDestruction(node);
            }

            const vars = node.name.elements.map(e => this.transpileArrayBindingElement(e)).join(",");

            // Don't unpack TupleReturn decorated functions
            if (tsHelper.isTupleReturnCall(node.initializer, this.checker)) {
                return `local ${vars}=${this.transpileExpression(node.initializer)}`;
            } else {
                return `local ${vars}=${this.transpileDestructingAssignmentValue(node.initializer)}`;
            }
        } else {
            throw TSTLErrors.UnsupportedKind("variable declaration", node.name.kind, node);
        }
    }

    public transpileFunctionDeclaration(node: ts.FunctionDeclaration): string {
        // Don't transpile functions without body (overload declarations)
        if (!node.body) { return ""; }

        let result = "";
        const methodName = this.transpileIdentifier(node.name);

        const [paramNames, spreadIdentifier] = this.transpileParameters(node.parameters);

        let prefix = this.accessPrefix(node);

        if (!tsHelper.isInGlobalScope(node)) {
            prefix = "local ";
        }

        // Build function header
        result += this.indent + prefix + `function ${methodName}(${paramNames.join(",")})\n`;

        this.pushIndent();
        result += this.transpileFunctionBody(node.parameters, node.body, spreadIdentifier);
        this.popIndent();

        // Close function block
        result += this.indent + "end\n";

        this.pushExport(methodName, node);

        return result;
    }

    // Transpile a list of parameters, returns a list of transpiled parameters and an optional spread identifier
    public transpileParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): [string[], string] {
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

        return [paramNames, spreadIdentifier];
    }

    public transpileFunctionBody(parameters: ts.NodeArray<ts.ParameterDeclaration>,
                                 body: ts.Block,
                                 spreadIdentifier: string = ""
    ): string {
        let result = "";

        // Add default parameters
        const defaultValueParams = parameters.filter(declaration => declaration.initializer !== undefined);
        result += this.transpileParameterDefaultValues(defaultValueParams);

        // Push spread operator here
        if (spreadIdentifier !== "") {
            result += this.indent + `local ${spreadIdentifier} = { ... }\n`;
        }

        result += this.transpileBlock(body);

        return result;
    }

    public transpileMethodDeclaration(node: ts.MethodDeclaration, callPath: string): string {
        // Don't transpile methods without body (overload declarations)
        if (!node.body) { return ""; }

        let result = "";
        let methodName = this.transpileIdentifier(node.name as ts.Identifier);
        if (methodName === "toString") {
            methodName = "__tostring";
        }

        const [paramNames, spreadIdentifier] = this.transpileParameters(node.parameters);

        const selfParamNames = ["self"].concat(paramNames);

        // Build function header
        result += this.indent + `function ${callPath}${methodName}(${selfParamNames.join(",")})\n`;

        this.pushIndent();
        result += this.transpileFunctionBody(node.parameters, node.body, spreadIdentifier);
        this.popIndent();

        // Close function block
        result += this.indent + "end\n";

        return result;
    }

    // Transpile a class declaration
    public transpileClass(node: ts.ClassLikeDeclarationBase, nameOverride?: string): string {
        let className = node.name ? this.transpileIdentifier(node.name) : nameOverride;
        if (!className) {
            throw TSTLErrors.MissingClassName(node);
        }

        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(node), this.checker);

        // Find out if this class is extension of existing class
        const isExtension = decorators.has(DecoratorKind.Extension);

        const isMetaExtension = decorators.has(DecoratorKind.MetaExtension);

        if (isExtension && isMetaExtension) {
            throw TSTLErrors.InvalidExtensionMetaExtension(node);
        }

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

        // Overwrite the original className with the class we are overriding for extensions
        if (isMetaExtension) {
            if (!extendsType) {
                throw TSTLErrors.MissingMetaExtension(node);
            }
            const extendsName = extendsType.symbol.escapedName as string;
            className = "__meta__" + extendsName;
            result += `local ${className} = debug.getregistry()["${extendsName}"]\n`;
        }

        if (isExtension) {
            const extensionNameArg = decorators.get(DecoratorKind.Extension).args[0];
            if (extensionNameArg) {
                className = extensionNameArg;
            } else if (extendsType) {
                className = extendsType.symbol.escapedName as string;
            }
        }

        if (!isExtension && !isMetaExtension) {
            result += this.transpileClassCreationMethods(node, className, instanceFields, extendsType);
        } else {
            for (const f of instanceFields) {
                // Get identifier
                const fieldIdentifier = f.name as ts.Identifier;
                const fieldName = this.transpileIdentifier(fieldIdentifier);

                const value = this.transpileExpression(f.initializer);

                result += this.indent + `${className}.${fieldName} = ${value}\n`;
            }
        }

        // Add static declarations
        for (const field of staticFields) {
            const fieldName = this.transpileIdentifier(field.name as ts.Identifier);
            const value = this.transpileExpression(field.initializer);
            result += this.indent + `${className}.${fieldName} = ${value}\n`;
        }

        // Find first constructor with body
        const constructor =
            node.members.filter(n => ts.isConstructorDeclaration(n) && n.body)[0] as ts.ConstructorDeclaration;
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

    public transpileClassCreationMethods(node: ts.ClassLikeDeclarationBase, className: string,
                                         instanceFields: ts.PropertyDeclaration[],
                                         extendsType: ts.Type): string {
        let noClassOr = false;
        if (extendsType) {
            const decorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            noClassOr = decorators.has(DecoratorKind.NoClassOr);
        }

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
        result += this.indent + `    local self = setmetatable({}, ${className})\n`;

        for (const f of instanceFields) {
            // Get identifier
            const fieldIdentifier = f.name as ts.Identifier;
            const fieldName = this.transpileIdentifier(fieldIdentifier);

            const value = this.transpileExpression(f.initializer);

            result += this.indent + `    self.${fieldName} = ${value}\n`;
        }

        result += this.indent + `    if construct and ${className}.constructor then `
                      + `${className}.constructor(self, ...) end\n`;

        result += this.indent + `    return self\n`;
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
            } else if (ts.isShorthandPropertyAssignment(element)) {
                properties.push(`${name} = ${name}`);
            } else if (ts.isMethodDeclaration(element)) {
                const expression = this.transpileFunctionExpression(element);
                properties.push(`${name} = ${expression}`);
            } else {
                throw TSTLErrors.UnsupportedKind("object literal element", element.kind, node);
            }
        });

        return "{" + properties.join(",") + "}";
    }

    public transpileFunctionExpression(node: ts.FunctionLikeDeclaration): string {
        // Build parameter string
        const paramNames: string[] = [];
        if (ts.isMethodDeclaration(node)) {
            paramNames.push("self");
        }
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
