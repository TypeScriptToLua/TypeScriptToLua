import * as ts from "typescript";
import { TransformationContext } from "../context";
import { invalidMethodCallExtensionUse, invalidSpreadInCallExtension } from "./diagnostics";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    RangeFunction = "RangeFunction",
    VarargConstant = "VarargConstant",
    AdditionOperatorType = "Addition",
    AdditionOperatorMethodType = "AdditionMethod",
    SubtractionOperatorType = "Subtraction",
    SubtractionOperatorMethodType = "SubtractionMethod",
    MultiplicationOperatorType = "Multiplication",
    MultiplicationOperatorMethodType = "MultiplicationMethod",
    DivisionOperatorType = "Division",
    DivisionOperatorMethodType = "DivisionMethod",
    ModuloOperatorType = "Modulo",
    ModuloOperatorMethodType = "ModuloMethod",
    PowerOperatorType = "Power",
    PowerOperatorMethodType = "PowerMethod",
    FloorDivisionOperatorType = "FloorDivision",
    FloorDivisionOperatorMethodType = "FloorDivisionMethod",
    BitwiseAndOperatorType = "BitwiseAnd",
    BitwiseAndOperatorMethodType = "BitwiseAndMethod",
    BitwiseOrOperatorType = "BitwiseOr",
    BitwiseOrOperatorMethodType = "BitwiseOrMethod",
    BitwiseExclusiveOrOperatorType = "BitwiseExclusiveOr",
    BitwiseExclusiveOrOperatorMethodType = "BitwiseExclusiveOrMethod",
    BitwiseLeftShiftOperatorType = "BitwiseLeftShift",
    BitwiseLeftShiftOperatorMethodType = "BitwiseLeftShiftMethod",
    BitwiseRightShiftOperatorType = "BitwiseRightShift",
    BitwiseRightShiftOperatorMethodType = "BitwiseRightShiftMethod",
    ConcatOperatorType = "Concat",
    ConcatOperatorMethodType = "ConcatMethod",
    LessThanOperatorType = "LessThan",
    LessThanOperatorMethodType = "LessThanMethod",
    GreaterThanOperatorType = "GreaterThan",
    GreaterThanOperatorMethodType = "GreaterThanMethod",
    NegationOperatorType = "Negation",
    NegationOperatorMethodType = "NegationMethod",
    BitwiseNotOperatorType = "BitwiseNot",
    BitwiseNotOperatorMethodType = "BitwiseNotMethod",
    LengthOperatorType = "Length",
    LengthOperatorMethodType = "LengthMethod",
    TableNewType = "TableNew",
    TableDeleteType = "TableDelete",
    TableDeleteMethodType = "TableDeleteMethod",
    TableGetType = "TableGet",
    TableGetMethodType = "TableGetMethod",
    TableHasType = "TableHas",
    TableHasMethodType = "TableHasMethod",
    TableSetType = "TableSet",
    TableSetMethodType = "TableSetMethod",
    TableAddKeyType = "TableAddKey",
    TableAddKeyMethodType = "TableAddKeyMethod",
}

const extensionValues: Set<string> = new Set(Object.values(ExtensionKind));

export function getExtensionKindForType(context: TransformationContext, type: ts.Type): ExtensionKind | undefined {
    const value = getPropertyValue(context, type, "__tstlExtension");
    if (value && extensionValues.has(value)) {
        return value as ExtensionKind;
    }
}

const excludedTypeFlags: ts.TypeFlags =
    ((1 << 18) - 1) | // All flags from Any...Never
    ts.TypeFlags.Index |
    ts.TypeFlags.NonPrimitive;

function getPropertyValue(context: TransformationContext, type: ts.Type, propertyName: string): string | undefined {
    if (type.flags & excludedTypeFlags) return;
    const property = type.getProperty(propertyName);
    if (!property) return undefined;
    const propertyType = context.checker.getTypeOfSymbolAtLocation(property, context.sourceFile);
    if (propertyType.isStringLiteral()) return propertyType.value;
}

export function getExtensionKindForNode(context: TransformationContext, node: ts.Node): ExtensionKind | undefined {
    const originalNode = ts.getOriginalNode(node);
    let type = context.checker.getTypeAtLocation(originalNode);
    if (ts.isOptionalChain(originalNode)) {
        type = context.checker.getNonNullableType(type);
    }
    return getExtensionKindForType(context, type);
}

