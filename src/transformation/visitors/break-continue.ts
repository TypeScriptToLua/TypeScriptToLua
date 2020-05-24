import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { unsupportedForTarget } from "../utils/diagnostics";
import { findScope, ScopeType } from "../utils/scope";

export const transformBreakStatement: FunctionVisitor<ts.BreakStatement> = (breakStatement, context) => {
    const breakableScope = findScope(context, ScopeType.Loop | ScopeType.Switch);
    if (breakableScope?.type === ScopeType.Switch) {
        return lua.createGotoStatement(`____switch${breakableScope.id}_end`);
    } else {
        return lua.createBreakStatement(breakStatement);
    }
};

export const transformContinueStatement: FunctionVisitor<ts.ContinueStatement> = (statement, context) => {
    if (context.luaTarget === LuaTarget.Universal || context.luaTarget === LuaTarget.Lua51) {
        context.diagnostics.push(unsupportedForTarget(statement, "Continue statement", LuaTarget.Lua51));
    }

    const scope = findScope(context, ScopeType.Loop);

    if (scope) {
        scope.loopContinued = true;
    }

    return lua.createGotoStatement(`__continue${scope?.id ?? ""}`, statement);
};
