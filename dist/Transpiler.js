"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var ts = require("typescript");
var TSHelper_1 = require("./TSHelper");
var ForHelper_1 = require("./ForHelper");
var TranspileError = /** @class */ (function (_super) {
    __extends(TranspileError, _super);
    function TranspileError(message, node) {
        var _this = _super.call(this, message) || this;
        _this.node = node;
        return _this;
    }
    return TranspileError;
}(Error));
exports.TranspileError = TranspileError;
var LuaTranspiler = /** @class */ (function () {
    function LuaTranspiler(checker) {
        this.indent = "";
        this.checker = checker;
        this.switchCounter = 0;
        this.transpilingSwitch = false;
    }
    // Transpile a source file
    LuaTranspiler.transpileSourceFile = function (node, checker) {
        var transpiler = new LuaTranspiler(checker);
        return transpiler.transpileBlock(node);
    };
    LuaTranspiler.prototype.pushIndent = function () {
        this.indent = this.indent + "    ";
    };
    LuaTranspiler.prototype.popIndent = function () {
        this.indent = this.indent.slice(4);
    };
    // Transpile a block
    LuaTranspiler.prototype.transpileBlock = function (node) {
        var _this = this;
        var result = "";
        if (ts.isBlock(node)) {
            node.statements.forEach(function (statement) {
                result += _this.transpileNode(statement);
            });
        }
        else {
            node.forEachChild(function (child) {
                result += _this.transpileNode(child);
            });
        }
        return result;
    };
    // Transpile a node of unknown kind.
    LuaTranspiler.prototype.transpileNode = function (node) {
        //Ignore declarations
        if (TSHelper_1.TSHelper.getChildrenOfType(node, function (child) { return child.kind == ts.SyntaxKind.DeclareKeyword; }).length > 0)
            return "";
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
                return this.transpileImport(node);
            case ts.SyntaxKind.ClassDeclaration:
                return this.transpileClass(node);
            case ts.SyntaxKind.EnumDeclaration:
                return this.transpileEnum(node);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.transpileFunctionDeclaration(node);
            case ts.SyntaxKind.VariableStatement:
                return this.indent + this.transpileVariableStatement(node) + "\n";
            case ts.SyntaxKind.ExpressionStatement:
                return this.indent + this.transpileExpression(TSHelper_1.TSHelper.getChildren(node)[0]) + "\n";
            case ts.SyntaxKind.ReturnStatement:
                return this.indent + this.transpileReturn(node) + "\n";
            case ts.SyntaxKind.IfStatement:
                return this.transpileIf(node);
            case ts.SyntaxKind.WhileStatement:
                return this.transpileWhile(node);
            case ts.SyntaxKind.ForStatement:
                return this.transpileFor(node);
            case ts.SyntaxKind.ForOfStatement:
                return this.transpileForOf(node);
            case ts.SyntaxKind.ForInStatement:
                return this.transpileForIn(node);
            case ts.SyntaxKind.SwitchStatement:
                return this.transpileSwitch(node);
            case ts.SyntaxKind.BreakStatement:
                return this.transpileBreak();
            case ts.SyntaxKind.ContinueKeyword:
                // Disallow continue
                throw new TranspileError("Continue is not supported in Lua", node);
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                // Ignore these
                return "";
            default:
                return this.indent + this.transpileExpression(node) + "\n";
        }
    };
    LuaTranspiler.prototype.transpileImport = function (node) {
        var name = this.transpileExpression(node.moduleSpecifier);
        var imports = node.importClause.namedBindings;
        if (ts.isNamespaceImport(imports)) {
            return "{$imports.name.escapedText} = require(" + name + ")";
        }
        else if (ts.isNamedImports(imports)) {
            // Forbid renaming
            imports.elements.forEach(function (element) {
                if (element.propertyName) {
                    throw new TranspileError("Renaming of individual imported objects is not allowed", node);
                }
            });
            return "require(" + name + ")";
        }
        else {
            throw new TranspileError("Unsupported import type.", node);
        }
    };
    LuaTranspiler.prototype.transpileEnum = function (node) {
        var _this = this;
        var val = 0;
        var result = "";
        var type = this.checker.getTypeAtLocation(node);
        var membersOnly = TSHelper_1.TSHelper.isCompileMembersOnlyEnum(type);
        if (!membersOnly) {
            result += this.indent + (node.name.escapedText + "={}\n");
        }
        node.members.forEach(function (member) {
            if (member.initializer) {
                if (ts.isNumericLiteral(member.initializer)) {
                    val = parseInt(member.initializer.text);
                }
                else {
                    throw new TranspileError("Only numeric initializers allowed for enums.", node);
                }
            }
            var name = member.name.escapedText;
            if (membersOnly) {
                result += _this.indent + (name + "=" + val + "\n");
            }
            else {
                result += _this.indent + (node.name.escapedText + "." + name + "=" + val + "\n");
            }
            val++;
        });
        return result;
    };
    LuaTranspiler.prototype.transpileBreak = function () {
        if (this.transpilingSwitch) {
            return this.indent + ("goto switchDone" + this.switchCounter + "\n");
        }
        else {
            return this.indent + "break\n";
        }
    };
    LuaTranspiler.prototype.transpileIf = function (node) {
        var condition = this.transpileExpression(node.expression);
        var result = this.indent + ("if " + condition + " then\n");
        this.pushIndent();
        result += this.transpileBlock(node.thenStatement);
        this.popIndent();
        if (node.elseStatement) {
            result += this.indent + "else\n";
            this.pushIndent();
            result += this.transpileBlock(node.elseStatement);
            this.popIndent();
        }
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileWhile = function (node) {
        var condition = this.transpileExpression(node.expression);
        var result = this.indent + ("while " + condition + " do\n");
        this.pushIndent();
        result += this.transpileBlock(node.statement);
        this.popIndent();
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileFor = function (node) {
        // Get iterator variable
        var variable = node.initializer.declarations[0];
        var identifier = variable.name;
        // Populate three components of lua numeric for loop:
        var start = this.transpileExpression(variable.initializer);
        var end = ForHelper_1.ForHelper.GetForEnd(node.condition, this);
        var step = ForHelper_1.ForHelper.GetForStep(node.incrementor, this);
        // Add header
        var result = this.indent + ("for " + identifier.escapedText + "=" + start + "," + end + "," + step + " do\n");
        // Add body
        this.pushIndent();
        result += this.transpileBlock(node.statement);
        this.popIndent();
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileForOf = function (node) {
        // Get variable identifier
        var variable = node.initializer.declarations[0];
        var identifier = variable.name;
        // Transpile expression
        var expression = this.transpileExpression(node.expression);
        // Use ipairs for array types, pairs otherwise
        var isArray = this.checker.getTypeAtLocation(node.expression).symbol.escapedName == "Array";
        var pairs = isArray ? "ipairs" : "pairs";
        // Make header
        var result = this.indent + ("for _, " + identifier.escapedText + " in " + pairs + "(" + expression + ") do\n");
        // For body
        this.pushIndent();
        result += this.transpileBlock(node.statement);
        this.popIndent();
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileForIn = function (node) {
        // Get variable identifier
        var variable = node.initializer.declarations[0];
        var identifier = variable.name;
        // Transpile expression
        var expression = this.transpileExpression(node.expression);
        // Use ipairs for array types, pairs otherwise
        var isArray = this.checker.getTypeAtLocation(node.expression).symbol.escapedName == "Array";
        var pairs = isArray ? "ipairs" : "pairs";
        // Make header
        var result = this.indent + ("for " + identifier.escapedText + ", _ in " + pairs + "(" + expression + ") do\n");
        // For body
        this.pushIndent();
        result += this.transpileBlock(node.statement);
        this.popIndent();
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileSwitch = function (node) {
        var _this = this;
        var expression = this.transpileExpression(node.expression, true);
        var clauses = node.caseBlock.clauses;
        var result = this.indent + "-------Switch statement start-------\n";
        // If statement to go to right entry label
        clauses.forEach(function (clause, index) {
            if (ts.isCaseClause(clause)) {
                var keyword = index == 0 ? "if" : "elseif";
                var condition = _this.transpileExpression(clause.expression, true);
                result += _this.indent + (keyword + " " + expression + "==" + condition + " then\n");
            }
            else {
                // Default
                result += _this.indent + "else\n";
            }
            _this.pushIndent();
            // Labels for fallthrough
            result += _this.indent + ("::switchCase" + (_this.switchCounter + index) + "::\n");
            _this.transpilingSwitch = true;
            clause.statements.forEach(function (statement) {
                result += _this.transpileNode(statement);
            });
            _this.transpilingSwitch = false;
            // If this goto is reached, fall through to the next case
            if (index < clauses.length - 1) {
                result += _this.indent + ("goto switchCase" + (_this.switchCounter + index + 1) + "\n");
            }
            _this.popIndent();
        });
        result += this.indent + "end\n";
        result += this.indent + ("::switchDone" + this.switchCounter + "::\n");
        result += this.indent + "--------Switch statement end--------\n";
        //Increment counter for next switch statement
        this.switchCounter += clauses.length;
        return result;
    };
    LuaTranspiler.prototype.transpileReturn = function (node) {
        return "return " + this.transpileExpression(node.expression);
    };
    LuaTranspiler.prototype.transpileExpression = function (node, brackets) {
        switch (node.kind) {
            case ts.SyntaxKind.BinaryExpression:
                // Add brackets to preserve ordering
                return this.transpileBinaryExpression(node, brackets);
            case ts.SyntaxKind.ConditionalExpression:
                // Add brackets to preserve ordering
                return this.transpileConditionalExpression(node, brackets);
            case ts.SyntaxKind.CallExpression:
                return this.transpileCallExpression(node);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.transpilePropertyAccessExpression(node);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.transpileElementAccessExpression(node);
            case ts.SyntaxKind.Identifier:
                // For identifiers simply return their name
                return node.text;
            case ts.SyntaxKind.StringLiteral:
                var text = node.text;
                return "\"" + text + "\"";
            case ts.SyntaxKind.NumericLiteral:
                return node.text;
            case ts.SyntaxKind.TrueKeyword:
                return "true";
            case ts.SyntaxKind.FalseKeyword:
                return "false";
            case ts.SyntaxKind.NullKeyword:
                return "nil";
            case ts.SyntaxKind.ThisKeyword:
                return "self";
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.transpilePostfixUnaryExpression(node);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.transpilePrefixUnaryExpression(node);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transpileArrayLiteral(node);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transpileObjectLiteral(node);
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return this.transpileArrowFunction(node);
            case ts.SyntaxKind.NewExpression:
                return this.transpileNewExpression(node);
            case ts.SyntaxKind.ComputedPropertyName:
                return "[" + this.transpileExpression(node.expression) + "]";
            case ts.SyntaxKind.SuperKeyword:
                return "self.__base";
            case ts.SyntaxKind.TypeAssertionExpression:
                // Simply ignore the type assertion
                return this.transpileExpression(node.expression);
            default:
                throw new TranspileError("Unsupported expression kind: " + TSHelper_1.TSHelper.enumName(node.kind, ts.SyntaxKind), node);
        }
    };
    LuaTranspiler.prototype.transpileBinaryExpression = function (node, brackets) {
        // Transpile operands
        var lhs = this.transpileExpression(node.left, true);
        var rhs = this.transpileExpression(node.right, true);
        // Rewrite some non-existant binary operators
        var result = "";
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.PlusEqualsToken:
                result = lhs + "=" + lhs + "+" + rhs;
                break;
            case ts.SyntaxKind.MinusEqualsToken:
                result = lhs + "=" + lhs + "-" + rhs;
                break;
            case ts.SyntaxKind.AmpersandAmpersandToken:
                result = lhs + " and " + rhs;
                break;
            case ts.SyntaxKind.BarBarToken:
                result = lhs + " or " + rhs;
                break;
            case ts.SyntaxKind.AmpersandToken:
                result = "bit.band(" + lhs + "," + rhs + ")";
                break;
            case ts.SyntaxKind.BarToken:
                result = "bit.bor(" + lhs + "," + rhs + ")";
                break;
            default:
                result = lhs + this.transpileOperator(node.operatorToken) + rhs;
        }
        // Optionally put brackets around result
        if (brackets) {
            return "(" + result + ")";
        }
        else {
            return result;
        }
    };
    LuaTranspiler.prototype.transpileConditionalExpression = function (node, brackets) {
        var condition = this.transpileExpression(node.condition);
        var val1 = this.transpileExpression(node.whenTrue);
        var val2 = this.transpileExpression(node.whenFalse);
        return "TS_ITE(" + condition + ",function() return " + val1 + " end, function() return " + val2 + " end)";
    };
    // Replace some missmatching operators
    LuaTranspiler.prototype.transpileOperator = function (operator) {
        switch (operator.kind) {
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return "==";
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return "~=";
            default:
                return ts.tokenToString(operator.kind);
        }
    };
    LuaTranspiler.prototype.transpilePostfixUnaryExpression = function (node) {
        var operand = this.transpileExpression(node.operand, true);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return operand + " = " + operand + " + 1";
            case ts.SyntaxKind.MinusMinusToken:
                return operand + " = " + operand + " - 1";
            default:
                throw new TranspileError("Unsupported unary postfix: " + TSHelper_1.TSHelper.enumName(node.kind, ts.SyntaxKind), node);
        }
    };
    LuaTranspiler.prototype.transpilePrefixUnaryExpression = function (node) {
        var operand = this.transpileExpression(node.operand, true);
        switch (node.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return operand + " = " + operand + " + 1";
            case ts.SyntaxKind.MinusMinusToken:
                return operand + " = " + operand + " - 1";
            case ts.SyntaxKind.ExclamationToken:
                return "not " + operand;
            case ts.SyntaxKind.MinusToken:
                return "-" + operand;
            default:
                throw new TranspileError("Unsupported unary prefix: " + TSHelper_1.TSHelper.enumName(node.kind, ts.SyntaxKind), node);
        }
    };
    LuaTranspiler.prototype.transpileNewExpression = function (node) {
        var name = this.transpileExpression(node.expression);
        var params = this.transpileArguments(node.arguments, ts.createTrue());
        return name + ".new(" + params + ")";
    };
    LuaTranspiler.prototype.transpileCallExpression = function (node) {
        // Check for calls on primitives to override
        if (ts.isPropertyAccessExpression(node.expression)) {
            var type = this.checker.getTypeAtLocation(node.expression.expression);
            switch (type.flags) {
                case ts.TypeFlags.String:
                case ts.TypeFlags.StringLiteral:
                    return this.transpileStringCallExpression(node);
                case ts.TypeFlags.Object:
                    if (TSHelper_1.TSHelper.isArrayType(type))
                        return this.transpileArrayCallExpression(node);
            }
            // Include context parameter if present
            var callPath_1 = this.transpileExpression(node.expression);
            var params_1 = this.transpileArguments(node.arguments, node.expression.expression);
            return callPath_1 + "(" + params_1 + ")";
        }
        // Handle super calls properly
        if (node.expression.kind == ts.SyntaxKind.SuperKeyword) {
            var callPath_2 = this.transpileExpression(node.expression);
            var params_2 = this.transpileArguments(node.arguments, ts.createNode(ts.SyntaxKind.ThisKeyword));
            return "self.__base.constructor(" + params_2 + ")";
        }
        var callPath = this.transpileExpression(node.expression);
        var params = this.transpileArguments(node.arguments);
        return callPath + "(" + params + ")";
    };
    LuaTranspiler.prototype.transpileStringCallExpression = function (node) {
        var expression = node.expression;
        var params = this.transpileArguments(node.arguments);
        var caller = this.transpileExpression(expression.expression);
        switch (expression.name.escapedText) {
            case "replace":
                return caller + ":sub(" + params + ")";
            default:
                throw new TranspileError("Unsupported string function: " + expression.name.escapedText, node);
        }
    };
    LuaTranspiler.prototype.transpileArrayCallExpression = function (node) {
        var expression = node.expression;
        var params = this.transpileArguments(node.arguments);
        var caller = this.transpileExpression(expression.expression);
        switch (expression.name.escapedText) {
            case "push":
                return "table.insert(" + caller + ", " + params + ")";
            default:
                throw new TranspileError("Unsupported array function: " + expression.name.escapedText, node);
        }
    };
    LuaTranspiler.prototype.transpileArguments = function (params, context) {
        var _this = this;
        var parameters = [];
        // Add context as first param if present
        if (context) {
            parameters.push(this.transpileExpression(context));
        }
        params.forEach(function (param) {
            parameters.push(_this.transpileExpression(param));
        });
        return parameters.join(",");
    };
    LuaTranspiler.prototype.transpilePropertyAccessExpression = function (node) {
        var property = node.name.text;
        // Check for primitive types to override
        var type = this.checker.getTypeAtLocation(node.expression);
        switch (type.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transpileStringProperty(node);
            case ts.TypeFlags.Object:
                if (TSHelper_1.TSHelper.isArrayType(type))
                    return this.transpileArrayProperty(node);
        }
        // Do not output path for member only enums
        if (TSHelper_1.TSHelper.isCompileMembersOnlyEnum(type)) {
            return property;
        }
        var path = this.transpileExpression(node.expression);
        return path + "." + property;
    };
    // Transpile access of string properties, only supported properties are allowed
    LuaTranspiler.prototype.transpileStringProperty = function (node) {
        var property = node.name;
        switch (property.escapedText) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw new TranspileError("Unsupported string property: " + property.escapedText, node);
        }
    };
    // Transpile access of array properties, only supported properties are allowed
    LuaTranspiler.prototype.transpileArrayProperty = function (node) {
        var property = node.name;
        switch (property.escapedText) {
            case "length":
                return "#" + this.transpileExpression(node.expression);
            default:
                throw new TranspileError("Unsupported array property: " + property.escapedText, node);
        }
    };
    LuaTranspiler.prototype.transpileElementAccessExpression = function (node) {
        var element = this.transpileExpression(node.expression);
        var index = this.transpileExpression(node.argumentExpression);
        var isArray = TSHelper_1.TSHelper.isArrayType(this.checker.getTypeAtLocation(node.expression));
        if (isArray) {
            return element + "[" + index + "+1]";
        }
        else {
            return element + "[" + index + "]";
        }
    };
    // Transpile a variable statement
    LuaTranspiler.prototype.transpileVariableStatement = function (node) {
        var _this = this;
        var result = "";
        node.declarationList.declarations.forEach(function (declaration) {
            result += _this.transpileVariableDeclaration(declaration);
        });
        return result;
    };
    LuaTranspiler.prototype.transpileVariableDeclaration = function (node) {
        // Find variable identifier
        var identifier = node.name;
        var value = this.transpileExpression(node.initializer);
        return "local " + identifier.escapedText + " = " + value;
    };
    LuaTranspiler.prototype.transpileFunctionDeclaration = function (node) {
        var result = "";
        var identifier = node.name;
        var methodName = identifier.escapedText;
        var parameters = node.parameters;
        var body = node.body;
        // Build parameter string
        var paramNames = [];
        parameters.forEach(function (param) {
            paramNames.push(param.name.escapedText);
        });
        // Build function header
        result += this.indent + ("function " + methodName + "(" + paramNames.join(",") + ")\n");
        this.pushIndent();
        result += this.transpileBlock(body);
        this.popIndent();
        // Close function block
        result += this.indent + "end\n";
        return result;
    };
    LuaTranspiler.prototype.transpileMethodDeclaration = function (node, path) {
        var result = "";
        var identifier = node.name;
        var methodName = identifier.escapedText;
        var parameters = node.parameters;
        var body = node.body;
        // Build parameter string
        var paramNames = ["self"];
        parameters.forEach(function (param) {
            paramNames.push(param.name.escapedText);
        });
        // Build function header
        result += this.indent + ("function " + path + methodName + "(" + paramNames.join(",") + ")\n");
        this.pushIndent();
        result += this.transpileBlock(body);
        this.popIndent();
        // Close function block
        result += this.indent + "end\n";
        return result;
    };
    // Transpile a class declaration
    LuaTranspiler.prototype.transpileClass = function (node) {
        var _this = this;
        // Find extends class, ignore implements
        var extendsType;
        if (node.heritageClauses)
            node.heritageClauses.forEach(function (clause) {
                if (clause.token == ts.SyntaxKind.ExtendsKeyword) {
                    var superType = clause.types[0];
                    // Ignore purely abstract types (decorated with /** @PureAbstract */)
                    if (!TSHelper_1.TSHelper.isPureAbstractClass(_this.checker.getTypeAtLocation(superType))) {
                        extendsType = clause.types[0];
                    }
                }
            });
        // Write class declaration
        var className = node.name.escapedText;
        var result = "";
        if (!extendsType) {
            result += this.indent + (className + " = " + className + " or {}\n");
        }
        else {
            var baseName = extendsType.expression.escapedText;
            result += this.indent + (className + " = " + className + " or " + baseName + ".new()\n");
        }
        result += this.indent + (className + ".__index = " + className + "\n");
        if (extendsType) {
            var baseName = extendsType.expression.escapedText;
            result += this.indent + (className + ".__base = " + baseName + "\n");
        }
        result += this.indent + ("function " + className + ".new(construct, ...)\n");
        result += this.indent + ("    local instance = setmetatable({}, " + className + ")\n");
        result += this.indent + ("    if construct and " + className + ".constructor then " + className + ".constructor(instance, ...) end\n");
        result += this.indent + "    return instance\n";
        result += this.indent + "end\n";
        // Get all properties with value
        var properties = node.members.filter(ts.isPropertyDeclaration)
            .filter(function (_) { return _.initializer; });
        // Divide properties into static and non-static
        var isStatic = function (_) { return _.modifiers && _.modifiers.some(function (_) { return _.kind == ts.SyntaxKind.StaticKeyword; }); };
        var staticFields = properties.filter(isStatic);
        var instanceFields = properties.filter(function (_) { return !isStatic(_); });
        // Add static declarations
        for (var _i = 0, staticFields_1 = staticFields; _i < staticFields_1.length; _i++) {
            var field = staticFields_1[_i];
            var fieldName = field.name.escapedText;
            var value = this.transpileExpression(field.initializer);
            result += this.indent + (className + "." + fieldName + " = " + value + "\n");
        }
        // Try to find constructor
        var constructor = node.members.filter(ts.isConstructorDeclaration)[0];
        if (constructor) {
            // Add constructor plus initialisation of instance fields
            result += this.transpileConstructor(constructor, className, instanceFields);
        }
        else {
            // No constructor, make one to set all instance fields if there are any
            if (instanceFields.length > 0) {
                // Create empty constructor and add instance fields
                result += this.transpileConstructor(ts.createConstructor([], [], [], ts.createBlock([], true)), className, instanceFields);
            }
        }
        // Transpile methods
        node.members.filter(ts.isMethodDeclaration).forEach(function (method) {
            result += _this.transpileMethodDeclaration(method, className + ".");
        });
        return result;
    };
    LuaTranspiler.prototype.transpileConstructor = function (node, className, instanceFields) {
        var parameters = ["self"];
        node.parameters.forEach(function (param) { return parameters.push(param.name.escapedText); });
        var result = this.indent + ("function " + className + ".constructor(" + parameters.join(",") + ")\n");
        // Add in instance field declarations
        for (var _i = 0, instanceFields_1 = instanceFields; _i < instanceFields_1.length; _i++) {
            var f = instanceFields_1[_i];
            // Get identifier
            var fieldIdentifier = f.name;
            var fieldName = fieldIdentifier.escapedText;
            var value = this.transpileExpression(f.initializer);
            result += this.indent + ("    self." + fieldName + " = " + value + "\n");
        }
        // Transpile constructor body
        this.pushIndent();
        result += this.transpileBlock(node.body);
        this.popIndent();
        return result + this.indent + "end\n";
    };
    LuaTranspiler.prototype.transpileArrayLiteral = function (node) {
        var _this = this;
        var values = [];
        node.elements.forEach(function (child) {
            values.push(_this.transpileExpression(child));
        });
        return "{" + values.join(",") + "}";
    };
    LuaTranspiler.prototype.transpileObjectLiteral = function (node) {
        var _this = this;
        var properties = [];
        // Add all property assignments
        node.properties.forEach(function (assignment) {
            var _a = TSHelper_1.TSHelper.getChildren(assignment), key = _a[0], value = _a[1];
            if (ts.isIdentifier(key)) {
                properties.push("[\"" + key.escapedText + "\"]=" + _this.transpileExpression(value));
            }
            else {
                var index = _this.transpileExpression(key);
                properties.push(index + "=" + _this.transpileExpression(value));
            }
        });
        return "{" + properties.join(",") + "}";
    };
    LuaTranspiler.prototype.transpileFunctionExpression = function (node) {
        // Build parameter string
        var paramNames = [];
        node.parameters.forEach(function (param) {
            paramNames.push(param.name.escapedText);
        });
        var result = "function(" + paramNames.join(",") + ")\n";
        this.pushIndent();
        result += this.transpileBlock(node.body);
        this.popIndent();
        return result + this.indent + "end ";
    };
    LuaTranspiler.prototype.transpileArrowFunction = function (node) {
        // Build parameter string
        var paramNames = [];
        node.parameters.forEach(function (param) {
            paramNames.push(param.name.escapedText);
        });
        if (ts.isBlock(node.body)) {
            var result = "function(" + paramNames.join(",") + ")\n";
            this.pushIndent();
            result += this.transpileBlock(node.body);
            this.popIndent();
            return result + this.indent + "end ";
        }
        else {
            return "function(" + paramNames.join(",") + ") return " + this.transpileExpression(node.body) + " end";
        }
    };
    return LuaTranspiler;
}());
exports.LuaTranspiler = LuaTranspiler;
