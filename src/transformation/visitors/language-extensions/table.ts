import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import {
    ExtensionKind,
    getBinaryCallExtensionArgs,
    getExtensionKindForNode,
    getNaryCallExtensionArgs,
} from "../../utils/language-extensions";
import { transformOrderedExpressions } from "../expression-list";
import { LanguageExtensionCallTransformerMap } from "./call-extension";

export function isTableNewCall(context: TransformationContext, node: ts.NewExpression) {
    return getExtensionKindForNode(context, node.expression) === ExtensionKind.TableNewType;
}

export const tableNewExtensions = [ExtensionKind.TableNewType];

export const tableExtensionTransformers: LanguageExtensionCallTransformerMap = {
    [ExtensionKind.TableDeleteType]: transformTableDeleteExpression,
    [ExtensionKind.TableDeleteMethodType]: transformTableDeleteExpression,
    [ExtensionKind.TableGetType]: transformTableGetExpression,
    [ExtensionKind.TableGetMethodType]: transformTableGetExpression,
    [ExtensionKind.TableHasType]: transformTableHasExpression,
    [ExtensionKind.TableHasMethodType]: transformTableHasExpression,
    [ExtensionKind.TableSetType]: transformTableSetExpression,
    [ExtensionKind.TableSetMethodType]: transformTableSetExpression,
    [ExtensionKind.TableAddKeyType]: transformTableAddKeyExpression,
    [ExtensionKind.TableAddKeyMethodType]: transformTableAddKeyExpression,
};

function transformTableDeleteExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = getBinaryCallExtensionArgs(context, node, extensionKind);
    if (!args) {
        return lua.createNilLiteral();
    }

    const [table, key] = transformOrderedExpressions(context, args);
    // arg0[arg1] = nil
    context.addPrecedingStatements(
        lua.createAssignmentStatement(lua.createTableIndexExpression(table, key), lua.createNilLiteral(), node)
    );
    return lua.createBooleanLiteral(true);
}

function transformTableGetExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = getBinaryCallExtensionArgs(context, node, extensionKind);
    if (!args) {
        return lua.createNilLiteral();
    }

    const [table, key] = transformOrderedExpressions(context, args);
    // arg0[arg1]
    return lua.createTableIndexExpression(table, key, node);
}

function transformTableHasExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = getBinaryCallExtensionArgs(context, node, extensionKind);
    if (!args) {
        return lua.createNilLiteral();
    }

    const [table, key] = transformOrderedExpressions(context, args);
    // arg0[arg1]
    const tableIndexExpression = lua.createTableIndexExpression(table, key);

    // arg0[arg1] ~= nil
    return lua.createBinaryExpression(
        tableIndexExpression,
        lua.createNilLiteral(),
        lua.SyntaxKind.InequalityOperator,
        node
    );
}

function transformTableSetExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = getNaryCallExtensionArgs(context, node, extensionKind, 3);
    if (!args) {
        return lua.createNilLiteral();
    }

    const [table, key, value] = transformOrderedExpressions(context, args);
    // arg0[arg1] = arg2
    context.addPrecedingStatements(
        lua.createAssignmentStatement(lua.createTableIndexExpression(table, key), value, node)
    );
    return lua.createNilLiteral();
}

function transformTableAddKeyExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = getNaryCallExtensionArgs(context, node, extensionKind, 2);
    if (!args) {
        return lua.createNilLiteral();
    }

    const [table, key] = transformOrderedExpressions(context, args);
    // arg0[arg1] = true
    context.addPrecedingStatements(
        lua.createAssignmentStatement(lua.createTableIndexExpression(table, key), lua.createBooleanLiteral(true), node)
    );
    return lua.createNilLiteral();
}
