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
    symlinks: false, // Do not resolve symlinks to their original paths (that breaks node_modules detection)
});

interface ResolutionResult {
    resolvedFiles: ProcessedFile[];
    diagnostics: ts.Diagnostic[];
}

class ResolutionContext {
    private resultsCache = new Map<string, ResolutionResult>();
    private noResolvePaths: Set<string>;

    constructor(
        public readonly program: ts.Program,
        public readonly options: CompilerOptions,
        private readonly emitHost: EmitHost
    ) {
        this.noResolvePaths = new Set(options.noResolvePaths);
    }

    public resolve(file: ProcessedFile, required: string): ResolutionResult {
        if (this.noResolvePaths.has(required)) {
            if (this.options.tstlVerbose) {
                console.log(`Skipping module resolution of ${required} as it is in the tsconfig noResolvePaths.`);
            }
            return { resolvedFiles: [], diagnostics: [] };
        }

        const resolvedDependency = resolveDependency(file, required, this.program, this.emitHost);
        if (resolvedDependency) {
            if (this.options.tstlVerbose) {
                console.log(`Resolved ${required} to ${normalizeSlashes(resolvedDependency)}`);
            }

            // Figure out resolved require path and dependency output path
            const resolvedRequire = getEmitPathRelativeToOutDir(resolvedDependency, this.program);

            if (shouldRewriteRequires(resolvedDependency, this.program)) {
                replaceRequireInCode(file, required, resolvedRequire);
                replaceRequireInSourceMap(file, required, resolvedRequire);
            }

            // Check cache to prevent resolving nested dependencies double to break dependency loops
            if (this.resultsCache.has(resolvedDependency)) {
                if (this.options.tstlVerbose) {
                    console.log(`Resolution cache hit for ${normalizeSlashes(resolvedDependency)}`);
                }
                return this.resultsCache.get(resolvedDependency)!;
            }

            // If dependency is not part of project, add dependency to output and resolve its dependencies recursively
            if (shouldIncludeDependency(resolvedDependency, this.program)) {
                // If dependency resolved successfully, read its content
                const dependencyContent = this.emitHost.readFile(resolvedDependency);
                if (dependencyContent === undefined) {
                    return { resolvedFiles: [], diagnostics: [couldNotReadDependency(resolvedDependency)] };
                }

                const dependency = {
                    fileName: resolvedDependency,
                    code: dependencyContent,
                };
                const nestedDependencies = resolveFileDependencies(dependency, this);

                // Cache result and return
                const result = {
                    resolvedFiles: [dependency, ...nestedDependencies.resolvedFiles],
                    diagnostics: [...nestedDependencies.diagnostics],
                };
                this.resultsCache.set(resolvedDependency, result);
                return result;
            } else {
                const result = {
                    resolvedFiles: [],
                    diagnostics: [],
                };
                this.resultsCache.set(resolvedDependency, result);
                return result;
            }
        } else {
            const fallbackRequire = fallbackResolve(required, getSourceDir(this.program), path.dirname(file.fileName));
            replaceRequireInCode(file, required, fallbackRequire);
            replaceRequireInSourceMap(file, required, fallbackRequire);

            return {
                resolvedFiles: [],
                diagnostics: [
                    couldNotResolveRequire(required, path.relative(getProjectRoot(this.program), file.fileName)),
                ],
            };
        }
    }
}

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ResolutionResult {
    const outFiles: ProcessedFile[] = [...files];
    const diagnostics: ts.Diagnostic[] = [];
    const options = program.getCompilerOptions() as CompilerOptions;

    const resolutionContext = new ResolutionContext(program, options, emitHost);

    // Resolve dependencies for all processed files
    for (const file of files) {
        if (options.tstlVerbose) {
            console.log(`Resolving dependencies for ${normalizeSlashes(file.fileName)}`);
        }

        const resolutionResult = resolveFileDependencies(file, resolutionContext);
        outFiles.push(...resolutionResult.resolvedFiles);
        diagnostics.push(...resolutionResult.diagnostics);
    }

    return { resolvedFiles: deduplicateResolvedFiles(outFiles), diagnostics };
}

function deduplicateResolvedFiles(files: ProcessedFile[]): ProcessedFile[] {
    return [...new Map(files.map(f => [f.fileName, f])).values()];
}

