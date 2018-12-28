import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class DeclarationTests {
    @Test("Declaration function call")
    public declarationFunctionCall(): void {
        // Arrange
        const libLua = `function declaredFunction(x) return 3*x end`;

        const source = `
            declare function declaredFunction(x: number): number;
            return declaredFunction(2) + 4;
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe(10);
    }

    @Test("Declaration function call tupleReturn")
    public declarationFunctionCallTupleReturn(): void {
        // Arrange
        const libLua = `function declaredFunction(x) return x, 2*x + 1 end`;

        const source = `
            /** @tupleReturn */
            declare function declaredFunction(x: number): [number, number];
            const tuple = declaredFunction(3);
            const [destructedLeft, destructedRight] = declaredFunction(2);
            return \`\${tuple[0] + destructedLeft},\${tuple[1] + destructedRight}\`;
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe("5,12");
    }

    @Test("Declaration namespace function call")
    public declarationNamespaceFunctionCall(): void {
        // Arrange
        const libLua = `
            myNameSpace = {}
            function myNameSpace.declaredFunction(x) return 3*x end
        `;

        const source = `
            declare namespace myNameSpace { function declaredFunction(x: number): number; }
            return myNameSpace.declaredFunction(2) + 4;
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe(10);
    }

    @Test("Declaration interface function call")
    public declarationInterfaceFunctionCall(): void {
        // Arrange
        const libLua = `
            myInterfaceInstance = {}
            myInterfaceInstance.x = 10
            function myInterfaceInstance:declaredFunction(x) return self.x + 3*x end
        `;

        const source = `
            declare interface MyInterface {
                declaredFunction(x: number): number;
            }
            declare var myInterfaceInstance: MyInterface;
            return myInterfaceInstance.declaredFunction(3);
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe(19);
    }

    @Test("Declaration function callback")
    public declarationFunctionCallback(): void {
        // Arrange
        const libLua = `function declaredFunction(callback) return callback(4) end`;

        const source = `
            declare function declaredFunction(callback: (x: number) => number): number;
            return declaredFunction(x => 2 * x);
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe(8);
    }

    @Test("Declaration instance function callback")
    public declarationInstanceFunctionCallback(): void {
        // Arrange
        const libLua = `
            myInstance = {}
            myInstance.x = 10
            function myInstance:declaredFunction(callback) return callback(self.x) end`;

        const source = `
            declare interface MyInterface {
                declaredFunction(callback: (x: number) => number): number;
            }
            declare var myInstance: MyInterface;
            return myInstance.declaredFunction(x => 2 * x);
        `;

        // Act
        const lua = util.transpileString(source);
        const result = util.executeLua(`${libLua}\n${lua}`);

        // Assert
        Expect(result).toBe(20);
    }
}
