// TODO:
/* eslint-disable @typescript-eslint/no-unnecessary-qualifier */
import * as ts from "typescript";

declare module "typescript" {
    function createDiagnosticReporter(system: ts.System, pretty?: boolean): ts.DiagnosticReporter;
    function createWatchStatusReporter(system: ts.System, pretty?: boolean): ts.WatchStatusReporter;

    interface System {
        setBlocking?(): void;
    }

    interface Statement {
        jsDoc?: ts.JSDoc[];
    }

    interface Program {
        getCommonSourceDirectory(): string;
    }

    interface CompilerOptions {
        configFile?: ts.TsConfigSourceFile;
        configFilePath?: string;
    }
}
