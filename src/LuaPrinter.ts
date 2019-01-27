import * as tstl from "./LuaAST";

import { TSHelper as tsHelper } from "./TSHelper";
import { LuaLibFeature, LuaLib } from "./LuaLib";
import { CompilerOptions } from "./CompilerOptions";
import { LuaLibImportKind } from "./CompilerOptions";

export class LuaPrinter {
    /* tslint:disable:object-literal-sort-keys */
    private static operatorMap: {[key in tstl.Operator]: string} = {
        [tstl.SyntaxKind.AdditionOperator]: "+",
        [tstl.SyntaxKind.SubractionOperator]: "-",
        [tstl.SyntaxKind.MultiplicationOperator]: "*",
        [tstl.SyntaxKind.DivisionOperator]: "/",
        [tstl.SyntaxKind.FloorDivisionOperator]: "//",
        [tstl.SyntaxKind.ModuloOperator]: "%",
        [tstl.SyntaxKind.PowerOperator]: "^",
        [tstl.SyntaxKind.NegationOperator]: "-",
        [tstl.SyntaxKind.ConcatOperator]: "..",
        [tstl.SyntaxKind.LengthOperator]: "#",
        [tstl.SyntaxKind.EqualityOperator]: "==",
        [tstl.SyntaxKind.InequalityOperator]: "~=",
        [tstl.SyntaxKind.LessThanOperator]: "<",
        [tstl.SyntaxKind.LessEqualOperator]: "<=",
        [tstl.SyntaxKind.GreaterThanOperator]: ">",
        [tstl.SyntaxKind.GreaterEqualOperator]: ">=",
        [tstl.SyntaxKind.AndOperator]: "and",
        [tstl.SyntaxKind.OrOperator]: "or",
        [tstl.SyntaxKind.NotOperator]: "not ",
        [tstl.SyntaxKind.BitwiseAndOperator]: "&",
        [tstl.SyntaxKind.BitwiseOrOperator]: "|",
        [tstl.SyntaxKind.BitwiseExclusiveOrOperator]: "~",
        [tstl.SyntaxKind.BitwiseRightShiftOperator]: ">>",
        [tstl.SyntaxKind.BitwiseArithmeticRightShift]: ">>>",
        [tstl.SyntaxKind.BitwiseLeftShiftOperator]: "<<",
        [tstl.SyntaxKind.BitwiseNotOperator]: "~",
    };
    /* tslint:enable:object-literal-sort-keys */

    private options: CompilerOptions;
    private currentIndent: string;

    public constructor(options: CompilerOptions) {
        this.options = options;
        this.currentIndent = "";
    }

    public print(block: tstl.Block, luaLibFeatures?: Set<LuaLibFeature>): string {
        let header = "";

        if (this.options.noHeader === undefined || this.options.noHeader === false) {
            header += `--[[ Generated with https://github.com/Perryvw/TypescriptToLua ]]\n`;
        }

        if (luaLibFeatures) {
            // Require lualib bundle
            if ((this.options.luaLibImport === LuaLibImportKind.Require && luaLibFeatures.size > 0)
                || this.options.luaLibImport === LuaLibImportKind.Always)
            {
                header += `require("lualib_bundle");\n`;
            }
            // Inline lualib features
            else if (this.options.luaLibImport === LuaLibImportKind.Inline && luaLibFeatures.size > 0)
            {
                header += "-- Lua Library inline imports\n";
                header += LuaLib.loadFeatures(luaLibFeatures);
            }
        }

        return header + this.printBlock(block);
    }

    private pushIndent(): void {
        this.currentIndent = this.currentIndent + "    ";
    }

    private popIndent(): void {
        this.currentIndent = this.currentIndent.slice(4);
    }

    private indent(input: string): string {
        return this.currentIndent + input;
    }

    private printBlock(block: tstl.Block): string {
        return this.ignoreDeadStatements(block.statements).map(s => this.printStatement(s)).join("");
    }

