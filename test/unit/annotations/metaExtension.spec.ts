import { extensionCannotConstruct, metaExtensionMissingExtends } from "../../../src/transformation/utils/diagnostics";
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
        'return debug.getregistry()["_LOADED"].test();',
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
    `.expectDiagnosticsToMatchSnapshot([metaExtensionMissingExtends.code]);
});

test("DontAllowInstantiation", () => {
    util.testModule`
        declare class _LOADED {}
        /** @metaExtension */
        class Ext extends _LOADED {}
        const e = new Ext();
    `.expectDiagnosticsToMatchSnapshot([extensionCannotConstruct.code]);
});
