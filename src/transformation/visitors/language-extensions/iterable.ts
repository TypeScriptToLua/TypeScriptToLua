import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as extensions from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { getVariableDeclarationBinding, transformForInitializer } from "../loops/utils";
import { transformArrayBindingElement } from "../variable-declaration";
import { invalidIterableUse, invalidMultiIterableWithoutDestructuring } from "../../utils/diagnostics";
import { cast } from "../../../utils";

const isIterableTypeDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.IterableType;

const isMultiIterableTypeDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.MultiIterableType;

export function isIterableExpression(context: TransformationContext, expression: ts.Expression): boolean {
    const type = context.checker.getTypeAtLocation(expression);
    return type.aliasSymbol?.declarations?.some(isIterableTypeDeclaration) ?? false;
}

export function isMultiIterableExpression(context: TransformationContext, expression: ts.Expression): boolean {
    const type = context.checker.getTypeAtLocation(expression);
    return type.aliasSymbol?.declarations?.some(isMultiIterableTypeDeclaration) ?? false;
}

export function transformForOfIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const luaIterator = context.transformExpression(statement.expression);
    const identifier = transformForInitializer(context, statement.initializer, block);
    return lua.createForInStatement(block, [identifier], [luaIterator], statement);
}

export function transformForOfMultiIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const luaIterator = context.transformExpression(statement.expression);
    let identifiers: lua.Identifier[] = [];

    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Variables declared in for loop
        // for ${initializer} in ${iterable} do
        const binding = getVariableDeclarationBinding(context, statement.initializer);
        if (ts.isArrayBindingPattern(binding)) {
            identifiers = binding.elements.map(e => transformArrayBindingElement(context, e));
        } else {
            context.diagnostics.push(invalidMultiIterableWithoutDestructuring(binding));
        }
    } else if (ts.isArrayLiteralExpression(statement.initializer)) {
        // Variables NOT declared in for loop - catch iterator values in temps and assign
        // for ____value0 in ${iterable} do
        //     ${initializer} = ____value0
        identifiers = statement.initializer.elements.map((_, i) => lua.createIdentifier(`____value${i}`));
        if (identifiers.length > 0) {
            block.statements.unshift(
                lua.createAssignmentStatement(
                    statement.initializer.elements.map(e =>
                        cast(context.transformExpression(e), lua.isAssignmentLeftHandSideExpression)
                    ),
                    identifiers
                )
            );
        }
    } else {
        context.diagnostics.push(invalidMultiIterableWithoutDestructuring(statement.initializer));
    }

    if (identifiers.length === 0) {
        identifiers.push(lua.createAnonymousIdentifier());
    }

    return lua.createForInStatement(block, identifiers, [luaIterator], statement);
}

export function validateIterableTypeUse(context: TransformationContext, node: ts.Expression) {
    if (!isIterableExpression(context, node) && !isMultiIterableExpression(context, node)) {
        return;
    }
    if (ts.isForOfStatement(node.parent)) {
        return;
    }
    if (ts.isReturnStatement(node.parent) || ts.isArrowFunction(node.parent)) {
        return;
    }
    context.diagnostics.push(invalidIterableUse(node));
}
