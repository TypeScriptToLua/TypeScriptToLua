import * as ts from "typescript";
import * as path from "path";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
}

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

        if (ts.isTypeAliasDeclaration(declaration) && declaration.name.text === "MultiReturn") {
            return ExtensionKind.MultiType;
        }

        throw new Error("Unknown extension kind");
    }
}
