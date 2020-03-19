import * as ts from "typescript";

export function createDiagnosticReporter(pretty: boolean, system = ts.sys): ts.DiagnosticReporter {
    const reporter = ts.createDiagnosticReporter(system, pretty);
    return diagnostic => {
        if (diagnostic.source === "typescript-to-lua") {
            diagnostic = { ...diagnostic, code: `TL${diagnostic.code}` as any };
        }

        reporter(diagnostic);
    };
}
