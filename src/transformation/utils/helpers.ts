import * as ts from "typescript";
import * as path from "path";

export enum HelperKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
}

function isSourceFileFromHelpers(sourceFile: ts.SourceFile): boolean {
    const helperDirectory = path.resolve(__dirname, "../../../helpers");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return helperDirectory === sourceFileDirectory;
}

export function getHelperKind(declaration: ts.Declaration): HelperKind | undefined {
    const sourceFile = declaration.getSourceFile();
    if (isSourceFileFromHelpers(sourceFile)) {
        if (ts.isFunctionDeclaration(declaration) && declaration?.name?.text === "$multi") {
            return HelperKind.MultiFunction;
        }

        if (ts.isTypeAliasDeclaration(declaration) && declaration.name.text === "MultiReturn") {
            return HelperKind.MultiType;
        }

        throw new Error("Unknown helper kind");
    }
}
