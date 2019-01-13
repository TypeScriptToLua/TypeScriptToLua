import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/TranspileError";

export class DecoratorCustomConstructor
{
    @Test("CustomCreate")
    public customCreate(): void {
        const luaHeader =
            `function Point2DCreate(x, y)
                return {x = x, y = y}
            end`;

        const tsHeader =
            `/** @customConstructor Point2DCreate */
            class Point2D {
                public x: number;
                public y: number;
                constructor(x: number, y: number) {
                    // No values assigned
                }
            }`;

        const result = util.transpileAndExecute(
            `return new Point2D(1, 2).x;`,
            undefined,
            luaHeader,
            tsHeader
        );

        // Assert
        Expect(result).toBe(1);
    }

    @Test("IncorrectUsage")
    public incorrectUsage(): void {
        Expect(() => {
            util.transpileString(
                `/** @customConstructor */
                class Point2D {
                    constructor(
                        public x: number,
                        public y: number
                    ) {}
                }
                return new Point2D(1, 2).x;
                `
            );
        }).toThrowError(TranspileError, "!CustomConstructor expects 1 argument(s) but got 0.");
    }
}
