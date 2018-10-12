export {
    CompilerOptions,
    parseCommandLine
} from "./CommandLineParser";

export {
    compile,
    compileFilesWithOptions,
    createTranspiler,
    transpileFile,
    transpileString,
    watchWithOptions
} from "./Compiler";

export {LuaTranspiler51} from "./targets/Transpiler.51";
export {LuaTranspiler52} from "./targets/Transpiler.52";
export {LuaTranspiler53} from "./targets/Transpiler.53";
export {LuaTranspilerJIT} from "./targets/Transpiler.JIT";

export {
    LuaLibFeature,
    LuaLibImportKind,
    LuaTarget,
    LuaTranspiler
} from "./Transpiler";
