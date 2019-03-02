import * as fs from "fs";
import * as path from "path";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
    ArrayFindIndex = "ArrayFindIndex",
    ArrayIndexOf = "ArrayIndexOf",
    ArrayMap = "ArrayMap",
    ArrayPush = "ArrayPush",
    ArrayReverse = "ArrayReverse",
    ArrayShift = "ArrayShift",
    ArrayUnshift = "ArrayUnshift",
    ArraySort = "ArraySort",
    ArraySlice = "ArraySlice",
    ArraySome = "ArraySome",
    ArraySplice = "ArraySplice",
    ClassIndex = "ClassIndex",
    ClassNewIndex = "ClassNewIndex",
    FunctionApply = "FunctionApply",
    FunctionBind = "FunctionBind",
    FunctionCall = "FunctionCall",
    Index = "Index",
    InstanceOf = "InstanceOf",
    Iterator = "Iterator",
    Map = "Map",
    NewIndex = "NewIndex",
    ObjectAssign = "ObjectAssign",
    ObjectEntries = "ObjectEntries",
    ObjectKeys = "ObjectKeys",
    ObjectValues = "ObjectValues",
    Set = "Set",
    WeakMap = "WeakMap",
    WeakSet = "WeakSet",
    StringReplace = "StringReplace",
    StringSplit = "StringSplit",
    StringConcat = "StringConcat",
    Symbol = "Symbol",
    SymbolRegistry = "SymbolRegistry",
}

const luaLibDependencies: {[lib in LuaLibFeature]?: LuaLibFeature[]} = {
    Iterator: [LuaLibFeature.Symbol],
    Map: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Set: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakMap: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakSet: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    SymbolRegistry: [LuaLibFeature.Symbol],
};

export class LuaLib {
    public static loadFeatures(features: Iterable<LuaLibFeature>): string {
        let result = "";

        const loadedFeatures = new Set<LuaLibFeature>();

        function load(feature: LuaLibFeature): void {
            if (!loadedFeatures.has(feature)) {
                loadedFeatures.add(feature);
                if (luaLibDependencies[feature]) {
                    luaLibDependencies[feature].forEach(load);
                }
                const featureFile = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
                result += fs.readFileSync(featureFile).toString() + "\n";
            }
        }

        for (const feature of features) {
            load(feature);
        }
        return result;
    }
}
