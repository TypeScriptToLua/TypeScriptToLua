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

    const continuedWith = {
        [LuaTarget.Universal]: LoopContinued.WithRepeatBreak,
        [LuaTarget.Lua50]: LoopContinued.WithRepeatBreak,
        [LuaTarget.Lua51]: LoopContinued.WithRepeatBreak,
        [LuaTarget.Lua52]: LoopContinued.WithGoto,
        [LuaTarget.Lua53]: LoopContinued.WithGoto,
        [LuaTarget.Lua54]: LoopContinued.WithGoto,
        [LuaTarget.Lua55]: LoopContinued.WithGoto,
        [LuaTarget.LuaJIT]: LoopContinued.WithGoto,
        [LuaTarget.Luau]: LoopContinued.WithContinue,
    }[context.luaTarget];

    if (scope) {
        scope.loopContinued = continuedWith;
    }

    const label = `__continue${scope?.id ?? ""}`;

    switch (continuedWith) {
        case LoopContinued.WithGoto:
            return lua.createGotoStatement(label, statement);

        case LoopContinued.WithContinue:
            return lua.createContinueStatement(statement);

        case LoopContinued.WithRepeatBreak:
            return [
                lua.createAssignmentStatement(lua.createIdentifier(label), lua.createBooleanLiteral(true), statement),
                lua.createBreakStatement(statement),
            ];
    }
};
