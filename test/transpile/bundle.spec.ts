import * as util from "../util";
import { resolveFixture, transpileProjectResult } from "./run";

test("should transpile into one file", () => {
    const { diagnostics, emittedFiles } = transpileProjectResult(resolveFixture("bundle/tsconfig.json"));

    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toHaveLength(1);

    const { name, text } = emittedFiles[0];
    // Verify the name is as specified in tsconfig
    expect(name).toBe("bundle/bundle.lua");
    // Verify exported module by executing
    expect(util.executeLuaModule(text)).toEqual({ myNumber: 3 });
});
