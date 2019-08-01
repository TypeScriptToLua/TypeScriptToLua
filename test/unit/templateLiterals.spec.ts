import * as util from "../util";

test.each([
    { a: 12, b: 23, c: 43 },
    { a: "test", b: "hello", c: "bye" },
    { a: "test", b: 42, c: "bye" },
    { a: "test", b: 42, c: 12 },
    { a: "test", b: 42, c: true },
    { a: false, b: 42, c: 12 },
])("template literal (%p)", ({ a, b, c }) => {
    util.testExpressionTemplate`\`\${${a}} \${${b}} test \${${c}}\``.expectToMatchJsResult();
});

test.each(["a++", "a--", "--a", "++a"])("template literal with expression (%p)", expression => {
    util.testFunction`
        let a = 3;
        return \`value\${${expression}}\`;
    `.expectToMatchJsResult();
});

test.each(["`foo${'bar'}`.length", "`foo${'bar'}`.repeat(2)"])("template literal property access (%p)", expression => {
    util.testExpression(expression).expectToMatchJsResult();
});

test.each([
    "func``",
    "func`hello`",
    "func`hello ${1} ${2} ${3}`",
    "func`hello ${(() => 'iife')()}`",
    "func`hello ${1 + 2 + 3} arithmetic`",
    "func`begin ${'middle'} end`",
    "func`hello ${func`hello`}`",
    "func`hello \\u00A9`",
    "func`hello $ { }`",
    "func`hello { ${'brackets'} }`",
    "func`hello \\``",
    "obj.func`hello ${'propertyAccessExpression'}`",
    "obj['func']`hello ${'elementAccessExpression'}`",
])("tagged template literal (%p)", expression => {
    util.testFunction`
        function func(strings: TemplateStringsArray, ...expressions: any[]) {
            return { strings: [...strings], raw: strings.raw, expressions };
        }

        const obj = { func };
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["func`noSelfParameter`", "obj.func`noSelfParameter`", "obj[`func`]`noSelfParameter`"])(
    "tagged template literal function context (%p)",
    expression => {
        util.testFunction`
            function func(this: void, strings: TemplateStringsArray) {
                return [...strings];
            }

            const obj = { func };
            return ${expression};
        `.expectToMatchJsResult();
    }
);