    private printStatement(statement: tstl.Statement): string {
        switch (statement.kind) {
            case tstl.SyntaxKind.DoStatement:
                return this.printDoStatement(statement as tstl.DoStatement);
            case tstl.SyntaxKind.VariableDeclarationStatement:
                return this.printVariableDeclarationStatement(statement as tstl.VariableDeclarationStatement);
            case tstl.SyntaxKind.AssignmentStatement:
                return this.printVariableAssignmentStatement(statement as tstl.AssignmentStatement);
            case tstl.SyntaxKind.IfStatement:
                return this.printIfStatement(statement as tstl.IfStatement);
            case tstl.SyntaxKind.WhileStatement:
                return this.printWhileStatement(statement as tstl.WhileStatement);
            case tstl.SyntaxKind.RepeatStatement:
                return this.printRepeatStatement(statement as tstl.RepeatStatement);
            case tstl.SyntaxKind.ForStatement:
                return this.printForStatement(statement as tstl.ForStatement);
            case tstl.SyntaxKind.ForInStatement:
                return this.printForInStatement(statement as tstl.ForInStatement);
            case tstl.SyntaxKind.GotoStatement:
                return this.printGotoStatement(statement as tstl.GotoStatement);
            case tstl.SyntaxKind.LabelStatement:
                return this.printLabelStatement(statement as tstl.LabelStatement);
            case tstl.SyntaxKind.ReturnStatement:
                return this.printReturnStatement(statement as tstl.ReturnStatement);
            case tstl.SyntaxKind.BreakStatement:
                return this.printBreakStatement(statement as tstl.BreakStatement);
            case tstl.SyntaxKind.ExpressionStatement:
                return this.printExpressionStatement(statement as tstl.ExpressionStatement);
        }
    }

    private printDoStatement(statement: tstl.DoStatement): string {
        let result = this.indent("do\n");
        this.pushIndent();
        result += this.ignoreDeadStatements(statement.statements).map(s => this.printStatement(s)).join("");
        this.popIndent();
        result += this.indent("end\n");

        return result;
    }

    private printVariableDeclarationStatement(statement: tstl.VariableDeclarationStatement): string {
        const left = this.indent(`local ${statement.left.map(e => this.printExpression(e)).join(", ")}`);
        if (statement.right) {
            return left + ` = ${statement.right.map(e => this.printExpression(e)).join(", ")};\n`;
        } else {
            return left + ";\n";
        }
    }

    private printVariableAssignmentStatement(statement: tstl.AssignmentStatement): string {
        return this.indent(
            `${statement.left.map(e => this.printExpression(e)).join(", ")} = ` +
            `${statement.right.map(e => this.printExpression(e)).join(", ")};\n`);
    }

    private printIfStatement(statement: tstl.IfStatement, isElseIf?: boolean): string {
        const prefix = isElseIf ? "elseif" : "if";
        let result = this.indent(`${prefix} ${this.printExpression(statement.condtion)} then\n`);
        this.pushIndent();
        result += this.printBlock(statement.ifBlock);
        this.popIndent();
        if (statement.elseBlock) {
            if (tstl.isIfStatement(statement.elseBlock)) {
                result += this.printIfStatement(statement.elseBlock, true);
            } else {
                result += this.indent("else\n");
                this.pushIndent();
                result += this.printBlock(statement.elseBlock);
                this.popIndent();
                result += this.indent("end\n");
            }
        } else {
            result += this.indent("end\n");
        }

        return result;
    }

    private printWhileStatement(statement: tstl.WhileStatement): string {
        let result = this.indent(`while ${this.printExpression(statement.condtion)} do\n`);
        this.pushIndent();
        result += this.printBlock(statement.body);
        this.popIndent();
        result += this.indent("end\n");

        return result;
    }

    private printRepeatStatement(statement: tstl.RepeatStatement): string {
        let result = this.indent(`repeat\n`);
        this.pushIndent();
        result += this.printBlock(statement.body);
        this.popIndent();
        result += this.indent(`until ${this.printExpression(statement.condtion)};\n`);

        return result;
    }

