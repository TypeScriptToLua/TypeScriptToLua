import * as ts from "typescript";
import { Decorator, DecoratorKind } from "./Decorator";
import * as tstl from "./LuaAST";

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
    "flat",
    "flatMap",
]);

export function getExtendedTypeNode(
    node: ts.ClassLikeDeclarationBase,
    checker: ts.TypeChecker
): ts.ExpressionWithTypeArguments | undefined {
    if (node && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                const superType = checker.getTypeAtLocation(clause.types[0]);
                const decorators = getCustomDecorators(superType, checker);
                if (!decorators.has(DecoratorKind.PureAbstract)) {
                    return clause.types[0];
                }
            }
        }
    }
    return undefined;
}

export function getExtendedType(node: ts.ClassLikeDeclarationBase, checker: ts.TypeChecker): ts.Type | undefined {
    const extendedTypeNode = getExtendedTypeNode(node, checker);
    return extendedTypeNode && checker.getTypeAtLocation(extendedTypeNode);
}

export function isFileModule(sourceFile: ts.SourceFile): boolean {
    return sourceFile.statements.some(isStatementExported);
}

export function isStatementExported(statement: ts.Statement): boolean {
    if (ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)) {
        return true;
    }
    if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.some(
            declaration => (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Export) !== 0
        );
    }
    return isDeclaration(statement) && (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0;
}

export function getExportedSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | undefined {
    const declarations = symbol.getDeclarations();
    if (declarations) {
        return declarations.find(d => (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0);
    }
    return undefined;
}

export function isDeclaration(node: ts.Node): node is ts.Declaration {
    return (
        ts.isEnumDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isNamespaceExportDeclaration(node)
    );
}

export function isInDestructingAssignment(node: ts.Node): boolean {
    return (
        node.parent &&
        ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
            (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)))
    );
}

// iterate over a type and its bases until the callback returns true.
export function forTypeOrAnySupertype(
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
            if (forTypeOrAnySupertype(superType, checker, predicate)) {
                return true;
            }
        }
    }
    return false;
}

export function isAmbientNode(node: ts.Declaration): boolean {
    return !((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) === 0);
}

export function isStaticNode(node: ts.Node): boolean {
    return node.modifiers !== undefined && node.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
}

export function isStringType(type: ts.Type): boolean {
    return (
        (type.flags & ts.TypeFlags.String) !== 0 ||
        (type.flags & ts.TypeFlags.StringLike) !== 0 ||
        (type.flags & ts.TypeFlags.StringLiteral) !== 0
    );
}

export function isNumberType(type: ts.Type): boolean {
    return (
        (type.flags & ts.TypeFlags.Number) !== 0 ||
        (type.flags & ts.TypeFlags.NumberLike) !== 0 ||
        (type.flags & ts.TypeFlags.NumberLiteral) !== 0
    );
}

export function isExplicitArrayType(type: ts.Type, checker: ts.TypeChecker, program: ts.Program): boolean {
    if (type.isUnionOrIntersection()) {
        return type.types.some(t => isExplicitArrayType(t, checker, program));
    }

    if (isStandardLibraryType(type, "ReadonlyArray", program)) {
        return true;
    }

    const flags = ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.AllowEmptyTuple;
    const typeNode = checker.typeToTypeNode(type, undefined, flags);
    return typeNode !== undefined && (ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode));
}

export function isFunctionType(type: ts.Type, checker: ts.TypeChecker): boolean {
    const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
    return typeNode !== undefined && ts.isFunctionTypeNode(typeNode);
}

export function isFunctionTypeAtLocation(node: ts.Node, checker: ts.TypeChecker): boolean {
    const type = checker.getTypeAtLocation(node);
    return isFunctionType(type, checker);
}

export function isArrayType(type: ts.Type, checker: ts.TypeChecker, program: ts.Program): boolean {
    return forTypeOrAnySupertype(type, checker, t => isExplicitArrayType(t, checker, program));
}

export function isLuaIteratorType(node: ts.Node, checker: ts.TypeChecker): boolean {
    const type = checker.getTypeAtLocation(node);
    return getCustomDecorators(type, checker).has(DecoratorKind.LuaIterator);
}

export function isRestParameter(node: ts.Node, checker: ts.TypeChecker): boolean {
    const symbol = checker.getSymbolAtLocation(node);
    if (!symbol) {
        return false;
    }
    const declarations = symbol.getDeclarations();
    if (!declarations) {
        return false;
    }
    return declarations.some(d => ts.isParameter(d) && d.dotDotDotToken !== undefined);
}

