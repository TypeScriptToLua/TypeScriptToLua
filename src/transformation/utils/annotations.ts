import * as ts from "typescript";
import { TransformationContext } from "../context";

export enum AnnotationKind {
    Extension = "extension",
    MetaExtension = "metaExtension",
    CustomConstructor = "customConstructor",
    CompileMembersOnly = "compileMembersOnly",
    NoResolution = "noResolution",
    PureAbstract = "pureAbstract",
    Phantom = "phantom",
    TupleReturn = "tupleReturn",
    LuaIterator = "luaIterator",
    LuaTable = "luaTable",
    NoSelf = "noSelf",
    NoSelfInFile = "noSelfInFile",
    Vararg = "vararg",
    ForRange = "forRange",
    Jsx = "jsx",
    JsxFrag = "jsxFrag",
}

export interface Annotation {
    kind: AnnotationKind;
    args: string[];
}

function createAnnotation(name: string, args: string[]): Annotation | undefined {
    const kind = Object.values(AnnotationKind).find(k => k.toLowerCase() === name.toLowerCase());
    if (kind !== undefined) {
        return { kind, args };
    }
}

export type AnnotationsMap = Map<AnnotationKind, Annotation>;

function collectAnnotations(source: ts.Symbol | ts.Signature, annotationsMap: AnnotationsMap): void {
    for (const tag of source.getJsDocTags()) {
        const annotation = createAnnotation(tag.name, tag.text?.map(p => p.text) ?? []);
        if (annotation) {
            annotationsMap.set(annotation.kind, annotation);
        }
    }
}

export function getSymbolAnnotations(symbol: ts.Symbol): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotations(symbol, annotationsMap);
    return annotationsMap;
}

export function getTypeAnnotations(type: ts.Type): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();

    if (type.symbol) collectAnnotations(type.symbol, annotationsMap);
    if (type.aliasSymbol) collectAnnotations(type.aliasSymbol, annotationsMap);

    return annotationsMap;
}

export function getNodeAnnotations(node: ts.Node): AnnotationsMap {
    const annotationsMap: AnnotationsMap = new Map();

    for (const tag of ts.getJSDocTags(node)) {
        const tagName = tag.tagName.text;
        const annotation = createAnnotation(tagName, getTagArgsFromComment(tag));
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
            for (const tag of jsDoc.flatMap(x => x.tags ?? [])) {
                const tagName = tag.tagName.text;
                const annotation = createAnnotation(tagName, getTagArgsFromComment(tag));
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
    collectAnnotations(signature, annotationsMap);

    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration?.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = context.checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            collectAnnotations(symbol, annotationsMap);
        }
    }

    return annotationsMap;
}

export function isTupleReturnCall(context: TransformationContext, node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) {
        return false;
    }

    const signature = context.checker.getResolvedSignature(node);
    if (signature) {
        if (getSignatureAnnotations(context, signature).has(AnnotationKind.TupleReturn)) {
            return true;
        }

        // Only check function type for directive if it is declared as an interface or type alias
        const declaration = signature.getDeclaration();
        const isInterfaceOrAlias =
            declaration?.parent &&
            ((ts.isInterfaceDeclaration(declaration.parent) && ts.isCallSignatureDeclaration(declaration)) ||
                ts.isTypeAliasDeclaration(declaration.parent));
        if (!isInterfaceOrAlias) {
            return false;
        }
    }

    const type = context.checker.getTypeAtLocation(node.expression);
    return getTypeAnnotations(type).has(AnnotationKind.TupleReturn);
}

export function isLuaIteratorType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(type).has(AnnotationKind.LuaIterator);
}

export function isVarargType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(type).has(AnnotationKind.Vararg);
}

export function isForRangeType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(type).has(AnnotationKind.ForRange);
}

export function getTagArgsFromComment(tag: ts.JSDocTag): string[] {
    if (tag.comment) {
        if (typeof tag.comment === "string") {
            return tag.comment.split(" ");
        } else {
            return tag.comment.map(part => part.text);
        }
    }

    return [];
}
