import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { transformBuiltinCallExpression } from "../builtins";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { isInTupleReturnFunction, isTupleReturnCall, isVarArgType } from "../utils/annotations";
import { validateAssignment } from "../utils/assignment-validation";
import { UnsupportedKind } from "../utils/errors";
import { ContextType, getDeclarationContextType } from "../utils/function-context";
import { createImmediatelyInvokedFunctionExpression, createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isValidLuaIdentifier, luaKeywords } from "../utils/safe-names";
import { isArrayType, isExpressionWithEvaluationEffect, isInDestructingAssignment } from "../utils/typescript";
import { transformElementAccessArgument } from "./access";
import { transformIdentifier } from "./identifier";

export type PropertyCallExpression = ts.CallExpression & { expression: ts.PropertyAccessExpression };

export function transformArguments(
    context: TransformationContext,
    params: readonly ts.Expression[],
    signature?: ts.Signature,
    callContext?: ts.Expression
): tstl.Expression[] {
    const parameters = params.map(param => context.transformExpression(param));

    // Add context as first param if present
    if (callContext) {
        parameters.unshift(context.transformExpression(callContext));
    }

    if (signature && signature.parameters.length >= params.length) {
        for (const [index, param] of params.entries()) {
            const signatureParameter = signature.parameters[index];
            const paramType = context.checker.getTypeAtLocation(param);
            const signatureType = context.checker.getTypeAtLocation(signatureParameter.valueDeclaration);
            validateAssignment(context, param, paramType, signatureType, signatureParameter.name);
        }
    }

    return parameters;
}

export function transformContextualCallExpression(
    context: TransformationContext,
    node: ts.CallExpression | ts.TaggedTemplateExpression,
    transformedArguments: tstl.Expression[]
): tstl.Expression {
    const left = ts.isCallExpression(node) ? node.expression : node.tag;
    if (
        ts.isPropertyAccessExpression(left) &&
        !luaKeywords.has(left.name.text) &&
        isValidLuaIdentifier(left.name.text)
    ) {
        // table:name()
        let table = context.transformExpression(left.expression);
        if (tstl.isTableExpression(table)) {
            table = tstl.createParenthesizedExpression(table);
        }

        return tstl.createMethodCallExpression(
            table,
            transformIdentifier(context, left.name),
            transformedArguments,
            node
        );
    } else if (ts.isElementAccessExpression(left) || ts.isPropertyAccessExpression(left)) {
        const callContext = context.transformExpression(left.expression);
        if (isExpressionWithEvaluationEffect(left.expression)) {
            // Inject context parameter
            transformedArguments.unshift(tstl.createIdentifier("____self"));

            // Cache left-side if it has effects
            //(function() local ____self = context; return ____self[argument](parameters); end)()
            const argument = ts.isElementAccessExpression(left)
                ? transformElementAccessArgument(context, left)
                : tstl.createStringLiteral(left.name.text);
            const selfIdentifier = tstl.createIdentifier("____self");
            const selfAssignment = tstl.createVariableDeclarationStatement(selfIdentifier, callContext);
            const index = tstl.createTableIndexExpression(selfIdentifier, argument);
            const callExpression = tstl.createCallExpression(index, transformedArguments);
            return createImmediatelyInvokedFunctionExpression([selfAssignment], callExpression, node);
        } else {
            const expression = context.transformExpression(left);
            return tstl.createCallExpression(expression, [callContext, ...transformedArguments]);
        }
    } else if (ts.isIdentifier(left)) {
        const callContext = context.isStrict ? tstl.createNilLiteral() : tstl.createIdentifier("_G");
        transformedArguments.unshift(callContext);
        const expression = context.transformExpression(left);
        return tstl.createCallExpression(expression, transformedArguments, node);
    } else {
        throw UnsupportedKind("Left Hand Side Call Expression", left.kind, left);
    }
}