export function isVarArgType(node: ts.Node, checker: ts.TypeChecker): boolean {
    const type = checker.getTypeAtLocation(node);
    return type !== undefined && getCustomDecorators(type, checker).has(DecoratorKind.Vararg);
}

export function isForRangeType(node: ts.Node, checker: ts.TypeChecker): boolean {
    const type = checker.getTypeAtLocation(node);
    return getCustomDecorators(type, checker).has(DecoratorKind.ForRange);
}

export function isTupleReturnCall(node: ts.Node, checker: ts.TypeChecker): boolean {
    if (ts.isCallExpression(node)) {
        const signature = checker.getResolvedSignature(node);
        if (signature) {
            if (getCustomSignatureDirectives(signature, checker).has(DecoratorKind.TupleReturn)) {
                return true;
            }

            // Only check function type for directive if it is declared as an interface or type alias
            const declaration = signature.getDeclaration();
            const isInterfaceOrAlias =
                declaration &&
                declaration.parent &&
                ((ts.isInterfaceDeclaration(declaration.parent) && ts.isCallSignatureDeclaration(declaration)) ||
                    ts.isTypeAliasDeclaration(declaration.parent));
            if (!isInterfaceOrAlias) {
                return false;
            }
        }

        const type = checker.getTypeAtLocation(node.expression);
        return getCustomDecorators(type, checker).has(DecoratorKind.TupleReturn);
    } else {
        return false;
    }
}

export function isInTupleReturnFunction(node: ts.Node, checker: ts.TypeChecker): boolean {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (declaration) {
        let functionType: ts.Type | undefined;
        if (ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
            functionType = inferAssignedType(declaration, checker);
        } else if (ts.isMethodDeclaration(declaration) && ts.isObjectLiteralExpression(declaration.parent)) {
            // Manually lookup type for object literal properties declared with method syntax
            const interfaceType = inferAssignedType(declaration.parent, checker);
            const propertySymbol = interfaceType.getProperty(declaration.name.getText());
            if (propertySymbol) {
                functionType = checker.getTypeOfSymbolAtLocation(propertySymbol, declaration);
            }
        }
        if (functionType === undefined) {
            functionType = checker.getTypeAtLocation(declaration);
        }

        // Check all overloads for directive
        const signatures = functionType.getCallSignatures();
        if (
            signatures &&
            signatures.some(s => getCustomSignatureDirectives(s, checker).has(DecoratorKind.TupleReturn))
        ) {
            return true;
        }

        const decorators = getCustomDecorators(functionType, checker);
        return decorators.has(DecoratorKind.TupleReturn);
    } else {
        return false;
    }
}

export function getContainingFunctionReturnType(node: ts.Node, checker: ts.TypeChecker): ts.Type | undefined {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (declaration) {
        const signature = checker.getSignatureFromDeclaration(declaration);
        return signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature);
    }
    return undefined;
}

export function collectCustomDecorators(
    source: ts.Symbol | ts.Signature,
    checker: ts.TypeChecker,
    decMap: Map<DecoratorKind, Decorator>
): void {
    const comments = source.getDocumentationComment(checker);
    const decorators = comments
        .filter(comment => comment.kind === "text")
        .map(comment => comment.text.split("\n"))
        .reduce((a, b) => a.concat(b), [])
        .map(line => line.trim())
        .filter(comment => comment[0] === "!");

    decorators.forEach(decStr => {
        const [decoratorName, ...decoratorArguments] = decStr.split(" ");
        if (Decorator.isValid(decoratorName.substr(1))) {
            const dec = new Decorator(decoratorName.substr(1), decoratorArguments);
            decMap.set(dec.kind, dec);
            console.warn(`[Deprecated] Decorators with ! are being deprecated, ` + `use @${decStr.substr(1)} instead`);
        } else {
            console.warn(`Encountered unknown decorator ${decStr}.`);
        }
    });
    source.getJsDocTags().forEach(tag => {
        if (Decorator.isValid(tag.name)) {
            const dec = new Decorator(tag.name, tag.text ? tag.text.split(" ") : []);
            decMap.set(dec.kind, dec);
        }
    });
}

