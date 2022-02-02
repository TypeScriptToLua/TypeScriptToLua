import * as path from "path";
import { EmitHost } from "./transpilation";
import * as lua from "./LuaAST";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEntries = "ArrayEntries",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayFind = "ArrayFind",
    ArrayFindIndex = "ArrayFindIndex",
    ArrayIncludes = "ArrayIncludes",
    ArrayIndexOf = "ArrayIndexOf",
    ArrayIsArray = "ArrayIsArray",
    ArrayJoin = "ArrayJoin",
    ArrayMap = "ArrayMap",
    ArrayPush = "ArrayPush",
    ArrayReduce = "ArrayReduce",
    ArrayReduceRight = "ArrayReduceRight",
    ArrayReverse = "ArrayReverse",
    ArrayShift = "ArrayShift",
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
    Map = "Map",
    MathAtan2 = "MathAtan2",
    MathSign = "MathSign",
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
    StringConcat = "StringConcat",
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

let luaLibModuleInfo: LuaLibModulesInfo | undefined;
export function getLuaLibModuleInfo(emitHost: EmitHost): LuaLibModulesInfo {
    if (luaLibModuleInfo === undefined) {
        const lualibPath = path.resolve(__dirname, "../dist/lualib/lualib_dependencies.json");
        const result = emitHost.readFile(lualibPath);
        if (result !== undefined) {
            luaLibModuleInfo = JSON.parse(result) as LuaLibModulesInfo;
        } else {
            throw new Error(`Could not load lualib dependencies from '${lualibPath}'`);
        }
    }
    return luaLibModuleInfo;
}

export function readLuaLibFeature(feature: LuaLibFeature, emitHost: EmitHost): string {
    const featurePath = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
    const luaLibFeature = emitHost.readFile(featurePath);
    if (luaLibFeature === undefined) {
        throw new Error(`Could not load lualib feature from '${featurePath}'`);
    }
    return luaLibFeature;
}

export function loadInlineLualibFeatures(features: Iterable<LuaLibFeature>, emitHost: EmitHost): string {
    let result = "";

    const loadedFeatures = new Set<LuaLibFeature>();

    const luaLibDependencyMap = getLuaLibModuleInfo(emitHost);
    function load(feature: LuaLibFeature): void {
        if (loadedFeatures.has(feature)) return;
        loadedFeatures.add(feature);

        const dependencies = luaLibDependencyMap[feature]?.dependencies;
        if (dependencies) {
            dependencies.forEach(load);
        }
        const luaLibFeature = readLuaLibFeature(feature, emitHost);
        result += luaLibFeature + "\n";
    }

    for (const feature of features) {
        load(feature);
    }

    return result;
}

export function loadImportedLualibFeatures(
    features: Iterable<LuaLibFeature>,
    emitHost: EmitHost,
    alwaysRequire = false
): lua.Statement[] {
    const luaLibModuleInfo = getLuaLibModuleInfo(emitHost);

    const imports = Array.from(features).flatMap(feature => luaLibModuleInfo[feature].exports);

    const requireCall = lua.createCallExpression(lua.createIdentifier("require"), [
        lua.createStringLiteral("lualib_bundle"),
    ]);
    if (imports.length === 0) {
        if (alwaysRequire) {
            return [lua.createExpressionStatement(requireCall)];
        }
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

let luaLibBundleContent: string;
export function getLuaLibBundle(emitHost: EmitHost): string {
    if (luaLibBundleContent === undefined) {
        const lualibPath = path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua");
        const result = emitHost.readFile(lualibPath);
        if (result !== undefined) {
            luaLibBundleContent = result;
        } else {
            throw new Error(`Could not load lualib bundle from '${lualibPath}'`);
        }
    }

    return luaLibBundleContent;
}
