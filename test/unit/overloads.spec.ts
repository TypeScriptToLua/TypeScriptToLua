import * as util from "../util";

test("overload function1", () => {
    util.testFunction`
        function abc(def: number): string;
        function abc(def: string): string;
        function abc(def: number | string): string {
            if (typeof def == "number") {
                return "jkl" + (def * 3);
            } else {
                return def;
            }
        }
        return abc(3);
    `.expectToMatchJsResult();
});

test("overload function2", () => {
    util.testFunction`
        function abc(def: number): string;
        function abc(def: string): string;
        function abc(def: number | string): string {
            if (typeof def == "number") {
                return "jkl" + (def * 3);
            } else {
                return def;
            }
        }
        return abc("ghj");
    `.expectToMatchJsResult();
});

test("overload method1", () => {
    util.testFunction`
        class myclass {
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
        return myclass.abc(3);
    `.expectToMatchJsResult();
});

test("overload method2", () => {
    util.testFunction`
        class myclass {
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
        return myclass.abc("ghj");
    `.expectToMatchJsResult();
});

test("constructor1", () => {
    util.testFunction`
        class myclass {
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
        return inst.num;
    `.expectToMatchJsResult();
});

test("constructor2", () => {
    util.testFunction`
        class myclass {
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
        return inst.str
    `.expectToMatchJsResult();
});
