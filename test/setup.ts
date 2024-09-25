import * as assert from "assert";
import * as ts from "typescript";
import * as tstl from "../src";

declare global {
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Matchers<R, T> {
            toHaveDiagnostics(expected?: number[]): R;
        }
    }
}

expect.extend({
    toHaveDiagnostics(diagnostics: ts.Diagnostic[], expected?: number[]): jest.CustomMatcherResult {
        assert(Array.isArray(diagnostics));
        // @ts-ignore
        const matcherHint = this.utils.matcherHint("toHaveDiagnostics", undefined, "", this);

        const diagnosticMessages = ts.formatDiagnosticsWithColorAndContext(
            diagnostics.map(tstl.prepareDiagnosticForFormatting),
            { getCurrentDirectory: () => "", getCanonicalFileName: fileName => fileName, getNewLine: () => "\n" }
        );

        if (this.isNot && expected !== undefined) {
            throw new Error("expect(actual).not.toHaveDiagnostics(expected) is not supported");
        }

        return {
            pass: expected
                ? diagnostics.length === expected.length &&
                  diagnostics.every((diag, index) => diag.code === expected[index])
                : diagnostics.length > 0,

            message: () => {
                const message = this.isNot
                    ? diagnosticMessages
                    : expected
                    ? `Expected:\n${expected.join("\n")}\nReceived:\n${diagnostics
                          .map(diag => diag.code)
                          .join("\n")}\n\n${diagnosticMessages}\n`
                    : `Received: ${this.utils.printReceived([])}\n`;

                return matcherHint + "\n\n" + message;
            },
        };
    },
});
