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
    }

    interface CompilerOptions {
        configFile?: TsConfigSourceFile;
        configFilePath?: string;
    }

    interface TypeChecker {
        getElementTypeOfArrayType(type: Type): Type | undefined;
        getContextualTypeForObjectLiteralElement(element: ObjectLiteralElementLike): Type | undefined;

        isTupleType(type: Type): boolean;
        isArrayType(type: Type): boolean;
    }

    interface Symbol {
        parent?: Symbol;
    }

    interface Signature {
        compositeSignatures?: Signature[];
    }

    function transformJsx(context: TransformationContext): (x: SourceFile) => SourceFile;

    export type OuterExpression =
        | ParenthesizedExpression
        | TypeAssertion
        | AsExpression
        | NonNullExpression
        | PartiallyEmittedExpression;

    function skipOuterExpressions(node: Expression, kinds?: OuterExpressionKinds): Expression;
    export function isOuterExpression(node: Node, kinds?: OuterExpressionKinds): node is OuterExpression;

    export function nodeNextJsonConfigResolver(
        moduleName: string,
        containingFile: string,
        host: ModuleResolutionHost
    ): ResolvedModuleWithFailedLookupLocations;

    export function pathIsAbsolute(path: string): boolean;
    export function pathIsRelative(path: string): boolean;

    export function setParent<T extends Node>(child: T, parent: T["parent"] | undefined): T;
}
