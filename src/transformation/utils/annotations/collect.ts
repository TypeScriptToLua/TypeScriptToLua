import * as ts from "typescript";
import { flatMap } from "../../../utils";
import { TransformationContext } from "../../context";

export type AnnotationName = string & { _annotationNameBrand: any };
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

function getAnnotationKindByName(name: AnnotationName): AnnotationKind;
function getAnnotationKindByName(name: string): AnnotationKind | undefined;
function getAnnotationKindByName(name: string): AnnotationKind | undefined {
    return Object.values(AnnotationKind).find(k => k.toLowerCase() === name.toLowerCase());
}

function isValidAnnotationName(name: string): name is AnnotationName {
    return getAnnotationKindByName(name) !== undefined;
}

export class Annotation {
    public kind: AnnotationKind;

    constructor(name: AnnotationName, public args: string[]) {
        this.kind = getAnnotationKindByName(name);
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
        if (isValidAnnotationName(name)) {
            const annotation = new Annotation(name, args);
            annotationsMap.set(annotation.kind, annotation);
            console.warn(`[Deprecated] Annotations with ! are being deprecated, use '@${annotation.kind}' instead`);
        } else {
            console.warn(`Encountered unknown annotation '${line}'.`);
        }
    }

    for (const tag of source.getJsDocTags()) {
        if (isValidAnnotationName(tag.name)) {
            const annotation = new Annotation(tag.name, tag.text ? tag.text.split(" ") : []);
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
        if (isValidAnnotationName(tagName)) {
            const annotation = new Annotation(tagName, tag.comment ? tag.comment.split(" ") : []);
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
                if (isValidAnnotationName(tagName)) {
                    const dec = new Annotation(tagName, tag.comment ? tag.comment.split(" ") : []);
                    annotationsMap.set(dec.kind, dec);
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
