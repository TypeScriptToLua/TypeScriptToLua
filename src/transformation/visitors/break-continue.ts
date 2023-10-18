import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { findScope, LoopContinued, ScopeType } from "../utils/scope";

export const transformBreakStatement: FunctionVisitor<ts.BreakStatement> = (breakStatement, context) => {
    void context;
    return lua.createBreakStatement(breakStatement);
};

export const transformContinueStatement: FunctionVisitor<ts.ContinueStatement> = (statement, context) => {
    const scope = findScope(context, ScopeType.Loop);
    const continuedWith =
        context.luaTarget === LuaTarget.Universal ||
        context.luaTarget === LuaTarget.Lua50 ||
        context.luaTarget === LuaTarget.Lua51
            ? LoopContinued.WithRepeatBreak
            : LoopContinued.WithGoto;

    if (scope) {
        scope.loopContinued = continuedWith;
    }

    const label = `__continue${scope?.id ?? ""}`;

    switch (continuedWith) {
        case LoopContinued.WithGoto:
            return lua.createGotoStatement(label, statement);

        case LoopContinued.WithRepeatBreak:
            return [
                lua.createAssignmentStatement(lua.createIdentifier(label), lua.createBooleanLiteral(true), statement),
                lua.createBreakStatement(statement),
            ];
    }
};
