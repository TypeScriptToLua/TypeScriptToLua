import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";

export class OverloadTests {
    @Test("overload function1")
    public overloadFunction1(): void
    {
        const result = util.transpileAndExecute(
            `function abc(def: number): string;
            function abc(def: string): string;
            function abc(def: number | string): string {
                if (typeof def == "number") {
                    return "jkl" + (def * 3);
                } else {
                    return def;
                }
            }
            return abc(3);`);

        Expect(result).toBe("jkl9");
    }

    @Test("overload function2")
    public overloadFunction2(): void
    {
        const result = util.transpileAndExecute(
            `function abc(def: number): string;
            function abc(def: string): string;
            function abc(def: number | string): string {
                if (typeof def == "number") {
                    return "jkl" + (def * 3);
                } else {
                    return def;
                }
            }
            return abc("ghj");`);

        Expect(result).toBe("ghj");
    }

    @Test("overload method1")
    public overloadMethod1(): void
    {
        const result = util.transpileAndExecute(
            `class myclass {
                static abc(def: number): string;
                static abc(def: string): string;
                static abc(def: number | string): string {
                    if (typeof def == "number") {
                        return "jkl" + (def * 3);
                    } else {
                        return def;
                    }
                }
            }
            return myclass.abc(3);`);

        Expect(result).toBe("jkl9");
    }

    @Test("overload method2")
    public overloadMethod2(): void
    {
        const result = util.transpileAndExecute(
            `class myclass {
                static abc(def: number): string;
                static abc(def: string): string;
                static abc(def: number | string): string {
                    if (typeof def == "number") {
                        return "jkl" + (def * 3);
                    } else {
                        return def;
                    }
                }
            }
            return myclass.abc("ghj");`);

        Expect(result).toBe("ghj");
    }

    @Test("constructor1")
    public constructor1(): void
    {
        const result = util.transpileAndExecute(
            `class myclass {
                num: number;
                str: string;

                constructor(def: number);
                constructor(def: string);
                constructor(def: number | string) {
                    if (typeof def == "number") {
                        this.num = def;
                    } else {
                        this.str = def;
                    }
                }
            }
            const inst = new myclass(3);
            return inst.num`);

        Expect(result).toBe(3);
    }

    @Test("constructor2")
    public constructor2(): void
    {
        const result = util.transpileAndExecute(
            `class myclass {
                num: number;
                str: string;

                constructor(def: number);
                constructor(def: string);
                constructor(def: number | string) {
                    if (typeof def == "number") {
                        this.num = def;
                    } else {
                        this.str = def;
                    }
                }
            }
            const inst = new myclass("ghj");
            return inst.str`);

        Expect(result).toBe("ghj");
    }
}
