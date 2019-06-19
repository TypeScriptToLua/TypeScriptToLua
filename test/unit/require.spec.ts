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
        const input = { [filePath]: `import * as module from "${usedPath}"; module;` };
        if (throwsError) {
            expect(() => util.transpileString(input, options)).toThrow();
        } else {
            const lua = util.transpileString(input, options);
            const match = requireRegex.exec(lua);

            if (util.expectToBeDefined(match)) {
                expect(match[1]).toBe(expectedPath);
            }
        }
    }
);

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
])("noResolution prevents any module path resolution behaviour", ({ declarationStatement, mainCode, expectedPath }) => {
    const lua = util.transpileString({
        "src/main.ts": mainCode,
        "module.d.ts": declarationStatement,
    });
    const match = requireRegex.exec(lua);

    if (util.expectToBeDefined(match)) {
        expect(match[1]).toBe(expectedPath);
    }
});

test("ImportEquals declaration require", () => {
    const input = `import foo = require("./foo/bar"); foo;`;

    const lua = util.transpileString(input, { module: ts.ModuleKind.CommonJS });
    const match = requireRegex.exec(lua);
    if (util.expectToBeDefined(match)) {
        expect(match[1]).toBe("foo.bar");
    }
});
