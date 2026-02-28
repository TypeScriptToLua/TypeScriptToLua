import * as path from "path";
import { EmitHost, transpileProject } from "./transpilation";
import * as lua from "./LuaAST";
import { LuaTarget, type CompilerOptions } from "./CompilerOptions";
import { getOrUpdate } from "./utils";
import { createEmitOutputCollector, type TranspiledFile } from "./transpilation/output-collector";
import { parseConfigFileWithSystem } from "./cli/tsconfig";
import { createDiagnosticReporter } from "./cli/report";

export enum LuaLibFeature {
    ArrayAt = "ArrayAt",
    ArrayConcat = "ArrayConcat",
    ArrayEntries = "ArrayEntries",
    ArrayEvery = "ArrayEvery",
    ArrayFill = "ArrayFill",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayFind = "ArrayFind",
    ArrayFindIndex = "ArrayFindIndex",
    ArrayFrom = "ArrayFrom",
    ArrayIncludes = "ArrayIncludes",
    ArrayIndexOf = "ArrayIndexOf",
    ArrayIsArray = "ArrayIsArray",
    ArrayJoin = "ArrayJoin",
    ArrayMap = "ArrayMap",
    ArrayPush = "ArrayPush",
    ArrayPushArray = "ArrayPushArray",
    ArrayReduce = "ArrayReduce",
    ArrayReduceRight = "ArrayReduceRight",
    ArrayReverse = "ArrayReverse",
    ArrayUnshift = "ArrayUnshift",
    ArraySort = "ArraySort",
    ArraySlice = "ArraySlice",
    ArraySome = "ArraySome",
    ArraySplice = "ArraySplice",
    ArrayToObject = "ArrayToObject",
    ArrayFlat = "ArrayFlat",
    ArrayFlatMap = "ArrayFlatMap",
    ArraySetLength = "ArraySetLength",
    ArrayToReversed = "ArrayToReversed",
    ArrayToSorted = "ArrayToSorted",
    ArrayToSpliced = "ArrayToSpliced",
    ArrayWith = "ArrayWith",
    Await = "Await",
    Class = "Class",
    ClassExtends = "ClassExtends",
    CloneDescriptor = "CloneDescriptor",
    CountVarargs = "CountVarargs",
    Decorate = "Decorate",
    DecorateLegacy = "DecorateLegacy",
    DecorateParam = "DecorateParam",
    Delete = "Delete",
    DelegatedYield = "DelegatedYield",
    DescriptorGet = "DescriptorGet",
    DescriptorSet = "DescriptorSet",
    Error = "Error",
    FunctionBind = "FunctionBind",
    Generator = "Generator",
    InstanceOf = "InstanceOf",
    InstanceOfObject = "InstanceOfObject",
    Iterator = "Iterator",
    LuaIteratorSpread = "LuaIteratorSpread",
    Map = "Map",
    MapGroupBy = "MapGroupBy",
    Match = "Match",
    MathAtan2 = "MathAtan2",
    MathModf = "MathModf",
    MathSign = "MathSign",
    MathTrunc = "MathTrunc",
    New = "New",
    Number = "Number",
    NumberIsFinite = "NumberIsFinite",
    NumberIsInteger = "NumberIsInteger",
    NumberIsNaN = "NumberIsNaN",
    NumberParseInt = "ParseInt",
    NumberParseFloat = "ParseFloat",
    NumberToString = "NumberToString",
    NumberToFixed = "NumberToFixed",
    ObjectAssign = "ObjectAssign",
    ObjectDefineProperty = "ObjectDefineProperty",
    ObjectEntries = "ObjectEntries",
    ObjectFromEntries = "ObjectFromEntries",
    ObjectGetOwnPropertyDescriptor = "ObjectGetOwnPropertyDescriptor",
    ObjectGetOwnPropertyDescriptors = "ObjectGetOwnPropertyDescriptors",
    ObjectGroupBy = "ObjectGroupBy",
    ObjectKeys = "ObjectKeys",
    ObjectRest = "ObjectRest",
    ObjectValues = "ObjectValues",
    ParseFloat = "ParseFloat",
    ParseInt = "ParseInt",
    Promise = "Promise",
    PromiseAll = "PromiseAll",
    PromiseAllSettled = "PromiseAllSettled",
    PromiseAny = "PromiseAny",
    PromiseRace = "PromiseRace",
    Set = "Set",
    SetDescriptor = "SetDescriptor",
    SparseArrayNew = "SparseArrayNew",
    SparseArrayPush = "SparseArrayPush",
    SparseArraySpread = "SparseArraySpread",
    WeakMap = "WeakMap",
    WeakSet = "WeakSet",
    SourceMapTraceBack = "SourceMapTraceBack",
    Spread = "Spread",
    StringAccess = "StringAccess",
    StringCharAt = "StringCharAt",
    StringCharCodeAt = "StringCharCodeAt",
    StringEndsWith = "StringEndsWith",
    StringIncludes = "StringIncludes",
    StringPadEnd = "StringPadEnd",
    StringPadStart = "StringPadStart",
    StringReplace = "StringReplace",
    StringReplaceAll = "StringReplaceAll",
    StringSlice = "StringSlice",
    StringSplit = "StringSplit",
    StringStartsWith = "StringStartsWith",
    StringSubstr = "StringSubstr",
    StringSubstring = "StringSubstring",
    StringTrim = "StringTrim",
    StringTrimEnd = "StringTrimEnd",
    StringTrimStart = "StringTrimStart",
    Symbol = "Symbol",
    SymbolRegistry = "SymbolRegistry",
    TypeOf = "TypeOf",
    Unpack = "Unpack",
    Using = "Using",
    UsingAsync = "UsingAsync",
}

