import * as ts from "typescript";
import * as path from "path";
import { TransformationContext } from "../context";
import { unknownHelperKind } from "./diagnostics";

export enum HelperKind {
    Multi = "multi",
}

function isSourceFileFromHelpers(sourceFile: ts.SourceFile): boolean {
    const helperDirectory = path.resolve(__dirname, "../../../helpers");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return helperDirectory === sourceFileDirectory;
}

export function getHelperFileKind(context: TransformationContext, sourceFile: ts.SourceFile): HelperKind | undefined {
    if (isSourceFileFromHelpers(sourceFile)) {
        const baseFileName = path.basename(sourceFile.fileName).replace(/(\.d)?\.ts$/g, "");
        switch (baseFileName) {
            case "multi":
                return HelperKind.Multi;
            default:
                context.diagnostics.push(unknownHelperKind(sourceFile, baseFileName));
        }
    }
}
