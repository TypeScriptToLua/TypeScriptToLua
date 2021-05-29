import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";
import { SourceNode } from "source-map";
import { getEmitPathRelativeToOutDir, getProjectRoot, getSourceDir } from "./transpiler";
import { formatPathToLuaPath } from "../utils";
import { couldNotReadDependency, couldNotResolveRequire } from "./diagnostics";
import { CompileMode } from "../CompilerOptions";

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

// Cache for getting source files from the program
const projectFileCache = new Set<string>();
function isProjectFile(file: string): boolean {
    // Check if file is in the project ts.program
    return projectFileCache.has(path.normalize(file));
}

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ResolutionResult {
    const outFiles: ProcessedFile[] = [...files];
    const diagnostics: ts.Diagnostic[] = [];

    // Add files to project cache
    const projectRoot = getProjectRoot(program);
    for (const sourceFile of program.getSourceFiles()) {
        const filePath = path.isAbsolute(sourceFile.fileName)
            ? path.normalize(sourceFile.fileName)
            : path.resolve(projectRoot, sourceFile.fileName);
        projectFileCache.add(filePath);
    }

    // Resolve dependencies for all processed files
    for (const file of files) {
        const resolutionResult = resolveFileDependencies(file, program, emitHost);
        outFiles.push(...resolutionResult.resolvedFiles);
        diagnostics.push(...resolutionResult.diagnostics);
    }

    return { resolvedFiles: outFiles, diagnostics };
}

function resolveFileDependencies(file: ProcessedFile, program: ts.Program, emitHost: EmitHost): ResolutionResult {
    const dependencies: ProcessedFile[] = [];
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions();
    const projectRootDir = getSourceDir(program);

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
        const resolvedDependency = resolveDependency(fileDir, projectRootDir, required, emitHost);
        if (resolvedDependency) {
            // Figure out resolved require path and dependency output path
            const resolvedRequire = getEmitPathRelativeToOutDir(resolvedDependency, program);

            if (!isExternalDependencyFile(resolvedDependency, program) || options.compileMode !== CompileMode.Library) {
                replaceRequireInCode(file, required, resolvedRequire);
                replaceRequireInSourceMap(file, required, resolvedRequire);
            }

            // If dependency is not part of project, add dependency to output and resolve its dependencies recursively
            if (
                (isExternalDependencyFile(resolvedDependency, program) &&
                    options.compileMode !== CompileMode.Library) ||
                resolvedDependency.endsWith(".lua")
            ) {
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
            diagnostics.push(couldNotResolveRequire(required, path.relative(projectRootDir, file.fileName)));

            const fallbackRequire = fallbackResolve(required, projectRootDir, fileDir);
            replaceRequireInCode(file, required, fallbackRequire);
            replaceRequireInSourceMap(file, required, fallbackRequire);
        }
    }
    return { resolvedFiles: dependencies, diagnostics };
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

function resolveDependency(
    fileDirectory: string,
    rootDirectory: string,
    dependency: string,
    emitHost: EmitHost
): string | undefined {
    // Check if file is a file in the project
    const resolvedPath = path.resolve(fileDirectory, dependency);

    if (isProjectFile(resolvedPath)) {
        // JSON files need their extension as part of the import path, caught by this branch
        return resolvedPath;
    }

    const resolvedFile = resolvedPath + ".ts";
    if (isProjectFile(resolvedFile)) {
        return resolvedFile;
    }

    const projectIndexPath = path.resolve(resolvedPath, "index.ts");
    if (isProjectFile(projectIndexPath)) {
        return projectIndexPath;
    }

    // Check if this is a sibling of a required lua file
    const luaFilePath = path.resolve(fileDirectory, dependency + ".lua");
    if (emitHost.fileExists(luaFilePath)) {
        return luaFilePath;
    }

    // Not a TS file in our project sources, use resolver to check if we can find dependency
    try {
        const resolveResult = resolver.resolveSync({}, rootDirectory, dependency);
        if (resolveResult) {
            return resolveResult;
        }
    } catch (e) {
        // resolveSync errors if it fails to resolve
    }

    return undefined;
}

function isExternalDependencyFile(filePath: string, program: ts.Program) {
    const inSourceRoot = filePath.includes(path.normalize(getSourceDir(program)));
    const inNodeModules = filePath.split(path.sep).some(p => p === "node_modules");

    return !inSourceRoot || inNodeModules;
}

// Transform an import path to a lua require that is probably not correct, but can be used as fallback when regular resolution fails
function fallbackResolve(required: string, projectRootDir: string, fileDir: string): string {
    return formatPathToLuaPath(
        path
            .normalize(path.join(path.relative(projectRootDir, fileDir), required))
            .split(path.sep)
            .filter(s => s !== "." && s !== "..")
            .join(path.sep)
    );
}
