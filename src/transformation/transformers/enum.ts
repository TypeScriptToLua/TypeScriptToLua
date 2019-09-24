import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../context";
import { AnnotationKind, getTypeAnnotations } from "../utils/annotations";
import { getSymbolExportScope } from "../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../utils/lua-ast";
import { transformIdentifier } from "./identifier";
import { transformPropertyName } from "./literal";

function tryGetConstEnumValue(
    context: TransformationContext,
    node: ts.EnumMember | ts.PropertyAccessExpression | ts.ElementAccessExpression
): tstl.Expression | undefined {
    const value = context.checker.getConstantValue(node);
    if (typeof value === "string") {
        return tstl.createStringLiteral(value, node);
    } else if (typeof value === "number") {
        return tstl.createNumericLiteral(value, node);
    }
}

const transformEnumDeclaration: FunctionVisitor<ts.EnumDeclaration> = (node, context) => {
    if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Const && !context.options.preserveConstEnums) {
        return undefined;
    }

    const type = context.checker.getTypeAtLocation(node);
    const membersOnly = getTypeAnnotations(context, type).has(AnnotationKind.CompileMembersOnly);
    const result: tstl.Statement[] = [];

    if (!membersOnly) {
        const name = transformIdentifier(context, node.name);
        const table = tstl.createTableExpression();
        result.push(...createLocalOrExportedOrGlobalDeclaration(context, name, table, node));
    }

    const enumReference = context.transformExpression(node.name);
    for (const member of node.members) {
        const memberName = transformPropertyName(context, member.name);

        let valueExpression: tstl.Expression | undefined;
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
                    valueExpression = tstl.createTableIndexExpression(enumReference, otherMemberName);
                }
            }

            if (!valueExpression) {
                valueExpression = context.transformExpression(member.initializer);
            }
        } else {
            valueExpression = tstl.createNilLiteral();
        }

        if (membersOnly) {
            const enumSymbol = context.checker.getSymbolAtLocation(node.name);
            const exportScope = enumSymbol ? getSymbolExportScope(context, enumSymbol) : undefined;

            result.push(
                ...createLocalOrExportedOrGlobalDeclaration(
                    context,
                    tstl.isIdentifier(memberName)
                        ? memberName
                        : tstl.createIdentifier(member.name.getText(), member.name),
                    valueExpression,
                    node,
                    undefined,
                    exportScope
                )
            );
        } else {
            const memberAccessor = tstl.createTableIndexExpression(enumReference, memberName);
            result.push(tstl.createAssignmentStatement(memberAccessor, valueExpression, member));

            if (!tstl.isStringLiteral(valueExpression) && !tstl.isNilLiteral(valueExpression)) {
                const reverseMemberAccessor = tstl.createTableIndexExpression(enumReference, memberAccessor);
                result.push(tstl.createAssignmentStatement(reverseMemberAccessor, memberName, member));
            }
        }
    }

    return result;
};

const transformAccessExpression: FunctionVisitor<ts.PropertyAccessExpression | ts.ElementAccessExpression> = (
    node,
    context
) => {
    const constEnumValue = tryGetConstEnumValue(context, node);
    if (constEnumValue) {
        return constEnumValue;
    }

    return context.superTransformExpression(node);
};

export const enumPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.EnumDeclaration]: transformEnumDeclaration,
        [ts.SyntaxKind.ElementAccessExpression]: { transform: transformAccessExpression, priority: 1 },
        [ts.SyntaxKind.PropertyAccessExpression]: { transform: transformAccessExpression, priority: 1 },
    },
};
