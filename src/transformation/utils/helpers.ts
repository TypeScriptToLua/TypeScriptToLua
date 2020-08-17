import * as ts from "typescript";
import * as path from "path";

export enum HelperKind {
    MultiFunction = "MultiFunction",
    MultiReturnFunction = "MultiReturnFunction",
}

function isSourceFileFromHelpers(sourceFile: ts.SourceFile): boolean {
    const helperDirectory = path.resolve(__dirname, "../../../helpers");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return helperDirectory === sourceFileDirectory;
}

export function getHelperFileKind(declaration: ts.Declaration): HelperKind | undefined {
    const sourceFile = declaration.getSourceFile();
    if (isSourceFileFromHelpers(sourceFile)) {
        const baseFileName = path.basename(sourceFile.fileName).replace(/(\.d)?\.ts$/g, "");
        switch (baseFileName) {
            case "multi":
                return HelperKind.MultiReturnFunction;
            default:
                throw new Error("Unknown helper");
        }
    }
}
