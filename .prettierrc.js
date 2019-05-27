const isCI = require("is-ci");

/** @type {import("prettier").Options} */
module.exports = {
    printWidth: 120,
    tabWidth: 4,
    trailingComma: "es5",
    endOfLine: isCI ? "lf" : "auto",
    overrides: [{ files: ["**/*.md", "**/*.yml", "**/.*.yml"], options: { tabWidth: 2 } }],
};
