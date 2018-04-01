import * as ts from "typescript";

export class TSHelper {
    // Get all children of a node, required until microsoft fixes node.getChildren()
    public static getChildren(node: ts.Node): ts.Node[] {
        const children: ts.Node[] = [];
        node.forEachChild((child) => {
            children.push(child);
        });
        return children;
    }

    // Get children filtered by function and cast to predefined type
    public static getChildrenOfType<T>(node: ts.Node, typeFilter: (node: ts.Node) => boolean): T[] {
        return this.getChildren(node).filter(typeFilter) as any as T[];
    }

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
        return statements.some((statement) => statement.kind === kind);
    }

    public static isFileModule(sourceFile: ts.SourceFile) {
        if (sourceFile) {
            // Vanilla ts flags files as external module if they have an import or
            // export statement, we only check for export statements
            return sourceFile.statements.some((statement) =>
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

    public static isArrayType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.Object) !== 0
            && (type as ts.ObjectType).symbol
            && (type as ts.ObjectType).symbol.escapedName === "Array";
    }

    public static isTupleType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.Object) !== 0
            && (type as ts.TypeReference).typeArguments !== undefined;
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

    public static isTupleReturnFunction(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Function) !== 0)
            && this.hasCustomDecorator(type, checker, "!TupleReturn");
    }

    public static hasCustomDecorator(type: ts.Type, checker: ts.TypeChecker, decorator: string): boolean {
        if (type.symbol) {
            const comment = type.symbol.getDocumentationComment(checker);
            const decorators =
                comment.filter((_) => _.kind === "text").map((_) => _.text.trim()).filter((_) => _[0] === "!");
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
}
