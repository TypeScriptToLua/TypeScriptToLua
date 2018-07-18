import { Expect, SetupFixture, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs";
import * as path from "path";
import { compile } from "../../src/Compiler";

export class CompilerOutFileTests {

    private outFileRelPath: string;
    private outFileAbsPath: string;

    @SetupFixture
    public setupFixture() {
        this.outFileRelPath = "./testfiles/out_file.script";
        this.outFileAbsPath = path.join(__dirname, this.outFileRelPath);
    }

    @Test("Outfile absoulte path")
    public outFileAbsTest() {
        // Compile project
        compile(["--outFile", this.outFileAbsPath, path.join(__dirname, "./testfiles/out_file.ts")]);

        Expect(fs.existsSync(this.outFileAbsPath)).toBe(true);
    }

    @Test("Outfile relative path")
    public outFileRelTest() {
        // Compile project
        compile([
            "--outDir",
            __dirname,
            "--outFile",
            this.outFileRelPath,
            path.join(__dirname, "./testfiles/out_file.ts"),
        ]);

        Expect(fs.existsSync(this.outFileAbsPath)).toBe(true);
    }

    @Teardown
    public teardown() {
        fs.unlink(this.outFileAbsPath, (err) => {
            if (err) {
                throw err;
            }
        });
    }
}
