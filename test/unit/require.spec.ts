import * as util from "../util";

test.each([
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./" },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expectedPath: "src.folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: ".", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "src" },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "../Module",
        expectedPath: "",
        options: { rootDir: "./src" },
        throwsError: true,
    },
    {
        filePath: "src/dir/main.ts",
        usedPath: "../Module",
        expectedPath: "Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "src/dir/dir/main.ts",
        usedPath: "../../dir/Module",
        expectedPath: "dir.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
])(
    "require paths root from --baseUrl or --rootDir (%p)",
    ({ filePath, usedPath, expectedPath, options, throwsError }) => {
        const input = { [filePath]: `import * as module from "${usedPath}"; module;` };
        if (throwsError) {
            expect(() => util.transpileString(input, options)).toThrow();
        } else {
            const lua = util.transpileString(input, options);
            const regex = /require\("(.*?)"\)/;
            const match = regex.exec(lua);

            if (util.expectToBeDefined(match)) {
                expect(match[1]).toBe(expectedPath);
            }
        }
    },
);

test.each([
    { comment: "", expectedPath: "src.fake" },
    { comment: "/** @noResolution */", expectedPath: "fake" },
])(
    "noResolution on ambient modules causes no path alterations (%p)",
    ({ comment, expectedPath }) => {
        const lua = util.transpileString({
            "src/main.ts": `import * as fake from "fake"; fake;`,
            "module.d.ts": `${comment} declare module "fake" {}`,
        });
        const regex = /require\("(.*?)"\)/;
        const match = regex.exec(lua);

        if (util.expectToBeDefined(match)) {
            expect(match[1]).toBe(expectedPath);
        }
    },
);
