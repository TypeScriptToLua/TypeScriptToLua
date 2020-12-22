import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformPropertyName } from "../../literal";
import { createDecoratingExpression, transformDecoratorExpression } from "../decorators";
import { transformMemberExpressionOwnerName } from "./method";

export function createPropertyDecoratingExpression(
    context: TransformationContext,
    node: ts.PropertyDeclaration | ts.AccessorDeclaration,
    className: lua.Identifier,
    noPrototype: boolean
): lua.Expression | undefined {
    if (!node.decorators) return;
    const propertyName = transformPropertyName(context, node.name);
    const propertyOwnerTable = transformMemberExpressionOwnerName(node, className, noPrototype);
    return createDecoratingExpression(
        context,
        node.kind,
        node.decorators.map(d => transformDecoratorExpression(context, d)),
        propertyOwnerTable,
        propertyName
    );
}

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

export function transformStaticPropertyDeclaration(
    context: TransformationContext,
    field: ts.PropertyDeclaration,
    className: lua.Identifier
): lua.AssignmentStatement | undefined {
    if (!field.initializer) return;
    const fieldName = transformPropertyName(context, field.name);
    const value = context.transformExpression(field.initializer);
    const classField = lua.createTableIndexExpression(lua.cloneIdentifier(className), fieldName);
    return lua.createAssignmentStatement(classField, value);
}
