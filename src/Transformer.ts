import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import {TSTLErrors} from "./Errors";
import {TransformHelper as transformHelper} from "./TransformHelper";
import {TSHelper as tsHelper} from "./TSHelper";

export class LuaTransformer {
    private checker: ts.TypeChecker;
    private options: CompilerOptions;
    private context: ts.TransformationContext;
    private sourceFile: ts.SourceFile;
    private isModule: boolean;

    private currentNamespace: ts.ModuleDeclaration;

    constructor(checker: ts.TypeChecker, options: CompilerOptions) {
        this.checker = checker;
        this.options = options;
    }

    public transform(node: ts.SourceFile): ts.SourceFile {
        this.sourceFile = node;
        this.isModule = tsHelper.isFileModule(node);
        return ts
            .transform(node,
                       [(ctx: ts.TransformationContext) => {
                           this.context = ctx;
                           return this.transformSourceFile.bind(this);
                       }],
                       this.options)
            .transformed[0];
    }

    public visitEachChild<T extends ts.Node>(node: T): T {
        return ts.visitEachChild(node, child => this.visitor(child), this.context);
    }

    public transformSourceFile(node: ts.SourceFile): ts.SourceFile {
        if (node.isDeclarationFile) {
            return node;
        }
        return this.visitEachChild(node);
    }

