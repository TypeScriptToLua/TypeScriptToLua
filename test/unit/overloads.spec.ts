import * as util from "../util";

test("overload function1", () => {
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
        return abc(3);`
    );

    expect(result).toBe("jkl9");
});

test("overload function2", () => {
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
        return abc("ghj");`
    );

    expect(result).toBe("ghj");
});

test("overload method1", () => {
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
        return myclass.abc(3);`
    );

    expect(result).toBe("jkl9");
});

test("overload method2", () => {
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
        return myclass.abc("ghj");`
    );

    expect(result).toBe("ghj");
});

test("constructor1", () => {
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
        return inst.num`
    );

    expect(result).toBe(3);
});

test("constructor2", () => {
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
        return inst.str`
    );

    expect(result).toBe("ghj");
});
