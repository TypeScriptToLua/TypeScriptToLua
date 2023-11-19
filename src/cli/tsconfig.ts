import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, TypeScriptToLuaOptions } from "../CompilerOptions";
import { normalizeSlashes } from "../utils";
import * as cliDiagnostics from "./diagnostics";
import { ParsedCommandLine, updateParsedConfigFile } from "./parse";

export function locateConfigFile(commandLine: ParsedCommandLine): ts.Diagnostic | string | undefined {
    const { project } = commandLine.options;
    if (!project) {
        if (commandLine.fileNames.length > 0) {
            return undefined;
        }

        const searchPath = normalizeSlashes(process.cwd());
        return ts.findConfigFile(searchPath, ts.sys.fileExists);
    }

    if (commandLine.fileNames.length !== 0) {
        return cliDiagnostics.optionProjectCannotBeMixedWithSourceFilesOnACommandLine();
    }

    // TODO: Unlike tsc, this resolves `.` to absolute path
    const fileOrDirectory = normalizeSlashes(path.resolve(process.cwd(), project));
    if (ts.sys.directoryExists(fileOrDirectory)) {
        const configFileName = path.posix.join(fileOrDirectory, "tsconfig.json");
        if (ts.sys.fileExists(configFileName)) {
            return configFileName;
        } else {
            return cliDiagnostics.cannotFindATsconfigJsonAtTheSpecifiedDirectory(project);
        }
    } else if (ts.sys.fileExists(fileOrDirectory)) {
        return fileOrDirectory;
    } else {
        return cliDiagnostics.theSpecifiedPathDoesNotExist(project);
    }
}

export function parseConfigFileWithSystem(
    configFileName: string,
    commandLineOptions?: CompilerOptions,
    system = ts.sys
): ParsedCommandLine {
    const configRootDir = path.dirname(configFileName);
    const parsedConfigFile = ts.parseJsonSourceFileConfigFileContent(
        ts.readJsonConfigFile(configFileName, system.readFile),
        system,
        configRootDir,
        commandLineOptions,
        configFileName
    );

    const cycleCache = new Set<string>();
    const extendedTstlOptions = getExtendedTstlOptions(configFileName, configRootDir, cycleCache, system);

    parsedConfigFile.raw.tstl = Object.assign(extendedTstlOptions, parsedConfigFile.raw.tstl ?? {});

    return updateParsedConfigFile(parsedConfigFile);
}

function resolveNpmModuleConfig(
    moduleName: string,
    configRootDir: string,
    host: ts.ModuleResolutionHost
): string | undefined {
    const resolved = ts.nodeNextJsonConfigResolver(moduleName, path.join(configRootDir, "tsconfig.json"), host);
    if (resolved.resolvedModule) {
        return resolved.resolvedModule.resolvedFileName;
    }
}

function getExtendedTstlOptions(
    configFilePath: string,
    configRootDir: string,
    cycleCache: Set<string>,
    system: ts.System
): TypeScriptToLuaOptions {
    const absolutePath = ts.pathIsAbsolute(configFilePath)
        ? configFilePath
        : ts.pathIsRelative(configFilePath)
        ? path.resolve(configRootDir, configFilePath)
        : resolveNpmModuleConfig(configFilePath, configRootDir, system); // if a path is neither relative nor absolute, it is probably a npm module

    if (!absolutePath) {
        return {};
    }

    const newConfigRoot = path.dirname(absolutePath);

    if (cycleCache.has(absolutePath)) {
        return {};
    }

    cycleCache.add(absolutePath);
    const fileContent = system.readFile(absolutePath);
    const options = {};

    if (fileContent) {
        const { config: parsedConfig } = ts.parseConfigFileTextToJson(configFilePath, fileContent) as {
            config?: {
                extends?: string | string[];
                tstl?: TypeScriptToLuaOptions;
            };
        };

        if (!parsedConfig) {
            return {};
        }

        if (parsedConfig.extends) {
            if (Array.isArray(parsedConfig.extends)) {
                for (const extendedConfigFile of parsedConfig.extends) {
                    Object.assign(
                        options,
                        getExtendedTstlOptions(extendedConfigFile, newConfigRoot, cycleCache, system)
                    );
                }
            } else {
                Object.assign(options, getExtendedTstlOptions(parsedConfig.extends, newConfigRoot, cycleCache, system));
            }
        }

        if (parsedConfig.tstl) {
            Object.assign(options, parsedConfig.tstl);
        }
    }

    return options;
}

export function createConfigFileUpdater(
    optionsToExtend: CompilerOptions
): (options: ts.CompilerOptions) => ts.Diagnostic[] {
    const configFileMap = new WeakMap<ts.TsConfigSourceFile, ts.ParsedCommandLine>();
    return options => {
        const { configFile, configFilePath } = options;
        if (!configFile || !configFilePath) return [];

        if (!configFileMap.has(configFile)) {
            const parsedConfigFile = updateParsedConfigFile(
                ts.parseJsonSourceFileConfigFileContent(
                    configFile,
                    ts.sys,
                    path.dirname(configFilePath),
                    optionsToExtend,
                    configFilePath
                )
            );

            configFileMap.set(configFile, parsedConfigFile);
        }

        const parsedConfigFile = configFileMap.get(configFile)!;
        Object.assign(options, parsedConfigFile.options);
        return parsedConfigFile.errors;
    };
}
