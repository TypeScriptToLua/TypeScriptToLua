const isCI = require("is-ci");

/** @type {Partial<import("@jest/types").Config.DefaultOptions>} */
module.exports = {
    testMatch: ["**/test/**/*.spec.ts"],
    collectCoverageFrom: [
        "<rootDir>/src/**/*",
        "!<rootDir>/src/lualib/**/*",
        // https://github.com/facebook/jest/issues/5274
        "!<rootDir>/src/tstl.ts",
    ],
    watchPathIgnorePatterns: ["cli/watch/[^/]+$", "src/lualib"],

    setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
    testEnvironment: "node",
    testRunner: "jest-circus/runner",
    preset: "ts-jest",
    globals: {
        "ts-jest": {
            tsConfig: "<rootDir>/test/tsconfig.json",
            diagnostics: { warnOnly: !isCI },
        },
    },
};
