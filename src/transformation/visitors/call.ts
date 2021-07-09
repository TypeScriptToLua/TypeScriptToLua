import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinCallExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations, isInTupleReturnFunction, isTupleReturnCall } from "../utils/annotations";
import { validateAssignment } from "../utils/assignment-validation";
import { ContextType, getDeclarationContextType } from "../utils/function-context";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isValidLuaIdentifier } from "../utils/safe-names";
import { isExpressionWithEvaluationEffect, isInDestructingAssignment } from "../utils/typescript";
import { transformElementAccessArgument } from "./access";
import { shouldMultiReturnCallBeWrapped } from "./language-extensions/multi";
import { isOperatorMapping, transformOperatorMappingExpression } from "./language-extensions/operators";
import {
    isTableDeleteCall,
    isTableGetCall,
    isTableHasCall,
    isTableSetCall,
    transformTableDeleteExpression,
    transformTableGetExpression,
    transformTableHasExpression,
    transformTableSetExpression,
} from "./language-extensions/table";
import { annotationRemoved, invalidTableDeleteExpression, invalidTableSetExpression } from "../utils/diagnostics";
import {
    ImmediatelyInvokedFunctionParameters,
    transformToImmediatelyInvokedFunctionExpression,
} from "../utils/transform";

export type PropertyCallExpression = ts.CallExpression & { expression: ts.PropertyAccessExpression };

function getExpressionsBeforeAndAfterFirstSpread(
    expressions: readonly ts.Expression[]
): [readonly ts.Expression[], readonly ts.Expression[]] {
    // [a, b, ...c, d, ...e] --> [a, b] and [...c, d, ...e]
    const index = expressions.findIndex(ts.isSpreadElement);
    const hasSpreadElement = index !== -1;
    const before = hasSpreadElement ? expressions.slice(0, index) : expressions;
    const after = hasSpreadElement ? expressions.slice(index) : [];
    return [before, after];
}

function transformSpreadableExpressionsIntoArrayConcatArguments(
    context: TransformationContext,
    expressions: readonly ts.Expression[] | ts.NodeArray<ts.Expression>
): lua.Expression[] {
    // [...array, a, b, ...tuple()] --> [ [...array], [a, b], [...tuple()] ]
    // chunk non-spread arguments together so they don't concat
    const chunks: ts.Expression[][] = [];
    for (const [index, expression] of expressions.entries()) {
        if (ts.isSpreadElement(expression)) {
            chunks.push([expression]);
            const next = expressions[index + 1];
            if (next && !ts.isSpreadElement(next)) {
                chunks.push([]);
            }
        } else {
            let lastChunk = chunks[chunks.length - 1];
            if (!lastChunk) {
                lastChunk = [];
                chunks.push(lastChunk);
            }
            lastChunk.push(expression);
        }
    }

    return chunks.map(chunk => wrapInTable(...chunk.map(expression => context.transformExpression(expression))));
}

export function flattenSpreadExpressions(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const [preSpreadExpressions, postSpreadExpressions] = getExpressionsBeforeAndAfterFirstSpread(expressions);
    const transformedPreSpreadExpressions = preSpreadExpressions.map(a => context.transformExpression(a));

    // Nothing special required
    if (postSpreadExpressions.length === 0) {
        return transformedPreSpreadExpressions;
    }

    // Only one spread element at the end? Will work as expected
    if (postSpreadExpressions.length === 1) {
        return [...transformedPreSpreadExpressions, context.transformExpression(postSpreadExpressions[0])];
    }

    // Use Array.concat and unpack the result of that as the last Expression
    const concatArguments = transformSpreadableExpressionsIntoArrayConcatArguments(context, postSpreadExpressions);
    const lastExpression = createUnpackCall(
        context,
        transformLuaLibFunction(context, LuaLibFeature.ArrayConcat, undefined, ...concatArguments)
    );

    return [...transformedPreSpreadExpressions, lastExpression];
}

export function transformArguments(
    context: TransformationContext,
    params: readonly ts.Expression[],
    signature?: ts.Signature,
    callContext?: ts.Expression
): lua.Expression[] {
    const parameters = flattenSpreadExpressions(context, params);

    // Add context as first param if present
    if (callContext) {
        parameters.unshift(context.transformExpression(callContext));
    }

    if (signature && signature.parameters.length >= params.length) {
        for (const [index, param] of params.entries()) {
            const signatureParameter = signature.parameters[index];
            const paramType = context.checker.getTypeAtLocation(param);
            if (signatureParameter.valueDeclaration !== undefined) {
                const signatureType = context.checker.getTypeAtLocation(signatureParameter.valueDeclaration);
                validateAssignment(context, param, paramType, signatureType, signatureParameter.name);
            }
        }
    }

    return parameters;
}

