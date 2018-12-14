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
    VariableAssignmentStatement,
    IfStatement,
    WhileStatement,
    RepeatStatement,
    ForStatement,
    ForInStatement,
    FunctionStatement,
    GotoStatement,
    LabelStatement,
    ReturnStatement,
    BreakStatement,
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
    AdditionOperator, // Maybe use abreviations for those add, sub, mul ...
    SubractionOperator,
    MultiplicationOperator,
    DivisionOperator,
    FloorDivisionOperator,
    ModuloOperator,
    PowerOperator,
    NegationOperator, // Unaray minus
    // Concat
    ConcatOperator,
    // Length
    LengthOperator, // Unary
    // Relational Ops
    EqualityOperator,
    InequalityOperator,
    LessThanOperator,
    LessEqualOperator,
    GreaterThanOperator,  // Syntax Sugar `x > y` <=> `not (y <= x)`
                            // but we should probably use them to make the output code more readable
    GreaterEqualOperator, // Syntax Sugar `x >= y` <=> `not (y < x)`
    // Logical
    AndOperator,
    OrOperator,
    NotOperator, // Unary
    // Bitwise
    // Not sure we need those since we always used the lib functions bit.bor, bit.band ... irrc
    BitwiseAndOperator,
    BitwiseOrOperator,
    BitwiseExclusiveOrOperator,
    BitwiseRightShiftOperator,
    BitwiseLeftShiftOperator,
    BitwiseNotOperator, // Unary
}

// TODO maybe name this PrefixUnary? not sure it makes sense to do so, because all unary ops in Lua are prefix
export type UnaryOperator = SyntaxKind.NegationOperator | SyntaxKind.LengthOperator |
                        SyntaxKind.NotOperator | SyntaxKind.BitwiseNotOperator;

export type BinaryOperator =
    // Arithmetic
    SyntaxKind.AdditionOperator | SyntaxKind.SubractionOperator | SyntaxKind.MultiplicationOperator |
    SyntaxKind.DivisionOperator | SyntaxKind.FloorDivisionOperator |
    SyntaxKind.ModuloOperator | SyntaxKind.PowerOperator |
    // Concat
    SyntaxKind.ConcatOperator |
    // Relational Ops
    SyntaxKind.EqualityOperator | SyntaxKind.InequalityOperator | SyntaxKind.LessThanOperator |
    SyntaxKind.LessEqualOperator | SyntaxKind.GreaterThanOperator | SyntaxKind.GreaterEqualOperator |
    // Logical
    SyntaxKind.AndOperator | SyntaxKind.OrOperator |
    // Bitwise
    SyntaxKind.BitwiseAndOperator | SyntaxKind.BitwiseOrOperator |
    SyntaxKind.BitwiseExclusiveOrOperator | SyntaxKind.BitwiseRightShiftOperator |
    SyntaxKind.BitwiseLeftShiftOperator  | SyntaxKind.BitwiseNotOperator;

// TODO For future sourcemap support?
export interface TextRange {
    pos: number;
    end: number;
}

export interface Node extends TextRange {
    kind: SyntaxKind;
    parent?: Node;
}

export function createNode(kind: SyntaxKind, parent?: Node, tsOriginal?: ts.Node): Node {
    let pos = -1;
    let end = -1;
    if (tsOriginal) {
        pos = tsOriginal.pos;
        end = tsOriginal.end;
    }
    return {kind, parent, pos, end};
}

export function setParent(node: Node | Node[] | undefined, parent: Node): void {
    if (!node) {
        return;
    }
    if (Array.isArray(node)) {
        node.forEach(n => n.parent = parent);
    } else {
        node.parent = parent;
    }
}

export interface Block extends Node {
    kind: SyntaxKind.Block;
    statements?: Statement[];
}

