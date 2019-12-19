import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformPropertyName } from "../../literal";

export function transformClassInstanceFields(
    context: TransformationContext,
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

    return statements;
}
