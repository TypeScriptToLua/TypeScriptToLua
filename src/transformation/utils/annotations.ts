import * as ts from "typescript";

export enum AnnotationKind {
    CustomConstructor = "customConstructor",
    CompileMembersOnly = "compileMembersOnly",
    NoResolution = "noResolution",
    NoSelf = "noSelf",
    NoSelfInFile = "noSelfInFile",
}

const annotationValues = new Map(Object.values(AnnotationKind).map(k => [k.toLowerCase(), k]));

export interface Annotation {
    kind: AnnotationKind;
    args: string[];
}

export type AnnotationsMap = Map<AnnotationKind, Annotation>;

function collectAnnotations(source: ts.Symbol | ts.Signature, annotationsMap: AnnotationsMap): void {
    for (const tag of source.getJsDocTags()) {
        const tagName = annotationValues.get(tag.name.toLowerCase());
        if (!tagName) continue;
        const annotation: Annotation = {
            kind: tag.name as AnnotationKind,
            args: tag.text?.map(p => p.text) ?? [],
        };
        annotationsMap.set(tagName, annotation);
    }
}

interface SymbolWithAnnotationMap extends ts.Symbol {
    tstlAnnotationMap?: AnnotationsMap;
}

export function getSymbolAnnotations(symbol: ts.Symbol): AnnotationsMap {
    const withAnnotations = symbol as SymbolWithAnnotationMap;
    if (withAnnotations.tstlAnnotationMap !== undefined) return withAnnotations.tstlAnnotationMap;

    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotations(symbol, annotationsMap);
    return (withAnnotations.tstlAnnotationMap = annotationsMap);
}

export function getTypeAnnotations(type: ts.Type): AnnotationsMap {
    // types are not frequently repeatedly polled for annotations, so it's not worth caching them
    const annotationsMap: AnnotationsMap = new Map();
    if (type.symbol) {
        getSymbolAnnotations(type.symbol).forEach((value, key) => {
            annotationsMap.set(key, value);
        });
    }
    if (type.aliasSymbol) {
        getSymbolAnnotations(type.aliasSymbol).forEach((value, key) => {
            annotationsMap.set(key, value);
        });
    }
    return annotationsMap;
}

interface NodeWithAnnotationMap extends ts.Node {
    tstlAnnotationMap?: AnnotationsMap;
}

export function getNodeAnnotations(node: ts.Node): AnnotationsMap {
    const withAnnotations = node as NodeWithAnnotationMap;
    if (withAnnotations.tstlAnnotationMap !== undefined) return withAnnotations.tstlAnnotationMap;

    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotationsFromTags(annotationsMap, ts.getAllJSDocTags(node, ts.isJSDocUnknownTag));
    return (withAnnotations.tstlAnnotationMap = annotationsMap);
}

function collectAnnotationsFromTags(annotationsMap: AnnotationsMap, tags: readonly ts.JSDocTag[]) {
    for (const tag of tags) {
        const tagName = annotationValues.get(tag.tagName.text.toLowerCase());
        if (!tagName) continue;
        annotationsMap.set(tagName, { kind: tagName, args: getTagArgsFromComment(tag) });
    }
}

export function getFileAnnotations(sourceFile: ts.SourceFile): AnnotationsMap {
    const withAnnotations = sourceFile as NodeWithAnnotationMap;
    if (withAnnotations.tstlAnnotationMap !== undefined) return withAnnotations.tstlAnnotationMap;

    const annotationsMap: AnnotationsMap = new Map();

    if (sourceFile.statements.length > 0) {
        // Manually collect jsDoc because `getJSDocTags` includes tags only from closest comment
        const jsDoc = sourceFile.statements[0].jsDoc;
        if (jsDoc) {
            for (const jsDocElement of jsDoc) {
                if (jsDocElement.tags) {
                    collectAnnotationsFromTags(annotationsMap, jsDocElement.tags);
                }
            }
        }
    }
    return (withAnnotations.tstlAnnotationMap = annotationsMap);
}

function getTagArgsFromComment(tag: ts.JSDocTag): string[] {
    if (tag.comment) {
        if (typeof tag.comment === "string") {
            return tag.comment.split(" ");
        } else {
            return tag.comment.map(part => part.text);
        }
    }

    return [];
}