    private printForStatement(statement: tstl.ForStatement): string {
        const ctrlVar = this.printExpression(statement.controlVariable);
        const ctrlVarInit = this.printExpression(statement.controlVariableInitializer);
        const limit = this.printExpression(statement.limitExpression);

        let result = this.indent(`for ${ctrlVar} = ${ctrlVarInit}, ${limit}`);
        if (statement.stepExpression) {
            const step = this.printExpression(statement.stepExpression);
            result += `, ${step}`;
        }
        result += ` do\n`;

        this.pushIndent();
        result += this.printBlock(statement.body);
        this.popIndent();
        result += this.indent("end\n");

        return result;
    }

    private printForInStatement(statement: tstl.ForInStatement): string {
        const names = statement.names.map(i => this.printIdentifier(i)).join(", ");
        const expressions = statement.expressions.map(e => this.printExpression(e)).join(", ");

        let result = this.indent(`for ${names} in ${expressions} do\n`);
        this.pushIndent();
        result += this.printBlock(statement.body);
        this.popIndent();
        result += this.indent("end\n");

        return result;
    }

    private printGotoStatement(statement: tstl.GotoStatement): string {
        return this.indent(`goto ${statement.label};\n`);
    }

    private printLabelStatement(statement: tstl.LabelStatement): string {
        return this.indent(`::${statement.name}::\n`);
    }

    private printReturnStatement(statement: tstl.ReturnStatement): string {
        if (!statement.expressions) {
            return this.indent(`return;\n`);
        }
        return this.indent(`return ${statement.expressions.map(e => this.printExpression(e)).join(", ")};\n`);
    }

    private printBreakStatement(statement: tstl.BreakStatement): string {
        return this.indent("break;\n");
    }

    private printExpressionStatement(statement: tstl.ExpressionStatement): string {
        return this.indent(`${this.printExpression(statement.expression)};\n`);
    }

    // Expressions
    private printExpression(expression: tstl.Expression): string {
        switch (expression.kind) {
            case tstl.SyntaxKind.StringLiteral:
                return this.printStringLiteral(expression as tstl.StringLiteral);
            case tstl.SyntaxKind.NumericLiteral:
                return this.printNumericLiteral(expression as tstl.NumericLiteral);
            case tstl.SyntaxKind.NilKeyword:
                return this.printNilLiteral(expression as tstl.NilLiteral);
            case tstl.SyntaxKind.DotsKeyword:
                return this.printDotsLiteral(expression as tstl.DotsLiteral);
            case tstl.SyntaxKind.TrueKeyword:
            case tstl.SyntaxKind.FalseKeyword:
                return this.printBooleanLiteral(expression as tstl.BooleanLiteral);
            case tstl.SyntaxKind.FunctionExpression:
                return this.printFunctionExpression(expression as tstl.FunctionExpression);
            case tstl.SyntaxKind.TableFieldExpression:
                return this.printTableFieldExpression(expression as tstl.TableFieldExpression);
            case tstl.SyntaxKind.TableExpression:
                return this.printTableExpression(expression as tstl.TableExpression);
            case tstl.SyntaxKind.UnaryExpression:
                return this.printUnaryExpression(expression as tstl.UnaryExpression);
            case tstl.SyntaxKind.BinaryExpression:
                return this.printBinaryExpression(expression as tstl.BinaryExpression);
            case tstl.SyntaxKind.ParenthesizedExpression:
                return this.printParenthesizedExpression(expression as tstl.ParenthesizedExpression);
            case tstl.SyntaxKind.CallExpression:
                return this.printCallExpression(expression as tstl.CallExpression);
            case tstl.SyntaxKind.MethodCallExpression:
                return this.printMethodCallExpression(expression as tstl.MethodCallExpression);
            case tstl.SyntaxKind.Identifier:
                return this.printIdentifier(expression as tstl.Identifier);
            case tstl.SyntaxKind.TableIndexExpression:
                return this.printTableIndexExpression(expression as tstl.TableIndexExpression);
        }
    }

    private printStringLiteral(expression: tstl.StringLiteral): string {
        return `"${expression.value}"`;
    }

    private printNumericLiteral(expression: tstl.NumericLiteral): string {
        return `${expression.value}`;
    }

    private printNilLiteral(expression: tstl.NilLiteral): string {
        return "nil";
    }

