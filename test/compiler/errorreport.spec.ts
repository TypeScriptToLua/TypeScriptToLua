import { Any, Expect, Setup, SpyOn, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { compile, compileFilesWithOptions } from "../../src/Compiler";

export class CompilerErrorReportTests {
    private originalStdErr: any;
    private originalStdOut: any;
    private originalProcessExit: any;

    @TestCase("Encountered error parsing file: Default Imports are not supported, please use named imports instead!\n",
              "default_import.ts")
    @Test("Compile project")
    public compileProject(errorMsg: string, ...fileNames: string[]) {
        fileNames = fileNames.map((file) => path.resolve(__dirname, "testfiles", file));
        compileFilesWithOptions(fileNames, {outDir: ".", rootDir: "."});

        Expect(process.stderr.write).toHaveBeenCalledWith(errorMsg, Any);

        Expect(process.exit).toHaveBeenCalledWith(1);
    }

    @Setup
    private _spyProcess() {
      this.originalProcessExit = process.exit;
      this.originalStdOut = process.stdout.write;
      this.originalStdErr = process.stderr.write;

      SpyOn(process, "exit").andStub();
      SpyOn(process.stderr, "write").andStub();
      SpyOn(process.stdout, "write").andStub();
    }

    @Teardown
    private _resetProcess() {
      process.exit = this.originalProcessExit;
      process.stdout.write = this.originalStdOut;
      process.stderr.write = this.originalStdErr;
    }

}
