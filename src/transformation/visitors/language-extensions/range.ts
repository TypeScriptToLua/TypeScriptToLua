import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as extensions from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { getVariableDeclarationBinding } from "../loops/utils";
import { transformIdentifier } from "../identifier";
import { transformArguments } from "../call";
import { assert } from "../../../utils";
import { invalidRangeControlVariable } from "../../utils/diagnostics";

const isRangeFunctionDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.RangeFunction;

export function isRangeFunction(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isRangeFunctionDeclaration) ?? false;
}

export function isRangeFunctionNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isRangeFunctionDeclaration) ?? false;
}

function getControlVariable(context: TransformationContext, statement: ts.ForOfStatement) {
    if (!ts.isVariableDeclarationList(statement.initializer)) {
        context.diagnostics.push(invalidRangeControlVariable(statement.initializer));
        return;
    }

    const binding = getVariableDeclarationBinding(context, statement.initializer);
    if (!ts.isIdentifier(binding)) {
        context.diagnostics.push(invalidRangeControlVariable(statement.initializer));
        return;
    }

    return transformIdentifier(context, binding);
}

export function transformRangeStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    assert(ts.isCallExpression(statement.expression));
    const controlVariable =
        getControlVariable(context, statement) ?? lua.createAnonymousIdentifier(statement.initializer);
    const [start = lua.createNumericLiteral(0), limit = lua.createNumericLiteral(0), step] = transformArguments(
        context,
        statement.expression.arguments,
        context.checker.getResolvedSignature(statement.expression)
    );
    return lua.createForStatement(block, controlVariable, start, limit, step, statement);
}
