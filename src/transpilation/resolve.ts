import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";
import { SourceNode } from "source-map";
import { getEmitPathRelativeToOutDir, getProjectRoot, getSourceDir } from "./transpiler";
import { formatPathToLuaPath } from "../utils";
import { couldNotReadDependency, couldNotResolveRequire } from "./diagnostics";

const resolver = resolve.ResolverFactory.createResolver({
    extensions: [".lua"],
    enforceExtension: true, // Must be a lua file
    fileSystem: { ...new resolve.CachedInputFileSystem(fs) },
    useSyncFileSystemCalls: true,
});

const projectFiles = new Map<string, string>();

interface ResolutionResult {
    resolvedFiles: ProcessedFile[];
    diagnostics: ts.Diagnostic[];
}

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ResolutionResult {
    const outFiles: ProcessedFile[] = [];
    const diagnostics: ts.Diagnostic[] = [];

    const projectRoot = getProjectRoot(program);
    for (const sourceFile of program.getSourceFiles()) {
        const filePath = path.isAbsolute(sourceFile.fileName)
            ? path.normalize(sourceFile.fileName)
            : path.resolve(projectRoot, sourceFile.fileName);
        projectFiles.set(filePath, sourceFile.text);
    }

    for (const file of files) {
        const resolutionResult = resolveFileDependencies(file, program, emitHost);
        outFiles.push(file, ...resolutionResult.resolvedFiles);
        diagnostics.push(...resolutionResult.diagnostics);
    }

    return { resolvedFiles: outFiles, diagnostics };
}

function resolveFileDependencies(file: ProcessedFile, program: ts.Program, emitHost: EmitHost): ResolutionResult {
    const projectRootDir = getSourceDir(program);
    const dependencies: ProcessedFile[] = [];
    const diagnostics: ts.Diagnostic[] = [];
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
        const resolvedDependency = resolveDependency(fileDir, projectRootDir, required);
        if (resolvedDependency) {
            // If dependency resolved successfully, read its content
            const dependencyContent = projectFiles.get(resolvedDependency) ?? emitHost.readFile(resolvedDependency);
            if (dependencyContent === undefined) {
                diagnostics.push(couldNotReadDependency(resolvedDependency));
                continue;
            }

            // Figure out resolved require path and dependency output path
            const resolvedRequire = getEmitPathRelativeToOutDir(resolvedDependency, program);

            replaceRequireInCode(file, required, resolvedRequire);
            replaceRequireInSourceMap(file, required, resolvedRequire);

            // If dependency is not part of sources, add dependency to output and resolve its dependencies recursively
            if (!projectFiles.has(resolvedDependency)) {
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

function replaceRequireInCode(file: ProcessedFile, originalRequire: string, newRequire: string) {
    const requirePath = formatPathToLuaPath(newRequire.replace(".lua", ""));
    file.code = file.code.replace(`require("${originalRequire}")`, `require("${requirePath}")`);
}

function replaceRequireInSourceMap(file: ProcessedFile, originalRequire: string, newRequire: string) {
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

function findRequiredPaths(code: string): string[] {
    // Find all require("<path>") paths in the code
    const paths: string[] = [];
    const pattern = /require\("(.+)"\)/g;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code))) {
        paths.push(match[1]);
    }

    return paths;
}

function resolveDependency(fileDirectory: string, rootDirectory: string, dependency: string): string | undefined {
    // Check if file is a TS file in the project
    const resolvedPath = path.resolve(fileDirectory, dependency);

    const resolvedFile = resolvedPath + ".ts";
    if (projectFiles.has(resolvedFile)) {
        return resolvedFile;
    }

    const projectIndexPath = path.resolve(resolvedPath, "index.ts");
    if (projectFiles.has(projectIndexPath)) {
        return projectIndexPath;
    }

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
