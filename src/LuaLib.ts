import * as path from "path";
import { EmitHost } from "./transpilation";
import * as lua from "./LuaAST";
import { LuaTarget } from "./CompilerOptions";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEntries = "ArrayEntries",
    ArrayEvery = "ArrayEvery",
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
    Await = "Await",
    Class = "Class",
    ClassExtends = "ClassExtends",
    CloneDescriptor = "CloneDescriptor",
    CountVarargs = "CountVarargs",
    Decorate = "Decorate",
    DecorateParam = "DecorateParam",
    Delete = "Delete",
    DelegatedYield = "DelegatedYield",
    Error = "Error",
    FunctionBind = "FunctionBind",
    Generator = "Generator",
    InstanceOf = "InstanceOf",
    InstanceOfObject = "InstanceOfObject",
    Iterator = "Iterator",
    LuaIteratorSpread = "LuaIteratorSpread",
    Map = "Map",
    Match = "Match",
    MathAtan2 = "MathAtan2",
    MathModf = "MathModf",
    MathSign = "MathSign",
    Modulo50 = "Modulo50",
    New = "New",
    Number = "Number",
    NumberIsFinite = "NumberIsFinite",
    NumberIsNaN = "NumberIsNaN",
    NumberToString = "NumberToString",
    ObjectAssign = "ObjectAssign",
    ObjectDefineProperty = "ObjectDefineProperty",
    ObjectEntries = "ObjectEntries",
    ObjectFromEntries = "ObjectFromEntries",
    ObjectGetOwnPropertyDescriptor = "ObjectGetOwnPropertyDescriptor",
    ObjectGetOwnPropertyDescriptors = "ObjectGetOwnPropertyDescriptors",
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
const luaLibModulesInfo = new Map<string, LuaLibModulesInfo>();
export function getLuaLibModulesInfo(luaTarget: LuaTarget, emitHost: EmitHost): LuaLibModulesInfo {
    const lualibPath = path.join(resolveLuaLibDir(luaTarget), luaLibModulesInfoFileName);
    if (!luaLibModulesInfo.has(lualibPath)) {
        const result = emitHost.readFile(lualibPath);
        if (result !== undefined) {
            luaLibModulesInfo.set(lualibPath, JSON.parse(result) as LuaLibModulesInfo);
        } else {
            throw new Error(`Could not load lualib dependencies from '${lualibPath}'`);
        }
    }
    return luaLibModulesInfo.get(lualibPath) as LuaLibModulesInfo;
}

export function readLuaLibFeature(feature: LuaLibFeature, luaTarget: LuaTarget, emitHost: EmitHost): string {
    const featurePath = path.join(resolveLuaLibDir(luaTarget), `${feature}.lua`);
    const luaLibFeature = emitHost.readFile(featurePath);
    if (luaLibFeature === undefined) {
        throw new Error(`Could not load lualib feature from '${featurePath}'`);
    }
    return luaLibFeature;
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
    let result = "";

    for (const feature of resolveRecursiveLualibFeatures(features, luaTarget, emitHost)) {
        const luaLibFeature = readLuaLibFeature(feature, luaTarget, emitHost);
        result += luaLibFeature + "\n";
    }

    return result;
}

export function loadImportedLualibFeatures(
    features: Iterable<LuaLibFeature>,
    luaTarget: LuaTarget,
    emitHost: EmitHost
): lua.Statement[] {
    const luaLibModuleInfo = getLuaLibModulesInfo(luaTarget, emitHost);

    const imports = Array.from(features).flatMap(feature => luaLibModuleInfo[feature].exports);

    const requireCall = lua.createCallExpression(lua.createIdentifier("require"), [
        lua.createStringLiteral("lualib_bundle"),
    ]);
    if (imports.length === 0) {
        return [];
    }

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

const luaLibBundleContent = new Map<string, string>();
export function getLuaLibBundle(luaTarget: LuaTarget, emitHost: EmitHost): string {
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
