import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { performHoisting, popScope, pushScope, Scope, ScopeType } from "../utils/scope";

export function transformBlockOrStatement(context: TransformationContext, statement: ts.Statement): lua.Statement[] {
    return context.transformStatements(ts.isBlock(statement) ? statement.statements : statement);
}

export function transformScopeBlock(
    context: TransformationContext,
    node: ts.Block,
    scopeType: ScopeType
): [lua.Block, Scope] {
    pushScope(context, scopeType);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    const scope = popScope(context);
    return [lua.createBlock(statements, node), scope];
}

export const transformBlock: FunctionVisitor<ts.Block> = (node, context) => {
    pushScope(context, ScopeType.Block);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    popScope(context);
    return lua.createDoStatement(statements, node);
};