export function createBlock(statements?: Statement[], parent?: Node, tsOriginal?: ts.Node): Block {
    const block = createNode(SyntaxKind.Block, parent, tsOriginal) as Block;
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

export function createDoStatement(statements?: Statement[], parent?: Node, tsOriginal?: ts.Node): DoStatement {
    const statement = createNode(SyntaxKind.Block, parent, tsOriginal) as DoStatement;
    setParent(statements, statement);
    statement.statements = statements;
    return statement;
}

// `local test1, test2 = 12, 42` or `local test1, test2`
export interface VariableDeclarationStatement extends Statement {
    kind: SyntaxKind.VariableDeclarationStatement;
    lhs: IdentifierOrTableIndexExpression[];
    rhs?: Expression[];
}

export function createVariableDeclarationStatement(
    lhs: IdentifierOrTableIndexExpression[],
    rhs?: Expression[],
    parent?: Node,
    tsOriginal?: ts.Node): VariableDeclarationStatement {

    const statement =
        createNode(SyntaxKind.VariableDeclarationStatement, parent, tsOriginal) as VariableDeclarationStatement;
    setParent(lhs, statement);
    statement.lhs = lhs;
    setParent(rhs, statement);
    statement.rhs = rhs;
    return statement;
}

// `test1, test2 = 12, 42`
export interface VariableAssignmentStatement extends Statement {
    kind: SyntaxKind.VariableAssignmentStatement;
    left: IdentifierOrTableIndexExpression[];
    right: Expression[];
}

export function createVariableAssignmentStatement(
    left: IdentifierOrTableIndexExpression[],
    right: Expression[],
    parent?: Node,
    tsOriginal?: ts.Node): VariableAssignmentStatement {

    const statement =
        createNode(SyntaxKind.VariableAssignmentStatement, parent, tsOriginal) as VariableAssignmentStatement;
    setParent(left, statement);
    statement.left = left;
    setParent(right, statement);
    statement.right = right;
    return statement;
}

export interface IfStatement extends Statement {
    kind: SyntaxKind.IfStatement;
    condtion: Expression;
    ifBlock: Block;
    elseBlock?: Block | IfStatement;
}

export function createIfStatement(
    condtion: Expression,
    ifBlock: Block,
    elseBlock?: Block | IfStatement,
    parent?: Node,
    tsOriginal?: ts.Node): IfStatement {

    const statement = createNode(SyntaxKind.IfStatement, parent, tsOriginal) as IfStatement;
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

export interface WhileStatement extends IterationStatement {
    kind: SyntaxKind.WhileStatement;
    expression: Expression;
}

export function createWhileStatement(
    body: Block, expression: Expression, parent?: Node, tsOriginal?: ts.Node): WhileStatement {

    const statement = createNode(SyntaxKind.WhileStatement, parent, tsOriginal) as WhileStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(expression, statement);
    statement.expression = expression;
    return statement;
}

export interface RepeatStatement extends IterationStatement {
    kind: SyntaxKind.RepeatStatement;
    expression: Expression;
}

export function createRepeatStatement(
    body: Block, expression: Expression, parent?: Node, tsOriginal?: ts.Node): RepeatStatement {

    const statement = createNode(SyntaxKind.RepeatStatement, parent, tsOriginal) as RepeatStatement;
    setParent(body, statement);
    statement.body = body;
    setParent(expression, statement);
    statement.expression = expression;
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

export function createForStatement(
    body: Block,
    controlVariable: Identifier,
    controlVariableInitializer: Expression,
    limitExpression: Expression,
    stepExpression: Expression,
    parent?: Node,
    tsOriginal?: ts.Node): ForStatement {

    const statement = createNode(SyntaxKind.ForStatement, parent, tsOriginal) as ForStatement;
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

export function createForInStatement(
    body: Block,
    names: Identifier[],
    expressions: Expression[],
    parent?: Node,
    tsOriginal?: ts.Node): ForInStatement {

    const statement = createNode(SyntaxKind.ForStatement, parent, tsOriginal) as ForInStatement;
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
    label: string; // or identifier ?
}

export function createGotoStatement(label: string, parent?: Node, tsOriginal?: ts.Node): GotoStatement {
    const statement = createNode(SyntaxKind.GotoStatement, parent, tsOriginal) as GotoStatement;
    statement.label = label;
    return statement;
}

export interface LabelStatement extends Statement {
    kind: SyntaxKind.LabelStatement;
    name: string; // or identifier ?
}

export function createLabelStatement(name: string, parent?: Node, tsOriginal?: ts.Node): LabelStatement {
    const statement = createNode(SyntaxKind.LabelStatement, parent, tsOriginal) as LabelStatement;
    statement.name = name;
    return statement;
}

export interface ReturnStatement extends Statement {
    kind: SyntaxKind.ReturnStatement;
    expressions?: Expression[];
}

export function createReturnStatement(
    expressions?: Expression[], parent?: Node, tsOriginal?: ts.Node): ReturnStatement {

    const statement = createNode(SyntaxKind.ReturnStatement, parent, tsOriginal) as ReturnStatement;
    setParent(expressions, statement);
    statement.expressions = expressions;
    return statement;
}

export interface BreakStatement extends Statement {
    kind: SyntaxKind.BreakStatement;
}

export function createBreakStatement(parent?: Node, tsOriginal?: ts.Node): BreakStatement {
    return createNode(SyntaxKind.BreakStatement, parent, tsOriginal) as BreakStatement;
}

// TODO used for export function calls, or shoudl export function calls inherit from both expression and statement?
export interface ExpressionStatement extends Statement {
    expression: Expression;
}

export function createExpressionStatement(
    expressions: Expression, parent?: Node, tsOriginal?: ts.Node): ExpressionStatement {

    const statement = createNode(SyntaxKind.ReturnStatement, parent, tsOriginal) as ExpressionStatement;
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

export function createNilLiteral(parent?: Node, tsOriginal?: ts.Node): NilLiteral {
    return createNode(SyntaxKind.NilKeyword, parent, tsOriginal) as NilLiteral;
}

export interface BooleanLiteral extends Expression {
    kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
}

export function createBooleanLiteral(value: boolean, parent?: Node, tsOriginal?: ts.Node): BooleanLiteral {
    if (value) {
        return createNode(SyntaxKind.TrueKeyword, parent, tsOriginal) as BooleanLiteral;
    } else {
        return createNode(SyntaxKind.FalseKeyword, parent, tsOriginal) as BooleanLiteral;
    }
}

// TODO Call this DotsLiteral or DotsKeyword?
export interface DotsLiteral extends Expression {
    kind: SyntaxKind.DotsKeyword;
}

export function createDotsLiteral(parent?: Node, tsOriginal?: ts.Node): DotsLiteral {
    return createNode(SyntaxKind.DotsKeyword, parent, tsOriginal) as DotsLiteral;
}

// StringLiteral / NumberLiteral
// TODO TS uses the export interface "LiteralLikeNode" with a "text: string" member
// but since we dont parse from text i think we can simplify by just having a value member

// TODO NumericLiteral or NumberLiteral?
export interface NumericLiteral extends Expression {
    kind: SyntaxKind.NumericLiteral;
    value: number;
}

export function createNumericLiteral(value: number, parent?: Node, tsOriginal?: ts.Node): NumericLiteral {
    const expression = createNode(SyntaxKind.NumericLiteral, parent, tsOriginal) as NumericLiteral;
    expression.value = value;
    return expression;
}

export interface StringLiteral extends Expression {
    kind: SyntaxKind.StringLiteral;
    value: string;
}

export function createStringLiteral(value: string, parent?: Node, tsOriginal?: ts.Node): StringLiteral {
    const expression = createNode(SyntaxKind.StringLiteral, parent, tsOriginal) as StringLiteral;
    expression.value = value;
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
    kind: SyntaxKind.FunctionStatement;
    params?: Identifier[];
    dots?: DotsLiteral; // Maybe combine params and dot?
    body: Block;
}

export function createFunctionExpression(
    body: Block,
    params?: Identifier[],
    dots?: DotsLiteral,
    parent?: Node,
    tsOriginal?: ts.Node): FunctionExpression {

    const expression = createNode(SyntaxKind.FunctionExpression, parent, tsOriginal) as FunctionExpression;
    setParent(body, expression);
    expression.body = body;
    setParent(params, expression);
    expression.params = params;
    setParent(dots, expression);
    expression.dots = dots;
    return expression;
}

export interface TableFieldExpression extends Expression {
    kind: SyntaxKind.TableFieldExpression;
    value: Expression;
    key?: Expression;
}

export function createTableFieldExpression(
    value: Expression, key?: Expression, parent?: Node, tsOriginal?: ts.Node): TableFieldExpression {

    const expression = createNode(SyntaxKind.TableExpression, parent, tsOriginal) as TableFieldExpression;
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

export function createTableExpression(
    fields: TableFieldExpression[], parent?: Node, tsOriginal?: ts.Node): TableExpression {

    const expression = createNode(SyntaxKind.TableExpression, parent, tsOriginal) as TableExpression;
    setParent(fields, expression);
    expression.fields = fields;
    return expression;
}

export interface UnaryExpression extends Expression {
    kind: SyntaxKind.UnaryExpression;
    operand: Expression;
    operator: UnaryOperator;
}

export function createUnaryExpression(
    operand: Expression, operator: UnaryOperator, parent?: Node, tsOriginal?: ts.Node): UnaryExpression {

    const expression = createNode(SyntaxKind.UnaryExpression, parent, tsOriginal) as UnaryExpression;
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

export function createBinaryExpression(
    left: Expression,
    right: Expression,
    operator: BinaryOperator,
    parent?: Node,
    tsOriginal?: ts.Node): BinaryExpression {

    const expression = createNode(SyntaxKind.BinaryExpression, parent, tsOriginal) as BinaryExpression;
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

export function createParenthesizedExpression(
    innerExpression: Expression, parent?: Node, tsOriginal?: ts.Node): ParenthesizedExpression {

    const expression =
        createNode(SyntaxKind.ParenthesizedExpression, parent, tsOriginal) as ParenthesizedExpression;
    setParent(innerExpression, expression);
    expression.innerEpxression = innerExpression;
    return expression;
}

export interface CallExpression extends Expression {
    kind: SyntaxKind.CallExpression;
    expression: Expression;
    params?: Expression[];
}

export function createCallExpression(
    expression: Expression, params?: Expression[], parent?: Node, tsOriginal?: ts.Node): CallExpression {

    const callExpression = createNode(SyntaxKind.CallExpression, parent, tsOriginal) as CallExpression;
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

export function createMethodCallExpression(
    prefixExpression: Expression,
    name: Identifier,
    params?: Expression[],
    parent?: Node,
    tsOriginal?: ts.Node): MethodCallExpression {

    const callExpression = createNode(SyntaxKind.MethodCallExpression, parent, tsOriginal) as MethodCallExpression;
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
}

export function createIdentifier(text: string, parent?: Node, tsOriginal?: ts.Node): Identifier {
    const expression = createNode(SyntaxKind.Identifier, parent, tsOriginal) as Identifier;
    expression.text = text;
    return expression;
}

export interface TableIndexExpression extends Expression {
    kind: SyntaxKind.TableIndexExpression;
    table: Expression;
    index: Expression;
    // TODO maybe add soemthing to handle dot vs [] access
}

export function createTableIndexExpression(
    table: Expression, index: Expression, parent?: Node, tsOriginal?: ts.Node): TableIndexExpression {

    const expression = createNode(SyntaxKind.Identifier, parent, tsOriginal) as TableIndexExpression;
    setParent(table, expression);
    expression.table = table;
    setParent(index, expression);
    expression.index = index;
    return expression;
}

type IdentifierOrTableIndexExpression = Identifier | TableIndexExpression;
