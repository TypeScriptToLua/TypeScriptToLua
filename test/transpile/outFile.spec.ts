import * as path from "path";
import { buildVirtualProject } from "./run";

const inputFilePath = path.join(__dirname, "outFile/index.ts");
test("should support absolute outFile", () => {
    const { diagnostics, emittedFiles } = buildVirtualProject([inputFilePath], {
        outFile: path.join(__dirname, "output.script"),
    });

    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toEqual(["output.script"]);
});

test("should support relative outFile", () => {
    jest.spyOn(process, "cwd").mockReturnValue(__dirname);
    const { diagnostics, emittedFiles } = buildVirtualProject([inputFilePath], {
        outFile: "output.script",
    });

    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toEqual(["output.script"]);
});

test("should support outFile with declaration", () => {
    const { diagnostics, emittedFiles } = buildVirtualProject([inputFilePath], {
        outFile: path.join(__dirname, "output.script"),
        declaration: true,
    });

    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toEqual(["output.d.ts", "output.script"]);
});

test("should resolve outFile relative to base directory", () => {
    jest.spyOn(process, "cwd").mockReturnValue(__dirname);
    const { diagnostics, emittedFiles } = buildVirtualProject([inputFilePath], {
        outFile: "output.script",
        outDir: "out",
        declaration: true,
    });

    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toEqual(["output.d.ts", "output.script"]);
});
