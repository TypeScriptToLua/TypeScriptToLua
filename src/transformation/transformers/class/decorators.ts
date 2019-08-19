import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { InvalidDecoratorContext } from "../../utils/errors";
import { addExportToIdentifier } from "../../utils/export";
import { ContextType, getFunctionContextType } from "../../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { transformIdentifier } from "../identifier";

export function createConstructorDecorationStatement(
    context: TransformationContext,
    declaration: ts.ClassLikeDeclaration
): tstl.AssignmentStatement | undefined {
    const className =
        declaration.name !== undefined
            ? addExportToIdentifier(context, transformIdentifier(context, declaration.name))
            : tstl.createAnonymousIdentifier();

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

    const decoratorTable = tstl.createTableExpression(
        decoratorExpressions.map(expression => tstl.createTableFieldExpression(expression))
    );

    return tstl.createAssignmentStatement(
        className,
        transformLuaLibFunction(context, LuaLibFeature.Decorate, undefined, decoratorTable, className)
    );
}
