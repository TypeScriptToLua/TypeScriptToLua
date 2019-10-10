import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as tstl from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { UndefinedScope, UnsupportedForTarget } from "../utils/errors";
import { findScope, ScopeType } from "../utils/scope";

export const transformBreakStatement: FunctionVisitor<ts.BreakStatement> = (breakStatement, context) => {
    const breakableScope = findScope(context, ScopeType.Loop | ScopeType.Switch);
    if (breakableScope === undefined) {
        throw UndefinedScope();
    }

    if (breakableScope.type === ScopeType.Switch) {
        return tstl.createGotoStatement(`____switch${breakableScope.id}_end`);
    } else {
        return tstl.createBreakStatement(breakStatement);
    }
};

export const transformContinueStatement: FunctionVisitor<ts.ContinueStatement> = (statement, context) => {
    if (context.luaTarget === LuaTarget.Lua51) {
        throw UnsupportedForTarget("Continue statement", LuaTarget.Lua51, statement);
    }

    const scope = findScope(context, ScopeType.Loop);
    if (scope === undefined) {
        throw UndefinedScope();
    }

    scope.loopContinued = true;
    return tstl.createGotoStatement(`__continue${scope.id}`, statement);
};
