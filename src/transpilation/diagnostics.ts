import * as ts from "typescript";
import { createSerialDiagnosticFactory } from "../utils";

const createDiagnosticFactory = <TArgs extends any[]>(
    getMessage: (...args: TArgs) => string,
    category: ts.DiagnosticCategory = ts.DiagnosticCategory.Error
) => createSerialDiagnosticFactory((...args: TArgs) => ({ messageText: getMessage(...args), category }));

export const couldNotResolveRequire = createDiagnosticFactory(
    (requirePath: string, containingFile: string) =>
        `Could not resolve lua source files for require path '${requirePath}' in file ${containingFile}.`
);

export const couldNotReadDependency = createDiagnosticFactory(
    (dependency: string) => `Could not read content of resolved dependency ${dependency}.`
);

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

export const cannotBundleLibrary = createDiagnosticFactory(
    () =>
        'Cannot bundle projects with "buildmode": "library". Projects including the library can still bundle (which will include external library files).'
);

export const unsupportedJsxEmit = createDiagnosticFactory(() => 'JSX is only supported with "react" jsx option.');

export const pathsWithoutBaseUrl = createDiagnosticFactory(
    () => "When configuring 'paths' in tsconfig.json, the option 'baseUrl' must also be provided."
);
