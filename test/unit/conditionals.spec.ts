import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/TranspileError";
import { LuaTarget } from "../../src/CompilerOptions";
import * as util from "../src/util";

export class LuaConditionalsTests {

    @TestCase(0, 0)
    @TestCase(1, 1)
    @Test("if")
    public if(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let input: number = ${inp};
            if (input === 0) {
                return 0;
            }
            return 1;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @Test("ifelse")
    public ifelse(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let input: number = ${inp};
            if (input === 0) {
                return 0;
            } else {
                return 1;
            }`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, 3)
    @Test("ifelseif")
    public ifelseif(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let input: number = ${inp};
            if (input === 0) {
                return 0;
            } else if (input === 1){
                return 1;
            } else if (input === 2){
                return 2;
            }
            return 3;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, 3)
    @Test("ifelseifelse")
    public ifelseifelse(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let input: number = ${inp};
            if (input === 0) {
                return 0;
            } else if (input === 1){
                return 1;
            } else if (input === 2){
                return 2;
            } else {
                return 3;
            }`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -1)
    @Test("switch")
    public switch(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0:
                    result = 0;
                    break;
                case 1:
                    result = 1;
                    break;
                case 2:
                    result = 2;
                    break;
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -2)
    @Test("switchdefault")
    public switchdefault(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0:
                    result = 0;
                    break;
                case 1:
                    result = 1;
                    break;
                case 2:
                    result = 2;
                    break;
                default:
                    result = -2;
                    break;
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 1)
    @TestCase(0, 1)
    @TestCase(2, 4)
    @TestCase(3, 4)
    @TestCase(4, 4)
    @TestCase(5, 15)
    @TestCase(7, -2)
    @Test("switchfallthrough")
    public switchfallthrough(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0:
                    result = 0;
                case 1:
                    result = 1;
                    break;
                case 2:
                    result = 2;
                case 3:
                case 4:
                    result = 4;
                    break;
                case 5:
                    result = 5;
                case 6:
                    result += 10;
                    break;
                case 7:
                    result = 7;
                default:
                    result = -2;
                    break;
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -2)
    @Test("nestedSwitch")
    public nestedSwitch(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0:
                    result = 0;
                    break;
                case 1:
                    switch(<number>${inp}) {
                        case 0:
                            result = 0;
                            break;
                        case 1:
                            result = 1;
                            break;
                        default:
                            result = -3;
                            break;
                    }
                    break;
                case 2:
                    result = 2;
                    break;
                default:
                    result = -2;
                    break;
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 2)
    @TestCase(2, 2)
    @Test("switchLocalScope")
    public switchLocalScope(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0: {
                    let x = 0;
                    result = 0;
                    break;
                }
                case 1: {
                    let x = 1;
                    result = x;
                }
                case 2: {
                    let x = 2;
                    result = x;
                    break;
                }
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -1)
    @Test("switchReturn")
    public switchReturn(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `const result: number = -1;

            switch (<number>${inp}) {
                case 0:
                    return 0;
                    break;
                case 1:
                    return 1;
                case 2:
                    return 2;
                    break;
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -1)
    @Test("switchWithBrackets")
    public switchWithBrackets(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0: {
                    result = 0;
                    break;
                }
                case 1: {
                    result = 1;
                    break;
                }
                case 2: {
                    result = 2;
                    break;
                }
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }


    @TestCase(0, 0)
    @TestCase(1, 1)
    @TestCase(2, 2)
    @TestCase(3, -1)
    @Test("switchWithBracketsBreakInConditional")
    public switchWithBracketsBreakInConditional(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0: {
                    result = 0;
                    break;
                }
                case 1: {
                    result = 1;

                    if (result == 1) break;
                }
                case 2: {
                    result = 2;
                    break;
                }
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase(0, 4)
    @TestCase(1, 0)
    @TestCase(2, 2)
    @TestCase(3, -1)
    @Test("switchWithBracketsBreakInInternalLoop")
    public switchWithBracketsBreakInInternalLoop(inp: number, expected: number): void {
        const result = util.transpileAndExecute(
            `let result: number = -1;

            switch (<number>${inp}) {
                case 0: {
                    result = 0;

                    for (let i = 0; i < 5; i++) {
                        result++;

                        if (i >= 2) {
                            break;
                        }
                    }
                }
                case 1: {
                    result++;
                    break;
                }
                case 2: {
                    result = 2;
                    break;
                }
            }
            return result;`
        );

        // Assert
        Expect(result).toBe(expected);
    }

    @Test("If dead code after return")
    public ifDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `if (true) { return 3; const b = 8; }`);

        Expect(result).toBe(3);
    }

    @Test("switch dead code after return")
    public whileDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `switch (<string>"abc") { case "def": return 4; let abc = 4; case "abc": return 5; let def = 6; }`);

        Expect(result).toBe(5);
    }

    @Test("switch not allowed in 5.1")
    public switchThrow51(): void {
        Expect( () => util.transpileString(`switch ("abc") {}`, {luaTarget: LuaTarget.Lua51}))
            .toThrowError(TranspileError, "Switch statements is/are not supported for target Lua 5.1.");
    }
}
