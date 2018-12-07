// Simplified Lua AST based roughly on http://lua-users.org/wiki/MetaLuaAbstractSyntaxTree,
// https://www.lua.org/manual/5.3/manual.html (9 – The Complete Syntax of Lua) and the TS AST implementation

// We can ellide a lot of nodes especially tokens and keyowords
// becasue we dont create the AST from text

namespace tstl {
    enum SyntaxKind {
        Block,
        // Statements
        DoStatement,
        VariableDeclarationStatement,
        VariableAssignmentStatement,
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
    type UnaryOperator = SyntaxKind.NegationOperator | SyntaxKind.LengthOperator |
                         SyntaxKind.NotOperator | SyntaxKind.BitwiseNotOperator;
    type BinaryOperator =
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
    interface TextRange {
        pos: number;
        end: number;
    }

    interface Node extends TextRange {
        kind: SyntaxKind;
        // modifiers?: ModifiersArray; ????????????? do we realy need this since lua has no modifiers (maybe local?)
        parent?: Node;
    }

    // TODO discuss: in TS AST a block is a statement
    // in the links above blocks are independent
    interface Block extends Node {
        kind: SyntaxKind.Block;
        statements?: Statement[];
    }

    interface Statement extends Node {
        _statementBrand: any;
    }

    interface DoStatement extends Statement {
        kind: SyntaxKind.DoStatement;
        statements?: Statement[];
    }

    // `local test1, test2 = 12, 42` or `local test1, test2`
    interface VariableDeclarationStatement extends Statement {
        kind: SyntaxKind.VariableDeclarationStatement;
        lhs: IdentifierOrTableIndexExpression[];
        rhs?: Expression[];
    }

    // `test1, test2 = 12, 42`
    interface VariableAssignmentStatement extends Statement {
        kind: SyntaxKind.VariableAssignmentStatement;
        left: IdentifierOrTableIndexExpression[];
        right: Expression[];
    }

    interface IterationStatement extends Statement {
        body: Block;
    }

    interface WhileStatement extends IterationStatement {
        kind: SyntaxKind.WhileStatement;
        expression: Expression;
    }

    interface RepeatStatement extends IterationStatement {
        kind: SyntaxKind.RepeatStatement;
        expression: Expression;
    }

    // TODO maybe rename to ForNumericStatement
    interface ForStatement extends IterationStatement {
        kind: SyntaxKind.ForStatement;
        controlVariable: Identifier;
        controlVariableInitializer: Expression;
        limitExpression: Expression;
        stepExpression?: Expression;
    }

    interface ForInStatement extends IterationStatement {
        kind: SyntaxKind.ForInStatement;
        names: Identifier[];
        expressions: Expression[];
    }

    interface GotoStatement extends Statement {
        kind: SyntaxKind.GotoStatement;
        label: string; // or identifier ?
    }

    interface LabelStatement extends Statement {
        kind: SyntaxKind.LabelStatement;
        name: string; // or identifier ?
    }

    interface ReturnStatement extends Statement {
        kind: SyntaxKind.ReturnStatement;
        epxressions?: Expression[];
    }

    interface BreakStatement extends Statement {
        kind: SyntaxKind.BreakStatement;
    }

    // TODO used for function calls, or shoudl function calls inherit from both expression and statement?
    interface ExpressionStatement extends Statement {
        expression: Expression;
    }

    interface Expression extends Node {
        _expressionBrand: any;
    }

    // Expressions
    // TODO maybe create subinterface for Literals/PrimaryExpressions
    interface NilLiteral extends Expression {
        kind: SyntaxKind.NilKeyword;
    }

    interface BooleanLiteral extends Expression {
        kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
    }

    interface NilLiteral extends Expression {
        kind: SyntaxKind.NilKeyword;
    }

    // TODO Call this DotsLiteral or DotsKeyword?
    interface DotsLiteral extends Expression {
        kind: SyntaxKind.DotsKeyword;
    }

    // StringLiteral / NumberLiteral
    // TODO TS uses the interface "LiteralLikeNode" with a "text: string" member
    // but since we dont parse from text i think we can simplify by just having a value member

    // TODO NumericLiteral or NumberLiteral?
    interface NumericLiteral extends Expression {
        kind: SyntaxKind.NumericLiteral;
        value: number;
    }

    interface StringLiteral extends Expression {
        kind: SyntaxKind.StringLiteral;
        value: string;
    }

    // There is no function statement/declaration because those are just syntax sugar
    //
    // `function f () body end` becomes `f = function () body` end
    // `function t.a.b.c.f () body end` becomes `t.a.b.c.f = function () body end`
    // `local function f () body end` becomes `local f; f = function () body end` NOT `local f = function () body end`
    // See https://www.lua.org/manual/5.3/manual.html 3.4.11
    //
    // We should probably create helper functions to create the different function declarations
    interface FunctionExpression extends Expression {
        kind: SyntaxKind.FunctionStatement;
        params?: Identifier[];
        dots?: DotsLiteral; // Maybe combine params and dot?
        body: Block;
    }

    interface TableExpression extends Expression {
        kind: SyntaxKind.TableExpression;
        fields?: Expression | [Expression, Expression];
    }

    interface UnaryExpression extends Expression {
        kind: SyntaxKind.UnaryExpression;
        operator: UnaryOperator;
        operand: Expression;
    }

    interface BinaryExpression extends Expression {
        kind: SyntaxKind.BinaryExpression;
        operator: BinaryOperator;
        left: Expression;
        right: Expression;
    }

    interface ParenthesizedExpression extends Expression {
        kind: SyntaxKind.ParenthesizedExpression;
        innerExpression: Expression;
    }

    interface CallExpression extends Expression {
        kind: SyntaxKind.CallExpression;
        expression: Expression;
        params?: Expression[];
    }

    interface MethodCallExpression extends Expression {
        kind: SyntaxKind.MethodCallExpression;
        prefixExpression: Expression;
        params?: Expression[];
        name: Identifier;
    }

    interface Identifier extends Expression {
        kind: SyntaxKind.Identifier;
        text: string;
    }

    interface TableIndexExpression extends Expression {
        kind: SyntaxKind.TableIndexExpression;
        table: Expression;
        index: Expression;
        // TODO maybe add soemthing to handle dot vs [] access
    }

    type IdentifierOrTableIndexExpression = Identifier | TableIndexExpression;
}
