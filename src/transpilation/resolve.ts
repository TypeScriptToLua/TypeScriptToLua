import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";
import { SourceNode } from "source-map";
import { getEmitPathRelativeToOutDir, getProjectRoot, getSourceDir } from "./transpiler";
import { formatPathToLuaPath, normalizeSlashes, trimExtension } from "../utils";
import { couldNotReadDependency, couldNotResolveRequire } from "./diagnostics";
import { BuildMode, CompilerOptions } from "../CompilerOptions";

const resolver = resolve.ResolverFactory.createResolver({
    extensions: [".lua"],
    enforceExtension: true, // Resolved file must be a lua file
    fileSystem: { ...new resolve.CachedInputFileSystem(fs) },
    useSyncFileSystemCalls: true,
});

interface ResolutionResult {
    resolvedFiles: ProcessedFile[];
    diagnostics: ts.Diagnostic[];
}

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ResolutionResult {
    const outFiles: ProcessedFile[] = [...files];
    const diagnostics: ts.Diagnostic[] = [];
    const options = program.getCompilerOptions() as CompilerOptions;

    // Resolve dependencies for all processed files
    for (const file of files) {
        if (options.tstlVerbose) {
            console.log(`Resolving dependencies for ${normalizeSlashes(file.fileName)}`);
        }

        const resolutionResult = resolveFileDependencies(file, program, emitHost);
        outFiles.push(...resolutionResult.resolvedFiles);
        diagnostics.push(...resolutionResult.diagnostics);
    }

    return { resolvedFiles: outFiles, diagnostics };
}

function resolveFileDependencies(file: ProcessedFile, program: ts.Program, emitHost: EmitHost): ResolutionResult {
    const dependencies: ProcessedFile[] = [];
    const diagnostics: ts.Diagnostic[] = [];
    const options = program.getCompilerOptions() as CompilerOptions;

    for (const required of findRequiredPaths(file.code)) {
        // Do no resolve lualib
        if (required === "lualib_bundle") {
            continue;
        }

        // Do not resolve noResolution paths
        if (required.startsWith("@NoResolution:")) {
            const path = required.replace("@NoResolution:", "");
            replaceRequireInCode(file, required, path);
            replaceRequireInSourceMap(file, required, path);
            continue;
        }

        // Try to resolve the import starting from the directory `file` is in
        const fileDir = path.dirname(file.fileName);
        const resolvedDependency = resolveDependency(fileDir, required, program, emitHost);
        if (resolvedDependency) {
            if (options.tstlVerbose) {
                console.log(`Resolved ${required} to ${normalizeSlashes(resolvedDependency)}`);
            }

            // Figure out resolved require path and dependency output path
            const resolvedRequire = getEmitPathRelativeToOutDir(resolvedDependency, program);

            if (shouldRewriteRequires(resolvedDependency, program)) {
                replaceRequireInCode(file, required, resolvedRequire);
                replaceRequireInSourceMap(file, required, resolvedRequire);
            }

            // If dependency is not part of project, add dependency to output and resolve its dependencies recursively
            if (shouldIncludeDependency(resolvedDependency, program)) {
                // If dependency resolved successfully, read its content
                const dependencyContent = emitHost.readFile(resolvedDependency);
                if (dependencyContent === undefined) {
                    diagnostics.push(couldNotReadDependency(resolvedDependency));
                    continue;
                }

                const dependency = {
                    fileName: resolvedDependency,
                    code: dependencyContent,
                };
                const nestedDependencies = resolveFileDependencies(dependency, program, emitHost);
                dependencies.push(dependency, ...nestedDependencies.resolvedFiles);
                diagnostics.push(...nestedDependencies.diagnostics);
            }
        } else {
            // Could not resolve dependency, add a diagnostic and make some fallback path
            diagnostics.push(couldNotResolveRequire(required, path.relative(getProjectRoot(program), file.fileName)));

            const fallbackRequire = fallbackResolve(required, getSourceDir(program), fileDir);
            replaceRequireInCode(file, required, fallbackRequire);
            replaceRequireInSourceMap(file, required, fallbackRequire);
        }
    }
    return { resolvedFiles: dependencies, diagnostics };
}

