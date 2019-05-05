import * as util from "../util";
import { TSTLErrors } from "../../src/TSTLErrors";

test("Class decorator with no parameters", () => {
    const source = `
    function SetBool<T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            decoratorBool = true;
        }
    }

    @SetBool
    class TestClass {
        public decoratorBool = false;
    }

    const classInstance = new TestClass();
    return classInstance.decoratorBool;
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(true);
});

test("Class decorator with parameters", () => {
    const source = `
    function SetNum(numArg: number) {
        return <T extends new(...args: any[]) => {}>(constructor: T) => {
            return class extends constructor {
                decoratorNum = numArg;
            };
        };
    }

    @SetNum(420)
    class TestClass {
        public decoratorNum;
    }

    const classInstance = new TestClass();
    return classInstance.decoratorNum;
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(420);
});

test("Class decorator with variable parameters", () => {
    const source = `
    function SetNumbers(...numArgs: number[]) {
        return <T extends new(...args: any[]) => {}>(constructor: T) => {
            return class extends constructor {
                decoratorNums = new Set<number>(numArgs);
            };
        };
    }

    @SetNumbers(120, 30, 54)
    class TestClass {
        public decoratorNums;
    }

    const classInstance = new TestClass();
    let sum = 0;
    for (const value of classInstance.decoratorNums) {
        sum += value;
    }
    return sum;
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(204);
});

test("Multiple class decorators", () => {
    const source = `
    function SetTen<T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            decoratorTen = 10;
        }
    }

    function SetNum(numArg: number) {
        return <T extends new(...args: any[]) => {}>(constructor: T) => {
            return class extends constructor {
                decoratorNum = numArg;
            };
        };
    }

    @SetTen
    @SetNum(410)
    class TestClass {
        public decoratorTen;
        public decoratorNum;
    }

    const classInstance = new TestClass();
    return classInstance.decoratorNum + classInstance.decoratorTen;
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(420);
});

test("Class decorator with inheritance", () => {
    const source = `
    function SetTen<T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            decoratorTen = 10;
        }
    }

    function SetNum(numArg: number) {
        return <T extends new(...args: any[]) => {}>(constructor: T) => {
            return class extends constructor {
                decoratorNum = numArg;
            };
        };
    }

    class TestClass {
        public decoratorTen = 0;
        public decoratorNum = 0;
    }

    @SetTen
    @SetNum(410)
    class SubTestClass extends TestClass {}

    const classInstance = new SubTestClass();
    return classInstance.decoratorNum + classInstance.decoratorTen;
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(420);
});

test("Class decorators are applied in reverse order", () => {
    const source = `
    const order = [];

    function SetString(stringArg: string) {
        order.push("eval " + stringArg);
        return <T extends new (...args: any[]) => {}>(constructor: T) => {
            order.push("execute " + stringArg);
            return class extends constructor {
                decoratorString = stringArg;
            };
        };
    }

    @SetString("fox")
    @SetString("jumped")
    @SetString("over dog")
    class TestClass {
        public static decoratorString = "";
    }

    const inst = new TestClass();
    return order.join(" ");
    `;

    const result = util.transpileAndExecute(source);
    expect(result).toBe(
        "eval fox eval jumped eval over dog execute over dog execute jumped execute fox",
    );
});

test("Throws error if decorator function has void context", () => {
    const source = `
    function SetBool<T extends { new(...args: any[]): {} }>(this: void, constructor: T) {
        return class extends constructor {
            decoratorBool = true;
        }
    }

    @SetBool
    class TestClass {
        public decoratorBool = false;
    }

    const classInstance = new TestClass();
    return classInstance.decoratorBool;
    `;

    expect(() => util.transpileAndExecute(source)).toThrowExactError(
        TSTLErrors.InvalidDecoratorContext(util.nodeStub),
    );
});
