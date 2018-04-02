import { Expect, SetupFixture, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs";
import * as path from "path";
import { execCommandLine } from "../../src/Compiler";

export class CompilerOutFileTests {

    private outFileRelPath: string;
    private outFileAbsPath: string;

    @SetupFixture
    public setupFixture() {
        this.outFileRelPath = "./testfiles/out_file.script";
        this.outFileAbsPath = path.join(__dirname, this.outFileRelPath);
    }

    @Test("Compile project")
    public outFileTest() {
        // Compile project
        execCommandLine(["--outFile", this.outFileAbsPath, path.join(__dirname, "./testfiles/out_file.ts")]);

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
