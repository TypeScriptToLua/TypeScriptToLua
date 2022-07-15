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
}

const annotationValues = new Map(Object.values(AnnotationKind).map(k => [k.toLowerCase(), k]));

export interface Annotation {
    kind: AnnotationKind;
    args: string[];
}

export type AnnotationsMap = Map<AnnotationKind, Annotation>;

function collectAnnotations(source: ts.Symbol | ts.Signature, annotationsMap: AnnotationsMap): void {
    for (const tag of source.getJsDocTags()) {
        // const annotationValue = annotationValues.get(tag.name.toLowerCase())
        const tagName = annotationValues.get(tag.name.toLowerCase());
        if (tagName) {
            // const annotation = createAnnotation(tag.name, tag.text?.map(p => p.text) ?? []);
            const annotation: Annotation = {
                kind: tag.name as AnnotationKind,
                args: tag.text?.map(p => p.text) ?? [],
            };
            annotationsMap.set(tagName, annotation);
        }
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

// interface TypeWithAnnotationMap extends ts.Type {
//     tstlAnnotationMap?: AnnotationsMap;
// }

export function getTypeAnnotations(type: ts.Type): AnnotationsMap {
    // const withAnnotations = type as TypeWithAnnotationMap;
    // if (withAnnotations.tstlAnnotationMap !== undefined) return withAnnotations.tstlAnnotationMap;

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

    // return (withAnnotations.tstlAnnotationMap = annotationsMap);
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

interface SignatureWithAnnotationMap extends ts.Signature {
    tstlAnnotationMap?: AnnotationsMap;
}

export function getSignatureAnnotations(context: TransformationContext, signature: ts.Signature): AnnotationsMap {
    const withAnnotations = signature as SignatureWithAnnotationMap;
    if (withAnnotations.tstlAnnotationMap !== undefined) return withAnnotations.tstlAnnotationMap;

    const annotationsMap: AnnotationsMap = new Map();
    collectAnnotations(signature, annotationsMap);

    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration?.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = context.checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            getSymbolAnnotations(symbol).forEach((value, key) => {
                annotationsMap.set(key, value);
            });
        }
    }

    return (withAnnotations.tstlAnnotationMap = annotationsMap);
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