export function getExtensionKindForSymbol(
    context: TransformationContext,
    symbol: ts.Symbol
): ExtensionKind | undefined {
    const type = context.checker.getTypeOfSymbolAtLocation(symbol, context.sourceFile);
    return getExtensionKindForType(context, type);
}

export enum IterableExtensionKind {
    Iterable = "Iterable",
    Pairs = "Pairs",
    PairsKey = "PairsKey",
}

export function isLuaIterable(context: TransformationContext, type: ts.Type): boolean {
    return getPropertyValue(context, type, "__tstlIterable") !== undefined;
}

export function getIterableExtensionTypeForType(
    context: TransformationContext,
    type: ts.Type
): IterableExtensionKind | undefined {
    const value = getPropertyValue(context, type, "__tstlIterable");
    if (value && value in IterableExtensionKind) {
        return value as IterableExtensionKind;
    }
}

export function getIterableExtensionKindForNode(
    context: TransformationContext,
    node: ts.Node
): IterableExtensionKind | undefined {
    const type = context.checker.getTypeAtLocation(node);
    return getIterableExtensionTypeForType(context, type);
}

export const methodExtensionKinds: ReadonlySet<ExtensionKind> = new Set<ExtensionKind>([
    ExtensionKind.AdditionOperatorMethodType,
    ExtensionKind.SubtractionOperatorMethodType,
    ExtensionKind.MultiplicationOperatorMethodType,
    ExtensionKind.DivisionOperatorMethodType,
    ExtensionKind.ModuloOperatorMethodType,
    ExtensionKind.PowerOperatorMethodType,
    ExtensionKind.FloorDivisionOperatorMethodType,
    ExtensionKind.BitwiseAndOperatorMethodType,
    ExtensionKind.BitwiseOrOperatorMethodType,
    ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    ExtensionKind.BitwiseRightShiftOperatorMethodType,
    ExtensionKind.ConcatOperatorMethodType,
    ExtensionKind.LessThanOperatorMethodType,
    ExtensionKind.GreaterThanOperatorMethodType,
    ExtensionKind.NegationOperatorMethodType,
    ExtensionKind.BitwiseNotOperatorMethodType,
    ExtensionKind.LengthOperatorMethodType,
    ExtensionKind.TableDeleteMethodType,
    ExtensionKind.TableGetMethodType,
    ExtensionKind.TableHasMethodType,
    ExtensionKind.TableSetMethodType,
    ExtensionKind.TableAddKeyMethodType,
]);

export function getNaryCallExtensionArgs(
    context: TransformationContext,
    node: ts.CallExpression,
    kind: ExtensionKind,
    numArgs: number
): readonly ts.Expression[] | undefined {
    let expressions: readonly ts.Expression[];
    if (node.arguments.some(ts.isSpreadElement)) {
        context.diagnostics.push(invalidSpreadInCallExtension(node));
        return undefined;
    }
    if (methodExtensionKinds.has(kind)) {
        if (!(ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
            context.diagnostics.push(invalidMethodCallExtensionUse(node));
            return undefined;
        }
        if (node.arguments.length < numArgs - 1) {
            // assumed to be TS error
            return undefined;
        }
        expressions = [node.expression.expression, ...node.arguments];
    } else {
        if (node.arguments.length < numArgs) {
            // assumed to be TS error
            return undefined;
        }
        expressions = node.arguments;
    }
    return expressions;
}

export function getUnaryCallExtensionArg(
    context: TransformationContext,
    node: ts.CallExpression,
    kind: ExtensionKind
): ts.Expression | undefined {
    return getNaryCallExtensionArgs(context, node, kind, 1)?.[0];
}

export function getBinaryCallExtensionArgs(
    context: TransformationContext,
    node: ts.CallExpression,
    kind: ExtensionKind
): readonly [ts.Expression, ts.Expression] | undefined {
    const expressions = getNaryCallExtensionArgs(context, node, kind, 2);
    if (expressions === undefined) return undefined;
    return [expressions[0], expressions[1]];
}
