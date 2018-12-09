import * as ts from "typescript";

export enum LuaSyntaxKind {
    ConcatExpression = 10000,
    FunctionCallExpression,
    MethodCallExpression,
}

export interface LuaNode extends ts.Node {
    luaKind: LuaSyntaxKind;
}

export type LuaConcatExpression = LuaNode & ts.BinaryExpression;
export type LuaCallExpression = LuaNode & ts.CallExpression;
