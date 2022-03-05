import pluginInstance from "./plugin";
import { luaLibModulesInfoFileName, loadInlineLualibFeatures, LuaLibFeature } from "../LuaLib";
import * as path from "path";
import * as ts from "typescript";

// should be called after lualib modules are built
export function writeExtraLualibFiles(destPath: string): ts.Diagnostic[] {
    const { result: luaLibModuleInfo, diagnostics } = pluginInstance.createLuaLibModulesInfo();
    const emitHost = ts.sys;
    emitHost.writeFile(path.join(destPath, luaLibModulesInfoFileName), JSON.stringify(luaLibModuleInfo, null, 2));

    const allFeatures = Object.values(LuaLibFeature) as LuaLibFeature[];

    let lualibBundle = loadInlineLualibFeatures(allFeatures, emitHost);
    const exports = allFeatures.flatMap(feature => luaLibModuleInfo[feature].exports);
    lualibBundle += `\nreturn {\n${exports.map(exportName => `  ${exportName} = ${exportName}`).join(",\n")}\n}\n`;
    emitHost.writeFile(path.join(destPath, "lualib_bundle.lua"), lualibBundle);

    return diagnostics;
}
