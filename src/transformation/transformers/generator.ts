import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { wrapInTable } from "../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { Scope } from "../utils/scope";
import { transformFunctionBody } from "./function";

export function transformGeneratorFunctionBody(
    context: TransformationContext,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    body: ts.Block,
    spreadIdentifier?: lua.Identifier
): [lua.Statement[], Scope] {
    importLuaLibFeature(context, LuaLibFeature.Symbol);
    const [functionBody, functionScope] = transformFunctionBody(context, parameters, body);

    const coroutineIdentifier = lua.createIdentifier("____co");
    const valueIdentifier = lua.createIdentifier("____value");
    const errIdentifier = lua.createIdentifier("____err");
    const itIdentifier = lua.createIdentifier("____it");

    // local ____co = coroutine.create(originalFunction)
    const coroutine = lua.createVariableDeclarationStatement(
        coroutineIdentifier,
        lua.createCallExpression(
            lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("create")),
            [lua.createFunctionExpression(lua.createBlock(functionBody))]
        )
    );

    const nextBody = [];
    // coroutine.resume(__co, ...)
    const resumeCall = lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("resume")),
        [coroutineIdentifier, lua.createDotsLiteral()]
    );

    // ____err, ____value = coroutine.resume(____co, ...)
    nextBody.push(lua.createVariableDeclarationStatement([errIdentifier, valueIdentifier], resumeCall));

    // if(not ____err){error(____value)}
    const errorCheck = lua.createIfStatement(
        lua.createUnaryExpression(errIdentifier, lua.SyntaxKind.NotOperator),
        lua.createBlock([
            lua.createExpressionStatement(lua.createCallExpression(lua.createIdentifier("error"), [valueIdentifier])),
        ])
    );
    nextBody.push(errorCheck);

    // coroutine.status(____co) == "dead";
    const coStatus = lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("status")),
        [coroutineIdentifier]
    );
    const status = lua.createBinaryExpression(
        coStatus,
        lua.createStringLiteral("dead"),
        lua.SyntaxKind.EqualityOperator
    );

    // {done = coroutine.status(____co) == "dead"; value = ____value}
    const iteratorResult = lua.createTableExpression([
        lua.createTableFieldExpression(status, lua.createStringLiteral("done")),
        lua.createTableFieldExpression(valueIdentifier, lua.createStringLiteral("value")),
    ]);
    nextBody.push(lua.createReturnStatement([iteratorResult]));

    // function(____, ...)
    const nextFunctionDeclaration = lua.createFunctionExpression(
        lua.createBlock(nextBody),
        [lua.createAnonymousIdentifier()],
        lua.createDotsLiteral()
    );

    // ____it = {next = function(____, ...)}
    const iterator = lua.createVariableDeclarationStatement(
        itIdentifier,
        lua.createTableExpression([
            lua.createTableFieldExpression(nextFunctionDeclaration, lua.createStringLiteral("next")),
        ])
    );

    const symbolIterator = lua.createTableIndexExpression(
        lua.createIdentifier("Symbol"),
        lua.createStringLiteral("iterator")
    );

    const block = [
        coroutine,
        iterator,
        //____it[Symbol.iterator] = {return ____it}
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(itIdentifier, symbolIterator),
            lua.createFunctionExpression(lua.createBlock([lua.createReturnStatement([itIdentifier])]))
        ),
        //return ____it
        lua.createReturnStatement([itIdentifier]),
    ];

    if (spreadIdentifier) {
        const spreadTable = wrapInTable(lua.createDotsLiteral());
        block.unshift(lua.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
    }

    return [block, functionScope];
}

export const transformYieldExpression: FunctionVisitor<ts.YieldExpression> = (expression, context) => {
    return lua.createCallExpression(
        lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("yield")),
        expression.expression ? [context.transformExpression(expression.expression)] : [],
        expression
    );
};
