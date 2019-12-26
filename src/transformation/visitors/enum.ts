import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { getSymbolExportScope } from "../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../utils/lua-ast";
import { transformIdentifier } from "./identifier";
import { transformPropertyName } from "./literal";

export function tryGetConstEnumValue(
    context: TransformationContext,
    node: ts.EnumMember | ts.PropertyAccessExpression | ts.ElementAccessExpression
): lua.Expression | undefined {
    const value = context.checker.getConstantValue(node);
    if (typeof value === "string") {
        return lua.createStringLiteral(value, node);
    } else if (typeof value === "number") {
        return lua.createNumericLiteral(value, node);
    }
}

export const transformEnumDeclaration: FunctionVisitor<ts.EnumDeclaration> = (node, context) => {
    if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Const && !context.options.preserveConstEnums) {
        return undefined;
    }

    const type = context.checker.getTypeAtLocation(node);
    const membersOnly = getTypeAnnotations(context, type).has(AnnotationKind.CompileMembersOnly);
    const result: lua.Statement[] = [];

    if (!membersOnly) {
        const name = transformIdentifier(context, node.name);
        const table = lua.createTableExpression();
        result.push(...createLocalOrExportedOrGlobalDeclaration(context, name, table, node));
    }

    const enumReference = context.transformExpression(node.name);
    for (const member of node.members) {
        const memberName = transformPropertyName(context, member.name);

        let valueExpression: lua.Expression | undefined;
        const constEnumValue = tryGetConstEnumValue(context, member);
        if (constEnumValue) {
            valueExpression = constEnumValue;
        } else if (member.initializer) {
            if (ts.isIdentifier(member.initializer)) {
                const symbol = context.checker.getSymbolAtLocation(member.initializer);
                if (
                    symbol &&
                    symbol.valueDeclaration &&
                    ts.isEnumMember(symbol.valueDeclaration) &&
                    symbol.valueDeclaration.parent === node
                ) {
                    const otherMemberName = transformPropertyName(context, symbol.valueDeclaration.name);
                    valueExpression = lua.createTableIndexExpression(enumReference, otherMemberName);
                }
            }

            if (!valueExpression) {
                valueExpression = context.transformExpression(member.initializer);
            }
        } else {
            valueExpression = lua.createNilLiteral();
        }

        if (membersOnly) {
            const enumSymbol = context.checker.getSymbolAtLocation(node.name);
            const exportScope = enumSymbol ? getSymbolExportScope(context, enumSymbol) : undefined;

            result.push(
                ...createLocalOrExportedOrGlobalDeclaration(
                    context,
                    lua.isIdentifier(memberName)
                        ? memberName
                        : lua.createIdentifier(member.name.getText(), member.name),
                    valueExpression,
                    node,
                    exportScope
                )
            );
        } else {
            const memberAccessor = lua.createTableIndexExpression(enumReference, memberName);
            result.push(lua.createAssignmentStatement(memberAccessor, valueExpression, member));

            if (!lua.isStringLiteral(valueExpression) && !lua.isNilLiteral(valueExpression)) {
                const reverseMemberAccessor = lua.createTableIndexExpression(enumReference, memberAccessor);
                result.push(lua.createAssignmentStatement(reverseMemberAccessor, memberName, member));
            }
        }
    }

    return result;
};
