import * as ts from "typescript";

export enum ExtensionKind {
    MultiFunction = "MultiFunction",
    MultiType = "MultiType",
}

function isSourceFileFromLanguageExtensions(sourceFile: ts.SourceFile): boolean {
    return sourceFile.fileName.match("typescript-to-lua/(dist/)?language-extensions/") !== null;
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
