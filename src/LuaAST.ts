// Simplified Lua AST based roughly on http://lua-users.org/wiki/MetaLuaAbstractSyntaxTree,
// https://www.lua.org/manual/5.3/manual.html (9 – The Complete Syntax of Lua) and the TS AST implementation

// We can ellide a lot of nodes especially tokens and keyowords
// becasue we dont create the AST from text

import * as ts from "typescript";

export enum SyntaxKind {
    Block,
    // Statements
    DoStatement,
    VariableDeclarationStatement,
    AssignmentStatement,
    IfStatement,
    WhileStatement,
    RepeatStatement,
    ForStatement,
    ForInStatement,
    GotoStatement,
    LabelStatement,
    ReturnStatement,
    BreakStatement,
    ExpressionStatement,
    // Expression
    StringLiteral,
    NumericLiteral,
    NilKeyword,
    DotsKeyword,
    TrueKeyword,
    FalseKeyword,
    FunctionExpression,
    TableFieldExpression,
    TableExpression,
    UnaryExpression,
    BinaryExpression,
    ParenthesizedExpression,
    CallExpression,
    MethodCallExpression,
    Identifier,
    TableIndexExpression,
    // Operators
    // Arithmetic
    AdditionOperator,  // Maybe use abreviations for those add, sub, mul ...
    SubractionOperator,
    MultiplicationOperator,
    DivisionOperator,
    FloorDivisionOperator,
    ModuloOperator,
    PowerOperator,
    NegationOperator,  // Unaray minus
    // Concat
    ConcatOperator,
    // Length
    LengthOperator,  // Unary
    // Relational Ops
    EqualityOperator,
    InequalityOperator,
    LessThanOperator,
    LessEqualOperator,
    GreaterThanOperator,   // Syntax Sugar `x > y` <=> `not (y <= x)`
                           // but we should probably use them to make the output code more readable
    GreaterEqualOperator,  // Syntax Sugar `x >= y` <=> `not (y < x)`
    // Logical
    AndOperator,
    OrOperator,
    NotOperator,  // Unary
    // Bitwise
    BitwiseAndOperator,
    BitwiseOrOperator,
    BitwiseExclusiveOrOperator,
    BitwiseRightShiftOperator,
    BitwiseArithmeticRightShift,
    BitwiseLeftShiftOperator,
    BitwiseNotOperator,  // Unary
}

// TODO maybe name this PrefixUnary? not sure it makes sense to do so, because all unary ops in Lua are prefix
export type UnaryBitwiseOperator = SyntaxKind.BitwiseNotOperator;

export type UnaryOperator = SyntaxKind.NegationOperator
    | SyntaxKind.LengthOperator
    | SyntaxKind.NotOperator
    | UnaryBitwiseOperator;

export type BinaryBitwiseOperator = SyntaxKind.BitwiseAndOperator | SyntaxKind.BitwiseOrOperator
    | SyntaxKind.BitwiseExclusiveOrOperator | SyntaxKind.BitwiseRightShiftOperator
    | SyntaxKind.BitwiseArithmeticRightShift | SyntaxKind.BitwiseLeftShiftOperator;

export type BinaryOperator =
    SyntaxKind.AdditionOperator | SyntaxKind.SubractionOperator | SyntaxKind.MultiplicationOperator
    | SyntaxKind.DivisionOperator | SyntaxKind.FloorDivisionOperator | SyntaxKind.ModuloOperator
    | SyntaxKind.PowerOperator | SyntaxKind.ConcatOperator | SyntaxKind.EqualityOperator
    | SyntaxKind.InequalityOperator | SyntaxKind.LessThanOperator | SyntaxKind.LessEqualOperator
    | SyntaxKind.GreaterThanOperator | SyntaxKind.GreaterEqualOperator | SyntaxKind.AndOperator
    | SyntaxKind.OrOperator | BinaryBitwiseOperator;

export type Operator = UnaryOperator | BinaryOperator;

export type SymbolId = number;

// TODO For future sourcemap support?
export interface TextRange {
    pos: number;
    end: number;
}

export interface Node extends TextRange {
    kind: SyntaxKind;
    parent?: Node;
}

