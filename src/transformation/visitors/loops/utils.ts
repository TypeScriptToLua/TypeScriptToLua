import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../../utils/scope";
import { transformBlockOrStatement } from "../block";
import { checkVariableDeclarationList } from "../variable-declaration";

export function transformLoopBody(
    context: TransformationContext,
    loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
): lua.Statement[] {
    pushScope(context, ScopeType.Loop);
    const body = performHoisting(context, transformBlockOrStatement(context, loop.statement));
    const scope = popScope(context);
    const scopeId = scope.id;

    if (!scope.loopContinued) {
        return body;
    }

    const baseResult: lua.Statement[] = [lua.createDoStatement(body)];
    const continueLabel = lua.createLabelStatement(`__continue${scopeId}`);
    baseResult.push(continueLabel);

    return baseResult;
}

export function getVariableDeclarationBinding(node: ts.VariableDeclarationList): ts.BindingName {
    checkVariableDeclarationList(node);

    if (node.declarations.length === 0) {
        return ts.createIdentifier("____");
    }

    return node.declarations[0].name;
}
