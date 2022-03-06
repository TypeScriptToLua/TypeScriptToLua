require("ts-node/register/transpile-only");
const path = require("path");
const tstl = require("./src");

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { diagnostics } = tstl.transpileProject(configFileName);
diagnostics.forEach(tstl.createDiagnosticReporter(true));

if (diagnostics.length > 0) {
    process.exit(1);
}