export function getCustomDecorators(type: ts.Type, checker: ts.TypeChecker): Map<DecoratorKind, Decorator> {
    const decMap = new Map<DecoratorKind, Decorator>();
    if (type.symbol) {
        collectCustomDecorators(type.symbol, checker, decMap);
    }
    if (type.aliasSymbol) {
        collectCustomDecorators(type.aliasSymbol, checker, decMap);
    }
    return decMap;
}

export function getCustomFileDirectives(file: ts.SourceFile): Map<DecoratorKind, Decorator> {
    const decMap = new Map<DecoratorKind, Decorator>();
    if (file.statements.length > 0) {
        const tags = ts.getJSDocTags(file.statements[0]);
        for (const tag of tags) {
            const tagName = tag.tagName.escapedText as string;
            if (Decorator.isValid(tagName)) {
                const dec = new Decorator(tagName, tag.comment ? tag.comment.split(" ") : []);
                decMap.set(dec.kind, dec);
            }
        }
    }
    return decMap;
}

export function getCustomSignatureDirectives(
    signature: ts.Signature,
    checker: ts.TypeChecker
): Map<DecoratorKind, Decorator> {
    const directivesMap = new Map<DecoratorKind, Decorator>();
    collectCustomDecorators(signature, checker, directivesMap);

    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration && declaration.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            collectCustomDecorators(symbol, checker, directivesMap);
        }
    }

    return directivesMap;
}

// Search up until finding a node satisfying the callback
export function findFirstNodeAbove<T extends ts.Node>(node: ts.Node, callback: (n: ts.Node) => n is T): T | undefined {
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

export function isBinaryAssignmentToken(token: ts.SyntaxKind): [true, ts.BinaryOperator] | [false, undefined] {
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

// Returns true for expressions that may have effects when evaluated
export function isExpressionWithEvaluationEffect(node: ts.Expression): boolean {
    return !(ts.isLiteralExpression(node) || ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword);
}

// If expression is property/element access with possible effects from being evaluated, returns true along with the
// separated object and index expressions.
export function isAccessExpressionWithEvaluationEffects(
    node: ts.Expression,
    checker: ts.TypeChecker,
    program: ts.Program
): [true, ts.Expression, ts.Expression] | [false, undefined, undefined] {
    if (
        ts.isElementAccessExpression(node) &&
        (isExpressionWithEvaluationEffect(node.expression) || isExpressionWithEvaluationEffect(node.argumentExpression))
    ) {
        const type = checker.getTypeAtLocation(node.expression);
        if (isArrayType(type, checker, program)) {
            // Offset arrays by one
            const oneLit = ts.createNumericLiteral("1");
            const exp = ts.createParen(node.argumentExpression);
            const addExp = ts.createBinary(exp, ts.SyntaxKind.PlusToken, oneLit);
            return [true, node.expression, addExp];
        } else {
            return [true, node.expression, node.argumentExpression];
        }
    } else if (ts.isPropertyAccessExpression(node) && isExpressionWithEvaluationEffect(node.expression)) {
        return [true, node.expression, ts.createStringLiteral(node.name.text)];
    }
    return [false, undefined, undefined];
}

export function isDefaultArrayCallMethodName(methodName: string): boolean {
    return defaultArrayCallMethodNames.has(methodName);
}

export function getExplicitThisParameter(
    signatureDeclaration: ts.SignatureDeclaration
): ts.ParameterDeclaration | undefined {
    return signatureDeclaration.parameters.find(
        param => ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword
    );
}

export function findInClassOrAncestor(
    classDeclaration: ts.ClassLikeDeclarationBase,
    callback: (classDeclaration: ts.ClassLikeDeclarationBase) => boolean,
    checker: ts.TypeChecker
): ts.ClassLikeDeclarationBase | undefined {
    if (callback(classDeclaration)) {
        return classDeclaration;
    }

    const extendsType = getExtendedType(classDeclaration, checker);
    if (!extendsType) {
        return undefined;
    }

    const symbol = extendsType.getSymbol();
    if (symbol === undefined) {
        return undefined;
    }

    const symbolDeclarations = symbol.getDeclarations();
    if (symbolDeclarations === undefined) {
        return undefined;
    }

    const declaration = symbolDeclarations.find(ts.isClassLike);
    if (!declaration) {
        return undefined;
    }

    return findInClassOrAncestor(declaration, callback, checker);
}

export function hasSetAccessorInClassOrAncestor(
    classDeclaration: ts.ClassLikeDeclarationBase,
    isStatic: boolean,
    checker: ts.TypeChecker
): boolean {
    return (
        findInClassOrAncestor(
            classDeclaration,
            c => c.members.some(m => ts.isSetAccessor(m) && isStaticNode(m) === isStatic),
            checker
        ) !== undefined
    );
}

export function hasGetAccessorInClassOrAncestor(
    classDeclaration: ts.ClassLikeDeclarationBase,
    isStatic: boolean,
    checker: ts.TypeChecker
): boolean {
    return (
        findInClassOrAncestor(
            classDeclaration,
            c => c.members.some(m => ts.isGetAccessor(m) && isStaticNode(m) === isStatic),
            checker
        ) !== undefined
    );
}

export function getPropertyName(propertyName: ts.PropertyName): string | number | undefined {
    if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName) || ts.isNumericLiteral(propertyName)) {
        return propertyName.text;
    } else {
        return undefined; // TODO: how to handle computed property names?
    }
}

