import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util";
import { CompilerOptions, LuaLibImportKind } from '../../../src/CompilerOptions';

export class SymbolTests {
    private compilerOptions: CompilerOptions = {
        lib: ["esnext"],
        luaLibImport: LuaLibImportKind.Require,
    };

    @Test("symbol.toString()")
    @TestCase()
    @TestCase(1)
    @TestCase("name")
    public symbolToString(description?: string | number): void
    {
        const result = util.transpileAndExecute(`
            return Symbol(${JSON.stringify(description)}).toString();
        `, this.compilerOptions);

        Expect(result).toBe(`Symbol(${description || ''})`);
    }

    @Test("symbol.description")
    @TestCase()
    @TestCase(1)
    @TestCase("name")
    public symbolDescription(description?: string | number): void
    {
        const result = util.transpileAndExecute(`
            return Symbol(${JSON.stringify(description)}).description;
        `, this.compilerOptions);

        Expect(result).toBe(description);
    }

    @Test("symbol uniqueness")
    public symbolUniqueness(): void
    {
        const result = util.transpileAndExecute(`
            return Symbol("a") === Symbol("a");
        `);

        Expect(result).toBe(false);
    }

    @Test("Symbol.for")
    public symbolFor(): void
    {
        const result = util.transpileAndExecute(`
            return Symbol.for("name").description;
        `, this.compilerOptions);

        Expect(result).toBe("name");
    }

    @Test("Symbol.for non-uniqueness")
    public symbolForNonUniqueness(): void
    {
        const result = util.transpileAndExecute(`
            return Symbol.for("a") === Symbol.for("a");
        `);

        Expect(result).toBe(true);
    }

    @Test("Symbol.keyFor")
    public symbolKeyFor(): void
    {
        const result = util.transpileAndExecute(`
            const sym = Symbol.for("a");
            Symbol.for("b");
            return Symbol.keyFor(sym);
        `);

        Expect(result).toBe("a");
    }

    @Test("Symbol.keyFor empty")
    public symbolKeyForEmpty(): void
    {
        const result = util.transpileAndExecute(`
            Symbol.for("a");
            return Symbol.keyFor(Symbol());
        `);

        Expect(result).toBe(undefined);
    }
}
