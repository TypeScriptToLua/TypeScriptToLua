
import * as path from "path";
import * as ts from "typescript";

import * as tstl from "./LuaAST";

import {CompilerOptions} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import {TSTLErrors} from "./Errors";
import {TSHelper as tsHelper} from "./TSHelper";

type StatementVisitResult = tstl.Statement | tstl.Statement[] | undefined;
type ExpressionVisitResult = tstl.Expression | undefined;

export class LuaTransformer {
    public luaKeywords: Set<string> = new Set(
        ["and", "break", "do", "else", "elseif",
         "end", "false", "for", "function", "if",
         "in", "local", "nil", "not", "or",
         "repeat", "return", "then", "until", "while"]);

    private checker: ts.TypeChecker;
    private options: CompilerOptions;
    private sourceFile: ts.SourceFile;
    private isModule: boolean;

    public transformSourceFile(node: ts.SourceFile): tstl.Block {
        return tstl.createBlock();
    }

    public transformStatement(node: ts.Statement, parent: tstl.Node): StatementVisitResult {
        switch (node.kind) {
            // Blocm
            case ts.SyntaxKind.Block:
                return this.transformBlock(node as ts.Block, parent);
            // Declaration Statements
            case ts.SyntaxKind.ImportDeclaration:
                return this.transformImportDeclaration(node as ts.ImportDeclaration, parent);
            case ts.SyntaxKind.ClassDeclaration:
                return this.transformClassDeclaration(node as ts.ClassDeclaration, parent);
            case ts.SyntaxKind.ModuleDeclaration:
                return this.transformModuleDeclaration(node as ts.ModuleDeclaration, parent);
            case ts.SyntaxKind.EnumDeclaration:
                return this.transformEnumDeclaration(node as ts.EnumDeclaration, parent);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.transformFunctionDeclaration(node as ts.FunctionDeclaration, parent);
            case ts.SyntaxKind.TypeAliasDeclaration:
                return this.transformTypeAliasDeclaration(node as ts.TypeAliasDeclaration, parent);
            case ts.SyntaxKind.InterfaceDeclaration:
                return this.transformInterfaceDeclaration(node as ts.InterfaceDeclaration, parent);
            // Statements
            case ts.SyntaxKind.VariableStatement:
                return this.transformVariableStatement(node as ts.VariableStatement, parent);
            case ts.SyntaxKind.ExpressionStatement:
                return this.transformExpressionStatement(node as ts.ExpressionStatement, parent);
            case ts.SyntaxKind.ReturnStatement:
                return this.transformReturn(node as ts.ReturnStatement, parent);
            case ts.SyntaxKind.IfStatement:
                return this.transformIfStatement(node as ts.IfStatement, parent);
            case ts.SyntaxKind.WhileStatement:
                return this.transformWhileStatement(node as ts.WhileStatement, parent);
            case ts.SyntaxKind.DoStatement:
                return this.transformDoStatement(node as ts.DoStatement, parent);
            case ts.SyntaxKind.ForStatement:
                return this.transformForStatement(node as ts.ForStatement, parent);
            case ts.SyntaxKind.ForOfStatement:
                return this.transformForOfStatement(node as ts.ForOfStatement, parent);
            case ts.SyntaxKind.ForInStatement:
                return this.transformForInStatement(node as ts.ForInStatement, parent);
            case ts.SyntaxKind.SwitchStatement:
                return this.transformSwitchStatement(node as ts.SwitchStatement, parent);
            case ts.SyntaxKind.BreakStatement:
                return this.transformBreakStatement(node as ts.BreakStatement, parent);
            case ts.SyntaxKind.TryStatement:
                return this.transformTryStatement(node as ts.TryStatement, parent);
            case ts.SyntaxKind.ThrowStatement:
                return this.transformThrowStatement(node as ts.ThrowStatement, parent);
            case ts.SyntaxKind.ContinueStatement:
                return this.transformContinueStatement(node as ts.ContinueStatement, parent);
            case ts.SyntaxKind.EmptyStatement:
                return this.transformEmptyStatement(node as ts.EmptyStatement, parent);
            default:
                throw TSTLErrors.UnsupportedKind("Statement", node.kind, node);
        }
    }

    /** Convers an array of ts.Statements into an array of ts.Statements */
    public transformStatements(
        statements: ts.Statement[] | ReadonlyArray<ts.Statement>, parent: tstl.Node): tstl.Statement[] {

        function flat<T>(arr: T[] | ReadonlyArray<T>): T[] {
            const flatArr = [].concat(...arr);
            return flatArr.some(Array.isArray) ? flat(flatArr) : flatArr;
        }
        return flat(statements).map(statement => this.transformStatement(statement, parent)) as tstl.Statement[];
    }

    public transformBlock(block: ts.Block, parent: tstl.Node): tstl.DoStatement {
        return tstl.createDoStatement(this.transformStatements(block.statements, parent), parent, block);
    }

