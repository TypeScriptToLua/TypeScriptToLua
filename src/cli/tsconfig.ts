import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions } from "../CompilerOptions";
import { normalizeSlashes } from "../utils";
import * as cliDiagnostics from "./diagnostics";
import { ParsedCommandLine, updateParsedConfigFile } from "./parse";

export function locateConfigFile(commandLine: ParsedCommandLine): ts.Diagnostic | string | undefined {
    const { project } = commandLine.options;
    if (!project) {
        if (commandLine.fileNames.length > 0) {
            return undefined;
        }

        const searchPath = normalizeSlashes(ts.sys.getCurrentDirectory());
        return ts.findConfigFile(searchPath, ts.sys.fileExists);
    }

    if (commandLine.fileNames.length !== 0) {
        return cliDiagnostics.optionProjectCannotBeMixedWithSourceFilesOnACommandLine();
    }

    // TODO: Unlike tsc, this resolves `.` to absolute path
    const fileOrDirectory = normalizeSlashes(path.resolve(ts.sys.getCurrentDirectory(), project));
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
    const parsedConfigFile = ts.parseJsonSourceFileConfigFileContent(
        ts.readJsonConfigFile(configFileName, system.readFile),
        system,
        path.dirname(configFileName),
        commandLineOptions,
        configFileName
    );

    return updateParsedConfigFile(parsedConfigFile);
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
