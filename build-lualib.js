require("ts-node/register/transpile-only");
const path = require("path");
const tstl = require("./src");

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { diagnostics } = tstl.transpileProject(configFileName);
diagnostics.forEach(tstl.createDiagnosticReporter(true));
