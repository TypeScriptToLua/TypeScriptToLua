import { ProcessedFile, EmitHost } from "./utils";
import { LuaLibFeature, LuaLibModulesInfo, loadInlineLualibFeatures, luaLibModulesInfoFileName } from "../LuaLib";
import * as path from "path";
import { LuaPrinter } from "../LuaPrinter";
import * as lua from "../LuaAST";
import { assume } from "../utils";
import * as ts from "typescript";

export function generateExtraLualibFiles(
    emitHost: EmitHost,
    program: ts.Program,
    files: ProcessedFile[]
): ProcessedFile[] {
    const luaLibFiles: Map<LuaLibFeature, ProcessedFile> = new Map();
    for (const file of files) {
        if (!file.luaAst) continue;
        const fileName = path.basename(file.fileName, ".ts");
        if (!(fileName in LuaLibFeature)) {
            // TODO: Diagnostic?
            console.error(`File does not correspond to a LuaLibFeature: ${fileName}`);
        } else {
            luaLibFiles.set(fileName as LuaLibFeature, file);
        }
    }
    for (const luaLibFeature of Object.values(LuaLibFeature)) {
        if (!luaLibFiles.has(luaLibFeature)) {
            console.error(`Missing file for LuaLibFeature: ${luaLibFeature}`);
        }
    }

    // lualibModulesInfo
    const lualibModulesInfo: Partial<LuaLibModulesInfo> = {};
    for (const [feature, file] of luaLibFiles) {
        let dependencies: LuaLibFeature[] | undefined;
        const dependenciesForFeature = file.luaAst!.luaLibFeatures;
        dependenciesForFeature.delete(feature); // Don't include self
        if (dependenciesForFeature.size > 0) {
            dependencies = Array.from(dependenciesForFeature);
        }

        const exports = file.luaAst!.exports!;
        if (dependencies || exports) {
            lualibModulesInfo[feature] = {
                dependencies,
                exports,
            };
        }
    }
    assume<LuaLibModulesInfo>(lualibModulesInfo);

    // lua bundle
    const allFeatures = Array.from(luaLibFiles.keys());
    let lualibBundle = loadInlineLualibFeatures(
        allFeatures,
        emitHost,
        lualibModulesInfo,
        feature => luaLibFiles.get(feature)?.code ?? ""
    );
    const exports = allFeatures.flatMap(feature => lualibModulesInfo[feature].exports);
    const statements: lua.TableFieldExpression[] = exports.map(exportName =>
        lua.createTableFieldExpression(lua.createIdentifier(exportName), lua.createStringLiteral(exportName))
    );
    const moduleReturn = lua.createReturnStatement([lua.createTableExpression(statements)]);
    const printer = new LuaPrinter(emitHost, program, "lualib_bundle.lua");
    lualibBundle += `\n${printer.printStatement(moduleReturn)}\n`;

    return [
        {
            code: lualibBundle,
            fileName: "lualib_bundle.lua",
            isRawFile: true,
        },
        {
            code: JSON.stringify(lualibModulesInfo, null, 2),
            fileName: luaLibModulesInfoFileName,
            isRawFile: true,
        },
    ];
}