export interface LuaLibFeatureInfo {
    dependencies?: LuaLibFeature[];
    exports: string[];
}

export type LuaLibModulesInfo = Record<LuaLibFeature, LuaLibFeatureInfo>;

export function resolveLuaLibDir(luaTarget: LuaTarget) {
    const luaLibDir = luaTarget === LuaTarget.Lua50 ? "5.0" : "universal";
    return path.resolve(__dirname, path.join("..", "dist", "lualib", luaLibDir));
}

export const luaLibModulesInfoFileName = "lualib_module_info.json";
const luaLibModulesInfo = new Map<LuaTarget, LuaLibModulesInfo>();

export function getLuaLibModulesInfo(luaTarget: LuaTarget, emitHost: EmitHost, useCache = true): LuaLibModulesInfo {
    if (!useCache || !luaLibModulesInfo.has(luaTarget)) {
        const lualibPath = path.join(resolveLuaLibDir(luaTarget), luaLibModulesInfoFileName);
        const result = emitHost.readFile(lualibPath);
        if (result !== undefined) {
            const info = JSON.parse(result) as LuaLibModulesInfo;
            if (!useCache) {
                return info;
            }
            luaLibModulesInfo.set(luaTarget, info);
        } else {
            throw new Error(`Could not load lualib dependencies from '${lualibPath}'`);
        }
    }
    return luaLibModulesInfo.get(luaTarget)!;
}

// This caches the names of lualib exports to their LuaLibFeature, avoiding a linear search for every lookup
const lualibExportToFeature = new Map<LuaTarget, ReadonlyMap<string, LuaLibFeature>>();

export function getLuaLibExportToFeatureMap(
    luaTarget: LuaTarget,
    emitHost: EmitHost
): ReadonlyMap<string, LuaLibFeature> {
    if (!lualibExportToFeature.has(luaTarget)) {
        const luaLibModulesInfo = getLuaLibModulesInfo(luaTarget, emitHost);
        const map = new Map<string, LuaLibFeature>();
        for (const [feature, info] of Object.entries(luaLibModulesInfo)) {
            for (const exportName of info.exports) {
                map.set(exportName, feature as LuaLibFeature);
            }
        }
        lualibExportToFeature.set(luaTarget, map);
    }

    return lualibExportToFeature.get(luaTarget)!;
}

const lualibFeatureCache = new Map<LuaTarget, Map<LuaLibFeature, string>>();

