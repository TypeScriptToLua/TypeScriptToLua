import * as fs from "fs";
import * as path from "path";

export enum LuaLibFeature {
    ArrayConcat = "ArrayConcat",
    ArrayEvery = "ArrayEvery",
    ArrayFilter = "ArrayFilter",
    ArrayForEach = "ArrayForEach",
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
    FunctionApply = "FunctionApply",
    FunctionBind = "FunctionBind",
    FunctionCall = "FunctionCall",
    InstanceOf = "InstanceOf",
    Iterator = "Iterator",
    Map = "Map",
    Set = "Set",
    StringReplace = "StringReplace",
    StringSplit = "StringSplit",
    Symbol = "Symbol",
    Ternary = "Ternary",
}

const luaLibDependencies: { [lib in LuaLibFeature]?: LuaLibFeature[] } = {
    Iterator: [LuaLibFeature.Symbol],
    Map: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Set: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
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
