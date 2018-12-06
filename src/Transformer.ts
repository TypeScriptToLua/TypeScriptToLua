import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import {TSTLErrors} from "./Errors";
import {TransformHelper as transformHelper} from "./TransformHelper";
import {LuaTarget} from "./Transpiler";
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
            case ts.SyntaxKind.ExpressionStatement:
            case ts.SyntaxKind.ReturnStatement:
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.SwitchStatement:
            case ts.SyntaxKind.BreakStatement:
            case ts.SyntaxKind.TryStatement:
            case ts.SyntaxKind.ThrowStatement:
            case ts.SyntaxKind.ContinueStatement:
            case ts.SyntaxKind.EmptyStatement:
                return this.visitStatement(node as ts.Statement);
            // Expressions
            case ts.SyntaxKind.BinaryExpression:
            case ts.SyntaxKind.ConditionalExpression:
            case ts.SyntaxKind.CallExpression:
            case ts.SyntaxKind.PropertyAccessExpression:
            case ts.SyntaxKind.ElementAccessExpression:
            case ts.SyntaxKind.ParenthesizedExpression:
            case ts.SyntaxKind.TypeAssertionExpression:
            case ts.SyntaxKind.AsExpression:
            case ts.SyntaxKind.TypeOfExpression:
            case ts.SyntaxKind.SpreadElement:
            case ts.SyntaxKind.NonNullExpression:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.TemplateExpression:
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
            case ts.SyntaxKind.ArrayLiteralExpression:
            case ts.SyntaxKind.ObjectLiteralExpression:
            case ts.SyntaxKind.DeleteExpression:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
            case ts.SyntaxKind.NewExpression:
            // Identifier
            case ts.SyntaxKind.Identifier:
            // Literals
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.NumericLiteral:
            // Keywords
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
            case ts.SyntaxKind.NullKeyword:
            case ts.SyntaxKind.UndefinedKeyword:
            case ts.SyntaxKind.ThisKeyword:
            case ts.SyntaxKind.SuperKeyword:
                return this.visitExpression(node as ts.Expression);
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

    public visitStatement(node: ts.Statement): ts.Statement {
        if (ts.isBlock(node)) {
            return this.visitBlock(node);
        }
        switch (node.kind) {
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
            default:
                throw TSTLErrors.UnsupportedKind("Statement", node.kind, node);
        }
    }

    public visitExpression(node: ts.Expression): ts.Expression {
        switch (node.kind) {
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
            case ts.SyntaxKind.ArrowFunction:
                return this.visitArrowFunction(node as ts.ArrowFunction);
            case ts.SyntaxKind.NewExpression:
                return this.visitNewExpression(node as ts.NewExpression);
            case ts.SyntaxKind.Identifier:
                return this.visitIdentifier(node as ts.Identifier);
            case ts.SyntaxKind.StringLiteral:
                return this.visitStringLiteral(node as ts.StringLiteral);
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return this.visitNoSubstitutionTemplateLiteral(node as ts.NoSubstitutionTemplateLiteral);
            case ts.SyntaxKind.NumericLiteral:
                return this.visitNumericLiteral(node as ts.NumericLiteral);
            case ts.SyntaxKind.TrueKeyword:
                return this.visitTrueKeyword(node as ts.BooleanLiteral);
            case ts.SyntaxKind.FalseKeyword:
                return this.visitFalseKeyword(node as ts.BooleanLiteral);
            case ts.SyntaxKind.NullKeyword:
                return this.visitNullKeyword(node as ts.NullLiteral);
            case ts.SyntaxKind.UndefinedKeyword:
                return this.visitUndefinedKeyword(node as ts.LiteralExpression);
            case ts.SyntaxKind.ThisKeyword:
                return this.visitThisKeyword(node as ts.ThisExpression);
            case ts.SyntaxKind.SuperKeyword:
                return this.visitSuperKeyword(node as ts.SuperExpression);
            default:
                throw TSTLErrors.UnsupportedKind("Expression", node.kind, node);
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

    public visitClassDeclaration(node: ts.ClassDeclaration): ts.ClassDeclaration {
        // TODO this should actually be converted to lua nodes
        return ts.updateClassDeclaration(node,
                                         node.decorators,
                                         node.modifiers,
                                         node.name,
                                         node.typeParameters,
                                         node.heritageClauses,
                                         node.members.map(elem => this.visitClassElement(elem) as ts.ClassElement));
        // TODO make member visitor more specific
    }

    public visitClassElement(node: ts.ClassElement): ts.ClassElement {
        switch (node.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                return this.visitPropertyDeclaration(node as ts.PropertyDeclaration);
            case ts.SyntaxKind.MethodDeclaration:
                return this.visitMethodDeclaration(node as ts.MethodDeclaration);
            case ts.SyntaxKind.Constructor:
                return this.visitConstructorDeclaration(node as ts.ConstructorDeclaration);
        }
    }

    public visitPropertyDeclaration(node: ts.PropertyDeclaration): ts.PropertyDeclaration {
        let updatedInitializer: ts.Expression;
        if (node.initializer) {
            updatedInitializer = this.visitExpression(node.initializer);
        }
        return ts.updateProperty(node,
                                 node.decorators,
                                 node.modifiers,
                                 node.name,
                                 node.questionToken || node.exclamationToken,
                                 node.type,
                                 updatedInitializer);
    }

    public visitMethodDeclaration(node: ts.MethodDeclaration): ts.MethodDeclaration {
        return ts.updateMethod(node,
                               node.decorators,
                               node.modifiers,
                               node.asteriskToken,
                               node.name,
                               node.questionToken,
                               node.typeParameters,
                               node.parameters,
                               node.type,
                               this.visitBlock(node.body));
    }

    public visitConstructorDeclaration(node: ts.ConstructorDeclaration): ts.ConstructorDeclaration {
        return ts.updateConstructor(node, node.decorators, node.modifiers, node.parameters, this.visitBlock(node.body));
    }
    // previously transpileNamespace
    public visitModuleDeclaration(node: ts.ModuleDeclaration): ts.VisitResult<ts.Node> {
        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(node), this.checker);
        // If phantom namespace elide the declaration and return the body
        if (decorators.has(DecoratorKind.Phantom) && node.body) {
            return node.body;
        }

        const result: ts.Node[] = [];

        if (this.currentNamespace) {
            // outerNS.innerNS = outerNS.innerNS or {};
            // local innerNS = outerNS.innerNS
            const declarationNameExpression =
                ts.createPropertyAccess(this.currentNamespace.name, node.name as ts.Identifier);
            const declarationAssignment = ts.createAssignment(
                declarationNameExpression, ts.createLogicalOr(declarationNameExpression, ts.createObjectLiteral()));

            result.push(declarationAssignment);

            const localDeclaration =
                transformHelper.createLuaVariableStatement(node.name as ts.Identifier, declarationNameExpression);

            result.push(localDeclaration);
        } else if (this.isModule && (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) {
            // exports.NS = exports.NS or {}
            // local NS = exports.NS
            const declarationNameExpression =
                ts.createPropertyAccess(ts.createIdentifier("exports"), node.name as ts.Identifier);
            const declarationAssignment = ts.createAssignment(
                declarationNameExpression, ts.createLogicalOr(declarationNameExpression, ts.createObjectLiteral()));

            result.push(declarationAssignment);

            const localDeclaration =
                transformHelper.createLuaVariableStatement(node.name as ts.Identifier, declarationNameExpression);

            result.push(localDeclaration);
        } else {
            // local NS = NS or {}
            const declarationNameExpression = node.name;
            const declarationAssignment = ts.createAssignment(
                declarationNameExpression, ts.createLogicalOr(declarationNameExpression, ts.createObjectLiteral()));

            result.push(declarationAssignment);
        }

        // Set current namespace for nested NS
        // Keep previous currentNS to reset after block transpilation
        const previousNamespace = this.currentNamespace;
        this.currentNamespace = node;

        // Transform moduleblock to block and visit it
        if (node.body && ts.isModuleBlock(node.body)) {
            const bodyBlock = this.visitModuleBlock(node.body) as ts.Block;
            result.push(bodyBlock);
        }

        this.currentNamespace = previousNamespace;

        return result;
    }

    public visitEnumDeclaration(node: ts.EnumDeclaration): ts.VisitResult<ts.EnumDeclaration> {
        return node;
    }

    public visitFunctionDeclaration(node: ts.FunctionDeclaration): ts.VisitResult<ts.FunctionDeclaration> {
        return ts.updateFunctionDeclaration(node,
                                            node.decorators,
                                            node.modifiers,
                                            node.asteriskToken,
                                            node.name,
                                            node.typeParameters,
                                            node.parameters,
                                            node.type,
                                            this.visitBlock(node.body));
    }

    public visitTypeAliasDeclaration(node: ts.TypeAliasDeclaration): ts.VisitResult<ts.TypeAliasDeclaration> {
        return undefined;
    }

    public visitInterfaceDeclaration(node: ts.InterfaceDeclaration): ts.VisitResult<ts.InterfaceDeclaration> {
        return undefined;
    }

    public visitVariableStatement(node: ts.VariableStatement): ts.VariableStatement {
        return ts.updateVariableStatement(
            node, node.modifiers, this.visitVariableDeclarationList(node.declarationList));
    }

    public visitVariableDeclarationList(node: ts.VariableDeclarationList): ts.VariableDeclarationList {
        return ts.updateVariableDeclarationList(node,
                                                node.declarations.map(decl => this.visitVariableDeclaration(decl)));
    }

    public visitVariableDeclaration(node: ts.VariableDeclaration): ts.VariableDeclaration {
        let initializer: ts.Expression;
        if (node.initializer) {
            initializer = this.visitExpression(node.initializer);
        }
        return ts.updateVariableDeclaration(node, node.name, node.type, initializer);
    }

    public visitExpressionStatement(node: ts.ExpressionStatement): ts.Statement {
        if (ts.isBinaryExpression(node.expression)) {
            // Assignment
            if (node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                return this.visitAssignmentExpressionStatement(node);
            }

            const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(
                node.expression.operatorToken.kind);
            if (isCompound) {
                // +=, -=, etc...
                return this.visitCompoundAssignmentExpression(node.expression.left,
                                                              node.expression.right,
                                                              replacementOperator,
                                                              false,
                                                              true);
            }

        } else if (ts.isPrefixUnaryExpression(node.expression)
                   && !tsHelper.isNonCompoundPrefixUnaryOperator(node.expression)) {
            // ++i, --i
            return this.visitCompoundAssignmentExpression(node.expression.operand,
                                                          ts.createLiteral(1),
                                                          tsHelper.getUnaryCompoundAssignmentOperator(node.expression),
                                                          false,
                                                          true);

        } else if (ts.isPostfixUnaryExpression(node.expression)) {
            // i++, i--
            return this.visitCompoundAssignmentExpression(node.expression.operand,
                                                          ts.createLiteral(1),
                                                          tsHelper.getUnaryCompoundAssignmentOperator(node.expression),
                                                          true,
                                                          true);
        }

        return ts.updateStatement(node, this.visitExpression(node.expression));
    }

    public visitReturn(node: ts.ReturnStatement): ts.ReturnStatement {
        let updatedExpression: ts.Expression;
        if (node.expression) {
            updatedExpression = this.visitExpression(node.expression);
        }
        return ts.updateReturn(node, updatedExpression);
    }

    public visitIfStatement(node: ts.IfStatement): ts.IfStatement {
        let elseStatement: ts.Statement;
        if (node.elseStatement) {
            elseStatement = this.visitStatement(node.elseStatement);
        }
        return ts.updateIf(
            node, this.visitExpression(node.expression), this.visitStatement(node.thenStatement), elseStatement);
    }

    public visitWhileStatement(node: ts.WhileStatement): ts.WhileStatement {
        return ts.updateWhile(node, this.visitExpression(node.expression), this.visitStatement(node.statement));
    }

    public visitDoStatement(node: ts.DoStatement): ts.DoStatement {
        return ts.updateDo(node, this.visitStatement(node.statement), this.visitExpression(node.expression));
    }

    public visitForStatement(node: ts.ForStatement): ts.ForStatement {
        return ts.updateFor(node,
                            this.visitForInitializer(node.initializer),
                            this.visitExpression(node.condition),
                            this.visitExpression(node.incrementor),
                            this.visitStatement(node.statement));
    }

    public visitForOfStatement(node: ts.ForOfStatement): ts.ForOfStatement {
        return ts.updateForOf(node,
                              node.awaitModifier,
                              this.visitForInitializer(node.initializer),
                              this.visitExpression(node.expression),
                              this.visitStatement(node.statement));
    }

    public visitForInStatement(node: ts.ForInStatement): ts.ForInStatement {
        return ts.updateForIn(node,
                              this.visitForInitializer(node.initializer),
                              this.visitExpression(node.expression),
                              this.visitStatement(node.statement));
    }

    public visitForInitializer(node: ts.ForInitializer): ts.ForInitializer {
        let updatedInitializer: ts.ForInitializer;
        if (ts.isVariableDeclarationList(node)) {
            updatedInitializer = this.visitVariableDeclarationList(node);
        } else {
            updatedInitializer = this.visitExpression(node);
        }
        return updatedInitializer;
    }

    public visitSwitchStatement(node: ts.SwitchStatement): ts.SwitchStatement {
        // TODO
        return node;
    }

    public visitBreakStatement(node: ts.BreakStatement): ts.BreakStatement {
        // TODO
        return node;
    }

    public visitTryStatement(node: ts.TryStatement): ts.TryStatement {
        // TODO
        return node;
    }

    public visitThrowStatement(node: ts.ThrowStatement): ts.ThrowStatement {
        // TODO
        return node;
    }

    public visitContinueStatement(node: ts.ContinueStatement): ts.ContinueStatement {
        // TODO
        return node;
    }

    public visitEmptyStatement(node: ts.EmptyStatement): ts.EmptyStatement {
        return undefined;
    }

    public visitDestructuringAssignment(node: ts.BinaryExpression,
                                        left: ts.ArrayLiteralExpression,
                                        isStatement: boolean): ts.Block {
        let right = this.visitExpression(node.right);
        if (!tsHelper.isTupleReturnCall(node.right, this.checker)) {
            right = this.unpackExpression(right);
        }
        // local ${tmps} = ${right}; ${left} = ${tmps}; [return ${tmps}]
        const tmps = left.elements.map((_, i) => ts.createIdentifier(`____TS_tmp${i}`));
        const tmpsBindingElements = tmps.map(tmp => ts.createBindingElement(undefined, undefined, tmp));
        const tmpsBinding = ts.createArrayBindingPattern(tmpsBindingElements);
        const tmpsArray = ts.createArrayLiteral(tmps);
        const statements: ts.Statement[] = [
            ts.createVariableStatement(undefined, [ts.createVariableDeclaration(tmpsBinding, undefined, right)]),
            ts.createStatement(ts.createAssignment(this.visitExpression(left), tmpsArray)),
        ];
        if (!isStatement) {
            statements.push(ts.createReturn(tmpsArray));
        }
        return ts.createBlock(statements);
    }

    public visitAssignmentExpressionStatement(node: ts.ExpressionStatement): ts.Statement {
        const expression = node.expression as ts.BinaryExpression;
        if (tsHelper.hasSetAccessor(expression.left, this.checker)) {
            // TODO
        }

        if (ts.isArrayLiteralExpression(expression.left)) {
            // Destructing assignment
            return this.visitDestructuringAssignment(expression, expression.left, true);
        }

        const left = this.visitExpression(expression.left);
        const right = this.visitExpression(expression.right);
        return ts.updateStatement(node, ts.updateBinary(expression, left, right));
    }

    public visitAssignmentExpression(node: ts.BinaryExpression): ts.Expression {
        if (tsHelper.hasSetAccessor(node.left, this.checker)) {
            // TODO
        }

        if (ts.isArrayLiteralExpression(node.left)) {
            // Destructing assignment
            const block = this.visitDestructuringAssignment(node, node.left, false);
            const lambda = ts.createFunctionExpression(undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       block);
            return ts.createCall(ts.createParen(lambda), undefined, undefined);
        }

        const left = this.visitExpression(node.left);
        const right = this.visitExpression(node.right);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            node.left, this.checker);
        if (hasEffects) {
            // Property/element access expressions need to have individual parts cached
            // (function(o, i, v) o[i] = v; return v end)(${objExpression}, ${indexExpression}, ${right})
            const o = ts.createIdentifier("o");
            const i = ts.createIdentifier("i");
            const v = ts.createIdentifier("v");
            const block = ts.createBlock([
                ts.createStatement(ts.createAssignment(ts.createElementAccess(o, i), v)),
                ts.createReturn(v),
            ]);
            const parameters: ts.ParameterDeclaration[] = [
                ts.createParameter(undefined, undefined, undefined, o),
                ts.createParameter(undefined, undefined, undefined, i),
                ts.createParameter(undefined, undefined, undefined, v),
            ];
            const lambda = ts.createFunctionExpression(undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       parameters,
                                                       undefined,
                                                       block);
            return ts.createCall(ts.createParen(lambda), undefined, [objExpression, indexExpression, right]);

        } else if (tsHelper.isExpressionWithEvaluationEffect(right)) {
            // Cache right-hand express in temp
            // (function() local __TS_tmp = ${right}; ${left} = __TS_tmp; return __TS_tmp end)()
            const tmp = ts.createIdentifier("____TS_tmp");
            const block = ts.createBlock([
                ts.createVariableStatement(undefined, [ts.createVariableDeclaration(tmp, undefined, right)]),
                ts.createStatement(ts.createAssignment(left, tmp)),
                ts.createReturn(tmp),
            ]);
            const lambda = ts.createFunctionExpression(undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       block);
            return ts.createCall(ts.createParen(lambda), undefined, undefined);

        } else {
            // (function() ${left} = ${right}; return ${right} end)()
            const block = ts.createBlock([
                ts.createStatement(ts.createAssignment(left, right)),
                ts.createReturn(right),
            ]);
            const lambda = ts.createFunctionExpression(undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       block);
            return ts.createCall(ts.createParen(lambda), undefined, undefined);
        }
    }

    public visitCompoundAssignmentExpression(left: ts.Expression,
                                             right: ts.Expression,
                                             replacementOperator: ts.BinaryOperator,
                                             isPostfix: boolean,
                                             isStatement: false): ts.Expression;
    public visitCompoundAssignmentExpression(left: ts.Expression,
                                             right: ts.Expression,
                                             replacementOperator: ts.BinaryOperator,
                                             isPostfix: boolean,
                                             isStatement: true): ts.Statement;
    public visitCompoundAssignmentExpression(left: ts.Expression,
                                             right: ts.Expression,
                                             replacementOperator: ts.BinaryOperator,
                                             isPostfix: boolean,
                                             isStatement: boolean): ts.Expression | ts.Statement {
        const pos = left.parent.pos;
        left = this.visitExpression(left);
        right = this.visitExpression(right);
        let statements: ts.Statement[];
        let resultExpression: ts.Expression;
        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            left, this.checker);
        if (hasEffects) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __TS_obj, __TS_index = objExpression, indexExpression;
            const obj = ts.createIdentifier("____TS_obj");
            const index = ts.createIdentifier("____TS_index");
            const objDeclaration = ts.createVariableDeclaration(obj, undefined, objExpression);
            const indexDeclaration = ts.createVariableDeclaration(index, undefined, indexExpression);
            const tmp = ts.createIdentifier("____TS_tmp");
            const accessExpression = ts.createElementAccess(obj, index);
            right = ts.createParen(right);
            let tmpDeclaration: ts.VariableDeclaration;
            let assignStatement: ts.BinaryExpression;
            if (isPostfix) {
                // local ____TS_tmp = ____TS_obj[____TS_index];
                // ____TS_obj[____TS_index] = ${left} ${replacementOperator} ____TS_obj[____TS_index];
                tmpDeclaration = ts.createVariableDeclaration(tmp, undefined, accessExpression);
                const operatorExpression = ts.createBinary(left, replacementOperator, right);
                operatorExpression.pos = pos; // Needed to get proper error reporting
                assignStatement = ts.createAssignment(accessExpression, operatorExpression);
            } else {
                // local ____TS_tmp = ____TS_obj[____TS_index] ${replacementOperator} ${right};
                // ____TS_obj[____TS_index] = ____TS_tmp;
                const operatorExpression = ts.createBinary(accessExpression, replacementOperator, right);
                operatorExpression.pos = pos; // Needed to get proper error reporting
                tmpDeclaration = ts.createVariableDeclaration(tmp, undefined, operatorExpression);
                assignStatement = ts.createAssignment(accessExpression, tmp);
            }
            statements = [ts.createVariableStatement(undefined, [objDeclaration, indexDeclaration]),
                          ts.createVariableStatement(undefined, [tmpDeclaration]),
                          ts.createStatement(assignStatement)];
            resultExpression = tmp;

        } else if (!isStatement && isPostfix) {
            // Postfix expressions need to cache original value in temp
            // local ____TS_tmp = ${left};
            // ${left} = ____TS_tmp ${replacementOperator} ${right};
            const tmpIdentifier = ts.createIdentifier("____TS_tmp");
            const tmpDeclaration = ts.createVariableDeclaration(tmpIdentifier, undefined, left);
            const operatorExpression = ts.createBinary(tmpIdentifier, replacementOperator, right);
            operatorExpression.pos = pos; // Needed to get proper error reporting
            const assignStatement = ts.createAssignment(left, operatorExpression);
            statements = [ts.createVariableStatement(undefined, [tmpDeclaration]), ts.createStatement(assignStatement)];
            resultExpression = tmpIdentifier;

        } else if (!isStatement
                   && (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left))) {
            // Simple property/element access expressions need to cache in temp to avoid double-evaluation
            // local ____TS_tmp = ${left} ${replacementOperator} ${right};
            // ${left} = ____TS_tmp;
            const tmpIdentifier = ts.createIdentifier("____TS_tmp");
            const operatorExpression = ts.createBinary(left, replacementOperator, right);
            operatorExpression.pos = pos; // Needed to get proper error reporting
            const tmpDeclaration = ts.createVariableDeclaration(tmpIdentifier, undefined, operatorExpression);
            const assignStatement = ts.createAssignment(left, tmpIdentifier);
            statements = [ts.createVariableStatement(undefined, [tmpDeclaration]), ts.createStatement(assignStatement)];
            resultExpression = tmpIdentifier;

        } else {
            // Simple statements/expressions
            const operatorExpression = ts.createBinary(left, replacementOperator, right);
            operatorExpression.pos = pos; // Needed to get proper error reporting
            const assignStatement = ts.createAssignment(left, operatorExpression);
            statements = [ts.createStatement(assignStatement)];
            resultExpression = left;
        }

        if (isStatement) {
            // do ${statements} end
            return statements.length > 1 ? ts.createBlock(statements) : statements[0];
        } else {
            // (function() ${statements} return ${resultExpression} end)()
            statements.push(ts.createReturn(resultExpression));
            const lambda = ts.createFunctionExpression(undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       undefined,
                                                       ts.createBlock(statements));
            return ts.createCall(ts.createParen(lambda), undefined, undefined);
        }
    }

    public visitBinaryExpression(node: ts.BinaryExpression): ts.Expression {
        let operatorToken = node.operatorToken;

        const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(operatorToken.kind);
        if (isCompound) {
            return this.visitCompoundAssignmentExpression(node.left, node.right, replacementOperator, false, false);
        }

        switch (operatorToken.kind) {
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                operatorToken = ts.createToken(ts.SyntaxKind.EqualsEqualsToken);
                break;

            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                operatorToken = ts.createToken(ts.SyntaxKind.ExclamationEqualsToken);
                break;

            case ts.SyntaxKind.EqualsToken:
                return this.visitAssignmentExpression(node);

            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                // TODO
                break;

            case ts.SyntaxKind.InKeyword:
                // TODO
                break;

            case ts.SyntaxKind.InstanceOfKeyword:
                // TODO
                break;

            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
            case ts.SyntaxKind.PlusToken:
            case ts.SyntaxKind.MinusToken:
            case ts.SyntaxKind.AsteriskToken:
            case ts.SyntaxKind.AsteriskAsteriskToken:
            case ts.SyntaxKind.SlashToken:
            case ts.SyntaxKind.PercentToken:
            case ts.SyntaxKind.GreaterThanToken:
            case ts.SyntaxKind.GreaterThanEqualsToken:
            case ts.SyntaxKind.LessThanToken:
            case ts.SyntaxKind.LessThanEqualsToken:
            case ts.SyntaxKind.EqualsToken:
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsToken:
                break;

            default:
                throw TSTLErrors.UnsupportedKind("binary operator", operatorToken.kind, node);
        }
        return ts.updateBinary(node, this.visitExpression(node.left), this.visitExpression(node.right), operatorToken);
    }

    public visitConditionalExpression(node: ts.ConditionalExpression): ts.ConditionalExpression {
        return ts.updateConditional(node,
                                    this.visitExpression(node.condition),
                                    this.visitExpression(node.whenTrue),
                                    this.visitExpression(node.whenFalse));
    }

    public visitCallExpression(node: ts.CallExpression): ts.Expression {
        const call = ts.updateCall(node,
                                   this.visitExpression(node.expression),
                                   node.typeArguments,
                                   node.arguments.map(arg => this.visitExpression(arg)));

        const isTupleReturn = tsHelper.isTupleReturnCall(node, this.checker);
        const isTupleReturnForward = node.parent && ts.isReturnStatement(node.parent)
            && tsHelper.isInTupleReturnFunction(node, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(node);
        const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);
        if (isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment && returnValueIsUsed) {
            // Wrap tuple result
            return ts.createArrayLiteral([call]);
        }

        return call;
    }

    public visitPropertyAccessExpression(node: ts.PropertyAccessExpression): ts.PropertyAccessExpression {
        return ts.updatePropertyAccess(node, this.visitExpression(node.expression), node.name);
    }

    public visitElementAccessExpression(node: ts.ElementAccessExpression): ts.ElementAccessExpression {
        return ts.updateElementAccess(
            node, this.visitExpression(node.expression), this.visitExpression(node.argumentExpression));
    }

    public visitParenthesizedExpression(node: ts.ParenthesizedExpression): ts.ParenthesizedExpression {
        return ts.updateParen(node, this.visitExpression(node.expression));
    }

    public visitTypeAssertionExpression(node: ts.TypeAssertion): ts.Expression {
        return this.visitExpression(node.expression);
    }

    public visitAsExpression(node: ts.AsExpression): ts.Expression {
        return this.visitExpression(node.expression);
    }

    public visitTypeOfExpression(node: ts.TypeOfExpression): ts.BinaryExpression {
        // ((type(${expression}) == "table" and "object") or type(${expression}))
        const expression = this.visitExpression(node.expression);
        const typeCall = ts.createCall(
            ts.createIdentifier("type"), [ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)], [expression]);
        const comapareExpression =
            ts.createBinary(typeCall, ts.SyntaxKind.EqualsEqualsToken, ts.createLiteral("table"));
        const andExpression = ts.createLogicalAnd(comapareExpression, ts.createLiteral("object"));
        const orExpression = ts.createLogicalOr(andExpression, typeCall);
        return orExpression;
    }

    public unpackExpression(expression: ts.Expression): ts.CallExpression {
        // TODO move this to differen targets
        // table.unpack(expression) / unpack(expression)
        let functionExpresion: ts.Expression;
        const target = this.options.luaTarget ? this.options.luaTarget.toLowerCase() : "";
        switch (target) {
            case LuaTarget.Lua51:
                functionExpresion = ts.createIdentifier("unpack");
                break;
            case LuaTarget.Lua52:
            case LuaTarget.Lua53:
                functionExpresion =
                    ts.createPropertyAccess(ts.createIdentifier("table"), ts.createIdentifier("unpack"));
                break;
            default:
                functionExpresion = ts.createIdentifier("unpack");
                break;
        }
        return tsHelper.createLuaCallExpression(functionExpresion, [expression], false);
    }

    public visitSpreadElement(node: ts.SpreadElement): ts.CallExpression {
        return this.unpackExpression(node.expression);
    }

    public visitNonNullExpression(node: ts.NonNullExpression): ts.Expression {
        return this.visitExpression(node.expression);
    }

    public visitClassExpression(node: ts.ClassExpression): ts.ClassExpression {
        // TODO
        return node;
    }

    public visitTemplateExpression(node: ts.TemplateExpression): ts.Expression {
        let concatExpression: ts.Expression = ts.createLiteral(node.head.text);
        node.templateSpans.forEach(span => {
            const expr = ts.createCall(ts.createIdentifier("tostring"),
                                       [ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)],
                                       [this.visitExpression(span.expression)]);
            const text = ts.createLiteral(span.literal.text);

            concatExpression = tsHelper.createLuaConcatExpression(concatExpression,
                                                                  ts.createAdd(expr, ts.createLiteral(text)));
        });
        return concatExpression;
    }

    public visitPostfixUnaryExpression(node: ts.PostfixUnaryExpression): ts.Expression {
        return this.visitCompoundAssignmentExpression(node.operand,
                                                      ts.createLiteral(1),
                                                      tsHelper.getUnaryCompoundAssignmentOperator(node),
                                                      true,
                                                      false);
    }

    public visitPrefixUnaryExpression(node: ts.PrefixUnaryExpression): ts.Expression {
        if (tsHelper.isNonCompoundPrefixUnaryOperator(node)) {
            return node;
        } else {
            return this.visitCompoundAssignmentExpression(node.operand,
                                                          ts.createLiteral(1),
                                                          tsHelper.getUnaryCompoundAssignmentOperator(node),
                                                          false,
                                                          false);
        }
    }

    public visitArrayLiteralExpression(node: ts.ArrayLiteralExpression): ts.ArrayLiteralExpression {
        return node;
    }

    public visitObjectLiteralExpression(node: ts.ObjectLiteralExpression): ts.ObjectLiteralExpression {
        return node;
    }

    public visitDeleteExpression(node: ts.DeleteExpression): ts.Expression {
        return ts.createAssignment(this.visitExpression(node.expression), ts.createNull());
    }

    public visitFunctionExpression(node: ts.FunctionExpression): ts.FunctionExpression {
        return ts.updateFunctionExpression(node,
                                           node.modifiers,
                                           node.asteriskToken,
                                           node.name,
                                           node.typeParameters,
                                           node.parameters,
                                           node.type,
                                           this.visitBlock(node.body));
    }

    public visitArrowFunction(node: ts.ArrowFunction): ts.ArrowFunction {
        let newBody: ts.ConciseBody;
        if (ts.isBlock(node.body)) {
            newBody = this.visitBlock(node.body);
        } else {
            newBody = this.visitExpression(node.body);
        }
        return ts.updateArrowFunction(node, node.modifiers, node.typeParameters, node.parameters, node.type, newBody);
    }

    public visitNewExpression(node: ts.NewExpression): ts.NewExpression {
        return node;
    }

    public visitIdentifier(node: ts.Identifier): ts.Identifier| ts.PropertyAccessExpression {
        // If we are in a namespace or a sourcefile that is a module check if this identifier is exported
        if (this.currentNamespace && tsHelper.isIdentifierExported(node, this.currentNamespace, this.checker)) {
            return ts.createPropertyAccess(this.currentNamespace.name, node);
        } else if (this.isModule && tsHelper.isIdentifierExported(node, this.sourceFile, this.checker)) {
            return ts.createPropertyAccess(ts.createIdentifier("exports"), node);
        }

        return node;
    }

    public visitStringLiteral(node: ts.StringLiteral): ts.StringLiteral {
        return node;
    }

    public visitNoSubstitutionTemplateLiteral(node: ts.NoSubstitutionTemplateLiteral):
        ts.NoSubstitutionTemplateLiteral {
        return node;
    }

    public visitNumericLiteral(node: ts.NumericLiteral): ts.NumericLiteral {
        return node;
    }

    public visitTrueKeyword(node: ts.BooleanLiteral): ts.BooleanLiteral {
        return node;
    }

    public visitFalseKeyword(node: ts.BooleanLiteral): ts.BooleanLiteral {
        return node;
    }

    public visitNullKeyword(node: ts.NullLiteral): ts.NullLiteral {
        return node;
    }

    public visitUndefinedKeyword(node: ts.LiteralExpression): ts.LiteralExpression {
        return node;
    }

    public visitThisKeyword(node: ts.ThisExpression): ts.ThisExpression {
        return node;
    }

    public visitSuperKeyword(node: ts.SuperExpression): ts.SuperExpression {
        return node;
    }

    public visitComputedPropertyName(node: ts.ComputedPropertyName): ts.VisitResult<ts.ComputedPropertyName> {
        return node;
    }

    public visitBlock(node: ts.Block): ts.Block {
        if (!node) {
            return undefined;
        }
        return ts.updateBlock(node,
                              transformHelper.flatten(node.statements.map(s => this.visitor(s)) as ts.Statement[]));
    }

    public visitModuleBlock(node: ts.ModuleBlock): ts.VisitResult<ts.Block> {
        return this.visitBlock(ts.createBlock(node.statements));
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
