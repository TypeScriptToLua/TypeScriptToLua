// @ts-check

import tseslint from "typescript-eslint";
import eslintPluginJest from "eslint-plugin-jest";

export default tseslint.config(
    // Enable linting on TypeScript file extensions.
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    },

    // Base ESLint rules
    {
        rules: {
            "arrow-body-style": "error",
            curly: ["error", "multi-line"],
            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-caller": "error",
            "no-cond-assign": "error",
            "no-debugger": "error",
            "no-duplicate-case": "error",
            "no-new-wrappers": "error",
            "no-restricted-globals": ["error", "parseInt", "parseFloat"],
            "no-unused-labels": "error",
            "no-var": "error",
            "prefer-const": ["error", { destructuring: "all" }],
            radix: "error",
            "use-isnan": "error",
            "object-shorthand": [
                "error",
                "always",
                { avoidQuotes: true, ignoreConstructors: false, avoidExplicitReturnArrows: true },
            ],
            "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "SequenceExpression"],
            "spaced-comment": [
                "error",
                "always",
                {
                    line: { exceptions: ["-", "+"], markers: ["=", "!", "/"] },
                    block: { exceptions: ["-", "+"], markers: ["=", "!", ":", "::"], balanced: true },
                },
            ],
            "no-delete-var": ["error"],
            "no-label-var": ["error"],
            yoda: ["error"],
            "prefer-numeric-literals": ["error"],
            "prefer-rest-params": ["error"],
            "prefer-spread": ["error"],
            "no-useless-computed-key": ["error"],
            "for-direction": ["error"],
            "no-compare-neg-zero": ["error"],
            "no-dupe-else-if": ["error"],
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-implicit-coercion": ["error", { boolean: true, number: true, string: true }],
            "operator-assignment": ["error"],
            "no-path-concat": ["error"],
            "no-control-regex": ["error"],
            "no-unneeded-ternary": ["error", { defaultAssignment: false }],
            "one-var": ["error", "never"],
            "prefer-exponentiation-operator": ["error"],
            "prefer-object-spread": ["error"],
            "no-useless-catch": ["error"],
            "no-useless-concat": ["error"],
            "no-useless-escape": ["error"],
            "no-useless-return": ["error"],
        },
    },

    // typescript-eslint
    {
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: [
                    "test/tsconfig.json",
                    "src/lualib/tsconfig.json",
                    "src/lualib/tsconfig.lua50.json",
                    "benchmark/tsconfig.json",
                    "language-extensions/tsconfig.json",
                    "tsconfig.eslint.json",
                ],
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/adjacent-overload-signatures": "error",
            "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/consistent-type-assertions": [
                "error",
                { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
            ],
            "@typescript-eslint/consistent-type-definitions": "error",
            "@typescript-eslint/explicit-member-accessibility": ["error", { overrides: { constructors: "no-public" } }],
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "default",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE"],
                    leadingUnderscore: "allow",
                },
                {
                    selector: "typeLike",
                    format: ["PascalCase"],
                },
                {
                    selector: "enumMember",
                    format: ["PascalCase"],
                },
                {
                    selector: "typeParameter",
                    format: ["PascalCase"],
                    prefix: ["T"],
                    filter: {
                        regex: "K|V",
                        match: false,
                    },
                },
                {
                    selector: "interface",
                    format: ["PascalCase"],
                    custom: {
                        regex: "^I[A-Z]",
                        match: false,
                    },
                },
                {
                    // Ignore properties that require quotes
                    selector: "objectLiteralProperty",
                    modifiers: ["requiresQuotes"],
                    format: null,
                },
            ],
            "no-array-constructor": "off",
            "@typescript-eslint/no-array-constructor": "error",
            "@typescript-eslint/no-empty-interface": "error",
            "@typescript-eslint/no-empty-object-type": "error",
            "@typescript-eslint/no-extra-non-null-assertion": "error",
            "@typescript-eslint/no-extraneous-class": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-for-in-array": "error",
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/no-misused-new": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
            "@typescript-eslint/no-this-alias": "error",
            "@typescript-eslint/no-unnecessary-qualifier": "error",
            "@typescript-eslint/no-unnecessary-type-arguments": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "no-unused-expressions": "off",
            "@typescript-eslint/no-unused-expressions": "error",
            "no-useless-constructor": "off",
            "@typescript-eslint/no-useless-constructor": "error",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "no-throw-literal": "off",
            "@typescript-eslint/only-throw-error": "error", // "no-throw-literal" was renamed to "only-throw-error".
            "@typescript-eslint/prefer-for-of": "error",
            "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/prefer-includes": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/prefer-namespace-keyword": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-string-starts-ends-with": "error",
            "@typescript-eslint/promise-function-async": ["error", { checkArrowFunctions: false }],
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/restrict-plus-operands": ["error", { skipCompoundAssignments: false }],
            "@typescript-eslint/return-await": "error",
            "@typescript-eslint/triple-slash-reference": "error",
            "@typescript-eslint/unified-signatures": "error",
        },
    },

    // eslint-plugin-jest
    eslintPluginJest.configs["flat/recommended"],
    eslintPluginJest.configs["flat/style"],
    {
        rules: {
            "jest/expect-expect": "off",
            "jest/consistent-test-it": ["error", { fn: "test", withinDescribe: "test" }],
            "jest/no-disabled-tests": "error",
            "jest/no-identical-title": "off",
            "jest/no-test-return-statement": "error",
            "jest/prefer-spy-on": "error",
            "jest/prefer-todo": "error",
            "jest/valid-title": "error",
            // TODO:
            // "jest/lowercase-name": "error",
        },
    },

    // Exceptions for specific files/directories
    {
        files: ["src/lualib/**/*.ts"],
        rules: {
            "no-restricted-syntax": ["error", "LabeledStatement", "SequenceExpression"],
            "@typescript-eslint/only-throw-error": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/naming-convention": "off",
        },
    },

    // Ignore some specific files and directories
    {
        ignores: [
            ".github/scripts/create_benchmark_check.js",
            "dist/",
            "eslint.config.mjs",
            "jest.config.js",
            "test/cli/errors/",
            "test/cli/watch/",
            "test/translation/transformation/",
            "test/transpile/directories/",
            "test/transpile/module-resolution/**/node_modules/",
            "test/transpile/module-resolution/**/dist/",
            "test/transpile/outFile/",
            "test/transpile/resolve-plugin/",
        ],
    }
);
