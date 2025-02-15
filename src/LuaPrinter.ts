import * as path from "path";
import { Mapping, SourceMapGenerator, SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled, LuaLibImportKind, LuaTarget } from "./CompilerOptions";
import * as lua from "./LuaAST";
import { loadImportedLualibFeatures, loadInlineLualibFeatures, LuaLibFeature } from "./LuaLib";
import { isValidLuaIdentifier, shouldAllowUnicode } from "./transformation/utils/safe-names";
import { EmitHost, getEmitPath } from "./transpilation";
import { intersperse, normalizeSlashes } from "./utils";

// https://www.lua.org/pil/2.4.html
// https://www.ecma-international.org/ecma-262/10.0/index.html#table-34
const escapeStringRegExp = /[\b\f\n\r\t\v\\"\0]/g;
const escapeStringMap: Record<string, string> = {
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
    "\v": "\\v",
    "\\": "\\\\",
    '"': '\\"',
    "\0": "\\0",
};

export const escapeString = (value: string) => `"${value.replace(escapeStringRegExp, char => escapeStringMap[char])}"`;

export const tstlHeader = "--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]\n";

/**
 * Checks that a name is valid for use in lua function declaration syntax:
 *
 * `foo.bar` => passes (`function foo.bar()` is valid)
 * `getFoo().bar` => fails (`function getFoo().bar()` would be illegal)
 */
const isValidLuaFunctionDeclarationName = (str: string, options: CompilerOptions) =>
    (shouldAllowUnicode(options) ? /^[a-zA-Z0-9_\u00FF-\uFFFD.]+$/ : /^[a-zA-Z0-9_.]+$/).test(str);

/**
 * Returns true if expression contains no function calls.
 */
function isSimpleExpression(expression: lua.Expression): boolean {
    switch (expression.kind) {
        case lua.SyntaxKind.CallExpression:
        case lua.SyntaxKind.MethodCallExpression:
        case lua.SyntaxKind.FunctionExpression:
            return false;

        case lua.SyntaxKind.TableExpression:
            const tableExpression = expression as lua.TableExpression;
            return tableExpression.fields.every(e => isSimpleExpression(e));

        case lua.SyntaxKind.TableFieldExpression:
            const fieldExpression = expression as lua.TableFieldExpression;
            return (
                (!fieldExpression.key || isSimpleExpression(fieldExpression.key)) &&
                isSimpleExpression(fieldExpression.value)
            );

        case lua.SyntaxKind.TableIndexExpression:
            const indexExpression = expression as lua.TableIndexExpression;
            return isSimpleExpression(indexExpression.table) && isSimpleExpression(indexExpression.index);

        case lua.SyntaxKind.UnaryExpression:
            return isSimpleExpression((expression as lua.UnaryExpression).operand);

        case lua.SyntaxKind.BinaryExpression:
            const binaryExpression = expression as lua.BinaryExpression;
            return isSimpleExpression(binaryExpression.left) && isSimpleExpression(binaryExpression.right);
    }

    return true;
}

type SourceChunk = string | SourceNode;

export type Printer = (program: ts.Program, emitHost: EmitHost, fileName: string, file: lua.File) => PrintResult;

export interface PrintResult {
    code: string;
    sourceMap: string;
    sourceMapNode: SourceNode;
}

export function createPrinter(printers: Printer[]): Printer {
    if (printers.length === 0) {
        return (program, emitHost, fileName, file) => new LuaPrinter(emitHost, program, fileName).print(file);
    } else if (printers.length === 1) {
        return printers[0];
    } else {
        throw new Error("Only one plugin can specify 'printer'");
    }
}

export class LuaPrinter {
    private static operatorMap: Record<lua.Operator, string> = {
        [lua.SyntaxKind.AdditionOperator]: "+",
        [lua.SyntaxKind.SubtractionOperator]: "-",
        [lua.SyntaxKind.MultiplicationOperator]: "*",
        [lua.SyntaxKind.DivisionOperator]: "/",
        [lua.SyntaxKind.FloorDivisionOperator]: "//",
        [lua.SyntaxKind.ModuloOperator]: "%",
        [lua.SyntaxKind.PowerOperator]: "^",
        [lua.SyntaxKind.NegationOperator]: "-",
        [lua.SyntaxKind.ConcatOperator]: "..",
        [lua.SyntaxKind.LengthOperator]: "#",
        [lua.SyntaxKind.EqualityOperator]: "==",
        [lua.SyntaxKind.InequalityOperator]: "~=",
        [lua.SyntaxKind.LessThanOperator]: "<",
        [lua.SyntaxKind.LessEqualOperator]: "<=",
        [lua.SyntaxKind.GreaterThanOperator]: ">",
        [lua.SyntaxKind.GreaterEqualOperator]: ">=",
        [lua.SyntaxKind.AndOperator]: "and",
        [lua.SyntaxKind.OrOperator]: "or",
        [lua.SyntaxKind.NotOperator]: "not ",
        [lua.SyntaxKind.BitwiseAndOperator]: "&",
        [lua.SyntaxKind.BitwiseOrOperator]: "|",
        [lua.SyntaxKind.BitwiseExclusiveOrOperator]: "~",
        [lua.SyntaxKind.BitwiseRightShiftOperator]: ">>",
        [lua.SyntaxKind.BitwiseLeftShiftOperator]: "<<",
        [lua.SyntaxKind.BitwiseNotOperator]: "~",
    };
    private static operatorPrecedence: Record<lua.Operator, number> = {
        [lua.SyntaxKind.OrOperator]: 1,
        [lua.SyntaxKind.AndOperator]: 2,

        [lua.SyntaxKind.EqualityOperator]: 3,
        [lua.SyntaxKind.InequalityOperator]: 3,
        [lua.SyntaxKind.LessThanOperator]: 3,
        [lua.SyntaxKind.LessEqualOperator]: 3,
        [lua.SyntaxKind.GreaterThanOperator]: 3,
        [lua.SyntaxKind.GreaterEqualOperator]: 3,

        [lua.SyntaxKind.BitwiseOrOperator]: 4,
        [lua.SyntaxKind.BitwiseExclusiveOrOperator]: 5,
        [lua.SyntaxKind.BitwiseAndOperator]: 6,

        [lua.SyntaxKind.BitwiseLeftShiftOperator]: 7,
        [lua.SyntaxKind.BitwiseRightShiftOperator]: 7,

        [lua.SyntaxKind.ConcatOperator]: 8,

        [lua.SyntaxKind.AdditionOperator]: 9,
        [lua.SyntaxKind.SubtractionOperator]: 9,

        [lua.SyntaxKind.MultiplicationOperator]: 10,
        [lua.SyntaxKind.DivisionOperator]: 10,
        [lua.SyntaxKind.FloorDivisionOperator]: 10,
        [lua.SyntaxKind.ModuloOperator]: 10,

        [lua.SyntaxKind.NotOperator]: 11,
        [lua.SyntaxKind.LengthOperator]: 11,
        [lua.SyntaxKind.NegationOperator]: 11,
        [lua.SyntaxKind.BitwiseNotOperator]: 11,

        [lua.SyntaxKind.PowerOperator]: 12,
    };
    private static rightAssociativeOperators = new Set([lua.SyntaxKind.ConcatOperator, lua.SyntaxKind.PowerOperator]);

    protected currentIndent = "";
    protected luaFile: string;
    protected relativeSourcePath: string;
    protected options: CompilerOptions;

    public static readonly sourceMapTracebackPlaceholder = "{#SourceMapTraceback}";

    constructor(private emitHost: EmitHost, private program: ts.Program, private sourceFile: string) {
        this.options = program.getCompilerOptions();
        this.luaFile = normalizeSlashes(getEmitPath(this.sourceFile, this.program));
        // Source nodes contain relative path from mapped lua file to original TS source file
        this.relativeSourcePath = normalizeSlashes(path.relative(path.dirname(this.luaFile), this.sourceFile));
    }

    public print(file: lua.File): PrintResult {
        // Add traceback lualib if sourcemap traceback option is enabled
        if (this.options.sourceMapTraceback) {
            file.luaLibFeatures.add(LuaLibFeature.SourceMapTraceBack);
        }

        const sourceRoot = this.options.sourceRoot
            ? // According to spec, sourceRoot is simply prepended to the source name, so the slash should be included
              `${this.options.sourceRoot.replace(/[\\/]+$/, "")}/`
            : "";
        const rootSourceNode = this.printFile(file);
        const sourceMap = this.buildSourceMap(sourceRoot, rootSourceNode);

        let code = rootSourceNode.toString();

        if (this.options.inlineSourceMap) {
            code += "\n" + this.printInlineSourceMap(sourceMap);
        }

        if (this.options.sourceMapTraceback) {
            const stackTraceOverride = this.printStackTraceOverride(rootSourceNode);
            code = code.replace(LuaPrinter.sourceMapTracebackPlaceholder, stackTraceOverride);
        }

        return { code, sourceMap: sourceMap.toString(), sourceMapNode: rootSourceNode };
    }

    private printInlineSourceMap(sourceMap: SourceMapGenerator): string {
        const map = sourceMap.toString();
        const base64Map = Buffer.from(map).toString("base64");

        return `--# sourceMappingURL=data:application/json;base64,${base64Map}\n`;
    }

    private printStackTraceOverride(rootNode: SourceNode): string {
        let currentLine = 1;
        const map: Record<number, number> = {};
        rootNode.walk((chunk, mappedPosition) => {
            if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
                if (map[currentLine] === undefined) {
                    map[currentLine] = mappedPosition.line;
                } else {
                    map[currentLine] = Math.min(map[currentLine], mappedPosition.line);
                }
            }

            currentLine += chunk.split("\n").length - 1;
        });

        const mapItems = Object.entries(map).map(([line, original]) => `["${line}"] = ${original}`);
        const mapString = "{" + mapItems.join(",") + "}";

        return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapString});`;
    }

    protected printFile(file: lua.File): SourceNode {
        let sourceChunks: SourceChunk[] = [file.trivia];

        if (!this.options.noHeader) {
            sourceChunks.push(tstlHeader);
        }

        const luaTarget = this.options.luaTarget ?? LuaTarget.Universal;
        const luaLibImport = this.options.luaLibImport ?? LuaLibImportKind.Require;
        if (
            (luaLibImport === LuaLibImportKind.Require || luaLibImport === LuaLibImportKind.RequireMinimal) &&
            file.luaLibFeatures.size > 0
        ) {
            // Import lualib features
            sourceChunks = this.printStatementArray(
                loadImportedLualibFeatures(file.luaLibFeatures, luaTarget, this.emitHost)
            );
        } else if (luaLibImport === LuaLibImportKind.Inline && file.luaLibFeatures.size > 0) {
            // Inline lualib features
            sourceChunks.push("-- Lua Library inline imports\n");
            sourceChunks.push(loadInlineLualibFeatures(file.luaLibFeatures, luaTarget, this.emitHost));
            sourceChunks.push("-- End of Lua Library inline imports\n");
        }

        if (this.options.sourceMapTraceback && !isBundleEnabled(this.options)) {
            // In bundle mode the traceback is being generated for the entire file in getBundleResult
            // Otherwise, traceback is being generated locally
            sourceChunks.push(`${LuaPrinter.sourceMapTracebackPlaceholder}\n`);
        }

        // Print reest of the statements in file
        sourceChunks.push(...this.printStatementArray(file.statements));

        return this.concatNodes(...sourceChunks);
    }

    protected pushIndent(): void {
        this.currentIndent += "    ";
    }

    protected popIndent(): void {
        this.currentIndent = this.currentIndent.slice(4);
    }

    protected indent(input: SourceChunk = ""): SourceChunk {
        return this.concatNodes(this.currentIndent, input);
    }

    protected createSourceNode(node: lua.Node, chunks: SourceChunk | SourceChunk[], name?: string): SourceNode {
        const { line, column } = lua.getOriginalPos(node);

        return line !== undefined && column !== undefined
            ? new SourceNode(line + 1, column, this.relativeSourcePath, chunks, name)
            : new SourceNode(null, null, this.relativeSourcePath, chunks, name);
    }

    protected concatNodes(...chunks: SourceChunk[]): SourceNode {
        return new SourceNode(null, null, this.relativeSourcePath, chunks);
    }

    protected printBlock(block: lua.Block): SourceNode {
        return this.concatNodes(...this.printStatementArray(block.statements));
    }

    private statementMayRequireSemiColon(statement: lua.Statement): boolean {
        // Types of statements that could create ambiguous syntax if followed by parenthesis
        return (
            lua.isVariableDeclarationStatement(statement) ||
            lua.isAssignmentStatement(statement) ||
            lua.isExpressionStatement(statement)
        );
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
        return result ?? false;
    }

    protected printStatementArray(statements: lua.Statement[]): SourceChunk[] {
        const statementNodes: SourceNode[] = [];
        for (const [index, statement] of statements.entries()) {
            const node = this.printStatement(statement);

            if (
                index > 0 &&
                this.statementMayRequireSemiColon(statements[index - 1]) &&
                this.nodeStartsWithParenthesis(node)
            ) {
                statementNodes[index - 1].add(";");
            }

            statementNodes.push(node);

            if (lua.isReturnStatement(statement)) break;
        }

        return statementNodes.length > 0 ? [...intersperse<SourceChunk>(statementNodes, "\n"), "\n"] : [];
    }

    public printStatement(statement: lua.Statement): SourceNode {
        let resultNode = this.printStatementExcludingComments(statement);

        if (statement.leadingComments) {
            resultNode = this.concatNodes(
                statement.leadingComments.map(c => this.printComment(c)).join("\n"),
                "\n",
                resultNode
            );
        }

        if (statement.trailingComments) {
            resultNode = this.concatNodes(
                resultNode,
                "\n",
                statement.trailingComments.map(c => this.printComment(c)).join("\n")
            );
        }

        return resultNode;
    }

    public printComment(comment: string | string[]): SourceChunk {
        if (Array.isArray(comment)) {
            if (comment.length === 0) {
                return this.indent("--[[]]");
            } else {
                const [firstLine, ...restLines] = comment;
                const commentLines = this.concatNodes(...restLines.map(c => this.concatNodes("\n", this.indent(c))));
                return this.concatNodes(this.indent("--[["), firstLine, commentLines, "]]");
            }
        } else {
            return this.indent(`--${comment}`);
        }
    }

    protected printStatementExcludingComments(statement: lua.Statement): SourceNode {
        switch (statement.kind) {
            case lua.SyntaxKind.DoStatement:
                return this.printDoStatement(statement as lua.DoStatement);
            case lua.SyntaxKind.VariableDeclarationStatement:
                return this.printVariableDeclarationStatement(statement as lua.VariableDeclarationStatement);
            case lua.SyntaxKind.AssignmentStatement:
                return this.printVariableAssignmentStatement(statement as lua.AssignmentStatement);
            case lua.SyntaxKind.IfStatement:
                return this.printIfStatement(statement as lua.IfStatement);
            case lua.SyntaxKind.WhileStatement:
                return this.printWhileStatement(statement as lua.WhileStatement);
            case lua.SyntaxKind.RepeatStatement:
                return this.printRepeatStatement(statement as lua.RepeatStatement);
            case lua.SyntaxKind.ForStatement:
                return this.printForStatement(statement as lua.ForStatement);
            case lua.SyntaxKind.ForInStatement:
                return this.printForInStatement(statement as lua.ForInStatement);
            case lua.SyntaxKind.GotoStatement:
                return this.printGotoStatement(statement as lua.GotoStatement);
            case lua.SyntaxKind.LabelStatement:
                return this.printLabelStatement(statement as lua.LabelStatement);
            case lua.SyntaxKind.ReturnStatement:
                return this.printReturnStatement(statement as lua.ReturnStatement);
            case lua.SyntaxKind.BreakStatement:
                return this.printBreakStatement(statement as lua.BreakStatement);
            case lua.SyntaxKind.ContinueStatement:
                return this.printContinueStatement(statement as lua.ContinueStatement);
            case lua.SyntaxKind.ExpressionStatement:
                return this.printExpressionStatement(statement as lua.ExpressionStatement);
            default:
                throw new Error(`Tried to print unknown statement kind: ${lua.SyntaxKind[statement.kind]}`);
        }
    }

    public printDoStatement(statement: lua.DoStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("do\n"));
        this.pushIndent();
        chunks.push(...this.printStatementArray(statement.statements));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.concatNodes(...chunks);
    }

    public printVariableDeclarationStatement(statement: lua.VariableDeclarationStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("local "));

        if (lua.isFunctionDefinition(statement)) {
            // Print all local functions as `local function foo()` instead of `local foo = function` to allow recursion
            chunks.push(this.printFunctionDefinition(statement));
        } else {
            chunks.push(...this.joinChunksWithComma(statement.left.map(e => this.printExpression(e))));

            if (statement.right) {
                chunks.push(" = ");
                chunks.push(...this.joinChunksWithComma(statement.right.map(e => this.printExpression(e))));
            }
        }

        return this.createSourceNode(statement, chunks);
    }

    public printVariableAssignmentStatement(statement: lua.AssignmentStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent());

        if (lua.isFunctionDefinition(statement) && (statement.right[0].flags & lua.NodeFlags.Declaration) !== 0) {
            // Use `function foo()` instead of `foo = function()`
            const name = this.printExpression(statement.left[0]);
            if (isValidLuaFunctionDeclarationName(name.toString(), this.options)) {
                chunks.push(this.printFunctionDefinition(statement));
                return this.createSourceNode(statement, chunks);
            }
        }

        chunks.push(...this.joinChunksWithComma(statement.left.map(e => this.printExpression(e))));
        chunks.push(" = ");
        chunks.push(...this.joinChunksWithComma(statement.right.map(e => this.printExpression(e))));

        return this.createSourceNode(statement, chunks);
    }

    public printIfStatement(statement: lua.IfStatement, isElseIf = false): SourceNode {
        const chunks: SourceChunk[] = [];

        const prefix = isElseIf ? "elseif" : "if";
        chunks.push(this.indent(prefix + " "), this.printExpression(statement.condition), " then\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.ifBlock));
        this.popIndent();

        if (statement.elseBlock) {
            if (lua.isIfStatement(statement.elseBlock)) {
                chunks.push(this.printIfStatement(statement.elseBlock, true));
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

    public printWhileStatement(statement: lua.WhileStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("while "), this.printExpression(statement.condition), " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("end"));

        return this.concatNodes(...chunks);
    }

    public printRepeatStatement(statement: lua.RepeatStatement): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("repeat\n"));

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();

        chunks.push(this.indent("until "), this.printExpression(statement.condition));

        return this.concatNodes(...chunks);
    }

    public printForStatement(statement: lua.ForStatement): SourceNode {
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

    public printForInStatement(statement: lua.ForInStatement): SourceNode {
        const names = this.joinChunksWithComma(statement.names.map(i => this.printIdentifier(i)));
        const expressions = this.joinChunksWithComma(statement.expressions.map(e => this.printExpression(e)));

        const chunks: SourceChunk[] = [];

        chunks.push(this.indent("for "), ...names, " in ", ...expressions, " do\n");

        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end"));

        return this.createSourceNode(statement, chunks);
    }

    public printGotoStatement(statement: lua.GotoStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("goto "), statement.label]);
    }

    public printLabelStatement(statement: lua.LabelStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent("::"), statement.name, "::"]);
    }

    public printReturnStatement(statement: lua.ReturnStatement): SourceNode {
        if (statement.expressions.length === 0) {
            return this.createSourceNode(statement, this.indent("return"));
        }

        const chunks: SourceChunk[] = [];

        chunks.push(...this.joinChunksWithComma(statement.expressions.map(e => this.printExpression(e))));

        return this.createSourceNode(statement, [this.indent(), "return ", ...chunks]);
    }

    public printBreakStatement(statement: lua.BreakStatement): SourceNode {
        return this.createSourceNode(statement, this.indent("break"));
    }

    public printContinueStatement(statement: lua.ContinueStatement): SourceNode {
        return this.createSourceNode(statement, this.indent("continue"));
    }

    public printExpressionStatement(statement: lua.ExpressionStatement): SourceNode {
        return this.createSourceNode(statement, [this.indent(), this.printExpression(statement.expression)]);
    }

    // Expressions
    public printExpression(expression: lua.Expression): SourceNode {
        switch (expression.kind) {
            case lua.SyntaxKind.StringLiteral:
                return this.printStringLiteral(expression as lua.StringLiteral);
            case lua.SyntaxKind.NumericLiteral:
                return this.printNumericLiteral(expression as lua.NumericLiteral);
            case lua.SyntaxKind.NilKeyword:
                return this.printNilLiteral(expression as lua.NilLiteral);
            case lua.SyntaxKind.DotsKeyword:
                return this.printDotsLiteral(expression as lua.DotsLiteral);
            case lua.SyntaxKind.ArgKeyword:
                return this.printArgLiteral(expression as lua.ArgLiteral);
            case lua.SyntaxKind.TrueKeyword:
            case lua.SyntaxKind.FalseKeyword:
                return this.printBooleanLiteral(expression as lua.BooleanLiteral);
            case lua.SyntaxKind.FunctionExpression:
                return this.printFunctionExpression(expression as lua.FunctionExpression);
            case lua.SyntaxKind.TableFieldExpression:
                return this.printTableFieldExpression(expression as lua.TableFieldExpression);
            case lua.SyntaxKind.TableExpression:
                return this.printTableExpression(expression as lua.TableExpression);
            case lua.SyntaxKind.UnaryExpression:
                return this.printUnaryExpression(expression as lua.UnaryExpression);
            case lua.SyntaxKind.BinaryExpression:
                return this.printBinaryExpression(expression as lua.BinaryExpression);
            case lua.SyntaxKind.CallExpression:
                return this.printCallExpression(expression as lua.CallExpression);
            case lua.SyntaxKind.MethodCallExpression:
                return this.printMethodCallExpression(expression as lua.MethodCallExpression);
            case lua.SyntaxKind.Identifier:
                return this.printIdentifier(expression as lua.Identifier);
            case lua.SyntaxKind.TableIndexExpression:
                return this.printTableIndexExpression(expression as lua.TableIndexExpression);
            case lua.SyntaxKind.ParenthesizedExpression:
                return this.printParenthesizedExpression(expression as lua.ParenthesizedExpression);
            case lua.SyntaxKind.ConditionalExpression:
                return this.printConditionalExpression(expression as lua.ConditionalExpression);
            default:
                throw new Error(`Tried to print unknown statement kind: ${lua.SyntaxKind[expression.kind]}`);
        }
    }

    public printStringLiteral(expression: lua.StringLiteral): SourceNode {
        return this.createSourceNode(expression, escapeString(expression.value));
    }

    public printNumericLiteral(expression: lua.NumericLiteral): SourceNode {
        return this.createSourceNode(expression, String(expression.value));
    }

    public printNilLiteral(expression: lua.NilLiteral): SourceNode {
        return this.createSourceNode(expression, "nil");
    }

    public printDotsLiteral(expression: lua.DotsLiteral): SourceNode {
        return this.createSourceNode(expression, "...");
    }

    public printArgLiteral(expression: lua.ArgLiteral): SourceNode {
        return this.createSourceNode(expression, "arg");
    }

    public printBooleanLiteral(expression: lua.BooleanLiteral): SourceNode {
        return this.createSourceNode(expression, expression.kind === lua.SyntaxKind.TrueKeyword ? "true" : "false");
    }

    private printFunctionParameters(expression: lua.FunctionExpression): SourceChunk[] {
        const parameterChunks = (expression.params ?? []).map(i => this.printIdentifier(i));

        if (expression.dots) {
            parameterChunks.push(this.printDotsLiteral(expression.dots));
        }

        return this.joinChunksWithComma(parameterChunks);
    }

    public printFunctionExpression(expression: lua.FunctionExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push("function(");
        chunks.push(...this.printFunctionParameters(expression));
        chunks.push(")");

        if (lua.isInlineFunctionExpression(expression)) {
            const returnStatement = expression.body.statements[0];
            chunks.push(" ");
            const returnNode: SourceChunk[] = [
                "return ",
                ...this.joinChunksWithComma(returnStatement.expressions.map(e => this.printExpression(e))),
            ];
            chunks.push(this.createSourceNode(returnStatement, returnNode));
            chunks.push(this.createSourceNode(expression, " end"));
        } else {
            chunks.push("\n");
            this.pushIndent();
            chunks.push(this.printBlock(expression.body));
            this.popIndent();
            chunks.push(this.indent(this.createSourceNode(expression, "end")));
        }

        return this.createSourceNode(expression, chunks);
    }

    public printFunctionDefinition(statement: lua.FunctionDefinition): SourceNode {
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
        chunks.push(this.indent(this.createSourceNode(statement, "end")));

        return this.createSourceNode(expression, chunks);
    }

    public printTableFieldExpression(expression: lua.TableFieldExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        const value = this.printExpression(expression.value);

        if (expression.key) {
            if (lua.isStringLiteral(expression.key) && isValidLuaIdentifier(expression.key.value, this.options)) {
                chunks.push(expression.key.value, " = ", value);
            } else {
                chunks.push("[", this.printExpression(expression.key), "] = ", value);
            }
        } else {
            chunks.push(value);
        }

        return this.createSourceNode(expression, chunks);
    }

    public printTableExpression(expression: lua.TableExpression): SourceNode {
        return this.createSourceNode(expression, ["{", ...this.printExpressionList(expression.fields), "}"]);
    }

    public printUnaryExpression(expression: lua.UnaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printOperator(expression.operator));
        chunks.push(
            this.printExpressionInParenthesesIfNeeded(
                expression.operand,
                LuaPrinter.operatorPrecedence[expression.operator]
            )
        );

        return this.createSourceNode(expression, chunks);
    }

    public printBinaryExpression(expression: lua.BinaryExpression): SourceNode {
        const chunks: SourceChunk[] = [];
        const isRightAssociative = LuaPrinter.rightAssociativeOperators.has(expression.operator);
        const precedence = LuaPrinter.operatorPrecedence[expression.operator];
        chunks.push(
            this.printExpressionInParenthesesIfNeeded(expression.left, isRightAssociative ? precedence + 1 : precedence)
        );
        chunks.push(" ", this.printOperator(expression.operator), " ");
        chunks.push(
            this.printExpressionInParenthesesIfNeeded(
                expression.right,
                isRightAssociative ? precedence : precedence + 1
            )
        );

        return this.createSourceNode(expression, chunks);
    }

    private printExpressionInParenthesesIfNeeded(expression: lua.Expression, minPrecedenceToOmit?: number): SourceNode {
        return this.needsParenthesis(expression, minPrecedenceToOmit)
            ? this.createSourceNode(expression, ["(", this.printExpression(expression), ")"])
            : this.printExpression(expression);
    }

    private needsParenthesis(expression: lua.Expression, minPrecedenceToOmit?: number): boolean {
        if (lua.isBinaryExpression(expression) || lua.isUnaryExpression(expression)) {
            return (
                minPrecedenceToOmit === undefined ||
                LuaPrinter.operatorPrecedence[expression.operator] < minPrecedenceToOmit
            );
        } else {
            return lua.isFunctionExpression(expression) || lua.isTableExpression(expression);
        }
    }

    public printCallExpression(expression: lua.CallExpression): SourceNode {
        const chunks = [];

        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.expression), "(");

        if (expression.params) {
            chunks.push(...this.printExpressionList(expression.params));
        }

        chunks.push(")");

        return this.createSourceNode(expression, chunks);
    }

    public printMethodCallExpression(expression: lua.MethodCallExpression): SourceNode {
        const chunks = [];

        const prefix =
            this.needsParenthesis(expression.prefixExpression) || lua.isStringLiteral(expression.prefixExpression)
                ? ["(", this.printExpression(expression.prefixExpression), ")"]
                : [this.printExpression(expression.prefixExpression)];

        const name = this.printIdentifier(expression.name);

        chunks.push(...prefix, ":", name, "(");

        if (expression.params) {
            chunks.push(...this.printExpressionList(expression.params));
        }

        chunks.push(")");

        return this.createSourceNode(expression, chunks);
    }

    public printIdentifier(expression: lua.Identifier): SourceNode {
        return this.createSourceNode(
            expression,
            expression.text,
            expression.originalName !== expression.text ? expression.originalName : undefined
        );
    }

    public printTableIndexExpression(expression: lua.TableIndexExpression): SourceNode {
        const chunks: SourceChunk[] = [];

        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.table));
        if (lua.isStringLiteral(expression.index) && isValidLuaIdentifier(expression.index.value, this.options)) {
            chunks.push(".", this.createSourceNode(expression.index, expression.index.value));
        } else {
            chunks.push("[", this.printExpression(expression.index), "]");
        }
        return this.createSourceNode(expression, chunks);
    }

    public printParenthesizedExpression(expression: lua.ParenthesizedExpression) {
        return this.createSourceNode(expression, ["(", this.printExpression(expression.expression), ")"]);
    }

    public printConditionalExpression(expression: lua.ConditionalExpression): SourceNode {
        return this.createSourceNode(expression, [
            "if ",
            this.printExpression(expression.condition),
            " then ",
            this.printExpression(expression.whenTrue),
            " else ",
            this.printExpression(expression.whenFalse),
        ]);
    }

    public printOperator(kind: lua.Operator): SourceNode {
        return new SourceNode(null, null, this.relativeSourcePath, LuaPrinter.operatorMap[kind]);
    }

    protected joinChunksWithComma(chunks: SourceChunk[]): SourceChunk[] {
        return intersperse(chunks, ", ");
    }

    /**
     * Returns true if the expression list (table field or parameters) should be printed on one line.
     */
    protected isSimpleExpressionList(expressions: lua.Expression[]): boolean {
        if (expressions.length <= 1) return true;
        if (expressions.length > 4) return false;
        return expressions.every(isSimpleExpression);
    }

    protected printExpressionList(expressions: lua.Expression[]): SourceChunk[] {
        const chunks: SourceChunk[] = [];

        if (this.isSimpleExpressionList(expressions)) {
            chunks.push(...this.joinChunksWithComma(expressions.map(e => this.printExpression(e))));
        } else {
            chunks.push("\n");
            this.pushIndent();
            for (const [index, expression] of expressions.entries()) {
                const tail = index < expressions.length - 1 ? ",\n" : "\n";
                chunks.push(this.indent(), this.printExpression(expression), tail);
            }
            this.popIndent();
            chunks.push(this.indent());
        }

        return chunks;
    }

    // The key difference between this and SourceNode.toStringWithSourceMap() is that SourceNodes with null line/column
    // will not generate 'empty' mappings in the source map that point to nothing in the original TS.
    private buildSourceMap(sourceRoot: string, rootSourceNode: SourceNode): SourceMapGenerator {
        const map = new SourceMapGenerator({
            file: path.basename(this.luaFile),
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
            if (
                currentMapping.generated.line === generatedLine &&
                currentMapping.generated.column === generatedColumn &&
                currentMapping.name === sourceNode.name
            ) {
                return false;
            }
            return (
                currentMapping.original.line !== sourceNode.line ||
                currentMapping.original.column !== sourceNode.column ||
                currentMapping.name !== sourceNode.name
            );
        };

        const build = (sourceNode: SourceNode) => {
            if (isNewMapping(sourceNode)) {
                currentMapping = {
                    source: sourceNode.source,
                    original: { line: sourceNode.line, column: sourceNode.column },
                    generated: { line: generatedLine, column: generatedColumn },
                    name: sourceNode.name,
                };
                map.addMapping(currentMapping);
            }

            for (const chunk of sourceNode.children as SourceChunk[]) {
                if (typeof chunk === "string") {
                    const lines = chunk.split("\n");
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
