import * as util from "../util";

const testCases = [
    {
        callExpression: "func``",
        joinAllResult: "",
        joinRawResult: "",
    },
    {
        callExpression: "func`hello`",
        joinAllResult: "hello",
        joinRawResult: "hello",
    },
    {
        callExpression: "func`hello ${1} ${2} ${3}`",
        joinAllResult: "hello 1 2 3",
        joinRawResult: "hello   ",
    },
    {
        callExpression: "func`hello ${(() => 'iife')()}`",
        joinAllResult: "hello iife",
        joinRawResult: "hello ",
    },
    {
        callExpression: "func`hello ${1 + 2 + 3} arithmetic`",
        joinAllResult: "hello 6 arithmetic",
        joinRawResult: "hello  arithmetic",
    },
    {
        callExpression: "func`begin ${'middle'} end`",
        joinAllResult: "begin middle end",
        joinRawResult: "begin  end",
    },
    {
        callExpression: "func`hello ${func`hello`}`",
        joinAllResult: "hello hello",
        joinRawResult: "hello ",
    },
    {
        callExpression: "func`hello \\u00A9`",
        joinAllResult: "hello ©",
        joinRawResult: "hello \\u00A9",
    },
    {
        callExpression: "func`hello $ { }`",
        joinAllResult: "hello $ { }",
        joinRawResult: "hello $ { }",
    },
    {
        callExpression: "func`hello { ${'brackets'} }`",
        joinAllResult: "hello { brackets }",
        joinRawResult: "hello {  }",
    },
    {
        callExpression: "func`hello \\``",
        joinAllResult: "hello `",
        joinRawResult: "hello \\`",
    },
    {
        callExpression: "obj.func`hello ${'propertyAccessExpression'}`",
        joinAllResult: "hello propertyAccessExpression",
        joinRawResult: "hello ",
    },
    {
        callExpression: "obj['func']`hello ${'elementAccessExpression'}`",
        joinAllResult: "hello elementAccessExpression",
        joinRawResult: "hello ",
    },
];

test.each(testCases)("TaggedTemplateLiteral call (%p)", ({ callExpression, joinAllResult }) => {
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

    expect(result).toBe(joinAllResult);
});

test.each(testCases)("TaggedTemplateLiteral raw preservation (%p)", ({ callExpression, joinRawResult }) => {
    const result = util.transpileAndExecute(`
            function func(strings: TemplateStringsArray, ...expressions: any[]) {
                return strings.raw.join("");
            }
            const obj = {
                func
            };
            return ${callExpression};
        `);

    expect(result).toBe(joinRawResult);
});

test.each(["func`noSelfParameter`", "obj.func`noSelfParameter`", "obj[`func`]`noSelfParameter`"])(
    "TaggedTemplateLiteral no self parameter",
    callExpression => {
        const result = util.transpileAndExecute(`
            function func(this: void, strings: TemplateStringsArray, ...expressions: any[]) {
                return strings.join("");
            }
            const obj = {
                func
            };
            return ${callExpression};
        `);

        expect(result).toBe("noSelfParameter");
    }
);
