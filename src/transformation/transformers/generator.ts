import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { wrapInTable } from "../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { Scope } from "../utils/scope";
import { transformFunctionBody } from "./function";

export function transformGeneratorFunctionBody(
    context: TransformationContext,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    body: ts.Block,
    spreadIdentifier?: tstl.Identifier
): [tstl.Statement[], Scope] {
    importLuaLibFeature(context, LuaLibFeature.Symbol);
    const [functionBody, functionScope] = transformFunctionBody(context, parameters, body);

    const coroutineIdentifier = tstl.createIdentifier("____co");
    const valueIdentifier = tstl.createIdentifier("____value");
    const errIdentifier = tstl.createIdentifier("____err");
    const itIdentifier = tstl.createIdentifier("____it");

    // local ____co = coroutine.create(originalFunction)
    const coroutine = tstl.createVariableDeclarationStatement(
        coroutineIdentifier,
        tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("create")),
            [tstl.createFunctionExpression(tstl.createBlock(functionBody))]
        )
    );

    const nextBody = [];
    // coroutine.resume(__co, ...)
    const resumeCall = tstl.createCallExpression(
        tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("resume")),
        [coroutineIdentifier, tstl.createDotsLiteral()]
    );

    // ____err, ____value = coroutine.resume(____co, ...)
    nextBody.push(tstl.createVariableDeclarationStatement([errIdentifier, valueIdentifier], resumeCall));

    // if(not ____err){error(____value)}
    const errorCheck = tstl.createIfStatement(
        tstl.createUnaryExpression(errIdentifier, tstl.SyntaxKind.NotOperator),
        tstl.createBlock([
            tstl.createExpressionStatement(
                tstl.createCallExpression(tstl.createIdentifier("error"), [valueIdentifier])
            ),
        ])
    );
    nextBody.push(errorCheck);

    // coroutine.status(____co) == "dead";
    const coStatus = tstl.createCallExpression(
        tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("status")),
        [coroutineIdentifier]
    );
    const status = tstl.createBinaryExpression(
        coStatus,
        tstl.createStringLiteral("dead"),
        tstl.SyntaxKind.EqualityOperator
    );

    // {done = coroutine.status(____co) == "dead"; value = ____value}
    const iteratorResult = tstl.createTableExpression([
        tstl.createTableFieldExpression(status, tstl.createStringLiteral("done")),
        tstl.createTableFieldExpression(valueIdentifier, tstl.createStringLiteral("value")),
    ]);
    nextBody.push(tstl.createReturnStatement([iteratorResult]));

    // function(____, ...)
    const nextFunctionDeclaration = tstl.createFunctionExpression(
        tstl.createBlock(nextBody),
        [tstl.createAnonymousIdentifier()],
        tstl.createDotsLiteral()
    );

    // ____it = {next = function(____, ...)}
    const iterator = tstl.createVariableDeclarationStatement(
        itIdentifier,
        tstl.createTableExpression([
            tstl.createTableFieldExpression(nextFunctionDeclaration, tstl.createStringLiteral("next")),
        ])
    );

    const symbolIterator = tstl.createTableIndexExpression(
        tstl.createIdentifier("Symbol"),
        tstl.createStringLiteral("iterator")
    );

    const block = [
        coroutine,
        iterator,
        //____it[Symbol.iterator] = {return ____it}
        tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(itIdentifier, symbolIterator),
            tstl.createFunctionExpression(tstl.createBlock([tstl.createReturnStatement([itIdentifier])]))
        ),
        //return ____it
        tstl.createReturnStatement([itIdentifier]),
    ];

    if (spreadIdentifier) {
        const spreadTable = wrapInTable(tstl.createDotsLiteral());
        block.unshift(tstl.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
    }

    return [block, functionScope];
}

const transformYieldExpression: FunctionVisitor<ts.YieldExpression> = (expression, context) => {
    return tstl.createCallExpression(
        tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("yield")),
        expression.expression ? [context.transformExpression(expression.expression)] : [],
        expression
    );
};

export const generatorPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.YieldExpression]: transformYieldExpression,
    },
};
