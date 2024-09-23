import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { tempSymbolId, TransformationContext } from "../context";
import { assert, assertNever } from "../../utils";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { transformElementAccessExpressionWithCapture, transformPropertyAccessExpressionWithCapture } from "./access";
import { shouldMoveToTemp } from "./expression-list";
import { canBeFalsyWhenNotNull, expressionResultIsUsed } from "../utils/typescript";
import { wrapInStatement } from "./expression-statement";

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
    if (!shouldMoveToTemp(context, expression, tsOriginal)) {
        return expression;
    }
    const tempAssignment = lua.createAssignmentStatement(thisValueCapture, expression, tsOriginal);
    context.addPrecedingStatements(tempAssignment);
    return thisValueCapture;
}

export interface OptionalContinuation {
    contextualCall?: lua.CallExpression;
    usedIdentifiers: lua.Identifier[];
}

const optionalContinuations = new WeakMap<ts.Identifier, OptionalContinuation>();

// should be translated verbatim to lua
function createOptionalContinuationIdentifier(text: string, tsOriginal: ts.Expression): ts.Identifier {
    const identifier = ts.factory.createIdentifier(text);
    ts.setOriginalNode(identifier, tsOriginal);
    optionalContinuations.set(identifier, {
        usedIdentifiers: [],
    });
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
    tsNode: ts.OptionalChain,
    thisValueCapture: lua.Identifier | undefined,
    isDelete?: ts.DeleteExpression
): ExpressionWithThisValue {
    const luaTempName = context.createTempName("opt");

    const { expression: tsLeftExpression, chain } = flattenChain(tsNode);

    // build temp.b.c.d
    const tsTemp = createOptionalContinuationIdentifier(luaTempName, tsLeftExpression);
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
    const { precedingStatements: rightPrecedingStatements, result: rightExpression } =
        transformInPrecedingStatementScope(context, () => {
            if (!thisValueCapture) {
                return context.transformExpression(tsRightExpression);
            }

            const { expression: result, thisValue } = transformExpressionWithThisValueCapture(
                context,
                tsRightExpression,
                thisValueCapture
            );
            returnThisValue = thisValue;
            return result;
        });

    // transform left expression, handle thisValue if needed by rightExpression
    const thisValueCaptureName = context.createTempName("this");
    const leftThisValueTemp = lua.createIdentifier(thisValueCaptureName, undefined, tempSymbolId);
    let capturedThisValue: lua.Expression | undefined;

    const optionalContinuationData = getOptionalContinuationData(tsTemp);
    const rightContextualCall = optionalContinuationData?.contextualCall;
    const { precedingStatements: leftPrecedingStatements, result: leftExpression } = transformInPrecedingStatementScope(
        context,
        () => {
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
        }
    );

    // handle super calls by passing self as context
    function getLeftMostChainItem(node: ts.Node): ts.Node {
        if (ts.isPropertyAccessExpression(node)) {
            return getLeftMostChainItem(node.expression);
        } else {
            return node;
        }
    }
    if (getLeftMostChainItem(tsLeftExpression).kind === ts.SyntaxKind.SuperKeyword) {
        capturedThisValue = lua.createIdentifier("self");
    }

    // handle context
    if (rightContextualCall) {
        if (capturedThisValue) {
            rightContextualCall.params[0] = capturedThisValue;
            if (capturedThisValue === leftThisValueTemp) {
                context.addPrecedingStatements(lua.createVariableDeclarationStatement(leftThisValueTemp));
            }
        } else {
            if (context.isStrict) {
                rightContextualCall.params[0] = lua.createNilLiteral();
            } else {
                const identifier = lua.createIdentifier("_G");
                if (rightPrecedingStatements.length === 0) {
                    rightContextualCall.params[0] = identifier;
                } else {
                    const tempContext = context.createTempNameForLuaExpression(identifier);
                    rightPrecedingStatements.unshift(lua.createVariableDeclarationStatement(tempContext, identifier));
                    rightContextualCall.params[0] = tempContext;
                }
            }
        }
    }

    // evaluate optional chain
    context.addPrecedingStatements(leftPrecedingStatements);

    // try use existing variable instead of creating new one, if possible
    let leftIdentifier: lua.Identifier | undefined;
    const usedLuaIdentifiers = optionalContinuationData?.usedIdentifiers;
    const reuseLeftIdentifier =
        usedLuaIdentifiers &&
        usedLuaIdentifiers.length > 0 &&
        lua.isIdentifier(leftExpression) &&
        (rightPrecedingStatements.length === 0 || !shouldMoveToTemp(context, leftExpression, tsLeftExpression));
    if (reuseLeftIdentifier) {
        leftIdentifier = leftExpression;
        for (const usedIdentifier of usedLuaIdentifiers) {
            usedIdentifier.text = leftIdentifier.text;
        }
    } else {
        leftIdentifier = lua.createIdentifier(luaTempName, undefined, tempSymbolId);
        context.addPrecedingStatements(lua.createVariableDeclarationStatement(leftIdentifier, leftExpression));
    }

    if (!expressionResultIsUsed(tsNode) || isDelete) {
        // if left ~= nil then
        //   <right preceding statements>
        //   <right expression>
        // end

        const innerExpression = wrapInStatement(rightExpression);
        const innerStatements = rightPrecedingStatements;
        if (innerExpression) innerStatements.push(innerExpression);

        context.addPrecedingStatements(
            lua.createIfStatement(
                lua.createBinaryExpression(leftIdentifier, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator),
                lua.createBlock(innerStatements)
            )
        );
        return { expression: lua.createNilLiteral(), thisValue: returnThisValue };
    } else if (
        rightPrecedingStatements.length === 0 &&
        !canBeFalsyWhenNotNull(context, context.checker.getTypeAtLocation(tsLeftExpression))
    ) {
        // return a && a.b
        return {
            expression: lua.createBinaryExpression(leftIdentifier, rightExpression, lua.SyntaxKind.AndOperator, tsNode),
            thisValue: returnThisValue,
        };
    } else {
        let resultIdentifier: lua.Identifier;
        if (!reuseLeftIdentifier) {
            // reuse temp variable for output
            resultIdentifier = leftIdentifier;
        } else {
            resultIdentifier = lua.createIdentifier(context.createTempName("opt_result"), undefined, tempSymbolId);
            context.addPrecedingStatements(lua.createVariableDeclarationStatement(resultIdentifier));
        }
        // if left ~= nil then
        //   <right preceding statements>
        //   result = <right expression>
        // end
        // return result
        context.addPrecedingStatements(
            lua.createIfStatement(
                lua.createBinaryExpression(leftIdentifier, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator),
                lua.createBlock([
                    ...rightPrecedingStatements,
                    lua.createAssignmentStatement(resultIdentifier, rightExpression),
                ])
            )
        );
        return { expression: resultIdentifier, thisValue: returnThisValue };
    }
}

export function transformOptionalDeleteExpression(
    context: TransformationContext,
    node: ts.DeleteExpression,
    innerExpression: ts.OptionalChain
) {
    transformOptionalChainWithCapture(context, innerExpression, undefined, node);
    return lua.createBooleanLiteral(true, node);
}
