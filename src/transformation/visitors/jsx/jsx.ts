import * as ts from "typescript";
import { JsxEmit } from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext, Visitors } from "../../context";
import { transformJsxAttributes } from "../literal";
import { unsupportedJsxConfiguration } from "../../utils/diagnostics";
import { XHTMLEntities } from "./xhtml";
import { AnnotationKind, getFileAnnotations } from "../../utils/annotations";

function checkValidJsxConfig(node: ts.Node, context: TransformationContext) {
    if (context.options.jsx !== JsxEmit.React) {
        context.diagnostics.push(unsupportedJsxConfiguration(node));
    }
}

// used for jsxFactory and jsxFragmentFactory options
function getExpressionFromOption(
    node: ts.Node,
    fileAnnotation: AnnotationKind,
    option: string | undefined,
    defaultValue: string
): lua.Expression {
    const annotation = getFileAnnotations(node.getSourceFile()).get(fileAnnotation);
    const [first, second] = (annotation?.args[0] ?? option ?? defaultValue).split(".");
    return second === undefined
        ? lua.createIdentifier(first)
        : lua.createTableIndexExpression(lua.createIdentifier(first), lua.createStringLiteral(second));
}

/* Implementations of jsx text processing modified from sucrase (https://github.com/alangpierce/sucrase). */

const HEX_NUMBER = /^[\da-fA-F]+$/;
const DECIMAL_NUMBER = /^\d+$/;

/**
 * Turn the given jsxText string into a JS string literal. Leading and trailing
 * whitespace on lines is removed, except immediately after the open-tag and
 * before the close-tag. Empty lines are completely removed, and spaces are
 * added between lines after that.
 *
 * We use JSON.stringify to introduce escape characters as necessary, and trim
 * the start and end of each line and remove blank lines.
 */
function formatJSXTextLiteral(text: string): string {
    let result = "";
    let whitespace = "";

    let isInInitialLineWhitespace = false;
    let seenNonWhitespace = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === " " || c === "\t" || c === "\r") {
            if (!isInInitialLineWhitespace) {
                whitespace += c;
            }
        } else if (c === "\n") {
            whitespace = "";
            isInInitialLineWhitespace = true;
        } else {
            if (seenNonWhitespace && isInInitialLineWhitespace) {
                result += " ";
            }
            result += whitespace;
            whitespace = "";
            if (c === "&") {
                const { entity, newI } = processEntity(text, i + 1);
                i = newI - 1;
                result += entity;
            } else {
                result += c;
            }
            seenNonWhitespace = true;
            isInInitialLineWhitespace = false;
        }
    }
    if (!isInInitialLineWhitespace) {
        result += whitespace;
    }
    return result;
}

/**
 * Format a string in the value position of a JSX prop.
 *
 * Use the same implementation as convertAttribute from
 * babel-helper-builder-react-jsx.
 */
// no multi-line flattening of prop strings in typescript.
export function formatJSXStringValueLiteral(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === "&") {
            const { entity, newI } = processEntity(text, i + 1);
            result += entity;
            i = newI - 1;
        } else {
            result += c;
        }
    }
    return result;
}

/**
 * Modified from jsxReadString in Babylon.
 */
function processEntity(text: string, indexAfterAmpersand: number): { entity: string; newI: number } {
    let str = "";
    let count = 0;
    let entity;
    let i = indexAfterAmpersand;

    while (i < text.length && count++ < 10) {
        const ch = text[i];
        i++;
        if (ch === ";") {
            if (str.startsWith("#")) {
                if (str[1] === "x") {
                    str = str.substr(2);
                    if (HEX_NUMBER.test(str)) {
                        entity = String.fromCodePoint(Number.parseInt(str, 16));
                    }
                } else {
                    str = str.substr(1);
                    if (DECIMAL_NUMBER.test(str)) {
                        entity = String.fromCodePoint(Number.parseInt(str, 10));
                    }
                }
            } else {
                entity = XHTMLEntities[str];
            }
            break;
        }
        str += ch;
    }
    if (!entity) {
        return { entity: "&", newI: indexAfterAmpersand };
    }
    return { entity, newI: i };
}