    public transformImportDeclaration(node: ts.ImportDeclaration, parent: tstl.Node): StatementVisitResult {
        if (!node.importClause || !node.importClause.namedBindings) {
            throw TSTLErrors.DefaultImportsNotSupported(node);
        }

        const imports = node.importClause.namedBindings;

        const result: tstl.Statement[] = [];

        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const importPath = moduleSpecifier.text.replace(new RegExp("\"", "g"), "");
        const resolvedModuleSpecifier = tstl.createStringLiteral(this.getImportPath(importPath));

        const requireCall = tstl.createCallExpression(tstl.createIdentifier("require"), [resolvedModuleSpecifier]);

        if (ts.isNamedImports(imports)) {
            const filteredElements = imports.elements.filter(e => {
                const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(e), this.checker);
                return !decorators.has(DecoratorKind.Extension) && !decorators.has(DecoratorKind.MetaExtension);
            });

            // Elide import if all imported types are extension classes
            if (filteredElements.length === 0) {
                return undefined;
            }

            const importUniqueName = tstl.createIdentifier(path.basename((importPath)));
            const requireStatement =
                tstl.createVariableDeclarationStatement(
                    [tstl.createIdentifier(path.basename(importPath))],
                    [requireCall],
                    parent,
                    node);
            result.push(requireStatement);

            filteredElements.forEach(importSpecifier => {
                if (importSpecifier.propertyName) {
                    const propertyName = this.transformIdentifier(importSpecifier.propertyName);
                    const renamedImport = tstl.createVariableDeclarationStatement(
                        [this.transformIdentifier(importSpecifier.name)],
                        [tstl.createTableIndexExpression(importUniqueName, propertyName)]);
                    result.push(renamedImport);
                } else {
                    const name = this.transformIdentifier(importSpecifier.name);
                    const namedImport = tstl.createVariableDeclarationStatement(
                        [name],
                        [tstl.createTableIndexExpression(importUniqueName, name)]);
                    result.push(namedImport);
                }
            });
            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const requireStatement =
                tstl.createVariableDeclarationStatement(
                    [this.transformIdentifier(imports.name)],
                    [requireCall],
                    parent,
                    node);
            result.push(requireStatement);
            return result;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }
    public transformClassDeclaration(statement: ts.ClassDeclaration, parent: tstl.Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformModuleDeclaration(arg0: ts.ModuleDeclaration, parent: tstl.Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformEnumDeclaration(arg0: ts.EnumDeclaration, parent: tstl.Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformFunctionDeclaration(arg0: FunctionDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformTypeAliasDeclaration(arg0: TypeAliasDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformInterfaceDeclaration(arg0: InterfaceDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformVariableStatement(arg0: VariableStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformExpressionStatement(arg0: ExpressionStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformReturn(arg0: ReturnStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformIfStatement(arg0: IfStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformWhileStatement(arg0: WhileStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformDoStatement(arg0: DoStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForStatement(arg0: ForStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForOfStatement(arg0: ForOfStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForInStatement(arg0: ForInStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformSwitchStatement(arg0: SwitchStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformBreakStatement(arg0: BreakStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformTryStatement(arg0: TryStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformThrowStatement(arg0: ThrowStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformContinueStatement(arg0: ContinueStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformEmptyStatement(arg0: EmptyStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }

    // Expressions
    public transformIdentifier(epxression: ts.Identifier, parent?: tstl.Node): tstl.Identifier {
        let escapedText = epxression.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3
            && escapedText.charCodeAt(0) === underScoreCharCode
            && escapedText.charCodeAt(1) === underScoreCharCode
            && escapedText.charCodeAt(2) === underScoreCharCode) {
            escapedText = escapedText.substr(1);
        }

        if (this.luaKeywords.has(escapedText)) {
            throw TSTLErrors.KeywordIdentifier(epxression);
        }
        return tstl.createIdentifier(escapedText, parent, epxression);
    }

    private getAbsoluteImportPath(relativePath: string): string {
        if (relativePath.charAt(0) !== "." && this.options.baseUrl) {
            return path.resolve(this.options.baseUrl, relativePath);
        }
        return path.resolve(path.dirname(this.sourceFile.fileName), relativePath);
    }

    private getImportPath(relativePath: string): string {
        // Calculate absolute path to import
        const absolutePathToImport = this.getAbsoluteImportPath(relativePath);
        if (this.options.rootDir) {
            // Calculate path relative to project root
            // and replace path.sep with dots (lua doesn't know paths)
            const relativePathToRoot =
                this.pathToLuaRequirePath(absolutePathToImport.replace(this.options.rootDir, "").slice(1));
            return relativePathToRoot;
        }

        return this.pathToLuaRequirePath(relativePath);
    }

    private pathToLuaRequirePath(filePath: string): string {
        return filePath.replace(new RegExp("\\\\|\/", "g"), ".");
    }
}
