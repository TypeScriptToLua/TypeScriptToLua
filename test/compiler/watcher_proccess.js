require("ts-node/register/transpile-only");
const { compile } = require("../../src/Compiler");

process.on("message", args => {
    compile(args);
});
