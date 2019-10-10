import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { performHoisting, popScope, pushScope, Scope, ScopeType } from "../utils/scope";

export function transformBlockOrStatement(context: TransformationContext, statement: ts.Statement): tstl.Statement[] {
    return context.transformStatements(ts.isBlock(statement) ? statement.statements : statement);
}

export function transformScopeBlock(
    context: TransformationContext,
    node: ts.Block,
    scopeType: ScopeType
): [tstl.Block, Scope] {
    pushScope(context, scopeType);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    const scope = popScope(context);
    return [tstl.createBlock(statements, node), scope];
}

export const transformBlock: FunctionVisitor<ts.Block> = (node, context) => {
    pushScope(context, ScopeType.Block);
    const statements = performHoisting(context, context.transformStatements(node.statements));
    popScope(context);
    return tstl.createDoStatement(statements, node);
};
