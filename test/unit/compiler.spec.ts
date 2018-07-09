import { Expect, Test } from "alsatian";

import { createTranspiler } from "../../src/Compiler";

import * as ts from "typescript";

export class CompilerTests {

    @Test("Throw if no luaTarget specified")
    public validLuaTarget() {
        Expect(() => {
            createTranspiler(({} as ts.TypeChecker), ({} as ts.CompilerOptions), ({} as ts.SourceFile));
        }).toThrowError(Error, "No luaTarget Specified please ensure a target is set!");
    }

}