export function createNode(kind: SyntaxKind, tsOriginal?: ts.Node, parent?: Node): Node {
    let pos = -1;
    let end = -1;
    if (tsOriginal) {
        pos = tsOriginal.pos;
        end = tsOriginal.end;
    }
    return {kind, parent, pos, end};
}

export function cloneNode<T extends Node>(node: T): T {
    return Object.assign({}, node);
}

export function setNodeOriginal<T extends Node>(node: T, tsOriginal: ts.Node): T {
    node.pos = tsOriginal.pos;
    node.end = tsOriginal.end;
    return node;
}

export function setParent(node: Node | Node[] | undefined, parent: Node): void {
    if (!node) {
        return;
    }
    if (Array.isArray(node)) {
        node.forEach(n => {
            n.parent = parent;
            if (n.pos === -1 || n.end === -1) {
                n.pos = parent.pos;
                n.end = parent.end;
            }
        });
    } else {
        node.parent = parent;
        if (node.pos === -1 || node.end === -1) {
            node.pos = parent.pos;
            node.end = parent.end;
        }
    }
}

export interface Block extends Node {
    kind: SyntaxKind.Block;
    statements?: Statement[];
}

export function isBlock(node: Node): node is Block {
    return node.kind === SyntaxKind.Block;
}

export function createBlock(statements?: Statement[], tsOriginal?: ts.Node, parent?: Node): Block {
    const block = createNode(SyntaxKind.Block, tsOriginal, parent) as Block;
    setParent(statements, block);
    block.statements = statements;
    return block;
}

export interface Statement extends Node {
    _statementBrand: any;
}

export interface DoStatement extends Statement {
    kind: SyntaxKind.DoStatement;
    statements?: Statement[];
}

export function isDoStatement(node: Node): node is DoStatement {
    return node.kind === SyntaxKind.DoStatement;
}

export function createDoStatement(statements?: Statement[], tsOriginal?: ts.Node, parent?: Node): DoStatement {
    const statement = createNode(SyntaxKind.DoStatement, tsOriginal, parent) as DoStatement;
    setParent(statements, statement);
    statement.statements = statements;
    return statement;
}

// `local test1, test2 = 12, 42` or `local test1, test2`
export interface VariableDeclarationStatement extends Statement {
    kind: SyntaxKind.VariableDeclarationStatement;
    left: Identifier[];
    right?: Expression[];
}

export function isVariableDeclarationStatement(node: Node): node is VariableDeclarationStatement {
    return node.kind === SyntaxKind.VariableDeclarationStatement;
}

export function createVariableDeclarationStatement(
    left: Identifier | Identifier[],
    right?: Expression | Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): VariableDeclarationStatement
{
    const statement = createNode(
        SyntaxKind.VariableDeclarationStatement,
        tsOriginal,
        parent
    ) as VariableDeclarationStatement;
    setParent(left, statement);
    if (Array.isArray(left)) {
        statement.left = left;
    } else {
        statement.left = [left];
    }
    setParent(right, statement);
    if (Array.isArray(right)) {
        statement.right = right;
    } else if (right) {
        statement.right = [right];
    }
    return statement;
}

// `test1, test2 = 12, 42`
export interface AssignmentStatement extends Statement {
    kind: SyntaxKind.AssignmentStatement;
    left: IdentifierOrTableIndexExpression[];
    right: Expression[];
}

export function isAssignmentStatement(node: Node): node is AssignmentStatement {
    return node.kind === SyntaxKind.AssignmentStatement;
}

export function createAssignmentStatement(
    left: IdentifierOrTableIndexExpression | IdentifierOrTableIndexExpression[],
    right: Expression | Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): AssignmentStatement
{
    const statement = createNode(SyntaxKind.AssignmentStatement, tsOriginal, parent) as AssignmentStatement;
    setParent(left, statement);
    if (Array.isArray(left)) {
        statement.left = left;
    } else {
        statement.left = [left];
    }
    setParent(right, statement);
    if (Array.isArray(right)) {
        statement.right = right;
    } else {
        statement.right = [right];
    }
    return statement;
}

export interface IfStatement extends Statement {
    kind: SyntaxKind.IfStatement;
    condtion: Expression;
    ifBlock: Block;
    elseBlock?: Block | IfStatement;
}

export function isIfStatement(node: Node): node is IfStatement {
    return node.kind === SyntaxKind.IfStatement;
}