function resolveFileDependencies(file: ProcessedFile, context: ResolutionContext): ResolutionResult {
    const dependencies: ProcessedFile[] = [];
    const diagnostics: ts.Diagnostic[] = [];

    for (const required of findRequiredPaths(file.code)) {
        // Do no resolve lualib, unless it is included from node_modules
        if (required === "lualib_bundle" && !isNodeModulesFile(file.fileName)) {
            dependencies.push({ fileName: "lualib_bundle", code: "" });
            continue;
        }

        // Do not resolve noResolution paths
        if (required.startsWith("@NoResolution:")) {
            // Remove @NoResolution prefix if not building in library mode
            if (!isBuildModeLibrary(context.program)) {
                const path = required.replace("@NoResolution:", "");
                replaceRequireInCode(file, required, path);
                replaceRequireInSourceMap(file, required, path);
            }

            // Skip
            continue;
        }

        // Try to resolve the import starting from the directory `file` is in
        const resolvedDependency = context.resolve(file, required);
        dependencies.push(...resolvedDependency.resolvedFiles);
        diagnostics.push(...resolvedDependency.diagnostics);
    }
    return { resolvedFiles: deduplicateResolvedFiles(dependencies), diagnostics };
}

function resolveDependency(
    requiringFile: ProcessedFile,
    dependency: string,
    program: ts.Program,
    emitHost: EmitHost
): string | undefined {
    const options = program.getCompilerOptions() as CompilerOptions;

    const fileDirectory = path.dirname(requiringFile.fileName);
    if (options.tstlVerbose) {
        console.log(`Resolving "${dependency}" from ${normalizeSlashes(requiringFile.fileName)}`);
    }

    // Check if the import is relative
    const isRelative = ["/", "./", "../"].some(p => dependency.startsWith(p));

    // If the import is relative, always resolve it relative to the requiring file
    // If the import is not relative, resolve it relative to options.baseUrl if it is set
    const relativeTo = isRelative ? fileDirectory : options.baseUrl ?? fileDirectory;

    // Check if file is a file in the project
    const resolvedPath = path.join(relativeTo, dependency);

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

    // Check if this is a lua file in the project sources
    const possibleLuaProjectFiles = [
        resolvedPath + ".lua", // lua file in sources
        path.join(resolvedPath, "index.lua"), // lua index file in sources
        path.join(resolvedPath, "init.lua"), // lua looks for <require>/init.lua if it cannot find <require>.lua
    ];

    for (const possibleFile of possibleLuaProjectFiles) {
        if (emitHost.fileExists(possibleFile)) {
            return possibleFile;
        }
    }

    // Check if this is a sibling of a required lua file
    if (requiringFile.fileName.endsWith(".lua")) {
        const luaFilePath = resolveLuaPath(fileDirectory, dependency, emitHost);
        if (luaFilePath) {
            return luaFilePath;
        }
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

function resolveLuaPath(fromPath: string, dependency: string, emitHost: EmitHost) {
    const splitDependency = dependency.split(".");
    if (splitDependency.length === 1) {
        // If dependency has just one part (the file), look for a lua file with that name
        const fileDirectory = walkUpFileTreeUntil(fromPath, dir =>
            emitHost.fileExists(path.join(dir, dependency) + ".lua")
        );
        if (fileDirectory) {
            return path.join(fileDirectory, dependency) + ".lua";
        }
    } else {
        // If dependency has multiple parts, look for the first directory of the require path, which must be in the lua root
        const luaRoot = walkUpFileTreeUntil(fromPath, dir =>
            emitHost.directoryExists(path.join(dir, splitDependency[0]))
        );
        if (luaRoot) {
            return path.join(luaRoot, dependency.replace(/\./g, path.sep)) + ".lua";
        }
    }
}

function walkUpFileTreeUntil(fromDirectory: string, predicate: (dir: string) => boolean) {
    const currentDir = path.normalize(fromDirectory).split(path.sep);
    while (currentDir.length > 0) {
        const dir = currentDir.join(path.sep);
        if (predicate(dir)) {
            return dir;
        }
        currentDir.pop();
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
    const pattern = /(^|\s|;|=)require\("(.+?)"\)/g;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code))) {
        paths.push(match[2]);
    }

    return paths;
}

function replaceRequireInCode(file: ProcessedFile, originalRequire: string, newRequire: string): void {
    const requirePath = formatPathToLuaPath(newRequire.replace(".lua", ""));

    // Escape special characters to prevent the regex from breaking...
    const escapedRequire = originalRequire.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    file.code = file.code.replace(
        new RegExp(`(^|\\s|;|=)require\\("${escapedRequire}"\\)`),
        `$1require("${requirePath}")`
    );
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
