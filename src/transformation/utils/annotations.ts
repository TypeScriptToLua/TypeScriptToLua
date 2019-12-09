import * as ts from "typescript";
import { TransformationContext } from "../context";
import { findFirstNodeAbove, inferAssignedType } from "./typescript";

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
    VarArg = "varArg",
    ForRange = "forRange",
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
            for (const tag of jsDoc.flatMap(x => x.tags ?? [])) {
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
            declaration &&
            declaration.parent &&
            ((ts.isInterfaceDeclaration(declaration.parent) && ts.isCallSignatureDeclaration(declaration)) ||
                ts.isTypeAliasDeclaration(declaration.parent));
        if (!isInterfaceOrAlias) {
            return false;
        }
    }

    const type = context.checker.getTypeAtLocation(node.expression);
    return getTypeAnnotations(context, type).has(AnnotationKind.TupleReturn);
}

export function isInTupleReturnFunction(context: TransformationContext, node: ts.Node): boolean {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (!declaration) {
        return false;
    }

    let functionType: ts.Type | undefined;
    if (ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
        functionType = inferAssignedType(context, declaration);
    } else if (ts.isMethodDeclaration(declaration) && ts.isObjectLiteralExpression(declaration.parent)) {
        // Manually lookup type for object literal properties declared with method syntax
        const interfaceType = inferAssignedType(context, declaration.parent);
        const propertySymbol = interfaceType.getProperty(declaration.name.getText());
        if (propertySymbol) {
            functionType = context.checker.getTypeOfSymbolAtLocation(propertySymbol, declaration);
        }
    }

    if (functionType === undefined) {
        functionType = context.checker.getTypeAtLocation(declaration);
    }

    // Check all overloads for directive
    const signatures = functionType.getCallSignatures();
    if (signatures && signatures.some(s => getSignatureAnnotations(context, s).has(AnnotationKind.TupleReturn))) {
        return true;
    }

    return getTypeAnnotations(context, functionType).has(AnnotationKind.TupleReturn);
}

export function isLuaIteratorType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.LuaIterator);
}

export function isVarArgType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.VarArg);
}

export function isForRangeType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.ForRange);
}
