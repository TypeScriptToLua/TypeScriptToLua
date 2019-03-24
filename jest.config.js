// @ts-check
const isCI = require("is-ci");

/** @type {Partial<import('@jest/types').Config.DefaultOptions>} */
module.exports = {
    testMatch: ["**/__tests__/**/*.test.ts"],
    collectCoverageFrom: ["<rootDir>/src/**/*", "!<rootDir>/src/lualib/**/*"],
    watchPathIgnorePatterns: ["/watch\\.ts$"],

    testEnvironment: "node",
    testRunner: "jest-circus/runner",
    preset: "ts-jest",
    globals: {
        "ts-jest": {
            tsConfig: "<rootDir>/__tests__/tsconfig.json",
            diagnostics: { warnOnly: !isCI },
        },
    },
};
