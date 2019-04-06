#!/usr/bin/env node
import * as ts from "typescript";
import * as tstl from ".";
import * as CommandLineParser from "./CommandLineParser";

function createDiagnosticReporter(pretty: boolean): ts.DiagnosticReporter {
    const host: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: fileName =>
            ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
    };

    if (!pretty) {
        return diagnostic => ts.sys.write(ts.formatDiagnostic(diagnostic, host));
    }

    return diagnostic => {
        ts.sys.write(
            ts.formatDiagnosticsWithColorAndContext([diagnostic], host) + host.getNewLine()
        );
    };
}

function shouldBePretty(options?: tstl.CompilerOptions): boolean {
    return !options || options.pretty === undefined
        ? ts.sys.writeOutputIsTTY !== undefined && ts.sys.writeOutputIsTTY()
        : Boolean(options.pretty);
}

let reportDiagnostic = createDiagnosticReporter(shouldBePretty());
function updateReportDiagnostic(options?: ts.CompilerOptions): void {
    if (shouldBePretty(options)) {
        reportDiagnostic = createDiagnosticReporter(true);
    }
}

function executeCommandLine(argv: string[]): void {
    const commandLine = CommandLineParser.parseCommandLine(argv);
    if (commandLine.isValid === false) {
        // TODO: Use diagnostics
        console.error(`Invalid CLI input: ${commandLine.errorMessage}`);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }

    updateReportDiagnostic(commandLine.result.options);

    if (commandLine.result.options.help) {
        console.log(CommandLineParser.version);
        console.log(CommandLineParser.getHelpString());
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    if (commandLine.result.options.version) {
        console.log(CommandLineParser.version);
        return ts.sys.exit(ts.ExitStatus.Success);
    }

    if (commandLine.result.options.watch) {
        if (commandLine.result.options.project) {
            const host = ts.createWatchCompilerHost(
                commandLine.result.options.project,
                commandLine.result.options,
                ts.sys,
                ts.createSemanticDiagnosticsBuilderProgram
            );
            updateWatchCompilerHost(host, commandLine.result.options);
            ts.createWatchProgram(host);
        } else {
            const host = ts.createWatchCompilerHost(
                commandLine.result.fileNames,
                commandLine.result.options,
                ts.sys,
                ts.createSemanticDiagnosticsBuilderProgram
            );
            updateWatchCompilerHost(host, commandLine.result.options);
            ts.createWatchProgram(host);
        }
    } else {
        const { diagnostics, transpiledFiles } = tstl.transpileFiles(
            commandLine.result.fileNames,
            commandLine.result.options
        );

        const emitResult = tstl.emitTranspiledFiles(commandLine.result.options, transpiledFiles);
        emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

        diagnostics.forEach(reportDiagnostic);
        if (diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length === 0) {
            return ts.sys.exit(ts.ExitStatus.Success);
        }

        if (transpiledFiles.size === 0) {
            return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        } else {
            return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsGenerated);
        }
    }
}

function updateWatchCompilerHost(
    host: ts.WatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>,
    options: tstl.CompilerOptions
): void {
    let fullRecompile = true;
    host.afterProgramCreate = builderProgram => {
        const program = builderProgram.getProgram();
        const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

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

        const { diagnostics: emitDiagnostics, transpiledFiles } = tstl.getTranspileOutput({
            program,
            options,
            sourceFiles,
        });

        const emitResult = tstl.emitTranspiledFiles(options, transpiledFiles);
        emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));

        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...preEmitDiagnostics,
            ...emitDiagnostics,
        ]);

        diagnostics.forEach(reportDiagnostic);

        const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
        // do a full recompile after an error
        fullRecompile = errors.length > 0;

        const watchErrorSummaryDiagnostic: ts.Diagnostic = {
            file: undefined,
            start: undefined,
            length: undefined,

            category: ts.DiagnosticCategory.Message,
            code: errors.length === 1 ? 6193 : 6194,
            messageText:
                errors.length === 1
                    ? "Found 1 error. Watching for file changes."
                    : `Found ${errors.length} errors. Watching for file changes.`,
        };

        host.onWatchStatusChange(
            watchErrorSummaryDiagnostic,
            host.getNewLine(),
            builderProgram.getCompilerOptions()
        );
    };
}

if ((ts.sys as any).setBlocking) (ts.sys as any).setBlocking();

executeCommandLine(ts.sys.args);
