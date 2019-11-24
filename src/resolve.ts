import * as path from "path";
import * as ts from "typescript";
import { normalizeSlashes } from "./utils";

export const resolveFromRootDir = (program: ts.Program, pathToResolve: string) =>
    path.isAbsolute(pathToResolve)
        ? normalizeSlashes(pathToResolve)
        : normalizeSlashes(path.resolve(program.getCommonSourceDirectory(), pathToResolve));
