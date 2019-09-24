import { InvalidAnnotationArgumentNumber } from "../../../src/transformation/utils/errors";
import * as util from "../../util";

test("CustomCreate", () => {
    const luaHeader = `
        function Point2DCreate(x, y)
            return {x = x, y = y}
        end
    `;

    const tsHeader = `
        /** @customConstructor Point2DCreate */
        class Point2D {
            public x: number;
            public y: number;
            constructor(x: number, y: number) {
                // No values assigned
            }
        }
    `;

    const result = util.transpileAndExecute(`return new Point2D(1, 2).x;`, undefined, luaHeader, tsHeader);

    expect(result).toBe(1);
});

test("IncorrectUsage", () => {
    expect(() => {
        util.transpileString(`
            /** @customConstructor */
            class Point2D {
                constructor(
                    public x: number,
                    public y: number
                ) {}
            }
            return new Point2D(1, 2).x;
        `);
    }).toThrowExactError(InvalidAnnotationArgumentNumber("@customConstructor", 0, 1, util.nodeStub));
});
