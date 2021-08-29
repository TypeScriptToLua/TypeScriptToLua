import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { castArray } from "../../utils";
import { TransformationContext } from "../context";
import { createImmediatelyInvokedFunctionExpression } from "./lua-ast";
import { ScopeType, pushScope, popScope } from "./scope";

export interface ImmediatelyInvokedFunctionParameters {
    statements: lua.Statement | lua.Statement[];
    result: lua.Expression | lua.Expression[];
}

export function transformToImmediatelyInvokedFunctionExpression(
    context: TransformationContext,
    transformFunction: () => ImmediatelyInvokedFunctionParameters,
    tsOriginal?: ts.Node
): lua.Expression {
    const scope = pushScope(context, ScopeType.Block);
    let { statements, result } = transformFunction();
    [statements, result] = createImmediatelyInvokedFunctionExpression(scope, castArray(statements), result, tsOriginal);
    context.addPrecedingStatements(statements);
    popScope(context);
    return result;
}
