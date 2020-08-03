require("ts-node/register/transpile-only");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const tstl = require("./src");
const { loadLuaLibFeatures } = require("./src/LuaLib");

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { diagnostics } = tstl.transpileProject(configFileName);
diagnostics.forEach(tstl.createDiagnosticReporter(true));

const bundlePath = path.join(__dirname, "dist/lualib/lualib_bundle.lua");
if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
}

fs.writeFileSync(bundlePath, loadLuaLibFeatures(Object.values(tstl.LuaLibFeature), ts.sys));
