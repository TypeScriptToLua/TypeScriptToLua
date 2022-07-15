import * as ts from "typescript";
import { TransformationContext } from "../context";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    RangeFunction = "RangeFunction",
    VarargConstant = "VarargConstant",
    IterableType = "Iterable",
    PairsIterableType = "PairsIterable",
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
}
const extensionNames: Set<string> = new Set(Object.values(ExtensionKind));

const extensionKindToValueName: { [T in ExtensionKind]?: string } = {
    [ExtensionKind.MultiFunction]: "$multi",
    [ExtensionKind.RangeFunction]: "$range",
    [ExtensionKind.VarargConstant]: "$vararg",
};

const extensionProperty = "__tstlExtension";
export function getExtensionKind(context: TransformationContext, type: ts.Type): ExtensionKind | undefined {
    const property = type.getProperty(extensionProperty);
    if (!property) return undefined;
    const propertyType = context.checker.getTypeOfSymbolAtLocation(property, context.sourceFile);
    if (!propertyType.isStringLiteral()) return undefined;
    const value = propertyType.value;
    if (extensionNames.has(value)) {
        return value as ExtensionKind;
    }
}

/** @deprecated */
export function isExtensionType(context: TransformationContext, type: ts.Type, extensionKind: ExtensionKind): boolean {
    return getExtensionKind(context, type) === extensionKind;
}

/** @deprecated */
export function isExtensionValue(
    context: TransformationContext,
    symbol: ts.Symbol,
    extensionKind: ExtensionKind
): boolean {
    return (
        symbol.getName() === extensionKindToValueName[extensionKind] &&
        symbol.declarations?.some(d =>
            isExtensionType(context, context.checker.getTypeAtLocation(d), extensionKind)
        ) === true
    );
}
