import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { assert } from "../../../utils";
import { getFunctionTypeForCall } from "../../utils/typescript";
import { LuaTarget } from "../../../CompilerOptions";
import { unsupportedBuiltinOptionalCall, unsupportedForTarget } from "../../utils/diagnostics";
import { ExtensionKind, getExtensionTypeForType } from "../../utils/language-extensions";

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

export const operatorMapExtensions: ReadonlySet<ExtensionKind> = new Set([
    ...binaryOperatorMappings.keys(),
    ...unaryOperatorMappings.keys(),
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

function getOperatorMapExtensionKindForCall(context: TransformationContext, node: ts.CallExpression) {
    const type = getFunctionTypeForCall(context, node);
    if (!type) return undefined;
    const kind = getExtensionTypeForType(context, type);
    if (kind && operatorMapExtensions.has(kind)) return kind;
}

export function transformOperatorMappingExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    isOptionalCall: boolean
): lua.Expression | undefined {
    const extensionKind = getOperatorMapExtensionKindForCall(context, node);
    if (!extensionKind) return undefined;
    if (isOptionalCall) {
        context.diagnostics.push(unsupportedBuiltinOptionalCall(node));
        return lua.createNilLiteral();
    }

    const isBefore53 =
        context.luaTarget === LuaTarget.Lua51 ||
        context.luaTarget === LuaTarget.Lua52 ||
        context.luaTarget === LuaTarget.LuaJIT ||
        context.luaTarget === LuaTarget.Universal;
    if (isBefore53) {
        const luaTarget = context.luaTarget === LuaTarget.Universal ? LuaTarget.Lua51 : context.luaTarget;
        if (bitwiseOperatorMapExtensions.has(extensionKind)) {
            context.diagnostics.push(unsupportedForTarget(node, "Native bitwise operations", luaTarget));
        } else if (
            extensionKind === ExtensionKind.FloorDivisionOperatorType ||
            extensionKind === ExtensionKind.FloorDivisionOperatorMethodType
        ) {
            context.diagnostics.push(unsupportedForTarget(node, "Floor division operator", luaTarget));
        }
    }

    let args: readonly ts.Expression[] = node.arguments;
    if (binaryOperatorMappings.has(extensionKind)) {
        if (
            args.length === 1 &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
        ) {
            args = [node.expression.expression, ...args];
        }

        const luaOperator = binaryOperatorMappings.get(extensionKind);
        assert(luaOperator);
        return lua.createBinaryExpression(
            context.transformExpression(args[0]),
            context.transformExpression(args[1]),
            luaOperator
        );
    } else {
        let arg: ts.Expression;
        if (
            args.length === 0 &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
        ) {
            arg = node.expression.expression;
        } else {
            arg = args[0];
        }

        const luaOperator = unaryOperatorMappings.get(extensionKind);
        assert(luaOperator);
        return lua.createUnaryExpression(context.transformExpression(arg), luaOperator);
    }
}
