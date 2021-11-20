import * as ts from "typescript";
import * as lua from "../../../LuaAST";

export interface InternalIdentifierData {
    isTransformedOptionalBase?: boolean;
    optionalBaseContextualCall?: lua.CallExpression;
}

const internalIdentifiers = new WeakMap<ts.Identifier, InternalIdentifierData>();

// an internal identifier will be transformed verbatim to lua
export function createInternalIdentifier(
    text: string,
    tsOriginal?: ts.Expression,
    data: InternalIdentifierData = {}
): ts.Identifier {
    const identifier = ts.factory.createIdentifier(text);
    ts.setOriginalNode(identifier, tsOriginal);
    internalIdentifiers.set(identifier, data);
    return identifier;
}
export function isInternalIdentifier(identifier: ts.Identifier): boolean {
    return internalIdentifiers.has(identifier);
}

export function getInternalIdentifierData(identifier: ts.Identifier): InternalIdentifierData | undefined {
    return internalIdentifiers.get(identifier);
}
