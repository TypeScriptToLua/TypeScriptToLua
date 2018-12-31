export {
    parseCommandLine
} from "./CommandLineParser";

export {
    CompilerOptions,
    LuaLibImportKind,
    LuaTarget,
} from "./CompilerOptions";

export {
    compile,
    compileFilesWithOptions,
    transpileString,
    watchWithOptions
} from "./Compiler";

export {LuaTransformer51} from "./targets/LuaTransformer.51";
export {LuaTransformer52} from "./targets/LuaTransformer.52";
export {LuaTransformer53} from "./targets/LuaTransformer.53";
export {LuaTransformerJIT} from "./targets/LuaTransformer.JIT";

export {
    LuaTranspiler,
} from "./LuaTranspiler";

export {
    LuaLibFeature,
} from "./LuaLibFeature";

export {
    createTransformer
} from "./TransformerFactory";
