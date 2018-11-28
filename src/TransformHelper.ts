import * as ts from "typescript";

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

    public static flatten<T>(arr: T[]): T[] {
        const flat = [].concat(...arr);
        return flat.some(Array.isArray) ? this.flatten(flat) : flat;
    }
}
