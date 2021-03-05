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
): lua.CallExpression {
    pushScope(context, ScopeType.Function);
    const { statements, result } = transformFunction();
    popScope(context);
    return createImmediatelyInvokedFunctionExpression(castArray(statements), result, tsOriginal);
}
