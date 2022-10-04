import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    afterEmit(program: ts.Program, options: tstl.CompilerOptions, emitHost: tstl.EmitHost, result: tstl.EmitFile[]) {
        void program;
        void options;
        void emitHost;

        for (const file of result) {
            console.log(`File was written to disk: ${file.outputPath}`);
        }
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
