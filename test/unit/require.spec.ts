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
        const builder = util.mod`
            import * as module from "${usedPath}";
            module;
        `;

        builder.options(options).setMainFileName(filePath);

        if (throwsError) {
            builder.expectToHaveDiagnostics();
        } else {
            const regex = /require\("(.*?)"\)/;
            const match = regex.exec(builder.getMainLuaCodeChunk());

            if (util.expectToBeDefined(match)) {
                expect(match[1]).toBe(expectedPath);
            }
        }
    }
);

test.each([{ comment: "", expectedPath: "src.fake" }, { comment: "/** @noResolution */", expectedPath: "fake" }])(
    "noResolution on ambient modules causes no path alterations (%p)",
    ({ comment, expectedPath }) => {
        const builder = util.mod`
            import * as fake from "fake";
            fake;
        `;

        builder.setMainFileName("src/main.ts").addExtraFile("module.d.ts", `${comment} declare module "fake" {}`);
        const regex = /require\("(.*?)"\)/;
        const match = regex.exec(builder.getMainLuaCodeChunk());

        if (util.expectToBeDefined(match)) {
            expect(match[1]).toBe(expectedPath);
        }
    }
);
