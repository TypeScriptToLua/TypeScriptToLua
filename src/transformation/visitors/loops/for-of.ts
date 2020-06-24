import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assert, cast } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations, isForRangeType, isLuaIteratorType } from "../../utils/annotations";
import { invalidForRangeCall, luaIteratorForbiddenUsage } from "../../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isNumberType } from "../../utils/typescript";
import { transformArguments } from "../call";
import { transformIdentifier } from "../identifier";
import { transformArrayBindingElement } from "../variable-declaration";
import { getVariableDeclarationBinding, transformForInitializer, transformLoopBody } from "./utils";

function transformForRangeStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    assert(ts.isCallExpression(statement.expression));

    const callArguments = statement.expression.arguments;
    if (callArguments.length !== 2 && callArguments.length !== 3) {
        context.diagnostics.push(
            invalidForRangeCall(statement.expression, `Expected 2-3 arguments, but got ${callArguments.length}`)
        );
    }

    if (statement.expression.arguments.some(a => !isNumberType(context, context.checker.getTypeAtLocation(a)))) {
        context.diagnostics.push(invalidForRangeCall(statement.expression, "arguments must be numbers"));
    }

    const controlVariable = getControlVariable() ?? lua.createAnonymousIdentifier();
    function getControlVariable(): lua.Identifier | undefined {
        if (!ts.isVariableDeclarationList(statement.initializer)) {
            context.diagnostics.push(
                invalidForRangeCall(statement.initializer, "loop must declare it's own control variable")
            );
            return;
        }

        const binding = getVariableDeclarationBinding(context, statement.initializer);
        if (!ts.isIdentifier(binding)) {
            context.diagnostics.push(invalidForRangeCall(statement.initializer, "destructuring cannot be used"));
            return;
        }

        if (!isNumberType(context, context.checker.getTypeAtLocation(binding))) {
            context.diagnostics.push(
                invalidForRangeCall(statement.expression, "function must return Iterable<number>")
            );
        }

        return transformIdentifier(context, binding);
    }

    const [start = lua.createNumericLiteral(0), limit = lua.createNumericLiteral(0), step] = transformArguments(
        context,
        callArguments,
        context.checker.getResolvedSignature(statement.expression)
    );

    return lua.createForStatement(block, controlVariable, start, limit, step, statement);
}

function transformForOfLuaIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const luaIterator = context.transformExpression(statement.expression);
    const type = context.checker.getTypeAtLocation(statement.expression);
    const tupleReturn = getTypeAnnotations(type).has(AnnotationKind.TupleReturn);
    let identifiers: lua.Identifier[] = [];

    if (tupleReturn) {
        // LuaIterator + TupleReturn

        if (ts.isVariableDeclarationList(statement.initializer)) {
            // Variables declared in for loop
            // for ${initializer} in ${iterable} do

            const binding = getVariableDeclarationBinding(context, statement.initializer);
            if (ts.isArrayBindingPattern(binding)) {
                identifiers = binding.elements.map(e => transformArrayBindingElement(context, e));
            } else {
                context.diagnostics.push(luaIteratorForbiddenUsage(binding));
            }
        } else if (ts.isArrayLiteralExpression(statement.initializer)) {
            // Variables NOT declared in for loop - catch iterator values in temps and assign
            // for ____value0 in ${iterable} do
            //     ${initializer} = ____value0

            identifiers = statement.initializer.elements.map((_, i) => lua.createIdentifier(`____value${i}`));
            if (identifiers.length > 0) {
                block.statements.unshift(
                    lua.createAssignmentStatement(
                        statement.initializer.elements.map(e =>
                            cast(context.transformExpression(e), lua.isAssignmentLeftHandSideExpression)
                        ),
                        identifiers
                    )
                );
            }
        } else {
            context.diagnostics.push(luaIteratorForbiddenUsage(statement.initializer));
        }
    } else {
        // LuaIterator (no TupleReturn)

        identifiers.push(transformForInitializer(context, statement.initializer, block));
    }

    if (identifiers.length === 0) {
        identifiers.push(lua.createAnonymousIdentifier());
    }

    return lua.createForInStatement(block, identifiers, [luaIterator], statement);
}

function transformForOfArrayStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const valueVariable = transformForInitializer(context, statement.initializer, block);
    const ipairsCall = lua.createCallExpression(lua.createIdentifier("ipairs"), [
        context.transformExpression(statement.expression),
    ]);

    return lua.createForInStatement(block, [lua.createAnonymousIdentifier(), valueVariable], [ipairsCall], statement);
}

function transformForOfIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const valueVariable = transformForInitializer(context, statement.initializer, block);
    const iterable = transformLuaLibFunction(
        context,
        LuaLibFeature.Iterator,
        statement.expression,
        context.transformExpression(statement.expression)
    );

    return lua.createForInStatement(block, [lua.createAnonymousIdentifier(), valueVariable], [iterable], statement);
}

export const transformForOfStatement: FunctionVisitor<ts.ForOfStatement> = (node, context) => {
    const body = lua.createBlock(transformLoopBody(context, node));

    if (ts.isCallExpression(node.expression) && isForRangeType(context, node.expression.expression)) {
        return transformForRangeStatement(context, node, body);
    } else if (isLuaIteratorType(context, node.expression)) {
        return transformForOfLuaIteratorStatement(context, node, body);
    } else if (isArrayType(context, context.checker.getTypeAtLocation(node.expression))) {
        return transformForOfArrayStatement(context, node, body);
    } else {
        return transformForOfIteratorStatement(context, node, body);
    }
};
