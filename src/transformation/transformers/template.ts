import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { ContextType, getDeclarationContextType } from "../utils/function-context";
import { wrapInToStringForConcat } from "../utils/lua-ast";
import { transformArguments, transformContextualCallExpression } from "./call";

// TODO: Source positions
function getRawLiteral(node: ts.LiteralLikeNode): string {
    let text = node.getText();
    const isLast =
        node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || node.kind === ts.SyntaxKind.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
    text = text.replace(/\r\n?/g, "\n");
    return text;
}

const transformTemplateExpression: FunctionVisitor<ts.TemplateExpression> = (node, context) => {
    const parts: tstl.Expression[] = [];

    const head = node.head.text;
    if (head.length > 0) {
        parts.push(tstl.createStringLiteral(head, node.head));
    }

    for (const span of node.templateSpans) {
        const expression = context.transformExpression(span.expression);
        parts.push(wrapInToStringForConcat(expression));

        const text = span.literal.text;
        if (text.length > 0) {
            parts.push(tstl.createStringLiteral(text, span.literal));
        }
    }

    return parts.reduce((prev, current) => tstl.createBinaryExpression(prev, current, tstl.SyntaxKind.ConcatOperator));
};

const transformTaggedTemplateExpression: FunctionVisitor<ts.TaggedTemplateExpression> = (expression, context) => {
    const strings: string[] = [];
    const rawStrings: string[] = [];
    const expressions: ts.Expression[] = [];

    if (ts.isTemplateExpression(expression.template)) {
        // Expressions are in the string.
        strings.push(expression.template.head.text);
        rawStrings.push(getRawLiteral(expression.template.head));
        strings.push(...expression.template.templateSpans.map(span => span.literal.text));
        rawStrings.push(...expression.template.templateSpans.map(span => getRawLiteral(span.literal)));
        expressions.push(...expression.template.templateSpans.map(span => span.expression));
    } else {
        // No expressions are in the string.
        strings.push(expression.template.text);
        rawStrings.push(getRawLiteral(expression.template));
    }

    // Construct table with strings and literal strings

    const rawStringsTable = tstl.createTableExpression(
        rawStrings.map(text => tstl.createTableFieldExpression(tstl.createStringLiteral(text)))
    );

    const stringTableLiteral = tstl.createTableExpression([
        ...strings.map(partialString => tstl.createTableFieldExpression(tstl.createStringLiteral(partialString))),
        tstl.createTableFieldExpression(rawStringsTable, tstl.createStringLiteral("raw")),
    ]);

    // Evaluate if there is a self parameter to be used.
    const signature = context.checker.getResolvedSignature(expression);
    const signatureDeclaration = signature && signature.getDeclaration();
    const useSelfParameter =
        signatureDeclaration && getDeclarationContextType(signatureDeclaration) !== ContextType.Void;

    // Argument evaluation.
    const callArguments = transformArguments(context, expressions, signature);
    callArguments.unshift(stringTableLiteral);

    if (useSelfParameter) {
        return transformContextualCallExpression(context, expression, callArguments);
    }

    const leftHandSideExpression = context.transformExpression(expression.tag);
    return tstl.createCallExpression(leftHandSideExpression, callArguments);
};

export const templatePlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.TemplateExpression]: transformTemplateExpression,
        [ts.SyntaxKind.TaggedTemplateExpression]: transformTaggedTemplateExpression,
    },
};
