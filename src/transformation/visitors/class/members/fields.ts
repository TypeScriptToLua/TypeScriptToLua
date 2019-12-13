import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformPropertyName } from "../../literal";
import { isGetAccessorOverride } from "./accessors";

export function transformClassInstanceFields(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclaration,
    instanceFields: ts.PropertyDeclaration[]
): lua.Statement[] {
    const statements: lua.Statement[] = [];

    for (const f of instanceFields) {
        // Get identifier
        const fieldName = transformPropertyName(context, f.name);

        const value = f.initializer ? context.transformExpression(f.initializer) : undefined;

        // self[fieldName]
        const selfIndex = lua.createTableIndexExpression(createSelfIdentifier(), fieldName);

        // self[fieldName] = value
        const assignClassField = lua.createAssignmentStatement(selfIndex, value, f);

        statements.push(assignClassField);
    }

    const getOverrides = classDeclaration.members.filter((m): m is ts.GetAccessorDeclaration =>
        isGetAccessorOverride(context, m, classDeclaration)
    );

    for (const getter of getOverrides) {
        const getterName = transformPropertyName(context, getter.name);

        const resetGetter = lua.createExpressionStatement(
            lua.createCallExpression(lua.createIdentifier("rawset"), [
                createSelfIdentifier(),
                getterName,
                lua.createNilLiteral(),
            ]),
            classDeclaration.members.find(ts.isConstructorDeclaration) ?? classDeclaration
        );
        statements.push(resetGetter);
    }

    return statements;
}
