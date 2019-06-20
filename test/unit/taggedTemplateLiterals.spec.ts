import * as util from "../util";

test.each([
    {
        callExpression: "func``",
        expectedResult: "",
    },
    {
        callExpression: "func`hello`",
        expectedResult: "hello",
    },
    {
        callExpression: "func`hello ${1} ${2} ${3}`",
        expectedResult: "hello 1 2 3",
    },
    {
        callExpression: "func`hello ${(() => 'iife')()}`",
        expectedResult: "hello iife",
    },
    {
        callExpression: "func`hello ${1 + 2 + 3} arithmetic`",
        expectedResult: "hello 6 arithmetic",
    },
    {
        callExpression: "func`begin ${'middle'} end`",
        expectedResult: "begin middle end",
    },
    {
        callExpression: "func`hello ${func`hello`}`",
        expectedResult: "hello hello",
    },
    {
        callExpression: "obj.func`hello ${'propertyAccessExpression'}`",
        expectedResult: "hello propertyAccessExpression",
    },
    {
        callExpression: "obj['func']`hello ${'elementAccessExpression'}`",
        expectedResult: "hello elementAccessExpression",
    },
])("TaggedTemplateLiteral call (%p)", ({ callExpression, expectedResult }) => {
    const result = util.transpileAndExecute(`
            function func(strings: TemplateStringsArray, ...expressions: any[]) {
                const toJoin = [];
                for (let i = 0; i < strings.length; ++i) {
                    if (strings[i]) {
                        toJoin.push(strings[i]);
                    }
                    if (expressions[i]) {
                        toJoin.push(expressions[i]);
                    }
                }
                return toJoin.join("");
            }
            const obj = {
                func
            };
            return ${callExpression};
        `);

    expect(result).toBe(expectedResult);
});

test("TaggedTemplateLiteral no self parameter", () => {
    const result = util.transpileAndExecute(`
            function func(this: void, strings: TemplateStringsArray, ...expressions: any[]) {
                return strings.join("");
            }
            return func\`noSelfParameter\`;
        `);

    expect(result).toBe("noSelfParameter");
});
