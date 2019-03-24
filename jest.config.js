// @ts-check
const isCI = require("is-ci");

/** @type {Partial<import('@jest/types').Config.DefaultOptions>} */
const config = {
    testMatch: ["**/test/**/*.spec.ts"],
    collectCoverageFrom: ["<rootDir>/src/**/*", "!<rootDir>/src/lualib/**/*"],
    watchPathIgnorePatterns: ["/watch\\.ts$"],

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

module.exports = config;
