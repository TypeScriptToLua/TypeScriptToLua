import {
    annotationDeprecated,
    extensionCannotConstruct,
    metaExtensionMissingExtends,
} from "../../../src/transformation/utils/diagnostics";
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

    // Can't use expectToMatchJsResult because above is not valid TS/JS
    util.testModule`
       export default debug.getregistry()["_LOADED"].test();
    `
        .setTsHeader(tsHeader)
        .ignoreDiagnostics([annotationDeprecated.code])
        .setReturnExport("default")
        .expectToEqual(5)
        .getLuaExecutionResult();
});

test("IncorrectUsage", () => {
    util.testModule`
        /** @metaExtension */
        class LoadedExt {
            public static test() {
                return 5;
            }
        }
    `.expectDiagnosticsToMatchSnapshot([metaExtensionMissingExtends.code, annotationDeprecated.code]);
});

test("DontAllowInstantiation", () => {
    util.testModule`
        declare class _LOADED {}
        /** @metaExtension */
        class Ext extends _LOADED {}
        const e = new Ext();
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code, extensionCannotConstruct.code]);
});
