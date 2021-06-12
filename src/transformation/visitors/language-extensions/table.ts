import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";
import { getFunctionTypeForCall } from "../../utils/typescript";
import { assert } from "../../../utils";

const tableDeleteExtensions = [
    extensions.ExtensionKind.TableDeleteType,
    extensions.ExtensionKind.TableDeleteMethodType,
];

const tableGetExtensions = [extensions.ExtensionKind.TableGetType, extensions.ExtensionKind.TableGetMethodType];

const tableHasExtensions = [extensions.ExtensionKind.TableHasType, extensions.ExtensionKind.TableHasMethodType];

const tableSetExtensions = [extensions.ExtensionKind.TableSetType, extensions.ExtensionKind.TableSetMethodType];

const tableExtensions = [
    extensions.ExtensionKind.TableNewType,
    ...tableDeleteExtensions,
    ...tableGetExtensions,
    ...tableHasExtensions,
    ...tableSetExtensions,
];

function getTableExtensionKindForCall(
    context: TransformationContext,
    node: ts.CallExpression,
    validExtensions: extensions.ExtensionKind[]
) {
    const type = getFunctionTypeForCall(context, node);
    return type && validExtensions.find(extensionKind => extensions.isExtensionType(type, extensionKind));
}

export function isTableExtensionIdentifier(context: TransformationContext, node: ts.Identifier) {
    const type = context.checker.getTypeAtLocation(node);
    return tableExtensions.some(extensionKind => extensions.isExtensionType(type, extensionKind));
}

export function isTableDeleteCall(context: TransformationContext, node: ts.CallExpression) {
    return getTableExtensionKindForCall(context, node, tableDeleteExtensions) !== undefined;
}

export function isTableGetCall(context: TransformationContext, node: ts.CallExpression) {
    return getTableExtensionKindForCall(context, node, tableGetExtensions) !== undefined;
}

export function isTableHasCall(context: TransformationContext, node: ts.CallExpression) {
    return getTableExtensionKindForCall(context, node, tableHasExtensions) !== undefined;
}

export function isTableSetCall(context: TransformationContext, node: ts.CallExpression) {
    return getTableExtensionKindForCall(context, node, tableSetExtensions) !== undefined;
}

export function isTableNewCall(context: TransformationContext, node: ts.NewExpression) {
    const type = context.checker.getTypeAtLocation(node.expression);
    return extensions.isExtensionType(type, extensions.ExtensionKind.TableNewType);
}

export function transformTableDeleteExpression(context: TransformationContext, node: ts.CallExpression): lua.Statement {
    const extensionKind = getTableExtensionKindForCall(context, node, tableDeleteExtensions);
    assert(extensionKind);

    const args = node.arguments.slice();
    if (
        args.length === 1 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1] = nil
    return lua.createAssignmentStatement(
        lua.createTableIndexExpression(context.transformExpression(args[0]), context.transformExpression(args[1])),
        lua.createNilLiteral(),
        node
    );
}

export function transformTableGetExpression(context: TransformationContext, node: ts.CallExpression): lua.Expression {
    const extensionKind = getTableExtensionKindForCall(context, node, tableGetExtensions);
    assert(extensionKind);

    const args = node.arguments.slice();
    if (
        args.length === 1 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1]
    return lua.createTableIndexExpression(
        context.transformExpression(args[0]),
        context.transformExpression(args[1]),
        node
    );
}

export function transformTableHasExpression(context: TransformationContext, node: ts.CallExpression): lua.Expression {
    const extensionKind = getTableExtensionKindForCall(context, node, tableHasExtensions);
    assert(extensionKind);

    const args = node.arguments.slice();
    if (
        args.length === 1 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1]
    const tableIndexExpression = lua.createTableIndexExpression(
        context.transformExpression(args[0]),
        context.transformExpression(args[1])
    );

    // arg0[arg1] ~= nil
    return lua.createBinaryExpression(
        tableIndexExpression,
        lua.createNilLiteral(),
        lua.SyntaxKind.InequalityOperator,
        node
    );
}

export function transformTableSetExpression(context: TransformationContext, node: ts.CallExpression): lua.Statement {
    const extensionKind = getTableExtensionKindForCall(context, node, tableSetExtensions);
    assert(extensionKind);

    const args = node.arguments.slice();
    if (
        args.length === 2 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1] = arg2
    return lua.createAssignmentStatement(
        lua.createTableIndexExpression(context.transformExpression(args[0]), context.transformExpression(args[1])),
        context.transformExpression(args[2]),
        node
    );
}
