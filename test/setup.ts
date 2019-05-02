import * as ts from "typescript";
import * as util from "./util";

declare global {
    namespace jest {
        interface Matchers<R> {
            toThrowExactError(error: Error): void;
            toHaveDiagnostics(): void;
        }
    }
}

expect.extend({
    toThrowExactError(callback: () => void, error: Error): jest.CustomMatcherResult {
        if (this.isNot) {
            return { pass: true, message: () => "Inverted toThrowExactError is not implemented" };
        }

        let executionError: Error | undefined;
        try {
            callback();
        } catch (err) {
            executionError = err;
        }

        // TODO:
        if (util.expectToBeDefined(executionError)) {
            expect(executionError.message).toContain(error.message);
        }

        return { pass: true, message: () => "" };
    },
    toHaveDiagnostics(diagnostics: ts.Diagnostic[]): jest.CustomMatcherResult {
        expect(Array.isArray(diagnostics)).toBe(true);
        const options = { isNot: this.isNot };
        // @ts-ignore
        const matcherHint = this.utils.matcherHint("toHaveDiagnostics", undefined, "", options);

        const diagnosticMessages = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCurrentDirectory: () => "",
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => "\n",
        });

        return {
            pass: diagnostics.length > 0,
            message: () => {
                return (
                    matcherHint +
                    "\n\n" +
                    (this.isNot
                        ? diagnosticMessages
                        : `Received: ${this.utils.printReceived(diagnostics)}\n`)
                );
            },
        };
    },
});
