import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assert } from "../../utils";
import { FunctionVisitor, TransformationContext } from "../context";
import { createDefaultExportStringLiteral, hasDefaultExportModifier } from "../utils/export";
import { ContextType, getFunctionContextType } from "../utils/function-context";
import { getExtensionKindForType } from "../utils/language-extensions";
import {
    createExportsIdentifier,
    createLocalOrExportedOrGlobalDeclaration,
    createSelfIdentifier,
    wrapInTable,
} from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { peekScope, performHoisting, Scope, ScopeType } from "../utils/scope";
import { isFunctionType } from "../utils/typescript";
import { isAsyncFunction, wrapInAsyncAwaiter } from "./async-await";
import { transformIdentifier } from "./identifier";
import { transformExpressionBodyToReturnStatement } from "./return";
import { transformBindingPattern } from "./variable-declaration";

function transformParameterDefaultValueDeclaration(
    context: TransformationContext,
    parameterName: lua.Identifier,
    value?: ts.Expression,
    tsOriginal?: ts.Node
): lua.Statement {
    const parameterValue = value ? context.transformExpression(value) : undefined;
    const assignment = lua.createAssignmentStatement(parameterName, parameterValue);

    const nilCondition = lua.createBinaryExpression(
        parameterName,
        lua.createNilLiteral(),
        lua.SyntaxKind.EqualityOperator
    );

    const ifBlock = lua.createBlock([assignment]);

    return lua.createIfStatement(nilCondition, ifBlock, undefined, tsOriginal);
}

function isRestParameterReferenced(identifier: lua.Identifier, scope: Scope): boolean {
    if (!identifier.symbolId) {
        return true;
    }
    if (scope.referencedSymbols === undefined) {
        return false;
    }
    const references = scope.referencedSymbols.get(identifier.symbolId);
    return references !== undefined && references.length > 0;
}

export function createCallableTable(functionExpression: lua.Expression): lua.Expression {
    // __call metamethod receives the table as the first argument, so we need to add a dummy parameter
    if (lua.isFunctionExpression(functionExpression)) {
        functionExpression.params?.unshift(lua.createAnonymousIdentifier());
    } else {
        // functionExpression may have been replaced (lib functions, etc...),
        // so we create a forwarding function to eat the extra argument
        functionExpression = lua.createFunctionExpression(
            lua.createBlock([
                lua.createReturnStatement([lua.createCallExpression(functionExpression, [lua.createDotsLiteral()])]),
            ]),
            [lua.createAnonymousIdentifier()],
            lua.createDotsLiteral(),
            lua.NodeFlags.Inline
        );
    }
    return lua.createCallExpression(lua.createIdentifier("setmetatable"), [
        lua.createTableExpression(),
        lua.createTableExpression([
            lua.createTableFieldExpression(functionExpression, lua.createStringLiteral("__call")),
        ]),
    ]);
}

export function isFunctionTypeWithProperties(context: TransformationContext, functionType: ts.Type): boolean {
    if (functionType.isUnion()) {
        return functionType.types.some(t => isFunctionTypeWithProperties(context, t));
    } else {
        return (
            isFunctionType(functionType) &&
            functionType.getProperties().length > 0 &&
            getExtensionKindForType(context, functionType) === undefined // ignore TSTL extension functions like $range
        );
    }
}

export function transformFunctionBodyContent(context: TransformationContext, body: ts.ConciseBody): lua.Statement[] {
    if (!ts.isBlock(body)) {
        const [precedingStatements, returnStatement] = transformInPrecedingStatementScope(context, () =>
            transformExpressionBodyToReturnStatement(context, body)
        );
        return [...precedingStatements, returnStatement];
    }

    const bodyStatements = performHoisting(context, context.transformStatements(body.statements));
    return bodyStatements;
}

