import * as util from "../../util";

test("MetaExtension", () => {
    const tsHeader = `
        declare class _LOADED {}
        declare namespace debug {
            function getregistry(): any;
        }
        /** @metaExtension */
        class LoadedExt extends _LOADED {
            public static test() {
                return 5;
            }
        }
    `;

    const result = util.transpileAndExecute(
        `return debug.getregistry()["_LOADED"].test();`,
        undefined,
        undefined,
        tsHeader
    );

    expect(result).toBe(5);
});

test("IncorrectUsage", () => {
    util.testModule`
        /** @metaExtension */
        class LoadedExt {
            public static test() {
                return 5;
            }
        }
    `.expectDiagnostics(m =>
        m.toMatchInlineSnapshot(
            `"main.ts(3,9): error TSTL: '@metaExtension' annotation requires the extension of the metatable class."`
        )
    );
});

test("DontAllowInstantiation", () => {
    util.testModule`
        declare class _LOADED {}
        /** @metaExtension */
        class Ext extends _LOADED {}
        const e = new Ext();
    `.expectDiagnostics(m =>
        m.toMatchInlineSnapshot(
            `"main.ts(5,19): error TSTL: Cannot construct classes with '@extension' or '@metaExtension' annotation."`
        )
    );
});
