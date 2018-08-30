import { Expect, Test } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/Errors";

export class DecoratorMetaExtension {

    @Test("MetaExtension")
    public metaExtension(): void {
        // Transpile
        const lua = util.transpileString(
            `
            declare class _LOADED;
            declare namespace debug {
                function getregistry(): any;
            }
            /** !MetaExtension */
            class LoadedExt extends _LOADED {
                public static test() {
                    return 5;
                }
            }
            return debug.getregistry()["_LOADED"].test();
            `
        );
        const result = util.executeLua(lua);
        // Assert
        Expect(result).toBe(5);
    }

    @Test("IncorrectUsage")
    public incorrectUsage(): void {
        Expect(() => {
            util.transpileString(
                `
                /** !MetaExtension */
                class LoadedExt {
                    public static test() {
                        return 5;
                    }
                }
                `
            );
        }).toThrowError(TranspileError,
                        "!MetaExtension requires the extension of the metatable class.");
    }

    @Test("DontAllowInstantiation")
    public dontAllowInstantiation(): void {
        Expect(() => {
            util.transpileString(
                `
                declare class _LOADED;
                /** !MetaExtension */
                class Ext extends _LOADED {
                }
                const e = new Ext();
                `
            );
        }).toThrowError(TranspileError,
                        "Cannot construct classes with decorator '!Extension' or '!MetaExtension'.");
    }
}