export function readLuaLibFeature(
    feature: LuaLibFeature,
    luaTarget: LuaTarget,
    emitHost: EmitHost,
    useCache = true
): string {
    if (!useCache) {
        const featurePath = path.join(resolveLuaLibDir(luaTarget), `${feature}.lua`);
        const luaLibFeature = emitHost.readFile(featurePath);
        if (luaLibFeature === undefined) {
            throw new Error(`Could not load lualib feature from '${featurePath}'`);
        }
        return luaLibFeature;
    }

    const featureMap = getOrUpdate(lualibFeatureCache, luaTarget, () => new Map());
    if (!featureMap.has(feature)) {
        const featurePath = path.join(resolveLuaLibDir(luaTarget), `${feature}.lua`);
        const luaLibFeature = emitHost.readFile(featurePath);
        if (luaLibFeature === undefined) {
            throw new Error(`Could not load lualib feature from '${featurePath}'`);
        }
        featureMap.set(feature, luaLibFeature);
    }
    return featureMap.get(feature)!;
}

export function resolveRecursiveLualibFeatures(
    features: Iterable<LuaLibFeature>,
    luaTarget: LuaTarget,
    emitHost: EmitHost,
    luaLibModulesInfo: LuaLibModulesInfo = getLuaLibModulesInfo(luaTarget, emitHost)
): LuaLibFeature[] {
    const loadedFeatures = new Set<LuaLibFeature>();
    const result: LuaLibFeature[] = [];

    function load(feature: LuaLibFeature): void {
        if (loadedFeatures.has(feature)) return;
        loadedFeatures.add(feature);

        const dependencies = luaLibModulesInfo[feature]?.dependencies;
        if (dependencies) {
            dependencies.forEach(load);
        }

        result.push(feature);
    }

    for (const feature of features) {
        load(feature);
    }

    return result;
}

export function loadInlineLualibFeatures(
    features: Iterable<LuaLibFeature>,
    luaTarget: LuaTarget,
    emitHost: EmitHost
): string {
    return resolveRecursiveLualibFeatures(features, luaTarget, emitHost)
        .map(feature => readLuaLibFeature(feature, luaTarget, emitHost))
        .join("\n");
}

export function loadImportedLualibFeatures(
    features: Iterable<LuaLibFeature>,
    luaTarget: LuaTarget,
    emitHost: EmitHost
): lua.Statement[] {
    const luaLibModuleInfo = getLuaLibModulesInfo(luaTarget, emitHost);

    const imports = Array.from(features).flatMap(feature => luaLibModuleInfo[feature].exports);
    if (imports.length === 0) {
        return [];
    }

    const requireCall = lua.createCallExpression(lua.createIdentifier("require"), [
        lua.createStringLiteral("lualib_bundle"),
    ]);

    const luaLibId = lua.createIdentifier("____lualib");
    const importStatement = lua.createVariableDeclarationStatement(luaLibId, requireCall);
    const statements: lua.Statement[] = [importStatement];
    // local <export> = ____luaLib.<export>
    for (const item of imports) {
        statements.push(
            lua.createVariableDeclarationStatement(
                lua.createIdentifier(item),
                lua.createTableIndexExpression(luaLibId, lua.createStringLiteral(item))
            )
        );
    }
    return statements;
}

const recompileLualibCache = new WeakMap<EmitHost, TranspiledFile[]>();

function recompileLuaLibFiles(sourceOptions: CompilerOptions, emitHost: EmitHost): TranspiledFile[] {
    let transpiledFiles = recompileLualibCache.get(emitHost);
    if (!transpiledFiles) {
        const tsconfigPath =
            sourceOptions.luaTarget === LuaTarget.Lua50
                ? path.join(__dirname, "../src/lualib/tsconfig.lua50.json")
                : path.join(__dirname, "../src/lualib/tsconfig.json");
        const config = parseConfigFileWithSystem(tsconfigPath);
        const options = config.options;
        const sourcePlugins = (sourceOptions.luaPlugins ?? []).filter(p => !p.skipRecompileLuaLib);
        options.luaPlugins = [...(options.luaPlugins ?? []), ...sourcePlugins];

        const collector = createEmitOutputCollector(options.extension);
        const reportDiagnostic = createDiagnosticReporter(false);

        const { diagnostics } = transpileProject(tsconfigPath, options, collector.writeFile);
        diagnostics.forEach(reportDiagnostic);

        transpiledFiles = collector.files;
        recompileLualibCache.set(emitHost, transpiledFiles);
    }

    return transpiledFiles;
}

