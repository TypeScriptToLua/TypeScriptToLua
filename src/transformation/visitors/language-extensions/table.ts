import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";
import { getFunctionTypeForCall } from "../../utils/typescript";
import { transformExpressionList } from "../expression-list";
import { unsupportedBuiltinOptionalCall } from "../../utils/diagnostics";

const tableCallExtensions = [
    extensions.ExtensionKind.TableDeleteType,
    extensions.ExtensionKind.TableDeleteMethodType,
    extensions.ExtensionKind.TableGetType,
    extensions.ExtensionKind.TableGetMethodType,
    extensions.ExtensionKind.TableHasType,
    extensions.ExtensionKind.TableHasMethodType,
    extensions.ExtensionKind.TableSetType,
    extensions.ExtensionKind.TableSetMethodType,
    extensions.ExtensionKind.TableAddType,
    extensions.ExtensionKind.TableAddMethodType,
];

const tableExtensions = [extensions.ExtensionKind.TableNewType, ...tableCallExtensions];

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

export function isTableNewCall(context: TransformationContext, node: ts.NewExpression) {
    const type = context.checker.getTypeAtLocation(node.expression);
    return extensions.isExtensionType(type, extensions.ExtensionKind.TableNewType);
}

export function transformTableExtensionCall(
    context: TransformationContext,
    node: ts.CallExpression,
    isOptionalCall: boolean
): lua.Expression | undefined {
    const extensionType = getTableExtensionKindForCall(context, node, tableCallExtensions);
    if (!extensionType) return;
    if (isOptionalCall) {
        context.diagnostics.push(unsupportedBuiltinOptionalCall(node));
        return lua.createNilLiteral();
    }

    if (
        extensionType === extensions.ExtensionKind.TableDeleteType ||
        extensionType === extensions.ExtensionKind.TableDeleteMethodType
    ) {
        return transformTableDeleteExpression(context, node, extensionType);
    }

    if (
        extensionType === extensions.ExtensionKind.TableGetType ||
        extensionType === extensions.ExtensionKind.TableGetMethodType
    ) {
        return transformTableGetExpression(context, node, extensionType);
    }

    if (
        extensionType === extensions.ExtensionKind.TableHasType ||
        extensionType === extensions.ExtensionKind.TableHasMethodType
    ) {
        return transformTableHasExpression(context, node, extensionType);
    }

    if (
        extensionType === extensions.ExtensionKind.TableSetType ||
        extensionType === extensions.ExtensionKind.TableSetMethodType
    ) {
        return transformTableSetExpression(context, node, extensionType);
    }

    if (
        extensionType === extensions.ExtensionKind.TableAddType ||
        extensionType === extensions.ExtensionKind.TableAddMethodType
    ) {
        return transformTableAddExpression(context, node, extensionType);
    }
}

function transformTableDeleteExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: extensions.ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === extensions.ExtensionKind.TableDeleteMethodType &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1] = nil
    const [table, accessExpression] = transformExpressionList(context, args);
    context.addPrecedingStatements(
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(table, accessExpression),
            lua.createNilLiteral(),
            node
        )
    );
    return lua.createBooleanLiteral(true);
}

function transformTableGetExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: extensions.ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === extensions.ExtensionKind.TableGetMethodType &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    const [table, accessExpression] = transformExpressionList(context, args);
    // arg0[arg1]
    return lua.createTableIndexExpression(table, accessExpression, node);
}

function transformTableHasExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: extensions.ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === extensions.ExtensionKind.TableHasMethodType &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1]
    const [table, accessExpression] = transformExpressionList(context, args);
    const tableIndexExpression = lua.createTableIndexExpression(table, accessExpression);

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
    extensionKind: extensions.ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === extensions.ExtensionKind.TableSetMethodType &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1] = arg2
    const [table, accessExpression, value] = transformExpressionList(context, args);
    context.addPrecedingStatements(
        lua.createAssignmentStatement(lua.createTableIndexExpression(table, accessExpression), value, node)
    );
    return lua.createNilLiteral();
}

function transformTableAddExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: extensions.ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === extensions.ExtensionKind.TableAddMethodType &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        // In case of method (no table argument), push method owner to front of args list
        args.unshift(node.expression.expression);
    }

    // arg0[arg1] = true
    const [table, value] = transformExpressionList(context, args);
    context.addPrecedingStatements(
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(table, value),
            lua.createBooleanLiteral(true),
            node
        )
    );
    return lua.createNilLiteral();
}
