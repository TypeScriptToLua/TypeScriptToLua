import * as ts from "typescript";

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

    public static getExtendedType(node: ts.ClassDeclaration, checker: ts.TypeChecker): ts.Type | undefined {
        if (node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    const superType = checker.getTypeAtLocation(clause.types[0]);
                    if (!this.isPureAbstractClass(superType, checker)) {
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
            return sourceFile.statements.some(statement =>
                (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0
                || statement.kind === ts.SyntaxKind.ExportAssignment
                || statement.kind === ts.SyntaxKind.ExportDeclaration);
        }
        return false;
    }

    public static isInDestructingAssignment(node: ts.Node): boolean {
        return node.parent && ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name);
    }

    public static isStringType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.String) !== 0
            || (type.flags & ts.TypeFlags.StringLike) !== 0
            || (type.flags & ts.TypeFlags.StringLiteral) !== 0;
    }

    public static isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type);
        return typeNode && (typeNode.kind === ts.SyntaxKind.ArrayType || typeNode.kind === ts.SyntaxKind.TupleType);
    }

    public static isCompileMembersOnlyEnum(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Enum) !== 0)
            && type.symbol.getDocumentationComment(checker)[0] !== undefined
            && this.hasCustomDecorator(type, checker, "!CompileMembersOnly");
    }

    public static isPureAbstractClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) !== 0)
            && this.hasCustomDecorator(type, checker, "!PureAbstract");
    }

    public static isExtensionClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) !== 0)
            && this.hasCustomDecorator(type, checker, "!Extension");
    }

    public static isPhantom(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Namespace) !== 0)
            && this.hasCustomDecorator(type, checker, "!Phantom");
    }

    public static isTupleReturnCall(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isCallExpression(node)) {
            const type = checker.getTypeAtLocation(node.expression);
            return this.isTupleReturnFunction(type, checker);
        } else {
            return false;
        }
    }

    public static isTupleReturnFunction(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Function) !== 0
                || (type.symbol.flags & ts.SymbolFlags.Method) !== 0)
            && this.hasCustomDecorator(type, checker, "!TupleReturn");
    }

    public static hasCustomDecorator(type: ts.Type, checker: ts.TypeChecker, decorator: string): boolean {
        if (type.symbol) {
            const comments = type.symbol.getDocumentationComment(checker);
            const decorators =
                comments.filter(comment => comment.kind === "text")
                    .map(comment => comment.text.trim())
                    .filter(comment => comment[0] === "!");
            return decorators.indexOf(decorator) > -1;
        }
        return false;
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
}
