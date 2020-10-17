import * as path from "path";
import { EmitHost } from "./transpilation";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayFind = "ArrayFind",
    ArrayFindIndex = "ArrayFindIndex",
    ArrayIncludes = "ArrayIncludes",
    ArrayIndexOf = "ArrayIndexOf",
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
    Set = "Set",
    SetDescriptor = "SetDescriptor",
    WeakMap = "WeakMap",
    WeakSet = "WeakSet",
    SourceMapTraceBack = "SourceMapTraceBack",
    Spread = "Spread",
    StringAccess = "StringAccess",
    StringCharAt = "StringCharAt",
    StringCharCodeAt = "StringCharCodeAt",
    StringConcat = "StringConcat",
    StringEndsWith = "StringEndsWith",
    StringPadEnd = "StringPadEnd",
    StringPadStart = "StringPadStart",
    StringReplace = "StringReplace",
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

const luaLibDependencies: Partial<Record<LuaLibFeature, LuaLibFeature[]>> = {
    ArrayFlat: [LuaLibFeature.ArrayConcat],
    ArrayFlatMap: [LuaLibFeature.ArrayConcat],
    Decorate: [LuaLibFeature.CloneDescriptor],
    Delete: [LuaLibFeature.ObjectGetOwnPropertyDescriptors],
    Error: [LuaLibFeature.New, LuaLibFeature.Class],
    FunctionBind: [LuaLibFeature.Unpack],
    Generator: [LuaLibFeature.Symbol],
    InstanceOf: [LuaLibFeature.Symbol],
    Iterator: [LuaLibFeature.Symbol],
    ObjectDefineProperty: [LuaLibFeature.CloneDescriptor, LuaLibFeature.SetDescriptor],
    ObjectFromEntries: [LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Map: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol, LuaLibFeature.Class],
    Set: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol, LuaLibFeature.Class],
    WeakMap: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol, LuaLibFeature.Class],
    WeakSet: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol, LuaLibFeature.Class],
    Spread: [LuaLibFeature.Iterator, LuaLibFeature.Unpack],
    SymbolRegistry: [LuaLibFeature.Symbol],
};

export function loadLuaLibFeatures(features: Iterable<LuaLibFeature>, emitHost: EmitHost): string {
    let result = "";

    const loadedFeatures = new Set<LuaLibFeature>();

    function load(feature: LuaLibFeature): void {
        if (loadedFeatures.has(feature)) return;
        loadedFeatures.add(feature);

        const dependencies = luaLibDependencies[feature];
        if (dependencies) {
            dependencies.forEach(load);
        }

        const featurePath = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
        const luaLibFeature = emitHost.readFile(featurePath);
        if (luaLibFeature !== undefined) {
            result += luaLibFeature + "\n";
        } else {
            throw new Error(`Could not load lualib feature from '${featurePath}'`);
        }
    }

    for (const feature of features) {
        load(feature);
    }

    return result;
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
