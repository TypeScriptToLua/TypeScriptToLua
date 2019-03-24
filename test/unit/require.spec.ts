import * as util from "../util";
import * as path from "path";
import { CompilerOptions } from "../../src/CompilerOptions";

test.each([
    {
        filePath: "file.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "file.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./" },
        throwsError: false,
    },
    {
        filePath: "src/file.ts",
        usedPath: "./folder/Module",
        expectedPath: "src.folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "file.ts",
        usedPath: "folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: ".", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "file.ts",
        usedPath: "folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "src/file.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "src" },
        throwsError: false,
    },
    {
        filePath: "src/file.ts",
        usedPath: "./folder/Module",
        expectedPath: "folder.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "file.ts",
        usedPath: "../Module",
        expectedPath: "",
        options: { rootDir: "./src" },
        throwsError: true,
    },
    {
        filePath: "src/dir/file.ts",
        usedPath: "../Module",
        expectedPath: "Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "src/dir/dir/file.ts",
        usedPath: "../../dir/Module",
        expectedPath: "dir.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
])(
    "require paths root from --baseUrl or --rootDir (%p)",
    ({ filePath, usedPath, expectedPath, options, throwsError }) => {
        if (throwsError) {
            expect(() =>
                util.transpileString(`import * from "${usedPath}";`, options, true, filePath),
            ).toThrow();
        } else {
            const lua = util.transpileString(
                `import * from "${usedPath}";`,
                options,
                true,
                filePath,
            );
            const regex = /require\("(.*?)"\)/;
            const match = regex.exec(lua);
            expect(match[1]).toBe(expectedPath);
        }
    },
);

test.each([
    { comment: "", expectedPath: "src.fake" },
    { comment: "/** @noResolution */", expectedPath: "fake" },
])(
    "noResolution on ambient modules causes no path alterations (%p)",
    ({ comment, expectedPath }) => {
        const lua = util.transpileString(
            {
                "src/file.ts": `import * as fake from "fake";`,
                "module.d.ts": `${comment} declare module "fake" {}`,
            },
            undefined,
            true,
            "src/file.ts",
        );
        const regex = /require\("(.*?)"\)/;
        expect(regex.exec(lua)[1]).toBe(expectedPath);
    },
);