export function createIfStatement(
    condtion: Expression,
    ifBlock: Block,
    elseBlock?: Block | IfStatement,
    tsOriginal?: ts.Node,
    parent?: Node
): IfStatement
{
    const statement = createNode(SyntaxKind.IfStatement, tsOriginal, parent) as IfStatement;
    setParent(condtion, statement);
    statement.condtion = condtion;
    setParent(ifBlock, statement);
    statement.ifBlock = ifBlock;
    setParent(ifBlock, statement);
    statement.elseBlock = elseBlock;
    return statement;
}

export interface IterationStatement extends Statement {
    body: Block;
}

export function isIterationStatement(node: Node): node is IterationStatement {
    return node.kind === SyntaxKind.WhileStatement || node.kind === SyntaxKind.RepeatStatement
        || node.kind === SyntaxKind.ForStatement || node.kind === SyntaxKind.ForInStatement;
}

export interface WhileStatement extends IterationStatement {
    kind: SyntaxKind.WhileStatement;
    condtion: Expression;
}

export function isWhileStatement(node: Node): node is WhileStatement {
    return node.kind === SyntaxKind.WhileStatement;
}

export function createWhileStatement(
    body: Block,
    condtion: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): WhileStatement
{
    const statement = createNode(SyntaxKind.WhileStatement, tsOriginal, parent) as WhileStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(condtion, statement);
    statement.condtion = condtion;
    return statement;
}

export interface RepeatStatement extends IterationStatement {
    kind: SyntaxKind.RepeatStatement;
    condtion: Expression;
}

export function isRepeatStatement(node: Node): node is RepeatStatement {
    return node.kind === SyntaxKind.RepeatStatement;
}

export function createRepeatStatement(
    body: Block,
    condtion: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): RepeatStatement
{
    const statement = createNode(SyntaxKind.RepeatStatement, tsOriginal, parent) as RepeatStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(condtion, statement);
    statement.condtion = condtion;
    return statement;
}

// TODO maybe rename to ForNumericStatement
export interface ForStatement extends IterationStatement {
    kind: SyntaxKind.ForStatement;
    controlVariable: Identifier;
    controlVariableInitializer: Expression;
    limitExpression: Expression;
    stepExpression?: Expression;
}

export function isForStatement(node: Node): node is ForStatement {
    return node.kind === SyntaxKind.ForStatement;
}

export function createForStatement(
    body: Block,
    controlVariable: Identifier,
    controlVariableInitializer: Expression,
    limitExpression: Expression,
    stepExpression?: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): ForStatement
{
    const statement = createNode(SyntaxKind.ForStatement, tsOriginal, parent) as ForStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(controlVariable, statement);
    statement.controlVariable = controlVariable;
    setParent(controlVariableInitializer, statement);
    statement.controlVariableInitializer = controlVariableInitializer;
    setParent(limitExpression, statement);
    statement.limitExpression = limitExpression;
    setParent(stepExpression, statement);
    statement.stepExpression = stepExpression;
    return statement;
}

export interface ForInStatement extends IterationStatement {
    kind: SyntaxKind.ForInStatement;
    names: Identifier[];
    expressions: Expression[];
}

export function isForInStatement(node: Node): node is ForInStatement {
    return node.kind === SyntaxKind.ForInStatement;
}

export function createForInStatement(
    body: Block,
    names: Identifier[],
    expressions: Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): ForInStatement
{
    const statement = createNode(SyntaxKind.ForInStatement, tsOriginal, parent) as ForInStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(names, statement);
    statement.names = names;
    setParent(expressions, statement);
    statement.expressions = expressions;
    return statement;
}

export interface GotoStatement extends Statement {
    kind: SyntaxKind.GotoStatement;
    label: string;  // or identifier ?
}

export function isGotoStatement(node: Node): node is GotoStatement {
    return node.kind === SyntaxKind.GotoStatement;
}

export function createGotoStatement(label: string, tsOriginal?: ts.Node, parent?: Node): GotoStatement {
    const statement = createNode(SyntaxKind.GotoStatement, tsOriginal, parent) as GotoStatement;
    statement.label = label;
    return statement;
}

export interface LabelStatement extends Statement {
    kind: SyntaxKind.LabelStatement;
    name: string;  // or identifier ?
}

