import * as ts from "typescript";
import { CompilerOptions, LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { unwrapVisitorResult } from "../utils/lua-ast";
import { ExpressionLikeNode, ObjectVisitor, StatementLikeNode, VisitorMap } from "./visitors";

export interface EmitResolver {
    isValueAliasDeclaration(node: ts.Node): boolean;
    isReferencedAliasDeclaration(node: ts.Node, checkChildren?: boolean): boolean;
    isTopLevelValueImportEqualsWithEntityName(node: ts.ImportEqualsDeclaration): boolean;
    moduleExportsSomeValue(moduleReferenceExpression: ts.Expression): boolean;
}

export interface DiagnosticsProducingTypeChecker extends ts.TypeChecker {
    getEmitResolver(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): EmitResolver;
}

export class TransformationContext {
    public readonly checker: DiagnosticsProducingTypeChecker = (this
        .program as any).getDiagnosticsProducingTypeChecker();
    public readonly resolver: EmitResolver;

    public readonly options: CompilerOptions = this.program.getCompilerOptions();
    public readonly luaTarget = this.options.luaTarget ?? LuaTarget.LuaJIT;
    public readonly isModule = ts.isExternalModule(this.sourceFile);
    public readonly isStrict =
        (this.options.alwaysStrict ?? this.options.strict) ||
        (this.isModule && this.options.target !== undefined && this.options.target >= ts.ScriptTarget.ES2015);

    public constructor(public program: ts.Program, public sourceFile: ts.SourceFile, private visitorMap: VisitorMap) {
        // Use `getParseTreeNode` to get original SourceFile node, before it was substituted by custom transformers.
        // It's required because otherwise `getEmitResolver` won't use cached diagnostics, produced in `emitWorker`
        // and would try to re-analyze the file, which would fail because of replaced nodes.
        const originalSourceFile = ts.getParseTreeNode(sourceFile, ts.isSourceFile) ?? sourceFile;
        this.resolver = this.checker.getEmitResolver(originalSourceFile);
    }

    private currentNodeVisitors: Array<ObjectVisitor<ts.Node>> = [];
    public transformNode(node: ts.Node): lua.Node[] {
        // TODO: Move to visitors?
        if (node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
            return [];
        }

        const nodeVisitors = this.visitorMap.get(node.kind);
        if (!nodeVisitors || nodeVisitors.length === 0) {
            throw new Error(`${ts.SyntaxKind[node.kind]} is not supported`);
        }

        const previousNodeVisitors = this.currentNodeVisitors;
        this.currentNodeVisitors = [...nodeVisitors];

        const visitor = this.currentNodeVisitors.pop()!;
        const result = unwrapVisitorResult(visitor.transform(node, this));

        this.currentNodeVisitors = previousNodeVisitors;

        return result;
    }

    public superTransformNode(node: ts.Node): lua.Node[] {
        if (this.currentNodeVisitors.length === 0) {
            throw new Error(`There is no super transform for ${ts.SyntaxKind[node.kind]} visitor`);
        }

        const visitor = this.currentNodeVisitors.pop()!;
        return unwrapVisitorResult(visitor.transform(node, this));
    }

    public transformExpression(node: ExpressionLikeNode): lua.Expression {
        const [result] = this.transformNode(node);
        return result as lua.Expression;
    }

    public superTransformExpression(node: ExpressionLikeNode): lua.Expression {
        const [result] = this.superTransformNode(node);
        return result as lua.Expression;
    }

    public transformStatements(node: StatementLikeNode | readonly StatementLikeNode[]): lua.Statement[] {
        return Array.isArray(node)
            ? node.flatMap(n => this.transformStatements(n))
            : // TODO: https://github.com/microsoft/TypeScript/pull/28916
              (this.transformNode(node as StatementLikeNode) as lua.Statement[]);
    }

    public superTransformStatements(node: StatementLikeNode | readonly StatementLikeNode[]): lua.Statement[] {
        return Array.isArray(node)
            ? node.flatMap(n => this.superTransformStatements(n))
            : // TODO: https://github.com/microsoft/TypeScript/pull/28916
              (this.superTransformNode(node as StatementLikeNode) as lua.Statement[]);
    }
}
