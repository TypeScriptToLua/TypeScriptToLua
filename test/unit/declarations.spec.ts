import * as util from "../util";

test("Declaration function call", () => {
    const libLua = `function declaredFunction(x) return 3*x end`;

    const tsHeader = `declare function declaredFunction(this: void, x: number): number;`;

    const source = `return declaredFunction(2) + 4;`;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe(10);
});

test("Declaration function call tupleReturn", () => {
    const libLua = `function declaredFunction(x) return x, 2*x + 1 end`;

    const tsHeader = `
        /** @tupleReturn */
        declare function declaredFunction(this: void, x: number): [number, number];
    `;

    const source = `
        const tuple = declaredFunction(3);
        const [destructedLeft, destructedRight] = declaredFunction(2);
        return \`\${tuple[0] + destructedLeft},\${tuple[1] + destructedRight}\`;
    `;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe("5,12");
});

test("Declaration namespace function call", () => {
    const libLua = `
        myNameSpace = {}
        function myNameSpace.declaredFunction(x) return 3*x end
    `;

    const tsHeader = `declare namespace myNameSpace { function declaredFunction(this: void, x: number): number; }`;

    const source = `return myNameSpace.declaredFunction(2) + 4;`;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe(10);
});

test("Declaration interface function call", () => {
    const libLua = `
        myInterfaceInstance = {}
        myInterfaceInstance.x = 10
        function myInterfaceInstance:declaredFunction(x) return self.x + 3*x end
    `;

    const tsHeader = `
        declare interface MyInterface {
            declaredFunction(x: number): number;
        }
        declare var myInterfaceInstance: MyInterface;
    `;

    const source = `return myInterfaceInstance.declaredFunction(3);`;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe(19);
});

test("Declaration function callback", () => {
    const libLua = `function declaredFunction(callback) return callback(4) end`;
    const tsHeader = `declare function declaredFunction(this: void, callback: (this: void, x: number) => number): number;`;

    const source = `return declaredFunction(x => 2 * x);`;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe(8);
});

test("Declaration instance function callback", () => {
    const libLua = `
        myInstance = {}
        myInstance.x = 10
        function myInstance:declaredFunction(callback) return callback(self.x) end
    `;

    const tsHeader = `
        declare interface MyInterface {
            declaredFunction(callback: (this: void, x: number) => number): number;
        }
        declare var myInstance: MyInterface;
    `;

    const source = `return myInstance.declaredFunction(x => 2 * x);`;

    const result = util.transpileAndExecute(source, undefined, libLua, tsHeader);
    expect(result).toBe(20);
});

test("ImportEquals declaration", () => {
    const header = `
        namespace outerNamespace {
            export namespace innerNamespace {
                export function func() { return "foo" }
            }
        };

        import importedFunc = outerNamespace.innerNamespace.func;
    `;

    const execution = `return importedFunc();`;

    const result = util.transpileAndExecute(execution, undefined, undefined, header);
    expect(result).toEqual("foo");
});

test("ImportEquals declaration ambient", () => {
    const header = `
        declare namespace outerNamespace {
            namespace innerNamespace {
                function func(): string;
            }
        };

        import importedFunc = outerNamespace.innerNamespace.func;
    `;

    const luaHeader = `outerNamespace = {
        innerNamespace = {
            func = function() return "foo" end
        }
    }
    `;

    const execution = `return importedFunc();`;

    const result = util.transpileAndExecute(execution, undefined, luaHeader, header);
    expect(result).toEqual("foo");
});
