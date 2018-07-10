import { Expect, Test, TestCase } from "alsatian";
import * as ts from "typescript";

import * as util from "../src/util";

export class LuaModuleTests {

    @Test("defaultImport")
    public defaultImport() {
        Expect(() => {
            const lua = util.transpileString(`import TestClass from "test"`);
        }).toThrowError(Error, "Default Imports are not supported, please use named imports instead!");
    }

    @Test("lualibRequire")
    public lualibRequire() {
        // Transpile
        const lua = util.transpileString(``, {dontRequireLuaLib: false, luaTarget: "JIT"});

        // Assert
        Expect(lua).toBe(`require("typescript_lualib")`);
    }

    @Test("Import named bindings exception")
    public namedBindigsException() {
        const transpiler = util.makeTestTranspiler();

        const mockDeclaration: any = {
            importClause: {namedBindings: {}},
            kind: ts.SyntaxKind.ImportDeclaration,
            moduleSpecifier: ts.createLiteral("test"),
        };

        Expect(() => transpiler.transpileImport(mockDeclaration as ts.ImportDeclaration))
            .toThrowError(Error, "Unsupported import type.");
    }

    @Test("Non-exported module")
    public nonExportedModule() {
        const lua = util.transpileString("module g { export function test() { return 3; } } return g.test();");

        const result = util.executeLua(lua);

        Expect(result).toBe(3);
    }
}
