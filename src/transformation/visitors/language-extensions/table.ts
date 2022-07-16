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

    const [table, accessExpression] = transformExpressionList(context, args);
    // arg0[arg1] = nil
    context.addPrecedingStatements(
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(table, accessExpression),
            lua.createNilLiteral(),
            node
        )
    );
    return lua.createBooleanLiteral(true);
}

function transformWithTableArgument(context: TransformationContext, node: ts.CallExpression): lua.Expression[] {
    if (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) {
        return transformExpressionList(context, [node.expression.expression, ...node.arguments]);
    }
    // todo: report diagnostic?
    return [lua.createNilLiteral(), ...transformExpressionList(context, node.arguments)];
}

function transformTableGetExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args =
        extensionKind === ExtensionKind.TableGetMethodType
            ? transformWithTableArgument(context, node)
            : transformExpressionList(context, node.arguments);

    const [table, accessExpression] = args; // arg0[arg1]
    return lua.createTableIndexExpression(table, accessExpression, node);
}

function transformTableHasExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    extensionKind: ExtensionKind
): lua.Expression {
    const args =
        extensionKind === ExtensionKind.TableHasMethodType
            ? transformWithTableArgument(context, node)
            : transformExpressionList(context, node.arguments);

    const [table, accessExpression] = args;
    // arg0[arg1]
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
    const args =
        extensionKind === ExtensionKind.TableSetMethodType
            ? transformWithTableArgument(context, node)
            : transformExpressionList(context, node.arguments);

    const [table, accessExpression, value] = args;
    // arg0[arg1] = arg2
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
    const args =
        extensionKind === ExtensionKind.TableAddKeyMethodType
            ? transformWithTableArgument(context, node)
            : transformExpressionList(context, node.arguments);

    const [table, value] = args;
    // arg0[arg1] = true
    context.addPrecedingStatements(
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(table, value),
            lua.createBooleanLiteral(true),
            node
        )
    );
    return lua.createNilLiteral();
}
