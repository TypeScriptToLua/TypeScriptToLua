module.exports = {
    env: { es6: true, node: true },
    parserOptions: { sourceType: "module", project: ["test/tsconfig.json", "src/lualib/tsconfig.json"] },
    plugins: ["@typescript-eslint", "import"],
    rules: {
        "arrow-body-style": "error",
        curly: ["error", "multi-line"],
        "default-case": "off",
        eqeqeq: ["error", "always", { null: "ignore" }],
        "guard-for-in": "off",
        "id-match": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-debugger": "error",
        "no-duplicate-case": "error",
        "no-new-wrappers": "error",
        "no-redeclare": "error",
        "no-restricted-globals": ["error", "parseInt", "parseFloat"],
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "prefer-const": ["error", { destructuring: "all" }],
        radix: "error",
        "use-isnan": "error",

        "import/no-default-export": "error",
    },
    overrides: [
        {
            files: "**/*.ts",
            parser: "@typescript-eslint/parser",
            rules: {
                "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
                "@typescript-eslint/ban-types": ["error", { types: { null: null } }],
                "@typescript-eslint/class-name-casing": "error",
                "@typescript-eslint/consistent-type-assertions": "error",
                "@typescript-eslint/explicit-member-accessibility": [
                    "error",
                    { overrides: { constructors: "no-public" } },
                ],
                "@typescript-eslint/interface-name-prefix": "error",
                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/no-inferrable-types": "error",
                "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
                "@typescript-eslint/triple-slash-reference": "error",
                "@typescript-eslint/no-array-constructor": "error",
                "@typescript-eslint/no-throw-literal": "error",
                // "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],

                // TODO: https://github.com/typescript-eslint/typescript-eslint/issues/1712
                // "@typescript-eslint/naming-convention": [
                //     "error",
                //     {
                //         selector: "default",
                //         format: ["camelCase"],
                //         leadingUnderscore: "allow",
                //     },
                //     {
                //         selector: "variable",
                //         format: ["camelCase", "UPPER_CASE"],
                //         leadingUnderscore: "allow",
                //     },
                //     {
                //         selector: "typeLike",
                //         format: ["PascalCase"],
                //     },
                // ],
            },
        },
        {
            files: "src/lualib/**/*.ts",
            rules: {
                "@typescript-eslint/no-throw-literal": "off",
            },
        },
    ],
};
