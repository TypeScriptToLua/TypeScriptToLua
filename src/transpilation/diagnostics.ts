import * as ts from "typescript";

export const toLoadTransformerItShouldBeTranspiled = (transform: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `To load "${transform}" transformer it should be transpiled or "ts-node" should be installed`,
});

export const couldNotResolveTransformerFrom = (transform: string, base: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `Could not resolve "${transform}" transformer from "${base}".`,
});

export const transformerShouldHaveAExport = (transform: string, importName: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `"${transform}" transformer should have a "${importName}" export`,
});

export const transformerShouldBeATsTransformerFactory = (transform: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values`,
});

export const couldNotFindBundleEntryPoint = (entryPoint: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: `Could not find bundle entry point '${entryPoint}'. It should be a file in the project.`,
});
