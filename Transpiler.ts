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
            case ts.SyntaxKind.IfStatement:
                return this.transpileIf(<ts.IfStatement>node, indent);
            case ts.SyntaxKind.WhileStatement:
                return this.transpileWhile(<ts.WhileStatement>node, indent);
            case ts.SyntaxKind.ForStatement:
                return this.transpileFor(<ts.ForStatement>node, indent);
            case ts.SyntaxKind.ForOfStatement:
                return this.transpileForOf(<ts.ForOfStatement>node, indent);
            case ts.SyntaxKind.ForInStatement:
                return this.transpileForIn(<ts.ForInStatement>node, indent);
            case ts.SyntaxKind.BreakStatement:
                return indent + "break\n";
            case ts.SyntaxKind.ContinueKeyword:
                // Disallow continue
                throw new TranspileError("Continue is not supported in Lua", node);
            case ts.SyntaxKind.EndOfFileToken:
                return "";
            default:
                throw new TranspileError("Unsupported node kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpileIf(node: ts.IfStatement, indent: string): string {
        const condition = this.transpileExpression(node.expression);

        let result = indent + `if ${condition} then\n`;
        result += this.transpileBlock(node.thenStatement, indent + "    ");

        if (node.elseStatement) {
            result += indent + "else\n";
            result += this.transpileBlock(node.elseStatement, indent + "    ");
        }

        return result + indent + "end\n";
    }

    static transpileWhile(node: ts.WhileStatement, indent: string): string {
        const condition = this.transpileExpression(node.expression);

        let result = indent + `while ${condition} do\n`;
        result += this.transpileBlock(node.statement, indent + "    ");
        return result + indent + "end\n";
    }

    static transpileFor(node: ts.ForStatement, indent: string): string {
        // Goal: Populate three for components:
        let start = "0";
        let end = "0";
        let step = "1";

        // Get variable
        const variable = (<ts.VariableDeclarationList>node.initializer).declarations[0];
        const identifier = <ts.Identifier>variable.name;

        // Get initial value
        start = this.transpileExpression(variable.initializer);

        // Get ending value
        if (ts.isBinaryExpression(node.condition)) {
            if (ts.isIdentifier(node.condition.left)) {
                // Account for lua 1 indexing
                switch (node.condition.operatorToken.kind) {
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        end = this.transpileExpression(node.condition.right);
                        break;
                    case ts.SyntaxKind.LessThanToken:
                        end = this.transpileExpression(node.condition.right) + "-1";
                        break;
                    case ts.SyntaxKind.GreaterThanToken:
                        end = this.transpileExpression(node.condition.right) + "+1";
                        break;
                    default:
                        throw new TranspileError("Unsupported for-loop condition operator: " + tsEx.enumName(node.condition.operatorToken, ts.SyntaxKind), node);
                }
            } else {
                this.transpileExpression(node.condition.left);
                // Account for lua 1 indexing
                switch (node.condition.operatorToken.kind) {
                    case ts.SyntaxKind.LessThanEqualsToken:
                    case ts.SyntaxKind.GreaterThanEqualsToken:
                        end = this.transpileExpression(node.condition.right);
                        break;
                    case ts.SyntaxKind.LessThanToken:
                        end = this.transpileExpression(node.condition.right) + "+1";
                        break;
                    case ts.SyntaxKind.GreaterThanToken:
                        end = this.transpileExpression(node.condition.right) + "-1";
                        break;
                    default:
                        throw new TranspileError("Unsupported for-loop condition operator: " + tsEx.enumName(node.condition.operatorToken, ts.SyntaxKind), node);
                }
            }
        } else {
            throw new TranspileError("Unsupported for-loop condition type: " + tsEx.enumName(node.condition.kind, ts.SyntaxKind), node);
        }

        // Get increment step
        switch (node.incrementor.kind) {
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
                switch ((<ts.PostfixUnaryExpression|ts.PrefixUnaryExpression>node.incrementor).operator) {
                    case ts.SyntaxKind.PlusPlusToken:
                        step = "1";
                        break;
                    case ts.SyntaxKind.MinusMinusToken:
                        step = "-1";
                        break;
                    default:
                        throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(node.incrementor.kind, ts.SyntaxKind), node);
                }
                break;
            case ts.SyntaxKind.BinaryExpression:
                let value = ts.isIdentifier((<ts.BinaryExpression>node.incrementor).left) ? 
                    this.transpileExpression((<ts.BinaryExpression>node.incrementor).right) :
                    this.transpileExpression((<ts.BinaryExpression>node.incrementor).left);
                switch((<ts.BinaryExpression>node.incrementor).operatorToken.kind) {
                    case ts.SyntaxKind.PlusEqualsToken:
                        step = value;
                        break;
                    case ts.SyntaxKind.MinusEqualsToken:
                        step = "-" + value;
                        break;
                    default:
                        throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(node.incrementor.kind, ts.SyntaxKind), node);
                }
                break;
            default:
                throw new TranspileError("Unsupported for-loop increment step: " + tsEx.enumName(node.incrementor.kind, ts.SyntaxKind), node);
        }

        // Add header
        let result = indent + `for ${identifier.escapedText}=${start},${end},${step} do\n`;

        // Add body
        result += this.transpileBlock(node.statement, indent + "    ");

        return result + indent + "end\n";
    }

    static transpileForOf(node: ts.ForOfStatement, indent: string): string {
        // Get variable identifier
        const variable =  (<ts.VariableDeclarationList>node.initializer).declarations[0];
        const identifier = <ts.Identifier>variable.name;

        // Transpile expression
        const expression = this.transpileExpression(node.expression);

        // Make header
        let result = indent + `for _, ${identifier.escapedText} in pairs(${expression}) do\n`;

        // For body
        result += this.transpileBlock(node.statement, indent + "    ");

        return result + indent + "end\n";
    }

    static transpileForIn(node: ts.ForInStatement, indent: string): string {
        // Get variable identifier
        const variable = <ts.VariableDeclaration>(<ts.VariableDeclarationList>node.initializer).declarations[0];
        const identifier = <ts.Identifier>variable.name;

        // Transpile expression
        const expression = this.transpileExpression(node.expression);

        // Make header
        let result = indent + `for ${identifier.escapedText}, _ in pairs(${expression}) do\n`;

        // For body
        result += this.transpileBlock(node.statement, indent + "    ");

        return result + indent + "end\n";
    }

    static transpileReturn(node: ts.ReturnStatement): string {
        return "return " + this.transpileExpression(node.expression);
    }

    static transpileExpression(node: ts.Node): string {
        switch (node.kind) {
            case ts.SyntaxKind.BinaryExpression:
                return this.transpileBinaryExpression(<ts.BinaryExpression>node);
            case ts.SyntaxKind.CallExpression:
                return this.transpileCallExpression(<ts.CallExpression>node);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.transpilePropertyAccessExpression(<ts.PropertyAccessExpression>node);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.transpileElementAccessExpression(<ts.ElementAccessExpression>node);
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
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.transpilePostfixUnaryExpression(<ts.PostfixUnaryExpression>node);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.transpilePrefixUnaryExpression(<ts.PrefixUnaryExpression>node);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transpileArrayLiteral(<ts.ArrayLiteralExpression>node);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transpileObjectLiteral(<ts.ObjectLiteralExpression>node);
            case ts.SyntaxKind.FunctionExpression:
                return this.transpileFunctionExpression(<ts.FunctionExpression>node);
            default:
                throw new TranspileError("Unsupported expression kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpileBinaryExpression(node: ts.BinaryExpression): string {
        // Transpile operands
        const lhs = this.transpileExpression(node.left);
        const rhs = this.transpileExpression(node.right);
        // Rewrite some non-existant binary operators
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.PlusEqualsToken:
                return `${lhs}=${lhs}+${rhs}`;
            case ts.SyntaxKind.MinusEqualsToken:
                return `${lhs}=${lhs}-${rhs}`;
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return `${lhs} and ${rhs}`;
            case ts.SyntaxKind.BarBarToken:
                return `${lhs} or ${rhs}`;
            case ts.SyntaxKind.AmpersandToken:
                return `bit.band(${lhs},${rhs})`;
            case ts.SyntaxKind.BarToken:
                return `bit.bor(${lhs},${rhs})`;
            default:
                return lhs + this.transpileOperator(node.operatorToken) + rhs;
        }
    }

    // Replace some missmatching operators
    static transpileOperator<T extends ts.SyntaxKind>(operator: ts.Token<T>): string {
        switch (operator.kind) {
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return "==";
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return "~=";
            default:
                return ts.tokenToString(operator.kind);
        }
    }

    static transpilePostfixUnaryExpression(node: ts.PostfixUnaryExpression): string {
        const operand = this.transpileExpression(node.operand);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return `${operand} = ${operand} + 1`;
            case ts.SyntaxKind.MinusMinusToken:
                return `${operand} = ${operand} - 1`;
            default:
                throw new TranspileError("Unsupported expression kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpilePrefixUnaryExpression(node: ts.PrefixUnaryExpression): string {
        const operand = this.transpileExpression(node.operand);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return `${operand} = ${operand} + 1`;
            case ts.SyntaxKind.MinusMinusToken:
                return `${operand} = ${operand} - 1`;
            case ts.SyntaxKind.ExclamationToken:
                return `not ${operand}`;
            default:
                throw new TranspileError("Unsupported expression kind: " + tsEx.enumName(node.kind, ts.SyntaxKind), node);
        }
    }

    static transpileCallExpression(node: ts.CallExpression): string {
        let callPath = this.transpileExpression(node.expression);
        // Remove last . with :
        if (callPath.indexOf(".") > -1) {
            callPath = callPath.substr(0, callPath.lastIndexOf(".")) + ":" + callPath.substr(callPath.lastIndexOf(".") + 1);
        }

        const parameters = [];
        node.arguments.forEach(param => {
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

    static transpileElementAccessExpression(node: ts.ElementAccessExpression): string {
        const element = this.transpileExpression(node.expression);
        const index = this.transpileExpression(node.argumentExpression);

        return `${element}[${index}]`;
    }

    // Transpile a variable statement
    static transpileVariableStatement(node: ts.VariableStatement): string {
        let result = "";

        node.declarationList.declarations.forEach(declaration => {
            result += this.transpileVariableDeclaration(<ts.VariableDeclaration>declaration);
        });

        return result;
    }

    static transpileVariableDeclaration(node: ts.VariableDeclaration): string {
        // Find variable identifier
        const identifier = <ts.Identifier>node.name;
        const value = this.transpileExpression(node.initializer);

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
            paramNames.push((<ts.Identifier>param.name).escapedText);
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
        // Write class declaration
        const className = <string>node.name.escapedText;
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
            
            // Ignore fields with no assigned value
            if (!p.initializer)
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
            const fieldIdentifier = <ts.Identifier>f.name;
            const fieldName = fieldIdentifier.escapedText;

            let value = this.transpileExpression(f.initializer);

            result += indent + `    self.${fieldName} = ${value}\n`;
        }

        // Transpile constructor body
        result += this.transpileBlock(node.body, indent + "    ");

        return result + `${indent}end\n`;
    }

    static transpileArrayLiteral(node: ts.ArrayLiteralExpression): string {
        let values = [];

        node.elements.forEach(child => {
            values.push(this.transpileExpression(child));
        });

        return "{" + values.join(",") + "}";
    }

    static transpileObjectLiteral(node: ts.ObjectLiteralExpression): string {
        let properties = [];
        // Add all property assignments
        node.properties.forEach(assignment => {
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

    static transpileFunctionExpression(node: ts.FunctionExpression): string {
        // Build parameter string
        let paramNames = [];
        node.parameters.forEach(param => {
            paramNames.push(tsEx.getFirstChildOfType<ts.Identifier>(param, ts.isIdentifier).escapedText);
        });

        return `function(${paramNames.join(",")})\n` + this.transpileBlock(node.body, "        ")+ "    end\n";
    }
}