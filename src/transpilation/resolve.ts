import * as path from "path";
import * as resolve from "enhanced-resolve";
import * as ts from "typescript";
import * as fs from "fs";
import { EmitHost, ProcessedFile } from "./utils";

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
        const resolvedDependency = resolveDependency(fileDir, required);
        if (resolvedDependency) {
            const dependencyContent = emitHost.readFile(resolvedDependency);
            if (dependencyContent === undefined) {
                throw `TODO: FAILED TO READ ${resolvedDependency}`;
            }

            let relativePath = path.relative(fileDir, resolvedDependency);
            let outPath = resolvedDependency;
            if (relativePath.includes("..")) {
                relativePath = path.relative(rootDir, resolvedDependency);
                outPath = path.join(fileDir, relativePath);
            }
            const requirePath = relativePath.replace(".lua", "").replace(/\\/g, ".");
            file.code = file.code.replace(`require("${required}")`, `require("${requirePath}")`);

            const dependency = {
                fileName: outPath,
                code: dependencyContent,
            };

            dependencies.push(dependency, ...resolveFileDependencies(dependency, rootDir, emitHost));
        } else {
            //throw `TODO: COULD NOT RESOLVE ${required}`;
        }
    }
    return dependencies;
}

function findRequiredPaths(code: string): string[] {
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
        // TODO
    }

    return undefined;
}
