import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { assert } from "../../../utils";
import { LuaTarget } from "../../../CompilerOptions";
import { unsupportedForTarget } from "../../utils/diagnostics";
import { ExtensionKind } from "../../utils/language-extensions";
import { LanguageExtensionCallTransformerMap } from "./call-extension";

const binaryOperatorMappings = new Map<ExtensionKind, lua.BinaryOperator>([
    [ExtensionKind.AdditionOperatorType, lua.SyntaxKind.AdditionOperator],
    [ExtensionKind.AdditionOperatorMethodType, lua.SyntaxKind.AdditionOperator],
    [ExtensionKind.SubtractionOperatorType, lua.SyntaxKind.SubtractionOperator],
    [ExtensionKind.SubtractionOperatorMethodType, lua.SyntaxKind.SubtractionOperator],
    [ExtensionKind.MultiplicationOperatorType, lua.SyntaxKind.MultiplicationOperator],
    [ExtensionKind.MultiplicationOperatorMethodType, lua.SyntaxKind.MultiplicationOperator],
    [ExtensionKind.DivisionOperatorType, lua.SyntaxKind.DivisionOperator],
    [ExtensionKind.DivisionOperatorMethodType, lua.SyntaxKind.DivisionOperator],
    [ExtensionKind.ModuloOperatorType, lua.SyntaxKind.ModuloOperator],
    [ExtensionKind.ModuloOperatorMethodType, lua.SyntaxKind.ModuloOperator],
    [ExtensionKind.PowerOperatorType, lua.SyntaxKind.PowerOperator],
    [ExtensionKind.PowerOperatorMethodType, lua.SyntaxKind.PowerOperator],
    [ExtensionKind.FloorDivisionOperatorType, lua.SyntaxKind.FloorDivisionOperator],
    [ExtensionKind.FloorDivisionOperatorMethodType, lua.SyntaxKind.FloorDivisionOperator],
    [ExtensionKind.BitwiseAndOperatorType, lua.SyntaxKind.BitwiseAndOperator],
    [ExtensionKind.BitwiseAndOperatorMethodType, lua.SyntaxKind.BitwiseAndOperator],
    [ExtensionKind.BitwiseOrOperatorType, lua.SyntaxKind.BitwiseOrOperator],
    [ExtensionKind.BitwiseOrOperatorMethodType, lua.SyntaxKind.BitwiseOrOperator],
    [ExtensionKind.BitwiseExclusiveOrOperatorType, lua.SyntaxKind.BitwiseExclusiveOrOperator],
    [ExtensionKind.BitwiseExclusiveOrOperatorMethodType, lua.SyntaxKind.BitwiseExclusiveOrOperator],
    [ExtensionKind.BitwiseLeftShiftOperatorType, lua.SyntaxKind.BitwiseLeftShiftOperator],
    [ExtensionKind.BitwiseLeftShiftOperatorMethodType, lua.SyntaxKind.BitwiseLeftShiftOperator],
    [ExtensionKind.BitwiseRightShiftOperatorType, lua.SyntaxKind.BitwiseRightShiftOperator],
    [ExtensionKind.BitwiseRightShiftOperatorMethodType, lua.SyntaxKind.BitwiseRightShiftOperator],
    [ExtensionKind.ConcatOperatorType, lua.SyntaxKind.ConcatOperator],
    [ExtensionKind.ConcatOperatorMethodType, lua.SyntaxKind.ConcatOperator],
    [ExtensionKind.LessThanOperatorType, lua.SyntaxKind.LessThanOperator],
    [ExtensionKind.LessThanOperatorMethodType, lua.SyntaxKind.LessThanOperator],
    [ExtensionKind.GreaterThanOperatorType, lua.SyntaxKind.GreaterThanOperator],
    [ExtensionKind.GreaterThanOperatorMethodType, lua.SyntaxKind.GreaterThanOperator],
]);

