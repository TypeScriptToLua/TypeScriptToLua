import { InvalidNewExpressionOnExtension, MissingMetaExtension } from "../../../src/transformation/utils/errors";
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
    expect(() => {
        util.transpileString(`
            /** @metaExtension */
            class LoadedExt {
                public static test() {
                    return 5;
                }
            }
        `);
    }).toThrowExactError(MissingMetaExtension(util.nodeStub));
});

test("DontAllowInstantiation", () => {
    expect(() => {
        util.transpileString(`
            declare class _LOADED {}
            /** @metaExtension */
            class Ext extends _LOADED {
            }
            const e = new Ext();
        `);
    }).toThrowExactError(InvalidNewExpressionOnExtension(util.nodeStub));
});
