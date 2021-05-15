import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";
import { SourceNode } from "source-map";

const resolver = resolve.ResolverFactory.createResolver({
    extensions: [".lua", ".ts"],
    fileSystem: { ...new resolve.CachedInputFileSystem(fs) },
    useSyncFileSystemCalls: true,
});

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ProcessedFile[] {
    const outFiles = [];

    for (const file of files) {
        outFiles.push(file, ...resolveFileDependencies(file, program.getCommonSourceDirectory(), emitHost));
    }

    return outFiles;
}

function resolveFileDependencies(file: ProcessedFile, rootDir: string, emitHost: EmitHost): ProcessedFile[] {
    const fileDir = path.dirname(file.fileName);
    const dependencies: ProcessedFile[] = [];
    for (const required of findRequiredPaths(file.code)) {
        // Try to resolve the import starting from the directory `file` is in
        const resolvedDependency = resolveDependency(fileDir, required);
        if (resolvedDependency) {
            // If dependency resolved successfully, read its content
            const dependencyContent = emitHost.readFile(resolvedDependency);
            if (dependencyContent === undefined) {
                throw `TODO: FAILED TO READ ${resolvedDependency}`;
            }

            // Figure out resolved require path and dependency  output path
            let resolvedRequire = path.relative(fileDir, resolvedDependency);
            let dependencyOutPath = resolvedDependency;
            if (resolvedRequire.includes("..")) {
                // If the resolved require includes a parent, copy the dependency to a new path
                // to avoid require paths with parent directories
                resolvedRequire = path.relative(rootDir, resolvedDependency);
                dependencyOutPath = path.join(fileDir, resolvedRequire);
            }

            replaceRequireInCode(file, required, resolvedRequire);
            replaceRequireInSourceMap(file, required, resolvedRequire);

            // Add dependency to output and resolve its dependencies recursively
            const dependency = {
                fileName: dependencyOutPath,
                code: dependencyContent,
            };
            dependencies.push(dependency, ...resolveFileDependencies(dependency, rootDir, emitHost));
        } else {
            //throw `TODO: COULD NOT RESOLVE ${required}`;
        }
    }
    return dependencies;
}

function replaceRequireInCode(file: ProcessedFile, originalRequire: string, newRequire: string) {
    const requirePath = newRequire.replace(".lua", "").replace(/\\/g, ".");
    file.code = file.code.replace(`require("${originalRequire}")`, `require("${requirePath}")`);
}

function replaceRequireInSourceMap(file: ProcessedFile, originalRequire: string, newRequire: string) {
    const requirePath = newRequire.replace(".lua", "").replace(/\\/g, ".");
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

function resolveDependency(fromDirectory: string, dependency: string): string | undefined {
    try {
        const resolveResult = resolver.resolveSync({}, fromDirectory, dependency.replace(".", "/"));
        if (resolveResult) {
            return resolveResult;
        }
    } catch {
        // resolveSync errors if it fails to resolve
    }

    return undefined;
}