function recompileLuaLibBundle(sourceOptions: CompilerOptions, emitHost: EmitHost): string | undefined {
    const transpiledFiles = recompileLuaLibFiles(sourceOptions, emitHost);
    const lualibBundle = transpiledFiles.find(f => f.outPath.endsWith("lualib_bundle.lua"));
    return lualibBundle?.lua;
}

export function recompileInlineLualibFeatures(
    features: Iterable<LuaLibFeature>,
    options: CompilerOptions,
    emitHost: EmitHost
): string {
    const luaTarget = options.luaTarget ?? LuaTarget.Universal;
    const transpiledFiles = recompileLuaLibFiles(options, emitHost);
    emitHost = {
        readFile(filePath: string) {
            const file = transpiledFiles.find(f => f.outPath === filePath);
            return file ? file.text : undefined;
        },
    } as any as EmitHost;
    const moduleInfo = getLuaLibModulesInfo(luaTarget, emitHost, false);
    return resolveRecursiveLualibFeatures(features, luaTarget, emitHost, moduleInfo)
        .map(feature => readLuaLibFeature(feature, luaTarget, emitHost, false))
        .join("\n");
}

const luaLibBundleContent = new Map<string, string>();

export function getLuaLibBundle(luaTarget: LuaTarget, emitHost: EmitHost, options: CompilerOptions): string {
    if (options.recompileLuaLib) {
        const result = recompileLuaLibBundle(options, emitHost);
        if (!result) {
            throw new Error(`Failed to recompile lualib bundle`);
        }
        return result;
    }

    const lualibPath = path.join(resolveLuaLibDir(luaTarget), "lualib_bundle.lua");
    if (!luaLibBundleContent.has(lualibPath)) {
        const result = emitHost.readFile(lualibPath);
        if (result !== undefined) {
            luaLibBundleContent.set(lualibPath, result);
        } else {
            throw new Error(`Could not load lualib bundle from '${lualibPath}'`);
        }
    }

    return luaLibBundleContent.get(lualibPath) as string;
}

export function getLualibBundleReturn(exportedValues: string[]): string {
    return `\nreturn {\n${exportedValues.map(exportName => `  ${exportName} = ${exportName}`).join(",\n")}\n}\n`;
}

export function buildMinimalLualibBundle(
    features: Iterable<LuaLibFeature>,
    options: CompilerOptions,
    emitHost: EmitHost
): string {
    const luaTarget = options.luaTarget ?? LuaTarget.Universal;
    let code;
    if (options.recompileLuaLib) {
        code = recompileInlineLualibFeatures(features, options, emitHost);
        const transpiledFiles = recompileLuaLibFiles(options, emitHost);
        emitHost = {
            readFile(filePath: string) {
                const file = transpiledFiles.find(f => f.outPath === filePath);
                return file ? file.text : undefined;
            },
        } as any as EmitHost;
    } else {
        code = loadInlineLualibFeatures(features, luaTarget, emitHost);
    }

    const moduleInfo = getLuaLibModulesInfo(luaTarget, emitHost, !options.recompileLuaLib);
    const exports = Array.from(features).flatMap(feature => moduleInfo[feature].exports);
    return code + getLualibBundleReturn(exports);
}

export function findUsedLualibFeatures(
    luaTarget: LuaTarget,
    emitHost: EmitHost,
    luaContents: string[]
): Set<LuaLibFeature> {
    const features = new Set<LuaLibFeature>();
    const exportToFeatureMap = getLuaLibExportToFeatureMap(luaTarget, emitHost);

    for (const lua of luaContents) {
        const regex = /^local (\w+) = ____lualib\.(\w+)$/gm;
        while (true) {
            const match = regex.exec(lua);
            if (!match) break;
            const [, localName, exportName] = match;
            if (localName !== exportName) continue;
            const feature = exportToFeatureMap.get(exportName);
            if (feature) features.add(feature);
        }
    }

    return features;
}
