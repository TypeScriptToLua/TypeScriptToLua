import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { isVarArgType } from "../utils/annotations";
import { MissingFunctionName, UnsupportedFunctionWithoutBody } from "../utils/errors";
import { createDefaultExportStringLiteral, hasDefaultExportModifier } from "../utils/export";
import { ContextType, getFunctionContextType } from "../utils/function-context";
import {
    createExportsIdentifier,
    createImmediatelyInvokedFunctionExpression,
    createLocalOrExportedOrGlobalDeclaration,
    createSelfIdentifier,
    wrapInTable,
} from "../utils/lua-ast";
import { peekScope, performHoisting, popScope, pushScope, Scope, ScopeType } from "../utils/scope";
import { getSymbolIdOfSymbol } from "../utils/symbols";
import { transformGeneratorFunctionBody } from "./generator";
import { transformIdentifier } from "./identifier";
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

function isRestParameterReferenced(context: TransformationContext, identifier: lua.Identifier, scope: Scope): boolean {
    if (!identifier.symbolId) {
        return true;
    }
    if (scope.referencedSymbols === undefined) {
        return false;
    }
    const references = scope.referencedSymbols.get(identifier.symbolId);
    if (!references) {
        return false;
    }
    // Ignore references to @vararg types in spread elements
    return references.some(r => !r.parent || !ts.isSpreadElement(r.parent) || !isVarArgType(context, r));
}

export function transformFunctionBodyStatements(context: TransformationContext, body: ts.Block): lua.Statement[] {
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
            bindingPatternDeclarations.push(...transformBindingPattern(context, declaration.name, identifier));
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
    if (spreadIdentifier && isRestParameterReferenced(context, spreadIdentifier, bodyScope)) {
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
    body: ts.Block,
    spreadIdentifier?: lua.Identifier
): [lua.Statement[], Scope] {
    const scope = pushScope(context, ScopeType.Function);
    const bodyStatements = transformFunctionBodyStatements(context, body);
    const headerStatements = transformFunctionBodyHeader(context, scope, parameters, spreadIdentifier);
    popScope(context);
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
                : transformIdentifier(context, param.name as ts.Identifier);

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

export function transformFunctionLikeDeclaration(
    node: ts.FunctionLikeDeclaration,
    context: TransformationContext
): lua.Expression {
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

    // Build parameter string
    const [paramNames, dotsLiteral, spreadIdentifier] = transformParameters(context, node.parameters, functionContext);

    let flags = lua.FunctionExpressionFlags.None;

    if (node.body === undefined) {
        throw UnsupportedFunctionWithoutBody(node);
    }

    let body: ts.Block;
    if (ts.isBlock(node.body)) {
        body = node.body;
    } else {
        const returnExpression = ts.createReturn(node.body);
        body = ts.createBlock([returnExpression]);
        returnExpression.parent = body;
        if (node.body) {
            body.parent = node.body.parent;
        }
        flags |= lua.FunctionExpressionFlags.Inline;
    }

    const [transformedBody, scope] = transformFunctionBody(context, node.parameters, body, spreadIdentifier);

    const functionExpression = lua.createFunctionExpression(
        lua.createBlock(transformedBody),
        paramNames,
        dotsLiteral,
        spreadIdentifier,
        flags,
        node
    );

    // Handle named function expressions which reference themselves
    if (ts.isFunctionExpression(node) && node.name && scope.referencedSymbols) {
        const symbol = context.checker.getSymbolAtLocation(node.name);
        if (symbol) {
            const symbolId = getSymbolIdOfSymbol(context, symbol);
            // Only wrap if the name is actually referenced inside the function
            if (symbolId !== undefined && scope.referencedSymbols.has(symbolId)) {
                const nameIdentifier = transformIdentifier(context, node.name);
                return createImmediatelyInvokedFunctionExpression(
                    [lua.createVariableDeclarationStatement(nameIdentifier, functionExpression)],
                    lua.cloneIdentifier(nameIdentifier)
                );
            }
        }
    }

    return functionExpression;
}

export const transformFunctionDeclaration: FunctionVisitor<ts.FunctionDeclaration> = (node, context) => {
    // Don't transform functions without body (overload declarations)
    if (!node.body) {
        return undefined;
    }

    const type = context.checker.getTypeAtLocation(node);
    const functionContext =
        getFunctionContextType(context, type) !== ContextType.Void ? createSelfIdentifier() : undefined;
    const [params, dotsLiteral, restParamName] = transformParameters(context, node.parameters, functionContext);

    const [body, functionScope] = node.asteriskToken
        ? transformGeneratorFunctionBody(context, node.parameters, node.body, restParamName)
        : transformFunctionBody(context, node.parameters, node.body, restParamName);

    const block = lua.createBlock(body);
    const functionExpression = lua.createFunctionExpression(
        block,
        params,
        dotsLiteral,
        restParamName,
        lua.FunctionExpressionFlags.Declaration
    );

    const name = node.name ? transformIdentifier(context, node.name) : undefined;

    const isDefaultExport = hasDefaultExportModifier(node);
    if (isDefaultExport) {
        return lua.createAssignmentStatement(
            lua.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral(node)),
            transformFunctionLikeDeclaration(node, context)
        );
    } else if (!name) {
        throw MissingFunctionName(node);
    }

    // Remember symbols referenced in this function for hoisting later
    if (!context.options.noHoisting && name.symbolId !== undefined) {
        const scope = peekScope(context);
        if (!scope.functionDefinitions) {
            scope.functionDefinitions = new Map();
        }

        const functionInfo = { referencedSymbols: functionScope.referencedSymbols ?? new Map() };
        scope.functionDefinitions.set(name.symbolId, functionInfo);
    }

    return createLocalOrExportedOrGlobalDeclaration(context, name, functionExpression, node);
};