    private printDotsLiteral(expression: tstl.DotsLiteral): string {
        return "...";
    }

    private printBooleanLiteral(expression: tstl.BooleanLiteral): string {
        if (expression.kind === tstl.SyntaxKind.TrueKeyword) {
            return "true";
        } else {
            return "false";
        }
    }

    private printFunctionExpression(expression: tstl.FunctionExpression): string {
        const paramterArr: string[] = expression.params ? expression.params.map(i => this.printIdentifier(i)) : [];
        if (expression.dots) {
            paramterArr.push(this.printDotsLiteral(expression.dots));
        }

        let result = `function(${paramterArr.join(", ")})\n`;
        this.pushIndent();
        result += this.printBlock(expression.body);
        this.popIndent();
        result += this.indent("end");

        return result;
    }

    private printTableFieldExpression(expression: tstl.TableFieldExpression): string {
        const value = this.printExpression(expression.value);

        if (expression.key) {
            if (tstl.isStringLiteral(expression.key) && tsHelper.isValidLuaIdentifier(expression.key.value)) {
                return `${expression.key.value} = ${value}`;
            } else {
                return `[${this.printExpression(expression.key)}] = ${value}`;
            }
        } else {
            return value;
        }
    }

    private printTableExpression(expression: tstl.TableExpression): string {
        let fields = "";
        if (expression.fields) {
            fields = expression.fields.map(f => this.printTableFieldExpression(f)).join(", ");
        }
        return `{${fields}}`;
    }

    private printUnaryExpression(expression: tstl.UnaryExpression): string {
        const operand = this.needsParentheses(expression.operand)
            ? `(${this.printExpression(expression.operand)})`
            : this.printExpression(expression.operand);
        return `${this.printOperator(expression.operator)}${operand}`;
    }

    private printBinaryExpression(expression: tstl.BinaryExpression): string {
        const left = this.needsParentheses(expression.left)
            ? `(${this.printExpression(expression.left)})`
            : this.printExpression(expression.left);

        const right = this.needsParentheses(expression.right)
            ? `(${this.printExpression(expression.right)})`
            : this.printExpression(expression.right);

        const operator = this.printOperator(expression.operator);
        return `${left} ${operator} ${right}`;
    }

    private needsParentheses(expression: tstl.Expression): boolean {
        return tstl.isBinaryExpression(expression) || tstl.isUnaryExpression(expression)
            || tstl.isFunctionExpression(expression);
    }

    private printParenthesizedExpression(expression: tstl.ParenthesizedExpression): string {
        return `(${this.printExpression(expression.innerEpxression)})`;
    }

    private printCallExpression(expression: tstl.CallExpression): string {
        const params = expression.params ? expression.params.map(e => this.printExpression(e)).join(", ") : "";
        return this.needsParentheses(expression.expression)
            ? `(${this.printExpression(expression.expression)})(${params})`
            : `${this.printExpression(expression.expression)}(${params})`;
    }

    private printMethodCallExpression(expression: tstl.MethodCallExpression): string {
        const params = expression.params.map(e => this.printExpression(e)).join(", ");
        const prefix = this.printExpression(expression.prefixExpression);
        const name = this.printIdentifier(expression.name);
        return `${prefix}:${name}(${params})`;
    }

    private printIdentifier(expression: tstl.Identifier): string {
        return expression.text;
    }

    private printTableIndexExpression(expression: tstl.TableIndexExpression): string {
        const table = this.printExpression(expression.table);
        if (tstl.isStringLiteral(expression.index) && tsHelper.isValidLuaIdentifier(expression.index.value)) {
            return `${table}.${expression.index.value}`;
        }
        return `${table}[${this.printExpression(expression.index)}]`;
    }

    private printOperator(kind: tstl.Operator): string {
        return LuaPrinter.operatorMap[kind];
    }

    private ignoreDeadStatements(statements: tstl.Statement[]): tstl.Statement[] {
        const aliveStatements = [];
        for (const statement of statements) {
            aliveStatements.push(statement);
            if (tstl.isReturnStatement(statement)) {
                break;
            }
        }
        return aliveStatements;
    }
}
