require("ts-node/register/transpile-only");
const path = require("path");
const tstl = require("./src");

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { diagnostics } = tstl.transpileProject(configFileName);
diagnostics.forEach(tstl.createDiagnosticReporter(true));

const extraDiagnostics = require("./src/lualib-build/build-lualib").writeExtraLualibFiles(
    path.resolve(__dirname, "dist/lualib")
);
extraDiagnostics.forEach(tstl.createDiagnosticReporter(true));

if (diagnostics.length > 0 || extraDiagnostics.length > 0) {
    process.exit(1);
}
