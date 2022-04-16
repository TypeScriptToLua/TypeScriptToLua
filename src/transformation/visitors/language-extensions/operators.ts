import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";
import { assert } from "../../../utils";
import { getFunctionTypeForCall } from "../../utils/typescript";
import { LuaTarget } from "../../../CompilerOptions";
import { unsupportedBuiltinOptionalCall, unsupportedForTarget } from "../../utils/diagnostics";

const binaryOperatorMappings = new Map<extensions.ExtensionKind, lua.BinaryOperator>([
    [extensions.ExtensionKind.AdditionOperatorType, lua.SyntaxKind.AdditionOperator],
    [extensions.ExtensionKind.AdditionOperatorMethodType, lua.SyntaxKind.AdditionOperator],
    [extensions.ExtensionKind.SubtractionOperatorType, lua.SyntaxKind.SubtractionOperator],
    [extensions.ExtensionKind.SubtractionOperatorMethodType, lua.SyntaxKind.SubtractionOperator],
    [extensions.ExtensionKind.MultiplicationOperatorType, lua.SyntaxKind.MultiplicationOperator],
    [extensions.ExtensionKind.MultiplicationOperatorMethodType, lua.SyntaxKind.MultiplicationOperator],
    [extensions.ExtensionKind.DivisionOperatorType, lua.SyntaxKind.DivisionOperator],
    [extensions.ExtensionKind.DivisionOperatorMethodType, lua.SyntaxKind.DivisionOperator],
    [extensions.ExtensionKind.ModuloOperatorType, lua.SyntaxKind.ModuloOperator],
    [extensions.ExtensionKind.ModuloOperatorMethodType, lua.SyntaxKind.ModuloOperator],
    [extensions.ExtensionKind.PowerOperatorType, lua.SyntaxKind.PowerOperator],
    [extensions.ExtensionKind.PowerOperatorMethodType, lua.SyntaxKind.PowerOperator],
    [extensions.ExtensionKind.FloorDivisionOperatorType, lua.SyntaxKind.FloorDivisionOperator],
    [extensions.ExtensionKind.FloorDivisionOperatorMethodType, lua.SyntaxKind.FloorDivisionOperator],
    [extensions.ExtensionKind.BitwiseAndOperatorType, lua.SyntaxKind.BitwiseAndOperator],
    [extensions.ExtensionKind.BitwiseAndOperatorMethodType, lua.SyntaxKind.BitwiseAndOperator],
    [extensions.ExtensionKind.BitwiseOrOperatorType, lua.SyntaxKind.BitwiseOrOperator],
    [extensions.ExtensionKind.BitwiseOrOperatorMethodType, lua.SyntaxKind.BitwiseOrOperator],
    [extensions.ExtensionKind.BitwiseExclusiveOrOperatorType, lua.SyntaxKind.BitwiseExclusiveOrOperator],
    [extensions.ExtensionKind.BitwiseExclusiveOrOperatorMethodType, lua.SyntaxKind.BitwiseExclusiveOrOperator],
    [extensions.ExtensionKind.BitwiseLeftShiftOperatorType, lua.SyntaxKind.BitwiseLeftShiftOperator],
    [extensions.ExtensionKind.BitwiseLeftShiftOperatorMethodType, lua.SyntaxKind.BitwiseLeftShiftOperator],
    [extensions.ExtensionKind.BitwiseRightShiftOperatorType, lua.SyntaxKind.BitwiseRightShiftOperator],
    [extensions.ExtensionKind.BitwiseRightShiftOperatorMethodType, lua.SyntaxKind.BitwiseRightShiftOperator],
    [extensions.ExtensionKind.ConcatOperatorType, lua.SyntaxKind.ConcatOperator],
    [extensions.ExtensionKind.ConcatOperatorMethodType, lua.SyntaxKind.ConcatOperator],
    [extensions.ExtensionKind.LessThanOperatorType, lua.SyntaxKind.LessThanOperator],
    [extensions.ExtensionKind.LessThanOperatorMethodType, lua.SyntaxKind.LessThanOperator],
    [extensions.ExtensionKind.GreaterThanOperatorType, lua.SyntaxKind.GreaterThanOperator],
    [extensions.ExtensionKind.GreaterThanOperatorMethodType, lua.SyntaxKind.GreaterThanOperator],
]);

