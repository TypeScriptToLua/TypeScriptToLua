import * as ts from "typescript";
import { TransformationContext } from "../context";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
    RangeFunction = "RangeFunction",
    IterableType = "IterableType",
    AdditionOperatorType = "AdditionOperatorType",
    AdditionOperatorMethodType = "AdditionOperatorMethodType",
    SubtractionOperatorType = "SubtractionOperatorType",
    SubtractionOperatorMethodType = "SubtractionOperatorMethodType",
    MultiplicationOperatorType = "MultiplicationOperatorType",
    MultiplicationOperatorMethodType = "MultiplicationOperatorMethodType",
    DivisionOperatorType = "DivisionOperatorType",
    DivisionOperatorMethodType = "DivisionOperatorMethodType",
    ModuloOperatorType = "ModuloOperatorType",
    ModuloOperatorMethodType = "ModuloOperatorMethodType",
    PowerOperatorType = "PowerOperatorType",
    PowerOperatorMethodType = "PowerOperatorMethodType",
    FloorDivisionOperatorType = "FloorDivisionOperatorType",
    FloorDivisionOperatorMethodType = "FloorDivisionOperatorMethodType",
    BitwiseAndOperatorType = "BitwiseAndOperatorType",
    BitwiseAndOperatorMethodType = "BitwiseAndOperatorMethodType",
    BitwiseOrOperatorType = "BitwiseOrOperatorType",
    BitwiseOrOperatorMethodType = "BitwiseOrOperatorMethodType",
    BitwiseExclusiveOrOperatorType = "BitwiseExclusiveOrOperatorType",
    BitwiseExclusiveOrOperatorMethodType = "BitwiseExclusiveOrOperatorMethodType",
    BitwiseLeftShiftOperatorType = "BitwiseLeftShiftOperatorType",
    BitwiseLeftShiftOperatorMethodType = "BitwiseLeftShiftOperatorMethodType",
    BitwiseRightShiftOperatorType = "BitwiseRightShiftOperatorType",
    BitwiseRightShiftOperatorMethodType = "BitwiseRightShiftOperatorMethodType",
    ConcatOperatorType = "ConcatOperatorType",
    ConcatOperatorMethodType = "ConcatOperatorMethodType",
    LessThanOperatorType = "LessThanOperatorType",
    LessThanOperatorMethodType = "LessThanOperatorMethodType",
    GreaterThanOperatorType = "GreaterThanOperatorType",
    GreaterThanOperatorMethodType = "GreaterThanOperatorMethodType",
    NegationOperatorType = "NegationOperatorType",
    NegationOperatorMethodType = "NegationOperatorMethodType",
    BitwiseNotOperatorType = "BitwiseNotOperatorType",
    BitwiseNotOperatorMethodType = "BitwiseNotOperatorMethodType",
    LengthOperatorType = "LengthOperatorType",
    LengthOperatorMethodType = "LengthOperatorMethodType",
}

const extensionKindToFunctionName: { [T in ExtensionKind]?: string } = {
    [ExtensionKind.MultiFunction]: "$multi",
    [ExtensionKind.RangeFunction]: "$range",
};

const typeBrandToExtensionKind: { [brand: string]: ExtensionKind } = {
    __luaMultiFunctionBrand: ExtensionKind.MultiFunction,
    __luaMultiReturnBrand: ExtensionKind.MultiType,
    __luaRangeFunctionBrand: ExtensionKind.RangeFunction,
    __luaIterableBrand: ExtensionKind.IterableType,
    __luaAdditionBrand: ExtensionKind.AdditionOperatorType,
    __luaAdditionMethodBrand: ExtensionKind.AdditionOperatorMethodType,
    __luaSubtractionBrand: ExtensionKind.SubtractionOperatorType,
    __luaSubtractionMethodBrand: ExtensionKind.SubtractionOperatorMethodType,
    __luaMultiplicationBrand: ExtensionKind.MultiplicationOperatorType,
    __luaMultiplicationMethodBrand: ExtensionKind.MultiplicationOperatorMethodType,
    __luaDivisionBrand: ExtensionKind.DivisionOperatorType,
    __luaDivisionMethodBrand: ExtensionKind.DivisionOperatorMethodType,
    __luaModuloBrand: ExtensionKind.ModuloOperatorType,
    __luaModuloMethodBrand: ExtensionKind.ModuloOperatorMethodType,
    __luaPowerBrand: ExtensionKind.PowerOperatorType,
    __luaPowerMethodBrand: ExtensionKind.PowerOperatorMethodType,
    __luaFloorDivisionBrand: ExtensionKind.FloorDivisionOperatorType,
    __luaFloorDivisionMethodBrand: ExtensionKind.FloorDivisionOperatorMethodType,
    __luaBitwiseAndBrand: ExtensionKind.BitwiseAndOperatorType,
    __luaBitwiseAndMethodBrand: ExtensionKind.BitwiseAndOperatorMethodType,
    __luaBitwiseOrBrand: ExtensionKind.BitwiseOrOperatorType,
    __luaBitwiseOrMethodBrand: ExtensionKind.BitwiseOrOperatorMethodType,
    __luaBitwiseExclusiveOrBrand: ExtensionKind.BitwiseExclusiveOrOperatorType,
    __luaBitwiseExclusiveOrMethodBrand: ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    __luaBitwiseLeftShiftBrand: ExtensionKind.BitwiseLeftShiftOperatorType,
    __luaBitwiseLeftShiftMethodBrand: ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    __luaBitwiseRightShiftBrand: ExtensionKind.BitwiseRightShiftOperatorType,
    __luaBitwiseRightShiftMethodBrand: ExtensionKind.BitwiseRightShiftOperatorMethodType,
    __luaConcatBrand: ExtensionKind.ConcatOperatorType,
    __luaConcatMethodBrand: ExtensionKind.ConcatOperatorMethodType,
    __luaLessThanBrand: ExtensionKind.LessThanOperatorType,
    __luaLessThanMethodBrand: ExtensionKind.LessThanOperatorMethodType,
    __luaGreaterThanBrand: ExtensionKind.GreaterThanOperatorType,
    __luaGreaterThanMethodBrand: ExtensionKind.GreaterThanOperatorMethodType,
    __luaNegationBrand: ExtensionKind.NegationOperatorType,
    __luaNegationMethodBrand: ExtensionKind.NegationOperatorMethodType,
    __luaBitwiseNotBrand: ExtensionKind.BitwiseNotOperatorType,
    __luaBitwiseNotMethodBrand: ExtensionKind.BitwiseNotOperatorMethodType,
    __luaLengthBrand: ExtensionKind.LengthOperatorType,
    __luaLengthMethodBrand: ExtensionKind.LengthOperatorMethodType,
};

export function getExtensionKinds(type: ts.Type): ExtensionKind[] {
    if (type.getProperty("__luaExtensionBrand")) {
        return type
            .getProperties()
            .map(property => typeBrandToExtensionKind[property.name])
            .filter(kind => kind !== undefined);
    } else {
        return [];
    }
}

export function isExtensionFunction(
    context: TransformationContext,
    node: ts.Node,
    extensionKind: ExtensionKind
): boolean {
    const symbol = context.checker.getSymbolAtLocation(node);
    return (
        symbol !== undefined &&
        symbol.getName() === extensionKindToFunctionName[extensionKind] &&
        getExtensionKinds(context.checker.getTypeAtLocation(node)).includes(extensionKind)
    );
}
