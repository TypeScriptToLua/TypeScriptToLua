import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";
import { SourceNode } from "source-map";

const resolver = resolve.ResolverFactory.createResolver({
    extensions: [".lua"],
    fileSystem: { ...new resolve.CachedInputFileSystem(fs) },
    useSyncFileSystemCalls: true,
});

export function resolveDependencies(program: ts.Program, files: ProcessedFile[], emitHost: EmitHost): ProcessedFile[] {
    const outFiles = [];

    for (const file of files) {
        outFiles.push(file, ...resolveFileDependencies(file, program.getCompilerOptions().rootDir ?? program.getCommonSourceDirectory(), emitHost));
    }

    return outFiles;
}

function resolveFileDependencies(file: ProcessedFile, projectRootDir: string, emitHost: EmitHost): ProcessedFile[] {
    const dependencies: ProcessedFile[] = [];
    for (const required of findRequiredPaths(file.code)) {
        // Do no resolve lualib
        if (required === "lualib_bundle") {
            continue;
        }
        
        // Try to resolve the import starting from the directory `file` is in
        const fileDir = path.dirname(file.fileName);
        const resolvedDependency = resolveDependency(fileDir, projectRootDir, required, emitHost);
        if (resolvedDependency) {
            // If dependency resolved successfully, read its content
            const dependencyContent = emitHost.readFile(resolvedDependency);
            if (dependencyContent === undefined) {
                throw `TODO: FAILED TO READ ${resolvedDependency}`;
            }

            // Figure out resolved require path and dependency  output path
            const resolvedRequire = path.relative(projectRootDir, resolvedDependency);

            replaceRequireInCode(file, required, resolvedRequire);
            replaceRequireInSourceMap(file, required, resolvedRequire);

            // Add dependency to output and resolve its dependencies recursively
            const dependency = {
                fileName: resolvedDependency,
                code: dependencyContent,
            };
            dependencies.push(dependency, ...resolveFileDependencies(dependency, projectRootDir, emitHost));
        } else {
            //throw `TODO: COULD NOT RESOLVE ${required}`;
            console.error(`Failed to resolve ${required} referenced in ${file.fileName}.`);
            console.error(projectRootDir);
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

function resolveDependency(fileDirectory: string, rootDirectory: string, dependency: string, emitHost: EmitHost): string | undefined {
    // Check if 
    const dependencyPath = dependency.replace(".", "/");
    const projectFilePath = path.join(fileDirectory, dependencyPath + ".ts");
    if (emitHost.fileExists(projectFilePath)) {
        return projectFilePath;
    }

    const projectIndexPath = path.join(fileDirectory, dependencyPath, "index.ts");
    if (emitHost.fileExists(projectIndexPath)) {
        return projectIndexPath;
    }

    try {
        const resolveResult = resolver.resolveSync({}, rootDirectory, dependencyPath);
        if (resolveResult) {
            return resolveResult;
        }
    } catch (e) {
        // resolveSync errors if it fails to resolve
    }

    return undefined;
}