    public visitor(node: ts.Node): ts.VisitResult<ts.Node> {
        // Ignore declarations
        if (node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
            return undefined;
        }
        switch (node.kind) {
            // Declarations
            case ts.SyntaxKind.ImportDeclaration:
                return this.visitImportDeclaration(node as ts.ImportDeclaration);
            case ts.SyntaxKind.ClassDeclaration:
                return this.visitClassDeclaration(node as ts.ClassDeclaration);
            case ts.SyntaxKind.ModuleDeclaration:
                return this.visitModuleDeclaration(node as ts.ModuleDeclaration);
            case ts.SyntaxKind.EnumDeclaration:
                return this.visitEnumDeclaration(node as ts.EnumDeclaration);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.visitFunctionDeclaration(node as ts.FunctionDeclaration);
            case ts.SyntaxKind.TypeAliasDeclaration:
                return this.visitTypeAliasDeclaration(node as ts.TypeAliasDeclaration);
            case ts.SyntaxKind.InterfaceDeclaration:
                return this.visitInterfaceDeclaration(node as ts.InterfaceDeclaration);
            // Statements
            case ts.SyntaxKind.VariableStatement:
                return this.visitVariableStatement(node as ts.VariableStatement);
            case ts.SyntaxKind.ExpressionStatement:
                return this.visitExpressionStatement(node as ts.ExpressionStatement);
            case ts.SyntaxKind.ReturnStatement:
                return this.visitReturn(node as ts.ReturnStatement);
            case ts.SyntaxKind.IfStatement:
                return this.visitIfStatement(node as ts.IfStatement);
            case ts.SyntaxKind.WhileStatement:
                return this.visitWhileStatement(node as ts.WhileStatement);
            case ts.SyntaxKind.DoStatement:
                return this.visitDoStatement(node as ts.DoStatement);
            case ts.SyntaxKind.ForStatement:
                return this.visitForStatement(node as ts.ForStatement);
            case ts.SyntaxKind.ForOfStatement:
                return this.visitForOfStatement(node as ts.ForOfStatement);
            case ts.SyntaxKind.ForInStatement:
                return this.visitForInStatement(node as ts.ForInStatement);
            case ts.SyntaxKind.SwitchStatement:
                return this.visitSwitchStatement(node as ts.SwitchStatement);
            case ts.SyntaxKind.BreakStatement:
                return this.visitBreakStatement(node as ts.BreakStatement);
            case ts.SyntaxKind.TryStatement:
                return this.visitTryStatement(node as ts.TryStatement);
            case ts.SyntaxKind.ThrowStatement:
                return this.visitThrowStatement(node as ts.ThrowStatement);
            case ts.SyntaxKind.ContinueStatement:
                return this.visitContinueStatement(node as ts.ContinueStatement);
            case ts.SyntaxKind.EmptyStatement:
                return this.visitEmptyStatement(node as ts.EmptyStatement);
            // Expressions
            case ts.SyntaxKind.BinaryExpression:
                return this.visitBinaryExpression(node as ts.BinaryExpression);
            case ts.SyntaxKind.ConditionalExpression:
                return this.visitConditionalExpression(node as ts.ConditionalExpression);
            case ts.SyntaxKind.CallExpression:
                return this.visitCallExpression(node as ts.CallExpression);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.visitPropertyAccessExpression(node as ts.PropertyAccessExpression);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.visitElementAccessExpression(node as ts.ElementAccessExpression);
            case ts.SyntaxKind.ParenthesizedExpression:
                return this.visitParenthesizedExpression(node as ts.ParenthesizedExpression);
            case ts.SyntaxKind.TypeAssertionExpression:
                return this.visitTypeAssertionExpression(node as ts.TypeAssertion);
            case ts.SyntaxKind.AsExpression:
                return this.visitAsExpression(node as ts.AsExpression);
            case ts.SyntaxKind.TypeOfExpression:
                return this.visitTypeOfExpression(node as ts.TypeOfExpression);
            case ts.SyntaxKind.SpreadElement:
                return this.visitSpreadElement(node as ts.SpreadElement);
            case ts.SyntaxKind.NonNullExpression:
                return this.visitNonNullExpression(node as ts.NonNullExpression);
            case ts.SyntaxKind.ClassExpression:
                return this.visitClassExpression(node as ts.ClassExpression);
            case ts.SyntaxKind.TemplateExpression:
                return this.visitTemplateExpression(node as ts.TemplateExpression);
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.visitPostfixUnaryExpression(node as ts.PostfixUnaryExpression);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.visitPrefixUnaryExpression(node as ts.PrefixUnaryExpression);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.visitArrayLiteralExpression(node as ts.ArrayLiteralExpression);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.visitObjectLiteralExpression(node as ts.ObjectLiteralExpression);
            case ts.SyntaxKind.DeleteExpression:
                return this.visitDeleteExpression(node as ts.DeleteExpression);
            case ts.SyntaxKind.FunctionExpression:
                return this.visitFunctionExpression(node as ts.FunctionExpression);
            case ts.SyntaxKind.NewExpression:
                return this.visitNewExpression(node as ts.NewExpression);
            case ts.SyntaxKind.ArrowFunction:
                return this.visitArrowFunction(node as ts.ArrowFunction);
            // Identifier
            case ts.SyntaxKind.Identifier:
                return this.visitIdentifier(node as ts.Identifier);
            // Literal
            case ts.SyntaxKind.StringLiteral:
                return this.visitStringLiteral(node as ts.StringLiteral);
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return this.visitNoSubstitutionTemplateLiteral(node as ts.NoSubstitutionTemplateLiteral);
            case ts.SyntaxKind.NumericLiteral:
                return this.visitNumericLiteral(node as ts.NumericLiteral);
            // Keywords
            case ts.SyntaxKind.TrueKeyword:
                return this.visitTrueKeyword(node as ts.BooleanLiteral);
            case ts.SyntaxKind.FalseKeyword:
                return this.visitFalseKeyword(node as ts.BooleanLiteral);
            case ts.SyntaxKind.NullKeyword:
                return this.visitNullKeyword(node as ts.KeywordTypeNode);
            case ts.SyntaxKind.UndefinedKeyword:
                return this.visitUndefinedKeyword(node as ts.KeywordTypeNode);
            case ts.SyntaxKind.ThisKeyword:
                return this.visitThisKeyword(node as ts.KeywordTypeNode);
            case ts.SyntaxKind.SuperKeyword:
                return this.visitSuperKeyword(node as ts.KeywordTypeNode);
            // ComputedPropertyName
            case ts.SyntaxKind.ComputedPropertyName:
                return this.visitComputedPropertyName(node as ts.ComputedPropertyName);
            // Blocks
            case ts.SyntaxKind.Block:
                return this.visitBlock(node as ts.Block);
            case ts.SyntaxKind.ModuleBlock:
                return this.visitModuleBlock(node as ts.ModuleBlock);
            // EOF TOKEN
            case ts.SyntaxKind.EndOfFileToken:
                return this.visitEndOfFileToken(node as ts.EndOfFileToken);
            default:
                throw TSTLErrors.UnsupportedKind("Node", node.kind, node);
        }
    }
    public visitImportDeclaration(node: ts.ImportDeclaration): ts.VisitResult<ts.Node> {
        if (!node.importClause || !node.importClause.namedBindings) {
            throw TSTLErrors.DefaultImportsNotSupported(node);
        }

        const imports = node.importClause.namedBindings;

        const result: ts.Node[] = [];

        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const importPath = moduleSpecifier.text.replace(new RegExp("\"", "g"), "");
        const resolvedModuleSpecifier = ts.createStringLiteral(this.getImportPath(importPath));

        if (ts.isNamedImports(imports)) {
            const filteredElements = imports.elements.filter(e => {
                const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(e), this.checker);
                return !decorators.has(DecoratorKind.Extension) && !decorators.has(DecoratorKind.MetaExtension);
            });

            // Elide import if all imported types are extension classes
            if (filteredElements.length === 0) {
                return undefined;
            }

            const importUniqueName = ts.createUniqueName(path.basename((importPath)));
            const requireStatement = transformHelper.createLuaImport(importUniqueName, resolvedModuleSpecifier);
            result.push(requireStatement);

            filteredElements.forEach(importSpecifier => {
                if (importSpecifier.propertyName) {
                    const renamedImport = transformHelper.createLuaVariableStatement(
                        importSpecifier.name, ts.createPropertyAccess(importUniqueName, importSpecifier.propertyName));
                    result.push(renamedImport);
                } else {
                    const namedImport = transformHelper.createLuaVariableStatement(
                        importSpecifier.name, ts.createPropertyAccess(importUniqueName, importSpecifier.name));
                    result.push(namedImport);
                }
            });
            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const requireStatement = transformHelper.createLuaImport(imports.name, resolvedModuleSpecifier);
            result.push(requireStatement);
            return result;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }
    public visitClassDeclaration(node: ts.ClassDeclaration): ts.VisitResult<ts.ClassDeclaration> {
        return node;
    }
    // previously transpileNamespace
    public visitModuleDeclaration(node: ts.ModuleDeclaration): ts.VisitResult<ts.Node> {
        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(node), this.checker);
        // If phantom namespace elide the declaration and return the body
        if (decorators.has(DecoratorKind.Phantom) && node.body) {
            return node.body;
        }

