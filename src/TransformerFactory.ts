import { LuaTransformer51 } from "./targets/LuaTransformer.51";
import { LuaTransformer52 } from "./targets/LuaTransformer.52";
import { LuaTransformer53 } from "./targets/LuaTransformer.53";
import { LuaTransformerJIT } from "./targets/LuaTransformer.JIT";

import { LuaTransformer } from "./LuaTransformer";
import { CompilerOptions, LuaTarget } from "./CompilerOptions";

import * as ts from "typescript";

export function createTransformer(program: ts.Program): LuaTransformer {
    const options = program.getCompilerOptions() as CompilerOptions; 

    const target = options.luaTarget ? options.luaTarget.toLowerCase() : "";

    let luaTargetTransformer: LuaTransformer;

    switch (target) {
    case LuaTarget.Lua51:
        luaTargetTransformer = new LuaTransformer51(program);
        break;
    case LuaTarget.Lua52:
        luaTargetTransformer = new LuaTransformer52(program);
        break;
    case LuaTarget.Lua53:
        luaTargetTransformer = new LuaTransformer53(program);
        break;
    default:
        luaTargetTransformer = new LuaTransformerJIT(program);
        break;
    }

    return luaTargetTransformer;
}
