import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { ExtensionKind, getExtensionKindForNode } from "../../utils/language-extensions";
import { transformExpressionList } from "../expression-list";
import { LanguageExtensionCallTransformer } from "./call-extension";

export function isTableNewCall(context: TransformationContext, node: ts.NewExpression) {
    return getExtensionKindForNode(context, node.expression) === ExtensionKind.TableNewType;
}
export const tableNewExtensions = [ExtensionKind.TableNewType];

export const tableExtensionTransformers: { [P in ExtensionKind]?: LanguageExtensionCallTransformer } = {
    [ExtensionKind.TableDeleteType]: transformTableDeleteExpression,
    [ExtensionKind.TableDeleteMethodType]: transformTableDeleteExpression,
    [ExtensionKind.TableGetType]: transformTableGetExpression,
    [ExtensionKind.TableGetMethodType]: transformTableGetExpression,
    [ExtensionKind.TableHasType]: transformTableHasExpression,
    [ExtensionKind.TableHasMethodType]: transformTableHasExpression,
    [ExtensionKind.TableSetType]: transformTableSetExpression,
    [ExtensionKind.TableSetMethodType]: transformTableSetExpression,
    [ExtensionKind.TableAddKeyType]: transformTableAddExpression,
    [ExtensionKind.TableAddKeyMethodType]: transformTableAddExpression,
};

function transformTableDeleteExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = node.arguments.slice();
    if (
        extensionKind === ExtensionKind.TableDeleteMethodType &&
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

function addTableArgument(node: ts.CallExpression) {
    if (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) {
        return [node.expression.expression, ...node.arguments];
    }
    // todo: report an error?
    return node.arguments;
}

function transformTableGetExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = extensionKind === ExtensionKind.TableGetMethodType ? addTableArgument(node) : node.arguments;

    const [table, accessExpression] = transformExpressionList(context, args);
    // arg0[arg1]
    return lua.createTableIndexExpression(table, accessExpression, node);
}

function transformTableHasExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args = extensionKind === ExtensionKind.TableHasMethodType ? addTableArgument(node) : node.arguments;

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
    extensionKind: ExtensionKind
): lua.Expression {
    const args = extensionKind === ExtensionKind.TableSetMethodType ? addTableArgument(node) : node.arguments;

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
    extensionKind: ExtensionKind
): lua.Expression {
    const args = extensionKind === ExtensionKind.TableAddKeyMethodType ? addTableArgument(node) : node.arguments;

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
