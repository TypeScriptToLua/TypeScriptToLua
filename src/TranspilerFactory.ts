import { LuaTranspiler51 } from "./targets/Transpiler.51";
import { LuaTranspiler52 } from "./targets/Transpiler.52";
import { LuaTranspiler53 } from "./targets/Transpiler.53";
import { LuaTranspilerJIT } from "./targets/Transpiler.JIT";

import { LuaTarget, LuaTranspiler } from "./Transpiler";

import { CompilerOptions } from "./CompilerOptions";

import * as ts from "typescript";

export function createTranspiler(
    checker: ts.TypeChecker, options: CompilerOptions,
    sourceFile: ts.SourceFile): LuaTranspiler {
  let luaTargetTranspiler: LuaTranspiler;
  const target = options.luaTarget ? options.luaTarget.toLowerCase() : "";
  switch (target) {
    case LuaTarget.Lua51:
      luaTargetTranspiler = new LuaTranspiler51(checker, options, sourceFile);
      break;
    case LuaTarget.Lua52:
      luaTargetTranspiler = new LuaTranspiler52(checker, options, sourceFile);
      break;
    case LuaTarget.Lua53:
      luaTargetTranspiler = new LuaTranspiler53(checker, options, sourceFile);
      break;
    default:
      luaTargetTranspiler = new LuaTranspilerJIT(checker, options, sourceFile);
      break;
  }

  return luaTargetTranspiler;
}
