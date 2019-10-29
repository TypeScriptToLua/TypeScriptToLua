import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { InvalidDecoratorContext } from "../../utils/errors";
import { addExportToIdentifier } from "../../utils/export";
import { ContextType, getFunctionContextType } from "../../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { transformIdentifier } from "../identifier";

export function createConstructorDecorationStatement(
    context: TransformationContext,
    declaration: ts.ClassLikeDeclaration
): lua.AssignmentStatement | undefined {
    const className =
        declaration.name !== undefined
            ? addExportToIdentifier(context, transformIdentifier(context, declaration.name))
            : lua.createAnonymousIdentifier();

    const decorators = declaration.decorators;
    if (!decorators) {
        return undefined;
    }

    const decoratorExpressions = decorators.map(decorator => {
        const expression = decorator.expression;
        const type = context.checker.getTypeAtLocation(expression);
        const callContext = getFunctionContextType(context, type);
        if (callContext === ContextType.Void) {
            throw InvalidDecoratorContext(decorator);
        }

        return context.transformExpression(expression);
    });

    const decoratorTable = lua.createTableExpression(
        decoratorExpressions.map(expression => lua.createTableFieldExpression(expression))
    );

    return lua.createAssignmentStatement(
        className,
        transformLuaLibFunction(context, LuaLibFeature.Decorate, undefined, decoratorTable, className)
    );
}
