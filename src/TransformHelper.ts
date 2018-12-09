import * as ts from "typescript";
import { LuaCallExpression, LuaConcatExpression, LuaNode, LuaSyntaxKind } from "./LuaNode";

export class TransformHelper {
    // Helper to create simple lua variable statement;
    public static createLuaVariableStatement(identifier: ts.Identifier,
                                             expression?: ts.Expression,
                                             typeNode?: ts.TypeNode,
                                             modifiers: ReadonlyArray<ts.Modifier> = []): ts.VariableStatement {
        const declaration = ts.createVariableDeclaration(identifier, typeNode, expression);
        const statement = ts.createVariableStatement(modifiers, ts.createVariableDeclarationList([declaration]));
        return statement;
    }

    public static createLuaImport(identifier: ts.Identifier, moduleSpecifier: ts.StringLiteral): ts.VariableStatement {
        const requireIdentifier = ts.createIdentifier("require");
        const requireCall =
            ts.createCall(requireIdentifier, [ts.createLiteralTypeNode(moduleSpecifier)], [moduleSpecifier]);
        return this.createLuaVariableStatement(identifier, requireCall);
    }

    public static createLuaConcatExpression(left: ts.Expression, right: ts.Expression): LuaConcatExpression {
        const node = ts.createAdd(left, right) as LuaConcatExpression;
        node.luaKind = LuaSyntaxKind.ConcatExpression;
        return node;
    }

    public static createLuaCallExpression(expression: ts.Expression,
                                          argumentsArray: ReadonlyArray<ts.Expression>,
                                          isMethod: boolean): LuaCallExpression {
        const node = ts.createCall(expression, undefined, argumentsArray) as LuaCallExpression;
        node.luaKind = isMethod ? LuaSyntaxKind.MethodCallExpression : LuaSyntaxKind.FunctionCallExpression;
        return node;
    }

    public static isLuaNode<T extends ts.Node>(node: T): node is LuaNode & T {
        return (node as LuaNode & T).luaKind !== undefined;
    }

    public static flatten<T>(arr: T[]): T[] {
        const flat = [].concat(...arr);
        return flat.some(Array.isArray) ? this.flatten(flat) : flat;
    }
}
