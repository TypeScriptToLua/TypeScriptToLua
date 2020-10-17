import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { decoratorInvalidContext } from "../../utils/diagnostics";
import { ContextType, getFunctionContextType } from "../../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";

export function transformDecoratorExpression(context: TransformationContext, decorator: ts.Decorator): lua.Expression {
    const expression = decorator.expression;
    const type = context.checker.getTypeAtLocation(expression);
    const callContext = getFunctionContextType(context, type);
    if (callContext === ContextType.Void) {
        context.diagnostics.push(decoratorInvalidContext(decorator));
    }

    return context.transformExpression(expression);
}

export function createDecoratingExpression(
    context: TransformationContext,
    kind: ts.SyntaxKind,
    decorators: lua.Expression[],
    targetTableName: lua.Expression,
    targetFieldExpression?: lua.Expression
): lua.Expression {
    const decoratorTable = lua.createTableExpression(decorators.map(e => lua.createTableFieldExpression(e)));
    const trailingExpressions = [decoratorTable, targetTableName];

    if (targetFieldExpression) {
        trailingExpressions.push(targetFieldExpression);
        const isMethodOrAccessor =
            kind === ts.SyntaxKind.MethodDeclaration ||
            kind === ts.SyntaxKind.GetAccessor ||
            kind === ts.SyntaxKind.SetAccessor;
        trailingExpressions.push(isMethodOrAccessor ? lua.createBooleanLiteral(true) : lua.createNilLiteral());
    }

    return transformLuaLibFunction(context, LuaLibFeature.Decorate, undefined, ...trailingExpressions);
}
