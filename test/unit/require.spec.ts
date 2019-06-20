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

test.each([
    {
        declarationStatement: `
            declare module 'fake' {}
        `,
        mainCode: "import * as fake from 'fake'; fake;",
        expectedPath: "src.fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module 'fake' {}
        `,
        mainCode: "import * as fake from 'fake'; fake;",
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            declare module 'fake' {
                export const x: number;
            }
        `,
        mainCode: "import { x } from 'fake'; x;",
        expectedPath: "src.fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module 'fake' {
                export const x: number;
            }
        `,
        mainCode: "import { x } from 'fake'; x;",
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module 'fake' {
                export const x: number;
            }
            declare module 'fake' {
                export const y: number;
            }
        `,
        mainCode: "import { y } from 'fake'; y;",
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            declare module 'fake' {
                export const x: number;
            }
            declare module 'fake' {
                export const y: number;
            }
        `,
        mainCode: "import { y } from 'fake'; y;",
        expectedPath: "src.fake",
    },
    {
        declarationStatement: `
            declare module 'fake' {}
        `,
        mainCode: "import 'fake';",
        expectedPath: "src.fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module 'fake' {}
        `,
        mainCode: "import 'fake';",
        expectedPath: "fake",
    },
])("noResolution prevents any module path resolution behaviour", ({ declarationStatement, mainCode, expectedPath }) => {
    util.testModule(mainCode)
        .setMainFileName("src/main.ts")
        .addExtraFile("module.d.ts", declarationStatement)
        .tap(expectToRequire(expectedPath));
});

test("ImportEquals declaration require", () => {
    util.testModule`
        import foo = require("./foo/bar");
        foo;
    `
        .options({ module: ts.ModuleKind.CommonJS })
        .tap(expectToRequire("foo.bar"));
});
