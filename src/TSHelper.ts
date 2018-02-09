import * as ts from "typescript";

export class TSHelper {
    // Get all children of a node, required until microsoft fixes node.getChildren()
    static getChildren(node: ts.Node): ts.Node[] {
        const children: ts.Node[] = [];
        node.forEachChild(child => {
            children.push(child);
        });
        return children;
    }

    // Get children filtered by function and cast to predefined type
    static getChildrenOfType<T>(node: ts.Node, typeFilter: (node: ts.Node) => boolean): T[] {
        return <T[]><any>this.getChildren(node).filter(typeFilter);
    }

    static getFirstChildOfType<T>(node: ts.Node, typeFilter: (node: ts.Node) => boolean): T {
        return this.getChildrenOfType<T>(node, typeFilter)[0];
    }

    // Reverse lookup of enum key by value
    static enumName(needle, haystack) {
        for (var name in haystack) {
            if (haystack[name] == needle) {
                return name;
            }
        }
        return "unknown";
    }

    static isCurrentFileModule(node: ts.Node) {
        let sourceFile = ts.isSourceFile(node) ? node : node.getSourceFile();
        if (sourceFile) {
            // Vanilla ts flags files as external module if they have an import or
            // export statement, we only check for export statements
            let hasExport = false;
            sourceFile.statements.forEach(statement => {
                if (!!(ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export)
                    || statement.kind === ts.SyntaxKind.ExportAssignment
                    || statement.kind === ts.SyntaxKind.ExportDeclaration) {
                    hasExport = true;
                }
            });
            return hasExport;
        }
        return false;
    }

    static isStringType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.String) != 0
            || (type.flags & ts.TypeFlags.StringLike) != 0
            || (type.flags & ts.TypeFlags.StringLiteral) != 0
    }

    static isValueType(node: ts.Node): boolean {
        return ts.isIdentifier(node) || ts.isLiteralExpression(node) || ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node);
    }

    static isArrayType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.Object) != 0
            && (<ts.ObjectType>type).symbol
            && (<ts.ObjectType>type).symbol.escapedName == "Array";
    }

    static isTupleType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.Object) != 0
            && (<ts.TypeReference>type).typeArguments != undefined;
    }

    static isCompileMembersOnlyEnum(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Enum) != 0)
            && type.symbol.getDocumentationComment(checker)[0] != undefined
            && this.hasCustomDecorator(type, checker, "!CompileMembersOnly");
    }

    static isPureAbstractClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) != 0)
            && this.hasCustomDecorator(type, checker, "!PureAbstract");
    }

    static isExtensionClass(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Class) != 0)
            && this.hasCustomDecorator(type, checker, "!Extension");
    }

    static isPhantom(type: ts.Type, checker: ts.TypeChecker): boolean {
        return type.symbol
            && ((type.symbol.flags & ts.SymbolFlags.Namespace) != 0)
            && this.hasCustomDecorator(type, checker, "!Phantom");
    }

    static hasCustomDecorator(type: ts.Type, checker: ts.TypeChecker, decorator: string): boolean {
        if (type.symbol) {
            var comment = type.symbol.getDocumentationComment(checker);
            var decorators = comment.filter(_ => _.kind == "text").map(_ => _.text.trim()).filter(_ => _[0] == "!");
            return decorators.indexOf(decorator) > -1;
        }
        return false;
    }
}