const unaryOperatorMappings = new Map<ExtensionKind, lua.UnaryOperator>([
    [ExtensionKind.NegationOperatorType, lua.SyntaxKind.NegationOperator],
    [ExtensionKind.NegationOperatorMethodType, lua.SyntaxKind.NegationOperator],
    [ExtensionKind.BitwiseNotOperatorType, lua.SyntaxKind.BitwiseNotOperator],
    [ExtensionKind.BitwiseNotOperatorMethodType, lua.SyntaxKind.BitwiseNotOperator],
    [ExtensionKind.LengthOperatorType, lua.SyntaxKind.LengthOperator],
    [ExtensionKind.LengthOperatorMethodType, lua.SyntaxKind.LengthOperator],
]);

const bitwiseOperatorMapExtensions = new Set<ExtensionKind>([
    ExtensionKind.BitwiseAndOperatorType,
    ExtensionKind.BitwiseAndOperatorMethodType,
    ExtensionKind.BitwiseOrOperatorType,
    ExtensionKind.BitwiseOrOperatorMethodType,
    ExtensionKind.BitwiseExclusiveOrOperatorType,
    ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    ExtensionKind.BitwiseLeftShiftOperatorType,
    ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    ExtensionKind.BitwiseRightShiftOperatorType,
    ExtensionKind.BitwiseRightShiftOperatorMethodType,
    ExtensionKind.BitwiseNotOperatorType,
    ExtensionKind.BitwiseNotOperatorMethodType,
]);

const requiresLua53 = new Set([
    ...bitwiseOperatorMapExtensions,
    ExtensionKind.FloorDivisionOperatorType,
    ExtensionKind.FloorDivisionOperatorMethodType,
]);

export const operatorExtensionTransformers: LanguageExtensionCallTransformerMap = {};
for (const kind of binaryOperatorMappings.keys()) {
    operatorExtensionTransformers[kind] = transformBinaryOperator;
}
for (const kind of unaryOperatorMappings.keys()) {
    operatorExtensionTransformers[kind] = transformUnaryOperator;
}

function transformBinaryOperator(context: TransformationContext, node: ts.CallExpression, kind: ExtensionKind) {
    if (requiresLua53.has(kind)) checkHasLua53(context, node, kind);

    let args: readonly ts.Expression[] = node.arguments;
    if (
        args.length === 1 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        args = [node.expression.expression, ...args];
    }

    const luaOperator = binaryOperatorMappings.get(kind);
    assert(luaOperator);
    return lua.createBinaryExpression(
        context.transformExpression(args[0]),
        context.transformExpression(args[1]),
        luaOperator
    );
}

function transformUnaryOperator(context: TransformationContext, node: ts.CallExpression, kind: ExtensionKind) {
    if (requiresLua53.has(kind)) checkHasLua53(context, node, kind);

    let arg: ts.Expression;
    if (
        node.arguments.length === 0 &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
    ) {
        arg = node.expression.expression;
    } else {
        arg = node.arguments[0];
    }

    const luaOperator = unaryOperatorMappings.get(kind);
    assert(luaOperator);
    return lua.createUnaryExpression(context.transformExpression(arg), luaOperator);
}

function checkHasLua53(context: TransformationContext, node: ts.CallExpression, kind: ExtensionKind) {
    const isBefore53 =
        context.luaTarget === LuaTarget.Lua51 ||
        context.luaTarget === LuaTarget.Lua52 ||
        context.luaTarget === LuaTarget.LuaJIT ||
        context.luaTarget === LuaTarget.Universal;
    if (isBefore53) {
        const luaTarget = context.luaTarget === LuaTarget.Universal ? LuaTarget.Lua51 : context.luaTarget;
        if (
            kind === ExtensionKind.FloorDivisionOperatorType ||
            kind === ExtensionKind.FloorDivisionOperatorMethodType
        ) {
            context.diagnostics.push(unsupportedForTarget(node, "Floor division operator", luaTarget));
        } else {
            // is bitwise operator
            context.diagnostics.push(unsupportedForTarget(node, "Native bitwise operations", luaTarget));
        }
    }
}
