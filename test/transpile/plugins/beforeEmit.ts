import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    beforeEmit(program: ts.Program, options: tstl.CompilerOptions, emitHost: tstl.EmitHost, result: tstl.EmitFile[]) {
        void program;
        void options;
        void emitHost;

        for (const file of result) {
            file.code = "-- Comment added by beforeEmit plugin\n" + file.code;
        }
    },
};

export default plugin;
