require("ts-node/register/transpile-only");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const tstl = require("./src");
const { loadInlineLualibFeatures } = require("./src/LuaLib");

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { diagnostics } = tstl.transpileProject(configFileName);
diagnostics.forEach(tstl.createDiagnosticReporter(true));
