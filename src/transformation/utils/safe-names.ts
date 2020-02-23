import * as ts from "typescript";
import { TransformationContext } from "../context";
import { InvalidAmbientIdentifierName } from "./errors";
import { isAmbientNode } from "./typescript";
import { isSymbolExported } from "./export";

export const luaKeywords: ReadonlySet<string> = new Set([
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "goto",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",
]);

export const luaBuiltins: ReadonlySet<string> = new Set([
    "_G",
    "assert",
    "coroutine",
    "debug",
    "error",
    "ipairs",
    "math",
    "pairs",
    "pcall",
    "print",
    "rawget",
    "rawset",
    "repeat",
    "require",
    "self",
    "string",
    "table",
    "tostring",
    "type",
    "unpack",
]);

export const isValidLuaIdentifier = (str: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);

export const isUnsafeName = (name: string) =>
    luaKeywords.has(name) || luaBuiltins.has(name) || !isValidLuaIdentifier(name);

export function hasUnsafeSymbolName(
    context: TransformationContext,
    symbol: ts.Symbol,
    tsOriginal: ts.Identifier
): boolean {
    const isLuaKeyword = luaKeywords.has(symbol.name);
    const isInvalidIdentifier = !isValidLuaIdentifier(symbol.name);
    const isAmbient = symbol.declarations && symbol.declarations.some(d => isAmbientNode(d));
    if ((isLuaKeyword || isInvalidIdentifier) && isAmbient) {
        // Catch ambient declarations of identifiers with bad names
        throw InvalidAmbientIdentifierName(tsOriginal);
    }

    if (isUnsafeName(symbol.name)) {
        // only unsafe when non-ambient and not exported
        return !isAmbient && !isSymbolExported(context, symbol);
    }

    return false;
}

export function hasUnsafeIdentifierName(context: TransformationContext, identifier: ts.Identifier): boolean {
    const symbol = context.checker.getSymbolAtLocation(identifier);

    if (symbol !== undefined) {
        return hasUnsafeSymbolName(context, symbol, identifier);
    } else if (luaKeywords.has(identifier.text) || !isValidLuaIdentifier(identifier.text)) {
        throw InvalidAmbientIdentifierName(identifier);
    }

    return false;
}

const fixInvalidLuaIdentifier = (name: string) =>
    name.replace(
        /[^a-zA-Z0-9_]/g,
        c =>
            `_${c
                .charCodeAt(0)
                .toString(16)
                .toUpperCase()}`
    );

export const createSafeName = (name: string) => "____" + fixInvalidLuaIdentifier(name);
