import { DiagnosticsProducingTypeChecker } from "./transformation/context";

export {};

declare module "typescript" {
    function createDiagnosticReporter(system: System, pretty?: boolean): DiagnosticReporter;
    function createWatchStatusReporter(system: System, pretty?: boolean): WatchStatusReporter;

    interface System {
        setBlocking?(): void;
    }

    interface Statement {
        jsDoc?: JSDoc[];
    }

    interface Program {
        getCommonSourceDirectory(): string;
        getDiagnosticsProducingTypeChecker(): DiagnosticsProducingTypeChecker;
    }

    interface CompilerOptions {
        configFile?: TsConfigSourceFile;
        configFilePath?: string;
    }

    interface TypeChecker {
        getElementTypeOfArrayType(type: Type): Type | undefined;
    }
}
