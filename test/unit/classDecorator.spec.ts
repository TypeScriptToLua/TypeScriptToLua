import * as ts from "typescript";
import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

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
