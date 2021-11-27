import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext, tempSymbolId } from "../context";
import { assert, assertNever } from "../../utils";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { transformPropertyAccessExpressionWithCapture, transformElementAccessExpressionWithCapture } from "./access";
import { shouldMoveToTemp } from "./expression-list";

type NormalOptionalChain = ts.PropertyAccessChain | ts.ElementAccessChain | ts.CallChain;

function skipNonNullChains(chain: ts.OptionalChain): NormalOptionalChain {
    while (ts.isNonNullChain(chain)) {
        chain = chain.expression as ts.OptionalChain;
    }
    return chain;
}

function flattenChain(chain: ts.OptionalChain) {
    chain = skipNonNullChains(chain);
    const links: NormalOptionalChain[] = [chain];
    while (!chain.questionDotToken && !ts.isTaggedTemplateExpression(chain)) {
        const nextLink: ts.Expression = chain.expression;
        assert(ts.isOptionalChain(nextLink));
        chain = skipNonNullChains(nextLink);
        links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
}

export interface ExpressionWithThisValue {
    expression: lua.Expression;
    thisValue?: lua.Expression;
}

function transformExpressionWithThisValueCapture(
    context: TransformationContext,
    node: ts.Expression,
    thisValueCapture: lua.Identifier
): ExpressionWithThisValue {
    if (ts.isParenthesizedExpression(node)) {
        return transformExpressionWithThisValueCapture(context, node.expression, thisValueCapture);
    }
    if (ts.isPropertyAccessExpression(node)) {
        return transformPropertyAccessExpressionWithCapture(context, node, thisValueCapture);
    }
    if (ts.isElementAccessExpression(node)) {
        return transformElementAccessExpressionWithCapture(context, node, thisValueCapture);
    }
    return { expression: context.transformExpression(node) };
}

// returns thisValueCapture exactly if a temp variable was used.
export function captureThisValue(
    context: TransformationContext,
    expression: lua.Expression,
    thisValueCapture: lua.Identifier,
    tsOriginal: ts.Node
): lua.Expression {
    if (!shouldMoveToTemp(context, expression, tsOriginal) && !isOptionalContinuation(tsOriginal)) {
        return expression;
    }
    const tempAssignment = lua.createAssignmentStatement(thisValueCapture, expression, tsOriginal);
    context.addPrecedingStatements(tempAssignment);
    return thisValueCapture;
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
    return transformOptionalChainWithCapture(context, node, undefined).expression;
}

export function transformOptionalChainWithCapture(
    context: TransformationContext,
    node: ts.OptionalChain,
    thisValueCapture: lua.Identifier | undefined,
    isDelete?: ts.DeleteExpression
): ExpressionWithThisValue {
    const luaTemp = context.createTempNameForNode(node);

    const { expression: tsLeftExpression, chain } = flattenChain(node);

    // build temp.b.c.d
    const tsTemp = createOptionalContinuationIdentifier(luaTemp.text, tsLeftExpression);
    let tsRightExpression: ts.Expression = tsTemp;
    for (const link of chain) {
        if (ts.isPropertyAccessExpression(link)) {
            tsRightExpression = ts.factory.createPropertyAccessExpression(tsRightExpression, link.name);
        } else if (ts.isElementAccessExpression(link)) {
            tsRightExpression = ts.factory.createElementAccessExpression(tsRightExpression, link.argumentExpression);
        } else if (ts.isCallExpression(link)) {
            tsRightExpression = ts.factory.createCallExpression(tsRightExpression, undefined, link.arguments);
        } else {
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
    const [rightPrecedingStatements, rightAssignment] = transformInPrecedingStatementScope(context, () => {
        let result: lua.Expression;
        if (thisValueCapture) {
            ({ expression: result, thisValue: returnThisValue } = transformExpressionWithThisValueCapture(
                context,
                tsRightExpression,
                thisValueCapture
            ));
        } else {
            result = context.transformExpression(tsRightExpression);
        }
        return lua.createAssignmentStatement(luaTemp, result);
    });

    // transform left expression, handle thisValue if needed by rightExpression
    const thisValueCaptureName = context.createTempName("this");
    const leftThisValueTemp = lua.createIdentifier(thisValueCaptureName, undefined, tempSymbolId);
    let capturedThisValue: lua.Expression | undefined;

    const rightContextualCall = getOptionalContinuationData(tsTemp)?.contextualCall;
    const [leftPrecedingStatements, leftExpression] = transformInPrecedingStatementScope(context, () => {
        let result: lua.Expression;
        if (rightContextualCall) {
            ({ expression: result, thisValue: capturedThisValue } = transformExpressionWithThisValueCapture(
                context,
                tsLeftExpression,
                leftThisValueTemp
            ));
        } else {
            result = context.transformExpression(tsLeftExpression);
        }
        return result;
    });
    if (capturedThisValue) {
        rightContextualCall!.params[0] = capturedThisValue;
        if (capturedThisValue === leftThisValueTemp) {
            context.addPrecedingStatements(lua.createVariableDeclarationStatement(leftThisValueTemp));
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
        lua.createVariableDeclarationStatement(luaTemp, leftExpression),
        lua.createIfStatement(
            lua.createBinaryExpression(luaTemp, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator),
            lua.createBlock([...rightPrecedingStatements, rightAssignment])
        ),
    ]);
    return {
        expression: luaTemp,
        thisValue: returnThisValue,
    };
}

export function transformOptionalDeleteExpression(
    context: TransformationContext,
    node: ts.DeleteExpression,
    innerExpression: ts.OptionalChain
) {
    transformOptionalChainWithCapture(context, innerExpression, undefined, node);
    return lua.createBooleanLiteral(true, node);
}
