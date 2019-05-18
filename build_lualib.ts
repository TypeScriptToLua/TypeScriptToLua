import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as tstl from "./src";
import { LuaLib } from "./src/LuaLib";

const configFileName = path.resolve(__dirname, "src/lualib/tsconfig.json");
const { emitResult, diagnostics } = tstl.transpileProject(configFileName);
emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

const reportDiagnostic = tstl.createDiagnosticReporter(true);
diagnostics.forEach(reportDiagnostic);

const bundlePath = path.join(__dirname, "dist/lualib/lualib_bundle.lua");
if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
}

fs.writeFileSync(bundlePath, LuaLib.loadFeatures(Object.values(tstl.LuaLibFeature)));
