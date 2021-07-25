import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { importLuaLibFeature, LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

export const transformAwaitExpression: FunctionVisitor<ts.AwaitExpression> = (node, context) => {
    const expression = context.transformExpression(node.expression);
    return transformLuaLibFunction(context, LuaLibFeature.Await, node, expression);
};

export function isAsyncFunction(declaration: ts.FunctionLikeDeclaration): boolean {
    return declaration.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

export function wrapInAsyncAwaiter(context: TransformationContext, statements: lua.Statement[]): lua.Statement[] {
    importLuaLibFeature(context, LuaLibFeature.Await);

    return [
        lua.createReturnStatement([
            lua.createCallExpression(lua.createIdentifier("__TS__AsyncAwaiter"), [
                lua.createFunctionExpression(lua.createBlock(statements)),
            ]),
        ]),
    ];
}
