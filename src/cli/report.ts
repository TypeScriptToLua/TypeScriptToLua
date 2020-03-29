import * as ts from "typescript";

export const prepareDiagnosticForFormatting = (diagnostic: ts.Diagnostic) =>
    diagnostic.source === "typescript-to-lua" ? { ...diagnostic, code: "TL" as any } : diagnostic;

export function createDiagnosticReporter(pretty: boolean, system = ts.sys): ts.DiagnosticReporter {
    const reporter = ts.createDiagnosticReporter(system, pretty);
    return diagnostic => reporter(prepareDiagnosticForFormatting(diagnostic));
}