function transformPropertyCall(context: TransformationContext, node: PropertyCallExpression): tstl.Expression {
    const signature = context.checker.getResolvedSignature(node);

    if (node.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
        // Super calls take the format of super.call(self,...)
        const parameters = transformArguments(context, node.arguments, signature, ts.createThis());
        return tstl.createCallExpression(context.transformExpression(node.expression), parameters);
    }

    const parameters = transformArguments(context, node.arguments, signature);
    const signatureDeclaration = signature && signature.getDeclaration();
    if (!signatureDeclaration || getDeclarationContextType(context, signatureDeclaration) !== ContextType.Void) {
        // table:name()
        return transformContextualCallExpression(context, node, parameters);
    } else {
        let table = context.transformExpression(node.expression.expression);
        if (tstl.isTableExpression(table)) {
            table = tstl.createParenthesizedExpression(table);
        }

        // table.name()
        const name = node.expression.name.text;
        const callPath = tstl.createTableIndexExpression(table, tstl.createStringLiteral(name), node.expression);
        return tstl.createCallExpression(callPath, parameters, node);
    }
}

function transformElementCall(context: TransformationContext, node: ts.CallExpression): tstl.Expression {
    const signature = context.checker.getResolvedSignature(node);
    const signatureDeclaration = signature && signature.getDeclaration();
    const parameters = transformArguments(context, node.arguments, signature);
    if (!signatureDeclaration || getDeclarationContextType(context, signatureDeclaration) !== ContextType.Void) {
        // A contextual parameter must be given to this call expression
        return transformContextualCallExpression(context, node, parameters);
    } else {
        // No context
        let expression = context.transformExpression(node.expression);
        if (tstl.isTableExpression(expression)) {
            expression = tstl.createParenthesizedExpression(expression);
        }

        return tstl.createCallExpression(expression, parameters);
    }
}

const transformCallExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    const isTupleReturn = isTupleReturnCall(context, node);
    const isTupleReturnForward =
        node.parent && ts.isReturnStatement(node.parent) && isInTupleReturnFunction(context, node);
    const isInSpread = node.parent && ts.isSpreadElement(node.parent);
    const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);
    const wrapResult =
        isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment(node) && !isInSpread && returnValueIsUsed;

    const builtinResult = transformBuiltinCallExpression(context, node);
    if (builtinResult) {
        return wrapResult ? wrapInTable(builtinResult) : builtinResult;
    }

    if (ts.isPropertyAccessExpression(node.expression)) {
        const result = transformPropertyCall(context, node as PropertyCallExpression);
        return wrapResult ? wrapInTable(result) : result;
    }

    if (ts.isElementAccessExpression(node.expression)) {
        const result = transformElementCall(context, node);
        return wrapResult ? wrapInTable(result) : result;
    }

    const signature = context.checker.getResolvedSignature(node);

    // Handle super calls properly
    if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
        const parameters = transformArguments(context, node.arguments, signature, ts.createThis());

        return tstl.createCallExpression(
            tstl.createTableIndexExpression(
                context.transformExpression(ts.createSuper()),
                tstl.createStringLiteral("____constructor")
            ),
            parameters
        );
    }

    const callPath = context.transformExpression(node.expression);
    const signatureDeclaration = signature && signature.getDeclaration();

    let parameters: tstl.Expression[] = [];
    if (signatureDeclaration && getDeclarationContextType(context, signatureDeclaration) === ContextType.Void) {
        parameters = transformArguments(context, node.arguments, signature);
    } else {
        const callContext = context.isStrict ? ts.createNull() : ts.createIdentifier("_G");
        parameters = transformArguments(context, node.arguments, signature, callContext);
    }

    const callExpression = tstl.createCallExpression(callPath, parameters, node);
    return wrapResult ? wrapInTable(callExpression) : callExpression;
};

// TODO: Currently it's also used as an array member
const transformSpreadElement: FunctionVisitor<ts.SpreadElement> = (node, context) => {
    const innerExpression = context.transformExpression(node.expression);
    if (isTupleReturnCall(context, node.expression)) {
        return innerExpression;
    }

    if (ts.isIdentifier(node.expression) && isVarArgType(context, node.expression)) {
        return tstl.createDotsLiteral(node);
    }

    const type = context.checker.getTypeAtLocation(node.expression);
    if (isArrayType(context, type)) {
        return createUnpackCall(context, innerExpression, node);
    }

    return transformLuaLibFunction(context, LuaLibFeature.Spread, node, innerExpression);
};

export const callPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.CallExpression]: transformCallExpression,
        [ts.SyntaxKind.SpreadElement]: transformSpreadElement,
    },
};
