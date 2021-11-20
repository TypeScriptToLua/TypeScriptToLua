import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { assert, assertNever } from "../../utils";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { transformPropertyAccessExpressionWithCapture, transformElementAccessExpressionWithCapture } from "./access";
import { shouldMoveToTemp } from "./expression-list";

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
    isNewTemp?: boolean;
}

function transformWithCapturedThisValue(context: TransformationContext, node: ts.Expression): ExpressionWithThisValue {
    if (ts.isParenthesizedExpression(node)) {
        return transformWithCapturedThisValue(context, node.expression);
    }
    if (ts.isPropertyAccessExpression(node)) {
        return transformPropertyAccessExpressionWithCapture(context, node, true);
    }
    if (ts.isElementAccessExpression(node)) {
        return transformElementAccessExpressionWithCapture(context, node, true);
    }
    return { expression: context.transformExpression(node) };
}

export function captureThisValue(
    context: TransformationContext,
    expression: lua.Expression,
    tsOriginal: ts.Node
): { thisValue: lua.Expression; isNewTemp?: boolean } {
    if (!shouldMoveToTemp(context, expression, tsOriginal) && !isOptionalContinuation(tsOriginal)) {
        return { thisValue: expression };
    }
    const tempIdentifier = context.createTempNameForLuaExpression(expression);
    const tempAssignment = lua.createAssignmentStatement(tempIdentifier, expression, tsOriginal);
    context.addPrecedingStatements(tempAssignment);
    return { thisValue: lua.cloneIdentifier(tempIdentifier, tsOriginal), isNewTemp: true };
}

export interface OptionalContinuation {
    contextualCall?: lua.CallExpression;
}

const optionalContinuations = new WeakMap<ts.Identifier, OptionalContinuation>();

// should be translated verbatim to lua
function createOptionalContinuationIdentifier(text: string, tsOriginal: ts.Expression): ts.Identifier {
    const identifier = ts.factory.createIdentifier(text);
    ts.setOriginalNode(identifier, tsOriginal);
    optionalContinuations.set(identifier, {});
    return identifier;
}
export function isOptionalContinuation(node: ts.Node): boolean {
    return ts.isIdentifier(node) && optionalContinuations.has(node);
}
export function getOptionalContinuationData(identifier: ts.Identifier): OptionalContinuation | undefined {
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
    const tempId = context.createTempNameForNode(node);
    const tempName = tempId.text;

    // (a)?.b.c.d -> { (a), [?.b, .c, .d] }
    const { expression, chain } = flattenChain(node);

    // build temp.b.c.d
    const tsTempId = createOptionalContinuationIdentifier(tempName, expression);
    let tsRightExpression: ts.Expression = tsTempId;
    for (const link of chain) {
        if (ts.isPropertyAccessExpression(link)) {
            tsRightExpression = ts.factory.createPropertyAccessExpression(tsRightExpression, link.name);
        } else if (ts.isElementAccessExpression(link)) {
            tsRightExpression = ts.factory.createElementAccessExpression(tsRightExpression, link.argumentExpression);
        } else if (ts.isCallExpression(link)) {
            tsRightExpression = ts.factory.createCallExpression(tsRightExpression, undefined, link.arguments);
        } else {
            assert(!ts.isNonNullChain(link));
            assertNever(link);
        }
        ts.setOriginalNode(tsRightExpression, link);
    }

    if (isDelete) {
        tsRightExpression = ts.factory.createDeleteExpression(tsRightExpression);
        ts.setOriginalNode(tsRightExpression, isDelete);
    }

    // transform right expression first to check if thisValue capture is needed
    // capture and return thisValue if requested from outside
    let returnThisValue: lua.Expression | undefined;
    let returnIsNewTemp: boolean | undefined;
    const [rightPrecedingStatements, rightAssignment] = transformInPrecedingStatementScope(context, () => {
        let result: lua.Expression;
        if (captureThisValue) {
            ({
                expression: result,
                thisValue: returnThisValue,
                isNewTemp: returnIsNewTemp,
            } = transformWithCapturedThisValue(context, tsRightExpression));
        } else {
            result = context.transformExpression(tsRightExpression);
        }
        return lua.createAssignmentStatement(tempId, result);
    });

    // transform left expression, handle thisValue if needed by rightExpression
    let capturedThisValue: lua.Expression | undefined;
    let capturedIsNewTemp: boolean | undefined;
    const rightContextualCall = getOptionalContinuationData(tsTempId)?.contextualCall;
    const [leftPrecedingStatements, leftExpression] = transformInPrecedingStatementScope(context, () => {
        let result: lua.Expression;
        if (rightContextualCall) {
            ({
                expression: result,
                thisValue: capturedThisValue,
                isNewTemp: capturedIsNewTemp,
            } = transformWithCapturedThisValue(context, expression));
        } else {
            result = context.transformExpression(expression);
        }
        return result;
    });
    if (capturedThisValue) {
        rightContextualCall!.params[0] = capturedThisValue;
        if (capturedIsNewTemp) {
            assert(lua.isIdentifier(capturedThisValue));
            context.addPrecedingStatements(lua.createVariableDeclarationStatement(capturedThisValue));
        }
    }

    // <left preceding statements>
    // local temp = <left>
    // if temp ~= nil then
    //   <right preceding statements>
    //   temp = temp.b.c.d
    // end
    // return temp

    context.addPrecedingStatements([
        ...leftPrecedingStatements,
        lua.createVariableDeclarationStatement(tempId, leftExpression),
        lua.createIfStatement(
            lua.createBinaryExpression(tempId, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator),
            lua.createBlock([...rightPrecedingStatements, rightAssignment])
        ),
    ]);
    return {
        expression: tempId,
        thisValue: returnThisValue,
        isNewTemp: returnIsNewTemp,
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