export function isSamePropertyName(a: ts.PropertyName, b: ts.PropertyName): boolean {
    const aName = getPropertyName(a);
    const bName = getPropertyName(b);
    return aName !== undefined && aName === bName;
}

export function isGetAccessorOverride(
    element: ts.ClassElement,
    classDeclaration: ts.ClassLikeDeclarationBase,
    checker: ts.TypeChecker
): element is ts.GetAccessorDeclaration {
    if (!ts.isGetAccessor(element) || isStaticNode(element)) {
        return false;
    }

    const hasInitializedField = (e: ts.ClassElement) =>
        ts.isPropertyDeclaration(e) && e.initializer !== undefined && isSamePropertyName(e.name, element.name);

    return findInClassOrAncestor(classDeclaration, c => c.members.some(hasInitializedField), checker) !== undefined;
}

export function inferAssignedType(expression: ts.Expression, checker: ts.TypeChecker): ts.Type {
    return checker.getContextualType(expression) || checker.getTypeAtLocation(expression);
}

export function getAllCallSignatures(type: ts.Type): ReadonlyArray<ts.Signature> {
    if (type.isUnion()) {
        return type.types.map(t => getAllCallSignatures(t)).reduce((a, b) => a.concat(b));
    }
    return type.getCallSignatures();
}

export function getSignatureDeclarations(
    signatures: readonly ts.Signature[],
    checker: ts.TypeChecker
): ts.SignatureDeclaration[] {
    const signatureDeclarations: ts.SignatureDeclaration[] = [];
    for (const signature of signatures) {
        const signatureDeclaration = signature.getDeclaration();
        if (
            (ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration)) &&
            !getExplicitThisParameter(signatureDeclaration)
        ) {
            // Infer type of function expressions/arrow functions
            const inferredType = inferAssignedType(signatureDeclaration, checker);
            if (inferredType) {
                const inferredSignatures = getAllCallSignatures(inferredType);
                if (inferredSignatures.length > 0) {
                    signatureDeclarations.push(...inferredSignatures.map(s => s.getDeclaration()));
                    continue;
                }
            }
        }
        signatureDeclarations.push(signatureDeclaration);
    }
    return signatureDeclarations;
}

export function hasNoSelfAncestor(declaration: ts.Declaration, checker: ts.TypeChecker): boolean {
    const scopeDeclaration = findFirstNodeAbove(
        declaration,
        (n): n is ts.SourceFile | ts.ModuleDeclaration => ts.isSourceFile(n) || ts.isModuleDeclaration(n)
    );
    if (!scopeDeclaration) {
        return false;
    }
    if (ts.isSourceFile(scopeDeclaration)) {
        return getCustomFileDirectives(scopeDeclaration).has(DecoratorKind.NoSelfInFile);
    }
    const scopeType = checker.getTypeAtLocation(scopeDeclaration);
    if (scopeType && getCustomDecorators(scopeType, checker).has(DecoratorKind.NoSelf)) {
        return true;
    }
    return hasNoSelfAncestor(scopeDeclaration, checker);
}

