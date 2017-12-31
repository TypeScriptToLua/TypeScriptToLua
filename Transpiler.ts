import * as ts from "typescript";

import {TSHelper as tsEx} from "./TSHelper";

class TranspileError extends Error {
    node: ts.Node;
    constructor(message: string, node: ts.Node) {
        super(message);
        this.node = node;
    }
}

export class LuaTranspiler {
    // Transpile a source file
    static transpileSourceFile(node: ts.SourceFile): string {
        return this.transpileBlock(node, "");
    }

    // Transpile a block
    static transpileBlock(node: ts.Node, indent: string): string {
        let result = "";

        node.forEachChild(child => {
            result += this.transpileNode(child, indent);
        })

        return result;
    }

    // Transpile a node of unknown kind.
    static transpileNode(node: ts.Node, indent: string): string {
        //Ignore declarations
        if (tsEx.getChildrenOfType(node, child => child.kind == ts.SyntaxKind.DeclareKeyword).length > 0) return "";

        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                return this.transpileClass(<ts.ClassDeclaration>node, indent);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.transpileFunctionDeclaration(<ts.FunctionDeclaration>node, "", indent);
            case ts.SyntaxKind.VariableStatement:
                return indent + this.transpileVariableStatement(<ts.VariableStatement>node) + "\n";
            case ts.SyntaxKind.ExpressionStatement:
                return indent + this.transpileExpression(<ts.Expression>tsEx.getChildren(node)[0]) + "\n";
            case ts.SyntaxKind.ReturnStatement:
                return indent + this.transpileReturn(<ts.ReturnStatement>node) + "\n";
            case ts.SyntaxKind.EndOfFileToken:
                return "";
            default:
                throw new TranspileError("Unsupported node kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpileReturn(node: ts.ReturnStatement): string {
        return "return " + this.transpileExpression(tsEx.getChildren(node)[0]);
    }

    static transpileExpression(node: ts.Node): string {
        switch (node.kind) {
            case ts.SyntaxKind.BinaryExpression:
                return this.transpileBinaryExpression(<ts.BinaryExpression>node);
            case ts.SyntaxKind.CallExpression:
                return this.transpileCallExpression(<ts.CallExpression>node);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.transpilePropertyAccessExpression(<ts.PropertyAccessExpression>node);
            case ts.SyntaxKind.Identifier:
                // For identifiers simply return their name
                return (<ts.Identifier>node).text;
             case ts.SyntaxKind.StringLiteral:
                const text = (<ts.StringLiteral>node).text;
                return `"${text}"`;
            case ts.SyntaxKind.NumericLiteral:
                return (<ts.NumericLiteral>node).text;
            case ts.SyntaxKind.TrueKeyword:
                return "true";
            case ts.SyntaxKind.FalseKeyword:
                return "false";
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transpileArrayLiteral(node);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transpileObjectLiteral(node)
            default:
                throw new TranspileError("Unsupported expression kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpileBinaryExpression(node: ts.BinaryExpression): string {
        let [lhs, operator, rhs] = tsEx.getChildren(node);
        return this.transpileExpression(lhs) + ts.tokenToString(operator.kind) + this.transpileExpression(rhs);
    }

    static transpileCallExpression(node: ts.CallExpression): string {
        const children = tsEx.getChildren(node);

        let callPath = this.transpileExpression(children[0]);
        // Remove last . with :
        if (callPath.indexOf(".") > -1) {
            callPath = callPath.substr(0, callPath.lastIndexOf(".")) + ":" + callPath.substr(callPath.lastIndexOf(".") + 1);
        }

        const parameters = [];
        children.slice(1).forEach(param => {
            parameters.push(this.transpileExpression(param));
        })

        return `${callPath}(${parameters.join(",")})`;
    }

    static transpilePropertyAccessExpression(node: ts.PropertyAccessExpression): string {
        let parts = [];
        node.forEachChild(child => {
            switch(child.kind) {
                case ts.SyntaxKind.ThisKeyword:
                    parts.push("self");
                    break;
                case ts.SyntaxKind.Identifier:
                    parts.push((<ts.Identifier>child).escapedText);
                    break;
                case ts.SyntaxKind.CallExpression:
                    parts.push(this.transpileCallExpression(<ts.CallExpression>child));
                    break;
                case ts.SyntaxKind.PropertyAccessExpression:
                    parts.push(this.transpilePropertyAccessExpression(<ts.PropertyAccessExpression>child));
                    break;
                default:
                    throw new TranspileError("Unsupported access kind: " + tsEx.enumName(child.kind, ts.SyntaxKind), node);
            }
        });
        return parts.join(".");
    }

    // Transpile a variable statement
    static transpileVariableStatement(node: ts.VariableStatement): string {
        let result = "";

        let list = tsEx.getFirstChildOfType<ts.VariableDeclarationList>(node, ts.isVariableDeclarationList);
        list.forEachChild(declaration => {
            result += this.transpileVariableDeclaration(<ts.VariableDeclaration>declaration);
        });

        return result;
    }

    static transpileVariableDeclaration(node: ts.VariableDeclaration): string {
        // Find variable identifier
        const identifier = tsEx.getFirstChildOfType<ts.Identifier>(node, ts.isIdentifier);
        const valueLiteral = tsEx.getChildren(node)[1];

        const value = this.transpileExpression(valueLiteral);

        return `local ${identifier.escapedText} = ${value}`;
    }

    static transpileFunctionDeclaration(node: ts.Declaration, path: string, indent: string): string {
        let result = "";
        const identifier = tsEx.getFirstChildOfType<ts.Identifier>(node, ts.isIdentifier);
        const methodName = identifier.escapedText;
        const parameters = tsEx.getChildrenOfType<ts.ParameterDeclaration>(node, ts.isParameter);
        const block = tsEx.getFirstChildOfType<ts.Block>(node, ts.isBlock);

        // Build parameter string
        let paramNames = [];
        parameters.forEach(param => {
            paramNames.push(tsEx.getFirstChildOfType<ts.Identifier>(param, ts.isIdentifier).escapedText);
        });

        // Build function header
        result += indent + `function ${path}${methodName}(${paramNames.join(",")})\n`;

        result += this.transpileBlock(block, indent + "    ");

        // Close function block
        result += indent + "end\n";

        return result;
    }

    // Transpile a class declaration
    static transpileClass(node: ts.ClassDeclaration, indent: string): string {

        // Find first identifier
        const identifierNode = tsEx.getFirstChildOfType<ts.Identifier>(node, child => ts.isIdentifier(child));

        // Write class declaration
        const className = <string>identifierNode.escapedText;
        let result = indent + `${className} = ${className} or {}\n`;

        // Get all properties
        const properties = tsEx.getChildrenOfType<ts.PropertyDeclaration>(node, ts.isPropertyDeclaration);

        let staticFields: ts.PropertyDeclaration[] = [];
        let instanceFields: ts.PropertyDeclaration[] = [];

        // Divide properties in static and instance fields
        for (const p of properties) {
            // Check if property is static
            const isStatic = tsEx.getChildrenOfType(p, child => child.kind == ts.SyntaxKind.StaticKeyword).length > 0;

            // Find value assignment
            const assignments = tsEx.getChildrenOfType(p, tsEx.isValueType);
            
            // [0] is name literal, [1] is value, ignore fields with no assigned value
            if (assignments.length < 2)
                continue;

            if (isStatic) {
                staticFields.push(p);
            } else {
                instanceFields.push(p);
            }
        }

        // Add static declarations
        for (const f of staticFields) {
            // Get identifier
            const fieldIdentifier = tsEx.getFirstChildOfType<ts.Identifier>(f, ts.isIdentifier);
            const fieldName = fieldIdentifier.escapedText;

            // Get value at index 1 (index 0 is field name)
            const valueNode = tsEx.getChildrenOfType<ts.Node>(f, tsEx.isValueType)[1];
            let value = this.transpileExpression(valueNode);            
            
            // Build lua assignment string
            result += indent + `${className}.${fieldName} = ${value}\n`;
        }

        // Try to find constructor
        const constructor = tsEx.getFirstChildOfType<ts.ConstructorDeclaration>(node, ts.isConstructorDeclaration);
        if (constructor) {
            // Add constructor plus initialisation of instance fields
            result += indent + this.transpileConstructor(constructor, className, instanceFields, indent);
        } else {
            // No constructor, make one to set all instance fields if there are any
            if (instanceFields.length > 0) {
                // Create empty constructor and add instance fields
                result += indent + this.transpileConstructor(ts.createConstructor([],[],[], ts.createBlock([],true)), className, instanceFields, indent);
            }
        }

        // Find all methods
        const methods = tsEx.getChildrenOfType<ts.MethodDeclaration>(node, ts.isMethodDeclaration);
        methods.forEach(method => {
            result += this.transpileFunctionDeclaration(method, `${className}:`, indent);
        });

        return result;
    }

    static transpileConstructor(node: ts.ConstructorDeclaration, className: string, instanceFields: ts.PropertyDeclaration[], indent: string): string {
        let result = indent + `function ${className}:constructor()\n`;

        // Add in instance field declarations
        for (const f of instanceFields) {
            // Get identifier
            const fieldIdentifier = tsEx.getFirstChildOfType<ts.Identifier>(f, ts.isIdentifier);
            const fieldName = fieldIdentifier.escapedText;

            // Get value at index 1 (index 0 is field name)
            const valueNode = tsEx.getChildrenOfType<ts.Node>(f, tsEx.isValueType)[1];
            let value = this.transpileExpression(valueNode);

            result += indent + `    self.${fieldName} = ${value}\n`;
        }

        // Transpile constructor body
        tsEx.getChildrenOfType<ts.Block>(node, ts.isBlock).forEach(child => {
            result += this.transpileBlock(child, indent + "    ");
        });

        return result + `${indent}end\n`;
    }

    static transpileArrayLiteral(node: ts.Node): string {
        let values = [];

        node.forEachChild(child => {
            values.push(this.transpileExpression(child));
        });

        return "{" + values.join(",") + "}";
    }

    static transpileObjectLiteral(node: ts.Node): string {
        let properties = [];
        // Add all property assignments
        tsEx.getChildrenOfType<ts.PropertyAssignment>(node, ts.isPropertyAssignment).forEach(assignment => {
            const [key, value] = tsEx.getChildren(assignment);
            if (ts.isIdentifier(key)) {
                properties.push(`["${key.escapedText}"]=`+this.transpileExpression(value));
            } else {
                const index = this.transpileExpression(<ts.Expression>key);
                properties.push(`[${index}]=`+this.transpileExpression(value));
            }
        });

        return "{" + properties.join(",") + "}";
    }
}