export function transformFunctionBodyHeader(
    context: TransformationContext,
    bodyScope: Scope,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    spreadIdentifier?: lua.Identifier
): lua.Statement[] {
    const headerStatements = [];

    // Add default parameters and object binding patterns
    const bindingPatternDeclarations: lua.Statement[] = [];
    let bindPatternIndex = 0;
    for (const declaration of parameters) {
        if (ts.isObjectBindingPattern(declaration.name) || ts.isArrayBindingPattern(declaration.name)) {
            const identifier = lua.createIdentifier(`____bindingPattern${bindPatternIndex++}`);
            if (declaration.initializer !== undefined) {
                // Default binding parameter
                headerStatements.push(
                    transformParameterDefaultValueDeclaration(context, identifier, declaration.initializer)
                );
            }

            // Binding pattern
            const name = declaration.name;
            const [precedingStatements, bindings] = transformInPrecedingStatementScope(context, () =>
                transformBindingPattern(context, name, identifier)
            );
            bindingPatternDeclarations.push(...precedingStatements, ...bindings);
        } else if (declaration.initializer !== undefined) {
            // Default parameter
            headerStatements.push(
                transformParameterDefaultValueDeclaration(
                    context,
                    transformIdentifier(context, declaration.name),
                    declaration.initializer
                )
            );
        }
    }

    // Push spread operator here
    if (spreadIdentifier && isRestParameterReferenced(spreadIdentifier, bodyScope)) {
        const spreadTable = wrapInTable(lua.createDotsLiteral());
        headerStatements.push(lua.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
    }

    // Binding pattern statements need to be after spread table is declared
    headerStatements.push(...bindingPatternDeclarations);

    return headerStatements;
}

export function transformFunctionBody(
    context: TransformationContext,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    body: ts.ConciseBody,
    spreadIdentifier?: lua.Identifier,
    node?: ts.FunctionLikeDeclaration
): [lua.Statement[], Scope] {
    const scope = context.pushScope(ScopeType.Function);
    scope.node = node;
    let bodyStatements = transformFunctionBodyContent(context, body);
    if (node && isAsyncFunction(node)) {
        bodyStatements = [lua.createReturnStatement([wrapInAsyncAwaiter(context, bodyStatements)])];
    }
    const headerStatements = transformFunctionBodyHeader(context, scope, parameters, spreadIdentifier);
    context.popScope();
    return [[...headerStatements, ...bodyStatements], scope];
}

export function transformParameters(
    context: TransformationContext,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    functionContext?: lua.Identifier
): [lua.Identifier[], lua.DotsLiteral | undefined, lua.Identifier | undefined] {
    // Build parameter string
    const paramNames: lua.Identifier[] = [];
    if (functionContext) {
        paramNames.push(functionContext);
    }

    let restParamName: lua.Identifier | undefined;
    let dotsLiteral: lua.DotsLiteral | undefined;
    let identifierIndex = 0;

    // Only push parameter name to paramName array if it isn't a spread parameter
    for (const param of parameters) {
        if (ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
            continue;
        }

        // Binding patterns become ____bindingPattern0, ____bindingPattern1, etc as function parameters
        // See transformFunctionBody for how these values are destructured
        const paramName =
            ts.isObjectBindingPattern(param.name) || ts.isArrayBindingPattern(param.name)
                ? lua.createIdentifier(`____bindingPattern${identifierIndex++}`)
                : transformIdentifier(context, param.name);

        // This parameter is a spread parameter (...param)
        if (!param.dotDotDotToken) {
            paramNames.push(paramName);
        } else {
            restParamName = paramName;
            // Push the spread operator into the paramNames array
            dotsLiteral = lua.createDotsLiteral();
        }
    }

    return [paramNames, dotsLiteral, restParamName];
}

export function transformFunctionToExpression(
    context: TransformationContext,
    node: ts.FunctionLikeDeclaration
): [lua.Expression, Scope] {
    assert(node.body);

    const type = context.checker.getTypeAtLocation(node);
    let functionContext: lua.Identifier | undefined;
    if (getFunctionContextType(context, type) !== ContextType.Void) {
        if (ts.isArrowFunction(node)) {
            // dummy context for arrow functions with parameters
            if (node.parameters.length > 0) {
                functionContext = lua.createAnonymousIdentifier();
            }
        } else {
            // self context
            functionContext = createSelfIdentifier();
        }
    }

    let flags = lua.NodeFlags.None;
    if (!ts.isBlock(node.body)) flags |= lua.NodeFlags.Inline;
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        flags |= lua.NodeFlags.Declaration;
    }

    const [paramNames, dotsLiteral, spreadIdentifier] = transformParameters(context, node.parameters, functionContext);
    const [transformedBody, functionScope] = transformFunctionBody(
        context,
        node.parameters,
        node.body,
        spreadIdentifier,
        node
    );

    const functionExpression = lua.createFunctionExpression(
        lua.createBlock(transformedBody),
        paramNames,
        dotsLiteral,
        flags,
        node
    );

    return [
        node.asteriskToken
            ? transformLuaLibFunction(context, LuaLibFeature.Generator, undefined, functionExpression)
            : functionExpression,
        functionScope,
    ];
}

