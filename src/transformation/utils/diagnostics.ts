import * as ts from "typescript";

const createDiagnosticFactory = <TArgs extends any[]>(
    message: string | ((...args: TArgs) => string),
    category = ts.DiagnosticCategory.Error
) => (node: ts.Node, ...args: TArgs): ts.Diagnostic => ({
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getWidth(),
    category,
    code: 0,
    source: "typescript-to-lua",
    messageText: typeof message === "string" ? message : message(...args),
});

export const forbiddenForIn = createDiagnosticFactory(`Iterating over arrays with 'for ... in' is not allowed.`);

export const invalidForRangeCall = createDiagnosticFactory((message: string) => `Invalid @forRange call: ${message}.`);
