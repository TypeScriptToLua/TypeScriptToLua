import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    afterPrint(program: ts.Program, options: tstl.CompilerOptions, emitHost: tstl.EmitHost, result: tstl.ProcessedFile[]) {
        void(program);
        void(options);
        void(emitHost);

        for (const file of result) {
            file.code = "-- Commented added by afterPrint plugin\n" + file.code;
        }
    }
};

// eslint-disable-next-line import/no-default-export
export default plugin;
