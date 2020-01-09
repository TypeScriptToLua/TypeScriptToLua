import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast, castEach } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations, isForRangeType, isLuaIteratorType } from "../../utils/annotations";
import {
    InvalidForRangeCall,
    MissingForOfVariables,
    UnsupportedNonDestructuringLuaIterator,
    UnsupportedObjectDestructuringInForOf,
} from "../../utils/errors";
import { createUnpackCall } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isNumberType } from "../../utils/typescript";
import { transformArguments } from "../call";
import { transformIdentifier } from "../identifier";
import {
    transformBindingPattern,
    transformArrayBindingElement,
    transformVariableDeclaration,
} from "../variable-declaration";
import { getVariableDeclarationBinding, transformLoopBody } from "./utils";

function transformForOfInitializer(
    context: TransformationContext,
    initializer: ts.ForInitializer,
    expression: lua.Identifier
): lua.Statement[] {
    if (ts.isVariableDeclarationList(initializer)) {
        const binding = getVariableDeclarationBinding(initializer);
        // Declaration of new variable
        if (ts.isArrayBindingPattern(binding)) {
            if (binding.elements.length === 0) {
                // Ignore empty destructuring assignment
                return [];
            }

            return transformBindingPattern(context, binding, expression);
        } else if (ts.isObjectBindingPattern(binding)) {
            throw UnsupportedObjectDestructuringInForOf(initializer);
        }

        const variableStatements = transformVariableDeclaration(context, initializer.declarations[0]);
        if (variableStatements[0]) {
            // we can safely assume that for vars are not exported and therefore declarationstatenents
            return [
                lua.createVariableDeclarationStatement(
                    (variableStatements[0] as lua.VariableDeclarationStatement).left,
                    expression
                ),
            ];
        } else {
            throw MissingForOfVariables(initializer);
        }
    } else {
        // Assignment to existing variable
        let variables: lua.AssignmentLeftHandSideExpression | lua.AssignmentLeftHandSideExpression[];
        let valueExpression: lua.Expression = expression;
        if (ts.isArrayLiteralExpression(initializer)) {
            if (initializer.elements.length > 0) {
                valueExpression = createUnpackCall(context, expression, initializer);
                variables = castEach(
                    initializer.elements.map(e => context.transformExpression(e)),
                    lua.isAssignmentLeftHandSideExpression
                );
            } else {
                // Ignore empty destructring assignment
                return [];
            }
        } else if (ts.isObjectLiteralExpression(initializer)) {
            throw UnsupportedObjectDestructuringInForOf(initializer);
        } else {
            variables = cast(context.transformExpression(initializer), lua.isAssignmentLeftHandSideExpression);
        }

        return [lua.createAssignmentStatement(variables, valueExpression)];
    }
}

function transformForRangeStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    if (!ts.isCallExpression(statement.expression)) {
        throw InvalidForRangeCall(statement.expression, "Expression must be a call expression.");
    }

    if (statement.expression.arguments.length < 2 || statement.expression.arguments.length > 3) {
        throw InvalidForRangeCall(statement.expression, "@forRange function must take 2 or 3 arguments.");
    }

    if (statement.expression.arguments.some(a => !isNumberType(context, context.checker.getTypeAtLocation(a)))) {
        throw InvalidForRangeCall(statement.expression, "@forRange arguments must be number types.");
    }

    if (!ts.isVariableDeclarationList(statement.initializer)) {
        throw InvalidForRangeCall(statement.initializer, "@forRange loop must declare its own control variable.");
    }

    const binding = getVariableDeclarationBinding(statement.initializer);
    if (!ts.isIdentifier(binding)) {
        throw InvalidForRangeCall(statement.initializer, "@forRange loop cannot use destructuring.");
    }

    if (!isNumberType(context, context.checker.getTypeAtLocation(binding))) {
        throw InvalidForRangeCall(
            statement.expression,
            "@forRange function must return Iterable<number> or Array<number>."
        );
    }

    const control = transformIdentifier(context, binding);
    const signature = context.checker.getResolvedSignature(statement.expression);
    const [start, limit, step] = transformArguments(context, statement.expression.arguments, signature);
    return lua.createForStatement(block, control, start, limit, step, statement);
}

function transformForOfLuaIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    const luaIterator = context.transformExpression(statement.expression);
    const type = context.checker.getTypeAtLocation(statement.expression);
    const tupleReturn = getTypeAnnotations(context, type).has(AnnotationKind.TupleReturn);
    if (tupleReturn) {
        // LuaIterator + TupleReturn
        if (ts.isVariableDeclarationList(statement.initializer)) {
            // Variables declared in for loop
            // for ${initializer} in ${iterable} do
            const binding = getVariableDeclarationBinding(statement.initializer);
            if (ts.isArrayBindingPattern(binding)) {
                const identifiers = binding.elements.map(e => transformArrayBindingElement(context, e));
                if (identifiers.length === 0) {
                    identifiers.push(lua.createAnonymousIdentifier());
                }
                return lua.createForInStatement(block, identifiers, [luaIterator]);
            } else {
                // Single variable is not allowed
                throw UnsupportedNonDestructuringLuaIterator(statement.initializer);
            }
        } else {
            // Variables NOT declared in for loop - catch iterator values in temps and assign
            // for ____value0 in ${iterable} do
            //     ${initializer} = ____value0
            if (ts.isArrayLiteralExpression(statement.initializer)) {
                const tmps = statement.initializer.elements.map((_, i) => lua.createIdentifier(`____value${i}`));
                if (tmps.length > 0) {
                    const assign = lua.createAssignmentStatement(
                        castEach(
                            statement.initializer.elements.map(e => context.transformExpression(e)),
                            lua.isAssignmentLeftHandSideExpression
                        ),
                        tmps
                    );
                    block.statements.splice(0, 0, assign);
                } else {
                    tmps.push(lua.createAnonymousIdentifier());
                }
                return lua.createForInStatement(block, tmps, [luaIterator]);
            } else {
                // Single variable is not allowed
                throw UnsupportedNonDestructuringLuaIterator(statement.initializer);
            }
        }
    } else {
        // LuaIterator (no TupleReturn)
        if (
            ts.isVariableDeclarationList(statement.initializer) &&
            statement.initializer.declarations.length > 0 &&
            ts.isIdentifier(statement.initializer.declarations[0].name)
        ) {
            // Single variable declared in for loop
            // for ${initializer} in ${iterator} do
            return lua.createForInStatement(
                block,
                [transformIdentifier(context, statement.initializer.declarations[0].name)],
                [luaIterator]
            );
        } else {
            // Destructuring or variable NOT declared in for loop
            // for ____value in ${iterator} do
            //     local ${initializer} = unpack(____value)
            const valueVariable = lua.createIdentifier("____value");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                block.statements.splice(0, 0, ...initializer);
            }
            return lua.createForInStatement(block, [valueVariable], [luaIterator]);
        }
    }
}

function transformForOfArrayStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: lua.Block
): lua.Statement {
    let valueVariable: lua.Identifier;
    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Declaration of new variable
        const binding = getVariableDeclarationBinding(statement.initializer);
        if (ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)) {
            valueVariable = lua.createIdentifier("____values");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                block.statements.unshift(...initializer);
            }
        } else {
            valueVariable = transformIdentifier(context, binding);
        }
    } else {
        // Assignment to existing variable
        valueVariable = lua.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(...initializer);
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
        statement.initializer.declarations.length > 0 &&
        ts.isIdentifier(statement.initializer.declarations[0].name)
    ) {
        // Single variable declared in for loop
        // for ${initializer} in __TS__iterator(${iterator}) do
        return lua.createForInStatement(
            block,
            [transformIdentifier(context, statement.initializer.declarations[0].name)],
            [transformLuaLibFunction(context, LuaLibFeature.Iterator, statement.expression, iterable)]
        );
    } else {
        // Destructuring or variable NOT declared in for loop
        // for ____value in __TS__iterator(${iterator}) do
        //     local ${initializer} = ____value
        const valueVariable = lua.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(...initializer);
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
