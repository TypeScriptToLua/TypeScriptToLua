#!/usr/bin/env node
import * as ts from "typescript";
import * as tstl from ".";
import * as cliDiagnostics from "./cli/diagnostics";
import { getHelpString, versionString } from "./cli/information";
import { parseCommandLine } from "./cli/parse";
import { createDiagnosticReporter } from "./cli/report";
import { createConfigFileUpdater, locateConfigFile, parseConfigFileWithSystem } from "./cli/tsconfig";

function shouldBePretty(options?: ts.CompilerOptions): boolean {
    return options?.pretty === undefined
        ? ts.sys.writeOutputIsTTY !== undefined && ts.sys.writeOutputIsTTY()
        : Boolean(options.pretty);
}

let reportDiagnostic = createDiagnosticReporter(false);
function updateReportDiagnostic(options?: ts.CompilerOptions): void {
    reportDiagnostic = createDiagnosticReporter(shouldBePretty(options));
}

function createWatchStatusReporter(options?: ts.CompilerOptions): ts.WatchStatusReporter {
    return ts.createWatchStatusReporter(ts.sys, shouldBePretty(options));
}

function executeCommandLine(args: string[]): void {
    if (args.length > 0 && args[0].startsWith("-")) {
        const firstOption = args[0].slice(args[0].startsWith("--") ? 2 : 1).toLowerCase();
        if (firstOption === "build" || firstOption === "b") {
            return performBuild(args.slice(1));
        }
    }

    const commandLine = parseCommandLine(args);

    if (commandLine.options.build) {
        reportDiagnostic(cliDiagnostics.optionBuildMustBeFirstCommandLineArgument());
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    // TODO: ParsedCommandLine.errors isn't meant to contain warnings. Once root-level options
    // support would be dropped it should be changed to `commandLine.errors.length > 0`.
    if (commandLine.errors.some(e => e.category === ts.DiagnosticCategory.Error)) {
        commandLine.errors.forEach(reportDiagnostic);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    if (commandLine.options.version) {
        console.log(versionString);
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    if (commandLine.options.help) {
        console.log(versionString);
        console.log(getHelpString());
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    const configFileName = locateConfigFile(commandLine);
    if (typeof configFileName === "object") {
        reportDiagnostic(configFileName);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    const commandLineOptions = commandLine.options;
    if (configFileName) {
        const configParseResult = parseConfigFileWithSystem(configFileName, commandLineOptions);

        updateReportDiagnostic(configParseResult.options);
        if (configParseResult.options.watch) {
            createWatchOfConfigFile(configFileName, commandLineOptions);
        } else {
            performCompilation(
                configParseResult.fileNames,
                configParseResult.projectReferences,
                configParseResult.options,
                ts.getConfigFileParsingDiagnostics(configParseResult)
            );
        }
    } else {
        updateReportDiagnostic(commandLineOptions);
        if (commandLineOptions.watch) {
            createWatchOfFilesAndCompilerOptions(commandLine.fileNames, commandLineOptions);
        } else {
            performCompilation(commandLine.fileNames, commandLine.projectReferences, commandLineOptions);
        }
    }
}

function performBuild(_args: string[]): void {
    console.log("Option '--build' is not supported.");
    return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
}

function performCompilation(
    rootNames: string[],
    projectReferences: readonly ts.ProjectReference[] | undefined,
    options: tstl.CompilerOptions,
    configFileParsingDiagnostics?: readonly ts.Diagnostic[]
): void {
    const program = ts.createProgram({
        rootNames,
        options,
        projectReferences,
        configFileParsingDiagnostics,
    });

    const { transpiledFiles, diagnostics: transpileDiagnostics } = tstl.transpile({ program });

    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);

    const emitResult = tstl.emitTranspiledFiles(program, transpiledFiles);
    emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

    diagnostics.forEach(reportDiagnostic);
    const exitCode =
        diagnostics.length === 0
            ? ts.ExitStatus.Success
            : transpiledFiles.length === 0
            ? ts.ExitStatus.DiagnosticsPresent_OutputsSkipped
            : ts.ExitStatus.DiagnosticsPresent_OutputsGenerated;

    return ts.sys.exit(exitCode);
}

function createWatchOfConfigFile(configFileName: string, optionsToExtend: tstl.CompilerOptions): void {
    const watchCompilerHost = ts.createWatchCompilerHost(
        configFileName,
        optionsToExtend,
        ts.sys,
        ts.createSemanticDiagnosticsBuilderProgram,
        undefined,
        createWatchStatusReporter(optionsToExtend)
    );

    updateWatchCompilationHost(watchCompilerHost, optionsToExtend);
    ts.createWatchProgram(watchCompilerHost);
}

function createWatchOfFilesAndCompilerOptions(rootFiles: string[], options: tstl.CompilerOptions): void {
    const watchCompilerHost = ts.createWatchCompilerHost(
        rootFiles,
        options,
        ts.sys,
        ts.createSemanticDiagnosticsBuilderProgram,
        undefined,
        createWatchStatusReporter(options)
    );

    updateWatchCompilationHost(watchCompilerHost, options);
    ts.createWatchProgram(watchCompilerHost);
}

function updateWatchCompilationHost(
    host: ts.WatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>,
    optionsToExtend: tstl.CompilerOptions
): void {
    let fullRecompile = true;
    const updateConfigFile = createConfigFileUpdater(optionsToExtend);

    host.afterProgramCreate = builderProgram => {
        const program = builderProgram.getProgram();
        const options = builderProgram.getCompilerOptions() as tstl.CompilerOptions;
        const configFileParsingDiagnostics: ts.Diagnostic[] = updateConfigFile(options);

        let sourceFiles: ts.SourceFile[] | undefined;
        if (!fullRecompile) {
            sourceFiles = [];
            while (true) {
                const currentFile = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
                if (!currentFile) break;

                if ("fileName" in currentFile.affected) {
                    sourceFiles.push(currentFile.affected);
                } else {
                    sourceFiles.push(...currentFile.affected.getSourceFiles());
                }
            }
        }

        const { diagnostics: emitDiagnostics, transpiledFiles } = tstl.transpile({ program, sourceFiles });

        const emitResult = tstl.emitTranspiledFiles(program, transpiledFiles);
        emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...configFileParsingDiagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSemanticDiagnostics(),
            ...emitDiagnostics,
        ]);

        diagnostics.forEach(reportDiagnostic);

        const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
        // do a full recompile after an error
        fullRecompile = errors.length > 0;

        host.onWatchStatusChange!(cliDiagnostics.watchErrorSummary(errors.length), host.getNewLine(), options);
    };
}

if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}

executeCommandLine(ts.sys.args);
