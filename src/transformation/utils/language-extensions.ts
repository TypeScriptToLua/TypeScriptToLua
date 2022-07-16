import * as ts from "typescript";
import { TransformationContext } from "../context";

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
    ((1 << 18) - 1) & // All flags from Any...Never
    ts.TypeFlags.Index &
    ts.TypeFlags.NonPrimitive;

function getPropertyValue(context: TransformationContext, type: ts.Type, propertyName: string): string | undefined {
    if (type.flags & excludedTypeFlags) return;
    const property = type.getProperty(propertyName);
    if (!property) return undefined;
    const propertyType = context.checker.getTypeOfSymbolAtLocation(property, context.sourceFile);
    if (propertyType.isStringLiteral()) return propertyType.value;
}

export function getExtensionKindForNode(context: TransformationContext, node: ts.Node): ExtensionKind | undefined {
    const type = context.checker.getTypeAtLocation(node);
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
