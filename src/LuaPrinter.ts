import * as path from "path";

import { Mapping, SourceNode, SourceMapGenerator } from "source-map";

import * as tstl from "./LuaAST";
import { CompilerOptions, LuaLibImportKind } from "./CompilerOptions";
import { LuaLib, LuaLibFeature } from "./LuaLib";
import { TSHelper as tsHelper } from "./TSHelper";

type SourceChunk = string | SourceNode;

export class LuaPrinter {
    private static operatorMap: {[key in tstl.Operator]: string} = {
        [tstl.SyntaxKind.AdditionOperator]: "+",
        [tstl.SyntaxKind.SubtractionOperator]: "-",
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
        [tstl.SyntaxKind.BitwiseLeftShiftOperator]: "<<",
        [tstl.SyntaxKind.BitwiseNotOperator]: "~",
    };

    private options: CompilerOptions;
    private currentIndent: string;

    private sourceFile = "";

    public constructor(options: CompilerOptions) {
        this.options = options;
        this.currentIndent = "";
    }

    public print(block: tstl.Block, luaLibFeatures?: Set<LuaLibFeature>, sourceFile = ""): [string, string] {
        // Add traceback lualib if sourcemap traceback option is enabled
        if (this.options.sourceMapTraceback) {
            if (luaLibFeatures === undefined) {
                luaLibFeatures = new Set();
            }
            luaLibFeatures.add(LuaLibFeature.SourceMapTraceBack);
        }

        const rootSourceNode = this.printImplementation(block, luaLibFeatures, sourceFile);

        const sourceRoot = this.options.sourceRoot
            || (this.options.outDir ? path.relative(this.options.outDir, this.options.rootDir || process.cwd()) : ".");

        const sourceMap = this.buildSourceMap(sourceFile, sourceRoot, rootSourceNode);

        let codeResult = rootSourceNode.toString();

        if (this.options.inlineSourceMap) {
            codeResult += "\n" + this.printInlineSourceMap(sourceMap);
        }

        if (this.options.sourceMapTraceback) {
            const stackTraceOverride = this.printStackTraceOverride(rootSourceNode);
            codeResult = codeResult.replace("{#SourceMapTraceback}", stackTraceOverride);
        }

        return [codeResult, sourceMap.toString()];
    }

    private printInlineSourceMap(sourceMap: SourceMapGenerator): string {
        const map = sourceMap.toString();
        const base64Map = Buffer.from(map).toString('base64');

        return `--# sourceMappingURL=data:application/json;base64,${base64Map}\n`;
    }

    private printStackTraceOverride(rootNode: SourceNode): string {
        let line = 1;
        const map: {[line: number]: number} = {};
        rootNode.walk((chunk, mappedPosition) => {
            if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
                if (map[line] === undefined) {
                    map[line] = mappedPosition.line;
                } else {
                    map[line] = Math.min(map[line], mappedPosition.line);
                }
            }
            line += chunk.split("\n").length - 1;
        });

        const mapItems = [];
        for (const lineNr in map) {
            mapItems.push(`["${lineNr}"] = ${map[lineNr]}`);
        }

        const mapString = "{" + mapItems.join(",") + "}";

