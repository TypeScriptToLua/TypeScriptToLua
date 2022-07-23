import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { transformBuiltinCallExpression } from "../builtins";
import { FunctionVisitor, TransformationContext } from "../context";
import { validateAssignment } from "../utils/assignment-validation";
import { ContextType, getDeclarationContextType } from "../utils/function-context";
import { wrapInTable } from "../utils/lua-ast";
import { isValidLuaIdentifier } from "../utils/safe-names";
import { isExpressionWithEvaluationEffect } from "../utils/typescript";
import { transformElementAccessArgument } from "./access";
import { isMultiReturnCall, shouldMultiReturnCallBeWrapped } from "./language-extensions/multi";
import { unsupportedBuiltinOptionalCall } from "../utils/diagnostics";
import { moveToPrecedingTemp, transformExpressionList } from "./expression-list";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { getOptionalContinuationData, transformOptionalChain } from "./optional-chaining";
import { transformImportExpression } from "./modules/import";
import { transformLanguageExtensionCallExpression } from "./language-extensions/call-extension";

export function validateArguments(
    context: TransformationContext,
    params: readonly ts.Expression[],
    signature?: ts.Signature
) {
    if (!signature || signature.parameters.length < params.length) {
        return;
    }
    for (const [index, param] of params.entries()) {
        const signatureParameter = signature.parameters[index];
        if (signatureParameter.valueDeclaration !== undefined) {
            const signatureType = context.checker.getTypeAtLocation(signatureParameter.valueDeclaration);
            const paramType = context.checker.getTypeAtLocation(param);
            validateAssignment(context, param, paramType, signatureType, signatureParameter.name);
        }
    }
}

export function transformArguments(
    context: TransformationContext,
    params: readonly ts.Expression[],
    signature?: ts.Signature,
    callContext?: ts.Expression
): lua.Expression[] {
    validateArguments(context, params, signature);
    return transformExpressionList(context, callContext ? [callContext, ...params] : params);
}

function transformCallWithArguments(
    context: TransformationContext,
    callExpression: ts.Expression,
    transformedArguments: lua.Expression[],
    argPrecedingStatements: lua.Statement[],
    callContext?: ts.Expression
): [lua.Expression, lua.Expression[]] {
    let call = context.transformExpression(callExpression);

    let transformedContext: lua.Expression | undefined;
    if (callContext) {
        transformedContext = context.transformExpression(callContext);
    }

    if (argPrecedingStatements.length > 0) {
        if (transformedContext) {
            transformedContext = moveToPrecedingTemp(context, transformedContext, callContext);
        }
        call = moveToPrecedingTemp(context, call, callExpression);
        context.addPrecedingStatements(argPrecedingStatements);
    }

    if (transformedContext) {
        transformedArguments.unshift(transformedContext);
    }

    return [call, transformedArguments];
}

export function transformCallAndArguments(
    context: TransformationContext,
    callExpression: ts.Expression,
    params: readonly ts.Expression[],
    signature?: ts.Signature,
    callContext?: ts.Expression
): [lua.Expression, lua.Expression[]] {
    const [argPrecedingStatements, transformedArguments] = transformInPrecedingStatementScope(context, () =>
        transformArguments(context, params, signature, callContext)
    );
    return transformCallWithArguments(context, callExpression, transformedArguments, argPrecedingStatements);
}

function transformElementAccessCall(
    context: TransformationContext,
    left: ts.PropertyAccessExpression | ts.ElementAccessExpression,
    transformedArguments: lua.Expression[],
    argPrecedingStatements: lua.Statement[]
) {
    // Cache left-side if it has effects
    // local ____self = context; return ____self[argument](parameters);
    const selfIdentifier = lua.createIdentifier(context.createTempName("self"));
    const callContext = context.transformExpression(left.expression);
    const selfAssignment = lua.createVariableDeclarationStatement(selfIdentifier, callContext);
    context.addPrecedingStatements(selfAssignment);

    const argument = ts.isElementAccessExpression(left)
        ? transformElementAccessArgument(context, left)
        : lua.createStringLiteral(left.name.text);

    let index: lua.Expression = lua.createTableIndexExpression(selfIdentifier, argument);

    if (argPrecedingStatements.length > 0) {
        // Cache index in temp if args had preceding statements
        index = moveToPrecedingTemp(context, index);
        context.addPrecedingStatements(argPrecedingStatements);
    }

    return lua.createCallExpression(index, [selfIdentifier, ...transformedArguments]);
}