export function isLabelStatement(node: Node): node is LabelStatement {
    return node.kind === SyntaxKind.LabelStatement;
}

export function createLabelStatement(name: string, tsOriginal?: ts.Node, parent?: Node): LabelStatement {
    const statement = createNode(SyntaxKind.LabelStatement, tsOriginal, parent) as LabelStatement;
    statement.name = name;
    return statement;
}

export interface ReturnStatement extends Statement {
    kind: SyntaxKind.ReturnStatement;
    expressions?: Expression[];
}

export function isReturnStatement(node: Node): node is ReturnStatement {
    return node.kind === SyntaxKind.ReturnStatement;
}

export function createReturnStatement(
    expressions?: Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): ReturnStatement
{
    const statement = createNode(SyntaxKind.ReturnStatement, tsOriginal, parent) as ReturnStatement;
    setParent(expressions, statement);
    statement.expressions = expressions;
    return statement;
}

export interface BreakStatement extends Statement {
    kind: SyntaxKind.BreakStatement;
}

export function isBreakStatement(node: Node): node is BreakStatement {
    return node.kind === SyntaxKind.BreakStatement;
}

export function createBreakStatement(tsOriginal?: ts.Node, parent?: Node): BreakStatement {
    return createNode(SyntaxKind.BreakStatement, tsOriginal, parent) as BreakStatement;
}

export interface ExpressionStatement extends Statement {
    kind: SyntaxKind.ExpressionStatement;
    expression: Expression;
}

export function isExpressionStatement(node: Node): node is ExpressionStatement {
    return node.kind === SyntaxKind.ExpressionStatement;
}

export function createExpressionStatement(
    expressions: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): ExpressionStatement
{
    const statement = createNode(SyntaxKind.ExpressionStatement, tsOriginal, parent) as ExpressionStatement;
    setParent(expressions, statement);
    statement.expression = expressions;
    return statement;
}

export interface Expression extends Node {
    _expressionBrand: any;
}

// Expressions
// TODO maybe create subexport interface for Literals/PrimaryExpressions
export interface NilLiteral extends Expression {
    kind: SyntaxKind.NilKeyword;
}

export function isNilLiteral(node: Node): node is NilLiteral {
    return node.kind === SyntaxKind.NilKeyword;
}

export function createNilLiteral(tsOriginal?: ts.Node, parent?: Node): NilLiteral {
    return createNode(SyntaxKind.NilKeyword, tsOriginal, parent) as NilLiteral;
}

export interface BooleanLiteral extends Expression {
    kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
}

export function isBooleanLiteral(node: Node): node is BooleanLiteral {
    return node.kind === SyntaxKind.TrueKeyword || node.kind === SyntaxKind.FalseKeyword;
}

export function createBooleanLiteral(value: boolean, tsOriginal?: ts.Node, parent?: Node): BooleanLiteral {
    if (value) {
        return createNode(SyntaxKind.TrueKeyword, tsOriginal, parent) as BooleanLiteral;
    } else {
        return createNode(SyntaxKind.FalseKeyword, tsOriginal, parent) as BooleanLiteral;
    }
}

// TODO Call this DotsLiteral or DotsKeyword?
export interface DotsLiteral extends Expression {
    kind: SyntaxKind.DotsKeyword;
}

export function isDotsLiteral(node: Node): node is DotsLiteral {
    return node.kind === SyntaxKind.DotsKeyword;
}

export function createDotsLiteral(tsOriginal?: ts.Node, parent?: Node): DotsLiteral {
    return createNode(SyntaxKind.DotsKeyword, tsOriginal, parent) as DotsLiteral;
}

// StringLiteral / NumberLiteral
// TODO TS uses the export interface "LiteralLikeNode" with a "text: string" member
// but since we dont parse from text i think we can simplify by just having a value member

// TODO NumericLiteral or NumberLiteral?
export interface NumericLiteral extends Expression {
    kind: SyntaxKind.NumericLiteral;
    value: number;
}

export function isNumericLiteral(node: Node): node is NumericLiteral {
    return node.kind === SyntaxKind.NumericLiteral;
}

