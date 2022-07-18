import * as ts from "typescript";
import { CompilerOptions, LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { assert, castArray } from "../../utils";
import { unsupportedNodeKind } from "../utils/diagnostics";
import { unwrapVisitorResult, OneToManyVisitorResult } from "../utils/lua-ast";
import { createSafeName } from "../utils/safe-names";
import { ExpressionLikeNode, StatementLikeNode, VisitorMap, FunctionVisitor } from "./visitors";
import { SymbolInfo } from "../utils/symbols";
import { LuaLibFeature } from "../../LuaLib";
import { Scope, ScopeType } from "../utils/scope";
import { ClassSuperInfo } from "../visitors/class";

export const tempSymbolId = -1 as lua.SymbolId;

export interface AllAccessorDeclarations {
    firstAccessor: ts.AccessorDeclaration;
    secondAccessor: ts.AccessorDeclaration | undefined;
    getAccessor: ts.GetAccessorDeclaration | undefined;
    setAccessor: ts.SetAccessorDeclaration | undefined;
}

export interface EmitResolver {
    isValueAliasDeclaration(node: ts.Node): boolean;
    isReferencedAliasDeclaration(node: ts.Node, checkChildren?: boolean): boolean;
    isTopLevelValueImportEqualsWithEntityName(node: ts.ImportEqualsDeclaration): boolean;
    moduleExportsSomeValue(moduleReferenceExpression: ts.Expression): boolean;
    getAllAccessorDeclarations(declaration: ts.AccessorDeclaration): AllAccessorDeclarations;
}

export interface TypeCheckerWithEmitResolver extends ts.TypeChecker {
    getEmitResolver(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): EmitResolver;
}

export class TransformationContext {
    public readonly diagnostics: ts.Diagnostic[] = [];
    public readonly checker = this.program.getTypeChecker() as TypeCheckerWithEmitResolver;
    public readonly resolver: EmitResolver;
    public readonly precedingStatementsStack: lua.Statement[][] = [];

    public readonly options: CompilerOptions = this.program.getCompilerOptions();
    public readonly luaTarget = this.options.luaTarget ?? LuaTarget.Universal;
    public readonly isModule = ts.isExternalModule(this.sourceFile);
    public readonly isStrict =
        (this.options.alwaysStrict ?? this.options.strict) ||
        (this.isModule && this.options.target !== undefined && this.options.target >= ts.ScriptTarget.ES2015);

    constructor(public program: ts.Program, public sourceFile: ts.SourceFile, private visitorMap: VisitorMap) {
        // Use `getParseTreeNode` to get original SourceFile node, before it was substituted by custom transformers.
        // It's required because otherwise `getEmitResolver` won't use cached diagnostics, produced in `emitWorker`
        // and would try to re-analyze the file, which would fail because of replaced nodes.
        const originalSourceFile = ts.getParseTreeNode(sourceFile, ts.isSourceFile) ?? sourceFile;
        this.resolver = this.checker.getEmitResolver(originalSourceFile);
    }

    private currentNodeVisitors: ReadonlyArray<FunctionVisitor<ts.Node>> = [];
    private currentNodeVisitorsIndex = 0;

    private nextTempId = 0;

    public transformNode(node: ts.Node): lua.Node[] {
        return unwrapVisitorResult(this.transformNodeRaw(node));
    }

    /** @internal */
    public transformNodeRaw(node: ts.Node, isExpression?: boolean) {
        // TODO: Move to visitors?
        if (node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
            return [];
        }

        const nodeVisitors = this.visitorMap.get(node.kind);
        if (!nodeVisitors) {
            this.diagnostics.push(unsupportedNodeKind(node, node.kind));
            return isExpression ? [lua.createNilLiteral()] : [];
        }

        const previousNodeVisitors = this.currentNodeVisitors;
        const previousNodeVisitorsIndex = this.currentNodeVisitorsIndex;
        this.currentNodeVisitors = nodeVisitors;
        this.currentNodeVisitorsIndex = nodeVisitors.length - 1;

        const visitor = this.currentNodeVisitors[this.currentNodeVisitorsIndex];
        const result = visitor(node, this);

        this.currentNodeVisitors = previousNodeVisitors;
        this.currentNodeVisitorsIndex = previousNodeVisitorsIndex;

        return result;
    }

    public superTransformNode(node: ts.Node): lua.Node[] {
        return unwrapVisitorResult(this.doSuperTransformNode(node));
    }

    private doSuperTransformNode(node: ts.Node): OneToManyVisitorResult<lua.Node> {
        if (--this.currentNodeVisitorsIndex < 0) {
            throw new Error(`There is no super transform for ${ts.SyntaxKind[node.kind]} visitor`);
        }

        const visitor = this.currentNodeVisitors[this.currentNodeVisitorsIndex];
        return unwrapVisitorResult(visitor(node, this));
    }

    public transformExpression(node: ExpressionLikeNode): lua.Expression {
        const result = this.transformNodeRaw(node, true);
        return this.assertIsExpression(node, result);
    }

    private assertIsExpression(node: ExpressionLikeNode, result: OneToManyVisitorResult<lua.Node>): lua.Expression {
        if (result === undefined) {
            throw new Error(`Expression visitor for node type ${ts.SyntaxKind[node.kind]} did not return any result.`);
        }
        if (Array.isArray(result)) {
            return result[0] as lua.Expression;
        }
        return result as lua.Expression;
    }

    public superTransformExpression(node: ExpressionLikeNode): lua.Expression {
        const result = this.doSuperTransformNode(node);
        return this.assertIsExpression(node, result);
    }

    public transformStatements(node: StatementLikeNode | readonly StatementLikeNode[]): lua.Statement[] {
        return castArray(node).flatMap(n => {
            this.pushPrecedingStatements();
            const statements = this.transformNode(n) as lua.Statement[];
            const result = this.popPrecedingStatements();
            result.push(...statements);
            return result;
        });
    }

    public superTransformStatements(node: StatementLikeNode | readonly StatementLikeNode[]): lua.Statement[] {
        return castArray(node).flatMap(n => {
            this.pushPrecedingStatements();
            const statements = this.superTransformNode(n) as lua.Statement[];
            const result = this.popPrecedingStatements();
            result.push(...statements);
            return result;
        });
    }

    public pushPrecedingStatements() {
        this.precedingStatementsStack.push([]);
    }

    public popPrecedingStatements() {
        const precedingStatements = this.precedingStatementsStack.pop();
        assert(precedingStatements);
        return precedingStatements;
    }

    public addPrecedingStatements(statements: lua.Statement | lua.Statement[]) {
        const precedingStatements = this.precedingStatementsStack[this.precedingStatementsStack.length - 1];
        assert(precedingStatements);
        if (Array.isArray(statements)) {
            precedingStatements.push(...statements);
        } else {
            precedingStatements.push(statements);
        }
    }

    public prependPrecedingStatements(statements: lua.Statement | lua.Statement[]) {
        const precedingStatements = this.precedingStatementsStack[this.precedingStatementsStack.length - 1];
        assert(precedingStatements);
        if (Array.isArray(statements)) {
            precedingStatements.unshift(...statements);
        } else {
            precedingStatements.unshift(statements);
        }
    }

    public createTempName(prefix = "temp") {
        prefix = prefix.replace(/^_*/, ""); // Strip leading underscores because createSafeName will add them again
        return createSafeName(`${prefix}_${this.nextTempId++}`);
    }

    private getTempNameForLuaExpression(expression: lua.Expression): string | undefined {
        if (lua.isStringLiteral(expression)) {
            return expression.value;
        } else if (lua.isNumericLiteral(expression)) {
            return `_${expression.value.toString()}`;
        } else if (lua.isIdentifier(expression)) {
            return expression.text;
        } else if (lua.isCallExpression(expression)) {
            const name = this.getTempNameForLuaExpression(expression.expression);
            if (name) {
                return `${name}_result`;
            }
        } else if (lua.isTableIndexExpression(expression)) {
            const tableName = this.getTempNameForLuaExpression(expression.table);
            const indexName = this.getTempNameForLuaExpression(expression.index);
            if (tableName || indexName) {
                return `${tableName ?? "table"}_${indexName ?? "index"}`;
            }
        }
    }

    public createTempNameForLuaExpression(expression: lua.Expression) {
        const name = this.getTempNameForLuaExpression(expression);
        const identifier = lua.createIdentifier(this.createTempName(name), undefined, tempSymbolId);
        lua.setNodePosition(identifier, lua.getOriginalPos(expression));
        return identifier;
    }

    private getTempNameForNode(node: ts.Node): string | undefined {
        if (ts.isStringLiteral(node) || ts.isIdentifier(node) || ts.isMemberName(node)) {
            return node.text;
        } else if (ts.isNumericLiteral(node)) {
            return `_${node.text}`;
        } else if (ts.isCallExpression(node)) {
            const name = this.getTempNameForNode(node.expression);
            if (name) {
                return `${name}_result`;
            }
        } else if (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node)) {
            const tableName = this.getTempNameForNode(node.expression);
            const indexName = ts.isElementAccessExpression(node)
                ? this.getTempNameForNode(node.argumentExpression)
                : node.name.text;
            if (tableName || indexName) {
                return `${tableName ?? "table"}_${indexName ?? "index"}`;
            }
        }
    }

    public createTempNameForNode(node: ts.Node) {
        const name = this.getTempNameForNode(node);
        return lua.createIdentifier(this.createTempName(name), node, tempSymbolId);
    }

    // other utils

    private lastSymbolId = 0;
    public readonly symbolInfoMap = new Map<lua.SymbolId, SymbolInfo>();
    public readonly symbolIdMaps = new Map<ts.Symbol, lua.SymbolId>();

    public nextSymbolId(): lua.SymbolId {
        return ++this.lastSymbolId as lua.SymbolId;
    }

    public readonly usedLuaLibFeatures = new Set<LuaLibFeature>();

    public readonly scopeStack: Scope[] = [];
    private lastScopeId = 0;

    public pushScope(type: ScopeType): Scope {
        const scope = { type, id: ++this.lastScopeId };
        this.scopeStack.push(scope);
        return scope;
    }

    public popScope(): Scope {
        const scope = this.scopeStack.pop();
        assert(scope);
        return scope;
    }

    // Static context -> namespace dictionary keeping the current namespace for each transformation context
    // see visitors/namespace.ts
    /** @internal */
    public currentNamespaces: ts.ModuleDeclaration | undefined;

    /** @internal */
    public classSuperInfos: ClassSuperInfo[] = [];
}