export function transformContextualCallExpression(
    context: TransformationContext,
    node: ts.CallExpression | ts.TaggedTemplateExpression,
    args: ts.Expression[] | ts.NodeArray<ts.Expression>,
    signature?: ts.Signature
): lua.Expression {
    if (ts.isOptionalChain(node)) {
        return transformOptionalChain(context, node);
    }
    const left = ts.isCallExpression(node) ? getCalledExpression(node) : node.tag;

    let [argPrecedingStatements, transformedArguments] = transformInPrecedingStatementScope(context, () =>
        transformArguments(context, args, signature)
    );

    if (
        ts.isPropertyAccessExpression(left) &&
        ts.isIdentifier(left.name) &&
        isValidLuaIdentifier(left.name.text, context.options) &&
        argPrecedingStatements.length === 0
    ) {
        // table:name()
        const table = context.transformExpression(left.expression);
        return lua.createMethodCallExpression(
            table,
            lua.createIdentifier(left.name.text, left.name),
            transformedArguments,
            node
        );
    } else if (ts.isElementAccessExpression(left) || ts.isPropertyAccessExpression(left)) {
        if (isExpressionWithEvaluationEffect(left.expression)) {
            return transformElementAccessCall(context, left, transformedArguments, argPrecedingStatements);
        } else {
            let expression: lua.Expression;
            [expression, transformedArguments] = transformCallWithArguments(
                context,
                left,
                transformedArguments,
                argPrecedingStatements,
                left.expression
            );
            return lua.createCallExpression(expression, transformedArguments, node);
        }
    } else if (ts.isIdentifier(left)) {
        const callContext = context.isStrict ? ts.factory.createNull() : ts.factory.createIdentifier("_G");
        let expression: lua.Expression;
        [expression, transformedArguments] = transformCallWithArguments(
            context,
            left,
            transformedArguments,
            argPrecedingStatements,
            callContext
        );
        return lua.createCallExpression(expression, transformedArguments, node);
    } else {
        throw new Error(`Unsupported LeftHandSideExpression kind: ${ts.SyntaxKind[left.kind]}`);
    }
}

function transformPropertyCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression {
    const signature = context.checker.getResolvedSignature(node);

    if (calledMethod.expression.kind === ts.SyntaxKind.SuperKeyword) {
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
        const [callPath, parameters] = transformCallAndArguments(context, node.expression, node.arguments, signature);

        return lua.createCallExpression(callPath, parameters, node);
    }
}

function transformElementCall(context: TransformationContext, node: ts.CallExpression): lua.Expression {
    const signature = context.checker.getResolvedSignature(node);
    const signatureDeclaration = signature?.getDeclaration();
    if (!signatureDeclaration || getDeclarationContextType(context, signatureDeclaration) !== ContextType.Void) {
        // A contextual parameter must be given to this call expression
        return transformContextualCallExpression(context, node, node.arguments, signature);
    } else {
        // No context
        const [expression, parameters] = transformCallAndArguments(context, node.expression, node.arguments, signature);
        return lua.createCallExpression(expression, parameters);
    }
}

export const transformCallExpression: FunctionVisitor<ts.CallExpression> = (node, context) => {
    const calledExpression = getCalledExpression(node);

    if (calledExpression.kind === ts.SyntaxKind.ImportKeyword) {
        return transformImportExpression(node, context);
    }

    if (ts.isOptionalChain(node)) {
        return transformOptionalChain(context, node);
    }

    const optionalContinuation = ts.isIdentifier(calledExpression)
        ? getOptionalContinuationData(calledExpression)
        : undefined;
    const wrapResultInTable = isMultiReturnCall(context, node) && shouldMultiReturnCallBeWrapped(context, node);

    const builtinOrExtensionResult =
        transformBuiltinCallExpression(context, node) ?? transformLanguageExtensionCallExpression(context, node);
    if (builtinOrExtensionResult) {
        if (optionalContinuation !== undefined) {
            context.diagnostics.push(unsupportedBuiltinOptionalCall(node));
        }
        return wrapResultInTable ? wrapInTable(builtinOrExtensionResult) : builtinOrExtensionResult;
    }

    if (ts.isPropertyAccessExpression(calledExpression)) {
        const result = transformPropertyCall(context, node, calledExpression);
        return wrapResultInTable ? wrapInTable(result) : result;
    }

    if (ts.isElementAccessExpression(calledExpression)) {
        const result = transformElementCall(context, node);
        return wrapResultInTable ? wrapInTable(result) : result;
    }

    const signature = context.checker.getResolvedSignature(node);

    // Handle super calls properly
    if (calledExpression.kind === ts.SyntaxKind.SuperKeyword) {
        const parameters = transformArguments(context, node.arguments, signature, ts.factory.createThis());

        return lua.createCallExpression(
            lua.createTableIndexExpression(
                context.transformExpression(ts.factory.createSuper()),
                lua.createStringLiteral("____constructor")
            ),
            parameters
        );
    }

    let callPath: lua.Expression;
    let parameters: lua.Expression[];
    const isContextualCall = isContextualCallExpression(context, signature);
    if (!isContextualCall) {
        [callPath, parameters] = transformCallAndArguments(context, calledExpression, node.arguments, signature);
    } else {
        // if is optionalContinuation, context will be handled by transformOptionalChain.
        const useGlobalContext = !context.isStrict && optionalContinuation === undefined;
        const callContext = useGlobalContext ? ts.factory.createIdentifier("_G") : ts.factory.createNull();
        [callPath, parameters] = transformCallAndArguments(
            context,
            calledExpression,
            node.arguments,
            signature,
            callContext
        );
    }

    const callExpression = lua.createCallExpression(callPath, parameters, node);
    if (optionalContinuation && isContextualCall) {
        optionalContinuation.contextualCall = callExpression;
    }
    return wrapResultInTable ? wrapInTable(callExpression) : callExpression;
};

function isContextualCallExpression(context: TransformationContext, signature: ts.Signature | undefined): boolean {
    const declaration = signature?.getDeclaration();
    if (!declaration) {
        return !context.options.noImplicitSelf;
    }
    return getDeclarationContextType(context, declaration) !== ContextType.Void;
}

export function getCalledExpression(node: ts.CallExpression): ts.Expression {
    return ts.skipOuterExpressions(node.expression);
}
