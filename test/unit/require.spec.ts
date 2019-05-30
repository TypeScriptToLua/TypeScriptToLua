import * as ts from "typescript";
import * as util from "../util";

const requireRegex = /require\("(.*?)"\)/;

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
        const builder = util.testModule`
            import * as module from "${usedPath}";
            module;
        `;

        builder.options(options).setMainFileName(filePath);

        if (throwsError) {
            builder.expectToHaveDiagnostics();
        } else {
            const match = requireRegex.exec(builder.getMainLuaCodeChunk());

            if (util.expectToBeDefined(match)) {
                expect(match[1]).toBe(expectedPath);
            }
        }
    }
);

test.each([{ comment: "", expectedPath: "src.fake" }, { comment: "/** @noResolution */", expectedPath: "fake" }])(
    "noResolution on ambient modules causes no path alterations (%p)",
    ({ comment, expectedPath }) => {
        const builder = util.testModule`
            import * as fake from "fake";
            fake;
        `;

        builder.setMainFileName("src/main.ts").addExtraFile("module.d.ts", `${comment} declare module "fake" {}`);
        const match = requireRegex.exec(builder.getMainLuaCodeChunk());

        if (util.expectToBeDefined(match)) {
            expect(match[1]).toBe(expectedPath);
        }
    }
);

test("ImportEquals declaration require", () => {
    const input = `import foo = require("./foo/bar"); foo;`;

    const lua = util.transpileString(input, { module: ts.ModuleKind.CommonJS });
    const match = requireRegex.exec(lua);
    if (util.expectToBeDefined(match)) {
        expect(match[1]).toBe("foo.bar");
    }
});
