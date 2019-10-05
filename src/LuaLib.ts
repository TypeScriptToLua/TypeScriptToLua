import * as path from "path";
import { EmitHost } from "./Transpile";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayFind = "ArrayFind",
    ArrayFindIndex = "ArrayFindIndex",
    ArrayIndexOf = "ArrayIndexOf",
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
    ClassIndex = "ClassIndex",
    ClassNewIndex = "ClassNewIndex",
    Decorate = "Decorate",
    FunctionApply = "FunctionApply",
    FunctionBind = "FunctionBind",
    FunctionCall = "FunctionCall",
    Index = "Index",
    InstanceOf = "InstanceOf",
    InstanceOfObject = "InstanceOfObject",
    Iterator = "Iterator",
    Map = "Map",
    NewIndex = "NewIndex",
    Number = "Number",
    NumberIsFinite = "NumberIsFinite",
    NumberIsNaN = "NumberIsNaN",
    ObjectAssign = "ObjectAssign",
    ObjectEntries = "ObjectEntries",
    ObjectFromEntries = "ObjectFromEntries",
    ObjectKeys = "ObjectKeys",
    ObjectRest = "ObjectRest",
    ObjectValues = "ObjectValues",
    Set = "Set",
    WeakMap = "WeakMap",
    WeakSet = "WeakSet",
    SourceMapTraceBack = "SourceMapTraceBack",
    Spread = "Spread",
    StringConcat = "StringConcat",
    StringEndsWith = "StringEndsWith",
    StringPadEnd = "StringPadEnd",
    StringPadStart = "StringPadStart",
    StringReplace = "StringReplace",
    StringSplit = "StringSplit",
    StringStartsWith = "StringStartsWith",
    Symbol = "Symbol",
    SymbolRegistry = "SymbolRegistry",
    TypeOf = "TypeOf",
}

const luaLibDependencies: { [lib in LuaLibFeature]?: LuaLibFeature[] } = {
    ArrayFlat: [LuaLibFeature.ArrayConcat],
    ArrayFlatMap: [LuaLibFeature.ArrayConcat],
    InstanceOf: [LuaLibFeature.Symbol],
    Iterator: [LuaLibFeature.Symbol],
    ObjectFromEntries: [LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Map: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Set: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakMap: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakSet: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Spread: [LuaLibFeature.Iterator],
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

        const featureFile = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
        const luaLibFeature = emitHost.readFile(featureFile);
        if (luaLibFeature !== undefined) {
            result += luaLibFeature + "\n";
        } else {
            throw new Error(`Could not read lualib feature ../dist/lualib/${feature}.lua`);
        }
    }

    for (const feature of features) {
        load(feature);
    }

    return result;
}
