import * as ts from "typescript";
import * as path from "path";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
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

const extensionKindForTypeName: { [name: string]: ExtensionKind } = {
    MultiReturn: ExtensionKind.MultiType,
    LuaAdd: ExtensionKind.AdditionOperatorType,
    LuaAddMethod: ExtensionKind.AdditionOperatorMethodType,
    LuaSub: ExtensionKind.SubtractionOperatorType,
    LuaSubMethod: ExtensionKind.SubtractionOperatorMethodType,
    LuaMul: ExtensionKind.MultiplicationOperatorType,
    LuaMulMethod: ExtensionKind.MultiplicationOperatorMethodType,
    LuaDiv: ExtensionKind.DivisionOperatorType,
    LuaDivMethod: ExtensionKind.DivisionOperatorMethodType,
    LuaMod: ExtensionKind.ModuloOperatorType,
    LuaModMethod: ExtensionKind.ModuloOperatorMethodType,
    LuaPow: ExtensionKind.PowerOperatorType,
    LuaPowMethod: ExtensionKind.PowerOperatorMethodType,
    LuaIdiv: ExtensionKind.FloorDivisionOperatorType,
    LuaIdivMethod: ExtensionKind.FloorDivisionOperatorMethodType,
    LuaBand: ExtensionKind.BitwiseAndOperatorType,
    LuaBandMethod: ExtensionKind.BitwiseAndOperatorMethodType,
    LuaBor: ExtensionKind.BitwiseOrOperatorType,
    LuaBorMethod: ExtensionKind.BitwiseOrOperatorMethodType,
    LuaBxor: ExtensionKind.BitwiseExclusiveOrOperatorType,
    LuaBxorMethod: ExtensionKind.BitwiseExclusiveOrOperatorMethodType,
    LuaShl: ExtensionKind.BitwiseLeftShiftOperatorType,
    LuaShlMethod: ExtensionKind.BitwiseLeftShiftOperatorMethodType,
    LuaShr: ExtensionKind.BitwiseRightShiftOperatorType,
    LuaShrMethod: ExtensionKind.BitwiseRightShiftOperatorMethodType,
    LuaConcat: ExtensionKind.ConcatOperatorType,
    LuaConcatMethod: ExtensionKind.ConcatOperatorMethodType,
    LuaLt: ExtensionKind.LessThanOperatorType,
    LuaLtMethod: ExtensionKind.LessThanOperatorMethodType,
    LuaGt: ExtensionKind.GreaterThanOperatorType,
    LuaGtMethod: ExtensionKind.GreaterThanOperatorMethodType,
    LuaUnm: ExtensionKind.NegationOperatorType,
    LuaUnmMethod: ExtensionKind.NegationOperatorMethodType,
    LuaBnot: ExtensionKind.BitwiseNotOperatorType,
    LuaBnotMethod: ExtensionKind.BitwiseNotOperatorMethodType,
    LuaLen: ExtensionKind.LengthOperatorType,
    LuaLenMethod: ExtensionKind.LengthOperatorMethodType,
};

function isSourceFileFromLanguageExtensions(sourceFile: ts.SourceFile): boolean {
    const extensionDirectory = path.resolve(__dirname, "../../../language-extensions");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return extensionDirectory === sourceFileDirectory;
}

export function getExtensionKind(declaration: ts.Declaration): ExtensionKind | undefined {
    const sourceFile = declaration.getSourceFile();
    if (isSourceFileFromLanguageExtensions(sourceFile)) {
        if (ts.isFunctionDeclaration(declaration) && declaration?.name?.text === "$multi") {
            return ExtensionKind.MultiFunction;
        }

        if (ts.isTypeAliasDeclaration(declaration)) {
            const extensionKind = extensionKindForTypeName[declaration.name.text];
            if (extensionKind) {
                return extensionKind;
            }
        }

        throw new Error("Unknown extension kind");
    }
}