export function getDeclarationContextType(
    signatureDeclaration: ts.SignatureDeclaration,
    checker: ts.TypeChecker
): ContextType {
    const thisParameter = getExplicitThisParameter(signatureDeclaration);
    if (thisParameter) {
        // Explicit 'this'
        return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
            ? ContextType.Void
            : ContextType.NonVoid;
    }

    if (
        ts.isMethodSignature(signatureDeclaration) ||
        ts.isMethodDeclaration(signatureDeclaration) ||
        ts.isConstructSignatureDeclaration(signatureDeclaration) ||
        ts.isConstructorDeclaration(signatureDeclaration) ||
        (signatureDeclaration.parent && ts.isPropertyDeclaration(signatureDeclaration.parent)) ||
        (signatureDeclaration.parent && ts.isPropertySignature(signatureDeclaration.parent))
    ) {
        // Class/interface methods only respect @noSelf on their parent
        const scopeDeclaration = findFirstNodeAbove(
            signatureDeclaration,
            (n): n is ts.ClassLikeDeclaration | ts.InterfaceDeclaration =>
                ts.isClassDeclaration(n) || ts.isClassExpression(n) || ts.isInterfaceDeclaration(n)
        );

        if (scopeDeclaration === undefined) {
            return ContextType.NonVoid;
        }

        const scopeType = checker.getTypeAtLocation(scopeDeclaration);
        if (scopeType && getCustomDecorators(scopeType, checker).has(DecoratorKind.NoSelf)) {
            return ContextType.Void;
        }
        return ContextType.NonVoid;
    }

    // Walk up to find @noSelf or @noSelfOnFile
    if (hasNoSelfAncestor(signatureDeclaration, checker)) {
        return ContextType.Void;
    }

    return ContextType.NonVoid;
}

export function reduceContextTypes(contexts: ContextType[]): ContextType {
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

export function getFunctionContextType(type: ts.Type, checker: ts.TypeChecker): ContextType {
    if (type.isTypeParameter()) {
        type = type.getConstraint() || type;
    }

    if (type.isUnion()) {
        return reduceContextTypes(type.types.map(t => getFunctionContextType(t, checker)));
    }

    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length === 0) {
        return ContextType.None;
    }
    const signatureDeclarations = getSignatureDeclarations(signatures, checker);
    return reduceContextTypes(signatureDeclarations.map(s => getDeclarationContextType(s, checker)));
}

