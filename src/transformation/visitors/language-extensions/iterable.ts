import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { getVariableDeclarationBinding, transformForInitializer } from "../loops/utils";
import { transformArrayBindingElement } from "../variable-declaration";
import {
    invalidMultiIterableWithoutDestructuring,
    invalidPairsIterableWithoutDestructuring,
} from "../../utils/diagnostics";
import { cast } from "../../../utils";
import { isMultiReturnType } from "./multi";

function transformForOfMultiIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block,
    luaIterator: lua.Expression,
    invalidMultiUseDiagnostic: (node: ts.Node) => ts.Diagnostic
): lua.Statement {
    let identifiers: lua.Identifier[] = [];

    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Variables declared in for loop
        // for ${initializer} in ${iterable} do
        const binding = getVariableDeclarationBinding(context, statement.initializer);
        if (ts.isArrayBindingPattern(binding)) {
            identifiers = binding.elements.map(e => transformArrayBindingElement(context, e));
        } else {
            context.diagnostics.push(invalidMultiUseDiagnostic(binding));
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
        context.diagnostics.push(invalidMultiUseDiagnostic(statement.initializer));
    }

    if (identifiers.length === 0) {
        identifiers.push(lua.createAnonymousIdentifier());
    }

    return lua.createForInStatement(block, identifiers, [luaIterator], statement);
}

export function transformForOfIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const type = context.checker.getTypeAtLocation(statement.expression);
    if (type.aliasTypeArguments?.length === 2 && isMultiReturnType(type.aliasTypeArguments[0])) {
        const luaIterator = context.transformExpression(statement.expression);
        return transformForOfMultiIterableStatement(
            context,
            statement,
            block,
            luaIterator,
            invalidMultiIterableWithoutDestructuring
        );
    }

    const luaIterator = context.transformExpression(statement.expression);
    const identifier = transformForInitializer(context, statement.initializer, block);
    return lua.createForInStatement(block, [identifier], [luaIterator], statement);
}

export function transformForOfPairsIterableStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const pairsCall = lua.createCallExpression(lua.createIdentifier("pairs"), [
        context.transformExpression(statement.expression),
    ]);
    return transformForOfMultiIterableStatement(
        context,
        statement,
        block,
        pairsCall,
        invalidPairsIterableWithoutDestructuring
    );
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
