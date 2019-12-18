import * as ts from "typescript";

const createDiagnostic = (messageText: string, category = ts.DiagnosticCategory.Error): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category,
    code: 0,
    source: "typescript-to-lua",
    messageText,
});

export const toLoadPluginItShouldBeTranspiled = (transform: string) =>
    createDiagnostic(`To load "${transform}" plugin it should be transpiled or "ts-node" should be installed`);

export const couldNotResolvePluginFrom = (transform: string, base: string) =>
    createDiagnostic(`Could not resolve "${transform}" plugin from "${base}".`);

export const pluginShouldHaveAExport = (transform: string, importName: string) =>
    createDiagnostic(`"${transform}" plugin should have a "${importName}" export`);

export const toLoadTransformerItShouldBeTranspiled = (transform: string) =>
    createDiagnostic(`To load "${transform}" transformer it should be transpiled or "ts-node" should be installed`);

export const couldNotResolveTransformerFrom = (transform: string, base: string) =>
    createDiagnostic(`Could not resolve "${transform}" transformer from "${base}".`);

export const transformerShouldHaveAExport = (transform: string, importName: string) =>
    createDiagnostic(`"${transform}" transformer should have a "${importName}" export`);

export const transformerShouldBeATsTransformerFactory = (transform: string) =>
    createDiagnostic(
        `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values`
    );

export const couldNotFindBundleEntryPoint = (entryPoint: string) =>
    createDiagnostic(`Could not find bundle entry point '${entryPoint}'. It should be a file in the project.`);
