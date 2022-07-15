import * as ts from "typescript";
import { CompilerOptions, LuaTarget } from "../..";
import { TransformationContext } from "../context";
import { invalidAmbientIdentifierName } from "./diagnostics";
import { isSymbolExported } from "./export";
import { isAmbientNode } from "./typescript";

export const shouldAllowUnicode = (options: CompilerOptions) => options.luaTarget === LuaTarget.LuaJIT;

export const isValidLuaIdentifier = (name: string, options: CompilerOptions) =>
    !luaKeywords.has(name) &&
    (shouldAllowUnicode(options)
        ? /^[a-zA-Z_\u007F-\uFFFD][a-zA-Z0-9_\u007F-\uFFFD]*$/
        : /^[a-zA-Z_][a-zA-Z0-9_]*$/
    ).test(name);

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
    "repeat",
    "require",
    "self",
    "string",
    "table",
    "tostring",
    "type",
    "unpack",
]);

export const isUnsafeName = (name: string, options: CompilerOptions) =>
    !isValidLuaIdentifier(name, options) || luaBuiltins.has(name);

function checkName(context: TransformationContext, name: string, node: ts.Node): boolean {
    const isInvalid = !isValidLuaIdentifier(name, context.options);

    if (isInvalid) {
        // Empty identifier is a TypeScript error
        if (name !== "") {
            context.diagnostics.push(invalidAmbientIdentifierName(node, name));
        }
    }

    return isInvalid;
}

export function hasUnsafeSymbolName(
    context: TransformationContext,
    symbol: ts.Symbol,
    tsOriginal: ts.Identifier
): boolean {
    const isAmbient = symbol.declarations?.some(d => isAmbientNode(d)) ?? false;

    // Catch ambient declarations of identifiers with bad names
    if (isAmbient && checkName(context, symbol.name, tsOriginal)) {
        return true;
    }

    // only unsafe when non-ambient and not exported
    return isUnsafeName(symbol.name, context.options) && !isAmbient && !isSymbolExported(context, symbol);
}

export function hasUnsafeIdentifierName(
    context: TransformationContext,
    identifier: ts.Identifier,
    symbol: ts.Symbol | undefined
): boolean {
    if (symbol) {
        return hasUnsafeSymbolName(context, symbol, identifier);
    }

    return checkName(context, identifier.text, identifier);
}

const fixInvalidLuaIdentifier = (name: string) =>
    name.replace(/[^a-zA-Z0-9_]/g, c => `_${c.charCodeAt(0).toString(16).toUpperCase()}`);

export const createSafeName = (name: string) => "____" + fixInvalidLuaIdentifier(name);
