import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/TranspileError";

export class DecoratorCustomConstructor {

    @Test("CustomCreate")
    public customCreate(): void {
        const result = util.transpileAndExecute(
            `/** @customConstructor Point2DCreate */
            class Point2D {
                x: number;
                y: number;
            }
            function Point2DCreate(x: number, y: number) {
                return {x: x, y: y};
            }
            return new Point2D(1, 2).x;
            `
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
                    x: number;
                    y: number;
                }
                return new Point2D(1, 2).x;
                `
            );
        }).toThrowError(TranspileError, "!CustomConstructor expects 1 argument(s) but got 0.");
    }
}