export function escapeString(text: string): string {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
    const escapeSequences: Array<[RegExp, string]> = [
        [/[\\]/g, "\\\\"],
        [/[\']/g, "\\'"],
        [/[\"]/g, '\\"'],
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

export function isValidLuaIdentifier(str: string): boolean {
    const match = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
    return match !== undefined && match !== null && match[0] === str;
}

export function fixInvalidLuaIdentifier(name: string): string {
    return name.replace(
        /[^a-zA-Z0-9_]/g,
        c =>
            `_${c
                .charCodeAt(0)
                .toString(16)
                .toUpperCase()}`
    );
}

// Checks that a name is valid for use in lua function declaration syntax:
// 'foo.bar' => passes ('function foo.bar()' is valid)
// 'getFoo().bar' => fails ('function getFoo().bar()' would be illegal)
export function isValidLuaFunctionDeclarationName(str: string): boolean {
    const match = str.match(/[a-zA-Z0-9_\.]+/);
    return match !== undefined && match !== null && match[0] === str;
}

export function isFalsible(type: ts.Type, strictNullChecks: boolean): boolean {
    const falsibleFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any;

    if (type.flags & falsibleFlags) {
        return true;
    } else if (!strictNullChecks && !type.isLiteral()) {
        return true;
    } else if (type.isUnion()) {
        for (const subType of type.types) {
            if (isFalsible(subType, strictNullChecks)) {
                return true;
            }
        }
    }

    return false;
}

export function getFirstDeclaration(symbol: ts.Symbol, sourceFile?: ts.SourceFile): ts.Declaration | undefined {
    let declarations = symbol.getDeclarations();
    if (!declarations) {
        return undefined;
    }
    if (sourceFile) {
        declarations = declarations.filter(d => findFirstNodeAbove(d, ts.isSourceFile) === sourceFile);
    }
    return declarations.length > 0 ? declarations.reduce((p, c) => (p.pos < c.pos ? p : c)) : undefined;
}

export function isFirstDeclaration(node: ts.VariableDeclaration, checker: ts.TypeChecker): boolean {
    const symbol = checker.getSymbolAtLocation(node.name);
    if (!symbol) {
        return false;
    }
    const firstDeclaration = getFirstDeclaration(symbol);
    return firstDeclaration === node;
}

export function isStandardLibraryDeclaration(declaration: ts.Declaration, program: ts.Program): boolean {
    const source = declaration.getSourceFile();
    if (!source) {
        return false;
    }
    return program.isSourceFileDefaultLibrary(source);
}

export function isStandardLibraryType(type: ts.Type, name: string | undefined, program: ts.Program): boolean {
    const symbol = type.getSymbol();
    if (!symbol || (name ? symbol.escapedName !== name : symbol.escapedName === "__type")) {
        return false;
    }

    const declaration = symbol.valueDeclaration;
    if (!declaration) {
        return true;
    }

    // assume to be lib function if no valueDeclaration exists
    return isStandardLibraryDeclaration(declaration, program);
}

export function isEnumMember(
    enumDeclaration: ts.EnumDeclaration,
    value: ts.Expression
): [true, ts.PropertyName] | [false, undefined] {
    if (ts.isIdentifier(value)) {
        const enumMember = enumDeclaration.members.find(m => ts.isIdentifier(m.name) && m.name.text === value.text);
        if (enumMember !== undefined) {
            if (enumMember.initializer && ts.isIdentifier(enumMember.initializer)) {
                return isEnumMember(enumDeclaration, enumMember.initializer);
            } else {
                return [true, enumMember.name];
            }
        } else {
            return [false, undefined];
        }
    } else {
        return [false, undefined];
    }
}

export function isWithinLiteralAssignmentStatement(node: ts.Node): boolean {
    if (!node.parent) {
        return false;
    }
    if (ts.isArrayLiteralExpression(node.parent) || ts.isObjectLiteralExpression(node.parent)) {
        return isWithinLiteralAssignmentStatement(node.parent);
    } else if (ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return true;
    } else {
        return false;
    }
}

export function moduleHasEmittedBody(
    statement: ts.ModuleDeclaration
): statement is ts.ModuleDeclaration & { body: ts.ModuleBlock | ts.ModuleDeclaration } {
    if (statement.body) {
        if (ts.isModuleBlock(statement.body)) {
            // Ignore if body has no emitted statements
            return (
                statement.body.statements.findIndex(
                    s => !ts.isInterfaceDeclaration(s) && !ts.isTypeAliasDeclaration(s)
                ) !== -1
            );
        } else if (ts.isModuleDeclaration(statement.body)) {
            return true;
        }
    }
    return false;
}

export function isArrayLengthAssignment(
    expression: ts.BinaryExpression,
    checker: ts.TypeChecker,
    program: ts.Program
): expression is ts.BinaryExpression & { left: ts.PropertyAccessExpression | ts.ElementAccessExpression } {
    if (expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return false;
    }

    if (!ts.isPropertyAccessExpression(expression.left) && !ts.isElementAccessExpression(expression.left)) {
        return false;
    }

    const type = checker.getTypeAtLocation(expression.left.expression);
    if (!isArrayType(type, checker, program)) {
        return false;
    }

    const name = ts.isPropertyAccessExpression(expression.left)
        ? (expression.left.name.escapedText as string)
        : ts.isStringLiteral(expression.left.argumentExpression) && expression.left.argumentExpression.text;

    return name === "length";
}

// Returns true if expression contains no function calls
export function isSimpleExpression(expression: tstl.Expression): boolean {
    switch (expression.kind) {
        case tstl.SyntaxKind.CallExpression:
        case tstl.SyntaxKind.MethodCallExpression:
        case tstl.SyntaxKind.FunctionExpression:
            return false;

        case tstl.SyntaxKind.TableExpression:
            const tableExpression = expression as tstl.TableExpression;
            return !tableExpression.fields || tableExpression.fields.every(e => isSimpleExpression(e));

        case tstl.SyntaxKind.TableFieldExpression:
            const fieldExpression = expression as tstl.TableFieldExpression;
            return (
                (!fieldExpression.key || isSimpleExpression(fieldExpression.key)) &&
                isSimpleExpression(fieldExpression.value)
            );

        case tstl.SyntaxKind.TableIndexExpression:
            const indexExpression = expression as tstl.TableIndexExpression;
            return isSimpleExpression(indexExpression.table) && isSimpleExpression(indexExpression.index);

        case tstl.SyntaxKind.UnaryExpression:
            return isSimpleExpression((expression as tstl.UnaryExpression).operand);

        case tstl.SyntaxKind.BinaryExpression:
            const binaryExpression = expression as tstl.BinaryExpression;
            return isSimpleExpression(binaryExpression.left) && isSimpleExpression(binaryExpression.right);

        case tstl.SyntaxKind.ParenthesizedExpression:
            return isSimpleExpression((expression as tstl.ParenthesizedExpression).innerExpression);
    }
    return true;
}
