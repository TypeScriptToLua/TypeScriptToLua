import * as path from "path";
import * as ts from "typescript";
import { normalizeSlashes } from "./utils";

export function getProjectRootDir(program: ts.Program): string {
    const options = program.getCompilerOptions();
    const projectDir = options.configFilePath
        ? path.dirname(options.configFilePath)
        : program.getCommonSourceDirectory();

    return normalizeSlashes(options.rootDir ? path.resolve(projectDir, options.rootDir) : projectDir);
}

export const resolveFromRootDir = (program: ts.Program, pathToResolve: string) =>
    path.isAbsolute(pathToResolve)
        ? normalizeSlashes(pathToResolve)
        : normalizeSlashes(path.resolve(getProjectRootDir(program), pathToResolve));
