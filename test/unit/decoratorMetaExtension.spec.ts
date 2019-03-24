import * as util from "../util";

import { TranspileError } from "../../src/TranspileError";
import { TSTLErrors } from "../../src/TSTLErrors";

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
        }`;

    const result = util.transpileAndExecute(
        `return debug.getregistry()["_LOADED"].test();`,
        undefined,
        undefined,
        tsHeader,
    );

    expect(result).toBe(5);
});

test("IncorrectUsage", () => {
    const expectedMessage = TSTLErrors.MissingMetaExtension(undefined).message;
    expect(() => {
        util.transpileString(
            `
            /** @metaExtension */
            class LoadedExt {
                public static test() {
                    return 5;
                }
            }
            `,
        );
    }).toThrowExactError(new TranspileError(expectedMessage));
});

test("DontAllowInstantiation", () => {
    expect(() => {
        util.transpileString(
            `
            declare class _LOADED {}
            /** @metaExtension */
            class Ext extends _LOADED {
            }
            const e = new Ext();
            `,
        );
    }).toThrowExactError(
        new TranspileError(
            "Cannot construct classes with decorator '@extension' or '@metaExtension'.",
        ),
    );
});