function transformElementAccessCall(
    context: TransformationContext,
    left: ts.PropertyAccessExpression | ts.ElementAccessExpression,
    args: ts.Expression[] | ts.NodeArray<ts.Expression>,
    signature?: ts.Signature
): ImmediatelyInvokedFunctionParameters {
    const transformedArguments = transformArguments(context, args, signature, ts.factory.createIdentifier("____self"));

    // Cache left-side if it has effects
    // (function() local ____self = context; return ____self[argument](parameters); end)()
    const argument = ts.isElementAccessExpression(left)
        ? transformElementAccessArgument(context, left)
        : lua.createStringLiteral(left.name.text);
    const selfIdentifier = lua.createIdentifier("____self");
    const callContext = context.transformExpression(left.expression);
    const selfAssignment = lua.createVariableDeclarationStatement(selfIdentifier, callContext);
    const index = lua.createTableIndexExpression(selfIdentifier, argument);
    const callExpression = lua.createCallExpression(index, transformedArguments);
    return { statements: selfAssignment, result: callExpression };
}

export function transformContextualCallExpression(
    context: TransformationContext,
    node: ts.CallExpression | ts.TaggedTemplateExpression,
    args: ts.Expression[] | ts.NodeArray<ts.Expression>,
    signature?: ts.Signature
): lua.CallExpression | lua.MethodCallExpression {
    const left = ts.isCallExpression(node) ? node.expression : node.tag;
    if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.name) && isValidLuaIdentifier(left.name.text)) {
        // table:name()
        const table = context.transformExpression(left.expression);

        if (ts.isOptionalChain(node)) {
            return transformLuaLibFunction(
                context,
                LuaLibFeature.OptionalMethodCall,
                node,
                table,
                lua.createStringLiteral(left.name.text, left.name),
                ...transformArguments(context, args, signature)
            );
        } else {
            return lua.createMethodCallExpression(
                table,
                lua.createIdentifier(left.name.text, left.name),
                transformArguments(context, args, signature),
                node
            );
        }
    } else if (ts.isElementAccessExpression(left) || ts.isPropertyAccessExpression(left)) {
        if (isExpressionWithEvaluationEffect(left.expression)) {
            return transformToImmediatelyInvokedFunctionExpression(
                context,
                () => transformElementAccessCall(context, left, args, signature),
                node
            );
        } else {
            const callContext = context.transformExpression(left.expression);
            const expression = context.transformExpression(left);
            const transformedArguments = transformArguments(context, args, signature);
            return lua.createCallExpression(expression, [callContext, ...transformedArguments]);
        }
    } else if (ts.isIdentifier(left)) {
        const callContext = context.isStrict ? ts.factory.createNull() : ts.factory.createIdentifier("_G");
        const transformedArguments = transformArguments(context, args, signature, callContext);
        const expression = context.transformExpression(left);
        return lua.createCallExpression(expression, transformedArguments, node);
    } else {
        throw new Error(`Unsupported LeftHandSideExpression kind: ${ts.SyntaxKind[left.kind]}`);
    }
}

function transformPropertyCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.CallExpression | lua.MethodCallExpression {
    const signature = context.checker.getResolvedSignature(node);

    if (node.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
        // Super calls take the format of super.call(self,...)
        const parameters = transformArguments(context, node.arguments, signature, ts.factory.createThis());
        return lua.createCallExpression(context.transformExpression(node.expression), parameters);
    }

    const signatureDeclaration = signature?.getDeclaration();
    if (!signatureDeclaration || getDeclarationContextType(context, signatureDeclaration) !== ContextType.Void) {
        // table:name()
        return transformContextualCallExpression(context, node, node.arguments, signature);
    } else {
        // table.name()
        const callPath = context.transformExpression(node.expression);
        const parameters = transformArguments(context, node.arguments, signature);

        if (ts.isOptionalChain(node)) {
            return transformLuaLibFunction(context, LuaLibFeature.OptionalFunctionCall, node, callPath, ...parameters);
        } else {
            return lua.createCallExpression(callPath, parameters, node);
        }
    }
}

function transformElementCall(
    context: TransformationContext,
    node: ts.CallExpression
): lua.CallExpression | lua.MethodCallExpression {
    const signature = context.checker.getResolvedSignature(node);
    const signatureDeclaration = signature?.getDeclaration();
    if (!signatureDeclaration || getDeclarationContextType(context, signatureDeclaration) !== ContextType.Void) {
        // A contextual parameter must be given to this call expression
        return transformContextualCallExpression(context, node, node.arguments, signature);
    } else {
        // No context
        const expression = context.transformExpression(node.expression);
        const parameters = transformArguments(context, node.arguments, signature);
        return lua.createCallExpression(expression, parameters);
    }
}

