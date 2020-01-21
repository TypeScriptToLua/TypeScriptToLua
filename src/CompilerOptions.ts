import * as ts from "typescript";

type KnownKeys<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : K } extends {
    [_ in keyof T]: infer U;
}
    ? U
    : never;

type OmitIndexSignature<T extends Record<any, any>> = Pick<T, KnownKeys<T>>;

export interface TransformerImport {
    transform: string;
    import?: string;
    after?: boolean;
    afterDeclarations?: boolean;
    type?: "program" | "config" | "checker" | "raw" | "compilerOptions";
    [option: string]: any;
}

export type CompilerOptions = OmitIndexSignature<ts.CompilerOptions> & {
    noImplicitSelf?: boolean;
    noHeader?: boolean;
    luaBundle?: string;
    luaBundleEntry?: string;
    luaTarget?: LuaTarget;
    luaLibImport?: LuaLibImportKind;
    sourceMapTraceback?: boolean;
    plugins?: Array<ts.PluginImport | TransformerImport>;
    [option: string]: ts.CompilerOptions[string] | Array<ts.PluginImport | TransformerImport>;
};

export enum LuaLibImportKind {
    None = "none",
    Always = "always",
    Inline = "inline",
    Require = "require",
}

export enum LuaTarget {
    Lua51 = "5.1",
    Lua52 = "5.2",
    Lua53 = "5.3",
    LuaJIT = "JIT",
}

export function validateOptions(options: CompilerOptions): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];

    if (options.luaBundle && !options.luaBundleEntry) {
        diagnostics.push(configErrorDiagnostic(`'luaBundleEntry' is required when 'luaBundle' is enabled.`));
    }

    if (options.luaBundle && options.luaLibImport === LuaLibImportKind.Inline) {
        diagnostics.push(
            configWarningDiagnostic(
                `Using 'luaBundle' with 'luaLibImport: "inline"' might generate duplicate code. ` +
                    `It is recommended to use 'luaLibImport: "require"'`
            )
        );
    }

    return diagnostics;
}

const configErrorDiagnostic = (message: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    code: 0,
    source: "typescript-to-lua",
    messageText: message,
});

const configWarningDiagnostic = (message: string): ts.Diagnostic => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Warning,
    code: 0,
    source: "typescript-to-lua",
    messageText: message,
});
