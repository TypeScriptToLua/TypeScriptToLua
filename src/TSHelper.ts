import * as ts from "typescript";
import { Decorator, DecoratorKind } from "./Decorator";

export class TSHelper {

    // Reverse lookup of enum key by value
    public static enumName(needle, haystack): string {
        for (const name in haystack) {
            if (haystack[name] === needle) {
                return name;
            }
        }
        return "unknown";
    }

    // Breaks down a mask into all flag names.
    public static enumNames(mask, haystack): string[] {
        const result = [];
        for (const name in haystack) {
            if ((mask & haystack[name]) !== 0 && mask >= haystack[name]) {
                result.push(name);
            }
        }
        return result;
    }

    public static containsStatement(statements: ts.NodeArray<ts.Statement>, kind: ts.SyntaxKind): boolean {
        return statements.some(statement => statement.kind === kind);
    }

    public static getExtendedType(node: ts.ClassLikeDeclarationBase, checker: ts.TypeChecker): ts.Type | undefined {
        if (node && node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    const superType = checker.getTypeAtLocation(clause.types[0]);
                    const decorators = this.getCustomDecorators(superType, checker);
                    if (!decorators.has(DecoratorKind.PureAbstract)) {
                        return superType;
                    }
                }
            }
        }
        return undefined;
    }

    public static isFileModule(sourceFile: ts.SourceFile): boolean {
        if (sourceFile) {
            // Vanilla ts flags files as external module if they have an import or
            // export statement, we only check for export statements
            // TODO will break in 3.x
            return sourceFile.statements.some(statement =>
                (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0
                || statement.kind === ts.SyntaxKind.ExportAssignment
                || statement.kind === ts.SyntaxKind.ExportDeclaration);
        }
        return false;
    }

    public static isInDestructingAssignment(node: ts.Node): boolean {
        return node.parent && ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name))
            || (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)));
    }

    public static isStringType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.String) !== 0
            || (type.flags & ts.TypeFlags.StringLike) !== 0
            || (type.flags & ts.TypeFlags.StringLiteral) !== 0;
    }

    public static isArrayTypeNode(typeNode: ts.TypeNode): boolean {
        return typeNode.kind === ts.SyntaxKind.ArrayType
            || typeNode.kind === ts.SyntaxKind.TupleType
            || ((typeNode.kind === ts.SyntaxKind.UnionType || typeNode.kind === ts.SyntaxKind.IntersectionType)
                && (typeNode as ts.UnionOrIntersectionTypeNode).types.some(this.isArrayTypeNode));
    }

    public static isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && this.isArrayTypeNode(typeNode);
    }

    public static isFunctionType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && ts.isFunctionTypeNode(typeNode);
    }

    public static isTupleReturnCall(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isCallExpression(node)) {
            const type = checker.getTypeAtLocation(node.expression);

            return this.getCustomDecorators(type, checker)
                       .has(DecoratorKind.TupleReturn);
        } else {
            return false;
        }
    }

    public static isInTupleReturnFunction(node: ts.Node, checker: ts.TypeChecker): boolean {
        const declaration = this.findFirstNodeAbove(node, (n): n is ts.Node =>
            ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n));
        if (declaration) {
            const decorators = this.getCustomDecorators(
                checker.getTypeAtLocation(declaration),
                checker
            );
            return decorators.has(DecoratorKind.TupleReturn);
        } else {
            return false;
        }
    }

    public static collectCustomDecorators(symbol: ts.Symbol, checker: ts.TypeChecker,
                                          decMap: Map<DecoratorKind, Decorator>): void {
        const comments = symbol.getDocumentationComment(checker);
        const decorators =
            comments.filter(comment => comment.kind === "text")
                    .map(comment => comment.text.trim().split("\n"))
                    .reduce((a, b) => a.concat(b), [])
                    .filter(comment => comment[0] === "!");
        decorators.forEach(decStr => {
            const dec = new Decorator(decStr);
            decMap.set(dec.kind, dec);
        });
    }

    public static getCustomDecorators(type: ts.Type, checker: ts.TypeChecker): Map<DecoratorKind, Decorator> {
        const decMap = new Map<DecoratorKind, Decorator>();
        if (type.symbol) {
            this.collectCustomDecorators(type.symbol, checker, decMap);
        }
        if (type.aliasSymbol) {
            this.collectCustomDecorators(type.aliasSymbol, checker, decMap);
        }
        return decMap;
    }

    // Search up until finding a node satisfying the callback
    public static findFirstNodeAbove<T extends ts.Node>(node: ts.Node, callback: (n: ts.Node) => n is T): T {
        let current = node;
        while (current.parent) {
            if (callback(current.parent)) {
                return current.parent;
            } else {
                current = current.parent;
            }
        }
        return null;
    }

    public static hasGetAccessor(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isPropertyAccessExpression(node)) {
            const name = node.name.escapedText;
            const type = checker.getTypeAtLocation(node.expression);

            if (type && type.symbol && type.symbol.members) {
                const field = type.symbol.members.get(name);
                return field && (field.flags & ts.SymbolFlags.GetAccessor) !== 0;
            }
        }
        return false;
    }

    public static hasSetAccessor(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isPropertyAccessExpression(node)) {
            const name = node.name.escapedText;
            const type = checker.getTypeAtLocation(node.expression);

            if (type && type.symbol && type.symbol.members) {
                const field = type.symbol.members.get(name);
                return field && (field.flags & ts.SymbolFlags.SetAccessor) !== 0;
            }
        }
        return false;
    }

    public static isBinaryAssignmentToken(token: ts.SyntaxKind): [boolean, ts.BinaryOperator] {
        switch (token) {
            case ts.SyntaxKind.BarEqualsToken:
                return [true, ts.SyntaxKind.BarToken];
            case ts.SyntaxKind.PlusEqualsToken:
                return [true, ts.SyntaxKind.PlusToken];
            case ts.SyntaxKind.CaretEqualsToken:
                return [true, ts.SyntaxKind.CaretToken];
            case ts.SyntaxKind.MinusEqualsToken:
                return [true, ts.SyntaxKind.MinusToken];
            case ts.SyntaxKind.SlashEqualsToken:
                return [true, ts.SyntaxKind.SlashToken];
            case ts.SyntaxKind.PercentEqualsToken:
                return [true, ts.SyntaxKind.PercentToken];
            case ts.SyntaxKind.AsteriskEqualsToken:
                return [true, ts.SyntaxKind.AsteriskToken];
            case ts.SyntaxKind.AmpersandEqualsToken:
                return [true, ts.SyntaxKind.AmpersandToken];
            case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
                return [true, ts.SyntaxKind.AsteriskAsteriskToken];
            case ts.SyntaxKind.LessThanLessThanEqualsToken:
                return [true, ts.SyntaxKind.LessThanLessThanToken];
            case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                return [true, ts.SyntaxKind.GreaterThanGreaterThanToken];
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                return [true, ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken];
        }

        return [false, null];
    }

    public static isExpressionStatement(node: ts.Expression): boolean {
        return node.parent === undefined
            || ts.isExpressionStatement(node.parent)
            || ts.isForStatement(node.parent);
    }

    public static isInGlobalScope(node: ts.FunctionDeclaration): boolean {
        let parent = node.parent;
        while (parent !== undefined) {
            if (ts.isBlock(parent)) {
                return false;
            }
            parent = parent.parent;
        }
        return true;
    }

    // Returns true for expressions that may have effects when evaluated
    public static isExpressionWithEvaluationEffect(node: ts.Expression): boolean {
        return !(ts.isLiteralExpression(node) || ts.isIdentifier(node));
    }

    // If expression is property/element access with possible effects from being evaluated, returns true along with the
    // separated object and index expressions.
    public static isAccessExpressionWithEvaluationEffects(node: ts.Expression, checker: ts.TypeChecker):
        [boolean, ts.Expression, ts.Expression] {
        if (ts.isElementAccessExpression(node)
            && (this.isExpressionWithEvaluationEffect(node.expression)
                || this.isExpressionWithEvaluationEffect(node.argumentExpression))) {
            const type = checker.getTypeAtLocation(node.expression);
            if (this.isArrayType(type, checker)) {
                // Offset arrays by one
                const oneLit = ts.createNumericLiteral("1");
                const exp = ts.createParen(node.argumentExpression);
                const addExp = ts.createBinary(exp, ts.SyntaxKind.PlusToken, oneLit);
                return [true, node.expression, addExp];
            } else {
                return [true, node.expression, node.argumentExpression];
            }
        } else if (ts.isPropertyAccessExpression(node) && this.isExpressionWithEvaluationEffect(node.expression)) {
            return [true, node.expression, ts.createStringLiteral(node.name.text)];
        }
        return [false, null, null];
    }
}
