import * as ts from "typescript";
import * as util from "../util";

const requireRegex = /require\("(.*?)"\)/;
const expectToRequire = (expected: string): util.TapCallback => builder => {
    const match = requireRegex.exec(builder.getMainLuaCodeChunk());
    if (util.expectToBeDefined(match)) {
        expect(match[1]).toBe(expected);
    }
};

test.each([
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./" },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "src.folder.Module",
        options: { rootDir: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expected: "folder.Module",
        options: { rootDir: ".", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./", baseUrl: "." },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "src" },
        throwsError: false,
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "main.ts",
        usedPath: "../Module",
        expected: "",
        options: { rootDir: "./src" },
        throwsError: true,
    },
    {
        filePath: "src/dir/main.ts",
        usedPath: "../Module",
        expected: "Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
    {
        filePath: "src/dir/dir/main.ts",
        usedPath: "../../dir/Module",
        expected: "dir.Module",
        options: { rootDir: "./src" },
        throwsError: false,
    },
])("require paths root from --baseUrl or --rootDir (%p)", ({ filePath, usedPath, expected, options, throwsError }) => {
    const builder = util.testModule`
        import * as module from "${usedPath}";
        module;
    `;

    builder.options(options).setMainFileName(filePath);

    if (throwsError) {
        builder.expectToHaveDiagnostics();
    } else {
        builder.tap(expectToRequire(expected));
    }
});

test.each([{ comment: "", expected: "src.fake" }, { comment: "/** @noResolution */", expected: "fake" }])(
    "noResolution on ambient modules causes no path alterations (%p)",
    ({ comment, expected }) => {
        util.testModule`
            import * as fake from "fake";
            fake;
        `
            .setMainFileName("src/main.ts")
            .addExtraFile("module.d.ts", `${comment} declare module "fake" {}`)
            .tap(expectToRequire(expected));
    }
);

test("ImportEquals declaration require", () => {
    util.testModule`
        import foo = require("./foo/bar");
        foo;
    `
        .options({ module: ts.ModuleKind.CommonJS })
        .tap(expectToRequire("foo.bar"));
});