const unaryOperatorMappings = new Map<extensions.ExtensionKind, lua.UnaryOperator>([
    [extensions.ExtensionKind.NegationOperatorType, lua.SyntaxKind.NegationOperator],
    [extensions.ExtensionKind.NegationOperatorMethodType, lua.SyntaxKind.NegationOperator],
    [extensions.ExtensionKind.BitwiseNotOperatorType, lua.SyntaxKind.BitwiseNotOperator],
    [extensions.ExtensionKind.BitwiseNotOperatorMethodType, lua.SyntaxKind.BitwiseNotOperator],
    [extensions.ExtensionKind.LengthOperatorType, lua.SyntaxKind.LengthOperator],
    [extensions.ExtensionKind.LengthOperatorMethodType, lua.SyntaxKind.LengthOperator],
]);

const operatorMapExtensions = [...binaryOperatorMappings.keys(), ...unaryOperatorMappings.keys()];

const bitwiseOperatorMapExtensions = new Set<extensions.ExtensionKind>([
    extensions.ExtensionKind.BitwiseAndOperatorType,
    extensions.ExtensionKind.BitwiseAndOperatorMethodType,
    extensions.ExtensionKind.BitwiseOrOperatorType,
    extensions.ExtensionKind.BitwiseOrOperatorMethodType,
    extensions.ExtensionKind.BitwiseExclusiveOrOperatorType,
    extensions.ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    extensions.ExtensionKind.BitwiseLeftShiftOperatorType,
    extensions.ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    extensions.ExtensionKind.BitwiseRightShiftOperatorType,
    extensions.ExtensionKind.BitwiseRightShiftOperatorMethodType,
    extensions.ExtensionKind.BitwiseNotOperatorType,
    extensions.ExtensionKind.BitwiseNotOperatorMethodType,
]);

function getOperatorMapExtensionKindForCall(context: TransformationContext, node: ts.CallExpression) {
    const type = getFunctionTypeForCall(context, node);
    return type && operatorMapExtensions.find(extensionKind => extensions.isExtensionType(type, extensionKind));
}

export function isOperatorMapping(context: TransformationContext, node: ts.CallExpression | ts.Identifier) {
    if (ts.isCallExpression(node)) {
        return getOperatorMapExtensionKindForCall(context, node) !== undefined;
    } else {
        const type = context.checker.getTypeAtLocation(node);
        return operatorMapExtensions.some(extensionKind => extensions.isExtensionType(type, extensionKind));
    }
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
        context.luaTarget === LuaTarget.Lua50 ||
        context.luaTarget === LuaTarget.Lua51 ||
        context.luaTarget === LuaTarget.Lua52 ||
        context.luaTarget === LuaTarget.LuaJIT ||
        context.luaTarget === LuaTarget.Universal;
    if (isBefore53) {
        const luaTarget = context.luaTarget === LuaTarget.Universal ? LuaTarget.Lua51 : context.luaTarget;
        if (bitwiseOperatorMapExtensions.has(extensionKind)) {
            context.diagnostics.push(unsupportedForTarget(node, "Native bitwise operations", luaTarget));
        } else if (
            extensionKind === extensions.ExtensionKind.FloorDivisionOperatorType ||
            extensionKind === extensions.ExtensionKind.FloorDivisionOperatorMethodType
        ) {
            context.diagnostics.push(unsupportedForTarget(node, "Floor division operator", luaTarget));
        }
    }

    const args = node.arguments.slice();
    if (binaryOperatorMappings.has(extensionKind)) {
        if (
            args.length === 1 &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
        ) {
            args.unshift(node.expression.expression);
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
