import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { locateConfigFile, parseConfigFileWithSystem } from "../../src/cli/tsconfig";
import { normalizeSlashes } from "../../src/utils";

let temp: string;
beforeEach(async () => {
    temp = await fs.mkdtemp(path.join(os.tmpdir(), "tstl-test-"));
    process.chdir(temp);
});

const originalWorkingDirectory = process.cwd();
afterEach(async () => {
    process.chdir(originalWorkingDirectory);
    // TODO [node@12]: `rmdir` has `recursive` option
    await fs.remove(temp);
});

const locate = (project: string | undefined, fileNames: string[] = []) =>
    locateConfigFile({ errors: [], fileNames, options: { project } });

const normalize = (name: string) => normalizeSlashes(path.resolve(temp, name));

describe("specified", () => {
    for (const separator of process.platform === "win32" ? ["/", "\\"] : ["/"]) {
        for (const pointsTo of ["file", "directory"] as const) {
            const findAndExpect = (project: string, expected: string) => {
                project = project.replace(/[\\/]/g, separator);
                if (pointsTo === "directory") {
                    project = path.dirname(project);
                }

                expect(locate(project)).toBe(normalize(expected));
            };

            test(`relative to ${pointsTo} separated with '${separator}'`, async () => {
                await fs.outputFile("tsconfig.json", "");
                await fs.mkdir("src");
                process.chdir("src");
                findAndExpect("../tsconfig.json", "tsconfig.json");
            });

            test(`absolute to ${pointsTo} separated with '${separator}'`, async () => {
                await fs.outputFile("tsconfig.json", "");
                findAndExpect(path.resolve("tsconfig.json"), "tsconfig.json");
            });
        }
    }

    test.each(["", ".", "./"])("current directory (%p)", async () => {
        await fs.outputFile("tsconfig.json", "");
        expect(locate(".")).toBe(normalize("tsconfig.json"));
    });
});

describe("inferred", () => {
    test("in current directory", async () => {
        await fs.outputFile("tsconfig.json", "");
        expect(locate(undefined)).toBe(normalize("tsconfig.json"));
    });

    test("in parent directory", async () => {
        await fs.outputFile("tsconfig.json", "");
        await fs.mkdir("src");
        process.chdir("src");
        expect(locate(undefined)).toBe(normalize("tsconfig.json"));
    });

    test("not found", () => {
        expect(locate(undefined)).toBeUndefined();
    });

    test("does not attempt when has files", async () => {
        await fs.outputFile("tsconfig.json", "");
        expect(locate(undefined, [""])).toBeUndefined();
    });
});

describe("errors", () => {
    test("specified file does not exist", () => {
        expect([locate("tsconfig.json")]).toHaveDiagnostics();
    });

    test("specified directory does not exist", () => {
        expect([locate("project")]).toHaveDiagnostics();
    });

    test("cannot be mixed", async () => {
        await fs.outputFile("tsconfig.json", "");
        expect([locate("tsconfig.json", [""])]).toHaveDiagnostics();
    });
});

describe("tsconfig extends", () => {
    test("correctly merges extended tsconfig files", () => {
        const parsedConfig = parseConfigFileWithSystem(path.join(__dirname, "tsconfig", "tsconfig.json"));
        expect(parsedConfig.options).toMatchObject({ luaTarget: "5.3", noHeader: true });
    });

    test("can handle multiple extends", () => {
        const parsedConfig = parseConfigFileWithSystem(path.join(__dirname, "tsconfig", "tsconfig.multi-extends.json"));
        expect(parsedConfig.options).toMatchObject({ luaTarget: "5.4", sourceMapTraceback: true });
    });

    test("can handle cycles in configs", () => {
        const parsedConfig = parseConfigFileWithSystem(path.join(__dirname, "tsconfig", "tsconfig-cycle1.json"));
        expect(parsedConfig.options).toMatchObject({ luaTarget: "5.4" });
    });

    test("can handle tsconfig files with comments", () => {
        const parsedConfig = parseConfigFileWithSystem(path.join(__dirname, "tsconfig", "tsconfig.with-comments.json"));
        expect(parsedConfig.options).toMatchObject({ luaTarget: "5.3" });
    });
});
