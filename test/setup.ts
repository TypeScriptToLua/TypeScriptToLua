import * as ts from "typescript";
import * as tstl from "../src";

declare global {
    namespace jest {
        interface Matchers<R, T> {
            toHaveDiagnostics(): R;
        }
    }
}

expect.extend({
    toHaveDiagnostics(diagnostics: ts.Diagnostic[]): jest.CustomMatcherResult {
        expect(diagnostics).toBeInstanceOf(Array);
        // @ts-ignore
        const matcherHint = this.utils.matcherHint("toHaveDiagnostics", undefined, "", this);

        const diagnosticMessages = ts.formatDiagnosticsWithColorAndContext(
            diagnostics.map(tstl.prepareDiagnosticForFormatting),
            { getCurrentDirectory: () => "", getCanonicalFileName: fileName => fileName, getNewLine: () => "\n" }
        );

        return {
            pass: diagnostics.length > 0,
            message: () => {
                return (
                    matcherHint +
                    "\n\n" +
                    (this.isNot ? diagnosticMessages : `Received: ${this.utils.printReceived(diagnostics)}\n`)
                );
            },
        };
    },
});
