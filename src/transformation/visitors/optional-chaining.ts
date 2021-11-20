import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext, tempSymbolId } from "../context";
import { assert, assertNever } from "../../utils";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { createInternalIdentifier, getInternalIdentifierData } from "../utils/typescript/internal-identifier";
import { transformPropertyAccessExpressionWithCapture, transformElementAccessExpressionWithCapture } from "./access";
import { ExpressionWithThisValue } from "../utils/lua-ast";

function flattenChain(chain: ts.OptionalChain) {
    assert(!ts.isNonNullChain(chain));
    const links: ts.OptionalChain[] = [chain];
    while (!chain.questionDotToken && !ts.isTaggedTemplateExpression(chain)) {
        const nextLink: ts.Expression = ts.skipPartiallyEmittedExpressions(chain.expression);
        assert(ts.isOptionalChain(nextLink) && !ts.isNonNullChain(nextLink));
        chain = nextLink;
        links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
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

export function transformOptionalChain(context: TransformationContext, node: ts.OptionalChain): lua.Expression {
    return transformOptionalChainWithCapture(context, node, false).expression;
}

export function transformOptionalChainWithCapture(
    context: TransformationContext,
    node: ts.OptionalChain,
    captureThisValue: boolean
): ExpressionWithThisValue {
    const tempName = context.createTempName("optional");
    const temp = lua.createIdentifier(tempName, undefined, tempSymbolId);

    // (a)?.b.c.d -> { (a), [?.b, .c, .d] }
    const { expression, chain } = flattenChain(node);

    // build temp.b.c.d (typescript)
    const baseExpression = createInternalIdentifier(tempName, expression, { isTransformedOptionalBase: true });

    let rightExpression: ts.Expression = baseExpression;
    for (const segment of chain) {
        if (ts.isPropertyAccessExpression(segment) || ts.isElementAccessExpression(segment)) {
            rightExpression = ts.isPropertyAccessExpression(segment)
                ? ts.factory.createPropertyAccessExpression(rightExpression, segment.name)
                : ts.factory.createElementAccessExpression(rightExpression, segment.argumentExpression);
        } else if (ts.isCallExpression(segment)) {
            rightExpression = ts.factory.createCallExpression(rightExpression, undefined, segment.arguments);
        } else {
            assert(!ts.isNonNullChain(segment));
            assertNever(segment);
        }
        ts.setOriginalNode(rightExpression, segment);
    }

    // transform chain
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

    const baseContextualCall = getInternalIdentifierData(baseExpression)?.optionalBaseContextualCall;

    let leftExpr: lua.Expression;
    if (baseContextualCall) {
        const { expression: transformedExpression, thisValue } = transformAndCaptureThisValue(context, expression);
        leftExpr = transformedExpression;
        if (thisValue) {
            baseContextualCall.params[0] = thisValue;
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

    context.addPrecedingStatements(lua.createVariableDeclarationStatement(temp, leftExpr));
    context.addPrecedingStatements([
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
