import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assert, cast, castEach } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations, isForRangeType, isLuaIteratorType } from "../../utils/annotations";
import {
    forOfUnsupportedObjectDestructuring,
    invalidForRangeCall,
    luaIteratorForbiddenUsage,
} from "../../utils/diagnostics";
import { createUnpackCall } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isNumberType } from "../../utils/typescript";
import { transformArguments } from "../call";
import { transformIdentifier } from "../identifier";
import { transformArrayBindingElement, transformVariableDeclaration } from "../variable-declaration";
import { transformLoopBody } from "./body";

function transformForOfInitializer(
    context: TransformationContext,
    initializer: ts.ForInitializer,
    expression: lua.Expression
): lua.Statement | undefined {
    if (ts.isVariableDeclarationList(initializer)) {
        // Declaration of new variable
        if (ts.isArrayBindingPattern(initializer.declarations[0].name)) {
            if (initializer.declarations[0].name.elements.length === 0) {
                // Ignore empty destructuring assignment
                return undefined;
            }

            expression = createUnpackCall(context, expression, initializer);
        } else if (ts.isObjectBindingPattern(initializer.declarations[0].name)) {
            context.diagnostics.push(forOfUnsupportedObjectDestructuring(initializer));
            return;
        }

        // TODO: It's not correct without https://github.com/TypeScriptToLua/TypeScriptToLua/pull/762
        // // we can safely assume that for vars are not exported and therefore VariableDeclarationStatement's
        // const assignmentStatement = cast(
        //     transformVariableDeclaration(context, initializer.declarations[0])[0],
        //     lua.isVariableDeclarationStatement
        // );

        const assignmentStatement = transformVariableDeclaration(context, initializer.declarations[0])[0] as
            | lua.VariableDeclarationStatement
            | undefined;
        assert(assignmentStatement);

        return lua.createVariableDeclarationStatement(assignmentStatement.left, expression);
    } else {
        // Assignment to existing variable
        let variables: lua.AssignmentLeftHandSideExpression | lua.AssignmentLeftHandSideExpression[];
        if (ts.isArrayLiteralExpression(initializer)) {
            if (initializer.elements.length > 0) {
                expression = createUnpackCall(context, expression, initializer);
                variables = castEach(
                    initializer.elements.map(e => context.transformExpression(e)),
                    lua.isAssignmentLeftHandSideExpression
                );
            } else {
                // Ignore empty destructring assignment
                return undefined;
            }
        } else if (ts.isObjectLiteralExpression(initializer)) {
            context.diagnostics.push(forOfUnsupportedObjectDestructuring(initializer));
            return;
        } else {
            variables = cast(context.transformExpression(initializer), lua.isAssignmentLeftHandSideExpression);
        }

        return lua.createAssignmentStatement(variables, expression);
    }
}

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

        const controlDeclaration = statement.initializer.declarations[0];
        if (!ts.isIdentifier(controlDeclaration.name)) {
            context.diagnostics.push(invalidForRangeCall(statement.initializer, "destructuring cannot be used"));
            return;
        }

        if (!isNumberType(context, context.checker.getTypeAtLocation(controlDeclaration))) {
            context.diagnostics.push(
                invalidForRangeCall(statement.expression, "function must return Iterable<number>")
            );
        }

        return transformIdentifier(context, controlDeclaration.name);
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
    const tupleReturn = getTypeAnnotations(context, type).has(AnnotationKind.TupleReturn);
    let identifiers: lua.Identifier[] = [];

    if (tupleReturn) {
        // LuaIterator + TupleReturn
        if (ts.isVariableDeclarationList(statement.initializer)) {
            // Variables declared in for loop
            // for ${initializer} in ${iterable} do
            const initializerVariable = statement.initializer.declarations[0].name;

            if (ts.isArrayBindingPattern(initializerVariable)) {
                identifiers = castEach(
                    initializerVariable.elements.map(e => transformArrayBindingElement(context, e)),
                    lua.isIdentifier
                );
            } else {
                context.diagnostics.push(luaIteratorForbiddenUsage(initializerVariable));
            }
        } else {
            // Variables NOT declared in for loop - catch iterator values in temps and assign
            // for ____value0 in ${iterable} do
            //     ${initializer} = ____value0
            if (ts.isArrayLiteralExpression(statement.initializer)) {
                identifiers = statement.initializer.elements.map((_, i) => lua.createIdentifier(`____value${i}`));
                if (identifiers.length > 0) {
                    block.statements.unshift(
                        lua.createAssignmentStatement(
                            castEach(
                                statement.initializer.elements.map(e => context.transformExpression(e)),
                                lua.isAssignmentLeftHandSideExpression
                            ),
                            identifiers
                        )
                    );
                }
            } else {
                context.diagnostics.push(luaIteratorForbiddenUsage(statement.initializer));
            }
        }
    } else {
        // LuaIterator (no TupleReturn)
        if (
            ts.isVariableDeclarationList(statement.initializer) &&
            ts.isIdentifier(statement.initializer.declarations[0].name)
        ) {
            // Single variable declared in for loop
            // for ${initializer} in ${iterator} do
            identifiers.push(transformIdentifier(context, statement.initializer.declarations[0].name));
        } else {
            // Destructuring or variable NOT declared in for loop
            // for ____value in ${iterator} do
            //     local ${initializer} = ____value
            const valueVariable = lua.createIdentifier("____value");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                identifiers.push(valueVariable);
                block.statements.unshift(initializer);
            }
        }
    }

    if (identifiers.length === 0) {
        identifiers.push(lua.createAnonymousIdentifier());
    }

    return lua.createForInStatement(block, identifiers, [luaIterator]);
}

function transformForOfArrayStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    let valueVariable: lua.Identifier;
    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Declaration of new variable
        const variables = statement.initializer.declarations[0].name;
        if (ts.isArrayBindingPattern(variables) || ts.isObjectBindingPattern(variables)) {
            valueVariable = lua.createIdentifier("____values");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                block.statements.unshift(initializer);
            }
        } else {
            valueVariable = transformIdentifier(context, variables);
        }
    } else {
        // Assignment to existing variable
        valueVariable = lua.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(initializer);
        }
    }

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
    const iterable = context.transformExpression(statement.expression);
    if (
        ts.isVariableDeclarationList(statement.initializer) &&
        ts.isIdentifier(statement.initializer.declarations[0].name)
    ) {
        // Single variable declared in for loop
        // for ${initializer} in __TS__iterator(${iterator}) do
        return lua.createForInStatement(
            block,
            [transformIdentifier(context, statement.initializer.declarations[0].name as ts.Identifier)],
            [transformLuaLibFunction(context, LuaLibFeature.Iterator, statement.expression, iterable)]
        );
    } else {
        // Destructuring or variable NOT declared in for loop
        // for ____value in __TS__iterator(${iterator}) do
        //     local ${initializer} = ____value
        const valueVariable = lua.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(initializer);
        }

        return lua.createForInStatement(
            block,
            [valueVariable],
            [transformLuaLibFunction(context, LuaLibFeature.Iterator, statement.expression, iterable)]
        );
    }
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