        const result: ts.Node[] = [];

        let declarationNameExpression: ts.Expression;
        if (this.currentNamespace) {
            const declarationNameExpression =
                ts.createPropertyAccess(this.currentNamespace.name, node.name as ts.Identifier);
            const declarationAssignment = ts.createAssignment(
                declarationNameExpression, ts.createLogicalOr(declarationNameExpression, ts.createObjectLiteral()));

            result.push(declarationAssignment);
            // outerNS.innerNS = outerNS.innerNS or {};
            // local innerNS = outerNS.innerNS
        } else if (this.isModule && (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) {
            declarationNameExpression =
                ts.createPropertyAccess(ts.createIdentifier("export"), node.name as ts.Identifier);
            // exports.NS = exports.NS or {}
            // local NS = exports.NS
        } else {
            declarationNameExpression = node.name;
            // NS = NS or {}
            // local NS = NS
        }

        // Set current namespace for nested NS
        // Keep previous currentNS to reset after block transpilation
        const previousNamespace = this.currentNamespace;
        this.currentNamespace = node;

        // Transform moduleblock to block and transform it
        if (ts.isModuleBlock(node.body)) {
            const bodyBlock = this.visitBlock(ts.createBlock(node.body.statements)) as ts.Block;
            result.push(bodyBlock);
        }

        this.currentNamespace = previousNamespace;

        return result;
    }
    public visitEnumDeclaration(node: ts.EnumDeclaration): ts.VisitResult<ts.EnumDeclaration> {
        return node;
    }
    public visitFunctionDeclaration(node: ts.FunctionDeclaration): ts.VisitResult<ts.FunctionDeclaration> {
        return node;
    }
    public visitTypeAliasDeclaration(node: ts.TypeAliasDeclaration): ts.VisitResult<ts.TypeAliasDeclaration> {
        return undefined;
    }
    public visitInterfaceDeclaration(node: ts.InterfaceDeclaration): ts.VisitResult<ts.InterfaceDeclaration> {
        return undefined;
    }
    public visitVariableStatement(node: ts.VariableStatement): ts.VisitResult<ts.VariableStatement> {
        return node;
    }
    public visitExpressionStatement(node: ts.ExpressionStatement): ts.VisitResult<ts.ExpressionStatement> {
        return node;
    }
    public visitReturn(node: ts.ReturnStatement): ts.VisitResult<ts.ReturnStatement> {
        return node;
    }
    public visitIfStatement(node: ts.IfStatement): ts.VisitResult<ts.IfStatement> {
        return node;
    }
    public visitWhileStatement(node: ts.WhileStatement): ts.VisitResult<ts.WhileStatement> {
        return node;
    }
    public visitDoStatement(node: ts.DoStatement): ts.VisitResult<ts.DoStatement> {
        return node;
    }
    public visitForStatement(node: ts.ForStatement): ts.VisitResult<ts.ForStatement> {
        return node;
    }
    public visitForOfStatement(node: ts.ForOfStatement): ts.VisitResult<ts.ForOfStatement> {
        return node;
    }
    public visitForInStatement(node: ts.ForInStatement): ts.VisitResult<ts.ForInStatement> {
        return node;
    }
    public visitSwitchStatement(node: ts.SwitchStatement): ts.VisitResult<ts.SwitchStatement> {
        return node;
    }
    public visitBreakStatement(node: ts.BreakStatement): ts.VisitResult<ts.BreakStatement> {
        return node;
    }
    public visitTryStatement(node: ts.TryStatement): ts.VisitResult<ts.TryStatement> {
        return node;
    }
    public visitThrowStatement(node: ts.ThrowStatement): ts.VisitResult<ts.ThrowStatement> {
        return node;
    }
    public visitContinueStatement(node: ts.ContinueStatement): ts.VisitResult<ts.ContinueStatement> {
        return node;
    }
    public visitEmptyStatement(node: ts.EmptyStatement): ts.VisitResult<ts.EmptyStatement> {
        return undefined;
    }
    public visitBinaryExpression(node: ts.BinaryExpression): ts.VisitResult<ts.BinaryExpression> {
        return node;
    }
    public visitConditionalExpression(node: ts.ConditionalExpression): ts.VisitResult<ts.ConditionalExpression> {
        return node;
    }
    public visitCallExpression(node: ts.CallExpression): ts.VisitResult<ts.CallExpression> {
        return node;
    }
    public visitPropertyAccessExpression(node: ts.PropertyAccessExpression):
        ts.VisitResult<ts.PropertyAccessExpression> {
        return node;
    }
    public visitElementAccessExpression(node: ts.ElementAccessExpression): ts.VisitResult<ts.ElementAccessExpression> {
        return node;
    }
    public visitParenthesizedExpression(node: ts.ParenthesizedExpression): ts.VisitResult<ts.ParenthesizedExpression> {
        throw node;
    }
    public visitTypeAssertionExpression(node: ts.TypeAssertion): ts.VisitResult<ts.UnaryExpression> {
        return node.expression;
    }
    public visitAsExpression(node: ts.AsExpression): ts.VisitResult<ts.Expression> {
        return node.expression;
    }
    public visitTypeOfExpression(node: ts.TypeOfExpression): ts.VisitResult<ts.TypeOfExpression> {
        return node;
    }
    public visitSpreadElement(node: ts.SpreadElement): ts.VisitResult<ts.SpreadElement> {
        return node;
    }
    public visitNonNullExpression(node: ts.NonNullExpression): ts.VisitResult<ts.Expression> {
        return node.expression;
    }
    public visitClassExpression(node: ts.ClassExpression): ts.VisitResult<ts.ClassExpression> {
        return node;
    }
    public visitTemplateExpression(node: ts.TemplateExpression): ts.VisitResult<ts.TemplateExpression> {
        return node;
    }
    public visitPostfixUnaryExpression(node: ts.PostfixUnaryExpression): ts.VisitResult<ts.PostfixUnaryExpression> {
        return node;
    }
    public visitPrefixUnaryExpression(node: ts.PrefixUnaryExpression): ts.VisitResult<ts.PrefixUnaryExpression> {
        return node;
    }
    public visitArrayLiteralExpression(node: ts.ArrayLiteralExpression): ts.VisitResult<ts.ArrayLiteralExpression> {
        return node;
    }
    public visitObjectLiteralExpression(node: ts.ObjectLiteralExpression): ts.VisitResult<ts.ObjectLiteralExpression> {
        return node;
    }
    public visitDeleteExpression(node: ts.DeleteExpression): ts.VisitResult<ts.DeleteExpression> {
        return node;
    }
    public visitFunctionExpression(node: ts.FunctionExpression): ts.VisitResult<ts.FunctionExpression> {
        return node;
    }
    public visitNewExpression(node: ts.NewExpression): ts.VisitResult<ts.NewExpression> {
        return node;
    }
    public visitArrowFunction(node: ts.ArrowFunction): ts.VisitResult<ts.ArrowFunction> {
        return node;
    }
    public visitIdentifier(node: ts.Identifier): ts.VisitResult<ts.Identifier> {
        return node;
    }
    public visitStringLiteral(node: ts.StringLiteral): ts.VisitResult<ts.StringLiteral> {
        return node;
    }
    public visitNoSubstitutionTemplateLiteral(node: ts.NoSubstitutionTemplateLiteral):
        ts.VisitResult<ts.NoSubstitutionTemplateLiteral> {
        return node;
    }
    public visitNumericLiteral(node: ts.NumericLiteral): ts.VisitResult<ts.NumericLiteral> {
        return node;
    }
    public visitTrueKeyword(node: ts.BooleanLiteral): ts.VisitResult<ts.BooleanLiteral> {
        return node;
    }
    public visitFalseKeyword(node: ts.BooleanLiteral): ts.VisitResult<ts.BooleanLiteral> {
        return node;
    }
    public visitNullKeyword(node: ts.KeywordTypeNode): ts.VisitResult<ts.KeywordTypeNode> {
        return node;
    }
    public visitUndefinedKeyword(node: ts.KeywordTypeNode): ts.VisitResult<ts.KeywordTypeNode> {
        return node;
    }
    public visitThisKeyword(node: ts.KeywordTypeNode): ts.VisitResult<ts.KeywordTypeNode> {
        return node;
    }
    public visitSuperKeyword(node: ts.KeywordTypeNode): ts.VisitResult<ts.KeywordTypeNode> {
        return node;
    }
    public visitComputedPropertyName(node: ts.ComputedPropertyName): ts.VisitResult<ts.ComputedPropertyName> {
        return node;
    }
    public visitBlock(node: ts.Block): ts.VisitResult<ts.Block> {
        return node;
    }
    public visitModuleBlock(node: ts.ModuleBlock): ts.VisitResult<ts.ModuleBlock> {
        return node;
    }
    public visitEndOfFileToken(node: ts.EndOfFileToken): ts.VisitResult<ts.EndOfFileToken> {
        return node;
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
