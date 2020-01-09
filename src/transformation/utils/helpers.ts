import * as ts from "typescript";
import * as path from "path";
import { TransformationContext } from "../context";

export enum HelperKind {
    Tuple = "tuple",
}

function isSourceFileFromHelpers(sourceFile: ts.SourceFile): boolean {
    const helperDirectory = path.resolve(__dirname, "../../helpers");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return helperDirectory === sourceFileDirectory;
}

export function getHelperFileKind(sourceFile: ts.SourceFile): HelperKind | undefined {
    if (isSourceFileFromHelpers(sourceFile)) {
        const baseFileName = path.basename(sourceFile.fileName).replace(/(\.d)?\.ts$/g, "");
        switch (baseFileName) {
            case "tuple":
                return HelperKind.Tuple;
            default:
                throw new Error(`Unknown Helper Kind ${baseFileName}`);
        }
    }
}

export function isHelpersImport(
    context: TransformationContext,
    importNode: ts.ImportClause | ts.ImportSpecifier | ts.ImportDeclaration
): boolean {
    if (ts.isImportDeclaration(importNode)) {
        const symbol = context.checker.getSymbolAtLocation(importNode.moduleSpecifier);
        return symbol?.declarations.map(d => d.getSourceFile()).some(isSourceFileFromHelpers) ?? false;
    }

    if (importNode.name) {
        const symbol = context.checker.getSymbolAtLocation(importNode.name);
        if (symbol) {
            const originalSymbol = context.checker.getAliasedSymbol(symbol);
            return originalSymbol?.declarations?.map(d => d.getSourceFile()).some(isSourceFileFromHelpers) ?? false;
        }
    }

    return false;
}