export function createNumericLiteral(value: number, tsOriginal?: ts.Node, parent?: Node): NumericLiteral {
    const expression = createNode(SyntaxKind.NumericLiteral, tsOriginal, parent) as NumericLiteral;
    expression.value = value;
    return expression;
}

export interface StringLiteral extends Expression {
    kind: SyntaxKind.StringLiteral;
    value: string;
}

export function isStringLiteral(node: Node): node is StringLiteral {
    return node.kind === SyntaxKind.StringLiteral;
}

export function createStringLiteral(value: string | ts.__String, tsOriginal?: ts.Node, parent?: Node): StringLiteral {
    const expression = createNode(SyntaxKind.StringLiteral, tsOriginal, parent) as StringLiteral;
    expression.value = value as string;
    return expression;
}

// There is no export function statement/declaration because those are just syntax sugar
//
// `function f () body end` becomes `f = function () body` end
// `function t.a.b.c.f () body end` becomes `t.a.b.c.f = function () body end`
// `local function f () body end` becomes `local f; f = function () body end` NOT `local f = function () body end`
// See https://www.lua.org/manual/5.3/manual.html 3.4.11
//
// We should probably create helper functions to create the different export function declarations
export interface FunctionExpression extends Expression {
    kind: SyntaxKind.FunctionExpression;
    params?: Identifier[];
    dots?: DotsLiteral;
    restParamName?: Identifier;
    body: Block;
}

export function isFunctionExpression(node: Node): node is FunctionExpression {
    return node.kind === SyntaxKind.FunctionExpression;
}

export function createFunctionExpression(
    body: Block,
    params?: Identifier[],
    dots?: DotsLiteral,
    restParamName?: Identifier,
    tsOriginal?: ts.Node,
    parent?: Node
): FunctionExpression
{
    const expression = createNode(SyntaxKind.FunctionExpression, tsOriginal, parent) as FunctionExpression;
    setParent(body, expression);
    expression.body = body;
    setParent(params, expression);
    expression.params = params;
    setParent(dots, expression);
    expression.dots = dots;
    setParent(restParamName, expression);
    expression.restParamName = restParamName;
    return expression;
}

export interface TableFieldExpression extends Expression {
    kind: SyntaxKind.TableFieldExpression;
    value: Expression;
    key?: Expression;
}

export function isTableFieldExpression(node: Node): node is TableFieldExpression {
    return node.kind === SyntaxKind.TableFieldExpression;
}

export function createTableFieldExpression(
    value: Expression,
    key?: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): TableFieldExpression
{
    const expression = createNode(SyntaxKind.TableExpression, tsOriginal, parent) as TableFieldExpression;
    setParent(value, expression);
    expression.value = value;
    setParent(key, expression);
    expression.key = key;
    return expression;
}

export interface TableExpression extends Expression {
    kind: SyntaxKind.TableExpression;
    fields?: TableFieldExpression[];
}

export function isTableExpression(node: Node): node is TableExpression {
    return node.kind === SyntaxKind.TableExpression;
}

export function createTableExpression(
    fields?: TableFieldExpression[],
    tsOriginal?: ts.Node,
    parent?: Node
): TableExpression
{
    const expression = createNode(SyntaxKind.TableExpression, tsOriginal, parent) as TableExpression;
    setParent(fields, expression);
    expression.fields = fields;
    return expression;
}

export interface UnaryExpression extends Expression {
    kind: SyntaxKind.UnaryExpression;
    operand: Expression;
    operator: UnaryOperator;
}

export function isUnaryExpression(node: Node): node is UnaryExpression {
    return node.kind === SyntaxKind.UnaryExpression;
}

export function createUnaryExpression(
    operand: Expression,
    operator: UnaryOperator,
    tsOriginal?: ts.Node,
    parent?: Node
): UnaryExpression
{
    const expression = createNode(SyntaxKind.UnaryExpression, tsOriginal, parent) as UnaryExpression;
    setParent(operand, expression);
    expression.operand = operand;
    expression.operator = operator;
    return expression;
}

export interface BinaryExpression extends Expression {
    kind: SyntaxKind.BinaryExpression;
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}

export function isBinaryExpression(node: Node): node is BinaryExpression {
    return node.kind === SyntaxKind.BinaryExpression;
}

