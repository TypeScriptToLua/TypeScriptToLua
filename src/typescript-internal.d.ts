export {};

declare module "typescript" {
    function createDiagnosticReporter(system: System, pretty?: boolean): DiagnosticReporter;
    function createWatchStatusReporter(system: System, pretty?: boolean): WatchStatusReporter;

    // https://github.com/microsoft/TypeScript/blob/master/src/compiler/path.ts
    // Prefer to use these methods over "path" module, because they don't depend on runtime platform,
    // preserving input path style, which works better with tests that always use "/" as cwd.
    function getNormalizedAbsolutePath(fileName: string, currentDirectory: string | undefined): string;
    function getDirectoryPath(path: string): string;

    interface System {
        setBlocking?(): void;
    }

    interface Statement {
        jsDoc?: JSDoc[];
    }

    interface Program {
        getCommonSourceDirectory(): string;
    }

    interface CompilerOptions {
        configFile?: TsConfigSourceFile;
        configFilePath?: string;
    }

    interface TypeChecker {
        getElementTypeOfArrayType(type: Type): Type | undefined;
    }
}
