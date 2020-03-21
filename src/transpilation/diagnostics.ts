import * as ts from "typescript";
import { createSerialDiagnosticFactory } from "../utils";

const createDiagnosticFactory = <TArgs extends any[]>(getMessage: (...args: TArgs) => string) =>
    createSerialDiagnosticFactory((...args: TArgs) => ({ messageText: getMessage(...args) }));

export const toLoadItShouldBeTranspiled = createDiagnosticFactory(
    (kind: string, transform: string) =>
        `To load "${transform}" ${kind} it should be transpiled or "ts-node" should be installed.`
);

export const couldNotResolveFrom = createDiagnosticFactory(
    (kind: string, transform: string, base: string) => `Could not resolve "${transform}" ${kind} from "${base}".`
);

export const shouldHaveAExport = createDiagnosticFactory(
    (kind: string, transform: string, importName: string) =>
        `"${transform}" ${kind} should have a "${importName}" export.`
);

export const transformerShouldBeATsTransformerFactory = createDiagnosticFactory(
    (transform: string) =>
        `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values.`
);

export const couldNotFindBundleEntryPoint = createDiagnosticFactory(
    (entryPoint: string) => `Could not find bundle entry point '${entryPoint}'. It should be a file in the project.`
);

export const luaBundleEntryIsRequired = createDiagnosticFactory(
    () => "'luaBundleEntry' is required when 'luaBundle' is enabled."
);

export const usingLuaBundleWithInlineMightGenerateDuplicateCode = createSerialDiagnosticFactory(() => ({
    category: ts.DiagnosticCategory.Warning,
    messageText:
        "Using 'luaBundle' with 'luaLibImport: \"inline\"' might generate duplicate code. " +
        "It is recommended to use 'luaLibImport: \"require\"'.",
}));
