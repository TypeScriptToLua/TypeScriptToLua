import * as ts from "typescript";
import { flatMap } from "../../../utils";
import { TransformationContext } from "../../context";

export enum DecoratorKind {
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

function getDecoratorKindByName(name: string): DecoratorKind | undefined {
    return Object.values(DecoratorKind).find(decoratorKind => decoratorKind.toLowerCase() === name.toLowerCase());
}

function isValidDecorator(name: string): boolean {
    return getDecoratorKindByName(name) !== undefined;
}

export class Decorator {
    public kind: DecoratorKind;

    constructor(name: string, public args: string[]) {
        const kind = getDecoratorKindByName(name);
        if (kind === undefined) {
            throw new Error(`Failed to parse decorator '${name}'`);
        }

        this.kind = kind;
    }
}

export type DecoratorMap = Map<DecoratorKind, Decorator>;

function collectCustomDecorators(
    context: TransformationContext,
    source: ts.Symbol | ts.Signature,
    decMap: DecoratorMap
): void {
    const comments = source.getDocumentationComment(context.checker);
    const decorators = comments
        .filter(comment => comment.kind === "text")
        .map(comment => comment.text.split("\n"))
        .reduce((a, b) => a.concat(b), [])
        .map(line => line.trim())
        .filter(comment => comment[0] === "!");

    for (const decStr of decorators) {
        const [decoratorName, ...decoratorArguments] = decStr.split(" ");
        if (isValidDecorator(decoratorName.substr(1))) {
            const dec = new Decorator(decoratorName.substr(1), decoratorArguments);
            decMap.set(dec.kind, dec);
            console.warn(`[Deprecated] Decorators with ! are being deprecated, ` + `use @${decStr.substr(1)} instead`);
        } else {
            console.warn(`Encountered unknown decorator ${decStr}.`);
        }
    }

    for (const tag of source.getJsDocTags()) {
        if (isValidDecorator(tag.name)) {
            const dec = new Decorator(tag.name, tag.text ? tag.text.split(" ") : []);
            decMap.set(dec.kind, dec);
        }
    }
}

export function getCustomSymbolDecorators(context: TransformationContext, symbol: ts.Symbol): DecoratorMap {
    const decMap = new Map<DecoratorKind, Decorator>();
    collectCustomDecorators(context, symbol, decMap);
    return decMap;
}

export function getCustomDecorators(context: TransformationContext, type: ts.Type): DecoratorMap {
    const decMap = new Map<DecoratorKind, Decorator>();
    if (type.symbol) collectCustomDecorators(context, type.symbol, decMap);
    if (type.aliasSymbol) collectCustomDecorators(context, type.aliasSymbol, decMap);

    return decMap;
}

export function getCustomNodeDecorators(node: ts.Node): DecoratorMap {
    const directivesMap: DecoratorMap = new Map();

    for (const tag of ts.getJSDocTags(node)) {
        const tagName = tag.tagName.text;
        if (isValidDecorator(tagName)) {
            const dec = new Decorator(tagName, tag.comment ? tag.comment.split(" ") : []);
            directivesMap.set(dec.kind, dec);
        }
    }

    return directivesMap;
}

export function getCustomFileDecorators(sourceFile: ts.SourceFile): Map<DecoratorKind, Decorator> {
    const directivesMap = new Map<DecoratorKind, Decorator>();

    if (sourceFile.statements.length > 0) {
        // Manually collect jsDoc because `getJSDocTags` includes tags only from closest comment
        const jsDoc = sourceFile.statements[0].jsDoc;
        if (jsDoc) {
            for (const tag of flatMap(jsDoc, x => x.tags || [])) {
                const tagName = tag.tagName.text;
                if (isValidDecorator(tagName)) {
                    const dec = new Decorator(tagName, tag.comment ? tag.comment.split(" ") : []);
                    directivesMap.set(dec.kind, dec);
                }
            }
        }
    }

    return directivesMap;
}

export function getCustomSignatureDecorators(context: TransformationContext, signature: ts.Signature): DecoratorMap {
    const directivesMap: DecoratorMap = new Map();
    collectCustomDecorators(context, signature, directivesMap);

    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration && declaration.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = context.checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            collectCustomDecorators(context, symbol, directivesMap);
        }
    }

    return directivesMap;
}
