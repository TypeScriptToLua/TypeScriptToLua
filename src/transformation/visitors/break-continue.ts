import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { findScope, findTryScopesBefore, LoopContinued, ScopeType } from "../utils/scope";

export const transformBreakStatement: FunctionVisitor<ts.BreakStatement> = (breakStatement, context) =>
    createBreak(context, breakStatement);

export const transformContinueStatement: FunctionVisitor<ts.ContinueStatement> = (statement, context) =>
    createContinue(context, statement);

/**
 * Creates a break out of the closest loop or switch. Inside a try or catch block (a Lua function),
 * this sets the `____hasBroken` flag and returns; the try statement breaks after it ran.
 * Pass `flagIsSet` when the flag is already true, to skip setting it again.
 */
export function createBreak(context: TransformationContext, node?: ts.Node, flagIsSet = false): lua.Statement[] {
    const tryScopes = findTryScopesBefore(context, ScopeType.Loop | ScopeType.Switch);
    if (tryScopes.length > 0) {
        for (const tryScope of tryScopes) {
            tryScope.tryHasBreak = true;
        }
        return leaveTryFunction("____hasBroken", node, flagIsSet);
    }
    return [lua.createBreakStatement(node)];
}

/**
 * Creates a continue of the closest loop. Inside a try or catch block (a Lua function),
 * this sets the `____hasContinued` flag and returns; the try statement continues after it ran.
 * Pass `flagIsSet` when the flag is already true, to skip setting it again.
 */
export function createContinue(context: TransformationContext, node?: ts.Node, flagIsSet = false): lua.Statement[] {
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

    const tryScopes = findTryScopesBefore(context, ScopeType.Loop);
    if (tryScopes.length > 0) {
        for (const tryScope of tryScopes) {
            tryScope.tryHasContinue = continuedWith;
        }
        return leaveTryFunction("____hasContinued", node, flagIsSet);
    }

    const label = `__continue${scope?.id ?? ""}`;

    switch (continuedWith) {
        case LoopContinued.WithGoto:
            return [lua.createGotoStatement(label, node)];

        case LoopContinued.WithContinue:
            return [lua.createContinueStatement(node)];

        case LoopContinued.WithRepeatBreak:
            return [
                lua.createAssignmentStatement(lua.createIdentifier(label), lua.createBooleanLiteral(true), node),
                lua.createBreakStatement(node),
            ];
    }
}

function leaveTryFunction(flag: string, node: ts.Node | undefined, flagIsSet: boolean): lua.Statement[] {
    const statements: lua.Statement[] = [];
    if (!flagIsSet) {
        statements.push(
            lua.createAssignmentStatement(lua.createIdentifier(flag), lua.createBooleanLiteral(true), node)
        );
    }
    statements.push(lua.createReturnStatement([], node));
    return statements;
}