function resolveDependency(
    fileDirectory: string,
    dependency: string,
    program: ts.Program,
    emitHost: EmitHost
): string | undefined {
    const options = program.getCompilerOptions() as CompilerOptions;
    if (options.tstlVerbose) {
        console.log(`Resolving "${dependency}" from ${normalizeSlashes(fileDirectory)}`);
    }

    // Check if file is a file in the project
    const resolvedPath = path.join(fileDirectory, dependency);

    const possibleProjectFiles = [
        resolvedPath, // JSON files need their extension as part of the import path, caught by this branch,
        resolvedPath + ".ts", // Regular ts file
        path.join(resolvedPath, "index.ts"), // Index ts file,
        resolvedPath + ".tsx", // tsx file
        path.join(resolvedPath, "index.tsx"), // tsx index
    ];

    for (const possibleFile of possibleProjectFiles) {
        if (isProjectFile(possibleFile, program)) {
            return possibleFile;
        }
    }

    // Check if this is a sibling of a required lua file
    const luaFilePath = path.resolve(fileDirectory, dependency + ".lua");
    if (emitHost.fileExists(luaFilePath)) {
        return luaFilePath;
    }

    // Not a TS file in our project sources, use resolver to check if we can find dependency
    try {
        const resolveResult = resolver.resolveSync({}, fileDirectory, dependency);
        if (resolveResult) {
            return resolveResult;
        }
    } catch (e) {
        // resolveSync errors if it fails to resolve
    }

    return undefined;
}

function shouldRewriteRequires(resolvedDependency: string, program: ts.Program) {
    return !isNodeModulesFile(resolvedDependency) || !isBuildModeLibrary(program);
}

function shouldIncludeDependency(resolvedDependency: string, program: ts.Program) {
    // Never include lua files (again) that are transpiled from project sources
    if (!hasSourceFileInProject(resolvedDependency, program)) {
        // Always include lua files not in node_modules (internal lua sources)
        if (!isNodeModulesFile(resolvedDependency)) {
            return true;
        } else {
            // Only include node_modules files if not in library mode
            return !isBuildModeLibrary(program);
        }
    }
    return false;
}

function isBuildModeLibrary(program: ts.Program) {
    return program.getCompilerOptions().buildMode === BuildMode.Library;
}

function findRequiredPaths(code: string): string[] {
    // Find all require("<path>") paths in a lua code string
    const paths: string[] = [];
    const pattern = /require\("(.+)"\)/g;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code))) {
        paths.push(match[1]);
    }

    return paths;
}

function replaceRequireInCode(file: ProcessedFile, originalRequire: string, newRequire: string): void {
    const requirePath = formatPathToLuaPath(newRequire.replace(".lua", ""));
    file.code = file.code.replace(`require("${originalRequire}")`, `require("${requirePath}")`);
}

function replaceRequireInSourceMap(file: ProcessedFile, originalRequire: string, newRequire: string): void {
    const requirePath = formatPathToLuaPath(newRequire.replace(".lua", ""));
    if (file.sourceMapNode) {
        replaceInSourceMap(file.sourceMapNode, file.sourceMapNode, `"${originalRequire}"`, `"${requirePath}"`);
    }
}

function replaceInSourceMap(node: SourceNode, parent: SourceNode, require: string, resolvedRequire: string): boolean {
    if ((!node.children || node.children.length === 0) && node.toString() === require) {
        parent.children = [new SourceNode(node.line, node.column, node.source, [resolvedRequire])];
        return true; // Stop after finding the first occurrence
    }

    if (node.children) {
        for (const c of node.children) {
            if (replaceInSourceMap(c, node, require, resolvedRequire)) {
                return true; // Occurrence found in one of the children
            }
        }
    }

    return false; // Did not find the require
}

function isNodeModulesFile(filePath: string): boolean {
    return path
        .normalize(filePath)
        .split(path.sep)
        .some(p => p === "node_modules");
}

function isProjectFile(file: string, program: ts.Program): boolean {
    return program.getSourceFile(file) !== undefined;
}

function hasSourceFileInProject(filePath: string, program: ts.Program) {
    const pathWithoutExtension = trimExtension(filePath);
    return (
        isProjectFile(pathWithoutExtension + ".ts", program) ||
        isProjectFile(pathWithoutExtension + ".tsx", program) ||
        isProjectFile(pathWithoutExtension + ".json", program)
    );
}

// Transform an import path to a lua require that is probably not correct, but can be used as fallback when regular resolution fails
function fallbackResolve(required: string, sourceRootDir: string, fileDir: string): string {
    return formatPathToLuaPath(
        path
            .normalize(path.join(path.relative(sourceRootDir, fileDir), required))
            .split(path.sep)
            .filter(s => s !== "." && s !== "..")
            .join(path.sep)
    );
}
