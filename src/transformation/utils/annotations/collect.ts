import * as ts from "typescript";
import { flatMap } from "../../../utils";
import { TransformationContext } from "../../context";

export enum AnnotationKind {
    Extension = "Extension",
    MetaExtension = "MetaExtension",
    CustomConstructor = "CustomConstructor",
    CompileMembersOnly = "CompileMembersOnly",
    NoResolution = "NoResolution",
    PureAbstract = "PureAbstract",
    Phantom = "Phantom",
    TupleReturn = "TupleReturn",
    LuaIterator = "LuaIterator",
    LuaTable = "LuaTable",
    NoSelf = "NoSelf",
    NoSelfInFile = "NoSelfInFile",
    Vararg = "Vararg",
    ForRange = "ForRange",
}

export interface Annotation {
    kind: AnnotationKind;
    args: string[];
}

function createAnnotation(name: string, args: string[]): Annotation | undefined {
    const annotationKind = Object.values(AnnotationKind).find(k => k.toLowerCase() === name.toLowerCase());
    if (annotationKind !== undefined) {
        return { kind: annotationKind, args };
    }
}

export type AnnotationsMap = Map<AnnotationKind, Annotation>;

function collectAnnotations(
    context: TransformationContext,
    source: ts.Symbol | ts.Signature,
    annotationsMap: AnnotationsMap
): void {
    const comments = source.getDocumentationComment(context.checker);
    const oldStyleAnnotations = comments
        .filter(comment => comment.kind === "text")
        .map(comment => comment.text.split("\n"))
        .reduce((a, b) => a.concat(b), [])
        .map(line => line.trim())
        .filter(comment => comment[0] === "!");

    for (const line of oldStyleAnnotations) {
        const [name, ...args] = line.slice(1).split(" ");
        const annotation = createAnnotation(name, args);
        if (annotation) {
            annotationsMap.set(annotation.kind, annotation);
            console.warn(`[Deprecated] Annotations with ! are being deprecated, use '@${annotation.kind}' instead`);
        } else {
            console.warn(`Encountered unknown annotation '${line}'.`);
        }
    }

    for (const tag of source.getJsDocTags()) {
        const annotation = createAnnotation(tag.name, tag.text ? tag.text.split(" ") : []);
        if (annotation) {
            annotationsMap.set(annotation.kind, annotation);
        }
    }
}

export function getSymbolAnnotations(context: TransformationContext, symbol: ts.Symbol): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotations(context, symbol, annotationsMap);
    return annotationsMap;
}

export function getTypeAnnotations(context: TransformationContext, type: ts.Type): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();

    if (type.symbol) collectAnnotations(context, type.symbol, annotationsMap);
    if (type.aliasSymbol) collectAnnotations(context, type.aliasSymbol, annotationsMap);

    return annotationsMap;
}

export function getNodeAnnotations(node: ts.Node): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();

    for (const tag of ts.getJSDocTags(node)) {
        const tagName = tag.tagName.text;
        const annotation = createAnnotation(tagName, tag.comment ? tag.comment.split(" ") : []);
        if (annotation) {
            annotationsMap.set(annotation.kind, annotation);
        }
    }

    return annotationsMap;
}

export function getFileAnnotations(sourceFile: ts.SourceFile): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();

    if (sourceFile.statements.length > 0) {
        // Manually collect jsDoc because `getJSDocTags` includes tags only from closest comment
        const jsDoc = sourceFile.statements[0].jsDoc;
        if (jsDoc) {
            for (const tag of flatMap(jsDoc, x => x.tags || [])) {
                const tagName = tag.tagName.text;
                const annotation = createAnnotation(tagName, tag.comment ? tag.comment.split(" ") : []);
                if (annotation) {
                    annotationsMap.set(annotation.kind, annotation);
                }
            }
        }
    }

    return annotationsMap;
}

export function getSignatureAnnotations(context: TransformationContext, signature: ts.Signature): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotations(context, signature, annotationsMap);

    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration && declaration.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = context.checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            collectAnnotations(context, symbol, annotationsMap);
        }
    }

    return annotationsMap;
}
