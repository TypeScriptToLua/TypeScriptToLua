import * as ts from "typescript";

export class TSHelper {

    // Reverse lookup of enum key by value
    public static enumName(needle, haystack) {
        for (const name in haystack) {
            if (haystack[name] === needle) {
                return name;
            }
        }
        return "unknown";
    }

    // Breaks down a mask into all flag names.
    public static enumNames(mask, haystack) {
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

    public static isFileModule(sourceFile: ts.SourceFile) {
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

    public static isStringType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.String) !== 0
            || (type.flags & ts.TypeFlags.StringLike) !== 0
            || (type.flags & ts.TypeFlags.StringLiteral) !== 0;
    }

    public static isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type);
        return typeNode && typeNode.kind === ts.SyntaxKind.ArrayType;
    }

    public static isTupleType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type);
        return typeNode && typeNode.kind === ts.SyntaxKind.TupleType;
    }

    public static isCompileMembersOnlyEnum(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Enum) !== 0)
            && type.symbol.getDocumentationComment(checker)[0] !== undefined
            && this.hasCustomDecorator(type.symbol, checker, "!CompileMembersOnly");
    }

    public static isPureAbstractClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) !== 0)
            && this.hasCustomDecorator(type.symbol, checker, "!PureAbstract");
    }

    public static isExtensionClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) !== 0)
            && this.hasCustomDecorator(type.symbol, checker, "!Extension");
    }

    public static isPhantom(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Namespace) !== 0)
            && this.hasCustomDecorator(type.symbol, checker, "!Phantom");
    }

    public static isTupleReturnFunction(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Function) !== 0
               || (type.symbol.flags & ts.SymbolFlags.Method) !== 0)
            && this.hasCustomDecorator(type.symbol, checker, "!TupleReturn");
    }

    public static isDotMethod(call: ts.CallExpression, checker: ts.TypeChecker): boolean {
        // if we're not accessing a property on something, it doesn't matter
        if (!ts.isPropertyAccessExpression(call.expression)) {
            return false;
        }

        // check by function type
        const functionType = checker.getTypeAtLocation(call.expression);

        // static functions should always use dot syntax
        if (functionType.symbol
            && functionType.symbol.valueDeclaration
            && functionType.symbol.valueDeclaration.modifiers) {
            for (const k of functionType.symbol.valueDeclaration.modifiers || []) {
                if (k.kind === ts.SyntaxKind.StaticKeyword) {
                    return true;
                }
            }
        }

        // check whether the function is marked as a dot method
        if (this.hasCustomDecorator(functionType.symbol, checker, "!DotMethod")) {
            return true;
        }

        // check by the container of the function
        const containerType = checker.getTypeAtLocation(call.expression.expression);

        // check if it's declared in a namespace
        if (containerType.symbol.flags & ts.SymbolFlags.Namespace) {
            return true;
        }

        return this.hasCustomDecorator(containerType.symbol, checker, "!DotMethod");
    }

    public static hasCustomDecorator(symbol: ts.Symbol | undefined, checker: ts.TypeChecker, decorator: string) {
        if (symbol) {
            const comments = symbol.getDocumentationComment(checker);
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
}
