#!/usr/bin/env node
import * as ts from "typescript";
import * as tstl from ".";
import * as cliDiagnostics from "./cli/diagnostics";
import { getHelpString, versionString } from "./cli/information";
import { parseCommandLine } from "./cli/parse";
import { createDiagnosticReporter } from "./cli/report";
import { createConfigFileUpdater, locateConfigFile, parseConfigFileWithSystem } from "./cli/tsconfig";
import { isBundleEnabled } from "./CompilerOptions";
import * as performance from "./measure-performance";

const shouldBePretty = ({ pretty }: ts.CompilerOptions = {}) =>
    pretty !== undefined ? (pretty as boolean) : ts.sys.writeOutputIsTTY?.() ?? false;

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
    if (options.measurePerformance) performance.enableMeasurement();

    performance.startSection("createProgram");

    const program = ts.createProgram({
        rootNames,
        options,
        projectReferences,
        configFileParsingDiagnostics,
    });
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

    performance.endSection("createProgram");

    const { diagnostics: transpileDiagnostics, emitSkipped } = new tstl.Transpiler().emit({ program });

    const diagnostics = ts.sortAndDeduplicateDiagnostics([...preEmitDiagnostics, ...transpileDiagnostics]);
    diagnostics.forEach(reportDiagnostic);

    if (options.measurePerformance) reportPerformance();

    const exitCode =
        diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length === 0
            ? ts.ExitStatus.Success
            : emitSkipped
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
    let hadErrorLastTime = true;
    const updateConfigFile = createConfigFileUpdater(optionsToExtend);

    const transpiler = new tstl.Transpiler();
    host.afterProgramCreate = builderProgram => {
        const program = builderProgram.getProgram();
        const options = builderProgram.getCompilerOptions() as tstl.CompilerOptions;

        if (options.measurePerformance) performance.enableMeasurement();

        const configFileParsingDiagnostics: ts.Diagnostic[] = updateConfigFile(options);

        let sourceFiles: ts.SourceFile[] | undefined;
        if (!isBundleEnabled(options) && !hadErrorLastTime) {
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

        const { diagnostics: emitDiagnostics } = transpiler.emit({ program, sourceFiles });

        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...configFileParsingDiagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSemanticDiagnostics(),
            ...emitDiagnostics,
        ]);

        diagnostics.forEach(reportDiagnostic);

        if (options.measurePerformance) reportPerformance();

        const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
        hadErrorLastTime = errors.length > 0;

        host.onWatchStatusChange!(cliDiagnostics.watchErrorSummary(errors.length), host.getNewLine(), options);
    };
}

function reportPerformance() {
    if (performance.isMeasurementEnabled()) {
        console.log("Performance measurements: ");
        performance.forEachMeasure((name, duration) => {
            console.log(`  ${name}: ${duration.toFixed(2)}ms`);
        });
        console.log(`Total: ${performance.getTotalDuration().toFixed(2)}ms`);
        performance.disableMeasurement();
    }
}

function checkNodeVersion(): void {
    const [major, minor] = process.version.slice(1).split(".").map(Number);
    const isValid = major > 12 || (major === 12 && minor >= 13);
    if (!isValid) {
        console.error(`TypeScriptToLua requires Node.js >=12.13.0, the current version is ${process.version}`);
        process.exit(1);
    }
}

checkNodeVersion();

if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}

executeCommandLine(ts.sys.args);
