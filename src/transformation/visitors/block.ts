import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { performHoisting, Scope, ScopeType } from "../utils/scope";

export function transformBlockOrStatement(context: TransformationContext, statement: ts.Statement): lua.Statement[] {
    return context.transformStatements(ts.isBlock(statement) ? statement.statements : statement);
}

export function transformScopeBlock(
    context: TransformationContext,
    node: ts.Block,
    scopeType: ScopeType
): [lua.Block, Scope] {
    context.pushScope(scopeType);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    const scope = context.popScope();
    return [lua.createBlock(statements, node), scope];
}

export const transformBlock: FunctionVisitor<ts.Block> = (node, context) => {
    context.pushScope(ScopeType.Block);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    context.popScope();
    return lua.createDoStatement(statements, node);
};
