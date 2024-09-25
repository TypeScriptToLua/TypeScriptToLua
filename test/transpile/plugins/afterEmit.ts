import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    afterEmit(program: ts.Program, options: tstl.CompilerOptions, emitHost: tstl.EmitHost, result: tstl.EmitFile[]) {
        void program;
        void options;
        void emitHost;
        void result;

        const diagnostic = {
            category: ts.DiagnosticCategory.Message,
            messageText: "After emit diagnostic message!",
            code: 1234,
            file: program.getSourceFiles()[0],
            start: undefined,
            length: undefined,
        } satisfies ts.Diagnostic;
        return [diagnostic];
    },
};

export default plugin;
