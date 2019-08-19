import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { cast, castEach } from "../../../utils";
import { FunctionVisitor, TransformationContext, TransformerPlugin } from "../../context";
import { DecoratorKind, getCustomDecorators, isForRangeType, isLuaIteratorType } from "../../utils/decorators";
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
import { transformArrayBindingElement, transformVariableDeclaration } from "../variable";
import { transformLoopBody } from "./body";

function transformForOfInitializer(
    context: TransformationContext,
    initializer: ts.ForInitializer,
    expression: tstl.Expression
): tstl.Statement | undefined {
    if (ts.isVariableDeclarationList(initializer)) {
        // Declaration of new variable
        if (ts.isArrayBindingPattern(initializer.declarations[0].name)) {
            if (initializer.declarations[0].name.elements.length === 0) {
                // Ignore empty destructuring assignment
                return undefined;
            }

            expression = createUnpackCall(context, expression, initializer);
        } else if (ts.isObjectBindingPattern(initializer.declarations[0].name)) {
            throw UnsupportedObjectDestructuringInForOf(initializer);
        }

        const variableStatements = transformVariableDeclaration(context, initializer.declarations[0]);
        if (variableStatements[0]) {
            // we can safely assume that for vars are not exported and therefore declarationstatenents
            return tstl.createVariableDeclarationStatement(
                (variableStatements[0] as tstl.VariableDeclarationStatement).left,
                expression
            );
        } else {
            throw MissingForOfVariables(initializer);
        }
    } else {
        // Assignment to existing variable
        let variables: tstl.AssignmentLeftHandSideExpression | tstl.AssignmentLeftHandSideExpression[];
        if (ts.isArrayLiteralExpression(initializer)) {
            if (initializer.elements.length > 0) {
                expression = createUnpackCall(context, expression, initializer);
                variables = castEach(
                    initializer.elements.map(e => context.transformExpression(e)),
                    tstl.isAssignmentLeftHandSideExpression
                );
            } else {
                // Ignore empty destructring assignment
                return undefined;
            }
        } else if (ts.isObjectLiteralExpression(initializer)) {
            throw UnsupportedObjectDestructuringInForOf(initializer);
        } else {
            variables = cast(context.transformExpression(initializer), tstl.isAssignmentLeftHandSideExpression);
        }

        return tstl.createAssignmentStatement(variables, expression);
    }
}

function transformForRangeStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: tstl.Block
): tstl.Statement {
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

    const controlDeclaration = statement.initializer.declarations[0];
    if (!ts.isIdentifier(controlDeclaration.name)) {
        throw InvalidForRangeCall(statement.initializer, "@forRange loop cannot use destructuring.");
    }

    if (!isNumberType(context, context.checker.getTypeAtLocation(controlDeclaration))) {
        throw InvalidForRangeCall(
            statement.expression,
            "@forRange function must return Iterable<number> or Array<number>."
        );
    }

    const control = transformIdentifier(context, controlDeclaration.name);
    const signature = context.checker.getResolvedSignature(statement.expression);
    const [start, limit, step] = transformArguments(context, statement.expression.arguments, signature);
    return tstl.createForStatement(block, control, start, limit, step, statement);
}

function transformForOfLuaIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: tstl.Block
): tstl.Statement {
    const luaIterator = context.transformExpression(statement.expression);
    const type = context.checker.getTypeAtLocation(statement.expression);
    const tupleReturn = getCustomDecorators(context, type).has(DecoratorKind.TupleReturn);
    if (tupleReturn) {
        // LuaIterator + TupleReturn
        if (ts.isVariableDeclarationList(statement.initializer)) {
            // Variables declared in for loop
            // for ${initializer} in ${iterable} do
            const initializerVariable = statement.initializer.declarations[0].name;
            if (ts.isArrayBindingPattern(initializerVariable)) {
                const identifiers = castEach(
                    initializerVariable.elements.map(e => transformArrayBindingElement(context, e)),
                    tstl.isIdentifier
                );
                if (identifiers.length === 0) {
                    identifiers.push(tstl.createAnonymousIdentifier());
                }
                return tstl.createForInStatement(block, identifiers, [luaIterator]);
            } else {
                // Single variable is not allowed
                throw UnsupportedNonDestructuringLuaIterator(statement.initializer);
            }
        } else {
            // Variables NOT declared in for loop - catch iterator values in temps and assign
            // for ____value0 in ${iterable} do
            //     ${initializer} = ____value0
            if (ts.isArrayLiteralExpression(statement.initializer)) {
                const tmps = statement.initializer.elements.map((_, i) => tstl.createIdentifier(`____value${i}`));
                if (tmps.length > 0) {
                    const assign = tstl.createAssignmentStatement(
                        castEach(
                            statement.initializer.elements.map(e => context.transformExpression(e)),
                            tstl.isAssignmentLeftHandSideExpression
                        ),
                        tmps
                    );
                    block.statements.splice(0, 0, assign);
                } else {
                    tmps.push(tstl.createAnonymousIdentifier());
                }
                return tstl.createForInStatement(block, tmps, [luaIterator]);
            } else {
                // Single variable is not allowed
                throw UnsupportedNonDestructuringLuaIterator(statement.initializer);
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
            return tstl.createForInStatement(
                block,
                [transformIdentifier(context, statement.initializer.declarations[0].name)],
                [luaIterator]
            );
        } else {
            // Destructuring or variable NOT declared in for loop
            // for ____value in ${iterator} do
            //     local ${initializer} = unpack(____value)
            const valueVariable = tstl.createIdentifier("____value");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                block.statements.splice(0, 0, initializer);
            }
            return tstl.createForInStatement(block, [valueVariable], [luaIterator]);
        }
    }
}

function transformForOfArrayStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: tstl.Block
): tstl.Statement {
    let valueVariable: tstl.Identifier;
    if (ts.isVariableDeclarationList(statement.initializer)) {
        // Declaration of new variable
        const variables = statement.initializer.declarations[0].name;
        if (ts.isArrayBindingPattern(variables) || ts.isObjectBindingPattern(variables)) {
            valueVariable = tstl.createIdentifier("____values");
            const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
            if (initializer) {
                block.statements.unshift(initializer);
            }
        } else {
            valueVariable = transformIdentifier(context, variables);
        }
    } else {
        // Assignment to existing variable
        valueVariable = tstl.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(initializer);
        }
    }

    const ipairsCall = tstl.createCallExpression(tstl.createIdentifier("ipairs"), [
        context.transformExpression(statement.expression),
    ]);

    return tstl.createForInStatement(block, [tstl.createAnonymousIdentifier(), valueVariable], [ipairsCall], statement);
}

function transformForOfIteratorStatement(
    context: TransformationContext,
    statement: ts.ForOfStatement,
    block: tstl.Block
): tstl.Statement {
    const iterable = context.transformExpression(statement.expression);
    if (
        ts.isVariableDeclarationList(statement.initializer) &&
        ts.isIdentifier(statement.initializer.declarations[0].name)
    ) {
        // Single variable declared in for loop
        // for ${initializer} in __TS__iterator(${iterator}) do
        return tstl.createForInStatement(
            block,
            [transformIdentifier(context, statement.initializer.declarations[0].name as ts.Identifier)],
            [transformLuaLibFunction(context, LuaLibFeature.Iterator, statement.expression, iterable)]
        );
    } else {
        // Destructuring or variable NOT declared in for loop
        // for ____value in __TS__iterator(${iterator}) do
        //     local ${initializer} = ____value
        const valueVariable = tstl.createIdentifier("____value");
        const initializer = transformForOfInitializer(context, statement.initializer, valueVariable);
        if (initializer) {
            block.statements.unshift(initializer);
        }

        return tstl.createForInStatement(
            block,
            [valueVariable],
            [transformLuaLibFunction(context, LuaLibFeature.Iterator, statement.expression, iterable)]
        );
    }
}

const transformForOfStatement: FunctionVisitor<ts.ForOfStatement> = (node, context) => {
    const body = tstl.createBlock(transformLoopBody(context, node));

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

export const forOfPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ForOfStatement]: transformForOfStatement,
    },
};
