import * as ts from "typescript";
import { TransformationContext } from "../context";
import { invalidAmbientIdentifierName } from "./diagnostics";
import { isSymbolExported } from "./export";
import { isAmbientNode } from "./typescript";

export const isValidLuaIdentifier = (name: string) => !luaKeywords.has(name) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
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
    "until",
    "while",
]);

const luaBuiltins: ReadonlySet<string> = new Set([
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

export const isUnsafeName = (name: string) => !isValidLuaIdentifier(name) || luaBuiltins.has(name);

export function hasUnsafeSymbolName(
    context: TransformationContext,
    symbol: ts.Symbol,
    tsOriginal: ts.Identifier
): boolean {
    const isAmbient = symbol.declarations && symbol.declarations.some(d => isAmbientNode(d));

    // Catch ambient declarations of identifiers with bad names
    if (!isValidLuaIdentifier(symbol.name) && isAmbient) {
        context.diagnostics.push(invalidAmbientIdentifierName(tsOriginal, symbol.name));
        return true;
    }

    // only unsafe when non-ambient and not exported
    return isUnsafeName(symbol.name) && !isAmbient && !isSymbolExported(context, symbol);
}

export function hasUnsafeIdentifierName(
    context: TransformationContext,
    identifier: ts.Identifier,
    checkSymbol = true
): boolean {
    if (checkSymbol) {
        const symbol = context.checker.getSymbolAtLocation(identifier);
        if (symbol) {
            return hasUnsafeSymbolName(context, symbol, identifier);
        }
    }

    if (!isValidLuaIdentifier(identifier.text)) {
        context.diagnostics.push(invalidAmbientIdentifierName(identifier, identifier.text));
        return true;
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
