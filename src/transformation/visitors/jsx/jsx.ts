import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext, Visitors } from "../../context";
import { transformJsxAttributes } from "../literal";
import { XHTMLEntities } from "./xhtml";
import { AnnotationKind, getFileAnnotations } from "../../utils/annotations";

function findAnnotationByType(node: ts.Node, fileAnnotation: AnnotationKind): string | undefined {
    const annotation = getFileAnnotations(node.getSourceFile()).get(fileAnnotation);
    return annotation?.args[0];
}

function getExpressionFromOption(option: string): lua.Expression {
    const [first, second] = option.split(".");
    return second === undefined
        ? lua.createIdentifier(first)
        : lua.createTableIndexExpression(lua.createIdentifier(first), lua.createStringLiteral(second));
}

function getJsxFactory(node: ts.Node, context: TransformationContext): lua.Expression {
    const option =
        findAnnotationByType(node, AnnotationKind.Jsx) ?? context.options.jsxFactory ?? "React.createElement";
    return getExpressionFromOption(option);
}

function getJsxFragmentName(node: ts.Node, context: TransformationContext): lua.Expression {
    const option =
        findAnnotationByType(node, AnnotationKind.JsxFrag) ?? context.options.jsxFragmentFactory ?? "React.Fragment";
    return getExpressionFromOption(option);
}

/*
The following 3 functions for jsx text processing modified from sucrase (https://github.com/alangpierce/sucrase), which
is published with the MIT licence:

The MIT License (MIT)

Copyright (c) 2012-2018 various contributors (see AUTHORS)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const HEX_NUMBER = /^[\da-fA-F]+$/;
const DECIMAL_NUMBER = /^\d+$/;

/**
 * Turn the given jsxText string into a JS string literal. Leading and trailing
 * whitespace on lines is removed, except immediately after the open-tag and
 * before the close-tag. Empty lines are completely removed, and spaces are
 * added between lines after that.
 *
 * We trim the start and end of each line and remove blank lines.
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
// changes from sucrase: no multi-line flattening of prop strings in typescript.
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

// end functions copied from sucrase

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
    const jsxFactory = getJsxFactory(tsOriginal, context);

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

const transformJsxElement: FunctionVisitor<ts.JsxElement> = (node, context) =>
    transformJsxOpeningLikeElement(node.openingElement, node.children, context);
const transformSelfClosingJsxElement: FunctionVisitor<ts.JsxSelfClosingElement> = (node, context) =>
    transformJsxOpeningLikeElement(node, undefined, context);
const transformJsxFragment: FunctionVisitor<ts.JsxFragment> = (node, context) => {
    const tagName = getJsxFragmentName(node, context);
    return createJsxFactoryCall(tagName, undefined, node.children, node, context);
};

export const jsxVisitors: Visitors = {
    [ts.SyntaxKind.JsxElement]: transformJsxElement,
    [ts.SyntaxKind.JsxSelfClosingElement]: transformSelfClosingJsxElement,
    [ts.SyntaxKind.JsxFragment]: transformJsxFragment,
};