function processJsxText(jsxText: ts.JsxText): ts.StringLiteral | undefined {
    const text = formatJSXTextLiteral(jsxText.text);
    if (text === "") return undefined;
    return ts.factory.createStringLiteral(text);
}

const charCodes = {
    a: 0x61,
    z: 0x7a,
};

// how typescript does it
function isIntrinsicJsxName(escapedName: ts.__String): boolean {
    const name = escapedName as string;
    const ch = name.charCodeAt(0);
    return (ch >= charCodes.a && ch <= charCodes.z) || name.includes("-") || name.includes(":");
}

function transformTagName(name: ts.JsxTagNameExpression, context: TransformationContext): lua.Expression {
    if (ts.isIdentifier(name) && isIntrinsicJsxName(name.escapedText)) {
        return lua.createStringLiteral(ts.idText(name), name);
    } else {
        return context.transformExpression(name);
    }
}

function transformJsxChildren(
    children: ts.NodeArray<ts.JsxChild> | undefined,
    context: TransformationContext
): lua.Expression[] | undefined {
    if (!children) return undefined;

    return children
        .map(child => {
            if (ts.isJsxText(child)) {
                return processJsxText(child);
            }
            if (ts.isJsxExpression(child)) {
                return child.expression;
            }
            return child;
        })
        .filter(child => child !== undefined)
        .map(child => context.transformExpression(child!));
}

function createJsxFactoryCall(
    tagName: lua.Expression,
    props: lua.Expression | undefined,
    tsChildren: ts.NodeArray<ts.JsxChild> | undefined,
    tsOriginal: ts.Node,
    context: TransformationContext
): lua.Expression {
    const transformedChildren = transformJsxChildren(tsChildren, context);

    const jsxFactory = getExpressionFromOption(
        tsOriginal,
        AnnotationKind.Jsx,
        context.options.jsxFactory,
        "React.createElement"
    );

    const args = [tagName];
    if (props) {
        args.push(props);
    }
    if (transformedChildren && transformedChildren.length > 0) {
        if (!props) {
            args.push(lua.createNilLiteral());
        }
        args.push(...transformedChildren);
    }
    return lua.createCallExpression(jsxFactory, args, tsOriginal);
}

function transformJsxOpeningLikeElement(
    node: ts.JsxOpeningLikeElement,
    children: ts.NodeArray<ts.JsxChild> | undefined,
    context: TransformationContext
): lua.Expression {
    const tagName = transformTagName(node.tagName, context);
    const props =
        node.attributes.properties.length !== 0 ? transformJsxAttributes(node.attributes, context) : undefined;

    return createJsxFactoryCall(tagName, props, children, node, context);
}

const transformJsxElement: FunctionVisitor<ts.JsxElement> = (node, context) => {
    checkValidJsxConfig(node, context);
    return transformJsxOpeningLikeElement(node.openingElement, node.children, context);
};
const transformSelfClosingJsxElement: FunctionVisitor<ts.JsxSelfClosingElement> = (node, context) => {
    checkValidJsxConfig(node, context);
    return transformJsxOpeningLikeElement(node, undefined, context);
};
const transformJsxFragment: FunctionVisitor<ts.JsxFragment> = (node, context) => {
    checkValidJsxConfig(node, context);
    const tagName = getExpressionFromOption(
        node,
        AnnotationKind.JsxFrag,
        context.options.jsxFragmentFactory,
        "React.Fragment"
    );
    return createJsxFactoryCall(tagName, undefined, node.children, node, context);
};

export const jsxVisitors: Visitors = {
    [ts.SyntaxKind.JsxElement]: transformJsxElement,
    [ts.SyntaxKind.JsxSelfClosingElement]: transformSelfClosingJsxElement,
    [ts.SyntaxKind.JsxFragment]: transformJsxFragment,
};
