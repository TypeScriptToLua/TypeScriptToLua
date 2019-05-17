import * as util from "../util";

test("Array access", () => {
    const result = util.transpileAndExecute(
        `const arr: Array<number> = [3,5,1];
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("ReadonlyArray access", () => {
    const result = util.transpileAndExecute(
        `const arr: ReadonlyArray<number> = [3,5,1];
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Array literal access", () => {
    const result = util.transpileAndExecute(
        `const arr: number[] = [3,5,1];
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Readonly array literal access", () => {
    const result = util.transpileAndExecute(
        `const arr: readonly number[] = [3,5,1];
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Array union access", () => {
    const result = util.transpileAndExecute(
        `function makeArray(): number[] | string[] { return [3,5,1]; }
        const arr = makeArray();
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Array union access with empty tuple", () => {
    const result = util.transpileAndExecute(
        `function makeArray(): number[] | [] { return [3,5,1]; }
        const arr = makeArray();
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Array union length", () => {
    const result = util.transpileAndExecute(
        `function makeArray(): number[] | string[] { return [3,5,1]; }
        const arr = makeArray();
        return arr.length;`,
    );
    expect(result).toBe(3);
});

test("Array intersection access", () => {
    const result = util.transpileAndExecute(
        `type I = number[] & {foo: string};
        function makeArray(): I {
            let t = [3,5,1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const arr = makeArray();
        return arr[1];`,
    );
    expect(result).toBe(5);
});

test("Array intersection length", () => {
    const result = util.transpileAndExecute(
        `type I = number[] & {foo: string};
        function makeArray(): I {
            let t = [3,5,1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const arr = makeArray();
        return arr.length;`,
    );
    expect(result).toBe(3);
});

test.each([
    { member: "firstElement()", expected: 3 },
    { member: "name", expected: "array" },
    { member: "length", expected: 1 },
])("Derived array access (%p)", ({ member, expected }) => {
    const luaHeader = `local arr = {name="array", firstElement=function(self) return self[1]; end};`;
    const typeScriptHeader = `
        interface CustomArray<T> extends Array<T>{
            name:string,
            firstElement():number;
        };
        declare const arr: CustomArray<number>;
    `;

    const result = util.transpileAndExecute(
        `
        arr[0] = 3;
        return arr.${member};`,
        undefined,
        luaHeader,
        typeScriptHeader,
    );

    expect(result).toBe(expected);
});

test("Array delete", () => {
    const result = util.transpileAndExecute(
        `const myarray = [1,2,3,4];
        delete myarray[2];
        return \`\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`,
    );

    expect(result).toBe("1,2,nil,4");
});

test("Array delete return true", () => {
    const result = util.transpileAndExecute(
        `const myarray = [1,2,3,4];
        const exists = delete myarray[2];
        return \`\${exists}:\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`,
    );

    expect(result).toBe("true:1,2,nil,4");
});

test("Array delete return false", () => {
    const result = util.transpileAndExecute(
        `const myarray = [1,2,3,4];
        const exists = delete myarray[4];
        return \`\${exists}:\${myarray[0]},\${myarray[1]},\${myarray[2]},\${myarray[3]}\`;`,
    );

    expect(result).toBe("true:1,2,3,4");
});

test("Array property access", () => {
    const code = `
        type A = number[] & {foo?: string};
        const a: A = [1,2,3];
        a.foo = "bar";
        return \`\${a.foo}\${a[0]}\${a[1]}\${a[2]}\`;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar123");
});

test.each([{ length: 0, result: 0 }, { length: 1, result: 1 }, { length: 7, result: 3 }])(
    "Array length set",
    ({ length, result }) => {
        const code = `
        const arr = [1, 2, 3];
        arr.length = ${length};
        return arr.length;
    `;
        expect(util.transpileAndExecute(code)).toBe(result);
    },
);

test.each([
    { length: 0, result: "0/0" },
    { length: 1, result: "1/1" },
    { length: 7, result: "7/3" },
])("Array length set as expression", ({ length, result }) => {
    const code = `
        const arr = [1, 2, 3];
        const l = arr.length = ${length};
        return \`\${l}/\${arr.length}\`;
    `;
    expect(util.transpileAndExecute(code)).toBe(result);
});

test.each([
    { length: -1, result: -1 },
    { length: -7, result: -7 },
    { length: 0.1, result: 0.1 },
    { length: "0 / 0", result: "NaN" },
    { length: "1 / 0", result: "Infinity" },
    { length: "-1 / 0", result: "-Infinity" },
])("Invalid array length set", ({ length, result }) => {
    const code = `
        const arr = [1, 2, 3];
        arr.length = ${length};
    `;
    expect(() => util.transpileAndExecute(code)).toThrowError(`invalid array length: ${result}`);
});
