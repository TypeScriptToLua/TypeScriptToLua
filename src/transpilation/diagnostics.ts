import * as ts from "typescript";

const createDiagnosticFactory = <TArgs extends any[]>(getMessage: (...args: TArgs) => string) => (
    ...args: TArgs
): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: getMessage(...args),
});

export const toLoadTransformerItShouldBeTranspiled = createDiagnosticFactory(
    (transform: string) =>
        `To load "${transform}" transformer it should be transpiled or "ts-node" should be installed.`
);

export const couldNotResolveTransformerFrom = createDiagnosticFactory(
    (transform: string, base: string) => `Could not resolve "${transform}" transformer from "${base}".`
);

export const transformerShouldHaveAExport = createDiagnosticFactory(
    (transform: string, importName: string) => `"${transform}" transformer should have a "${importName}" export.`
);

export const transformerShouldBeATsTransformerFactory = createDiagnosticFactory(
    (transform: string) =>
        `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values.`
);

export const couldNotFindBundleEntryPoint = createDiagnosticFactory(
    (entryPoint: string) => `Could not find bundle entry point '${entryPoint}'. It should be a file in the project.`
);