export function transformFunctionLikeDeclaration(
    node: ts.FunctionLikeDeclaration,
    context: TransformationContext
): lua.Expression {
    if (node.body === undefined) {
        // This code can be reached only from object methods, which is TypeScript error
        return lua.createNilLiteral();
    }

    const [functionExpression, functionScope] = transformFunctionToExpression(context, node);

    const isNamedFunctionExpression = ts.isFunctionExpression(node) && node.name;
    // Handle named function expressions which reference themselves
    if (isNamedFunctionExpression && functionScope.referencedSymbols) {
        const symbol = context.checker.getSymbolAtLocation(node.name);
        if (symbol) {
            // TODO: Not using symbol ids because of https://github.com/microsoft/TypeScript/issues/37131
            const isReferenced = [...functionScope.referencedSymbols].some(([, nodes]) =>
                nodes.some(n => context.checker.getSymbolAtLocation(n)?.valueDeclaration === symbol.valueDeclaration)
            );

            // Only handle if the name is actually referenced inside the function
            if (isReferenced) {
                const nameIdentifier = transformIdentifier(context, node.name);
                if (isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node))) {
                    context.addPrecedingStatements([
                        lua.createVariableDeclarationStatement(nameIdentifier),
                        lua.createAssignmentStatement(nameIdentifier, createCallableTable(functionExpression)),
                    ]);
                } else {
                    context.addPrecedingStatements(
                        lua.createVariableDeclarationStatement(nameIdentifier, functionExpression)
                    );
                }
                return lua.cloneIdentifier(nameIdentifier);
            }
        }
    }

    return isNamedFunctionExpression && isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node))
        ? createCallableTable(functionExpression)
        : functionExpression;
}

export const transformFunctionDeclaration: FunctionVisitor<ts.FunctionDeclaration> = (node, context) => {
    // Don't transform functions without body (overload declarations)
    if (node.body === undefined) {
        return undefined;
    }

    if (hasDefaultExportModifier(node)) {
        return lua.createAssignmentStatement(
            lua.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral(node)),
            transformFunctionLikeDeclaration(node, context)
        );
    }

    const [functionExpression, functionScope] = transformFunctionToExpression(context, node);

    // Name being undefined without default export is a TypeScript error
    const name = node.name ? transformIdentifier(context, node.name) : lua.createAnonymousIdentifier();

    // Remember symbols referenced in this function for hoisting later
    if (name.symbolId !== undefined) {
        const scope = peekScope(context);
        if (!scope.functionDefinitions) {
            scope.functionDefinitions = new Map();
        }

        const functionInfo = { referencedSymbols: functionScope.referencedSymbols ?? new Map() };
        scope.functionDefinitions.set(name.symbolId, functionInfo);
    }

    // Wrap functions with properties into a callable table
    const wrappedFunction =
        node.name && isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node.name))
            ? createCallableTable(functionExpression)
            : functionExpression;

    return createLocalOrExportedOrGlobalDeclaration(context, name, wrappedFunction, node);
};

export const transformYieldExpression: FunctionVisitor<ts.YieldExpression> = (expression, context) => {
    const parameters = expression.expression ? [context.transformExpression(expression.expression)] : [];
    return expression.asteriskToken
        ? transformLuaLibFunction(context, LuaLibFeature.DelegatedYield, expression, ...parameters)
        : lua.createCallExpression(
              lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("yield")),
              parameters,
              expression
          );
};