export const transformCallExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    const isTupleReturn = isTupleReturnCall(context, node);
    const isTupleReturnForward =
        node.parent && ts.isReturnStatement(node.parent) && isInTupleReturnFunction(context, node);
    const isInSpread = node.parent && ts.isSpreadElement(node.parent);
    const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);
    const wrapTupleReturn =
        isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment(node) && !isInSpread && returnValueIsUsed;
    const wrapResultInTable = wrapTupleReturn || shouldMultiReturnCallBeWrapped(context, node);
    const wrapResultInOptional = ts.isOptionalChain(node);

    const builtinResult = transformBuiltinCallExpression(context, node);
    if (builtinResult) {
        return wrapResultInTable ? wrapInTable(builtinResult) : builtinResult;
    }

    if (isOperatorMapping(context, node)) {
        return transformOperatorMappingExpression(context, node);
    }

    if (isTableDeleteCall(context, node)) {
        context.diagnostics.push(invalidTableDeleteExpression(node));
        return transformToImmediatelyInvokedFunctionExpression(
            context,
            () => ({ statements: transformTableDeleteExpression(context, node), result: lua.createNilLiteral() }),
            node
        );
    }

    if (isTableGetCall(context, node)) {
        return transformTableGetExpression(context, node);
    }

    if (isTableHasCall(context, node)) {
        return transformTableHasExpression(context, node);
    }

    if (isTableSetCall(context, node)) {
        context.diagnostics.push(invalidTableSetExpression(node));
        return transformToImmediatelyInvokedFunctionExpression(
            context,
            () => ({ statements: transformTableSetExpression(context, node), result: lua.createNilLiteral() }),
            node
        );
    }

    if (ts.isPropertyAccessExpression(node.expression)) {
        const ownerType = context.checker.getTypeAtLocation(node.expression.expression);
        const annotations = getTypeAnnotations(ownerType);
        if (annotations.has(AnnotationKind.LuaTable)) {
            context.diagnostics.push(annotationRemoved(node, AnnotationKind.LuaTable));
        }

        const result = transformPropertyCall(context, node as PropertyCallExpression);
        // transformPropertyCall already wraps optional so no need to do so here
        return wrapResultInTable ? wrapInTable(result) : result;
    }

    if (ts.isElementAccessExpression(node.expression)) {
        const result = transformElementCall(context, node);
        return wrapIfRequired(context, wrapResultInTable, wrapResultInOptional, result, node);
    }

    const signature = context.checker.getResolvedSignature(node);

    // Handle super calls properly
    if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
        const parameters = transformArguments(context, node.arguments, signature, ts.factory.createThis());

        return lua.createCallExpression(
            lua.createTableIndexExpression(
                context.transformExpression(ts.factory.createSuper()),
                lua.createStringLiteral("____constructor")
            ),
            parameters
        );
    }

    const callPath = context.transformExpression(node.expression);
    const signatureDeclaration = signature?.getDeclaration();

    let parameters: lua.Expression[] = [];
    if (signatureDeclaration && getDeclarationContextType(context, signatureDeclaration) === ContextType.Void) {
        parameters = transformArguments(context, node.arguments, signature);
    } else {
        const callContext = context.isStrict ? ts.factory.createNull() : ts.factory.createIdentifier("_G");
        parameters = transformArguments(context, node.arguments, signature, callContext);
    }

    const callExpression = lua.createCallExpression(callPath, parameters, node);
    return wrapIfRequired(context, wrapResultInTable, wrapResultInOptional, callExpression, node);
};

function wrapIfRequired(
    context: TransformationContext,
    shouldWrapInTable: boolean,
    shouldWrapOptional: boolean,
    call: lua.CallExpression | lua.MethodCallExpression,
    node: ts.Node
): lua.Expression {
    const wrappedOptional = shouldWrapOptional ? wrapOptionalCall(context, call, node) : call;
    return shouldWrapInTable ? wrapInTable(wrappedOptional) : wrappedOptional;
}

function wrapOptionalCall(
    context: TransformationContext,
    call: lua.CallExpression | lua.MethodCallExpression,
    node: ts.Node
): lua.CallExpression {
    if (lua.isMethodCallExpression(call)) {
        return transformLuaLibFunction(
            context,
            LuaLibFeature.OptionalMethodCall,
            node,
            call.prefixExpression,
            lua.createStringLiteral(call.name.text),
            ...call.params
        );
    } else {
        return transformLuaLibFunction(
            context,
            LuaLibFeature.OptionalFunctionCall,
            node,
            call.expression,
            ...call.params
        );
    }
}
