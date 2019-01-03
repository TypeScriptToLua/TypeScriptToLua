import * as ts from "typescript";
import { Decorator, DecoratorKind } from "./Decorator";

export enum ContextType {
    None,
    Void,
    NonVoid,
    Mixed,
}

const defaultArrayCallMethodNames = new Set<string>([
    "concat",
    "push",
    "reverse",
    "shift",
    "unshift",
    "sort",
    "pop",
    "forEach",
    "indexOf",
    "map",
    "filter",
    "some",
    "every",
    "slice",
    "splice",
    "join",
]);

const defaultArrayPropertyNames = new Set<string>([
    "length",
]);

export class TSHelper {

    // Reverse lookup of enum key by value
    public static enumName<T>(needle: T, haystack: any): string {
        for (const name in haystack) {
            if (haystack[name] === needle) {
                return name;
            }
        }
        return "unknown";
    }

    // Breaks down a mask into all flag names.
    public static enumNames<T>(mask: number, haystack: any): string[] {
        const result = [];
        for (const name in haystack) {
            if ((mask & haystack[name]) !== 0 && mask >= haystack[name]) {
                result.push(name);
            }
        }
        return result;
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
        return node.parent && (
            (ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name))
            || (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)));
    }

    // iterate over a type and its bases until the callback returns true.
    public static forTypeOrAnySupertype(
        type: ts.Type,
        checker: ts.TypeChecker,
        predicate: (type: ts.Type) => boolean
    ): boolean {
        if (predicate(type)) {
            return true;
        }
        if (!type.isClassOrInterface() && type.symbol) {
            type = checker.getDeclaredTypeOfSymbol(type.symbol);
        }
        const superTypes = type.getBaseTypes();
        if (superTypes) {
            for (const superType of superTypes) {
                if (this.forTypeOrAnySupertype(superType, checker, predicate)) {
                    return true;
                }
            }
        }
        return false;
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

    public static isExplicitArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && this.isArrayTypeNode(typeNode);
    }

    public static isFunctionType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && ts.isFunctionTypeNode(typeNode);
    }

    public static isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        return this.forTypeOrAnySupertype(type, checker, t => this.isExplicitArrayType(t, checker));
    }

    public static isLuaIteratorCall(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isCallExpression(node) && node.parent && ts.isForOfStatement(node.parent)) {
            const type = checker.getTypeAtLocation(node.expression);
            return this.getCustomDecorators(type, checker)
                       .has(DecoratorKind.LuaIterator);
        } else {
            return false;
        }
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
            return decorators.has(DecoratorKind.TupleReturn)
                // Lua iterators are not 'true' tupleReturn functions as they actually return a function
                && !decorators.has(DecoratorKind.LuaIterator);
        } else {
            return false;
        }
    }

    public static getContainingFunctionReturnType(node: ts.Node, checker: ts.TypeChecker): ts.Type {
        const declaration = this.findFirstNodeAbove(node, ts.isFunctionLike);
        if (declaration) {
            const signature = checker.getSignatureFromDeclaration(declaration);
            return checker.getReturnTypeOfSignature(signature);
        }
        return undefined;
    }

    public static collectCustomDecorators(symbol: ts.Symbol, checker: ts.TypeChecker,
                                          decMap: Map<DecoratorKind, Decorator>): void {
        const comments = symbol.getDocumentationComment(checker);
        const decorators =
            comments.filter(comment => comment.kind === "text")
                    .map(comment => comment.text.split("\n"))
                    .reduce((a, b) => a.concat(b), [])
                    .map(line => line.trim())
                    .filter(comment => comment[0] === "!");

        decorators.forEach(decStr => {
            const [decoratorName, ...decoratorArguments] = decStr.split(" ");
            if (Decorator.isValid(decoratorName.substr(1))) {
                const dec = new Decorator(decoratorName.substr(1), decoratorArguments);
                decMap.set(dec.kind, dec);
                console.warn(`[Deprecated] Decorators with ! are being deprecated, `
                    + `use @${decStr.substr(1)} instead`);
            } else {
                console.warn(`Encountered unknown decorator ${decStr}.`);
            }
        });

        symbol.getJsDocTags().forEach(tag => {
            if (Decorator.isValid(tag.name)) {
                const dec = new Decorator(tag.name, tag.text ? tag.text.split(" ") : []);
                decMap.set(dec.kind, dec);
            }
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
        return undefined;
    }

    public static hasExplicitGetAccessor(type: ts.Type, name: ts.__String): boolean {
        if (type && type.symbol && type.symbol.members) {
            const field = type.symbol.members.get(name);
            return field && (field.flags & ts.SymbolFlags.GetAccessor) !== 0;
        }
    }

    public static hasGetAccessor(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isPropertyAccessExpression(node)) {
            const name = node.name.escapedText;
            const type = checker.getTypeAtLocation(node.expression);
            return this.forTypeOrAnySupertype(type, checker, t => this.hasExplicitGetAccessor(t, name));
        }
        return false;
    }

    public static hasExplicitSetAccessor(type: ts.Type, name: ts.__String): boolean {
        if (type && type.symbol && type.symbol.members) {
            const field = type.symbol.members.get(name);
            return field && (field.flags & ts.SymbolFlags.SetAccessor) !== 0;
        }
    }

    public static hasSetAccessor(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isPropertyAccessExpression(node)) {
            const name = node.name.escapedText;
            const type = checker.getTypeAtLocation(node.expression);
            return this.forTypeOrAnySupertype(type, checker, t => this.hasExplicitSetAccessor(t, name));
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

        return [false, undefined];
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
        return !(ts.isLiteralExpression(node) || ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword);
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
        return [false, undefined, undefined];
    }

    public static isDefaultArrayCallMethodName(methodName: string): boolean {
        return defaultArrayCallMethodNames.has(methodName);
    }

    public static getExplicitThisParameter(signatureDeclaration: ts.SignatureDeclaration): ts.ParameterDeclaration {
        return signatureDeclaration.parameters
            .find(param => ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword);
    }

    public static getSignatureDeclarations(signatures: ts.Signature[], checker: ts.TypeChecker)
        : ts.SignatureDeclaration[] {
        const signatureDeclarations: ts.SignatureDeclaration[] = [];
        for (const signature of signatures) {
            const signatureDeclaration = signature.getDeclaration();
            if ((ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration))
                && !this.getExplicitThisParameter(signatureDeclaration)) {
                // Function expressions: get signatures of type being assigned to, unless 'this' was explicit
                let declType: ts.Type;
                if (ts.isCallExpression(signatureDeclaration.parent)) {
                    // Function expression being passed as argument to another function
                    const i = signatureDeclaration.parent.arguments.indexOf(signatureDeclaration);
                    if (i >= 0) {
                        const parentSignature = checker.getResolvedSignature(signatureDeclaration.parent);
                        const parentSignatureDeclaration = parentSignature.getDeclaration();
                        declType = checker.getTypeAtLocation(parentSignatureDeclaration.parameters[i]);
                    }
                } else if (ts.isReturnStatement(signatureDeclaration.parent)) {
                    declType = this.getContainingFunctionReturnType(signatureDeclaration.parent, checker);
                } else {
                    // Function expression being assigned
                    declType = checker.getTypeAtLocation(signatureDeclaration.parent);
                }
                if (declType) {
                    const declSignatures = declType.getCallSignatures();
                    if (declSignatures.length > 0) {
                        declSignatures.map(s => s.getDeclaration()).forEach(decl => signatureDeclarations.push(decl));
                        continue;
                    }
                }
            }
            signatureDeclarations.push(signatureDeclaration);
        }
        return signatureDeclarations;
    }

    public static getDeclarationContextType(signatureDeclaration: ts.SignatureDeclaration,
                                            checker: ts.TypeChecker): ContextType {
        const thisParameter = this.getExplicitThisParameter(signatureDeclaration);
        if (thisParameter) {
            // Explicit 'this'
            return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
                ? ContextType.Void : ContextType.NonVoid;
        }
        if ((ts.isMethodDeclaration(signatureDeclaration) || ts.isMethodSignature(signatureDeclaration))
            && !(ts.getCombinedModifierFlags(signatureDeclaration) & ts.ModifierFlags.Static)) {
            // Non-static method
            return ContextType.NonVoid;
        }
        if ((ts.isPropertySignature(signatureDeclaration.parent)
             || ts.isPropertyDeclaration(signatureDeclaration.parent)
             || ts.isPropertyAssignment(signatureDeclaration.parent))
            && !(ts.getCombinedModifierFlags(signatureDeclaration.parent) & ts.ModifierFlags.Static)) {
            // Non-static lambda property
            return ContextType.NonVoid;
        }
        if (ts.isBinaryExpression(signatureDeclaration.parent)) {
            // Function expression: check type being assigned to
            return this.getFunctionContextType(checker.getTypeAtLocation(signatureDeclaration.parent.left), checker);
        }
        return ContextType.Void;
    }

    public static reduceContextTypes(contexts: ContextType[]): ContextType {
        const reducer = (a: ContextType, b: ContextType) => {
            if (a === ContextType.None) {
                return b;
            } else if (b === ContextType.None) {
                return a;
            } else if (a !== b) {
                return ContextType.Mixed;
            } else {
                return a;
            }
        };
        return contexts.reduce(reducer, ContextType.None);
    }

    public static getFunctionContextType(type: ts.Type, checker: ts.TypeChecker): ContextType {
        if (type.isTypeParameter()) {
            type = type.getConstraint() || type;
        }

        if (type.isUnion()) {
            return this.reduceContextTypes(type.types.map(t => this.getFunctionContextType(t, checker)));
        }

        const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
        if (signatures.length === 0) {
            return ContextType.None;
        }
        const signatureDeclarations = this.getSignatureDeclarations(signatures, checker);
        return this.reduceContextTypes(signatureDeclarations.map(s => this.getDeclarationContextType(s, checker)));
    }

    public static isDefaultArrayPropertyName(methodName: string): boolean {
        return defaultArrayPropertyNames.has(methodName);
    }
}
