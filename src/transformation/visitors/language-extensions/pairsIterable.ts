import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast } from "../../../utils";
import { TransformationContext } from "../../context";
import { invalidPairsIterableWithoutDestructuring } from "../../utils/diagnostics";
import * as extensions from "../../utils/language-extensions";
import { getVariableDeclarationBinding, transformForInitializer } from "../loops/utils";
import { transformArrayBindingElement } from "../variable-declaration";

function isPairsIterableType(type: ts.Type): boolean {
    return extensions.isExtensionType(type, extensions.ExtensionKind.PairsIterableType);
}

export function isPairsIterableExpression(context: TransformationContext, expression: ts.Expression): boolean {
    const type = context.checker.getTypeAtLocation(expression);
    return isPairsIterableType(type);
}

function isPairsKeyIterableType(type: ts.Type): boolean {
    return extensions.isExtensionType(type, extensions.ExtensionKind.PairsKeyIterableType);
}

export function isPairsKeyIterableExpression(context: TransformationContext, expression: ts.Expression): boolean {
    const type = context.checker.getTypeAtLocation(expression);
    return isPairsKeyIterableType(type);
}

export function transformForOfPairsIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const pairsCall = lua.createCallExpression(lua.createIdentifier("pairs"), [
        context.transformExpression(statement.expression),
    ]);

    let identifiers: lua.Identifier[] = [];

    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Variables declared in for loop
        // for key, value in iterable do
        const binding = getVariableDeclarationBinding(context, statement.initializer);
        if (ts.isArrayBindingPattern(binding)) {
            identifiers = binding.elements.map(e => transformArrayBindingElement(context, e));
        } else {
            context.diagnostics.push(invalidPairsIterableWithoutDestructuring(binding));
        }
    } else if (ts.isArrayLiteralExpression(statement.initializer)) {
        // Variables NOT declared in for loop - catch iterator values in temps and assign
        // for ____key, ____value in iterable do
        //     key, value = ____key, ____value
        identifiers = statement.initializer.elements.map(e => context.createTempNameForNode(e));
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
        context.diagnostics.push(invalidPairsIterableWithoutDestructuring(statement.initializer));
    }

    if (identifiers.length === 0) {
        identifiers.push(lua.createAnonymousIdentifier());
    }

    return lua.createForInStatement(block, identifiers, [pairsCall], statement);
}

export function transformForOfPairsKeyIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const pairsCall = lua.createCallExpression(lua.createIdentifier("pairs"), [
        context.transformExpression(statement.expression),
    ]);
    const identifier = transformForInitializer(context, statement.initializer, block);
    return lua.createForInStatement(block, [identifier], [pairsCall], statement);
}