export function createBinaryExpression(
    left: Expression,
    right: Expression,
    operator: BinaryOperator,
    tsOriginal?: ts.Node,
    parent?: Node
): BinaryExpression
{
    const expression = createNode(SyntaxKind.BinaryExpression, tsOriginal, parent) as BinaryExpression;
    setParent(left, expression);
    expression.left = left;
    setParent(right, expression);
    expression.right = right;
    expression.operator = operator;
    return expression;
}

export interface ParenthesizedExpression extends Expression {
    kind: SyntaxKind.ParenthesizedExpression;
    innerEpxression: Expression;
}

export function isParenthesizedExpression(node: Node): node is ParenthesizedExpression {
    return node.kind === SyntaxKind.ParenthesizedExpression;
}

export function createParenthesizedExpression(
    innerExpression: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): ParenthesizedExpression
{
    const expression = createNode(SyntaxKind.ParenthesizedExpression, tsOriginal, parent) as ParenthesizedExpression;
    setParent(innerExpression, expression);
    expression.innerEpxression = innerExpression;
    return expression;
}

export interface CallExpression extends Expression {
    kind: SyntaxKind.CallExpression;
    expression: Expression;
    params?: Expression[];
}

export function isCallExpression(node: Node): node is CallExpression {
    return node.kind === SyntaxKind.CallExpression;
}

export function createCallExpression(
    expression: Expression,
    params?: Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): CallExpression
{
    const callExpression = createNode(SyntaxKind.CallExpression, tsOriginal, parent) as CallExpression;
    setParent(expression, callExpression);
    callExpression.expression = expression;
    setParent(params, expression);
    callExpression.params = params;
    return callExpression;
}

export interface MethodCallExpression extends Expression {
    kind: SyntaxKind.MethodCallExpression;
    prefixExpression: Expression;
    name: Identifier;
    params?: Expression[];
}

export function isMethodCallExpression(node: Node): node is MethodCallExpression {
    return node.kind === SyntaxKind.MethodCallExpression;
}

export function createMethodCallExpression(
    prefixExpression: Expression,
    name: Identifier,
    params?: Expression[],
    tsOriginal?: ts.Node,
    parent?: Node
): MethodCallExpression
{
    const callExpression = createNode(SyntaxKind.MethodCallExpression, tsOriginal, parent) as MethodCallExpression;
    setParent(prefixExpression, callExpression);
    callExpression.prefixExpression = prefixExpression;
    setParent(name, callExpression);
    callExpression.name = name;
    setParent(params, callExpression);
    callExpression.params = params;
    return callExpression;
}

export interface Identifier extends Expression {
    kind: SyntaxKind.Identifier;
    text: string;
    symbolId?: SymbolId;
}

export function isIdentifier(node: Node): node is Identifier {
    return node.kind === SyntaxKind.Identifier;
}

export function createIdentifier(
    text: string | ts.__String,
    tsOriginal?: ts.Node,
    symbolId?: SymbolId,
    parent?: Node
): Identifier
{
    const expression = createNode(SyntaxKind.Identifier, tsOriginal, parent) as Identifier;
    expression.text = text as string;
    expression.symbolId = symbolId;
    return expression;
}

export function cloneIdentifier(identifier: Identifier): Identifier {
    return createIdentifier(identifier.text, undefined, identifier.symbolId);
}

export function createAnnonymousIdentifier(tsOriginal?: ts.Node, parent?: Node): Identifier {
    const expression = createNode(SyntaxKind.Identifier, tsOriginal, parent) as Identifier;
    expression.text = "____";
    return expression;
}

export interface TableIndexExpression extends Expression {
    kind: SyntaxKind.TableIndexExpression;
    table: Expression;
    index: Expression;
}

export function isTableIndexExpression(node: Node): node is TableIndexExpression {
    return node.kind === SyntaxKind.TableIndexExpression;
}

export function createTableIndexExpression(
    table: Expression,
    index: Expression,
    tsOriginal?: ts.Node,
    parent?: Node
): TableIndexExpression
{
    const expression = createNode(SyntaxKind.TableIndexExpression, tsOriginal, parent) as TableIndexExpression;
    setParent(table, expression);
    expression.table = table;
    setParent(index, expression);
    expression.index = index;
    return expression;
}

export type IdentifierOrTableIndexExpression = Identifier | TableIndexExpression;
