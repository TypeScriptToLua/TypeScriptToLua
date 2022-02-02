import { ProcessedFile, EmitHost } from "./utils";
import { LuaLibFeature, LuaLibModulesInfo, loadInlineLualibFeatures } from "../LuaLib";
import * as path from "path";
import { LuaPrinter } from "../LuaPrinter";
import * as ts from "typescript";
import * as lua from "../LuaAST";

export function createLuaLibModuleInfo(files: ProcessedFile[]): LuaLibModulesInfo {
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

    const result: Partial<LuaLibModulesInfo> = {};
    for (const [feature, file] of luaLibFiles) {
        let dependencies: LuaLibFeature[] | undefined;
        const dependenciesForFeature = file.luaAst!.luaLibFeatures;
        dependenciesForFeature.delete(feature); // Don't include self
        if (dependenciesForFeature.size > 0) {
            dependencies = Array.from(dependenciesForFeature);
        }

        const exports = file.luaAst!.exports!;
        if (dependencies || exports) {
            result[feature] = {
                dependencies,
                exports,
            };
        }
    }

    return result as LuaLibModulesInfo;
}

export function createLuaLibBundle(
    emitHost: EmitHost,
    program: ts.Program,
    luaLibModuleInfo: LuaLibModulesInfo
): string {
    const allFeatures = Object.values(LuaLibFeature) as LuaLibFeature[];

    let result = loadInlineLualibFeatures(allFeatures, emitHost);

    const exports = allFeatures.flatMap(feature => luaLibModuleInfo[feature].exports);
    const statements: lua.TableFieldExpression[] = exports.map(exportName =>
        lua.createTableFieldExpression(lua.createIdentifier(exportName), lua.createStringLiteral(exportName))
    );
    const moduleReturn = lua.createReturnStatement([lua.createTableExpression(statements)]);

    const printer = new LuaPrinter(emitHost, program, "lualib_bundle.lua");
    result += `\n${printer.printReturnStatement(moduleReturn)}\n`;

    return result;
}
