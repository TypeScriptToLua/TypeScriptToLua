import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext, tempSymbolId } from "../context";
import { assert, assertNever } from "../../utils";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { transformPropertyAccessExpressionWithCapture, transformElementAccessExpressionWithCapture } from "./access";

function flattenChain(chain: ts.OptionalChain) {
    assert(!ts.isNonNullChain(chain));
    const links: ts.OptionalChain[] = [chain];
    while (!chain.questionDotToken && !ts.isTaggedTemplateExpression(chain)) {
        const nextLink: ts.Expression = chain.expression;
        assert(ts.isOptionalChain(nextLink) && !ts.isNonNullChain(nextLink));
        chain = nextLink;
        links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
}

export interface ExpressionWithThisValue {
    expression: lua.Expression;
    thisValue?: lua.Expression;
}

function transformAndCaptureThisValue(context: TransformationContext, node: ts.Expression): ExpressionWithThisValue {
    if (ts.isParenthesizedExpression(node)) {
        return transformAndCaptureThisValue(context, node.expression);
    }
    if (ts.isPropertyAccessExpression(node)) {
        return transformPropertyAccessExpressionWithCapture(context, node, true);
    }
    if (ts.isElementAccessExpression(node)) {
        return transformElementAccessExpressionWithCapture(context, node, true);
    }
    return { expression: context.transformExpression(node) };
}

export interface OptionalContinuation {
    contextualCall?: lua.CallExpression;
}

const optionalContinuations = new WeakMap<ts.Identifier, OptionalContinuation>();

// an internal identifier will be transformed verbatim to lua
function createOptionalContinuationIdentifier(text: string, tsOriginal: ts.Expression): ts.Identifier {
    const identifier = ts.factory.createIdentifier(text);
    ts.setOriginalNode(identifier, tsOriginal);
    optionalContinuations.set(identifier, {});
    return identifier;
}
export function isOptionalContinuation(node: ts.Node): boolean {
    return ts.isIdentifier(node) && optionalContinuations.has(node);
}
export function getOptionalContinuation(identifier: ts.Identifier): OptionalContinuation | undefined {
    return optionalContinuations.get(identifier);
}

export function transformOptionalChain(context: TransformationContext, node: ts.OptionalChain): lua.Expression {
    return transformOptionalChainWithCapture(context, node, false).expression;
}

export function transformOptionalChainWithCapture(
    context: TransformationContext,
    node: ts.OptionalChain,
    captureThisValue: boolean,
    isDelete?: ts.DeleteExpression
): ExpressionWithThisValue {
    const tempName = context.createTempName("optional");
    const temp = lua.createIdentifier(tempName, undefined, tempSymbolId);

    // (a)?.b.c.d -> { (a), [?.b, .c, .d] }
    const { expression, chain } = flattenChain(node);

    // build temp.b.c.d
    const baseExpression = createOptionalContinuationIdentifier(tempName, expression);
    let rightExpression: ts.Expression = baseExpression;
    for (const link of chain) {
        if (ts.isPropertyAccessExpression(link)) {
            rightExpression = ts.factory.createPropertyAccessExpression(rightExpression, link.name);
        } else if (ts.isElementAccessExpression(link)) {
            rightExpression = ts.factory.createElementAccessExpression(rightExpression, link.argumentExpression);
        } else if (ts.isCallExpression(link)) {
            rightExpression = ts.factory.createCallExpression(rightExpression, undefined, link.arguments);
        } else {
            assert(!ts.isNonNullChain(link));
            assertNever(link);
        }
        ts.setOriginalNode(rightExpression, link);
    }

    if (isDelete) {
        rightExpression = ts.factory.createDeleteExpression(rightExpression);
        ts.setOriginalNode(rightExpression, isDelete);
    }

    // transform temp.b.d.c
    let returnThisValue: lua.Expression | undefined;
    const [precedingStatements, resultAssignment] = transformInPrecedingStatementScope(context, () => {
        let result: lua.Expression;
        if (captureThisValue) {
            ({ expression: result, thisValue: returnThisValue } = transformAndCaptureThisValue(
                context,
                rightExpression
            ));
        } else {
            result = context.transformExpression(rightExpression);
        }
        return lua.createAssignmentStatement(temp, result);
    });

    const contextualCall = getOptionalContinuation(baseExpression)?.contextualCall;

    // transform left expression, set contextual call if exists
    let leftExpr: lua.Expression;
    if (contextualCall) {
        const { expression: transformedExpression, thisValue } = transformAndCaptureThisValue(context, expression);
        leftExpr = transformedExpression;
        if (thisValue) {
            contextualCall.params[0] = thisValue;
        }
    } else {
        leftExpr = context.transformExpression(expression);
    }

    // local temp = <left>
    // if temp ~= nil then
    //   <preceding statements>
    //   temp = a.b.c.d
    // end
    // return temp

    context.addPrecedingStatements([
        lua.createVariableDeclarationStatement(temp, leftExpr),
        lua.createIfStatement(
            lua.createBinaryExpression(temp, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator),
            lua.createBlock([...precedingStatements, resultAssignment])
        ),
    ]);
    return {
        expression: temp,
        thisValue: returnThisValue,
    };
}

export function transformOptionalDeleteExpression(
    context: TransformationContext,
    node: ts.DeleteExpression,
    innerExpression: ts.OptionalChain
) {
    transformOptionalChainWithCapture(context, innerExpression, false, node);
    return lua.createBooleanLiteral(true, node);
}
