import * as ts from "typescript";
import { TransformationContext } from "../context";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
    RangeFunction = "RangeFunction",
    VarargConstant = "VarargConstant",
    IterableType = "IterableType",
    PairsIterableType = "PairsIterableType",
    PairsKeyIterableType = "PairsKeyIterableType",
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
    TableNewType = "TableNewType",
    TableDeleteType = "TableDeleteType",
    TableDeleteMethodType = "TableDeleteMethodType",
    TableGetType = "TableGetType",
    TableGetMethodType = "TableGetMethodType",
    TableHasType = "TableHasType",
    TableHasMethodType = "TableHasMethodType",
    TableSetType = "TableSetType",
    TableSetMethodType = "TableSetMethodType",
    TableAddType = "TableAddType",
    TableAddMethodType = "TableAddMethodType",
}

const extensionKindToValueName: { [T in ExtensionKind]?: string } = {
    [ExtensionKind.MultiFunction]: "$multi",
    [ExtensionKind.RangeFunction]: "$range",
    [ExtensionKind.VarargConstant]: "$vararg",
};

const extensionKindToTypeBrand: { [T in ExtensionKind]: string } = {
    [ExtensionKind.MultiFunction]: "__luaMultiFunctionBrand",
    [ExtensionKind.MultiType]: "__luaMultiReturnBrand",
    [ExtensionKind.RangeFunction]: "__luaRangeFunctionBrand",
    [ExtensionKind.VarargConstant]: "__luaVarargConstantBrand",
    [ExtensionKind.IterableType]: "__luaIterableBrand",
    [ExtensionKind.PairsIterableType]: "__luaPairsIterableBrand",
    [ExtensionKind.PairsKeyIterableType]: "__luaPairsKeyIterableBrand",
    [ExtensionKind.AdditionOperatorType]: "__luaAdditionBrand",
    [ExtensionKind.AdditionOperatorMethodType]: "__luaAdditionMethodBrand",
    [ExtensionKind.SubtractionOperatorType]: "__luaSubtractionBrand",
    [ExtensionKind.SubtractionOperatorMethodType]: "__luaSubtractionMethodBrand",
    [ExtensionKind.MultiplicationOperatorType]: "__luaMultiplicationBrand",
    [ExtensionKind.MultiplicationOperatorMethodType]: "__luaMultiplicationMethodBrand",
    [ExtensionKind.DivisionOperatorType]: "__luaDivisionBrand",
    [ExtensionKind.DivisionOperatorMethodType]: "__luaDivisionMethodBrand",
    [ExtensionKind.ModuloOperatorType]: "__luaModuloBrand",
    [ExtensionKind.ModuloOperatorMethodType]: "__luaModuloMethodBrand",
    [ExtensionKind.PowerOperatorType]: "__luaPowerBrand",
    [ExtensionKind.PowerOperatorMethodType]: "__luaPowerMethodBrand",
    [ExtensionKind.FloorDivisionOperatorType]: "__luaFloorDivisionBrand",
    [ExtensionKind.FloorDivisionOperatorMethodType]: "__luaFloorDivisionMethodBrand",
    [ExtensionKind.BitwiseAndOperatorType]: "__luaBitwiseAndBrand",
    [ExtensionKind.BitwiseAndOperatorMethodType]: "__luaBitwiseAndMethodBrand",
    [ExtensionKind.BitwiseOrOperatorType]: "__luaBitwiseOrBrand",
    [ExtensionKind.BitwiseOrOperatorMethodType]: "__luaBitwiseOrMethodBrand",
    [ExtensionKind.BitwiseExclusiveOrOperatorType]: "__luaBitwiseExclusiveOrBrand",
    [ExtensionKind.BitwiseExclusiveOrOperatorMethodType]: "__luaBitwiseExclusiveOrMethodBrand",
    [ExtensionKind.BitwiseLeftShiftOperatorType]: "__luaBitwiseLeftShiftBrand",
    [ExtensionKind.BitwiseLeftShiftOperatorMethodType]: "__luaBitwiseLeftShiftMethodBrand",
    [ExtensionKind.BitwiseRightShiftOperatorType]: "__luaBitwiseRightShiftBrand",
    [ExtensionKind.BitwiseRightShiftOperatorMethodType]: "__luaBitwiseRightShiftMethodBrand",
    [ExtensionKind.ConcatOperatorType]: "__luaConcatBrand",
    [ExtensionKind.ConcatOperatorMethodType]: "__luaConcatMethodBrand",
    [ExtensionKind.LessThanOperatorType]: "__luaLessThanBrand",
    [ExtensionKind.LessThanOperatorMethodType]: "__luaLessThanMethodBrand",
    [ExtensionKind.GreaterThanOperatorType]: "__luaGreaterThanBrand",
    [ExtensionKind.GreaterThanOperatorMethodType]: "__luaGreaterThanMethodBrand",
    [ExtensionKind.NegationOperatorType]: "__luaNegationBrand",
    [ExtensionKind.NegationOperatorMethodType]: "__luaNegationMethodBrand",
    [ExtensionKind.BitwiseNotOperatorType]: "__luaBitwiseNotBrand",
    [ExtensionKind.BitwiseNotOperatorMethodType]: "__luaBitwiseNotMethodBrand",
    [ExtensionKind.LengthOperatorType]: "__luaLengthBrand",
    [ExtensionKind.LengthOperatorMethodType]: "__luaLengthMethodBrand",
    [ExtensionKind.TableNewType]: "__luaTableNewBrand",
    [ExtensionKind.TableDeleteType]: "__luaTableDeleteBrand",
    [ExtensionKind.TableDeleteMethodType]: "__luaTableDeleteMethodBrand",
    [ExtensionKind.TableGetType]: "__luaTableGetBrand",
    [ExtensionKind.TableGetMethodType]: "__luaTableGetMethodBrand",
    [ExtensionKind.TableHasType]: "__luaTableHasBrand",
    [ExtensionKind.TableHasMethodType]: "__luaTableHasMethodBrand",
    [ExtensionKind.TableSetType]: "__luaTableSetBrand",
    [ExtensionKind.TableSetMethodType]: "__luaTableSetMethodBrand",
    [ExtensionKind.TableAddType]: "__luaTableAddKeyBrand",
    [ExtensionKind.TableAddMethodType]: "__luaTableAddKeyMethodBrand",
};

export function isExtensionType(type: ts.Type, extensionKind: ExtensionKind): boolean {
    const typeBrand = extensionKindToTypeBrand[extensionKind];
    return typeBrand !== undefined && type.getProperty(typeBrand) !== undefined;
}

export function getExtensionKinds(type: ts.Type): ExtensionKind[] {
    return (Object.keys(extensionKindToTypeBrand) as Array<keyof typeof extensionKindToTypeBrand>).filter(
        e => type.getProperty(extensionKindToTypeBrand[e]) !== undefined
    );
}

export function isExtensionValue(
    context: TransformationContext,
    symbol: ts.Symbol,
    extensionKind: ExtensionKind
): boolean {
    return (
        symbol.getName() === extensionKindToValueName[extensionKind] &&
        symbol.declarations?.some(d => isExtensionType(context.checker.getTypeAtLocation(d), extensionKind)) === true
    );
}
