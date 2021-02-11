import * as ts from "typescript";
import * as path from "path";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
    RangeFunction = "RangeFunction",
    IterableType = "IterableType",
    MultiIterableType = "MultiIterableType",
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

const functionNameToExtensionKind: { [name: string]: ExtensionKind } = {
    $multi: ExtensionKind.MultiFunction,
    $range: ExtensionKind.RangeFunction,
};

const typeNameToExtensionKind: { [name: string]: ExtensionKind } = {
    LuaMultiReturn: ExtensionKind.MultiType,
    LuaIterable: ExtensionKind.IterableType,
    LuaMultiIterable: ExtensionKind.MultiIterableType,
    LuaAddition: ExtensionKind.AdditionOperatorType,
    LuaAdditionMethod: ExtensionKind.AdditionOperatorMethodType,
    LuaSubtraction: ExtensionKind.SubtractionOperatorType,
    LuaSubtractionMethod: ExtensionKind.SubtractionOperatorMethodType,
    LuaMultiplication: ExtensionKind.MultiplicationOperatorType,
    LuaMultiplicationMethod: ExtensionKind.MultiplicationOperatorMethodType,
    LuaDivision: ExtensionKind.DivisionOperatorType,
    LuaDivisionMethod: ExtensionKind.DivisionOperatorMethodType,
    LuaModulo: ExtensionKind.ModuloOperatorType,
    LuaModuloMethod: ExtensionKind.ModuloOperatorMethodType,
    LuaPower: ExtensionKind.PowerOperatorType,
    LuaPowerMethod: ExtensionKind.PowerOperatorMethodType,
    LuaFloorDivision: ExtensionKind.FloorDivisionOperatorType,
    LuaFloorDivisionMethod: ExtensionKind.FloorDivisionOperatorMethodType,
    LuaBitwiseAnd: ExtensionKind.BitwiseAndOperatorType,
    LuaBitwiseAndMethod: ExtensionKind.BitwiseAndOperatorMethodType,
    LuaBitwiseOr: ExtensionKind.BitwiseOrOperatorType,
    LuaBitwiseOrMethod: ExtensionKind.BitwiseOrOperatorMethodType,
    LuaBitwiseExclusiveOr: ExtensionKind.BitwiseExclusiveOrOperatorType,
    LuaBitwiseExclusiveOrMethod: ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    LuaBitwiseLeftShift: ExtensionKind.BitwiseLeftShiftOperatorType,
    LuaBitwiseLeftShiftMethod: ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    LuaBitwiseRightShift: ExtensionKind.BitwiseRightShiftOperatorType,
    LuaBitwiseRightShiftMethod: ExtensionKind.BitwiseRightShiftOperatorMethodType,
    LuaConcat: ExtensionKind.ConcatOperatorType,
    LuaConcatMethod: ExtensionKind.ConcatOperatorMethodType,
    LuaLessThan: ExtensionKind.LessThanOperatorType,
    LuaLessThanMethod: ExtensionKind.LessThanOperatorMethodType,
    LuaGreaterThan: ExtensionKind.GreaterThanOperatorType,
    LuaGreaterThanMethod: ExtensionKind.GreaterThanOperatorMethodType,
    LuaNegation: ExtensionKind.NegationOperatorType,
    LuaNegationMethod: ExtensionKind.NegationOperatorMethodType,
    LuaBitwiseNot: ExtensionKind.BitwiseNotOperatorType,
    LuaBitwiseNotMethod: ExtensionKind.BitwiseNotOperatorMethodType,
    LuaLength: ExtensionKind.LengthOperatorType,
    LuaLengthMethod: ExtensionKind.LengthOperatorMethodType,
};

function isSourceFileFromLanguageExtensions(sourceFile: ts.SourceFile): boolean {
    const extensionDirectory = path.resolve(__dirname, "../../../language-extensions");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return extensionDirectory === sourceFileDirectory;
}

export function getExtensionKind(declaration: ts.Declaration): ExtensionKind | undefined {
    const sourceFile = declaration.getSourceFile();
    if (isSourceFileFromLanguageExtensions(sourceFile)) {
        if (ts.isFunctionDeclaration(declaration) && declaration.name?.text) {
            const extensionKind = functionNameToExtensionKind[declaration.name.text];
            if (extensionKind) {
                return extensionKind;
            }
        }

        if (ts.isTypeAliasDeclaration(declaration)) {
            const extensionKind = typeNameToExtensionKind[declaration.name.text];
            if (extensionKind) {
                return extensionKind;
            }
        }

        throw new Error("Unknown extension kind");
    }
}