        return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapString});`;
    }

    private printImplementation(
        block: tstl.Block,
        luaLibFeatures?: Set<LuaLibFeature>,
        sourceFile = ""): SourceNode {

        let header = "";

        if (!this.options.noHeader) {
            header += `--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]\n`;
        }

        if (luaLibFeatures) {
            const luaLibImport = this.options.luaLibImport || LuaLibImportKind.Inline;
            // Require lualib bundle
            if ((luaLibImport === LuaLibImportKind.Require && luaLibFeatures.size > 0)
                || luaLibImport === LuaLibImportKind.Always)
            {
                header += `require("lualib_bundle");\n`;
            }
            // Inline lualib features
            else if (luaLibImport === LuaLibImportKind.Inline && luaLibFeatures.size > 0) {
                header += "-- Lua Library inline imports\n";
                header += LuaLib.loadFeatures(luaLibFeatures);
            }
        }

        this.sourceFile = path.basename(sourceFile);

        if (this.options.sourceMapTraceback) {
            header += "{#SourceMapTraceback}\n";
        }

        const fileBlockNode = this.printBlock(block);

        return this.concatNodes(header, fileBlockNode);
    }

    protected pushIndent(): void {
        this.currentIndent = this.currentIndent + "    ";
    }

    protected popIndent(): void {
        this.currentIndent = this.currentIndent.slice(4);
    }

    protected indent(input: SourceChunk = ""): SourceChunk {
        return this.concatNodes(this.currentIndent, input);
    }

    protected createSourceNode(node: tstl.Node, chunks: SourceChunk | SourceChunk[]): SourceNode {
        const originalPos = tstl.getOriginalPos(node);

        return originalPos !== undefined && originalPos.line !== undefined && originalPos.column !== undefined
            ? new SourceNode(originalPos.line + 1, originalPos.column, this.sourceFile, chunks)
            // tslint:disable-next-line:no-null-keyword
            : new SourceNode(null, null, this.sourceFile, chunks);
    }

    protected concatNodes(...chunks: SourceChunk[]): SourceNode {
        // tslint:disable-next-line:no-null-keyword
        return new SourceNode(null, null, this.sourceFile, chunks);
    }

    protected printBlock(block: tstl.Block): SourceNode {
        return this.concatNodes(...this.printStatementArray(block.statements));
    }

    private statementMayRequireSemiColon(statement: tstl.Statement): boolean {
        // Types of statements that could create ambiguous syntax if followed by parenthesis
        return tstl.isVariableDeclarationStatement(statement)
            || tstl.isAssignmentStatement(statement)
            || tstl.isExpressionStatement(statement);
    }

    private nodeStartsWithParenthesis(sourceNode: SourceNode): boolean {
        let result: boolean | undefined;
        sourceNode.walk(chunk => {
            if (result === undefined) {
                chunk = chunk.trimLeft(); // Ignore leading whitespace

                if (chunk.length > 0) {
                    result = chunk.startsWith("(");
                }
            }
        });
        return result || false;
    }

    protected printStatementArray(statements: tstl.Statement[]): SourceChunk[] {
        const statementNodes: SourceNode[] = [];
        statements = this.removeDeadAndEmptyStatements(statements);
        statements.forEach(
            (s, i) => {
                const node = this.printStatement(s);

                if (i > 0
                    && this.statementMayRequireSemiColon(statements[i - 1])
                    && this.nodeStartsWithParenthesis(node))
                {
                    statementNodes[i - 1].add(";");
                }

                statementNodes.push(node);
            }
        );
        return statementNodes.length > 0 ? [...this.joinChunks("\n", statementNodes), "\n"] : [];
    }

    public printStatement(statement: tstl.Statement): SourceNode {
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
            default:
                throw new Error(`Tried to print unknown statement kind: ${tstl.SyntaxKind[statement.kind]}`);
        }
    }

    public printDoStatement(statement: tstl.DoStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("do\n"));
        this.pushIndent();
        chunks.push(...this.printStatementArray(statement.statements));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.concatNodes(...chunks);
    }

    public printVariableDeclarationStatement(statement: tstl.VariableDeclarationStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("local "));

        if (tstl.isFunctionDefinition(statement)) {
            // Print all local functions as `local function foo()` instead of `local foo = function` to allow recursion
            chunks.push(this.printFunctionDefinition(statement));

        } else {
            chunks.push(...this.joinChunks(", ", statement.left.map(e => this.printExpression(e))));

            if (statement.right) {
                chunks.push(" = ");
                chunks.push(...this.joinChunks(", ", statement.right.map(e => this.printExpression(e))));
            }
        }

        return this.concatNodes(...chunks);
    }

    public printVariableAssignmentStatement(statement: tstl.AssignmentStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent());

        if (tstl.isFunctionDefinition(statement)
            && (statement.right[0].flags & tstl.FunctionExpressionFlags.Declaration) !== 0)
        {
            // Use `function foo()` instead of `foo = function()`
            const name = this.printExpression(statement.left[0]);
            if (tsHelper.isValidLuaFunctionDeclarationName(name.toString())) {
                chunks.push(this.printFunctionDefinition(statement));
                return this.createSourceNode(statement, chunks);
            }
        }

        chunks.push(...this.joinChunks(", ", statement.left.map(e => this.printExpression(e))));
        chunks.push(" = ");
        chunks.push(...this.joinChunks(", ", statement.right.map(e => this.printExpression(e))));

        return this.createSourceNode(statement, chunks);
    }

    public printIfStatement(statement: tstl.IfStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        const isElseIf = statement.parent !== undefined
            && tstl.isIfStatement(statement.parent);

        const prefix = isElseIf ? "elseif" : "if";

        chunks.push(this.indent(prefix + " "), this.printExpression(statement.condition), " then\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.ifBlock));
        this.popIndent();

        if (statement.elseBlock) {
            if (tstl.isIfStatement(statement.elseBlock)) {
                chunks.push(this.printIfStatement(statement.elseBlock));
            } else {
                chunks.push(this.indent("else\n"));
                this.pushIndent();
                chunks.push(this.printBlock(statement.elseBlock));
                this.popIndent();
                chunks.push(this.indent("end"));
            }
        } else {
            chunks.push(this.indent("end"));
        }

        return this.concatNodes(...chunks);
    }

    public printWhileStatement(statement: tstl.WhileStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("while "), this.printExpression(statement.condition), " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("end"));

        return this.concatNodes(...chunks);
    }

    public printRepeatStatement(statement: tstl.RepeatStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent(`repeat\n`));

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("until "), this.printExpression(statement.condition));

        return this.concatNodes(...chunks);
    }

    public printForStatement(statement: tstl.ForStatement): SourceNode {
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

        chunks.push(this.indent("end"));

        return this.concatNodes(...chunks);
    }

    public printForInStatement(statement: tstl.ForInStatement): SourceNode {
        const names = statement.names.map(i => this.printIdentifier(i)).join(", ");
        const expressions = statement.expressions.map(e => this.printExpression(e)).join(", ");

        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("for "), names, " in ", expressions, " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.createSourceNode(statement, chunks);
    }

    public printGotoStatement(statement: tstl.GotoStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("goto "), statement.label]);
    }

    public printLabelStatement(statement: tstl.LabelStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("::"), statement.name, "::"]);
    }

    public printReturnStatement(statement: tstl.ReturnStatement): SourceNode {
        if (!statement.expressions || statement.expressions.length === 0) {
            return this.createSourceNode(statement, this.indent("return"));
        }

        const chunks: SourceChunk[] = [];

        chunks.push(...this.joinChunks(", ", statement.expressions.map(e => this.printExpression(e))));

        return this.createSourceNode(statement, [this.indent(), "return ", ...chunks]);
    }

    public printBreakStatement(statement: tstl.BreakStatement): SourceNode {
        return this.createSourceNode(statement, this.indent("break"));
    }

    public printExpressionStatement(statement: tstl.ExpressionStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent(), this.printExpression(statement.expression)]);
    }

    // Expressions
    public printExpression(expression: tstl.Expression): SourceNode {
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
            default:
                throw new Error(`Tried to print unknown statement kind: ${tstl.SyntaxKind[expression.kind]}`);
        }
    }

    public printStringLiteral(expression: tstl.StringLiteral): SourceNode {
        return this.createSourceNode(expression, `"${expression.value}"`);
    }

    public printNumericLiteral(expression: tstl.NumericLiteral): SourceNode {
        return this.createSourceNode(expression, String(expression.value));
    }

    public printNilLiteral(expression: tstl.NilLiteral): SourceNode {
        return this.createSourceNode(expression, "nil");
    }

    public printDotsLiteral(expression: tstl.DotsLiteral): SourceNode {
        return this.createSourceNode(expression, "...");
    }

    public printBooleanLiteral(expression: tstl.BooleanLiteral): SourceNode {
        if (expression.kind === tstl.SyntaxKind.TrueKeyword) {
            return this.createSourceNode(expression, "true");
        } else {
            return this.createSourceNode(expression, "false");
        }
    }

    private printFunctionParameters(expression: tstl.FunctionExpression): SourceChunk[] {
        const parameterChunks: SourceNode[] = expression.params
            ? expression.params.map(i => this.printIdentifier(i))
            : [];

        if (expression.dots) {
            parameterChunks.push(this.printDotsLiteral(expression.dots));
        }

        return this.joinChunks(", ", parameterChunks);
    }

    public printFunctionExpression(expression: tstl.FunctionExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push("function(");
        chunks.push(...this.printFunctionParameters(expression));
        chunks.push(")");

        if (tstl.isInlineFunctionExpression(expression)) {
            const returnStatement = expression.body.statements[0];
            chunks.push(" ");
            const returnNode: SourceChunk[] = [
                "return ",
                ...this.joinChunks(", ", returnStatement.expressions.map(e => this.printExpression(e))),
            ];
            chunks.push(this.createSourceNode(returnStatement, returnNode));
            chunks.push(" end");

        } else {
            chunks.push("\n");
            this.pushIndent();
            chunks.push(this.printBlock(expression.body));
            this.popIndent();
            chunks.push(this.indent("end"));
        }

        return this.createSourceNode(expression, chunks);
    }

    public printFunctionDefinition(statement: tstl.FunctionDefinition): SourceNode {
        const expression = statement.right[0];
        const chunks: SourceChunk[] = [];

        chunks.push("function ");
        chunks.push(this.printExpression(statement.left[0]));
        chunks.push("(");
        chunks.push(...this.printFunctionParameters(expression));
        chunks.push(")\n");

        this.pushIndent();
        chunks.push(this.printBlock(expression.body));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.createSourceNode(expression, chunks);
    }

    public printTableFieldExpression(expression: tstl.TableFieldExpression): SourceNode {
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

    public printTableExpression(expression: tstl.TableExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push("{");

        if (expression.fields && expression.fields.length > 0) {
            if (expression.fields.length === 1) {
                // Inline tables with only one entry
                chunks.push(this.printTableFieldExpression(expression.fields[0]));

            } else {
                chunks.push("\n");
                this.pushIndent();
                expression.fields.forEach(f => chunks.push(this.indent(), this.printTableFieldExpression(f), ",\n"));
                this.popIndent();
                chunks.push(this.indent());
            }
        }

        chunks.push("}");

        return this.createSourceNode(expression, chunks);
    }

    public printUnaryExpression(expression: tstl.UnaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printOperator(expression.operator));
        chunks.push(this.printExpression(expression.operand));

        return this.createSourceNode(expression, chunks);
    }

    public printBinaryExpression(expression: tstl.BinaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printExpression(expression.left));
        chunks.push(" ", this.printOperator(expression.operator), " ");
        chunks.push(this.printExpression(expression.right));

        return this.createSourceNode(expression, chunks);
    }

    public printParenthesizedExpression(expression: tstl.ParenthesizedExpression): SourceNode {
        return this.createSourceNode(expression, ["(", this.printExpression(expression.innerExpression), ")"]);
    }

    public printCallExpression(expression: tstl.CallExpression): SourceNode {
        const chunks = [];

        const parameterChunks = expression.params !== undefined
            ? expression.params.map(e => this.printExpression(e))
            : [];

        chunks.push(this.printExpression(expression.expression), "(", ...this.joinChunks(", ", parameterChunks), ")");

        return this.createSourceNode(expression, chunks);
    }

    public printMethodCallExpression(expression: tstl.MethodCallExpression): SourceNode {
        const prefix = this.printExpression(expression.prefixExpression);

        const parameterChunks = expression.params !== undefined
            ? expression.params.map(e => this.printExpression(e))
            : [];

        const name = this.printIdentifier(expression.name);

        return this.createSourceNode(
            expression,
            [prefix, ":", name, "(", ...this.joinChunks(", ", parameterChunks), ")"]
        );
    }

    public printIdentifier(expression: tstl.Identifier): SourceNode {
        return this.createSourceNode(expression, expression.text);
    }

    public printTableIndexExpression(expression: tstl.TableIndexExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printExpression(expression.table));
        if (tstl.isStringLiteral(expression.index) && tsHelper.isValidLuaIdentifier(expression.index.value)) {
            chunks.push(".", this.createSourceNode(expression.index, expression.index.value));
        } else {
            chunks.push("[", this.printExpression(expression.index), "]");
        }
        return this.createSourceNode(expression, chunks);
    }

    public printOperator(kind: tstl.Operator): SourceNode {
        // tslint:disable-next-line:no-null-keyword
        return new SourceNode(null, null, this.sourceFile, LuaPrinter.operatorMap[kind]);
    }

    protected removeDeadAndEmptyStatements(statements: tstl.Statement[]): tstl.Statement[] {
        const aliveStatements = [];
        for (const statement of statements) {
            if (!this.isStatementEmpty(statement)) {
                aliveStatements.push(statement);
            }
            if (tstl.isReturnStatement(statement)) {
                break;
            }
        }
        return aliveStatements;
    }

    protected isStatementEmpty(statement: tstl.Statement): boolean {
        return tstl.isDoStatement(statement) && (!statement.statements || statement.statements.length === 0);
    }

    protected joinChunks(separator: string, chunks: SourceChunk[]): SourceChunk[] {
        const result = [];
        for (let i = 0; i < chunks.length; i++) {
            result.push(chunks[i]);
            if (i < chunks.length - 1) {
                result.push(separator);
            }
        }
        return result;
    }

    // The key difference between this and SourceNode.toStringWithSourceMap() is that SourceNodes with null line/column
    // will not generate 'empty' mappings in the source map that point to nothing in the original TS.
    private buildSourceMap(sourceFile: string, sourceRoot: string, rootSourceNode: SourceNode): SourceMapGenerator {
        const map = new SourceMapGenerator({
            file: path.basename(sourceFile, path.extname(sourceFile)) + ".lua",
            sourceRoot,
        });

        let generatedLine = 1;
        let generatedColumn = 0;
        let currentMapping: Mapping | undefined;

        const isNewMapping = (sourceNode: SourceNode) => {
            if (sourceNode.line === null) {
                return false;
            }
            if (currentMapping === undefined) {
                return true;
            }
            if (currentMapping.generated.line === generatedLine
                && currentMapping.generated.column === generatedColumn)
            {
                return false;
            }
            return (currentMapping.original.line !== sourceNode.line
                || currentMapping.original.column !== sourceNode.column);
        };

        const build = (sourceNode: SourceNode) => {
            if (isNewMapping(sourceNode)) {
                currentMapping = {
                    source: sourceNode.source,
                    original: { line: sourceNode.line, column: sourceNode.column },
                    generated: { line: generatedLine, column: generatedColumn },
                };
                map.addMapping(currentMapping);
            }

            for (const chunk of sourceNode.children) {
                if (typeof chunk === "string") {
                    const lines = (chunk as string).split("\n");
                    if (lines.length > 1) {
                        generatedLine += lines.length - 1;
                        generatedColumn = 0;
                        currentMapping = undefined; // Mappings end at newlines
                    }
                    generatedColumn += lines[lines.length - 1].length;

                } else {
                    build(chunk);
                }
            }
        };
        build(rootSourceNode);

        return map;
    }
}
