import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    afterPrint(
        program: ts.Program,
        options: tstl.CompilerOptions,
        emitHost: tstl.EmitHost,
        result: tstl.ProcessedFile[]
    ) {
        void program;
        void options;
        void emitHost;

        for (const file of result) {
            file.code = "-- Comment added by afterPrint plugin\n" + file.code;
        }
    },
};

export default plugin;
