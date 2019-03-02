import * as tstl from "./LuaAST";

import * as path from "path";

import {SourceNode} from "source-map";

import { TSHelper as tsHelper } from "./TSHelper";
import { LuaLibFeature, LuaLib } from "./LuaLib";
import { CompilerOptions } from "./CompilerOptions";
import { LuaLibImportKind } from "./CompilerOptions";

type SourceChunk = string | SourceNode;

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

    private sourceFile: string;

    public constructor(options: CompilerOptions) {
        this.options = options;
        this.currentIndent = "";
    }

    public print(block: tstl.Block, luaLibFeatures?: Set<LuaLibFeature>, sourceFile?: string): string {
        return this.printImplementation(block, luaLibFeatures, sourceFile).toString();
    }

    public printWithSourceMap(
        block: tstl.Block,
        luaLibFeatures?: Set<LuaLibFeature>,
        sourceFile?: string): [string, string] {

        const codeWithMap =
            this.printImplementation(block, luaLibFeatures, sourceFile)
                // TODO is the file: part really required? and should this be handled in the printer?
                .toStringWithSourceMap({file: path.basename(sourceFile, path.extname(sourceFile)) + ".lua"});
        return [codeWithMap.code, codeWithMap.map.toString()];
    }

    private printImplementation(
        block: tstl.Block,
        luaLibFeatures?: Set<LuaLibFeature>,
        sourceFile?: string): SourceNode {

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

        this.sourceFile = path.basename(sourceFile);

        const blockNode =  this.createSourceNode(block, this.printBlock(block));

        return this.concatNodes(header, blockNode);
    }

    private pushIndent(): void {
        this.currentIndent = this.currentIndent + "    ";
    }

    private popIndent(): void {
        this.currentIndent = this.currentIndent.slice(4);
    }

    private indent(input: SourceChunk = ""): SourceChunk {
        return this.concatNodes(this.currentIndent, input);
    }

    private createSourceNode(node: tstl.Node, chunks: SourceChunk | SourceChunk[]): SourceNode {
        const originalPos = tstl.getOriginalPos(node);

        if (originalPos) {
            return new SourceNode(originalPos.line + 1, originalPos.column, this.sourceFile, chunks);
        } else {
            return new SourceNode(undefined, undefined, this.sourceFile, chunks);
        }
    }

    private concatNodes(...chunks: SourceChunk[]): SourceNode {
        return new SourceNode(undefined, undefined, this.sourceFile, chunks);
    }

    private printBlock(block: tstl.Block): SourceNode {
        return this.createSourceNode(
            block,
            this.ignoreDeadStatements(block.statements).map(s => this.printStatement(s))
        );
    }

    private printStatement(statement: tstl.Statement): SourceNode {
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

    private printDoStatement(statement: tstl.DoStatement): SourceNode {
        const chunks: SourceChunk[] = [];
        chunks.push(this.indent("do\n"));
        this.pushIndent();
        chunks.push(...this.ignoreDeadStatements(statement.statements).map(s => this.printStatement(s)));
        this.popIndent();
        chunks.push(this.indent("end\n"));

        return this.concatNodes(...chunks);
    }

    private printVariableDeclarationStatement(statement: tstl.VariableDeclarationStatement): SourceNode {
        const chunks: SourceChunk[] = [];
        chunks.push(this.indent("local "));
        chunks.push(...this.joinChunks(", ", statement.left.map(e => this.printExpression(e))));

        if (statement.right) {
            chunks.push(" = ");
            chunks.push(...this.joinChunks(", ", statement.right.map(e => this.printExpression(e))));
        }
        chunks.push(";\n");

        return this.concatNodes(...chunks);
    }

    private printVariableAssignmentStatement(statement: tstl.AssignmentStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent());
        chunks.push(...this.joinChunks(", ", statement.left.map(e => this.printExpression(e))));
        chunks.push(" = ");
        chunks.push(...this.joinChunks(", ", statement.right.map(e => this.printExpression(e))));
        chunks.push(";\n");

        return this.createSourceNode(statement, chunks);
    }

    private printIfStatement(statement: tstl.IfStatement, isElseIf?: boolean): SourceNode {
        const chunks: SourceChunk[] = [];

        const prefix = isElseIf ? "elseif" : "if";

        chunks.push(this.indent(prefix + " "), this.printExpression(statement.condtion), " then\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.ifBlock));
        this.popIndent();

        if (statement.elseBlock) {
            if (tstl.isIfStatement(statement.elseBlock)) {
                chunks.push(this.printIfStatement(statement.elseBlock, true));
            } else {
                chunks.push(this.indent("else\n"));
                this.pushIndent();
                chunks.push(this.printBlock(statement.elseBlock));
                this.popIndent();
                chunks.push(this.indent("end\n"));
            }
        } else {
            chunks.push(this.indent("end\n"));
        }

        return this.concatNodes(...chunks);
    }

    private printWhileStatement(statement: tstl.WhileStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("while "), this.printExpression(statement.condtion), " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("end\n"));

        return this.concatNodes(...chunks);
    }

    private printRepeatStatement(statement: tstl.RepeatStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent(`repeat\n`));

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("until "), this.printExpression(statement.condtion), ";\n");

        return this.concatNodes(...chunks);
    }

    private printForStatement(statement: tstl.ForStatement): SourceNode {
        const ctrlVar = this.printExpression(statement.controlVariable);
        const ctrlVarInit = this.printExpression(statement.controlVariableInitializer);
        const limit = this.printExpression(statement.limitExpression);

        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("for "), ctrlVar, " = ", ctrlVarInit, ", ", limit);

        if (statement.stepExpression) {
            chunks.push(", ", this.printExpression(statement.stepExpression));
        }
        chunks.push(" do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("end\n"));

        return this.concatNodes(...chunks);
    }

    private printForInStatement(statement: tstl.ForInStatement): SourceNode {
        const names = statement.names.map(i => this.printIdentifier(i)).join(", ");
        const expressions = statement.expressions.map(e => this.printExpression(e)).join(", ");

        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("for "), names, " in ", expressions, " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end\n"));

        return this.createSourceNode(statement, chunks);
    }

    private printGotoStatement(statement: tstl.GotoStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("goto "), statement.label, ";\n"]);
    }

    private printLabelStatement(statement: tstl.LabelStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("::"), statement.name, "::\n"]);
    }

    private printReturnStatement(statement: tstl.ReturnStatement): SourceNode {
        if (!statement.expressions) {
            return this.createSourceNode(statement, this.indent("return;\n"));
        }

        const chunks: SourceChunk[] = [];

        //chunks.push(this.createSourceNode(statement, this.indent("return ")));

        chunks.push(...this.joinChunks(", ", statement.expressions.map(e => this.printExpression(e))));

        chunks.push(";\n");

        return this.createSourceNode(statement, [this.indent(), "return ", ...chunks]);
    }

    private printBreakStatement(statement: tstl.BreakStatement): SourceNode {
        return this.createSourceNode(statement, this.indent("break;\n"));
    }

    private printExpressionStatement(statement: tstl.ExpressionStatement): SourceNode {
        return this.concatNodes(this.indent(), this.printExpression(statement.expression), ";\n");
    }

    // Expressions
    private printExpression(expression: tstl.Expression): SourceNode {
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

    private printStringLiteral(expression: tstl.StringLiteral): SourceNode {
        return this.createSourceNode(expression, `"${expression.value}"`);
    }

    private printNumericLiteral(expression: tstl.NumericLiteral): SourceNode {
        return this.createSourceNode(expression, String(expression.value));
    }

    private printNilLiteral(expression: tstl.NilLiteral): SourceNode {
        return this.createSourceNode(expression, "nil");
    }

    private printDotsLiteral(expression: tstl.DotsLiteral): SourceNode {
        return this.createSourceNode(expression, "...");
    }

    private printBooleanLiteral(expression: tstl.BooleanLiteral): SourceNode {
        if (expression.kind === tstl.SyntaxKind.TrueKeyword) {
            return this.createSourceNode(expression, "true");
        } else {
            return this.createSourceNode(expression, "false");
        }
    }

    private printFunctionExpression(expression: tstl.FunctionExpression): SourceNode {
        const parameterChunks: SourceNode[] = expression.params
            ? expression.params.map(i => this.printIdentifier(i))
            : [];

        if (expression.dots) {
            parameterChunks.push(this.printDotsLiteral(expression.dots));
        }

        const chunks: SourceChunk[] = [];

        chunks.push("function(");
        chunks.push(...this.joinChunks(", ", parameterChunks));
        chunks.push(")\n");

        this.pushIndent();
        chunks.push(this.printBlock(expression.body));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.createSourceNode(expression, chunks);
    }

    private printTableFieldExpression(expression: tstl.TableFieldExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        const value = this.printExpression(expression.value);

        if (expression.key) {
            if (tstl.isStringLiteral(expression.key) && tsHelper.isValidLuaIdentifier(expression.key.value)) {
                chunks.push(expression.key.value, " = ", value);
            } else {
                chunks.push("[", this.printExpression(expression.key), "] = ", value);
            }
        } else {
            chunks.push(value);
        }

        return this.createSourceNode(expression, chunks);
    }

    private printTableExpression(expression: tstl.TableExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push("{");

        if (expression.fields) {
            expression.fields.forEach((f, i) => {
                if (i < expression.fields.length - 1) {
                    chunks.push(this.printTableFieldExpression(f), ", ");
                } else {
                    chunks.push(this.printTableFieldExpression(f));
                }
            });
        }

        chunks.push("}");

        return this.createSourceNode(expression, chunks);
    }

    private printUnaryExpression(expression: tstl.UnaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printOperator(expression.operator));

        if (this.needsParentheses(expression.operand)) {
            chunks.push("(", this.printExpression(expression.operand), ")");
        } else {
            chunks.push(this.printExpression(expression.operand));
        }

        return this.createSourceNode(expression, chunks);
    }

    private printBinaryExpression(expression: tstl.BinaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        if (this.needsParentheses(expression.left)) {
            chunks.push("(", this.printExpression(expression.left), ")");
        } else {
            chunks.push(this.printExpression(expression.left));
        }

        chunks.push(" ", this.printOperator(expression.operator), " ");

        if (this.needsParentheses(expression.right)) {
            chunks.push("(", this.printExpression(expression.right), ")");
        } else {
            chunks.push(this.printExpression(expression.right));
        }

        return this.createSourceNode(expression, chunks);
    }

    private needsParentheses(expression: tstl.Expression): boolean {
        return tstl.isBinaryExpression(expression) || tstl.isUnaryExpression(expression)
            || tstl.isFunctionExpression(expression);
    }

    private printParenthesizedExpression(expression: tstl.ParenthesizedExpression): SourceNode {
        return this.createSourceNode(expression, ["(", this.printExpression(expression.innerEpxression), ")"]);
    }

    private printCallExpression(expression: tstl.CallExpression): SourceNode {
        const chunks = [];
        const parameterChunks = this.joinChunks(", ", expression.params.map(e => this.printExpression(e)));

        if (this.needsParentheses(expression.expression)) {
            chunks.push("(", this.printExpression(expression.expression), ")(", ...parameterChunks, ")");
        } else {
            chunks.push(this.printExpression(expression.expression), "(", ...parameterChunks, ")");
        }

        return this.concatNodes(...chunks);
    }

    private printMethodCallExpression(expression: tstl.MethodCallExpression): SourceNode {
        const prefix = this.printExpression(expression.prefixExpression);
        const parameterChunks = this.joinChunks(", ", expression.params.map(e => this.printExpression(e)));
        const name = this.printIdentifier(expression.name);

        return this.concatNodes(prefix, ":", name, "(", ...parameterChunks, ")");
    }

    private printIdentifier(expression: tstl.Identifier): SourceNode {
        return this.createSourceNode(expression, expression.text);
    }

    private printTableIndexExpression(expression: tstl.TableIndexExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printExpression(expression.table));
        if (tstl.isStringLiteral(expression.index) && tsHelper.isValidLuaIdentifier(expression.index.value)) {
            chunks.push(".", this.createSourceNode(expression.index, expression.index.value));
        } else {
            chunks.push("[", this.printExpression(expression.index), "]");
        }
        return this.createSourceNode(expression, chunks);
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

    private joinChunks(separator: string, chunks: SourceChunk[]): SourceChunk[] {
        const result = [];
        for (let i = 0; i < chunks.length; i++) {
            result.push(chunks[i]);
            if (i < chunks.length - 1) {
                result.push(separator);
            }
        }
        return result;
    }
}
