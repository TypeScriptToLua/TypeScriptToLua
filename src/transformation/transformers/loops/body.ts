import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../../utils/scope";
import { transformBlockOrStatement } from "../block";

export function transformLoopBody(
    context: TransformationContext,
    loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
): tstl.Statement[] {
    pushScope(context, ScopeType.Loop);
    const body = performHoisting(context, transformBlockOrStatement(context, loop.statement));
    const scope = popScope(context);
    const scopeId = scope.id;

    if (!scope.loopContinued) {
        return body;
    }

    const baseResult: tstl.Statement[] = [tstl.createDoStatement(body)];
    const continueLabel = tstl.createLabelStatement(`__continue${scopeId}`);
    baseResult.push(continueLabel);

    return baseResult;
}
