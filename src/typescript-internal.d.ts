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
        // false positive
        // eslint-disable-next-line @typescript-eslint/ban-types
        parent?: Symbol;
    }

    function getObjectFlags(type: Type): ObjectFlags;

    function transformJsx(context: TransformationContext): (x: SourceFile) => SourceFile;

    export type OuterExpression =
        | ParenthesizedExpression
        | TypeAssertion
        | AsExpression
        | NonNullExpression
        | PartiallyEmittedExpression;

    function skipOuterExpressions(node: Expression, kinds?: OuterExpressionKinds): Expression;
    export function isOuterExpression(node: Node, kinds?: OuterExpressionKinds): node is OuterExpression;
}
