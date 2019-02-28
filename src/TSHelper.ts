import * as ts from "typescript";

import {Decorator, DecoratorKind} from "./Decorator";
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

    public static getExtendedTypeNode(node: ts.ClassLikeDeclarationBase, checker: ts.TypeChecker):
    ts.ExpressionWithTypeArguments | undefined {
        if (node && node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    const superType = checker.getTypeAtLocation(clause.types[0]);
                    const decorators = TSHelper.getCustomDecorators(superType, checker);
                    if (!decorators.has(DecoratorKind.PureAbstract)) {
                        return clause.types[0];
                    }
                }
            }
        }
        return undefined;
    }

    public static getExtendedType(node: ts.ClassLikeDeclarationBase, checker: ts.TypeChecker): ts.Type | undefined {
        const extendedTypeNode = TSHelper.getExtendedTypeNode(node, checker);
        return extendedTypeNode && checker.getTypeAtLocation(extendedTypeNode);
    }

    public static isFileModule(sourceFile: ts.SourceFile): boolean {
        if (sourceFile) {
            return sourceFile.statements.some(TSHelper.isStatementExported);
        }
        return false;
    }

    public static isStatementExported(statement: ts.Statement): boolean {
        if (ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)) {
            return true;
        }
        if (ts.isVariableStatement(statement)) {
            return statement.declarationList.declarations.some(
                declaration => (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Export) !== 0);
        }
        return TSHelper.isDeclaration(statement)
                && ((ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0);
    }

    public static isDeclaration(node: ts.Node): node is ts.Declaration {
        return ts.isEnumDeclaration(node) || ts.isClassDeclaration(node) || ts.isExportDeclaration(node)
            || ts.isImportDeclaration(node) || ts.isMethodDeclaration(node) || ts.isModuleDeclaration(node)
            || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node) || ts.isInterfaceDeclaration(node)
            || ts.isTypeAliasDeclaration(node) || ts.isNamespaceExportDeclaration(node);
    }

    public static isInDestructingAssignment(node: ts.Node): boolean {
        return node.parent && ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
                               (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left)));
    }

    // iterate over a type and its bases until the callback returns true.
    public static forTypeOrAnySupertype(
        type: ts.Type,
        checker: ts.TypeChecker,
        predicate: (type: ts.Type) => boolean
    ): boolean
    {
        if (predicate(type)) {
            return true;
        }
        if (!type.isClassOrInterface() && type.symbol) {
            type = checker.getDeclaredTypeOfSymbol(type.symbol);
        }
        const superTypes = type.getBaseTypes();
        if (superTypes) {
            for (const superType of superTypes) {
                if (TSHelper.forTypeOrAnySupertype(superType, checker, predicate)) {
                    return true;
                }
            }
        }
        return false;
    }

    public static isStatic(node: ts.Node): boolean {
        return node.modifiers !== undefined && node.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
    }

    public static isStringType(type: ts.Type): boolean {
        return (type.flags & ts.TypeFlags.String) !== 0 || (type.flags & ts.TypeFlags.StringLike) !== 0 ||
               (type.flags & ts.TypeFlags.StringLiteral) !== 0;
    }

    public static isArrayTypeNode(typeNode: ts.TypeNode): boolean {
        return typeNode.kind === ts.SyntaxKind.ArrayType || typeNode.kind === ts.SyntaxKind.TupleType ||
               ((typeNode.kind === ts.SyntaxKind.UnionType || typeNode.kind === ts.SyntaxKind.IntersectionType) &&
                (typeNode as ts.UnionOrIntersectionTypeNode).types.some(TSHelper.isArrayTypeNode));
    }

    public static isExplicitArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && TSHelper.isArrayTypeNode(typeNode);
    }

    public static isFunctionType(type: ts.Type, checker: ts.TypeChecker): boolean {
        const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
        return typeNode && ts.isFunctionTypeNode(typeNode);
    }

    public static isFunctionTypeAtLocation(node: ts.Node, checker: ts.TypeChecker): boolean {
        const type = checker.getTypeAtLocation(node);
        return TSHelper.isFunctionType(type, checker);
    }

    public static isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
        return TSHelper.forTypeOrAnySupertype(type, checker, t => TSHelper.isExplicitArrayType(t, checker));
    }

    public static isLuaIteratorType(node: ts.Node, checker: ts.TypeChecker): boolean {
        const type = checker.getTypeAtLocation(node);
        return TSHelper.getCustomDecorators(type, checker).has(DecoratorKind.LuaIterator);
    }

    public static isTupleReturnCall(node: ts.Node, checker: ts.TypeChecker): boolean {
        if (ts.isCallExpression(node)) {
            const type = checker.getTypeAtLocation(node.expression);

            return TSHelper.getCustomDecorators(type, checker).has(DecoratorKind.TupleReturn);
        } else {
            return false;
        }
    }

    public static isInTupleReturnFunction(node: ts.Node, checker: ts.TypeChecker): boolean {
        const declaration = TSHelper.findFirstNodeAbove(node, ts.isFunctionLike);
        if (declaration) {
            let functionType: ts.Type;
            if (ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
                functionType = TSHelper.inferAssignedType(declaration, checker);
            } else {
                functionType = checker.getTypeAtLocation(declaration);
            }
            const decorators = TSHelper.getCustomDecorators(functionType, checker);
            return decorators.has(DecoratorKind.TupleReturn);
        } else {
            return false;
        }
    }

    public static getContainingFunctionReturnType(node: ts.Node, checker: ts.TypeChecker): ts.Type {
        const declaration = TSHelper.findFirstNodeAbove(node, ts.isFunctionLike);
        if (declaration) {
            const signature = checker.getSignatureFromDeclaration(declaration);
            return checker.getReturnTypeOfSignature(signature);
        }
        return undefined;
    }

    public static collectCustomDecorators(
        symbol: ts.Symbol,
        checker: ts.TypeChecker,
        decMap: Map<DecoratorKind, Decorator>
    ): void
    {
        const comments = symbol.getDocumentationComment(checker);
        const decorators = comments.filter(comment => comment.kind === "text")
                               .map(comment => comment.text.split("\n"))
                               .reduce((a, b) => a.concat(b), [])
                               .map(line => line.trim())
                               .filter(comment => comment[0] === "!");

        decorators.forEach(decStr => {
            const [decoratorName, ...decoratorArguments] = decStr.split(" ");
            if (Decorator.isValid(decoratorName.substr(1))) {
                const dec = new Decorator(decoratorName.substr(1), decoratorArguments);
                decMap.set(dec.kind, dec);
                console.warn(
                    `[Deprecated] Decorators with ! are being deprecated, ` +
                    `use @${decStr.substr(1)} instead`);
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
            TSHelper.collectCustomDecorators(type.symbol, checker, decMap);
        }
        if (type.aliasSymbol) {
            TSHelper.collectCustomDecorators(type.aliasSymbol, checker, decMap);
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

    public static isBinaryAssignmentToken(token: ts.SyntaxKind): [boolean, tstl.BinaryOperator] {
        switch (token) {
            case ts.SyntaxKind.BarEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseOrOperator];
            case ts.SyntaxKind.PlusEqualsToken:
                return [true, tstl.SyntaxKind.AdditionOperator];
            case ts.SyntaxKind.CaretEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseExclusiveOrOperator];
            case ts.SyntaxKind.MinusEqualsToken:
                return [true, tstl.SyntaxKind.SubractionOperator];
            case ts.SyntaxKind.SlashEqualsToken:
                return [true, tstl.SyntaxKind.DivisionOperator];
            case ts.SyntaxKind.PercentEqualsToken:
                return [true, tstl.SyntaxKind.ModuloOperator];
            case ts.SyntaxKind.AsteriskEqualsToken:
                return [true, tstl.SyntaxKind.MultiplicationOperator];
            case ts.SyntaxKind.AmpersandEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseAndOperator];
            case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
                return [true, tstl.SyntaxKind.PowerOperator];
            case ts.SyntaxKind.LessThanLessThanEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseLeftShiftOperator];
            case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseRightShiftOperator];
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                return [true, tstl.SyntaxKind.BitwiseArithmeticRightShift];
        }

        return [false, undefined];
    }

    public static isExpressionStatement(node: ts.Expression): boolean {
        return node.parent === undefined || ts.isExpressionStatement(node.parent) || ts.isForStatement(node.parent);
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
        if (ts.isElementAccessExpression(node) &&
            (TSHelper.isExpressionWithEvaluationEffect(node.expression)
            || TSHelper.isExpressionWithEvaluationEffect(node.argumentExpression))) {
            const type = checker.getTypeAtLocation(node.expression);
            if (TSHelper.isArrayType(type, checker)) {
                // Offset arrays by one
                const oneLit = ts.createNumericLiteral("1");
                const exp = ts.createParen(node.argumentExpression);
                const addExp = ts.createBinary(exp, ts.SyntaxKind.PlusToken, oneLit);
                return [true, node.expression, addExp];
            } else {
                return [true, node.expression, node.argumentExpression];
            }
        } else if (ts.isPropertyAccessExpression(node) && TSHelper.isExpressionWithEvaluationEffect(node.expression)) {
            return [true, node.expression, ts.createStringLiteral(node.name.text)];
        }
        return [false, undefined, undefined];
    }

    public static isDefaultArrayCallMethodName(methodName: string): boolean {
        return defaultArrayCallMethodNames.has(methodName);
    }

    public static getExplicitThisParameter(signatureDeclaration: ts.SignatureDeclaration): ts.ParameterDeclaration {
        return signatureDeclaration.parameters.find(
            param => ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword);
    }

    public static findInClassOrAncestor(
        classDeclaration: ts.ClassLikeDeclarationBase,
        callback: (classDeclaration: ts.ClassLikeDeclarationBase) => boolean,
        checker: ts.TypeChecker
    ): ts.ClassLikeDeclarationBase
    {
        if (callback(classDeclaration)) {
            return classDeclaration;
        }

        const extendsType = TSHelper.getExtendedType(classDeclaration, checker);
        if (!extendsType) {
            return undefined;
        }

        const symbol = extendsType.getSymbol();
        const declaration = symbol.getDeclarations().find(ts.isClassLike);
        if (!declaration) {
            return undefined;
        }

        return TSHelper.findInClassOrAncestor(declaration, callback, checker);
    }

    public static hasSetAccessorInClassOrAncestor(
        classDeclaration: ts.ClassLikeDeclarationBase,
        isStatic: boolean,
        checker: ts.TypeChecker
    ): boolean
    {
        return TSHelper.findInClassOrAncestor(
            classDeclaration,
            c => c.members.some(m => ts.isSetAccessor(m) && TSHelper.isStatic(m) === isStatic),
            checker
        ) !== undefined;
    }

    public static hasGetAccessorInClassOrAncestor(
        classDeclaration: ts.ClassLikeDeclarationBase,
        isStatic: boolean,
        checker: ts.TypeChecker
    ): boolean
    {
        return TSHelper.findInClassOrAncestor(
            classDeclaration,
            c => c.members.some(m => ts.isGetAccessor(m) && TSHelper.isStatic(m) === isStatic),
            checker
        ) !== undefined;
    }

    public static getPropertyName(propertyName: ts.PropertyName): string | number | undefined {
        if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName) || ts.isNumericLiteral(propertyName)) {
            return propertyName.text;
        } else {
            return undefined; // TODO: how to handle computed property names?
        }
    }

    public static isSamePropertyName(a: ts.PropertyName, b: ts.PropertyName): boolean {
        const aName = TSHelper.getPropertyName(a);
        const bName = TSHelper.getPropertyName(b);
        return aName !== undefined && aName === bName;
    }

    public static isGetAccessorOverride(
        element: ts.ClassElement,
        classDeclaration: ts.ClassLikeDeclarationBase,
        checker: ts.TypeChecker
    ): element is ts.GetAccessorDeclaration
    {
        if (!ts.isGetAccessor(element) || TSHelper.isStatic(element)) {
            return false;
        }

        const hasInitializedField = (e: ts.ClassElement) =>
            ts.isPropertyDeclaration(e)
            && e.initializer
            && TSHelper.isSamePropertyName(e.name, element.name);

        return TSHelper.findInClassOrAncestor(
            classDeclaration,
            c => c.members.some(hasInitializedField),
            checker
        ) !== undefined;
    }

    public static inferAssignedType(expression: ts.Expression, checker: ts.TypeChecker): ts.Type {
        if (ts.isParenthesizedExpression(expression.parent)) {
            // Ignore expressions wrapped in parenthesis
            return this.inferAssignedType(expression.parent, checker);

        } else if (ts.isCallExpression(expression.parent)) {
            // Expression being passed as argument to a function
            const argumentIndex = expression.parent.arguments.indexOf(expression);
            if (argumentIndex >= 0) {
                const parentSignature = checker.getResolvedSignature(expression.parent);
                if (parentSignature.parameters.length > 0) { // In case function type is 'any'
                    const signatureIndex = Math.min(argumentIndex, parentSignature.parameters.length - 1);
                    let parameterType = checker.getTypeOfSymbolAtLocation(
                        parentSignature.parameters[signatureIndex],
                        expression
                    );
                    if (TSHelper.isArrayType(parameterType, checker)) {
                        // Check for elipses argument
                        const parentSignatureDeclaration = parentSignature.getDeclaration();
                        if (parentSignatureDeclaration) {
                            let declarationIndex = signatureIndex;
                            if (this.getExplicitThisParameter(parentSignatureDeclaration)) {
                                // Ignore 'this' parameter
                                ++declarationIndex;
                            }
                            const parameterDeclaration = parentSignatureDeclaration.parameters[declarationIndex];
                            if ((parameterType.flags & ts.TypeFlags.Object) !== 0
                                && ((parameterType as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
                                && parameterDeclaration.dotDotDotToken)
                            {
                                // Determine type from elipsis array/tuple type
                                const parameterTypeReference = (parameterType as ts.TypeReference);
                                parameterType = parameterTypeReference.typeArguments[argumentIndex - declarationIndex];
                            }
                        }
                    }
                    return parameterType;
                }
            }

        } else if (ts.isReturnStatement(expression.parent)) {
            // Expression being returned from a function
            return this.getContainingFunctionReturnType(expression.parent, checker);

        } else if (ts.isPropertyDeclaration(expression.parent)) {
            // Expression being assigned to a class property
            return checker.getTypeAtLocation(expression.parent);

        } else if (ts.isPropertyAssignment(expression.parent)) {
            // Expression being assigned to an object literal property
            const objType = this.inferAssignedType(expression.parent.parent, checker);
            const property = objType.getProperty(expression.parent.name.getText());
            if (!property) {
                return objType.getStringIndexType();
            } else {
                return checker.getTypeAtLocation(property.valueDeclaration);
            }

        } else if (ts.isArrayLiteralExpression(expression.parent)) {
            // Expression in an array literal
            const arrayType = this.inferAssignedType(expression.parent, checker);
            if (ts.isTupleTypeNode(checker.typeToTypeNode(arrayType))) {
                // Tuples
                const i = expression.parent.elements.indexOf(expression);
                const elementType = (arrayType as ts.TypeReference).typeArguments[i];
                return elementType;
            } else {
                // Standard arrays
                return arrayType.getNumberIndexType();
            }

        } else if (ts.isVariableDeclaration(expression.parent)) {
            // Expression assigned to declaration
            return checker.getTypeAtLocation(expression.parent.name);

        } else if (ts.isBinaryExpression(expression.parent)
            && expression.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken)
        {
            // Expression assigned to variable
            return checker.getTypeAtLocation(expression.parent.left);
        }

        return checker.getTypeAtLocation(expression);
    }

    public static getSignatureDeclarations(
        signatures: ReadonlyArray<ts.Signature>,
        checker: ts.TypeChecker
    ): ts.SignatureDeclaration[]
    {
        const signatureDeclarations: ts.SignatureDeclaration[] = [];
        for (const signature of signatures) {
            const signatureDeclaration = signature.getDeclaration();
            if ((ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration))
                && !TSHelper.getExplicitThisParameter(signatureDeclaration))
            {
                // Infer type of function expressions/arrow functions
                const inferredType = TSHelper.inferAssignedType(signatureDeclaration, checker);
                if (inferredType) {
                    const inferredSignatures = inferredType.getCallSignatures();
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

    public static getDeclarationContextType(
        signatureDeclaration: ts.SignatureDeclaration,
        checker: ts.TypeChecker
    ): ContextType
    {
        const thisParameter = TSHelper.getExplicitThisParameter(signatureDeclaration);
        if (thisParameter) {
            // Explicit 'this'
            return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
                ? ContextType.Void
                : ContextType.NonVoid;
        }
        if (ts.isMethodDeclaration(signatureDeclaration) || ts.isMethodSignature(signatureDeclaration)) {
            // Method
            return ContextType.NonVoid;
        }
        if (ts.isPropertySignature(signatureDeclaration.parent)
            || ts.isPropertyDeclaration(signatureDeclaration.parent)
            || ts.isPropertyAssignment(signatureDeclaration.parent)) {
            // Lambda property
            return ContextType.NonVoid;
        }
        if (ts.isBinaryExpression(signatureDeclaration.parent)) {
            // Function expression: check type being assigned to
            return TSHelper.getFunctionContextType(
                checker.getTypeAtLocation(signatureDeclaration.parent.left), checker);
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
            return TSHelper.reduceContextTypes(type.types.map(t => TSHelper.getFunctionContextType(t, checker)));
        }

        const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
        if (signatures.length === 0) {
            return ContextType.None;
        }
        const signatureDeclarations = TSHelper.getSignatureDeclarations(signatures, checker);
        return TSHelper.reduceContextTypes(
            signatureDeclarations.map(s => TSHelper.getDeclarationContextType(s, checker)));
    }

    public static isDefaultArrayPropertyName(methodName: string): boolean {
        return defaultArrayPropertyNames.has(methodName);
    }

    public static escapeString(text: string): string {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
        const escapeSequences: Array<[RegExp, string]> = [
            [/[\\]/g, "\\\\"],
            [/[\']/g, "\\\'"],
            [/[\`]/g, "\\\`"],
            [/[\"]/g, "\\\""],
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

    public static isValidLuaIdentifier(str: string): boolean {
        const match = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
        return match && match[0] === str;
    }

    public static isFalsible(type: ts.Type, strictNullChecks: boolean): boolean {
        const falsibleFlags = ts.TypeFlags.Boolean
            | ts.TypeFlags.BooleanLiteral
            | ts.TypeFlags.Undefined
            | ts.TypeFlags.Null
            | ts.TypeFlags.Never
            | ts.TypeFlags.Void
            | ts.TypeFlags.Any;

        if (type.flags & falsibleFlags) {
            return true;
        } else if (!strictNullChecks && !type.isLiteral()) {
            return true;
        } else if (type.isUnion()) {
            for (const subType of type.types) {
                if (TSHelper.isFalsible(subType, strictNullChecks)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static getFirstDeclaration(symbol: ts.Symbol, sourceFile?: ts.SourceFile): ts.Declaration | undefined {
        let declarations = symbol.getDeclarations();
        if (!declarations) {
            return undefined;
        }
        if (sourceFile) {
            declarations = declarations.filter(d => this.findFirstNodeAbove(d, ts.isSourceFile) === sourceFile);
        }
        return declarations.length > 0
            ? declarations.reduce((p, c) => p.pos < c.pos ? p : c)
            : undefined;
    }

    public static isFirstDeclaration(node: ts.VariableDeclaration, checker: ts.TypeChecker): boolean {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (!symbol) {
            return false;
        }
        const firstDeclaration = this.getFirstDeclaration(symbol);
        return firstDeclaration === node;
    }

    public static isEnumMember(enumDeclaration: ts.EnumDeclaration, value: ts.Expression): [boolean, ts.PropertyName] {
        if (ts.isIdentifier(value)) {
            const enumMember = enumDeclaration.members.find(m => ts.isIdentifier(m.name) && m.name.text === value.text);
            if (enumMember !== undefined) {
                if (enumMember.initializer && ts.isIdentifier(enumMember.initializer)) {
                    return this.isEnumMember(enumDeclaration, enumMember.initializer);
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
}
