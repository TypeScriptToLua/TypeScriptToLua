const isCI = require("is-ci");

/** @type {import("prettier").Options} */
module.exports = {
    printWidth: 100,
    tabWidth: 4,
    trailingComma: "all",
    proseWrap: "always",
    endOfLine: isCI ? "lf" : "auto",
    overrides: [{ files: ["**/*.md", "**/*.yml", "**/.*.yml"], options: { tabWidth: 2 } }],
};
