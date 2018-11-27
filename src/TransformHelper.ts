import * as ts from "typescript";

export class TransformHelper {
    // Helper to create simple lua variable statement;
    public static createLuaVariableStatement(identifier: ts.Identifier,
                                             expression?: ts.Expression,
                                             typeNode?: ts.TypeNode): ts.VariableStatement {
        const declaration = ts.createVariableDeclaration(identifier, typeNode, expression);
        const statement = ts.createVariableStatement([], ts.createVariableDeclarationList([declaration]));
        return statement;
    }

    public static createLuaImport(identifier: ts.Identifier, moduleSpecifier: ts.StringLiteral): ts.VariableStatement {
        const requireIdentifier = ts.createIdentifier("require");
        const requireCall =
            ts.createCall(requireIdentifier, [ts.createLiteralTypeNode(moduleSpecifier)], [moduleSpecifier]);
        return this.createLuaVariableStatement(identifier, requireCall);
    }
}
