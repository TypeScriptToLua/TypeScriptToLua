import * as path from "path";
import * as ts from "typescript";
import { CompilerOptions, LuaTarget } from "./CompilerOptions";
import { DecoratorKind } from "./Decorator";
import * as tstl from "./LuaAST";
import { LuaLibFeature } from "./LuaLib";
import * as tsHelper from "./TSHelper";
import * as TSTLErrors from "./TSTLErrors";
import { luaKeywords, luaBuiltins } from "./LuaKeywords";

export type StatementVisitResult = tstl.Statement | tstl.Statement[] | undefined;
export type ExpressionVisitResult = tstl.Expression;
export enum ScopeType {
    File = 0x1,
    Function = 0x2,
    Switch = 0x4,
    Loop = 0x8,
    Conditional = 0x10,
    Block = 0x20,
    Try = 0x40,
    Catch = 0x80,
}

interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}

interface FunctionDefinitionInfo {
    referencedSymbols: Map<tstl.SymbolId, ts.Node[]>;
    definition?: tstl.VariableDeclarationStatement | tstl.AssignmentStatement;
}

interface Scope {
    type: ScopeType;
    id: number;
    referencedSymbols?: Map<tstl.SymbolId, ts.Node[]>;
    variableDeclarations?: tstl.VariableDeclarationStatement[];
    functionDefinitions?: Map<tstl.SymbolId, FunctionDefinitionInfo>;
    importStatements?: tstl.Statement[];
    loopContinued?: boolean;
    functionReturned?: boolean;
}

export interface EmitResolver {
    isValueAliasDeclaration(node: ts.Node): boolean;
    isReferencedAliasDeclaration(node: ts.Node, checkChildren?: boolean): boolean;
    isTopLevelValueImportEqualsWithEntityName(node: ts.ImportEqualsDeclaration): boolean;
    moduleExportsSomeValue(moduleReferenceExpression: ts.Expression): boolean;
}

export interface DiagnosticsProducingTypeChecker extends ts.TypeChecker {
    getEmitResolver(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): EmitResolver;
}

export class LuaTransformer {
    protected readonly typeValidationCache = new Map<ts.Type, Set<ts.Type>>();
    protected currentNamespace?: ts.ModuleDeclaration;

    protected checker: DiagnosticsProducingTypeChecker;
    protected options: CompilerOptions;

    protected luaTarget: LuaTarget;
    protected isStrict: boolean;

    public constructor(protected program: ts.Program) {
        this.checker = (program as any).getDiagnosticsProducingTypeChecker();
        this.options = program.getCompilerOptions();

        this.luaTarget = this.options.luaTarget || LuaTarget.LuaJIT;
        this.isStrict =
            this.options.alwaysStrict !== undefined ||
            (this.options.strict !== undefined && this.options.alwaysStrict !== false) ||
            (this.isModule && this.options.target !== undefined && this.options.target >= ts.ScriptTarget.ES2015);

        this.setupState();
    }

    protected genVarCounter!: number;
    protected luaLibFeatureSet!: Set<LuaLibFeature>;

    protected visitedExportEquals!: boolean;

    protected scopeStack!: Scope[];
    protected classStack!: ts.ClassLikeDeclaration[];

    protected symbolInfo!: Map<tstl.SymbolId, SymbolInfo>;
    protected symbolIds!: Map<ts.Symbol, tstl.SymbolId>;
    protected genSymbolIdCounter!: number;

    private setupState(): void {
        this.genVarCounter = 0;
        this.luaLibFeatureSet = new Set<LuaLibFeature>();

        this.visitedExportEquals = false;

        this.scopeStack = [];
        this.classStack = [];

        this.symbolInfo = new Map();
        this.symbolIds = new Map();
        this.genSymbolIdCounter = 1;
    }

    protected currentSourceFile!: ts.SourceFile;
    protected isModule!: boolean;
    protected resolver!: EmitResolver;

    /** @internal */
    public transform(sourceFile: ts.SourceFile): [tstl.Block, Set<LuaLibFeature>] {
        this.setupState();
        this.currentSourceFile = sourceFile;
        this.isModule = tsHelper.isFileModule(sourceFile);

        // Use `getParseTreeNode` to get original SourceFile node, before it was substituted by custom transformers.
        // It's required because otherwise `getEmitResolver` won't use cached diagnostics, produced in `emitWorker`
        // and would try to re-analyze the file, which would fail because of replaced nodes.
        const originalSourceFile = ts.getParseTreeNode(sourceFile, ts.isSourceFile) || sourceFile;
        this.resolver = this.checker.getEmitResolver(originalSourceFile);

        return [this.transformSourceFile(sourceFile), this.luaLibFeatureSet];
    }

    public transformSourceFile(sourceFile: ts.SourceFile): tstl.Block {
        let statements: tstl.Statement[] = [];
        if (sourceFile.flags & ts.NodeFlags.JsonFile) {
            const statement = sourceFile.statements[0];
            if (!statement || !ts.isExpressionStatement(statement)) {
                throw TSTLErrors.InvalidJsonFileContent(sourceFile);
            }

            statements.push(tstl.createReturnStatement([this.transformExpression(statement.expression)]));
        } else {
            this.pushScope(ScopeType.File);
            statements = this.performHoisting(this.transformStatements(sourceFile.statements));
            this.popScope();

            if (this.isModule) {
                // If export equals was not used. Create the exports table.
                // local exports = {}
                if (!this.visitedExportEquals) {
                    statements.unshift(
                        tstl.createVariableDeclarationStatement(
                            this.createExportsIdentifier(),
                            tstl.createTableExpression()
                        )
                    );
                }

                // return exports
                statements.push(tstl.createReturnStatement([this.createExportsIdentifier()]));
            }
        }

        return tstl.createBlock(statements, sourceFile);
    }

    public transformStatement(node: ts.Statement): StatementVisitResult {
        // Ignore declarations
        if (node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
            return undefined;
        }

        switch (node.kind) {
            // Block
            case ts.SyntaxKind.Block:
                return this.transformBlockAsDoStatement(node as ts.Block);
            // Declaration Statements
            case ts.SyntaxKind.ExportAssignment:
                return this.transformExportAssignment(node as ts.ExportAssignment);
            case ts.SyntaxKind.ExportDeclaration:
                return this.transformExportDeclaration(node as ts.ExportDeclaration);
            case ts.SyntaxKind.ImportDeclaration:
                return this.transformImportDeclaration(node as ts.ImportDeclaration);
            case ts.SyntaxKind.ImportEqualsDeclaration:
                return this.transformImportEqualsDeclaration(node as ts.ImportEqualsDeclaration);
            case ts.SyntaxKind.ClassDeclaration:
                return this.transformClassDeclaration(node as ts.ClassDeclaration);
            case ts.SyntaxKind.ModuleDeclaration:
                return this.transformModuleDeclaration(node as ts.ModuleDeclaration);
            case ts.SyntaxKind.EnumDeclaration:
                return this.transformEnumDeclaration(node as ts.EnumDeclaration);
            case ts.SyntaxKind.FunctionDeclaration:
                return this.transformFunctionDeclaration(node as ts.FunctionDeclaration);
            case ts.SyntaxKind.TypeAliasDeclaration:
                return this.transformTypeAliasDeclaration(node as ts.TypeAliasDeclaration);
            case ts.SyntaxKind.InterfaceDeclaration:
                return this.transformInterfaceDeclaration(node as ts.InterfaceDeclaration);
            // Statements
            case ts.SyntaxKind.VariableStatement:
                return this.transformVariableStatement(node as ts.VariableStatement);
            case ts.SyntaxKind.ExpressionStatement:
                return this.transformExpressionStatement(node as ts.ExpressionStatement);
            case ts.SyntaxKind.ReturnStatement:
                return this.transformReturnStatement(node as ts.ReturnStatement);
            case ts.SyntaxKind.IfStatement:
                return this.transformIfStatement(node as ts.IfStatement);
            case ts.SyntaxKind.WhileStatement:
                return this.transformWhileStatement(node as ts.WhileStatement);
            case ts.SyntaxKind.DoStatement:
                return this.transformDoStatement(node as ts.DoStatement);
            case ts.SyntaxKind.ForStatement:
                return this.transformForStatement(node as ts.ForStatement);
            case ts.SyntaxKind.ForOfStatement:
                return this.transformForOfStatement(node as ts.ForOfStatement);
            case ts.SyntaxKind.ForInStatement:
                return this.transformForInStatement(node as ts.ForInStatement);
            case ts.SyntaxKind.SwitchStatement:
                return this.transformSwitchStatement(node as ts.SwitchStatement);
            case ts.SyntaxKind.BreakStatement:
                return this.transformBreakStatement(node as ts.BreakStatement);
            case ts.SyntaxKind.TryStatement:
                return this.transformTryStatement(node as ts.TryStatement);
            case ts.SyntaxKind.ThrowStatement:
                return this.transformThrowStatement(node as ts.ThrowStatement);
            case ts.SyntaxKind.ContinueStatement:
                return this.transformContinueStatement(node as ts.ContinueStatement);
            case ts.SyntaxKind.EmptyStatement:
                return this.transformEmptyStatement(node as ts.EmptyStatement);
            case ts.SyntaxKind.NotEmittedStatement:
                return undefined;
            default:
                throw TSTLErrors.UnsupportedKind("Statement", node.kind, node);
        }
    }

    /** Converts an array of ts.Statements into an array of tstl.Statements */
    protected transformStatements(statements: readonly ts.Statement[]): tstl.Statement[] {
        const tstlStatements: tstl.Statement[] = [];
        (statements as ts.Statement[]).forEach(statement => {
            tstlStatements.push(...this.statementVisitResultToArray(this.transformStatement(statement)));
        });
        return tstlStatements;
    }

    public transformBlock(block: ts.Block): tstl.Block {
        this.pushScope(ScopeType.Block);
        const statements = this.performHoisting(this.transformStatements(block.statements));
        this.popScope();
        return tstl.createBlock(statements, block);
    }

    public transformBlockAsDoStatement(block: ts.Block): StatementVisitResult {
        this.pushScope(ScopeType.Block);
        const statements = this.performHoisting(this.transformStatements(block.statements));
        this.popScope();
        return tstl.createDoStatement(statements, block);
    }

    public transformExportAssignment(statement: ts.ExportAssignment): StatementVisitResult {
        if (!this.resolver.isValueAliasDeclaration(statement)) {
            return undefined;
        }

        // export = [expression];
        // ____exports = [expression];
        if (statement.isExportEquals) {
            // Stop the creation of the exports table.
            // This should be the only export of the module.
            this.visitedExportEquals = true;

            return tstl.createVariableDeclarationStatement(
                this.createExportsIdentifier(),
                this.transformExpression(statement.expression),
                statement
            );
        }

        // export default [expression];
        // ____exports.default = [expression];
        const defaultIdentifier = this.createDefaultExportStringLiteral(statement);
        return tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(this.createExportsIdentifier(), defaultIdentifier),
            this.transformExpression(statement.expression),
            statement
        );
    }

    public transformExportDeclaration(statement: ts.ExportDeclaration): StatementVisitResult {
        if (statement.exportClause) {
            if (!this.resolver.isValueAliasDeclaration(statement)) {
                return undefined;
            }

            const exportSpecifiers = tsHelper.getExportable(statement.exportClause, this.resolver);

            // export { ... };
            if (statement.moduleSpecifier === undefined) {
                return exportSpecifiers.map(exportSpecifier => this.transformExportSpecifier(exportSpecifier));
            }

            // export { ... } from "...";
            return this.transformExportSpecifiersFrom(statement, statement.moduleSpecifier, exportSpecifiers);
        } else {
            // export * from "...";
            return this.transformExportAllFrom(statement);
        }
    }

    protected transformExportSpecifier(node: ts.ExportSpecifier): tstl.AssignmentStatement {
        const exportedSymbol = this.checker.getExportSpecifierLocalTargetSymbol(node);
        const exportedIdentifier = node.propertyName ? node.propertyName : node.name;
        const exportedExpression = this.createShorthandIdentifier(exportedSymbol, exportedIdentifier);

        const isDefault = tsHelper.isDefaultExportSpecifier(node);
        const identifierToExport = isDefault
            ? this.createDefaultExportIdentifier(node)
            : this.transformIdentifier(node.name);
        const exportAssignmentLeftHandSide = this.createExportedIdentifier(identifierToExport);

        return tstl.createAssignmentStatement(exportAssignmentLeftHandSide, exportedExpression, node);
    }

    protected transformExportSpecifiersFrom(
        statement: ts.ExportDeclaration,
        moduleSpecifier: ts.Expression,
        exportSpecifiers: ts.ExportSpecifier[]
    ): tstl.Statement {
        // First transpile as import clause
        const importClause = ts.createImportClause(
            undefined,
            ts.createNamedImports(exportSpecifiers.map(s => ts.createImportSpecifier(s.propertyName, s.name)))
        );

        const importDeclaration = ts.createImportDeclaration(
            statement.decorators,
            statement.modifiers,
            importClause,
            moduleSpecifier
        );

        // Wrap in block to prevent imports from hoisting out of `do` statement
        const block = ts.createBlock([importDeclaration]);
        const result = this.transformBlock(block).statements;

        // Now the module is imported, add the imports to the export table
        for (const specifier of exportSpecifiers) {
            result.push(
                tstl.createAssignmentStatement(
                    this.createExportedIdentifier(this.transformIdentifier(specifier.name)),
                    this.transformIdentifier(specifier.name)
                )
            );
        }

        // Wrap this in a DoStatement to prevent polluting the scope.
        return tstl.createDoStatement(this.filterUndefined(result), statement);
    }

    protected transformExportAllFrom(statement: ts.ExportDeclaration): tstl.Statement | undefined {
        if (statement.moduleSpecifier === undefined) {
            throw TSTLErrors.InvalidExportDeclaration(statement);
        }

        if (!this.resolver.moduleExportsSomeValue(statement.moduleSpecifier)) {
            return undefined;
        }

        const moduleRequire = this.createModuleRequire(statement.moduleSpecifier as ts.StringLiteral);
        const tempModuleIdentifier = tstl.createIdentifier("____export");

        const declaration = tstl.createVariableDeclarationStatement(tempModuleIdentifier, moduleRequire);

        const forKey = tstl.createIdentifier("____exportKey");
        const forValue = tstl.createIdentifier("____exportValue");

        const body = tstl.createBlock([
            tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(this.createExportsIdentifier(), forKey),
                forValue
            ),
        ]);

        const pairsIdentifier = tstl.createIdentifier("pairs");
        const forIn = tstl.createForInStatement(
            body,
            [tstl.cloneIdentifier(forKey), tstl.cloneIdentifier(forValue)],
            [tstl.createCallExpression(pairsIdentifier, [tstl.cloneIdentifier(tempModuleIdentifier)])]
        );

        // Wrap this in a DoStatement to prevent polluting the scope.
        return tstl.createDoStatement([declaration, forIn], statement);
    }

    public transformImportDeclaration(statement: ts.ImportDeclaration): StatementVisitResult {
        const scope = this.peekScope();
        if (scope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }

        if (!this.options.noHoisting && !scope.importStatements) {
            scope.importStatements = [];
        }

        const shouldResolve = tsHelper.shouldResolveModulePath(statement.moduleSpecifier, this.checker);
        const moduleSpecifier = statement.moduleSpecifier as ts.StringLiteral;
        const importPath = moduleSpecifier.text.replace(new RegExp('"', "g"), "");
        const requireCall = this.createModuleRequire(statement.moduleSpecifier as ts.StringLiteral, shouldResolve);

        const result: tstl.Statement[] = [];

        // import "./module";
        // require("module")
        if (statement.importClause === undefined) {
            result.push(tstl.createExpressionStatement(requireCall));

            if (scope.importStatements) {
                scope.importStatements.push(...result);
                return undefined;
            } else {
                return result;
            }
        }

        // Create the require statement to extract values.
        // local ____module = require("module")
        const tstlIdentifier = (name: string) => "____" + tsHelper.fixInvalidLuaIdentifier(name);
        const importUniqueName = tstl.createIdentifier(tstlIdentifier(path.basename(importPath)));
        const requireStatement = tstl.createVariableDeclarationStatement(
            tstl.createIdentifier(tstlIdentifier(path.basename(importPath))),
            requireCall,
            statement
        );

        let usingRequireStatement = false;

        // import defaultValue from "./module";
        // local defaultValue = __module.default
        if (statement.importClause.name) {
            if (tsHelper.shouldBeImported(statement.importClause, this.checker, this.resolver)) {
                const propertyName = this.createDefaultExportStringLiteral(statement.importClause.name);
                const defaultImportAssignmentStatement = tstl.createVariableDeclarationStatement(
                    this.transformIdentifier(statement.importClause.name),
                    tstl.createTableIndexExpression(importUniqueName, propertyName),
                    statement.importClause.name
                );

                result.push(defaultImportAssignmentStatement);
                usingRequireStatement = true;
            }
        }

        // import * as module from "./module";
        // local module = require("module")
        if (statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) {
            if (this.resolver.isReferencedAliasDeclaration(statement.importClause.namedBindings)) {
                const requireStatement = tstl.createVariableDeclarationStatement(
                    this.transformIdentifier(statement.importClause.namedBindings.name),
                    requireCall,
                    statement
                );

                result.push(requireStatement);
            }
        }

        // import { a, b, c } from "./module";
        // local a = __module.a
        // local b = __module.b
        // local c = __module.c
        if (statement.importClause.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
            const assignmentStatements = statement.importClause.namedBindings.elements
                .filter(importSpecifier => tsHelper.shouldBeImported(importSpecifier, this.checker, this.resolver))
                .map(importSpecifier => this.transformImportSpecifier(importSpecifier, importUniqueName));

            if (assignmentStatements.length > 0) {
                usingRequireStatement = true;
            }
            result.push(...assignmentStatements);
        }

        if (result.length === 0) {
            return undefined;
        }

        if (usingRequireStatement) {
            result.unshift(requireStatement);
        }

        if (scope.importStatements) {
            scope.importStatements.push(...result);
            return undefined;
        } else {
            return result;
        }
    }

    protected transformImportSpecifier(
        importSpecifier: ts.ImportSpecifier,
        moduleTableName: tstl.Identifier
    ): tstl.VariableDeclarationStatement {
        const leftIdentifier = this.transformIdentifier(importSpecifier.name);
        const propertyName = this.transformPropertyName(
            importSpecifier.propertyName ? importSpecifier.propertyName : importSpecifier.name
        );

        return tstl.createVariableDeclarationStatement(
            leftIdentifier,
            tstl.createTableIndexExpression(moduleTableName, propertyName),
            importSpecifier
        );
    }

    protected createModuleRequire(moduleSpecifier: ts.StringLiteral, resolveModule = true): tstl.CallExpression {
        const modulePathString = resolveModule
            ? tsHelper.getImportPath(
                  this.currentSourceFile.fileName,
                  moduleSpecifier.text.replace(new RegExp('"', "g"), ""),
                  moduleSpecifier,
                  this.options
              )
            : moduleSpecifier.text;
        const modulePath = tstl.createStringLiteral(modulePathString);
        return tstl.createCallExpression(tstl.createIdentifier("require"), [modulePath], moduleSpecifier);
    }

    protected validateClassElement(element: ts.ClassElement): void {
        if (element.name && (ts.isStringLiteral(element.name) || ts.isIdentifier(element.name))) {
            if (tsHelper.isStaticNode(element) && element.name.text === "new") {
                throw TSTLErrors.ForbiddenStaticClassPropertyName(element, element.name.text);
            }
        }
    }

    public transformImportEqualsDeclaration(declaration: ts.ImportEqualsDeclaration): StatementVisitResult {
        const name = this.transformIdentifier(declaration.name);
        let expression: tstl.Expression;
        if (ts.isExternalModuleReference(declaration.moduleReference)) {
            if (!this.resolver.isReferencedAliasDeclaration(declaration)) {
                return undefined;
            }

            expression = this.transformExternalModuleReference(declaration.moduleReference);
        } else {
            const shouldEmit =
                this.resolver.isReferencedAliasDeclaration(declaration) ||
                (!ts.isExternalModule(this.currentSourceFile) &&
                    this.resolver.isTopLevelValueImportEqualsWithEntityName(declaration));

            if (!shouldEmit) {
                return undefined;
            }

            expression = this.transformEntityName(declaration.moduleReference);
        }

        return this.createHoistableVariableDeclarationStatement(name, expression, declaration);
    }

    public transformExternalModuleReference(
        externalModuleReference: ts.ExternalModuleReference
    ): ExpressionVisitResult {
        // TODO: Should `externalModuleReference` be original node?
        return this.createModuleRequire(externalModuleReference.expression as ts.StringLiteral);
    }

    protected transformEntityName(entityName: ts.EntityName): ExpressionVisitResult {
        return ts.isQualifiedName(entityName)
            ? this.transformQualifiedName(entityName)
            : this.transformIdentifierExpression(entityName);
    }

    public transformQualifiedName(qualifiedName: ts.QualifiedName): ExpressionVisitResult {
        const right = tstl.createStringLiteral(qualifiedName.right.text, qualifiedName.right);
        const left = this.transformEntityName(qualifiedName.left);

        return tstl.createTableIndexExpression(left, right, qualifiedName);
    }

    public transformClassDeclaration(
        statement: ts.ClassLikeDeclaration,
        nameOverride?: tstl.Identifier
    ): StatementVisitResult {
        this.classStack.push(statement);

        let className: tstl.Identifier;
        let classNameText: string;
        if (nameOverride !== undefined) {
            className = nameOverride;
            classNameText = nameOverride.text;
        } else if (statement.name !== undefined) {
            className = this.transformIdentifier(statement.name);
            classNameText = statement.name.text;
        } else {
            const isDefaultExport = tsHelper.hasDefaultExportModifier(statement.modifiers);
            if (isDefaultExport) {
                const left = this.createExportedIdentifier(this.createDefaultExportIdentifier(statement));
                const right = this.transformClassExpression(statement);

                return tstl.createAssignmentStatement(left, right, statement);
            } else {
                throw TSTLErrors.MissingClassName(statement);
            }
        }

        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(statement), this.checker);

        // Find out if this class is extension of existing class
        const extensionDirective = decorators.get(DecoratorKind.Extension);
        const isExtension = extensionDirective !== undefined;

        const isMetaExtension = decorators.has(DecoratorKind.MetaExtension);

        if (isExtension && isMetaExtension) {
            throw TSTLErrors.InvalidExtensionMetaExtension(statement);
        }

        if ((isExtension || isMetaExtension) && this.getIdentifierExportScope(className) !== undefined) {
            // Cannot export extension classes
            throw TSTLErrors.InvalidExportsExtension(statement);
        }

        // Get type that is extended
        const extendsType = tsHelper.getExtendedType(statement, this.checker);

        if (extendsType) {
            this.checkForLuaLibType(extendsType);
        }

        if (!(isExtension || isMetaExtension) && extendsType) {
            // Non-extensions cannot extend extension classes
            const extendsDecorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            if (extendsDecorators.has(DecoratorKind.Extension) || extendsDecorators.has(DecoratorKind.MetaExtension)) {
                throw TSTLErrors.InvalidExtendsExtension(statement);
            }
        }

        // You cannot extend LuaTable classes
        if (extendsType) {
            const decorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            if (decorators.has(DecoratorKind.LuaTable)) {
                throw TSTLErrors.InvalidExtendsLuaTable(statement);
            }
        }

        // LuaTable classes must be ambient
        if (decorators.has(DecoratorKind.LuaTable) && !tsHelper.isAmbientNode(statement)) {
            throw TSTLErrors.ForbiddenLuaTableNonDeclaration(statement);
        }

        // Get all properties with value
        const properties = statement.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

        // Divide properties into static and non-static
        const staticFields = properties.filter(tsHelper.isStaticNode);
        const instanceFields = properties.filter(prop => !tsHelper.isStaticNode(prop));

        const result: tstl.Statement[] = [];

        // Overwrite the original className with the class we are overriding for extensions
        if (isMetaExtension) {
            if (!extendsType) {
                throw TSTLErrors.MissingMetaExtension(statement);
            }

            const extendsName = tstl.createStringLiteral(extendsType.symbol.escapedName as string);
            className = tstl.createIdentifier("__meta__" + extendsName.value);

            // local className = debug.getregistry()["extendsName"]
            const assignDebugCallIndex = tstl.createVariableDeclarationStatement(
                className,
                tstl.createTableIndexExpression(
                    tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            tstl.createIdentifier("debug"),
                            tstl.createStringLiteral("getregistry")
                        ),
                        []
                    ),
                    extendsName
                ),
                statement
            );

            result.push(assignDebugCallIndex);
        }

        if (extensionDirective !== undefined) {
            const extensionNameArg = extensionDirective.args[0];
            if (extensionNameArg) {
                className = tstl.createIdentifier(extensionNameArg);
            } else if (extendsType) {
                className = tstl.createIdentifier(extendsType.symbol.escapedName as string);
            }
        }

        let localClassName: tstl.Identifier;
        if (this.isUnsafeName(className.text)) {
            localClassName = tstl.createIdentifier(
                this.createSafeName(className.text),
                undefined,
                className.symbolId,
                className.text
            );
            tstl.setNodePosition(localClassName, className);
        } else {
            localClassName = className;
        }

        if (!isExtension && !isMetaExtension) {
            const classCreationMethods = this.createClassCreationMethods(
                statement,
                className,
                localClassName,
                classNameText,
                extendsType
            );
            result.push(...classCreationMethods);
        } else {
            for (const f of instanceFields) {
                const fieldName = this.transformPropertyName(f.name);

                const value = f.initializer !== undefined ? this.transformExpression(f.initializer) : undefined;

                // className["fieldName"]
                const classField = tstl.createTableIndexExpression(tstl.cloneIdentifier(className), fieldName);

                // className["fieldName"] = value;
                const assignClassField = tstl.createAssignmentStatement(classField, value);

                result.push(assignClassField);
            }
        }

        // Find first constructor with body
        if (!isExtension && !isMetaExtension) {
            const constructor = statement.members.filter(
                n => ts.isConstructorDeclaration(n) && n.body
            )[0] as ts.ConstructorDeclaration;
            if (constructor) {
                // Add constructor plus initialization of instance fields
                const constructorResult = this.transformConstructorDeclaration(
                    constructor,
                    localClassName,
                    instanceFields,
                    statement
                );
                result.push(...this.statementVisitResultToArray(constructorResult));
            } else if (!extendsType) {
                // Generate a constructor if none was defined in a base class
                const constructorResult = this.transformConstructorDeclaration(
                    ts.createConstructor([], [], [], ts.createBlock([], true)),
                    localClassName,
                    instanceFields,
                    statement
                );
                result.push(...this.statementVisitResultToArray(constructorResult));
            } else if (
                instanceFields.length > 0 ||
                statement.members.some(m => tsHelper.isGetAccessorOverride(m, statement, this.checker))
            ) {
                // Generate a constructor if none was defined in a class with instance fields that need initialization
                // localClassName.prototype.____constructor = function(self, ...)
                //     baseClassName.prototype.____constructor(self, ...)
                //     ...
                const constructorBody = this.transformClassInstanceFields(statement, instanceFields);
                const superCall = tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            this.transformSuperKeyword(ts.createSuper()),
                            tstl.createStringLiteral("____constructor")
                        ),
                        [this.createSelfIdentifier(), tstl.createDotsLiteral()]
                    )
                );
                constructorBody.unshift(superCall);
                const constructorFunction = tstl.createFunctionExpression(
                    tstl.createBlock(constructorBody),
                    [this.createSelfIdentifier()],
                    tstl.createDotsLiteral(),
                    undefined,
                    tstl.FunctionExpressionFlags.Declaration
                );
                result.push(
                    tstl.createAssignmentStatement(
                        this.createConstructorName(localClassName),
                        constructorFunction,
                        statement
                    )
                );
            }
        }

        // Transform get accessors
        statement.members.filter(ts.isGetAccessor).forEach(getAccessor => {
            const transformResult = this.transformGetAccessorDeclaration(getAccessor, localClassName);
            result.push(...this.statementVisitResultToArray(transformResult));
        });

        // Transform set accessors
        statement.members.filter(ts.isSetAccessor).forEach(setAccessor => {
            const transformResult = this.transformSetAccessorDeclaration(setAccessor, localClassName);
            result.push(...this.statementVisitResultToArray(transformResult));
        });

        // Transform methods
        statement.members.filter(ts.isMethodDeclaration).forEach(method => {
            const methodResult = this.transformMethodDeclaration(
                method,
                localClassName,
                isExtension || isMetaExtension
            );
            result.push(...this.statementVisitResultToArray(methodResult));
        });

        // Add static declarations
        for (const field of staticFields) {
            this.validateClassElement(field);

            const fieldName = this.transformPropertyName(field.name);
            const value = field.initializer ? this.transformExpression(field.initializer) : undefined;

            const classField = tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), fieldName);

            const fieldAssign = tstl.createAssignmentStatement(classField, value);

            result.push(fieldAssign);
        }

        const decorationStatement = this.createConstructorDecorationStatement(statement);
        if (decorationStatement) {
            result.push(decorationStatement);
        }

        this.classStack.pop();

        return result;
    }

    protected createClassCreationMethods(
        statement: ts.ClassLikeDeclarationBase,
        className: tstl.Identifier,
        localClassName: tstl.Identifier,
        classNameText: string,
        extendsType?: ts.Type
    ): tstl.Statement[] {
        const result: tstl.Statement[] = [];

        // [____exports.]className = {}
        const classTable: tstl.Expression = tstl.createTableExpression();

        const isDefaultExport = tsHelper.hasDefaultExportModifier(statement.modifiers);

        const defaultExportLeftHandSide = isDefaultExport
            ? tstl.createTableIndexExpression(
                  this.createExportsIdentifier(),
                  this.createDefaultExportStringLiteral(statement)
              )
            : undefined;

        const classVar = defaultExportLeftHandSide
            ? [tstl.createAssignmentStatement(defaultExportLeftHandSide, classTable, statement)]
            : this.createLocalOrExportedOrGlobalDeclaration(className, classTable, statement);

        result.push(...classVar);

        if (defaultExportLeftHandSide) {
            // local localClassName = ____exports.default
            result.push(tstl.createVariableDeclarationStatement(localClassName, defaultExportLeftHandSide));
        } else {
            const exportScope = this.getIdentifierExportScope(className);
            if (exportScope) {
                // local localClassName = ____exports.className
                result.push(
                    tstl.createVariableDeclarationStatement(
                        localClassName,
                        this.createExportedIdentifier(tstl.cloneIdentifier(className), exportScope)
                    )
                );
            }
        }

        // localClassName.name = className
        result.push(
            tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), tstl.createStringLiteral("name")),
                tstl.createStringLiteral(classNameText),
                statement
            )
        );

        // localClassName.____getters = {}
        if (statement.members.some(m => ts.isGetAccessor(m) && tsHelper.isStaticNode(m))) {
            const classGetters = tstl.createTableIndexExpression(
                tstl.cloneIdentifier(localClassName),
                tstl.createStringLiteral("____getters")
            );
            const assignClassGetters = tstl.createAssignmentStatement(
                classGetters,
                tstl.createTableExpression(),
                statement
            );
            result.push(assignClassGetters);

            this.importLuaLibFeature(LuaLibFeature.ClassIndex);
        }

        // localClassName.__index = localClassName
        const classIndex = tstl.createTableIndexExpression(
            tstl.cloneIdentifier(localClassName),
            tstl.createStringLiteral("__index")
        );
        const assignClassIndex = tstl.createAssignmentStatement(
            classIndex,
            tstl.cloneIdentifier(localClassName),
            statement
        );
        result.push(assignClassIndex);

        // localClassName.____setters = {}
        if (statement.members.some(m => ts.isSetAccessor(m) && tsHelper.isStaticNode(m))) {
            const classSetters = tstl.createTableIndexExpression(
                tstl.cloneIdentifier(localClassName),
                tstl.createStringLiteral("____setters")
            );
            const assignClassSetters = tstl.createAssignmentStatement(
                classSetters,
                tstl.createTableExpression(),
                statement
            );
            result.push(assignClassSetters);

            this.importLuaLibFeature(LuaLibFeature.ClassNewIndex);
        }

        // localClassName.prototype = {}
        const createClassPrototype = () =>
            tstl.createTableIndexExpression(
                tstl.cloneIdentifier(localClassName),
                tstl.createStringLiteral("prototype")
            );
        const classPrototypeTable = tstl.createTableExpression();
        const assignClassPrototype = tstl.createAssignmentStatement(
            createClassPrototype(),
            classPrototypeTable,
            statement
        );
        result.push(assignClassPrototype);

        // localClassName.prototype.____getters = {}
        if (statement.members.some(m => ts.isGetAccessor(m) && !tsHelper.isStaticNode(m))) {
            const classPrototypeGetters = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("____getters")
            );
            const assignClassPrototypeGetters = tstl.createAssignmentStatement(
                classPrototypeGetters,
                tstl.createTableExpression(),
                statement
            );
            result.push(assignClassPrototypeGetters);
        }

        const classPrototypeIndex = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("__index")
        );
        if (tsHelper.hasGetAccessorInClassOrAncestor(statement, false, this.checker)) {
            // localClassName.prototype.__index = __TS__Index(localClassName.prototype)
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeIndex,
                this.transformLuaLibFunction(LuaLibFeature.Index, undefined, createClassPrototype()),
                statement
            );
            result.push(assignClassPrototypeIndex);
        } else {
            // localClassName.prototype.__index = localClassName.prototype
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeIndex,
                createClassPrototype(),
                statement
            );
            result.push(assignClassPrototypeIndex);
        }

        if (statement.members.some(m => ts.isSetAccessor(m) && !tsHelper.isStaticNode(m))) {
            // localClassName.prototype.____setters = {}
            const classPrototypeSetters = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("____setters")
            );
            const assignClassPrototypeSetters = tstl.createAssignmentStatement(
                classPrototypeSetters,
                tstl.createTableExpression(),
                statement
            );
            result.push(assignClassPrototypeSetters);
        }

        if (tsHelper.hasSetAccessorInClassOrAncestor(statement, false, this.checker)) {
            // localClassName.prototype.__newindex = __TS__NewIndex(localClassName.prototype)
            const classPrototypeNewIndex = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("__newindex")
            );
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeNewIndex,
                this.transformLuaLibFunction(LuaLibFeature.NewIndex, undefined, createClassPrototype()),
                statement
            );
            result.push(assignClassPrototypeIndex);
        }

        // localClassName.prototype.constructor = localClassName
        const classPrototypeConstructor = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("constructor")
        );
        const assignClassPrototypeConstructor = tstl.createAssignmentStatement(
            classPrototypeConstructor,
            tstl.cloneIdentifier(localClassName),
            statement
        );
        result.push(assignClassPrototypeConstructor);

        const hasStaticGetters = tsHelper.hasGetAccessorInClassOrAncestor(statement, true, this.checker);
        const hasStaticSetters = tsHelper.hasSetAccessorInClassOrAncestor(statement, true, this.checker);

        if (extendsType) {
            const extendedTypeNode = tsHelper.getExtendedTypeNode(statement, this.checker);
            if (extendedTypeNode === undefined) {
                throw TSTLErrors.UndefinedTypeNode(statement);
            }

            // localClassName.____super = extendsExpression
            const createClassBase = () =>
                tstl.createTableIndexExpression(
                    tstl.cloneIdentifier(localClassName),
                    tstl.createStringLiteral("____super")
                );
            const assignClassBase = tstl.createAssignmentStatement(
                createClassBase(),
                this.transformExpression(extendedTypeNode.expression),
                extendedTypeNode.expression
            );
            result.push(assignClassBase);

            if (hasStaticGetters || hasStaticSetters) {
                const metatableFields: tstl.TableFieldExpression[] = [];
                if (hasStaticGetters) {
                    // __index = __TS__ClassIndex
                    metatableFields.push(
                        tstl.createTableFieldExpression(
                            tstl.createIdentifier("__TS__ClassIndex"),
                            tstl.createStringLiteral("__index"),
                            extendedTypeNode.expression
                        )
                    );
                } else {
                    // __index = localClassName.____super
                    metatableFields.push(
                        tstl.createTableFieldExpression(
                            createClassBase(),
                            tstl.createStringLiteral("__index"),
                            extendedTypeNode.expression
                        )
                    );
                }

                if (hasStaticSetters) {
                    // __newindex = __TS__ClassNewIndex
                    metatableFields.push(
                        tstl.createTableFieldExpression(
                            tstl.createIdentifier("__TS__ClassNewIndex"),
                            tstl.createStringLiteral("__newindex"),
                            extendedTypeNode.expression
                        )
                    );
                }

                const setClassMetatable = tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createIdentifier("setmetatable"),
                        [tstl.cloneIdentifier(localClassName), tstl.createTableExpression(metatableFields)],
                        extendedTypeNode.expression
                    )
                );
                result.push(setClassMetatable);
            } else {
                // setmetatable(localClassName, localClassName.____super)
                const setClassMetatable = tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createIdentifier("setmetatable"),
                        [tstl.cloneIdentifier(localClassName), createClassBase()],
                        extendedTypeNode.expression
                    )
                );
                result.push(setClassMetatable);
            }

            // setmetatable(localClassName.prototype, localClassName.____super.prototype)
            const basePrototype = tstl.createTableIndexExpression(
                createClassBase(),
                tstl.createStringLiteral("prototype")
            );
            const setClassPrototypeMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [
                    createClassPrototype(),
                    basePrototype,
                ]),
                extendedTypeNode.expression
            );
            result.push(setClassPrototypeMetatable);
        } else if (hasStaticGetters || hasStaticSetters) {
            const metatableFields: tstl.TableFieldExpression[] = [];
            if (hasStaticGetters) {
                // __index = __TS__ClassIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassIndex"),
                        tstl.createStringLiteral("__index"),
                        statement
                    )
                );
            }

            if (hasStaticSetters) {
                // __newindex = __TS__ClassNewIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassNewIndex"),
                        tstl.createStringLiteral("__newindex"),
                        statement
                    )
                );
            }

            const setClassMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [
                    tstl.cloneIdentifier(localClassName),
                    tstl.createTableExpression(metatableFields),
                ]),
                statement
            );
            result.push(setClassMetatable);
        }

        const newFuncStatements: tstl.Statement[] = [];

        // local self = setmetatable({}, localClassName.prototype)
        const assignSelf = tstl.createVariableDeclarationStatement(
            this.createSelfIdentifier(),
            tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [
                tstl.createTableExpression(),
                createClassPrototype(),
            ]),
            statement
        );
        newFuncStatements.push(assignSelf);

        // self:____constructor(...)
        const callConstructor = tstl.createExpressionStatement(
            tstl.createMethodCallExpression(this.createSelfIdentifier(), tstl.createIdentifier("____constructor"), [
                tstl.createDotsLiteral(),
            ]),
            statement
        );
        newFuncStatements.push(callConstructor);

        // return self
        const returnSelf = tstl.createReturnStatement([this.createSelfIdentifier()], statement);
        newFuncStatements.push(returnSelf);

        // function localClassName.new(construct, ...) ... end
        // or function export.localClassName.new(construct, ...) ... end
        const newFunc = tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), tstl.createStringLiteral("new")),
            tstl.createFunctionExpression(
                tstl.createBlock(newFuncStatements),
                undefined,
                tstl.createDotsLiteral(),
                undefined,
                tstl.FunctionExpressionFlags.Declaration
            ),
            statement
        );
        result.push(newFunc);

        return result;
    }

    protected transformClassInstanceFields(
        classDeclaration: ts.ClassLikeDeclaration,
        instanceFields: ts.PropertyDeclaration[]
    ): tstl.Statement[] {
        const statements: tstl.Statement[] = [];

        for (const f of instanceFields) {
            this.validateClassElement(f);

            // Get identifier
            const fieldName = this.transformPropertyName(f.name);

            const value = f.initializer ? this.transformExpression(f.initializer) : undefined;

            // self[fieldName]
            const selfIndex = tstl.createTableIndexExpression(this.createSelfIdentifier(), fieldName);

            // self[fieldName] = value
            const assignClassField = tstl.createAssignmentStatement(selfIndex, value, f);

            statements.push(assignClassField);
        }

        const getOverrides = classDeclaration.members.filter(m =>
            tsHelper.isGetAccessorOverride(m, classDeclaration, this.checker)
        ) as ts.GetAccessorDeclaration[];

        for (const getter of getOverrides) {
            const getterName = this.transformPropertyName(getter.name);

            const resetGetter = tstl.createExpressionStatement(
                tstl.createCallExpression(tstl.createIdentifier("rawset"), [
                    this.createSelfIdentifier(),
                    getterName,
                    tstl.createNilLiteral(),
                ]),
                classDeclaration.members.find(ts.isConstructorDeclaration) || classDeclaration
            );
            statements.push(resetGetter);
        }

        return statements;
    }

    protected createConstructorName(className: tstl.Identifier): tstl.TableIndexExpression {
        return tstl.createTableIndexExpression(
            tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype")),
            tstl.createStringLiteral("____constructor")
        );
    }

    protected transformConstructorDeclaration(
        statement: ts.ConstructorDeclaration,
        className: tstl.Identifier,
        instanceFields: ts.PropertyDeclaration[],
        classDeclaration: ts.ClassLikeDeclaration
    ): StatementVisitResult {
        // Don't transform methods without body (overload declarations)
        if (!statement.body) {
            return undefined;
        }

        // Transform body
        const [body, scope] = this.transformFunctionBodyStatements(statement.body);

        const [params, dotsLiteral, restParamName] = this.transformParameters(
            statement.parameters,
            this.createSelfIdentifier()
        );

        // Make sure default parameters are assigned before fields are initialized
        const bodyWithFieldInitializers = this.transformFunctionBodyHeader(scope, statement.parameters, restParamName);

        // Check for field declarations in constructor
        const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);

        const classInstanceFields = this.transformClassInstanceFields(classDeclaration, instanceFields);

        // If there are field initializers and the first statement is a super call,
        // move super call between default assignments and initializers
        if (
            (constructorFieldsDeclarations.length > 0 || classInstanceFields.length > 0) &&
            statement.body &&
            statement.body.statements.length > 0
        ) {
            const firstStatement = statement.body.statements[0];
            if (
                ts.isExpressionStatement(firstStatement) &&
                ts.isCallExpression(firstStatement.expression) &&
                firstStatement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
            ) {
                const superCall = body.shift();
                if (superCall) {
                    bodyWithFieldInitializers.push(superCall);
                }
            }
        }

        // Add in instance field declarations
        for (const declaration of constructorFieldsDeclarations) {
            const declarationName = this.transformIdentifier(declaration.name as ts.Identifier);
            // self.declarationName = declarationName
            const assignment = tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(
                    this.createSelfIdentifier(),
                    tstl.createStringLiteral(declarationName.text)
                ),
                declarationName
            );
            bodyWithFieldInitializers.push(assignment);
        }

        bodyWithFieldInitializers.push(...classInstanceFields);

        bodyWithFieldInitializers.push(...body);

        const block: tstl.Block = tstl.createBlock(bodyWithFieldInitializers);

        const constructorWasGenerated = statement.pos === -1;

        const result = tstl.createAssignmentStatement(
            this.createConstructorName(className),
            tstl.createFunctionExpression(
                block,
                params,
                dotsLiteral,
                restParamName,
                tstl.FunctionExpressionFlags.Declaration
            ),
            constructorWasGenerated ? classDeclaration : statement
        );

        return result;
    }

    public transformGetAccessorDeclaration(
        getAccessor: ts.GetAccessorDeclaration,
        className: tstl.Identifier
    ): StatementVisitResult {
        if (getAccessor.body === undefined) {
            return undefined;
        }

        this.validateClassElement(getAccessor);

        const name = this.transformIdentifier(getAccessor.name as ts.Identifier);

        const [body] = this.transformFunctionBody(getAccessor.parameters, getAccessor.body);
        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(body),
            [this.createSelfIdentifier()],
            undefined,
            undefined,
            tstl.FunctionExpressionFlags.Declaration
        );

        const methodTable = tsHelper.isStaticNode(getAccessor)
            ? tstl.cloneIdentifier(className)
            : tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype"));

        const classGetters = tstl.createTableIndexExpression(methodTable, tstl.createStringLiteral("____getters"));
        const getter = tstl.createTableIndexExpression(classGetters, tstl.createStringLiteral(name.text));
        const assignGetter = tstl.createAssignmentStatement(getter, accessorFunction, getAccessor);
        return assignGetter;
    }

    public transformSetAccessorDeclaration(
        setAccessor: ts.SetAccessorDeclaration,
        className: tstl.Identifier
    ): StatementVisitResult {
        if (setAccessor.body === undefined) {
            return undefined;
        }

        this.validateClassElement(setAccessor);

        const name = this.transformIdentifier(setAccessor.name as ts.Identifier);

        const [params, dot, restParam] = this.transformParameters(setAccessor.parameters, this.createSelfIdentifier());

        const [body] = this.transformFunctionBody(setAccessor.parameters, setAccessor.body, restParam);
        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(body),
            params,
            dot,
            restParam,
            tstl.FunctionExpressionFlags.Declaration
        );

        const methodTable = tsHelper.isStaticNode(setAccessor)
            ? tstl.cloneIdentifier(className)
            : tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype"));

        const classSetters = tstl.createTableIndexExpression(methodTable, tstl.createStringLiteral("____setters"));
        const setter = tstl.createTableIndexExpression(classSetters, tstl.createStringLiteral(name.text));
        const assignSetter = tstl.createAssignmentStatement(setter, accessorFunction, setAccessor);
        return assignSetter;
    }

    public transformMethodDeclaration(
        node: ts.MethodDeclaration,
        className: tstl.Identifier,
        noPrototype: boolean
    ): StatementVisitResult {
        // Don't transform methods without body (overload declarations)
        if (!node.body) {
            return undefined;
        }

        this.validateClassElement(node);

        let methodName = this.transformPropertyName(node.name);
        if (tstl.isStringLiteral(methodName) && methodName.value === "toString") {
            methodName = tstl.createStringLiteral("__tostring", node.name);
        }

        const type = this.checker.getTypeAtLocation(node);
        const context =
            tsHelper.getFunctionContextType(type, this.program) !== tsHelper.ContextType.Void
                ? this.createSelfIdentifier()
                : undefined;
        const [paramNames, dots, restParamName] = this.transformParameters(node.parameters, context);

        const [body] = this.transformFunctionBody(node.parameters, node.body, restParamName);
        const functionExpression = tstl.createFunctionExpression(
            tstl.createBlock(body),
            paramNames,
            dots,
            restParamName,
            tstl.FunctionExpressionFlags.Declaration,
            node.body
        );

        const methodTable =
            tsHelper.isStaticNode(node) || noPrototype
                ? tstl.cloneIdentifier(className)
                : tstl.createTableIndexExpression(
                      tstl.cloneIdentifier(className),
                      tstl.createStringLiteral("prototype")
                  );

        return tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(methodTable, methodName),
            functionExpression,
            node
        );
    }

    protected transformParameters(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        context?: tstl.Identifier
    ): [tstl.Identifier[], tstl.DotsLiteral | undefined, tstl.Identifier | undefined] {
        // Build parameter string
        const paramNames: tstl.Identifier[] = [];
        if (context) {
            paramNames.push(context);
        }

        let restParamName: tstl.Identifier | undefined;
        let dotsLiteral: tstl.DotsLiteral | undefined;
        let identifierIndex = 0;

        // Only push parameter name to paramName array if it isn't a spread parameter
        for (const param of parameters) {
            if (ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
                continue;
            }

            // Binding patterns become ____bindingPattern0, ____bindingPattern1, etc as function parameters
            // See transformFunctionBody for how these values are destructured
            const paramName =
                ts.isObjectBindingPattern(param.name) || ts.isArrayBindingPattern(param.name)
                    ? tstl.createIdentifier(`____bindingPattern${identifierIndex++}`)
                    : this.transformIdentifier(param.name as ts.Identifier);

            // This parameter is a spread parameter (...param)
            if (!param.dotDotDotToken) {
                paramNames.push(paramName);
            } else {
                restParamName = paramName;
                // Push the spread operator into the paramNames array
                dotsLiteral = tstl.createDotsLiteral();
            }
        }

        return [paramNames, dotsLiteral, restParamName];
    }

    protected isRestParameterReferenced(identifier: tstl.Identifier, scope: Scope): boolean {
        if (!identifier.symbolId) {
            return true;
        }
        if (scope.referencedSymbols === undefined) {
            return false;
        }
        const references = scope.referencedSymbols.get(identifier.symbolId);
        if (!references) {
            return false;
        }
        // Ignore references to @vararg types in spread elements
        return references.some(
            r => !r.parent || !ts.isSpreadElement(r.parent) || !tsHelper.isVarArgType(r, this.checker)
        );
    }

    protected transformFunctionBodyStatements(body: ts.Block): [tstl.Statement[], Scope] {
        this.pushScope(ScopeType.Function);
        const bodyStatements = this.performHoisting(this.transformStatements(body.statements));
        const scope = this.popScope();
        return [bodyStatements, scope];
    }

    protected transformFunctionBodyHeader(
        bodyScope: Scope,
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        spreadIdentifier?: tstl.Identifier
    ): tstl.Statement[] {
        const headerStatements: tstl.Statement[] = [];

        // Add default parameters and object binding patterns
        const bindingPatternDeclarations: tstl.Statement[] = [];
        let bindPatternIndex = 0;
        for (const declaration of parameters) {
            if (ts.isObjectBindingPattern(declaration.name) || ts.isArrayBindingPattern(declaration.name)) {
                const identifier = tstl.createIdentifier(`____bindingPattern${bindPatternIndex++}`);
                if (declaration.initializer !== undefined) {
                    // Default binding parameter
                    headerStatements.push(
                        this.transformParameterDefaultValueDeclaration(identifier, declaration.initializer)
                    );
                }

                // Binding pattern
                bindingPatternDeclarations.push(
                    ...this.statementVisitResultToArray(this.transformBindingPattern(declaration.name, identifier))
                );
            } else if (declaration.initializer !== undefined) {
                // Default parameter
                headerStatements.push(
                    this.transformParameterDefaultValueDeclaration(
                        this.transformIdentifier(declaration.name),
                        declaration.initializer
                    )
                );
            }
        }

        // Push spread operator here
        if (spreadIdentifier && this.isRestParameterReferenced(spreadIdentifier, bodyScope)) {
            const spreadTable = this.wrapInTable(tstl.createDotsLiteral());
            headerStatements.push(tstl.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
        }

        // Binding pattern statements need to be after spread table is declared
        headerStatements.push(...bindingPatternDeclarations);

        return headerStatements;
    }

    protected transformFunctionBody(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        body: ts.Block,
        spreadIdentifier?: tstl.Identifier
    ): [tstl.Statement[], Scope] {
        const [bodyStatements, scope] = this.transformFunctionBodyStatements(body);
        const headerStatements = this.transformFunctionBodyHeader(scope, parameters, spreadIdentifier);
        return [headerStatements.concat(bodyStatements), scope];
    }

    protected transformParameterDefaultValueDeclaration(
        parameterName: tstl.Identifier,
        value?: ts.Expression,
        tsOriginal?: ts.Node
    ): tstl.Statement {
        const parameterValue = value ? this.transformExpression(value) : undefined;
        const assignment = tstl.createAssignmentStatement(parameterName, parameterValue);

        const nilCondition = tstl.createBinaryExpression(
            parameterName,
            tstl.createNilLiteral(),
            tstl.SyntaxKind.EqualityOperator
        );

        const ifBlock = tstl.createBlock([assignment]);

        return tstl.createIfStatement(nilCondition, ifBlock, undefined, tsOriginal);
    }

    public transformBindingPattern(
        pattern: ts.BindingPattern,
        table: tstl.Identifier,
        propertyAccessStack: ts.PropertyName[] = []
    ): StatementVisitResult {
        const result: tstl.Statement[] = [];
        const isObjectBindingPattern = ts.isObjectBindingPattern(pattern);
        for (let index = 0; index < pattern.elements.length; index++) {
            const element = pattern.elements[index];
            if (ts.isOmittedExpression(element)) continue;

            if (ts.isArrayBindingPattern(element.name) || ts.isObjectBindingPattern(element.name)) {
                // nested binding pattern
                const propertyName = isObjectBindingPattern
                    ? element.propertyName
                    : ts.createNumericLiteral(String(index + 1));
                if (propertyName !== undefined) {
                    propertyAccessStack.push(propertyName);
                }
                result.push(
                    ...this.statementVisitResultToArray(
                        this.transformBindingPattern(element.name, table, propertyAccessStack)
                    )
                );
                continue;
            }

            // Build the path to the table
            let tableExpression: tstl.Expression = table;
            propertyAccessStack.forEach(property => {
                const propertyName = ts.isPropertyName(property)
                    ? this.transformPropertyName(property)
                    : this.transformNumericLiteral(property);
                tableExpression = tstl.createTableIndexExpression(tableExpression, propertyName);
            });

            // The identifier of the new variable
            const variableName = this.transformIdentifier(element.name as ts.Identifier);
            // The field to extract
            const propertyName = this.transformPropertyName(element.propertyName || element.name);

            let expression: tstl.Expression;
            if (element.dotDotDotToken) {
                if (index !== pattern.elements.length - 1) continue;

                if (isObjectBindingPattern) {
                    const elements = pattern.elements as ts.NodeArray<ts.BindingElement>;
                    const usedProperties = elements.map(e =>
                        tstl.createTableFieldExpression(
                            tstl.createBooleanLiteral(true),
                            tstl.createStringLiteral(
                                ((e.propertyName || e.name) as ts.Identifier).text,
                                e.propertyName || e.name
                            )
                        )
                    );

                    expression = this.transformLuaLibFunction(
                        LuaLibFeature.ObjectRest,
                        undefined,
                        tableExpression,
                        tstl.createTableExpression(usedProperties)
                    );
                } else {
                    expression = this.transformLuaLibFunction(
                        LuaLibFeature.ArraySlice,
                        undefined,
                        tableExpression,
                        tstl.createNumericLiteral(index)
                    );
                }
            } else {
                expression = tstl.createTableIndexExpression(
                    tableExpression,
                    isObjectBindingPattern ? propertyName : tstl.createNumericLiteral(index + 1)
                );
            }

            result.push(...this.createLocalOrExportedOrGlobalDeclaration(variableName, expression));
            if (element.initializer) {
                const identifier = this.addExportToIdentifier(variableName);
                result.push(
                    tstl.createIfStatement(
                        tstl.createBinaryExpression(
                            identifier,
                            tstl.createNilLiteral(),
                            tstl.SyntaxKind.EqualityOperator
                        ),
                        tstl.createBlock([
                            tstl.createAssignmentStatement(identifier, this.transformExpression(element.initializer)),
                        ])
                    )
                );
            }
        }
        propertyAccessStack.pop();
        return result;
    }

    protected createModuleLocalNameIdentifier(declaration: ts.ModuleDeclaration): tstl.Identifier {
        const moduleSymbol = this.checker.getSymbolAtLocation(declaration.name);
        if (moduleSymbol !== undefined && this.isUnsafeName(moduleSymbol.name)) {
            return tstl.createIdentifier(
                this.createSafeName(declaration.name.text),
                declaration.name,
                moduleSymbol && this.symbolIds.get(moduleSymbol),
                declaration.name.text
            );
        }
        return this.transformIdentifier(declaration.name as ts.Identifier);
    }

    public transformModuleDeclaration(statement: ts.ModuleDeclaration): StatementVisitResult {
        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(statement), this.checker);
        // If phantom namespace elide the declaration and return the body
        if (decorators.has(DecoratorKind.Phantom) && statement.body && ts.isModuleBlock(statement.body)) {
            return this.transformStatements(statement.body.statements);
        }

        const result: tstl.Statement[] = [];

        const symbol = this.checker.getSymbolAtLocation(statement.name);
        const hasExports = symbol !== undefined && this.checker.getExportsOfModule(symbol).length > 0;
        const nameIdentifier = this.transformIdentifier(statement.name as ts.Identifier);
        const exportScope = this.getIdentifierExportScope(nameIdentifier);

        // Non-module namespace could be merged if:
        // - is top level
        // - is nested and exported
        const isNonModuleMergeable = !this.isModule && (!this.currentNamespace || exportScope);

        // This is NOT the first declaration if:
        // - declared as a module before this (ignore interfaces with same name)
        // - declared as a class or function at all (TS requires these to be before module, unless module is empty)
        const isFirstDeclaration =
            symbol === undefined ||
            (symbol.declarations.findIndex(d => ts.isClassLike(d) || ts.isFunctionDeclaration(d)) === -1 &&
                statement === symbol.declarations.find(ts.isModuleDeclaration));

        if (isNonModuleMergeable) {
            // 'local NS = NS or {}' or 'exportTable.NS = exportTable.NS or {}'
            const localDeclaration = this.createLocalOrExportedOrGlobalDeclaration(
                nameIdentifier,
                tstl.createBinaryExpression(
                    this.addExportToIdentifier(nameIdentifier),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator
                )
            );

            result.push(...localDeclaration);
        } else if (isFirstDeclaration) {
            // local NS = {} or exportTable.NS = {}
            const localDeclaration = this.createLocalOrExportedOrGlobalDeclaration(
                nameIdentifier,
                tstl.createTableExpression()
            );

            result.push(...localDeclaration);
        }

        if (
            (isNonModuleMergeable || isFirstDeclaration) &&
            exportScope &&
            hasExports &&
            tsHelper.moduleHasEmittedBody(statement)
        ) {
            // local NS = exportTable.NS
            const localDeclaration = this.createHoistableVariableDeclarationStatement(
                this.createModuleLocalNameIdentifier(statement),
                this.createExportedIdentifier(nameIdentifier, exportScope)
            );

            result.push(localDeclaration);
        }

        // Set current namespace for nested NS
        // Keep previous currentNS to reset after block transpilation
        const previousNamespace = this.currentNamespace;
        this.currentNamespace = statement;

        // Transform moduleblock to block and visit it
        if (tsHelper.moduleHasEmittedBody(statement)) {
            this.pushScope(ScopeType.Block);
            let statements = ts.isModuleBlock(statement.body)
                ? this.transformStatements(statement.body.statements)
                : this.transformModuleDeclaration(statement.body);
            statements = this.performHoisting(this.statementVisitResultToArray(statements));
            this.popScope();
            result.push(tstl.createDoStatement(statements));
        }

        this.currentNamespace = previousNamespace;

        return result;
    }

    public transformEnumDeclaration(node: ts.EnumDeclaration): StatementVisitResult {
        if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Const && !this.options.preserveConstEnums) {
            return undefined;
        }

        const type = this.checker.getTypeAtLocation(node);
        const membersOnly = tsHelper.getCustomDecorators(type, this.checker).has(DecoratorKind.CompileMembersOnly);
        const result: tstl.Statement[] = [];

        if (!membersOnly) {
            const name = this.transformIdentifier(node.name);
            const table = tstl.createTableExpression();
            result.push(...this.createLocalOrExportedOrGlobalDeclaration(name, table, node));
        }

        const enumReference = this.transformExpression(node.name);
        for (const member of node.members) {
            const memberName = this.transformPropertyName(member.name);

            let valueExpression: tstl.Expression | undefined;
            const constEnumValue = this.tryGetConstEnumValue(member);
            if (constEnumValue) {
                valueExpression = constEnumValue;
            } else if (member.initializer) {
                if (ts.isIdentifier(member.initializer)) {
                    const symbol = this.checker.getSymbolAtLocation(member.initializer);
                    if (
                        symbol &&
                        symbol.valueDeclaration &&
                        ts.isEnumMember(symbol.valueDeclaration) &&
                        symbol.valueDeclaration.parent === node
                    ) {
                        const otherMemberName = this.transformPropertyName(symbol.valueDeclaration.name);
                        valueExpression = tstl.createTableIndexExpression(enumReference, otherMemberName);
                    }
                }

                if (!valueExpression) {
                    valueExpression = this.transformExpression(member.initializer);
                }
            } else {
                valueExpression = tstl.createNilLiteral();
            }

            if (membersOnly) {
                const enumSymbol = this.checker.getSymbolAtLocation(node.name);
                const exportScope = enumSymbol ? this.getSymbolExportScope(enumSymbol) : undefined;

                result.push(
                    ...this.createLocalOrExportedOrGlobalDeclaration(
                        tstl.isIdentifier(memberName)
                            ? memberName
                            : tstl.createIdentifier(member.name.getText(), member.name),
                        valueExpression,
                        node,
                        undefined,
                        exportScope
                    )
                );
            } else {
                const memberAccessor = tstl.createTableIndexExpression(enumReference, memberName);
                result.push(tstl.createAssignmentStatement(memberAccessor, valueExpression, member));

                if (!tstl.isStringLiteral(valueExpression) && !tstl.isNilLiteral(valueExpression)) {
                    const reverseMemberAccessor = tstl.createTableIndexExpression(enumReference, memberAccessor);
                    result.push(tstl.createAssignmentStatement(reverseMemberAccessor, memberName, member));
                }
            }
        }

        return result;
    }

    protected transformGeneratorFunction(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        body: ts.Block,
        spreadIdentifier?: tstl.Identifier
    ): [tstl.Statement[], Scope] {
        this.importLuaLibFeature(LuaLibFeature.Symbol);
        const [functionBody, functionScope] = this.transformFunctionBody(parameters, body);

        const coroutineIdentifier = tstl.createIdentifier("____co");
        const valueIdentifier = tstl.createIdentifier("____value");
        const errIdentifier = tstl.createIdentifier("____err");
        const itIdentifier = tstl.createIdentifier("____it");

        //local ____co = coroutine.create(originalFunction)
        const coroutine = tstl.createVariableDeclarationStatement(
            coroutineIdentifier,
            tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("create")),
                [tstl.createFunctionExpression(tstl.createBlock(functionBody))]
            )
        );

        const nextBody = [];
        // coroutine.resume(__co, ...)
        const resumeCall = tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("resume")),
            [coroutineIdentifier, tstl.createDotsLiteral()]
        );

        // ____err, ____value = coroutine.resume(____co, ...)
        nextBody.push(tstl.createVariableDeclarationStatement([errIdentifier, valueIdentifier], resumeCall));

        //if(not ____err){error(____value)}
        const errorCheck = tstl.createIfStatement(
            tstl.createUnaryExpression(errIdentifier, tstl.SyntaxKind.NotOperator),
            tstl.createBlock([
                tstl.createExpressionStatement(
                    tstl.createCallExpression(tstl.createIdentifier("error"), [valueIdentifier])
                ),
            ])
        );
        nextBody.push(errorCheck);

        //coroutine.status(____co) == "dead";
        const coStatus = tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("status")),
            [coroutineIdentifier]
        );
        const status = tstl.createBinaryExpression(
            coStatus,
            tstl.createStringLiteral("dead"),
            tstl.SyntaxKind.EqualityOperator
        );

        //{done = coroutine.status(____co) == "dead"; value = ____value}
        const iteratorResult = tstl.createTableExpression([
            tstl.createTableFieldExpression(status, tstl.createStringLiteral("done")),
            tstl.createTableFieldExpression(valueIdentifier, tstl.createStringLiteral("value")),
        ]);
        nextBody.push(tstl.createReturnStatement([iteratorResult]));

        //function(____, ...)
        const nextFunctionDeclaration = tstl.createFunctionExpression(
            tstl.createBlock(nextBody),
            [tstl.createAnonymousIdentifier()],
            tstl.createDotsLiteral()
        );

        //____it = {next = function(____, ...)}
        const iterator = tstl.createVariableDeclarationStatement(
            itIdentifier,
            tstl.createTableExpression([
                tstl.createTableFieldExpression(nextFunctionDeclaration, tstl.createStringLiteral("next")),
            ])
        );

        const symbolIterator = tstl.createTableIndexExpression(
            tstl.createIdentifier("Symbol"),
            tstl.createStringLiteral("iterator")
        );

        const block = [
            coroutine,
            iterator,
            //____it[Symbol.iterator] = {return ____it}
            tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(itIdentifier, symbolIterator),
                tstl.createFunctionExpression(tstl.createBlock([tstl.createReturnStatement([itIdentifier])]))
            ),
            //return ____it
            tstl.createReturnStatement([itIdentifier]),
        ];

        if (spreadIdentifier) {
            const spreadTable = this.wrapInTable(tstl.createDotsLiteral());
            block.unshift(tstl.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
        }

        return [block, functionScope];
    }

    public transformFunctionDeclaration(functionDeclaration: ts.FunctionDeclaration): StatementVisitResult {
        // Don't transform functions without body (overload declarations)
        if (!functionDeclaration.body) {
            return undefined;
        }

        const type = this.checker.getTypeAtLocation(functionDeclaration);
        const context =
            tsHelper.getFunctionContextType(type, this.program) !== tsHelper.ContextType.Void
                ? this.createSelfIdentifier()
                : undefined;
        const [params, dotsLiteral, restParamName] = this.transformParameters(functionDeclaration.parameters, context);

        const [body, functionScope] = functionDeclaration.asteriskToken
            ? this.transformGeneratorFunction(functionDeclaration.parameters, functionDeclaration.body, restParamName)
            : this.transformFunctionBody(functionDeclaration.parameters, functionDeclaration.body, restParamName);
        const block = tstl.createBlock(body);
        const functionExpression = tstl.createFunctionExpression(
            block,
            params,
            dotsLiteral,
            restParamName,
            tstl.FunctionExpressionFlags.Declaration
        );

        const name = functionDeclaration.name ? this.transformIdentifier(functionDeclaration.name) : undefined;

        if (name) {
            // Remember symbols referenced in this function for hoisting later
            if (!this.options.noHoisting && name.symbolId !== undefined) {
                const scope = this.peekScope();
                if (scope === undefined) {
                    throw TSTLErrors.UndefinedScope();
                }
                if (!scope.functionDefinitions) {
                    scope.functionDefinitions = new Map();
                }
                const functionInfo = { referencedSymbols: functionScope.referencedSymbols || new Map() };
                scope.functionDefinitions.set(name.symbolId, functionInfo);
            }
        }

        const isDefaultExport = tsHelper.hasDefaultExportModifier(functionDeclaration.modifiers);

        if (isDefaultExport) {
            return tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(
                    this.createExportsIdentifier(),
                    this.createDefaultExportStringLiteral(functionDeclaration)
                ),
                this.transformFunctionExpression(functionDeclaration)
            );
        } else if (!name) {
            throw TSTLErrors.MissingFunctionName(functionDeclaration);
        }

        return this.createLocalOrExportedOrGlobalDeclaration(name, functionExpression, functionDeclaration);
    }

    public transformTypeAliasDeclaration(_statement: ts.TypeAliasDeclaration): StatementVisitResult {
        return undefined;
    }

    public transformInterfaceDeclaration(_statement: ts.InterfaceDeclaration): StatementVisitResult {
        return undefined;
    }

    public transformVariableDeclaration(statement: ts.VariableDeclaration): StatementVisitResult {
        if (statement.initializer && statement.type) {
            // Validate assignment
            const initializerType = this.checker.getTypeAtLocation(statement.initializer);
            const varType = this.checker.getTypeFromTypeNode(statement.type);
            this.validateFunctionAssignment(statement.initializer, initializerType, varType);
        }

        if (ts.isIdentifier(statement.name)) {
            // Find variable identifier
            const identifierName = this.transformIdentifier(statement.name);
            if (statement.initializer) {
                const value = this.transformExpression(statement.initializer);
                return this.createLocalOrExportedOrGlobalDeclaration(identifierName, value, statement);
            } else {
                return this.createLocalOrExportedOrGlobalDeclaration(identifierName, undefined, statement);
            }
        } else if (ts.isArrayBindingPattern(statement.name) || ts.isObjectBindingPattern(statement.name)) {
            // Destructuring types
            const statements: tstl.Statement[] = [];

            // For object, nested, omitted or rest bindings fall back to transformBindingPattern
            if (
                ts.isObjectBindingPattern(statement.name) ||
                statement.name.elements.some(
                    e => ts.isBindingElement(e) && (!ts.isIdentifier(e.name) || e.dotDotDotToken)
                )
            ) {
                let table: tstl.Identifier;
                if (statement.initializer !== undefined && ts.isIdentifier(statement.initializer)) {
                    table = this.transformIdentifier(statement.initializer);
                } else {
                    // Contain the expression in a temporary variable
                    table = tstl.createAnonymousIdentifier();
                    if (statement.initializer) {
                        statements.push(
                            tstl.createVariableDeclarationStatement(
                                table,
                                this.transformExpression(statement.initializer)
                            )
                        );
                    }
                }
                statements.push(
                    ...this.statementVisitResultToArray(this.transformBindingPattern(statement.name, table))
                );
                return statements;
            }

            const vars =
                statement.name.elements.length > 0
                    ? this.filterUndefinedAndCast(
                          statement.name.elements.map(e => this.transformArrayBindingElement(e)),
                          tstl.isIdentifier
                      )
                    : tstl.createAnonymousIdentifier(statement.name);

            if (statement.initializer) {
                if (tsHelper.isTupleReturnCall(statement.initializer, this.checker)) {
                    // Don't unpack TupleReturn decorated functions
                    statements.push(
                        ...this.createLocalOrExportedOrGlobalDeclaration(
                            vars,
                            this.transformExpression(statement.initializer),
                            statement
                        )
                    );
                } else if (ts.isArrayLiteralExpression(statement.initializer)) {
                    // Don't unpack array literals
                    const values =
                        statement.initializer.elements.length > 0
                            ? statement.initializer.elements.map(e => this.transformExpression(e))
                            : tstl.createNilLiteral();
                    statements.push(...this.createLocalOrExportedOrGlobalDeclaration(vars, values, statement));
                } else {
                    // local vars = this.transpileDestructingAssignmentValue(node.initializer);
                    const initializer = this.createUnpackCall(
                        this.transformExpression(statement.initializer),
                        statement.initializer
                    );
                    statements.push(...this.createLocalOrExportedOrGlobalDeclaration(vars, initializer, statement));
                }
            } else {
                statements.push(
                    ...this.createLocalOrExportedOrGlobalDeclaration(vars, tstl.createNilLiteral(), statement)
                );
            }

            statement.name.elements.forEach(element => {
                if (!ts.isOmittedExpression(element) && element.initializer) {
                    const variableName = this.transformIdentifier(element.name as ts.Identifier);
                    const identifier = this.addExportToIdentifier(variableName);
                    statements.push(
                        tstl.createIfStatement(
                            tstl.createBinaryExpression(
                                identifier,
                                tstl.createNilLiteral(),
                                tstl.SyntaxKind.EqualityOperator
                            ),
                            tstl.createBlock([
                                tstl.createAssignmentStatement(
                                    identifier,
                                    this.transformExpression(element.initializer)
                                ),
                            ])
                        )
                    );
                }
            });

            return statements;
        }
    }

    public transformVariableStatement(statement: ts.VariableStatement): StatementVisitResult {
        const result: tstl.Statement[] = [];
        statement.declarationList.declarations.forEach(declaration => {
            const declarationStatements = this.transformVariableDeclaration(declaration);
            result.push(...this.statementVisitResultToArray(declarationStatements));
        });
        return result;
    }

    public transformExpressionStatement(statement: ts.ExpressionStatement | ts.Expression): StatementVisitResult {
        const expression = ts.isExpressionStatement(statement) ? statement.expression : statement;
        if (ts.isBinaryExpression(expression)) {
            const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(expression.operatorToken.kind);
            if (isCompound && replacementOperator) {
                // +=, -=, etc...
                return this.transformCompoundAssignmentStatement(
                    expression,
                    expression.left,
                    expression.right,
                    replacementOperator
                );
            } else if (expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                // = assignment
                return this.transformAssignmentStatement(expression);
            } else if (expression.operatorToken.kind === ts.SyntaxKind.CommaToken) {
                const lhs = this.statementVisitResultToArray(this.transformExpressionStatement(expression.left));
                const rhs = this.statementVisitResultToArray(this.transformExpressionStatement(expression.right));
                return tstl.createDoStatement([...lhs, ...rhs], expression);
            }
        } else if (
            ts.isPrefixUnaryExpression(expression) &&
            (expression.operator === ts.SyntaxKind.PlusPlusToken ||
                expression.operator === ts.SyntaxKind.MinusMinusToken)
        ) {
            // ++i, --i
            const replacementOperator =
                expression.operator === ts.SyntaxKind.PlusPlusToken
                    ? ts.SyntaxKind.PlusToken
                    : ts.SyntaxKind.MinusToken;

            return this.transformCompoundAssignmentStatement(
                expression,
                expression.operand,
                ts.createLiteral(1),
                replacementOperator
            );
        } else if (ts.isPostfixUnaryExpression(expression)) {
            // i++, i--
            const replacementOperator =
                expression.operator === ts.SyntaxKind.PlusPlusToken
                    ? ts.SyntaxKind.PlusToken
                    : ts.SyntaxKind.MinusToken;

            return this.transformCompoundAssignmentStatement(
                expression,
                expression.operand,
                ts.createLiteral(1),
                replacementOperator
            );
        } else if (ts.isDeleteExpression(expression)) {
            return tstl.createAssignmentStatement(
                this.transformExpression(expression.expression) as tstl.AssignmentLeftHandSideExpression,
                tstl.createNilLiteral(),
                expression
            );
        }

        if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
            const ownerType = this.checker.getTypeAtLocation(expression.expression.expression);
            const classDecorators = tsHelper.getCustomDecorators(ownerType, this.checker);
            if (classDecorators.has(DecoratorKind.LuaTable)) {
                return this.transformLuaTableExpressionAsExpressionStatement(expression);
            }
        }

        const result = this.transformExpression(expression);
        return tstl.isCallExpression(result) || tstl.isMethodCallExpression(result)
            ? tstl.createExpressionStatement(result)
            : // Assign expression statements to dummy to make sure they're legal Lua
              tstl.createVariableDeclarationStatement(tstl.createAnonymousIdentifier(), result);
    }

    public transformYieldExpression(expression: ts.YieldExpression): ExpressionVisitResult {
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("yield")),
            expression.expression ? [this.transformExpression(expression.expression)] : [],
            expression
        );
    }

    public transformReturnStatement(statement: ts.ReturnStatement): StatementVisitResult {
        // Bubble up explicit return flag and check if we're inside a try/catch block
        let insideTryCatch = false;
        for (let i = this.scopeStack.length - 1; i >= 0; --i) {
            const scope = this.scopeStack[i];
            scope.functionReturned = true;

            if (scope.type === ScopeType.Function) {
                break;
            }

            insideTryCatch = insideTryCatch || scope.type === ScopeType.Try || scope.type === ScopeType.Catch;
        }

        let results: tstl.Expression[];

        if (statement.expression) {
            const expressionType = this.checker.getTypeAtLocation(statement.expression);
            const returnType = tsHelper.getContainingFunctionReturnType(statement, this.checker);
            if (returnType) {
                this.validateFunctionAssignment(statement, expressionType, returnType);
            }
            if (tsHelper.isInTupleReturnFunction(statement, this.checker)) {
                // Parent function is a TupleReturn function
                if (ts.isArrayLiteralExpression(statement.expression)) {
                    // If return expression is an array literal, leave out brackets.
                    results = statement.expression.elements.map(elem => this.transformExpression(elem));
                } else if (
                    !tsHelper.isTupleReturnCall(statement.expression, this.checker) &&
                    tsHelper.isArrayType(expressionType, this.checker, this.program)
                ) {
                    // If return expression is an array-type and not another TupleReturn call, unpack it
                    const expression = this.createUnpackCall(
                        this.transformExpression(statement.expression),
                        statement.expression
                    );
                    results = [expression];
                } else {
                    results = [this.transformExpression(statement.expression)];
                }

                // Wrap tupleReturn results when returning inside try/catch
                if (insideTryCatch) {
                    results = [this.wrapInTable(...results)];
                }
            } else {
                results = [this.transformExpression(statement.expression)];
            }
        } else {
            // Empty return
            results = [];
        }

        if (insideTryCatch) {
            results.unshift(tstl.createBooleanLiteral(true));
        }

        return tstl.createReturnStatement(results, statement);
    }

    public transformIfStatement(statement: ts.IfStatement): StatementVisitResult {
        this.pushScope(ScopeType.Conditional);
        const condition = this.transformExpression(statement.expression);
        const statements = this.performHoisting(this.transformBlockOrStatement(statement.thenStatement));
        this.popScope();
        const ifBlock = tstl.createBlock(statements);
        if (statement.elseStatement) {
            if (ts.isIfStatement(statement.elseStatement)) {
                const elseStatement = this.transformIfStatement(statement.elseStatement) as tstl.IfStatement;
                return tstl.createIfStatement(condition, ifBlock, elseStatement);
            } else {
                this.pushScope(ScopeType.Conditional);
                const elseStatements = this.performHoisting(this.transformBlockOrStatement(statement.elseStatement));
                this.popScope();
                const elseBlock = tstl.createBlock(elseStatements);
                return tstl.createIfStatement(condition, ifBlock, elseBlock);
            }
        }
        return tstl.createIfStatement(condition, ifBlock);
    }

    public transformWhileStatement(statement: ts.WhileStatement): StatementVisitResult {
        return tstl.createWhileStatement(
            tstl.createBlock(this.transformLoopBody(statement)),
            this.transformExpression(statement.expression),
            statement
        );
    }

    public transformDoStatement(statement: ts.DoStatement): StatementVisitResult {
        const body = tstl.createDoStatement(this.transformLoopBody(statement));
        let condition = this.transformExpression(statement.expression);
        if (tstl.isUnaryExpression(condition) && condition.operator === tstl.SyntaxKind.NotOperator) {
            condition = condition.operand;
        } else {
            condition = tstl.createUnaryExpression(
                tstl.createParenthesizedExpression(condition),
                tstl.SyntaxKind.NotOperator
            );
        }
        return tstl.createRepeatStatement(tstl.createBlock([body]), condition, statement);
    }

    public transformForStatement(statement: ts.ForStatement): StatementVisitResult {
        const result: tstl.Statement[] = [];

        if (statement.initializer) {
            if (ts.isVariableDeclarationList(statement.initializer)) {
                for (const variableDeclaration of statement.initializer.declarations) {
                    // local initializer = value
                    const declarations = this.transformVariableDeclaration(variableDeclaration);
                    result.push(...this.statementVisitResultToArray(declarations));
                }
            } else {
                const initializerStatements = this.transformExpressionStatement(statement.initializer);
                result.push(...this.statementVisitResultToArray(initializerStatements));
            }
        }

        const condition = statement.condition
            ? this.transformExpression(statement.condition)
            : tstl.createBooleanLiteral(true);

        // Add body
        const body: tstl.Statement[] = this.transformLoopBody(statement);

        if (statement.incrementor) {
            const bodyStatements = this.transformExpressionStatement(statement.incrementor);
            body.push(...this.statementVisitResultToArray(bodyStatements));
        }

        // while (condition) do ... end
        result.push(tstl.createWhileStatement(tstl.createBlock(body), condition));

        return tstl.createDoStatement(result, statement);
    }

    protected transformForOfInitializer(
        initializer: ts.ForInitializer,
        expression: tstl.Expression
    ): tstl.Statement | undefined {
        if (ts.isVariableDeclarationList(initializer)) {
            // Declaration of new variable
            const variableDeclarations = this.transformVariableDeclaration(initializer.declarations[0]);
            if (ts.isArrayBindingPattern(initializer.declarations[0].name)) {
                if (initializer.declarations[0].name.elements.length === 0) {
                    // Ignore empty destructuring assignment
                    return undefined;
                }
                expression = this.createUnpackCall(expression, initializer);
            } else if (ts.isObjectBindingPattern(initializer.declarations[0].name)) {
                throw TSTLErrors.UnsupportedObjectDestructuringInForOf(initializer);
            }

            const variableStatements = this.statementVisitResultToArray(variableDeclarations);
            if (variableStatements[0]) {
                // we can safely assume that for vars are not exported and therefore declarationstatenents
                return tstl.createVariableDeclarationStatement(
                    (variableStatements[0] as tstl.VariableDeclarationStatement).left,
                    expression
                );
            } else {
                throw TSTLErrors.MissingForOfVariables(initializer);
            }
        } else {
            // Assignment to existing variable
            let variables: tstl.AssignmentLeftHandSideExpression | tstl.AssignmentLeftHandSideExpression[];
            if (ts.isArrayLiteralExpression(initializer)) {
                if (initializer.elements.length > 0) {
                    expression = this.createUnpackCall(expression, initializer);
                    variables = initializer.elements.map(e =>
                        this.transformExpression(e)
                    ) as tstl.AssignmentLeftHandSideExpression[];
                } else {
                    // Ignore empty destructring assignment
                    return undefined;
                }
            } else if (ts.isObjectLiteralExpression(initializer)) {
                throw TSTLErrors.UnsupportedObjectDestructuringInForOf(initializer);
            } else {
                variables = this.transformExpression(initializer) as tstl.AssignmentLeftHandSideExpression;
            }
            return tstl.createAssignmentStatement(variables, expression);
        }
    }

    protected transformLoopBody(
        loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
    ): tstl.Statement[] {
        this.pushScope(ScopeType.Loop);
        const body = this.performHoisting(this.transformBlockOrStatement(loop.statement));
        const scope = this.popScope();
        const scopeId = scope.id;

        if (!scope.loopContinued) {
            return body;
        }

        const baseResult: tstl.Statement[] = [tstl.createDoStatement(body)];
        const continueLabel = tstl.createLabelStatement(`__continue${scopeId}`);
        baseResult.push(continueLabel);

        return baseResult;
    }

    protected transformBlockOrStatement(statement: ts.Statement): tstl.Statement[] {
        return ts.isBlock(statement)
            ? this.transformStatements(statement.statements)
            : this.statementVisitResultToArray(this.transformStatement(statement));
    }

    protected transformForOfArrayStatement(statement: ts.ForOfStatement, block: tstl.Block): StatementVisitResult {
        let valueVariable: tstl.Identifier;
        if (ts.isVariableDeclarationList(statement.initializer)) {
            // Declaration of new variable
            const variables = statement.initializer.declarations[0].name;
            if (ts.isArrayBindingPattern(variables) || ts.isObjectBindingPattern(variables)) {
                valueVariable = tstl.createIdentifier("____values");
                const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
                if (initializer) {
                    block.statements.unshift(initializer);
                }
            } else {
                valueVariable = this.transformIdentifier(variables);
            }
        } else {
            // Assignment to existing variable
            valueVariable = tstl.createIdentifier("____value");
            const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
            if (initializer) {
                block.statements.unshift(initializer);
            }
        }

        const ipairsCall = tstl.createCallExpression(tstl.createIdentifier("ipairs"), [
            this.transformExpression(statement.expression),
        ]);

        return tstl.createForInStatement(
            block,
            [tstl.createAnonymousIdentifier(), valueVariable],
            [ipairsCall],
            statement
        );
    }

    protected transformForOfLuaIteratorStatement(
        statement: ts.ForOfStatement,
        block: tstl.Block
    ): StatementVisitResult {
        const luaIterator = this.transformExpression(statement.expression);
        const type = this.checker.getTypeAtLocation(statement.expression);
        const tupleReturn = tsHelper.getCustomDecorators(type, this.checker).has(DecoratorKind.TupleReturn);
        if (tupleReturn) {
            // LuaIterator + TupleReturn
            if (ts.isVariableDeclarationList(statement.initializer)) {
                // Variables declared in for loop
                // for ${initializer} in ${iterable} do
                const initializerVariable = statement.initializer.declarations[0].name;
                if (ts.isArrayBindingPattern(initializerVariable)) {
                    const identifiers = this.filterUndefinedAndCast(
                        initializerVariable.elements.map(e => this.transformArrayBindingElement(e)),
                        tstl.isIdentifier
                    );
                    if (identifiers.length === 0) {
                        identifiers.push(tstl.createAnonymousIdentifier());
                    }
                    return tstl.createForInStatement(block, identifiers, [luaIterator]);
                } else {
                    // Single variable is not allowed
                    throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(statement.initializer);
                }
            } else {
                // Variables NOT declared in for loop - catch iterator values in temps and assign
                // for ____value0 in ${iterable} do
                //     ${initializer} = ____value0
                if (ts.isArrayLiteralExpression(statement.initializer)) {
                    const tmps = statement.initializer.elements.map((_, i) => tstl.createIdentifier(`____value${i}`));
                    if (tmps.length > 0) {
                        const assign = tstl.createAssignmentStatement(
                            statement.initializer.elements.map(
                                e => this.transformExpression(e) as tstl.AssignmentLeftHandSideExpression
                            ),
                            tmps
                        );
                        block.statements.splice(0, 0, assign);
                    } else {
                        tmps.push(tstl.createAnonymousIdentifier());
                    }
                    return tstl.createForInStatement(block, tmps, [luaIterator]);
                } else {
                    // Single variable is not allowed
                    throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(statement.initializer);
                }
            }
        } else {
            // LuaIterator (no TupleReturn)
            if (
                ts.isVariableDeclarationList(statement.initializer) &&
                ts.isIdentifier(statement.initializer.declarations[0].name)
            ) {
                // Single variable declared in for loop
                // for ${initializer} in ${iterator} do
                return tstl.createForInStatement(
                    block,
                    [this.transformIdentifier(statement.initializer.declarations[0].name as ts.Identifier)],
                    [luaIterator]
                );
            } else {
                // Destructuring or variable NOT declared in for loop
                // for ____value in ${iterator} do
                //     local ${initializer} = unpack(____value)
                const valueVariable = tstl.createIdentifier("____value");
                const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
                if (initializer) {
                    block.statements.splice(0, 0, initializer);
                }
                return tstl.createForInStatement(block, [valueVariable], [luaIterator]);
            }
        }
    }

    protected transformForOfIteratorStatement(statement: ts.ForOfStatement, block: tstl.Block): StatementVisitResult {
        const iterable = this.transformExpression(statement.expression);
        if (
            ts.isVariableDeclarationList(statement.initializer) &&
            ts.isIdentifier(statement.initializer.declarations[0].name)
        ) {
            // Single variable declared in for loop
            // for ${initializer} in __TS__iterator(${iterator}) do
            return tstl.createForInStatement(
                block,
                [this.transformIdentifier(statement.initializer.declarations[0].name as ts.Identifier)],
                [this.transformLuaLibFunction(LuaLibFeature.Iterator, statement.expression, iterable)]
            );
        } else {
            // Destructuring or variable NOT declared in for loop
            // for ____value in __TS__iterator(${iterator}) do
            //     local ${initializer} = ____value
            const valueVariable = tstl.createIdentifier("____value");
            const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
            if (initializer) {
                block.statements.splice(0, 0, initializer);
            }
            return tstl.createForInStatement(
                block,
                [valueVariable],
                [this.transformLuaLibFunction(LuaLibFeature.Iterator, statement.expression, iterable)]
            );
        }
    }

    protected transformForRangeStatement(statement: ts.ForOfStatement, body: tstl.Block): StatementVisitResult {
        if (!ts.isCallExpression(statement.expression)) {
            throw TSTLErrors.InvalidForRangeCall(statement.expression, "Expression must be a call expression.");
        }

        if (statement.expression.arguments.length < 2 || statement.expression.arguments.length > 3) {
            throw TSTLErrors.InvalidForRangeCall(
                statement.expression,
                "@forRange function must take 2 or 3 arguments."
            );
        }

        if (
            statement.expression.arguments.some(
                a => !tsHelper.isNumberType(this.checker.getTypeAtLocation(a), this.checker, this.program)
            )
        ) {
            throw TSTLErrors.InvalidForRangeCall(statement.expression, "@forRange arguments must be number types.");
        }

        if (!ts.isVariableDeclarationList(statement.initializer)) {
            throw TSTLErrors.InvalidForRangeCall(
                statement.initializer,
                "@forRange loop must declare its own control variable."
            );
        }

        const controlDeclaration = statement.initializer.declarations[0];
        if (!ts.isIdentifier(controlDeclaration.name)) {
            throw TSTLErrors.InvalidForRangeCall(statement.initializer, "@forRange loop cannot use destructuring.");
        }

        const controlType = this.checker.getTypeAtLocation(controlDeclaration);
        if (controlType && !tsHelper.isNumberType(controlType, this.checker, this.program)) {
            throw TSTLErrors.InvalidForRangeCall(
                statement.expression,
                "@forRange function must return Iterable<number> or Array<number>."
            );
        }

        const control = this.transformIdentifier(controlDeclaration.name);
        const signature = this.checker.getResolvedSignature(statement.expression);
        const [start, limit, step] = this.transformArguments(statement.expression.arguments, signature);
        return tstl.createForStatement(body, control, start, limit, step, statement);
    }

    public transformForOfStatement(statement: ts.ForOfStatement): StatementVisitResult {
        // Transpile body
        const body = tstl.createBlock(this.transformLoopBody(statement));

        if (
            ts.isCallExpression(statement.expression) &&
            tsHelper.isForRangeType(statement.expression.expression, this.checker)
        ) {
            // ForRange
            return this.transformForRangeStatement(statement, body);
        } else if (tsHelper.isLuaIteratorType(statement.expression, this.checker)) {
            // LuaIterators
            return this.transformForOfLuaIteratorStatement(statement, body);
        } else if (
            tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker, this.program)
        ) {
            // Arrays
            return this.transformForOfArrayStatement(statement, body);
        } else {
            // TS Iterables
            return this.transformForOfIteratorStatement(statement, body);
        }
    }

    public transformForInStatement(statement: ts.ForInStatement): StatementVisitResult {
        // Transpile expression
        const pairsIdentifier = tstl.createIdentifier("pairs");
        const expression = this.transformExpression(statement.expression);
        const pairsCall = tstl.createCallExpression(pairsIdentifier, [expression]);

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker, this.program)) {
            throw TSTLErrors.ForbiddenForIn(statement);
        }

        const body = tstl.createBlock(this.transformLoopBody(statement));

        // Transform iteration variable
        // TODO: After the transformation pipeline refactor we should look at refactoring this together with the
        // for-of initializer transformation.
        let iterationVariable: tstl.Identifier;
        if (
            ts.isVariableDeclarationList(statement.initializer) &&
            ts.isIdentifier(statement.initializer.declarations[0].name)
        ) {
            iterationVariable = this.transformIdentifier(statement.initializer.declarations[0].name);
        } else if (ts.isIdentifier(statement.initializer)) {
            // Iteration variable becomes ____key
            iterationVariable = tstl.createIdentifier("____key");
            // Push variable = ____key to the start of the loop body to match TS scoping
            const initializer = tstl.createAssignmentStatement(
                this.transformIdentifier(statement.initializer),
                iterationVariable
            );
            body.statements.unshift(initializer);
        } else {
            // This should never occur
            throw TSTLErrors.UnsupportedForInVariable(statement.initializer);
        }

        return tstl.createForInStatement(body, [iterationVariable], [pairsCall], statement);
    }

    public transformSwitchStatement(statement: ts.SwitchStatement): StatementVisitResult {
        if (this.luaTarget === LuaTarget.Lua51) {
            throw TSTLErrors.UnsupportedForTarget("Switch statements", this.luaTarget, statement);
        }

        this.pushScope(ScopeType.Switch);

        // Give the switch a unique name to prevent nested switches from acting up.
        const scope = this.peekScope();
        if (scope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }
        const switchName = `____switch${scope.id}`;

        const expression = this.transformExpression(statement.expression);
        const switchVariable = tstl.createIdentifier(switchName);
        const switchVariableDeclaration = tstl.createVariableDeclarationStatement(switchVariable, expression);

        let statements: tstl.Statement[] = [switchVariableDeclaration];

        const caseClauses = statement.caseBlock.clauses.filter(c => ts.isCaseClause(c)) as ts.CaseClause[];

        for (let i = 0; i < caseClauses.length; i++) {
            const clause = caseClauses[i];
            // If the clause condition holds, go to the correct label
            const condition = tstl.createBinaryExpression(
                switchVariable,
                this.transformExpression(clause.expression),
                tstl.SyntaxKind.EqualityOperator
            );
            const goto = tstl.createGotoStatement(`${switchName}_case_${i}`);
            const conditionalGoto = tstl.createIfStatement(condition, tstl.createBlock([goto]));
            statements.push(conditionalGoto);
        }

        const hasDefaultCase = statement.caseBlock.clauses.some(c => ts.isDefaultClause(c));
        if (hasDefaultCase) {
            statements.push(tstl.createGotoStatement(`${switchName}_case_default`));
        } else {
            statements.push(tstl.createGotoStatement(`${switchName}_end`));
        }

        for (let i = 0; i < statement.caseBlock.clauses.length; i++) {
            const clause = statement.caseBlock.clauses[i];
            const label = ts.isCaseClause(clause)
                ? tstl.createLabelStatement(`${switchName}_case_${i}`)
                : tstl.createLabelStatement(`${switchName}_case_default`);

            const body = tstl.createDoStatement(this.transformStatements(clause.statements));
            statements.push(label, body);
        }

        statements.push(tstl.createLabelStatement(`${switchName}_end`));

        statements = this.performHoisting(statements);
        this.popScope();

        return statements;
    }

    public transformBreakStatement(breakStatement: ts.BreakStatement): StatementVisitResult {
        const breakableScope = this.findScope(ScopeType.Loop | ScopeType.Switch);

        if (breakableScope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }

        if (breakableScope.type === ScopeType.Switch) {
            return tstl.createGotoStatement(`____switch${breakableScope.id}_end`);
        } else {
            return tstl.createBreakStatement(breakStatement);
        }
    }

    protected transformScopeBlock(block: ts.Block, scopeType: ScopeType): [tstl.Block, Scope] {
        this.pushScope(scopeType);
        const statements = this.performHoisting(this.transformStatements(block.statements));
        const scope = this.popScope();
        return [tstl.createBlock(statements, block), scope];
    }

    public transformTryStatement(statement: ts.TryStatement): StatementVisitResult {
        const [tryBlock, tryScope] = this.transformScopeBlock(statement.tryBlock, ScopeType.Try);

        const tryResultIdentifier = tstl.createIdentifier("____try");
        const returnValueIdentifier = tstl.createIdentifier("____returnValue");

        const result: tstl.Statement[] = [];

        let returnedIdentifier: tstl.Identifier | undefined;
        let returnCondition: tstl.Expression | undefined;

        const pCall = tstl.createIdentifier("pcall");
        const tryCall = tstl.createCallExpression(pCall, [tstl.createFunctionExpression(tryBlock)]);

        if (statement.catchClause && statement.catchClause.block.statements.length > 0) {
            // try with catch
            let [catchBlock, catchScope] = this.transformScopeBlock(statement.catchClause.block, ScopeType.Catch);
            if (statement.catchClause.variableDeclaration) {
                // Replace ____returned with catch variable
                returnedIdentifier = this.transformIdentifier(statement.catchClause.variableDeclaration
                    .name as ts.Identifier);
            } else if (tryScope.functionReturned || catchScope.functionReturned) {
                returnedIdentifier = tstl.createIdentifier("____returned");
            }

            const tryReturnIdentifiers = [tryResultIdentifier]; // ____try
            if (returnedIdentifier) {
                tryReturnIdentifiers.push(returnedIdentifier); // ____returned or catch variable
                if (tryScope.functionReturned || catchScope.functionReturned) {
                    tryReturnIdentifiers.push(returnValueIdentifier); // ____returnValue
                    returnCondition = tstl.cloneIdentifier(returnedIdentifier);
                }
            }
            result.push(tstl.createVariableDeclarationStatement(tryReturnIdentifiers, tryCall));

            if ((tryScope.functionReturned || catchScope.functionReturned) && returnedIdentifier) {
                // Wrap catch in function if try or catch has return
                const catchCall = tstl.createCallExpression(
                    tstl.createParenthesizedExpression(tstl.createFunctionExpression(catchBlock))
                );
                const catchAssign = tstl.createAssignmentStatement(
                    [tstl.cloneIdentifier(returnedIdentifier), tstl.cloneIdentifier(returnValueIdentifier)],
                    catchCall
                );
                catchBlock = tstl.createBlock([catchAssign]);
            }
            const notTryCondition = tstl.createUnaryExpression(
                tstl.createParenthesizedExpression(tryResultIdentifier),
                tstl.SyntaxKind.NotOperator
            );
            result.push(tstl.createIfStatement(notTryCondition, catchBlock));
        } else if (tryScope.functionReturned) {
            // try with return, but no catch
            returnedIdentifier = tstl.createIdentifier("____returned");
            const returnedVariables = [tryResultIdentifier, returnedIdentifier, returnValueIdentifier];
            result.push(tstl.createVariableDeclarationStatement(returnedVariables, tryCall));

            // change return condition from '____returned' to '____try and ____returned'
            returnCondition = tstl.createBinaryExpression(
                tstl.cloneIdentifier(tryResultIdentifier),
                returnedIdentifier,
                tstl.SyntaxKind.AndOperator
            );
        } else {
            // try without return or catch
            result.push(tstl.createExpressionStatement(tryCall));
        }

        if (statement.finallyBlock && statement.finallyBlock.statements.length > 0) {
            result.push(...this.statementVisitResultToArray(this.transformBlockAsDoStatement(statement.finallyBlock)));
        }

        if (returnCondition && returnedIdentifier) {
            // With catch clause:
            //     if ____returned then return ____returnValue end
            // No catch clause:
            //     if ____try and ____returned then return ____returnValue end
            const returnValues: tstl.Expression[] = [];
            const parentTryCatch = this.findScope(ScopeType.Function | ScopeType.Try | ScopeType.Catch);
            if (parentTryCatch && parentTryCatch.type !== ScopeType.Function) {
                // Nested try/catch needs to prefix a 'true' return value
                returnValues.push(tstl.createBooleanLiteral(true));
            }
            if (tsHelper.isInTupleReturnFunction(statement, this.checker)) {
                returnValues.push(this.createUnpackCall(tstl.cloneIdentifier(returnValueIdentifier)));
            } else {
                returnValues.push(tstl.cloneIdentifier(returnValueIdentifier));
            }
            const returnStatement = tstl.createReturnStatement(returnValues);
            const ifReturnedStatement = tstl.createIfStatement(returnCondition, tstl.createBlock([returnStatement]));
            result.push(ifReturnedStatement);
        }

        return tstl.createDoStatement(result, statement);
    }

    public transformThrowStatement(statement: ts.ThrowStatement): StatementVisitResult {
        const parameters: tstl.Expression[] = [];

        if (statement.expression) {
            parameters.push(this.transformExpression(statement.expression));
            parameters.push(tstl.createNumericLiteral(0));
        }

        return tstl.createExpressionStatement(
            tstl.createCallExpression(tstl.createIdentifier("error"), parameters),
            statement
        );
    }

    public transformContinueStatement(statement: ts.ContinueStatement): StatementVisitResult {
        if (this.luaTarget === LuaTarget.Lua51) {
            throw TSTLErrors.UnsupportedForTarget("Continue statement", this.luaTarget, statement);
        }

        const scope = this.findScope(ScopeType.Loop);
        if (scope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }

        scope.loopContinued = true;
        return tstl.createGotoStatement(`__continue${scope.id}`, statement);
    }

    public transformEmptyStatement(_statement: ts.EmptyStatement): StatementVisitResult {
        return undefined;
    }

    // Expressions
    public transformExpression(expression: ts.Expression): ExpressionVisitResult {
        switch (expression.kind) {
            case ts.SyntaxKind.BinaryExpression:
                return this.transformBinaryExpression(expression as ts.BinaryExpression);
            case ts.SyntaxKind.ConditionalExpression:
                return this.transformConditionalExpression(expression as ts.ConditionalExpression);
            case ts.SyntaxKind.CallExpression:
                return this.transformCallExpression(expression as ts.CallExpression);
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.transformPropertyAccessExpression(expression as ts.PropertyAccessExpression);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.transformElementAccessExpression(expression as ts.ElementAccessExpression);
            case ts.SyntaxKind.Identifier:
                return this.transformIdentifierExpression(expression as ts.Identifier);
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return this.transformStringLiteral(expression as ts.StringLiteral);
            case ts.SyntaxKind.TaggedTemplateExpression:
                return this.transformTaggedTemplateExpression(expression as ts.TaggedTemplateExpression);
            case ts.SyntaxKind.TemplateExpression:
                return this.transformTemplateExpression(expression as ts.TemplateExpression);
            case ts.SyntaxKind.NumericLiteral:
                return this.transformNumericLiteral(expression as ts.NumericLiteral);
            case ts.SyntaxKind.TrueKeyword:
                return this.transformTrueKeyword(expression as ts.BooleanLiteral);
            case ts.SyntaxKind.FalseKeyword:
                return this.transformFalseKeyword(expression as ts.BooleanLiteral);
            case ts.SyntaxKind.NullKeyword:
            case ts.SyntaxKind.UndefinedKeyword:
                return this.transformNullOrUndefinedKeyword(expression);
            case ts.SyntaxKind.ThisKeyword:
                return this.transformThisKeyword(expression as ts.ThisExpression);
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.transformPostfixUnaryExpression(expression as ts.PostfixUnaryExpression);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.transformPrefixUnaryExpression(expression as ts.PrefixUnaryExpression);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transformArrayLiteral(expression as ts.ArrayLiteralExpression);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transformObjectLiteral(expression as ts.ObjectLiteralExpression);
            case ts.SyntaxKind.OmittedExpression:
                return this.transformOmittedExpression(expression as ts.OmittedExpression);
            case ts.SyntaxKind.DeleteExpression:
                return this.transformDeleteExpression(expression as ts.DeleteExpression);
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return this.transformFunctionExpression(expression as ts.ArrowFunction);
            case ts.SyntaxKind.NewExpression:
                return this.transformNewExpression(expression as ts.NewExpression);
            case ts.SyntaxKind.ParenthesizedExpression:
                return this.transformParenthesizedExpression(expression as ts.ParenthesizedExpression);
            case ts.SyntaxKind.SuperKeyword:
                return this.transformSuperKeyword(expression as ts.SuperExpression);
            case ts.SyntaxKind.TypeAssertionExpression:
            case ts.SyntaxKind.AsExpression:
                return this.transformAssertionExpression(expression as ts.AssertionExpression);
            case ts.SyntaxKind.TypeOfExpression:
                return this.transformTypeOfExpression(expression as ts.TypeOfExpression);
            case ts.SyntaxKind.SpreadElement:
                return this.transformSpreadElement(expression as ts.SpreadElement);
            case ts.SyntaxKind.NonNullExpression:
                return this.transformExpression((expression as ts.NonNullExpression).expression);
            case ts.SyntaxKind.YieldExpression:
                return this.transformYieldExpression(expression as ts.YieldExpression);
            case ts.SyntaxKind.ClassExpression:
                return this.transformClassExpression(expression as ts.ClassExpression);
            case ts.SyntaxKind.PartiallyEmittedExpression:
                return this.transformExpression((expression as ts.PartiallyEmittedExpression).expression);
            default:
                throw TSTLErrors.UnsupportedKind("expression", expression.kind, expression);
        }
    }

    protected transformBinaryOperation(
        left: tstl.Expression,
        right: tstl.Expression,
        operator: ts.BinaryOperator,
        tsOriginal: ts.Node
    ): ExpressionVisitResult {
        switch (operator) {
            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return this.transformBinaryBitOperation(tsOriginal, left, right, operator);
            default:
                const luaOperator = this.transformBinaryOperator(operator, tsOriginal);
                if (luaOperator === tstl.SyntaxKind.ConcatOperator) {
                    left = this.wrapInToStringForConcat(left);
                    right = this.wrapInToStringForConcat(right);
                }
                return tstl.createBinaryExpression(left, right, luaOperator, tsOriginal);
        }
    }

    protected transformTypeOfLiteralComparison(
        typeOfExpression: ts.TypeOfExpression,
        comparedExpression: tstl.StringLiteral,
        operator: ts.BinaryOperator,
        tsOriginal: ts.Node
    ): ExpressionVisitResult {
        if (comparedExpression.value === "object") {
            comparedExpression.value = "table";
        } else if (comparedExpression.value === "undefined") {
            comparedExpression.value = "nil";
        }
        const innerExpression = this.transformExpression(typeOfExpression.expression);
        const typeCall = tstl.createCallExpression(tstl.createIdentifier("type"), [innerExpression], typeOfExpression);
        return this.transformBinaryOperation(typeCall, comparedExpression, operator, tsOriginal);
    }

    protected transformComparisonExpression(expression: ts.BinaryExpression): ExpressionVisitResult {
        let left: tstl.Expression | undefined;
        let right: tstl.Expression | undefined;
        const operator = expression.operatorToken.kind;

        // Custom handling for 'typeof(foo) === "type"'
        if (ts.isTypeOfExpression(expression.left)) {
            right = this.transformExpression(expression.right);
            if (tstl.isStringLiteral(right)) {
                return this.transformTypeOfLiteralComparison(expression.left, right, operator, expression);
            }
        } else if (ts.isTypeOfExpression(expression.right)) {
            left = this.transformExpression(expression.left);
            if (tstl.isStringLiteral(left)) {
                return this.transformTypeOfLiteralComparison(expression.right, left, operator, expression);
            }
        }

        if (!left) {
            left = this.transformExpression(expression.left);
        }
        if (!right) {
            right = this.transformExpression(expression.right);
        }
        return this.transformBinaryOperation(left, right, operator, expression);
    }

    public transformBinaryExpression(expression: ts.BinaryExpression): ExpressionVisitResult {
        const operator = expression.operatorToken.kind;

        // Check if this is an assignment token, then handle accordingly
        const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(operator);
        if (isCompound && replacementOperator) {
            return this.transformCompoundAssignmentExpression(
                expression,
                expression.left,
                expression.right,
                replacementOperator,
                false
            );
        }

        // Transpile operators
        switch (operator) {
            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            case ts.SyntaxKind.PlusToken:
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
            case ts.SyntaxKind.MinusToken:
            case ts.SyntaxKind.AsteriskToken:
            case ts.SyntaxKind.AsteriskAsteriskToken:
            case ts.SyntaxKind.SlashToken:
            case ts.SyntaxKind.PercentToken: {
                const lhs = this.transformExpression(expression.left);
                const rhs = this.transformExpression(expression.right);
                return this.transformBinaryOperation(lhs, rhs, operator, expression);
            }

            case ts.SyntaxKind.GreaterThanToken:
            case ts.SyntaxKind.GreaterThanEqualsToken:
            case ts.SyntaxKind.LessThanToken:
            case ts.SyntaxKind.LessThanEqualsToken:
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return this.transformComparisonExpression(expression);

            case ts.SyntaxKind.EqualsToken:
                return this.transformAssignmentExpression(expression);

            case ts.SyntaxKind.InKeyword: {
                const lhs = this.transformExpression(expression.left);
                const rhs = this.transformExpression(expression.right);
                const indexExpression = tstl.createTableIndexExpression(rhs, lhs);
                return tstl.createBinaryExpression(
                    indexExpression,
                    tstl.createNilLiteral(),
                    tstl.SyntaxKind.InequalityOperator,
                    expression
                );
            }

            case ts.SyntaxKind.InstanceOfKeyword: {
                const lhs = this.transformExpression(expression.left);
                const rhs = this.transformExpression(expression.right);
                const rhsType = this.checker.getTypeAtLocation(expression.right);
                const decorators = tsHelper.getCustomDecorators(rhsType, this.checker);

                if (decorators.has(DecoratorKind.Extension) || decorators.has(DecoratorKind.MetaExtension)) {
                    // Cannot use instanceof on extension classes
                    throw TSTLErrors.InvalidInstanceOfExtension(expression);
                }

                if (decorators.has(DecoratorKind.LuaTable)) {
                    throw TSTLErrors.InvalidInstanceOfLuaTable(expression);
                }

                if (tsHelper.isStandardLibraryType(rhsType, "ObjectConstructor", this.program)) {
                    return this.transformLuaLibFunction(LuaLibFeature.InstanceOfObject, expression, lhs);
                }

                return this.transformLuaLibFunction(LuaLibFeature.InstanceOf, expression, lhs, rhs);
            }

            case ts.SyntaxKind.CommaToken: {
                const rhs = this.transformExpression(expression.right);
                return this.createImmediatelyInvokedFunctionExpression(
                    this.statementVisitResultToArray(this.transformExpressionStatement(expression.left)),
                    rhs,
                    expression
                );
            }

            default:
                throw TSTLErrors.UnsupportedKind("binary operator", operator, expression);
        }
    }

    protected transformAssignment(lhs: ts.Expression, right: tstl.Expression, parent?: ts.Expression): tstl.Statement {
        if (tsHelper.isArrayLength(lhs, this.checker, this.program)) {
            return tstl.createExpressionStatement(
                this.transformLuaLibFunction(
                    LuaLibFeature.ArraySetLength,
                    parent,
                    this.transformExpression(lhs.expression),
                    right
                )
            );
        }

        return tstl.createAssignmentStatement(
            this.transformExpression(lhs) as tstl.AssignmentLeftHandSideExpression,
            right,
            lhs.parent
        );
    }

    protected transformAssignmentStatement(expression: ts.BinaryExpression): StatementVisitResult {
        // Validate assignment
        const rightType = this.checker.getTypeAtLocation(expression.right);
        const leftType = this.checker.getTypeAtLocation(expression.left);
        this.validateFunctionAssignment(expression.right, rightType, leftType);
        this.validatePropertyAssignment(expression);

        if (tsHelper.isDestructuringAssignment(expression)) {
            // Destructuring assignment
            if (
                ts.isArrayLiteralExpression(expression.left) &&
                expression.left.elements.every(
                    e =>
                        (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) &&
                        !tsHelper.isArrayLength(e, this.checker, this.program)
                )
            ) {
                const rightType = this.checker.getTypeAtLocation(expression.right);
                let right = this.transformExpression(expression.right);
                if (
                    !tsHelper.isTupleReturnCall(expression.right, this.checker) &&
                    tsHelper.isArrayType(rightType, this.checker, this.program)
                ) {
                    right = this.createUnpackCall(right, expression.right);
                }

                const left = this.castElements(
                    expression.left.elements.map(e => this.transformExpression(e)),
                    tstl.isAssignmentLeftHandSideExpression
                );

                return tstl.createAssignmentStatement(left, right, expression);
            }

            let right = this.transformExpression(expression.right);
            if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = this.wrapInTable(right);
            }

            const rootIdentifier = tstl.createAnonymousIdentifier(expression.left);
            return [
                tstl.createVariableDeclarationStatement(rootIdentifier, right),
                ...this.transformDestructuringAssignment(expression, rootIdentifier),
            ];
        } else {
            // Simple assignment
            return this.transformAssignment(expression.left, this.transformExpression(expression.right));
        }
    }

    protected transformDestructuringAssignment(
        node: ts.DestructuringAssignment,
        root: tstl.Expression
    ): tstl.Statement[] {
        switch (node.left.kind) {
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transformObjectDestructuringAssignment(node as ts.ObjectDestructuringAssignment, root);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transformArrayDestructuringAssignment(node as ts.ArrayDestructuringAssignment, root);
        }
    }

    protected transformObjectDestructuringAssignment(
        node: ts.ObjectDestructuringAssignment,
        root: tstl.Expression
    ): tstl.Statement[] {
        return this.transformObjectLiteralAssignmentPattern(node.left, root);
    }

    protected transformArrayDestructuringAssignment(
        node: ts.ArrayDestructuringAssignment,
        root: tstl.Expression
    ): tstl.Statement[] {
        return this.transformArrayLiteralAssignmentPattern(node.left, root);
    }

    protected transformShorthandPropertyAssignment(
        node: ts.ShorthandPropertyAssignment,
        root: tstl.Expression
    ): tstl.Statement[] {
        const result: tstl.Statement[] = [];
        const assignmentVariableName = this.transformIdentifier(node.name);
        const extractionIndex = tstl.createStringLiteral(node.name.text);
        const variableExtractionAssignmentStatement = tstl.createAssignmentStatement(
            assignmentVariableName,
            tstl.createTableIndexExpression(root, extractionIndex)
        );

        result.push(variableExtractionAssignmentStatement);

        const defaultInitializer = node.objectAssignmentInitializer
            ? this.transformExpression(node.objectAssignmentInitializer)
            : undefined;

        if (defaultInitializer) {
            const nilCondition = tstl.createBinaryExpression(
                assignmentVariableName,
                tstl.createNilLiteral(),
                tstl.SyntaxKind.EqualityOperator
            );

            const assignment = tstl.createAssignmentStatement(assignmentVariableName, defaultInitializer);

            const ifBlock = tstl.createBlock([assignment]);

            result.push(tstl.createIfStatement(nilCondition, ifBlock, undefined, node));
        }

        return result;
    }

    protected transformSpreadAssignment(
        node: ts.SpreadAssignment,
        root: tstl.Expression,
        properties: ts.NodeArray<ts.ObjectLiteralElementLike>
    ): tstl.Statement[] {
        const usedProperties: tstl.TableFieldExpression[] = [];
        // TODO: .flatMap
        for (const property of properties) {
            if (
                (ts.isShorthandPropertyAssignment(property) || ts.isPropertyAssignment(property)) &&
                !ts.isComputedPropertyName(property.name)
            ) {
                const name = ts.isIdentifier(property.name)
                    ? tstl.createStringLiteral(property.name.text)
                    : this.transformExpression(property.name);

                usedProperties.push(tstl.createTableFieldExpression(tstl.createBooleanLiteral(true), name));
            }
        }

        const extractingExpression = this.transformLuaLibFunction(
            LuaLibFeature.ObjectRest,
            undefined,
            root,
            tstl.createTableExpression(usedProperties)
        );

        return [this.transformAssignment(node.expression, extractingExpression)];
    }

    protected transformObjectLiteralAssignmentPattern(
        node: ts.ObjectLiteralExpression,
        root: tstl.Expression
    ): tstl.Statement[] {
        const result: tstl.Statement[] = [];

        for (const property of node.properties) {
            switch (property.kind) {
                case ts.SyntaxKind.ShorthandPropertyAssignment:
                    result.push(...this.transformShorthandPropertyAssignment(property, root));
                    break;
                case ts.SyntaxKind.PropertyAssignment:
                    result.push(...this.transformPropertyAssignment(property, root));
                    break;
                case ts.SyntaxKind.SpreadAssignment:
                    result.push(...this.transformSpreadAssignment(property, root, node.properties));
                    break;
                default:
                    throw TSTLErrors.UnsupportedKind("Object Destructure Property", property.kind, property);
            }
        }

        return result;
    }

    protected transformArrayLiteralAssignmentPattern(
        node: ts.ArrayLiteralExpression,
        root: tstl.Expression
    ): tstl.Statement[] {
        const result: tstl.Statement[] = [];

        node.elements.forEach((element, index) => {
            const indexedRoot = tstl.createTableIndexExpression(root, tstl.createNumericLiteral(index + 1), element);

            switch (element.kind) {
                case ts.SyntaxKind.ObjectLiteralExpression:
                    result.push(
                        ...this.transformObjectLiteralAssignmentPattern(
                            element as ts.ObjectLiteralExpression,
                            indexedRoot
                        )
                    );
                    break;
                case ts.SyntaxKind.ArrayLiteralExpression:
                    result.push(
                        ...this.transformArrayLiteralAssignmentPattern(
                            element as ts.ArrayLiteralExpression,
                            indexedRoot
                        )
                    );
                    break;
                case ts.SyntaxKind.BinaryExpression:
                    const assignedVariable = tstl.createIdentifier("____bindingAssignmentValue");

                    const assignedVariableDeclaration = tstl.createVariableDeclarationStatement(
                        assignedVariable,
                        indexedRoot
                    );

                    const nilCondition = tstl.createBinaryExpression(
                        assignedVariable,
                        tstl.createNilLiteral(),
                        tstl.SyntaxKind.EqualityOperator
                    );

                    const defaultAssignmentStatement = this.transformAssignment(
                        (element as ts.BinaryExpression).left,
                        this.transformExpression((element as ts.BinaryExpression).right)
                    );

                    const elseAssignmentStatement = this.transformAssignment(
                        (element as ts.BinaryExpression).left,
                        assignedVariable
                    );

                    const ifBlock = tstl.createBlock([defaultAssignmentStatement]);

                    const elseBlock = tstl.createBlock([elseAssignmentStatement]);

                    const ifStatement = tstl.createIfStatement(nilCondition, ifBlock, elseBlock, node);

                    result.push(assignedVariableDeclaration);
                    result.push(ifStatement);
                    break;
                case ts.SyntaxKind.Identifier:
                case ts.SyntaxKind.PropertyAccessExpression:
                case ts.SyntaxKind.ElementAccessExpression:
                    const assignmentStatement = this.transformAssignment(element, indexedRoot);

                    result.push(assignmentStatement);
                    break;
                case ts.SyntaxKind.SpreadElement:
                    if (index !== node.elements.length - 1) break;

                    const restElements = this.transformLuaLibFunction(
                        LuaLibFeature.ArraySlice,
                        undefined,
                        root,
                        tstl.createNumericLiteral(index)
                    );

                    result.push(this.transformAssignment((element as ts.SpreadElement).expression, restElements));
                    break;
                case ts.SyntaxKind.OmittedExpression:
                    break;
                default:
                    throw TSTLErrors.UnsupportedKind("Array Destructure Assignment Element", element.kind, element);
            }
        });

        return result;
    }

    protected transformPropertyAssignment(node: ts.PropertyAssignment, root: tstl.Expression): tstl.Statement[] {
        const result: tstl.Statement[] = [];

        if (tsHelper.isAssignmentPattern(node.initializer)) {
            const propertyAccessString = this.transformPropertyName(node.name);
            const newRootAccess = tstl.createTableIndexExpression(root, propertyAccessString);

            if (ts.isObjectLiteralExpression(node.initializer)) {
                return this.transformObjectLiteralAssignmentPattern(node.initializer, newRootAccess);
            }

            if (ts.isArrayLiteralExpression(node.initializer)) {
                return this.transformArrayLiteralAssignmentPattern(node.initializer, newRootAccess);
            }
        }

        const leftExpression = ts.isBinaryExpression(node.initializer) ? node.initializer.left : node.initializer;
        const variableToExtract = this.transformPropertyName(node.name);
        const extractingExpression = tstl.createTableIndexExpression(root, variableToExtract);

        const destructureAssignmentStatement = this.transformAssignment(leftExpression, extractingExpression);

        result.push(destructureAssignmentStatement);

        if (ts.isBinaryExpression(node.initializer)) {
            const assignmentLeftHandSide = this.transformExpression(node.initializer.left);

            const nilCondition = tstl.createBinaryExpression(
                assignmentLeftHandSide,
                tstl.createNilLiteral(),
                tstl.SyntaxKind.EqualityOperator
            );

            const assignmentStatements = this.statementVisitResultToArray(
                this.transformAssignmentStatement(node.initializer)
            );

            const ifBlock = tstl.createBlock(assignmentStatements);

            result.push(tstl.createIfStatement(nilCondition, ifBlock, undefined, node));
        }

        return result;
    }

    protected transformAssignmentExpression(
        expression: ts.BinaryExpression
    ): tstl.CallExpression | tstl.MethodCallExpression {
        // Validate assignment
        const rightType = this.checker.getTypeAtLocation(expression.right);
        const leftType = this.checker.getTypeAtLocation(expression.left);
        this.validateFunctionAssignment(expression.right, rightType, leftType);

        if (tsHelper.isArrayLength(expression.left, this.checker, this.program)) {
            // array.length = x
            return this.transformLuaLibFunction(
                LuaLibFeature.ArraySetLength,
                expression,
                this.transformExpression(expression.left.expression),
                this.transformExpression(expression.right)
            );
        }

        if (tsHelper.isDestructuringAssignment(expression)) {
            // Destructuring assignment
            const rootIdentifier = tstl.createAnonymousIdentifier(expression.left);

            let right = this.transformExpression(expression.right);
            if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = this.wrapInTable(right);
            }

            const statements = [
                tstl.createVariableDeclarationStatement(rootIdentifier, right),
                ...this.transformDestructuringAssignment(expression, rootIdentifier),
            ];

            return this.createImmediatelyInvokedFunctionExpression(statements, rootIdentifier, expression);
        }

        if (ts.isPropertyAccessExpression(expression.left) || ts.isElementAccessExpression(expression.left)) {
            // Left is property/element access: cache result while maintaining order of evaluation
            // (function(o, i, v) o[i] = v; return v end)(${objExpression}, ${indexExpression}, ${right})
            const objParameter = tstl.createIdentifier("o");
            const indexParameter = tstl.createIdentifier("i");
            const valueParameter = tstl.createIdentifier("v");
            const indexStatement = tstl.createTableIndexExpression(objParameter, indexParameter);
            const statements: tstl.Statement[] = [
                tstl.createAssignmentStatement(indexStatement, valueParameter),
                tstl.createReturnStatement([valueParameter]),
            ];
            const iife = tstl.createFunctionExpression(tstl.createBlock(statements), [
                objParameter,
                indexParameter,
                valueParameter,
            ]);
            const objExpression = this.transformExpression(expression.left.expression);
            let indexExpression: tstl.Expression;
            if (ts.isPropertyAccessExpression(expression.left)) {
                // Property access
                indexExpression = tstl.createStringLiteral(expression.left.name.text);
            } else {
                // Element access
                indexExpression = this.transformElementAccessArgument(expression.left);
            }

            const args = [objExpression, indexExpression, this.transformExpression(expression.right)];
            return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), args, expression);
        } else {
            // Simple assignment
            // (function() ${left} = ${right}; return ${left} end)()
            const left = this.transformExpression(expression.left);
            const right = this.transformExpression(expression.right);
            return this.createImmediatelyInvokedFunctionExpression(
                [this.transformAssignment(expression.left, right)],
                left,
                expression
            );
        }
    }

    protected transformCompoundAssignmentExpression(
        expression: ts.Expression,
        lhs: ts.Expression,
        rhs: ts.Expression,
        replacementOperator: ts.BinaryOperator,
        isPostfix: boolean
    ): tstl.CallExpression {
        const left = this.transformExpression(lhs) as tstl.AssignmentLeftHandSideExpression;
        let right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            lhs,
            this.checker,
            this.program
        );
        if (hasEffects && objExpression && indexExpression) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __obj, __index = ${objExpression}, ${indexExpression};
            const obj = tstl.createIdentifier("____obj");
            const index = tstl.createIdentifier("____index");
            const objAndIndexDeclaration = tstl.createVariableDeclarationStatement(
                [obj, index],
                [this.transformExpression(objExpression), this.transformExpression(indexExpression)]
            );
            const accessExpression = tstl.createTableIndexExpression(obj, index);

            const tmp = tstl.createIdentifier("____tmp");
            right = tstl.createParenthesizedExpression(right);
            let tmpDeclaration: tstl.VariableDeclarationStatement;
            let assignStatement: tstl.AssignmentStatement;
            if (isPostfix) {
                // local ____tmp = ____obj[____index];
                // ____obj[____index] = ____tmp ${replacementOperator} ${right};
                tmpDeclaration = tstl.createVariableDeclarationStatement(tmp, accessExpression);
                const operatorExpression = this.transformBinaryOperation(tmp, right, replacementOperator, expression);
                assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            } else {
                // local ____tmp = ____obj[____index] ${replacementOperator} ${right};
                // ____obj[____index] = ____tmp;
                const operatorExpression = this.transformBinaryOperation(
                    accessExpression,
                    right,
                    replacementOperator,
                    expression
                );
                tmpDeclaration = tstl.createVariableDeclarationStatement(tmp, operatorExpression);
                assignStatement = tstl.createAssignmentStatement(accessExpression, tmp);
            }
            // return ____tmp
            return this.createImmediatelyInvokedFunctionExpression(
                [objAndIndexDeclaration, tmpDeclaration, assignStatement],
                tmp,
                expression
            );
        } else if (isPostfix) {
            // Postfix expressions need to cache original value in temp
            // local ____tmp = ${left};
            // ${left} = ____tmp ${replacementOperator} ${right};
            // return ____tmp
            const tmpIdentifier = tstl.createIdentifier("____tmp");
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, left);
            const operatorExpression = this.transformBinaryOperation(
                tmpIdentifier,
                right,
                replacementOperator,
                expression
            );
            const assignStatement = this.transformAssignment(lhs, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression(
                [tmpDeclaration, assignStatement],
                tmpIdentifier,
                expression
            );
        } else if (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs)) {
            // Simple property/element access expressions need to cache in temp to avoid double-evaluation
            // local ____tmp = ${left} ${replacementOperator} ${right};
            // ${left} = ____tmp;
            // return ____tmp
            const tmpIdentifier = tstl.createIdentifier("____tmp");
            const operatorExpression = this.transformBinaryOperation(left, right, replacementOperator, expression);
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, operatorExpression);
            const assignStatement = this.transformAssignment(lhs, tmpIdentifier);
            return this.createImmediatelyInvokedFunctionExpression(
                [tmpDeclaration, assignStatement],
                tmpIdentifier,
                expression
            );
        } else {
            // Simple expressions
            // ${left} = ${right}; return ${right}
            const operatorExpression = this.transformBinaryOperation(left, right, replacementOperator, expression);
            const assignStatement = this.transformAssignment(lhs, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression([assignStatement], left, expression);
        }
    }

    public transformBinaryOperator(operator: ts.BinaryOperator, node: ts.Node): tstl.BinaryOperator {
        switch (operator) {
            // Bitwise operators
            case ts.SyntaxKind.BarToken:
                return tstl.SyntaxKind.BitwiseOrOperator;
            case ts.SyntaxKind.CaretToken:
                return tstl.SyntaxKind.BitwiseExclusiveOrOperator;
            case ts.SyntaxKind.AmpersandToken:
                return tstl.SyntaxKind.BitwiseAndOperator;
            case ts.SyntaxKind.LessThanLessThanToken:
                return tstl.SyntaxKind.BitwiseLeftShiftOperator;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                throw TSTLErrors.UnsupportedKind("right shift operator (use >>> instead)", operator, node);
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return tstl.SyntaxKind.BitwiseRightShiftOperator;
            // Regular operators
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return tstl.SyntaxKind.AndOperator;
            case ts.SyntaxKind.BarBarToken:
                return tstl.SyntaxKind.OrOperator;
            case ts.SyntaxKind.MinusToken:
                return tstl.SyntaxKind.SubtractionOperator;
            case ts.SyntaxKind.PlusToken:
                if (ts.isBinaryExpression(node)) {
                    // Check is we need to use string concat operator
                    const typeLeft = this.checker.getTypeAtLocation(node.left);
                    const typeRight = this.checker.getTypeAtLocation(node.right);
                    if (
                        tsHelper.isStringType(typeLeft, this.checker, this.program) ||
                        tsHelper.isStringType(typeRight, this.checker, this.program)
                    ) {
                        return tstl.SyntaxKind.ConcatOperator;
                    }
                }
                return tstl.SyntaxKind.AdditionOperator;
            case ts.SyntaxKind.AsteriskToken:
                return tstl.SyntaxKind.MultiplicationOperator;
            case ts.SyntaxKind.AsteriskAsteriskToken:
                return tstl.SyntaxKind.PowerOperator;
            case ts.SyntaxKind.SlashToken:
                return tstl.SyntaxKind.DivisionOperator;
            case ts.SyntaxKind.PercentToken:
                return tstl.SyntaxKind.ModuloOperator;
            case ts.SyntaxKind.GreaterThanToken:
                return tstl.SyntaxKind.GreaterThanOperator;
            case ts.SyntaxKind.GreaterThanEqualsToken:
                return tstl.SyntaxKind.GreaterEqualOperator;
            case ts.SyntaxKind.LessThanToken:
                return tstl.SyntaxKind.LessThanOperator;
            case ts.SyntaxKind.LessThanEqualsToken:
                return tstl.SyntaxKind.LessEqualOperator;
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return tstl.SyntaxKind.EqualityOperator;
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return tstl.SyntaxKind.InequalityOperator;
            default:
                throw TSTLErrors.UnsupportedKind("binary operator", operator, node);
        }
    }

    public transformClassExpression(expression: ts.ClassLikeDeclaration): ExpressionVisitResult {
        const isDefaultExport = tsHelper.hasDefaultExportModifier(expression.modifiers);

        let className: tstl.Identifier;
        if (expression.name) {
            className = this.transformIdentifier(expression.name);
        } else if (isDefaultExport) {
            className = this.createDefaultExportIdentifier(expression);
        } else {
            className = tstl.createAnonymousIdentifier();
        }

        this.pushScope(ScopeType.Function);
        const classDeclaration = this.transformClassDeclaration(expression, className);
        this.popScope();

        return this.createImmediatelyInvokedFunctionExpression(
            this.statementVisitResultToArray(classDeclaration),
            className,
            expression
        );
    }

    protected transformCompoundAssignmentStatement(
        node: ts.Node,
        lhs: ts.Expression,
        rhs: ts.Expression,
        replacementOperator: ts.BinaryOperator
    ): tstl.Statement {
        const left = this.transformExpression(lhs) as tstl.AssignmentLeftHandSideExpression;
        const right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            lhs,
            this.checker,
            this.program
        );
        if (hasEffects && objExpression && indexExpression) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __obj, __index = ${objExpression}, ${indexExpression};
            // ____obj[____index] = ____obj[____index] ${replacementOperator} ${right};
            const obj = tstl.createIdentifier("____obj");
            const index = tstl.createIdentifier("____index");
            const objAndIndexDeclaration = tstl.createVariableDeclarationStatement(
                [obj, index],
                [this.transformExpression(objExpression), this.transformExpression(indexExpression)]
            );
            const accessExpression = tstl.createTableIndexExpression(obj, index);
            const operatorExpression = this.transformBinaryOperation(
                accessExpression,
                tstl.createParenthesizedExpression(right),
                replacementOperator,
                node
            );
            const assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            return tstl.createDoStatement([objAndIndexDeclaration, assignStatement]);
        } else {
            // Simple statements
            // ${left} = ${left} ${replacementOperator} ${right}
            const operatorExpression = this.transformBinaryOperation(left, right, replacementOperator, node);
            return this.transformAssignment(lhs, operatorExpression);
        }
    }

    protected transformUnaryBitLibOperation(
        node: ts.Node,
        expression: tstl.Expression,
        operator: tstl.UnaryBitwiseOperator,
        lib: string
    ): ExpressionVisitResult {
        let bitFunction: string;
        switch (operator) {
            case tstl.SyntaxKind.BitwiseNotOperator:
                bitFunction = "bnot";
                break;
            default:
                throw TSTLErrors.UnsupportedKind("unary bitwise operator", operator, node);
        }
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier(lib), tstl.createStringLiteral(bitFunction)),
            [expression],
            node
        );
    }

    protected transformUnaryBitOperation(
        node: ts.Node,
        expression: tstl.Expression,
        operator: tstl.UnaryBitwiseOperator
    ): ExpressionVisitResult {
        switch (this.luaTarget) {
            case LuaTarget.Lua51:
                throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.luaTarget, node);

            case LuaTarget.Lua52:
                return this.transformUnaryBitLibOperation(node, expression, operator, "bit32");

            case LuaTarget.LuaJIT:
                return this.transformUnaryBitLibOperation(node, expression, operator, "bit");

            default:
                return tstl.createUnaryExpression(expression, operator, node);
        }
    }

    protected transformBinaryBitLibOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: ts.BinaryOperator,
        lib: string
    ): ExpressionVisitResult {
        let bitFunction: string;
        switch (operator) {
            case ts.SyntaxKind.AmpersandToken:
                bitFunction = "band";
                break;
            case ts.SyntaxKind.BarToken:
                bitFunction = "bor";
                break;
            case ts.SyntaxKind.CaretToken:
                bitFunction = "bxor";
                break;
            case ts.SyntaxKind.LessThanLessThanToken:
                bitFunction = "lshift";
                break;
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                bitFunction = "rshift";
                break;
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                bitFunction = "arshift";
                break;
            default:
                throw TSTLErrors.UnsupportedKind("binary bitwise operator", operator, node);
        }
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier(lib), tstl.createStringLiteral(bitFunction)),
            [left, right],
            node
        );
    }

    protected transformBinaryBitOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: ts.BinaryOperator
    ): ExpressionVisitResult {
        switch (this.luaTarget) {
            case LuaTarget.Lua51:
                throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.luaTarget, node);

            case LuaTarget.Lua52:
                return this.transformBinaryBitLibOperation(node, left, right, operator, "bit32");

            case LuaTarget.LuaJIT:
                return this.transformBinaryBitLibOperation(node, left, right, operator, "bit");

            default:
                const luaOperator = this.transformBinaryOperator(operator, node);
                return tstl.createBinaryExpression(left, right, luaOperator, node);
        }
    }

    protected transformProtectedConditionalExpression(expression: ts.ConditionalExpression): tstl.CallExpression {
        const condition = tstl.createParenthesizedExpression(this.transformExpression(expression.condition));
        const val1 = this.transformExpression(expression.whenTrue);
        const val2 = this.transformExpression(expression.whenFalse);

        const val1Function = this.wrapInFunctionCall(val1);
        const val2Function = this.wrapInFunctionCall(val2);

        // (condition and (() => v1) or (() => v2))()
        const conditionAnd = tstl.createBinaryExpression(condition, val1Function, tstl.SyntaxKind.AndOperator);
        const orExpression = tstl.createBinaryExpression(conditionAnd, val2Function, tstl.SyntaxKind.OrOperator);
        return tstl.createCallExpression(tstl.createParenthesizedExpression(orExpression), [], expression);
    }

    public transformConditionalExpression(expression: ts.ConditionalExpression): ExpressionVisitResult {
        const isStrict = this.options.strict === true || this.options.strictNullChecks === true;
        if (tsHelper.isFalsible(this.checker.getTypeAtLocation(expression.whenTrue), isStrict)) {
            return this.transformProtectedConditionalExpression(expression);
        }
        const condition = tstl.createParenthesizedExpression(this.transformExpression(expression.condition));
        const val1 = this.transformExpression(expression.whenTrue);
        const val2 = this.transformExpression(expression.whenFalse);

        // condition and v1 or v2
        const conditionAnd = tstl.createBinaryExpression(condition, val1, tstl.SyntaxKind.AndOperator);
        return tstl.createBinaryExpression(conditionAnd, val2, tstl.SyntaxKind.OrOperator, expression);
    }

    public transformPostfixUnaryExpression(expression: ts.PostfixUnaryExpression): ExpressionVisitResult {
        switch (expression.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    ts.SyntaxKind.PlusToken,
                    true
                );

            case ts.SyntaxKind.MinusMinusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    ts.SyntaxKind.MinusToken,
                    true
                );

            default:
                throw TSTLErrors.UnsupportedKind("unary postfix operator", expression.operator, expression);
        }
    }

    public transformPrefixUnaryExpression(expression: ts.PrefixUnaryExpression): ExpressionVisitResult {
        switch (expression.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    ts.SyntaxKind.PlusToken,
                    false
                );

            case ts.SyntaxKind.MinusMinusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    ts.SyntaxKind.MinusToken,
                    false
                );

            case ts.SyntaxKind.PlusToken:
                return this.transformExpression(expression.operand);

            case ts.SyntaxKind.MinusToken:
                return tstl.createUnaryExpression(
                    this.transformExpression(expression.operand),
                    tstl.SyntaxKind.NegationOperator
                );

            case ts.SyntaxKind.ExclamationToken:
                return tstl.createUnaryExpression(
                    this.transformExpression(expression.operand),
                    tstl.SyntaxKind.NotOperator
                );

            case ts.SyntaxKind.TildeToken:
                return this.transformUnaryBitOperation(
                    expression,
                    this.transformExpression(expression.operand),
                    tstl.SyntaxKind.BitwiseNotOperator
                );

            default:
                throw TSTLErrors.UnsupportedKind("unary prefix operator", expression.operator, expression);
        }
    }

    public transformArrayLiteral(expression: ts.ArrayLiteralExpression): ExpressionVisitResult {
        const values = expression.elements.map(e =>
            tstl.createTableFieldExpression(this.transformExpression(e), undefined, e)
        );

        return tstl.createTableExpression(values, expression);
    }

    public transformObjectLiteral(expression: ts.ObjectLiteralExpression): ExpressionVisitResult {
        let properties: tstl.TableFieldExpression[] = [];
        const tableExpressions: tstl.Expression[] = [];
        // Add all property assignments
        expression.properties.forEach(element => {
            const name = element.name ? this.transformPropertyName(element.name) : undefined;
            if (ts.isPropertyAssignment(element)) {
                const expression = this.transformExpression(element.initializer);
                properties.push(tstl.createTableFieldExpression(expression, name, element));
            } else if (ts.isShorthandPropertyAssignment(element)) {
                const valueSymbol = this.checker.getShorthandAssignmentValueSymbol(element);
                if (valueSymbol) {
                    this.trackSymbolReference(valueSymbol, element.name);
                }
                const identifier = this.createShorthandIdentifier(valueSymbol, element.name);
                properties.push(tstl.createTableFieldExpression(identifier, name, element));
            } else if (ts.isMethodDeclaration(element)) {
                const expression = this.transformFunctionExpression(element);
                properties.push(tstl.createTableFieldExpression(expression, name, element));
            } else if (ts.isSpreadAssignment(element)) {
                // Create a table for preceding properties to preserve property order
                // { x: 0, ...{ y: 2 }, y: 1, z: 2 } --> __TS__ObjectAssign({x = 0}, {y = 2}, {y = 1, z = 2})
                if (properties.length > 0) {
                    const tableExpression = tstl.createTableExpression(properties, expression);
                    tableExpressions.push(tableExpression);
                }
                properties = [];

                const type = this.checker.getTypeAtLocation(element.expression);
                let tableExpression: tstl.Expression;
                if (type && tsHelper.isArrayType(type, this.checker, this.program)) {
                    tableExpression = this.transformLuaLibFunction(
                        LuaLibFeature.ArrayToObject,
                        element.expression,
                        this.transformExpression(element.expression)
                    );
                } else {
                    tableExpression = this.transformExpression(element.expression);
                }
                tableExpressions.push(tableExpression);
            } else {
                throw TSTLErrors.UnsupportedKind("object literal element", element.kind, expression);
            }
        });

        if (tableExpressions.length === 0) {
            return tstl.createTableExpression(properties, expression);
        } else {
            if (properties.length > 0) {
                const tableExpression = tstl.createTableExpression(properties, expression);
                tableExpressions.push(tableExpression);
            }

            if (tableExpressions[0].kind !== tstl.SyntaxKind.TableExpression) {
                tableExpressions.unshift(tstl.createTableExpression(undefined, expression));
            }

            return this.transformLuaLibFunction(LuaLibFeature.ObjectAssign, expression, ...tableExpressions);
        }
    }

    public transformOmittedExpression(node: ts.OmittedExpression): ExpressionVisitResult {
        const isWithinBindingAssignmentStatement = tsHelper.isWithinLiteralAssignmentStatement(node);
        return isWithinBindingAssignmentStatement ? tstl.createAnonymousIdentifier() : tstl.createNilLiteral(node);
    }

    public transformDeleteExpression(expression: ts.DeleteExpression): ExpressionVisitResult {
        const lhs = this.transformExpression(expression.expression) as tstl.AssignmentLeftHandSideExpression;
        const assignment = tstl.createAssignmentStatement(lhs, tstl.createNilLiteral(), expression);

        return this.createImmediatelyInvokedFunctionExpression(
            [assignment],
            [tstl.createBooleanLiteral(true)],
            expression
        );
    }

    public transformFunctionExpression(node: ts.FunctionLikeDeclaration): ExpressionVisitResult {
        const type = this.checker.getTypeAtLocation(node);

        let context: tstl.Identifier | undefined;
        if (tsHelper.getFunctionContextType(type, this.program) !== tsHelper.ContextType.Void) {
            if (ts.isArrowFunction(node)) {
                // dummy context for arrow functions with parameters
                if (node.parameters.length > 0) {
                    context = tstl.createAnonymousIdentifier();
                }
            } else {
                // self context
                context = this.createSelfIdentifier();
            }
        }

        // Build parameter string
        const [paramNames, dotsLiteral, spreadIdentifier] = this.transformParameters(node.parameters, context);

        let flags = tstl.FunctionExpressionFlags.None;

        if (node.body === undefined) {
            throw TSTLErrors.UnsupportedFunctionWithoutBody(node);
        }

        let body: ts.Block;
        if (ts.isBlock(node.body)) {
            body = node.body;
        } else {
            const returnExpression = ts.createReturn(node.body);
            body = ts.createBlock([returnExpression]);
            returnExpression.parent = body;
            if (node.body) {
                body.parent = node.body.parent;
            }
            flags |= tstl.FunctionExpressionFlags.Inline;
        }

        const [transformedBody, scope] = this.transformFunctionBody(node.parameters, body, spreadIdentifier);

        const functionExpression = tstl.createFunctionExpression(
            tstl.createBlock(transformedBody),
            paramNames,
            dotsLiteral,
            spreadIdentifier,
            flags,
            node
        );

        //Handle named function expressions which reference themselves
        if (ts.isFunctionExpression(node) && node.name && scope.referencedSymbols) {
            const symbol = this.checker.getSymbolAtLocation(node.name);
            if (symbol) {
                const symbolId = this.symbolIds.get(symbol);
                //Only wrap if the name is actually referenced inside the function
                if (symbolId !== undefined && scope.referencedSymbols.has(symbolId)) {
                    const nameIdentifier = this.transformIdentifier(node.name);
                    return this.createImmediatelyInvokedFunctionExpression(
                        [tstl.createVariableDeclarationStatement(nameIdentifier, functionExpression)],
                        tstl.cloneIdentifier(nameIdentifier)
                    );
                }
            }
        }

        return functionExpression;
    }

    public transformNewExpression(node: ts.NewExpression): ExpressionVisitResult {
        const name = this.transformExpression(node.expression);
        const signature = this.checker.getResolvedSignature(node);
        const params = node.arguments
            ? this.transformArguments(node.arguments, signature)
            : [tstl.createBooleanLiteral(true)];

        const type = this.checker.getTypeAtLocation(node);
        const classDecorators = tsHelper.getCustomDecorators(type, this.checker);

        this.checkForLuaLibType(type);

        if (classDecorators.has(DecoratorKind.Extension) || classDecorators.has(DecoratorKind.MetaExtension)) {
            throw TSTLErrors.InvalidNewExpressionOnExtension(node);
        }

        if (classDecorators.has(DecoratorKind.CustomConstructor)) {
            const customDecorator = classDecorators.get(DecoratorKind.CustomConstructor);
            if (customDecorator === undefined || customDecorator.args[0] === undefined) {
                throw TSTLErrors.InvalidDecoratorArgumentNumber("@customConstructor", 0, 1, node);
            }

            return tstl.createCallExpression(
                tstl.createIdentifier(customDecorator.args[0]),
                this.transformArguments(node.arguments || []),
                node
            );
        }

        if (classDecorators.has(DecoratorKind.LuaTable)) {
            if (node.arguments && node.arguments.length > 0) {
                throw TSTLErrors.ForbiddenLuaTableUseException(
                    "No parameters are allowed when constructing a LuaTable object.",
                    node
                );
            } else {
                return tstl.createTableExpression();
            }
        }

        return tstl.createCallExpression(
            tstl.createTableIndexExpression(name, tstl.createStringLiteral("new")),
            params,
            node
        );
    }

    public transformParenthesizedExpression(expression: ts.ParenthesizedExpression): ExpressionVisitResult {
        return tstl.createParenthesizedExpression(this.transformExpression(expression.expression), expression);
    }

    public transformSuperKeyword(expression: ts.SuperExpression): ExpressionVisitResult {
        const classDeclaration = this.classStack[this.classStack.length - 1];
        const typeNode = tsHelper.getExtendedTypeNode(classDeclaration, this.checker);
        if (typeNode === undefined) {
            throw TSTLErrors.UnknownSuperType(expression);
        }

        const extendsExpression = typeNode.expression;
        let baseClassName: tstl.AssignmentLeftHandSideExpression | undefined;
        if (ts.isIdentifier(extendsExpression)) {
            const symbol = this.checker.getSymbolAtLocation(extendsExpression);
            if (symbol && !this.isSymbolExported(symbol)) {
                // Use "baseClassName" if base is a simple identifier
                baseClassName = this.transformIdentifier(extendsExpression);
            }
        }
        if (!baseClassName) {
            if (classDeclaration.name === undefined) {
                throw TSTLErrors.MissingClassName(expression);
            }

            // Use "className.____super" if the base is not a simple identifier
            baseClassName = tstl.createTableIndexExpression(
                this.transformIdentifier(classDeclaration.name),
                tstl.createStringLiteral("____super"),
                expression
            );
        }
        return tstl.createTableIndexExpression(baseClassName, tstl.createStringLiteral("prototype"));
    }

    public transformCallExpression(expression: ts.CallExpression): ExpressionVisitResult {
        // Check for calls on primitives to override
        let parameters: tstl.Expression[] = [];

        const isTupleReturn = tsHelper.isTupleReturnCall(expression, this.checker);
        const isTupleReturnForward =
            expression.parent &&
            ts.isReturnStatement(expression.parent) &&
            tsHelper.isInTupleReturnFunction(expression, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(expression);
        const isInSpread = expression.parent && ts.isSpreadElement(expression.parent);
        const returnValueIsUsed = expression.parent && !ts.isExpressionStatement(expression.parent);
        const wrapResult =
            isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment && !isInSpread && returnValueIsUsed;

        if (ts.isPropertyAccessExpression(expression.expression)) {
            const result = this.transformPropertyCall(expression);
            return wrapResult ? this.wrapInTable(result) : result;
        }

        if (ts.isElementAccessExpression(expression.expression)) {
            const result = this.transformElementCall(expression);
            return wrapResult ? this.wrapInTable(result) : result;
        }

        const signature = this.checker.getResolvedSignature(expression);

        // Handle super calls properly
        if (expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
            parameters = this.transformArguments(expression.arguments, signature, ts.createThis());

            return tstl.createCallExpression(
                tstl.createTableIndexExpression(
                    this.transformSuperKeyword(ts.createSuper()),
                    tstl.createStringLiteral("____constructor")
                ),
                parameters
            );
        }

        const expressionType = this.checker.getTypeAtLocation(expression.expression);
        if (tsHelper.isStandardLibraryType(expressionType, undefined, this.program)) {
            this.checkForLuaLibType(expressionType);
            const result = this.transformGlobalFunctionCall(expression);
            if (result) {
                return result;
            }
        }

        const callPath = this.transformExpression(expression.expression);
        const signatureDeclaration = signature && signature.getDeclaration();
        if (
            signatureDeclaration &&
            tsHelper.getDeclarationContextType(signatureDeclaration, this.program) === tsHelper.ContextType.Void
        ) {
            parameters = this.transformArguments(expression.arguments, signature);
        } else {
            const context = this.isStrict ? ts.createNull() : ts.createIdentifier("_G");
            parameters = this.transformArguments(expression.arguments, signature, context);
        }

        const callExpression = tstl.createCallExpression(callPath, parameters, expression);
        return wrapResult ? this.wrapInTable(callExpression) : callExpression;
    }

    protected transformGlobalFunctionCall(node: ts.CallExpression): tstl.Expression | undefined {
        const signature = this.checker.getResolvedSignature(node);
        const parameters = this.transformArguments(node.arguments, signature);

        const expressionType = this.checker.getTypeAtLocation(node.expression);
        const name = expressionType.symbol.name;
        switch (name) {
            case "SymbolConstructor":
                return this.transformLuaLibFunction(LuaLibFeature.Symbol, node, ...parameters);
            case "NumberConstructor":
                return this.transformLuaLibFunction(LuaLibFeature.Number, node, ...parameters);
            case "isNaN":
            case "isFinite":
                const numberParameters = tsHelper.isNumberType(expressionType, this.checker, this.program)
                    ? parameters
                    : [this.transformLuaLibFunction(LuaLibFeature.Number, undefined, ...parameters)];

                return this.transformLuaLibFunction(
                    name === "isNaN" ? LuaLibFeature.NumberIsNaN : LuaLibFeature.NumberIsFinite,
                    node,
                    ...numberParameters
                );
        }
    }

    public transformPropertyCall(node: ts.CallExpression): ExpressionVisitResult {
        let parameters: tstl.Expression[] = [];

        // Check if call is actually on a property access expression
        if (!ts.isPropertyAccessExpression(node.expression)) {
            throw TSTLErrors.InvalidPropertyCall(node);
        }

        // If the function being called is of type owner.func, get the type of owner
        const ownerType = this.checker.getTypeAtLocation(node.expression.expression);

        const signature = this.checker.getResolvedSignature(node);

        if (tsHelper.isStandardLibraryType(ownerType, "Math", this.program)) {
            return this.transformMathCallExpression(node);
        }

        if (tsHelper.isStandardLibraryType(ownerType, "Console", this.program)) {
            return this.transformConsoleCallExpression(node);
        }

        if (tsHelper.isStandardLibraryType(ownerType, "StringConstructor", this.program)) {
            return tstl.createCallExpression(
                this.transformStringExpression(node.expression.name),
                this.transformArguments(node.arguments, signature),
                node
            );
        }

        if (tsHelper.isStandardLibraryType(ownerType, "ObjectConstructor", this.program)) {
            return this.transformObjectCallExpression(node);
        }

        if (tsHelper.isStandardLibraryType(ownerType, "SymbolConstructor", this.program)) {
            return this.transformSymbolCallExpression(node);
        }

        if (tsHelper.isStandardLibraryType(ownerType, "NumberConstructor", this.program)) {
            return this.transformNumberExpression(node);
        }

        const classDecorators = tsHelper.getCustomDecorators(ownerType, this.checker);

        if (classDecorators.has(DecoratorKind.LuaTable)) {
            return this.transformLuaTableCallExpression(node);
        }

        if (tsHelper.isStringType(ownerType, this.checker, this.program)) {
            return this.transformStringCallExpression(node);
        }

        if (tsHelper.isNumberType(ownerType, this.checker, this.program)) {
            return this.transformNumberCallExpression(node);
        }

        // if ownerType is a array, use only supported functions
        if (tsHelper.isExplicitArrayType(ownerType, this.checker, this.program)) {
            return this.transformArrayCallExpression(node);
        }

        // if ownerType inherits from an array, use array calls where appropriate
        if (
            tsHelper.isArrayType(ownerType, this.checker, this.program) &&
            tsHelper.isDefaultArrayCallMethodName(node.expression.name.text)
        ) {
            return this.transformArrayCallExpression(node);
        }

        if (tsHelper.isFunctionType(ownerType, this.checker)) {
            return this.transformFunctionCallExpression(node);
        }

        // Get the type of the function
        if (node.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
            // Super calls take the format of super.call(self,...)
            parameters = this.transformArguments(node.arguments, signature, ts.createThis());
            return tstl.createCallExpression(this.transformExpression(node.expression), parameters);
        } else {
            // Replace last . with : here
            const name = node.expression.name.text;
            if (name === "toString") {
                const toStringIdentifier = tstl.createIdentifier("tostring");
                return tstl.createCallExpression(
                    toStringIdentifier,
                    [this.transformExpression(node.expression.expression)],
                    node
                );
            } else if (name === "hasOwnProperty") {
                const expr = this.transformExpression(node.expression.expression);
                parameters = this.transformArguments(node.arguments, signature);
                const rawGetIdentifier = tstl.createIdentifier("rawget");
                const rawGetCall = tstl.createCallExpression(rawGetIdentifier, [expr, ...parameters]);
                return tstl.createParenthesizedExpression(
                    tstl.createBinaryExpression(
                        rawGetCall,
                        tstl.createNilLiteral(),
                        tstl.SyntaxKind.InequalityOperator,
                        node
                    )
                );
            } else {
                const parameters = this.transformArguments(node.arguments, signature);
                const signatureDeclaration = signature && signature.getDeclaration();
                if (
                    !signatureDeclaration ||
                    tsHelper.getDeclarationContextType(signatureDeclaration, this.program) !== tsHelper.ContextType.Void
                ) {
                    // table:name()
                    return this.transformContextualCallExpression(node, parameters);
                } else {
                    let table = this.transformExpression(node.expression.expression);
                    if (tstl.isTableExpression(table)) {
                        table = tstl.createParenthesizedExpression(table);
                    }

                    // table.name()
                    const callPath = tstl.createTableIndexExpression(
                        table,
                        tstl.createStringLiteral(name),
                        node.expression
                    );
                    return tstl.createCallExpression(callPath, parameters, node);
                }
            }
        }
    }

    public transformElementCall(node: ts.CallExpression): ExpressionVisitResult {
        if (!ts.isElementAccessExpression(node.expression) && !ts.isPropertyAccessExpression(node.expression)) {
            throw TSTLErrors.InvalidElementCall(node);
        }

        const ownerType = this.checker.getTypeAtLocation(node.expression.expression);
        const ownerDecorators = tsHelper.getCustomDecorators(ownerType, this.checker);

        if (ownerDecorators.has(DecoratorKind.LuaTable)) {
            return this.transformLuaTableCallExpression(node);
        }

        const signature = this.checker.getResolvedSignature(node);
        const signatureDeclaration = signature && signature.getDeclaration();
        const parameters = this.transformArguments(node.arguments, signature);
        if (
            !signatureDeclaration ||
            tsHelper.getDeclarationContextType(signatureDeclaration, this.program) !== tsHelper.ContextType.Void
        ) {
            // A contextual parameter must be given to this call expression
            return this.transformContextualCallExpression(node, parameters);
        } else {
            // No context
            let expression = this.transformExpression(node.expression);
            if (tstl.isTableExpression(expression)) {
                expression = tstl.createParenthesizedExpression(expression);
            }
            return tstl.createCallExpression(expression, parameters);
        }
    }

    public transformContextualCallExpression(
        node: ts.CallExpression | ts.TaggedTemplateExpression,
        transformedArguments: tstl.Expression[]
    ): ExpressionVisitResult {
        const left = ts.isCallExpression(node) ? node.expression : node.tag;
        if (
            ts.isPropertyAccessExpression(left) &&
            !luaKeywords.has(left.name.text) &&
            tsHelper.isValidLuaIdentifier(left.name.text)
        ) {
            // table:name()
            let table = this.transformExpression(left.expression);
            if (tstl.isTableExpression(table)) {
                table = tstl.createParenthesizedExpression(table);
            }
            return tstl.createMethodCallExpression(
                table,
                this.transformIdentifier(left.name),
                transformedArguments,
                node
            );
        } else if (ts.isElementAccessExpression(left) || ts.isPropertyAccessExpression(left)) {
            const context = this.transformExpression(left.expression);
            if (tsHelper.isExpressionWithEvaluationEffect(left.expression)) {
                // Inject context parameter
                transformedArguments.unshift(tstl.createIdentifier("____self"));

                // Cache left-side if it has effects
                //(function() local ____self = context; return ____self[argument](parameters); end)()
                const argument = ts.isElementAccessExpression(left)
                    ? this.transformElementAccessArgument(left)
                    : tstl.createStringLiteral(left.name.text);
                const selfIdentifier = tstl.createIdentifier("____self");
                const selfAssignment = tstl.createVariableDeclarationStatement(selfIdentifier, context);
                const index = tstl.createTableIndexExpression(selfIdentifier, argument);
                const callExpression = tstl.createCallExpression(index, transformedArguments);
                return this.createImmediatelyInvokedFunctionExpression([selfAssignment], callExpression, node);
            } else {
                const expression = this.transformExpression(left);
                return tstl.createCallExpression(expression, [context, ...transformedArguments]);
            }
        } else if (ts.isIdentifier(left)) {
            const context = this.isStrict ? tstl.createNilLiteral() : tstl.createIdentifier("_G");
            transformedArguments.unshift(context);
            const expression = this.transformExpression(left);
            return tstl.createCallExpression(expression, transformedArguments, node);
        } else {
            throw TSTLErrors.UnsupportedKind("Left Hand Side Call Expression", left.kind, left);
        }
    }

    protected transformArguments<T extends ts.Expression>(
        params: readonly ts.Expression[],
        sig?: ts.Signature,
        context?: T
    ): tstl.Expression[] {
        const parameters: tstl.Expression[] = [];

        // Add context as first param if present
        if (context) {
            parameters.push(this.transformExpression(context));
        }

        if (sig && sig.parameters.length >= params.length) {
            for (let i = 0; i < params.length; ++i) {
                const param = params[i];
                const paramType = this.checker.getTypeAtLocation(param);
                const sigType = this.checker.getTypeAtLocation(sig.parameters[i].valueDeclaration);
                this.validateFunctionAssignment(param, paramType, sigType, sig.parameters[i].name);

                parameters.push(this.transformExpression(param));
            }
        } else {
            parameters.push(...params.map(param => this.transformExpression(param)));
        }

        return parameters;
    }

    public transformPropertyAccessExpression(expression: ts.PropertyAccessExpression): ExpressionVisitResult {
        const property = expression.name.text;

        const constEnumValue = this.tryGetConstEnumValue(expression);
        if (constEnumValue) {
            return constEnumValue;
        }

        // Check for primitive types to override
        const type = this.checker.getTypeAtLocation(expression.expression);
        if (tsHelper.isStringType(type, this.checker, this.program)) {
            return this.transformStringProperty(expression);
        } else if (tsHelper.isArrayType(type, this.checker, this.program)) {
            const arrayPropertyAccess = this.transformArrayProperty(expression);
            if (arrayPropertyAccess) {
                return arrayPropertyAccess;
            }
        }

        this.checkForLuaLibType(type);

        const decorators = tsHelper.getCustomDecorators(type, this.checker);
        // Do not output path for member only enums
        if (decorators.has(DecoratorKind.CompileMembersOnly)) {
            if (ts.isPropertyAccessExpression(expression.expression)) {
                // in case of ...x.enum.y transform to ...x.y
                return tstl.createTableIndexExpression(
                    this.transformExpression(expression.expression.expression),
                    tstl.createStringLiteral(property),
                    expression
                );
            } else {
                return tstl.createIdentifier(property, expression);
            }
        }

        if (decorators.has(DecoratorKind.LuaTable)) {
            return this.transformLuaTableProperty(expression);
        }

        // Catch math expressions
        if (ts.isIdentifier(expression.expression)) {
            const ownerType = this.checker.getTypeAtLocation(expression.expression);

            if (tsHelper.isStandardLibraryType(ownerType, "Math", this.program)) {
                return this.transformMathExpression(expression.name);
            } else if (tsHelper.isStandardLibraryType(ownerType, "Symbol", this.program)) {
                // Pull in Symbol lib
                this.importLuaLibFeature(LuaLibFeature.Symbol);
            }
        }

        let callPath = this.transformExpression(expression.expression);
        if (tstl.isTableExpression(callPath)) {
            callPath = tstl.createParenthesizedExpression(callPath);
        }
        return tstl.createTableIndexExpression(callPath, tstl.createStringLiteral(property), expression);
    }

    // Transpile a Math._ property
    protected transformMathExpression(identifier: ts.Identifier): tstl.Expression {
        const name = identifier.text;
        switch (name) {
            case "PI":
                const property = tstl.createStringLiteral("pi");
                const math = tstl.createIdentifier("math");
                return tstl.createTableIndexExpression(math, property, identifier);

            case "E":
            case "LN10":
            case "LN2":
            case "LOG10E":
            case "LOG2E":
            case "SQRT1_2":
            case "SQRT2":
                return tstl.createNumericLiteral(Math[name], identifier);

            default:
                throw TSTLErrors.UnsupportedProperty("Math", name, identifier);
        }
    }

    // Transpile a Math._ property
    protected transformMathCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const signature = this.checker.getResolvedSignature(node);
        const params = this.transformArguments(node.arguments, signature);
        const expressionName = expression.name.text;
        switch (expressionName) {
            // math.tan(x / y)
            case "atan2": {
                const math = tstl.createIdentifier("math");
                const atan = tstl.createStringLiteral("atan");
                const div = tstl.createBinaryExpression(params[0], params[1], tstl.SyntaxKind.DivisionOperator);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, atan), [div], node);
            }

            // (math.log(x) / Math.LNe)
            case "log10":
            case "log2": {
                const math = tstl.createIdentifier("math");
                const log1 = tstl.createTableIndexExpression(math, tstl.createStringLiteral("log"));
                const logCall1 = tstl.createCallExpression(log1, params);
                const e = tstl.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
                const div = tstl.createBinaryExpression(logCall1, e, tstl.SyntaxKind.DivisionOperator);
                return tstl.createParenthesizedExpression(div, node);
            }

            // math.log(1 + x)
            case "log1p": {
                const math = tstl.createIdentifier("math");
                const log = tstl.createStringLiteral("log");
                const one = tstl.createNumericLiteral(1);
                const add = tstl.createBinaryExpression(one, params[0], tstl.SyntaxKind.AdditionOperator);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, log), [add], node);
            }

            // math.floor(x + 0.5)
            case "round": {
                const math = tstl.createIdentifier("math");
                const floor = tstl.createStringLiteral("floor");
                const half = tstl.createNumericLiteral(0.5);
                const add = tstl.createBinaryExpression(params[0], half, tstl.SyntaxKind.AdditionOperator);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, floor), [add], node);
            }

            case "abs":
            case "acos":
            case "asin":
            case "atan":
            case "ceil":
            case "cos":
            case "exp":
            case "floor":
            case "log":
            case "max":
            case "min":
            case "pow":
            case "random":
            case "sin":
            case "sqrt":
            case "tan": {
                const math = tstl.createIdentifier("math");
                const method = tstl.createStringLiteral(expressionName);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, method), params, node);
            }

            default:
                throw TSTLErrors.UnsupportedProperty("Math", expressionName, expression);
        }
    }

    // Transpile access of string properties, only supported properties are allowed
    protected transformStringProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression {
        switch (node.name.text) {
            case "length":
                let expression = this.transformExpression(node.expression);
                if (ts.isTemplateExpression(node.expression)) {
                    expression = tstl.createParenthesizedExpression(expression);
                }
                return tstl.createUnaryExpression(expression, tstl.SyntaxKind.LengthOperator, node);
            default:
                throw TSTLErrors.UnsupportedProperty("string", node.name.text, node);
        }
    }

    // Transpile access of array properties, only supported properties are allowed
    protected transformArrayProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression | undefined {
        switch (node.name.text) {
            case "length":
                let expression = this.transformExpression(node.expression);
                if (tstl.isTableExpression(expression)) {
                    expression = tstl.createParenthesizedExpression(expression);
                }
                return tstl.createUnaryExpression(expression, tstl.SyntaxKind.LengthOperator, node);
            default:
                return undefined;
        }
    }

    protected transformLuaTableProperty(node: ts.PropertyAccessExpression): tstl.Expression {
        const [luaTable, propertyName] = this.parseLuaTableExpression(node);
        switch (propertyName) {
            case "length":
                const unaryExpression = tstl.createUnaryExpression(luaTable, tstl.SyntaxKind.LengthOperator, node);
                return unaryExpression;
            default:
                throw TSTLErrors.UnsupportedProperty("LuaTable", propertyName, node);
        }
    }

    protected transformElementAccessArgument(expression: ts.ElementAccessExpression): tstl.Expression {
        const index = this.transformExpression(expression.argumentExpression);
        const argumentType = this.checker.getTypeAtLocation(expression.argumentExpression);
        const type = this.checker.getTypeAtLocation(expression.expression);
        if (
            tsHelper.isNumberType(argumentType, this.checker, this.program) &&
            tsHelper.isArrayType(type, this.checker, this.program)
        ) {
            return this.expressionPlusOne(index);
        } else {
            return index;
        }
    }

    public transformElementAccessExpression(expression: ts.ElementAccessExpression): ExpressionVisitResult {
        let table = this.transformExpression(expression.expression);
        if (tstl.isTableExpression(table)) {
            table = tstl.createParenthesizedExpression(table);
        }

        const constEnumValue = this.tryGetConstEnumValue(expression);
        if (constEnumValue) {
            return constEnumValue;
        }

        const argumentType = this.checker.getTypeAtLocation(expression.argumentExpression);
        const type = this.checker.getTypeAtLocation(expression.expression);
        const decorators = tsHelper.getCustomDecorators(type, this.checker);
        if (decorators.has(DecoratorKind.LuaTable)) {
            throw TSTLErrors.UnsupportedKind("LuaTable access expression", expression.kind, expression);
        }

        if (
            tsHelper.isNumberType(argumentType, this.checker, this.program) &&
            tsHelper.isStringType(type, this.checker, this.program)
        ) {
            const index = this.transformExpression(expression.argumentExpression);
            return tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("sub")),
                [table, this.expressionPlusOne(index), this.expressionPlusOne(index)],
                expression
            );
        }

        return tstl.createTableIndexExpression(table, this.transformElementAccessArgument(expression), expression);
    }

    private tryGetConstEnumValue(
        node: ts.EnumMember | ts.PropertyAccessExpression | ts.ElementAccessExpression
    ): tstl.Expression | undefined {
        const value = this.checker.getConstantValue(node);
        if (typeof value === "string") {
            return tstl.createStringLiteral(value, node);
        } else if (typeof value === "number") {
            return tstl.createNumericLiteral(value, node);
        }
    }

    protected transformStringCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const signature = this.checker.getResolvedSignature(node);
        const params = this.transformArguments(node.arguments, signature);
        const caller = this.transformExpression(expression.expression);

        const expressionName = expression.name.text;
        switch (expressionName) {
            case "replace":
                return this.transformLuaLibFunction(LuaLibFeature.StringReplace, node, caller, ...params);
            case "concat":
                return this.transformLuaLibFunction(LuaLibFeature.StringConcat, node, caller, ...params);
            case "indexOf":
                const stringExpression = this.createStringCall(
                    "find",
                    node,
                    caller,
                    params[0],
                    params[1] ? this.expressionPlusOne(params[1]) : tstl.createNilLiteral(),
                    tstl.createBooleanLiteral(true)
                );

                return tstl.createParenthesizedExpression(
                    tstl.createBinaryExpression(
                        tstl.createParenthesizedExpression(
                            tstl.createBinaryExpression(
                                stringExpression,
                                tstl.createNumericLiteral(0),
                                tstl.SyntaxKind.OrOperator
                            )
                        ),
                        tstl.createNumericLiteral(1),
                        tstl.SyntaxKind.SubtractionOperator,
                        node
                    )
                );
            case "substr":
                if (node.arguments.length === 1) {
                    const argument = this.transformExpression(node.arguments[0]);
                    const arg1 = this.expressionPlusOne(argument);
                    return this.createStringCall("sub", node, caller, arg1);
                } else {
                    const arg1 = params[0];
                    const arg2 = params[1];
                    const sumArg = tstl.createBinaryExpression(
                        tstl.createParenthesizedExpression(arg1),
                        tstl.createParenthesizedExpression(arg2),
                        tstl.SyntaxKind.AdditionOperator
                    );
                    return this.createStringCall("sub", node, caller, this.expressionPlusOne(arg1), sumArg);
                }
            case "substring":
                if (node.arguments.length === 1) {
                    const arg1 = this.expressionPlusOne(params[0]);
                    return this.createStringCall("sub", node, caller, arg1);
                } else {
                    const arg1 = this.expressionPlusOne(params[0]);
                    const arg2 = params[1];
                    return this.createStringCall("sub", node, caller, arg1, arg2);
                }
            case "slice":
                if (node.arguments.length === 0) {
                    return caller;
                } else if (node.arguments.length === 1) {
                    const arg1 = this.expressionPlusOne(params[0]);
                    return this.createStringCall("sub", node, caller, arg1);
                } else {
                    const arg1 = this.expressionPlusOne(params[0]);
                    const arg2 = params[1];
                    return this.createStringCall("sub", node, caller, arg1, arg2);
                }
            case "toLowerCase":
                return this.createStringCall("lower", node, caller);
            case "toUpperCase":
                return this.createStringCall("upper", node, caller);
            case "split":
                return this.transformLuaLibFunction(LuaLibFeature.StringSplit, node, caller, ...params);
            case "charAt":
                const firstParamPlusOne = this.expressionPlusOne(params[0]);
                return this.createStringCall("sub", node, caller, firstParamPlusOne, firstParamPlusOne);
            case "charCodeAt": {
                const firstParamPlusOne = this.expressionPlusOne(params[0]);
                return this.createStringCall("byte", node, caller, firstParamPlusOne);
            }
            case "startsWith":
                return this.transformLuaLibFunction(LuaLibFeature.StringStartsWith, node, caller, ...params);
            case "endsWith":
                return this.transformLuaLibFunction(LuaLibFeature.StringEndsWith, node, caller, ...params);
            case "repeat":
                const math = tstl.createIdentifier("math");
                const floor = tstl.createStringLiteral("floor");
                const parameter = tstl.createCallExpression(tstl.createTableIndexExpression(math, floor), [params[0]]);
                return this.createStringCall("rep", node, caller, parameter);
            case "padStart":
                return this.transformLuaLibFunction(LuaLibFeature.StringPadStart, node, caller, ...params);
            case "padEnd":
                return this.transformLuaLibFunction(LuaLibFeature.StringPadEnd, node, caller, ...params);
            case "byte":
            case "char":
            case "dump":
            case "find":
            case "format":
            case "gmatch":
            case "gsub":
            case "len":
            case "lower":
            case "match":
            case "pack":
            case "packsize":
            case "rep":
            case "reverse":
            case "sub":
            case "unpack":
            case "upper":
                // Allow lua's string instance methods
                let stringVariable = this.transformExpression(expression.expression);
                if (ts.isStringLiteralLike(expression.expression)) {
                    // "foo":method() needs to be ("foo"):method()
                    stringVariable = tstl.createParenthesizedExpression(stringVariable);
                }
                return tstl.createMethodCallExpression(
                    stringVariable,
                    this.transformIdentifier(expression.name),
                    params,
                    node
                );
            default:
                throw TSTLErrors.UnsupportedProperty("string", expressionName, node);
        }
    }

    protected createStringCall(
        methodName: string,
        tsOriginal: ts.Node,
        ...params: tstl.Expression[]
    ): tstl.CallExpression {
        const stringIdentifier = tstl.createIdentifier("string");
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(stringIdentifier, tstl.createStringLiteral(methodName)),
            params,
            tsOriginal
        );
    }

    protected transformNumberCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const signature = this.checker.getResolvedSignature(node);
        const params = this.transformArguments(node.arguments, signature);
        const caller = this.transformExpression(expression.expression);

        const expressionName = expression.name.text;
        switch (expressionName) {
            case "toString":
                return params.length === 0
                    ? tstl.createCallExpression(tstl.createIdentifier("tostring"), [caller], node)
                    : this.transformLuaLibFunction(LuaLibFeature.NumberToString, node, caller, ...params);
            default:
                throw TSTLErrors.UnsupportedProperty("number", expressionName, node);
        }
    }

    // Transpile a String._ property
    protected transformStringExpression(identifier: ts.Identifier): ExpressionVisitResult {
        const identifierString = identifier.text;

        switch (identifierString) {
            case "fromCharCode":
                return tstl.createTableIndexExpression(
                    tstl.createIdentifier("string"),
                    tstl.createStringLiteral("char")
                );
            default:
                throw TSTLErrors.UnsupportedProperty("String", identifierString, identifier);
        }
    }

    // Transpile an Object._ property
    protected transformObjectCallExpression(expression: ts.CallExpression): ExpressionVisitResult {
        const method = expression.expression as ts.PropertyAccessExpression;
        const parameters = this.transformArguments(expression.arguments);
        const methodName = method.name.text;

        switch (methodName) {
            case "assign":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectAssign, expression, ...parameters);
            case "entries":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectEntries, expression, ...parameters);
            case "fromEntries":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectFromEntries, expression, ...parameters);
            case "keys":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectKeys, expression, ...parameters);
            case "values":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectValues, expression, ...parameters);
            default:
                throw TSTLErrors.UnsupportedProperty("Object", methodName, expression);
        }
    }

    protected transformConsoleCallExpression(expression: ts.CallExpression): ExpressionVisitResult {
        const method = expression.expression as ts.PropertyAccessExpression;
        const methodName = method.name.text;
        const signature = this.checker.getResolvedSignature(expression);

        switch (methodName) {
            case "log":
                if (expression.arguments.length > 0 && this.isStringFormatTemplate(expression.arguments[0])) {
                    // print(string.format([arguments]))
                    const stringFormatCall = tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            tstl.createIdentifier("string"),
                            tstl.createStringLiteral("format")
                        ),
                        this.transformArguments(expression.arguments, signature)
                    );
                    return tstl.createCallExpression(tstl.createIdentifier("print"), [stringFormatCall]);
                }
                // print([arguments])
                return tstl.createCallExpression(
                    tstl.createIdentifier("print"),
                    this.transformArguments(expression.arguments, signature)
                );
            case "assert":
                const args = this.transformArguments(expression.arguments, signature);
                if (expression.arguments.length > 1 && this.isStringFormatTemplate(expression.arguments[1])) {
                    // assert([condition], string.format([arguments]))
                    const stringFormatCall = tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            tstl.createIdentifier("string"),
                            tstl.createStringLiteral("format")
                        ),
                        args.slice(1)
                    );
                    return tstl.createCallExpression(tstl.createIdentifier("assert"), [args[0], stringFormatCall]);
                }
                // assert()
                return tstl.createCallExpression(tstl.createIdentifier("assert"), args);
            case "trace":
                if (expression.arguments.length > 0 && this.isStringFormatTemplate(expression.arguments[0])) {
                    // print(debug.traceback(string.format([arguments])))
                    const stringFormatCall = tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            tstl.createIdentifier("string"),
                            tstl.createStringLiteral("format")
                        ),
                        this.transformArguments(expression.arguments, signature)
                    );
                    const debugTracebackCall = tstl.createCallExpression(
                        tstl.createTableIndexExpression(
                            tstl.createIdentifier("debug"),
                            tstl.createStringLiteral("traceback")
                        ),
                        [stringFormatCall]
                    );
                    return tstl.createCallExpression(tstl.createIdentifier("print"), [debugTracebackCall]);
                }
                // print(debug.traceback([arguments])))
                const debugTracebackCall = tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("debug"),
                        tstl.createStringLiteral("traceback")
                    ),
                    this.transformArguments(expression.arguments, signature)
                );
                return tstl.createCallExpression(tstl.createIdentifier("print"), [debugTracebackCall]);
            default:
                throw TSTLErrors.UnsupportedProperty("console", methodName, expression);
        }
    }

    protected isStringFormatTemplate(expression: ts.Expression): boolean {
        return ts.isStringLiteral(expression) && expression.text.match(/\%/g) !== null;
    }

    // Transpile a Symbol._ property
    protected transformSymbolCallExpression(expression: ts.CallExpression): tstl.CallExpression {
        const method = expression.expression as ts.PropertyAccessExpression;
        const signature = this.checker.getResolvedSignature(expression);
        const parameters = this.transformArguments(expression.arguments, signature);
        const methodName = method.name.text;

        switch (methodName) {
            case "for":
            case "keyFor":
                this.importLuaLibFeature(LuaLibFeature.SymbolRegistry);
                const upperMethodName = methodName[0].toUpperCase() + methodName.slice(1);
                const functionIdentifier = tstl.createIdentifier(`__TS__SymbolRegistry${upperMethodName}`);
                return tstl.createCallExpression(functionIdentifier, parameters, expression);
            default:
                throw TSTLErrors.UnsupportedProperty("Symbol", methodName, expression);
        }
    }

    // Transpile a Number._ property
    protected transformNumberExpression(expression: ts.CallExpression): tstl.CallExpression {
        const method = expression.expression as ts.PropertyAccessExpression;
        const parameters = this.transformArguments(expression.arguments);
        const methodName = method.name.text;

        switch (methodName) {
            case "isNaN":
                return this.transformLuaLibFunction(LuaLibFeature.NumberIsNaN, expression, ...parameters);
            case "isFinite":
                return this.transformLuaLibFunction(LuaLibFeature.NumberIsFinite, expression, ...parameters);
            default:
                throw TSTLErrors.UnsupportedProperty("Number", methodName, expression);
        }
    }

    protected validateLuaTableCall(
        methodName: string,
        callArguments: ts.NodeArray<ts.Expression>,
        original: ts.Node
    ): void {
        if (callArguments.some(argument => ts.isSpreadElement(argument))) {
            throw TSTLErrors.ForbiddenLuaTableUseException("Arguments cannot be spread.", original);
        }

        switch (methodName) {
            case "get":
                if (callArguments.length !== 1) {
                    throw TSTLErrors.ForbiddenLuaTableUseException("One parameter is required for get().", original);
                }
                break;
            case "set":
                if (callArguments.length !== 2) {
                    throw TSTLErrors.ForbiddenLuaTableUseException("Two parameters are required for set().", original);
                }
                break;
        }
    }

    protected transformLuaTableExpressionAsExpressionStatement(expression: ts.CallExpression): tstl.Statement {
        const [luaTable, methodName] = this.parseLuaTableExpression(expression.expression);
        this.validateLuaTableCall(methodName, expression.arguments, expression);
        const signature = this.checker.getResolvedSignature(expression);
        const params = this.transformArguments(expression.arguments, signature);

        switch (methodName) {
            case "get":
                return tstl.createVariableDeclarationStatement(
                    tstl.createAnonymousIdentifier(expression),
                    tstl.createTableIndexExpression(luaTable, params[0], expression),
                    expression
                );
            case "set":
                return tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(luaTable, params[0], expression),
                    params.splice(1),
                    expression
                );
            default:
                throw TSTLErrors.UnsupportedProperty("LuaTable", methodName, expression);
        }
    }

    protected transformLuaTableCallExpression(expression: ts.CallExpression): tstl.Expression {
        const [luaTable, methodName] = this.parseLuaTableExpression(expression.expression);
        this.validateLuaTableCall(methodName, expression.arguments, expression);
        const signature = this.checker.getResolvedSignature(expression);
        const params = this.transformArguments(expression.arguments, signature);

        switch (methodName) {
            case "get":
                return tstl.createTableIndexExpression(luaTable, params[0], expression);
            default:
                throw TSTLErrors.UnsupportedProperty("LuaTable", methodName, expression);
        }
    }

    protected transformArrayCallExpression(node: ts.CallExpression): tstl.CallExpression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const signature = this.checker.getResolvedSignature(node);
        const params = this.transformArguments(node.arguments, signature);
        const caller = this.transformExpression(expression.expression);
        const expressionName = expression.name.text;
        switch (expressionName) {
            case "concat":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayConcat, node, caller, ...params);
            case "push":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayPush, node, caller, ...params);
            case "reverse":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayReverse, node, caller);
            case "shift":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayShift, node, caller);
            case "unshift":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayUnshift, node, caller, ...params);
            case "sort":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySort, node, caller, ...params);
            case "pop":
                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("remove")),
                    [caller],
                    node
                );
            case "forEach":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayForEach, node, caller, ...params);
            case "find":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFind, node, caller, ...params);
            case "findIndex":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFindIndex, node, caller, ...params);
            case "indexOf":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayIndexOf, node, caller, ...params);
            case "map":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayMap, node, caller, ...params);
            case "filter":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFilter, node, caller, ...params);
            case "reduce":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayReduce, node, caller, ...params);
            case "reduceRight":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayReduceRight, node, caller, ...params);
            case "some":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySome, node, caller, ...params);
            case "every":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayEvery, node, caller, ...params);
            case "slice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySlice, node, caller, ...params);
            case "splice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySplice, node, caller, ...params);
            case "join":
                const defaultSeparatorLiteral = tstl.createStringLiteral(",");
                const parameters = [
                    caller,
                    node.arguments.length === 0
                        ? defaultSeparatorLiteral
                        : tstl.createBinaryExpression(params[0], defaultSeparatorLiteral, tstl.SyntaxKind.OrOperator),
                ];

                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("concat")),
                    parameters,
                    node
                );
            case "flat":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFlat, node, caller, ...params);
            case "flatMap":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFlatMap, node, caller, ...params);
            default:
                throw TSTLErrors.UnsupportedProperty("array", expressionName, node);
        }
    }

    protected transformFunctionCallExpression(node: ts.CallExpression): tstl.CallExpression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const callerType = this.checker.getTypeAtLocation(expression.expression);
        if (tsHelper.getFunctionContextType(callerType, this.program) === tsHelper.ContextType.Void) {
            throw TSTLErrors.UnsupportedSelfFunctionConversion(node);
        }
        const signature = this.checker.getResolvedSignature(node);
        const params = this.transformArguments(node.arguments, signature);
        const caller = this.transformExpression(expression.expression);
        const expressionName = expression.name.text;
        switch (expressionName) {
            case "apply":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionApply, node, caller, ...params);
            case "bind":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionBind, node, caller, ...params);
            case "call":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionCall, node, caller, ...params);
            default:
                throw TSTLErrors.UnsupportedProperty("function", expressionName, node);
        }
    }

    public transformArrayBindingElement(name: ts.ArrayBindingElement | ts.Expression): ExpressionVisitResult {
        if (ts.isOmittedExpression(name)) {
            return this.transformOmittedExpression(name);
        } else if (ts.isIdentifier(name)) {
            return this.transformIdentifier(name);
        } else if (ts.isBindingElement(name) && ts.isIdentifier(name.name)) {
            return this.transformIdentifier(name.name);
        } else {
            throw TSTLErrors.UnsupportedKind("array binding expression", name.kind, name);
        }
    }

    public transformAssertionExpression(expression: ts.AssertionExpression): ExpressionVisitResult {
        if (!ts.isConstTypeReference(expression.type)) {
            this.validateFunctionAssignment(
                expression,
                this.checker.getTypeAtLocation(expression.expression),
                this.checker.getTypeAtLocation(expression.type)
            );
        }

        return this.transformExpression(expression.expression);
    }

    public transformTypeOfExpression(expression: ts.TypeOfExpression): ExpressionVisitResult {
        const innerExpression = this.transformExpression(expression.expression);
        return this.transformLuaLibFunction(LuaLibFeature.TypeOf, expression, innerExpression);
    }

    public transformSpreadElement(expression: ts.SpreadElement): ExpressionVisitResult {
        const innerExpression = this.transformExpression(expression.expression);
        if (tsHelper.isTupleReturnCall(expression.expression, this.checker)) {
            return innerExpression;
        }

        if (ts.isIdentifier(expression.expression) && tsHelper.isVarArgType(expression.expression, this.checker)) {
            return tstl.createDotsLiteral(expression);
        }

        const type = this.checker.getTypeAtLocation(expression.expression);
        if (tsHelper.isArrayType(type, this.checker, this.program)) {
            return this.createUnpackCall(innerExpression, expression);
        }

        return this.transformLuaLibFunction(LuaLibFeature.Spread, expression, innerExpression);
    }

    public transformStringLiteral(literal: ts.StringLiteralLike): ExpressionVisitResult {
        const text = tsHelper.escapeString(literal.text);
        return tstl.createStringLiteral(text, literal);
    }

    public transformNumericLiteral(literal: ts.NumericLiteral): ExpressionVisitResult {
        const value = Number(literal.text);
        return tstl.createNumericLiteral(value, literal);
    }

    public transformTrueKeyword(trueKeyword: ts.BooleanLiteral): ExpressionVisitResult {
        return tstl.createBooleanLiteral(true, trueKeyword);
    }

    public transformFalseKeyword(falseKeyword: ts.BooleanLiteral): ExpressionVisitResult {
        return tstl.createBooleanLiteral(false, falseKeyword);
    }

    public transformNullOrUndefinedKeyword(originalNode: ts.Node): ExpressionVisitResult {
        return tstl.createNilLiteral(originalNode);
    }

    public transformThisKeyword(thisKeyword: ts.ThisExpression): ExpressionVisitResult {
        return this.createSelfIdentifier(thisKeyword);
    }

    public transformTaggedTemplateExpression(expression: ts.TaggedTemplateExpression): ExpressionVisitResult {
        const strings: string[] = [];
        const rawStrings: string[] = [];
        const expressions: ts.Expression[] = [];

        if (ts.isTemplateExpression(expression.template)) {
            // Expressions are in the string.
            strings.push(expression.template.head.text);
            rawStrings.push(tsHelper.getRawLiteral(expression.template.head));
            strings.push(...expression.template.templateSpans.map(span => span.literal.text));
            rawStrings.push(...expression.template.templateSpans.map(span => tsHelper.getRawLiteral(span.literal)));
            expressions.push(...expression.template.templateSpans.map(span => span.expression));
        } else {
            // No expressions are in the string.
            strings.push(expression.template.text);
            rawStrings.push(tsHelper.getRawLiteral(expression.template));
        }

        // Construct table with strings and literal strings
        const stringTableLiteral = tstl.createTableExpression(
            strings.map(partialString => tstl.createTableFieldExpression(tstl.createStringLiteral(partialString)))
        );
        const rawStringArray = tstl.createTableExpression(
            rawStrings.map(stringLiteral => tstl.createTableFieldExpression(tstl.createStringLiteral(stringLiteral)))
        );
        stringTableLiteral.fields.push(
            tstl.createTableFieldExpression(rawStringArray, tstl.createStringLiteral("raw"))
        );

        // Evaluate if there is a self parameter to be used.
        const signature = this.checker.getResolvedSignature(expression);
        const signatureDeclaration = signature && signature.getDeclaration();
        const useSelfParameter =
            signatureDeclaration &&
            tsHelper.getDeclarationContextType(signatureDeclaration, this.program) !== tsHelper.ContextType.Void;

        // Argument evaluation.
        const callArguments = this.transformArguments(expressions, signature);
        callArguments.unshift(stringTableLiteral);

        if (useSelfParameter) {
            return this.transformContextualCallExpression(expression, callArguments);
        }

        const leftHandSideExpression = this.transformExpression(expression.tag);
        return tstl.createCallExpression(leftHandSideExpression, callArguments);
    }

    public transformTemplateExpression(expression: ts.TemplateExpression): ExpressionVisitResult {
        const parts: tstl.Expression[] = [];

        const head = tsHelper.escapeString(expression.head.text);
        if (head.length > 0) {
            parts.push(tstl.createStringLiteral(head, expression.head));
        }

        expression.templateSpans.forEach(span => {
            const expression = this.transformExpression(span.expression);
            parts.push(this.wrapInToStringForConcat(expression));

            const text = tsHelper.escapeString(span.literal.text);
            if (text.length > 0) {
                parts.push(tstl.createStringLiteral(text, span.literal));
            }
        });

        return parts.reduce((prev, current) =>
            tstl.createBinaryExpression(prev, current, tstl.SyntaxKind.ConcatOperator)
        );
    }

    public transformPropertyName(propertyName: ts.PropertyName): ExpressionVisitResult {
        if (ts.isComputedPropertyName(propertyName)) {
            return this.transformExpression(propertyName.expression);
        } else if (ts.isStringLiteral(propertyName)) {
            return this.transformStringLiteral(propertyName);
        } else if (ts.isNumericLiteral(propertyName)) {
            const value = Number(propertyName.text);
            return tstl.createNumericLiteral(value, propertyName);
        } else {
            return tstl.createStringLiteral(propertyName.text);
        }
    }

    public transformIdentifier(identifier: ts.Identifier): tstl.Identifier {
        if (tsHelper.isForRangeType(identifier, this.checker)) {
            const callExpression = tsHelper.findFirstNodeAbove(identifier, ts.isCallExpression);
            if (!callExpression || !callExpression.parent || !ts.isForOfStatement(callExpression.parent)) {
                throw TSTLErrors.InvalidForRangeCall(
                    identifier,
                    "@forRange function can only be used as an iterable in a for...of loop."
                );
            }
        }

        const text = this.hasUnsafeIdentifierName(identifier) ? this.createSafeName(identifier.text) : identifier.text;

        const symbolId = this.getIdentifierSymbolId(identifier);
        return tstl.createIdentifier(text, identifier, symbolId, identifier.text);
    }

    protected transformIdentifierExpression(expression: ts.Identifier): tstl.Expression {
        const identifier = this.transformIdentifier(expression);

        const exportScope = this.getIdentifierExportScope(identifier);
        if (exportScope) {
            return this.createExportedIdentifier(identifier, exportScope);
        }

        if (expression.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
            return tstl.createNilLiteral();
        }

        switch (expression.text) {
            case "NaN":
                return tstl.createParenthesizedExpression(
                    tstl.createBinaryExpression(
                        tstl.createNumericLiteral(0),
                        tstl.createNumericLiteral(0),
                        tstl.SyntaxKind.DivisionOperator,
                        expression
                    )
                );

            case "Infinity":
                const math = tstl.createIdentifier("math");
                const huge = tstl.createStringLiteral("huge");
                return tstl.createTableIndexExpression(math, huge, expression);

            case "globalThis":
                return tstl.createIdentifier("_G", expression, this.getIdentifierSymbolId(expression));
        }

        return identifier;
    }

    protected getSymbolFromIdentifier(identifier: tstl.Identifier): ts.Symbol | undefined {
        if (identifier.symbolId !== undefined) {
            const symbolInfo = this.symbolInfo.get(identifier.symbolId);
            if (symbolInfo !== undefined) {
                return symbolInfo.symbol;
            }
        }
        return undefined;
    }

    protected getIdentifierExportScope(identifier: tstl.Identifier): ts.SourceFile | ts.ModuleDeclaration | undefined {
        const symbol = this.getSymbolFromIdentifier(identifier);
        if (!symbol) {
            return undefined;
        }

        return this.getSymbolExportScope(symbol);
    }

    protected isSymbolExported(symbol: ts.Symbol): boolean {
        return (
            tsHelper.getExportedSymbolDeclaration(symbol) !== undefined ||
            // Symbol may have been exported separately (e.g. 'const foo = "bar"; export { foo }')
            this.isSymbolExportedFromScope(symbol, this.currentSourceFile)
        );
    }

    protected isSymbolExportedFromScope(symbol: ts.Symbol, scope: ts.SourceFile | ts.ModuleDeclaration): boolean {
        if (ts.isSourceFile(scope) && !tsHelper.isFileModule(scope)) {
            return false;
        }

        let scopeSymbol = this.checker.getSymbolAtLocation(scope);
        if (scopeSymbol === undefined) {
            scopeSymbol = this.checker.getTypeAtLocation(scope).getSymbol();
        }

        if (scopeSymbol === undefined || scopeSymbol.exports === undefined) {
            return false;
        }
        const scopeSymbolExports = scopeSymbol.exports;

        const it: Iterable<ts.Symbol> = {
            [Symbol.iterator]: () => scopeSymbolExports.values(), // Why isn't ts.SymbolTable.values() iterable?
        };
        for (const exportedSymbol of it) {
            if (exportedSymbol === symbol) {
                return true;
            }
        }
        return false;
    }

    protected addExportToIdentifier(identifier: tstl.Identifier): tstl.AssignmentLeftHandSideExpression {
        const exportScope = this.getIdentifierExportScope(identifier);
        if (exportScope) {
            return this.createExportedIdentifier(identifier, exportScope);
        }
        return identifier;
    }

    protected createExportedIdentifier(
        identifier: tstl.Identifier,
        exportScope?: ts.SourceFile | ts.ModuleDeclaration
    ): tstl.AssignmentLeftHandSideExpression {
        if (!identifier.exportable) {
            return identifier;
        }

        const exportTable =
            exportScope && ts.isModuleDeclaration(exportScope)
                ? this.createModuleLocalNameIdentifier(exportScope)
                : this.createExportsIdentifier();
        return tstl.createTableIndexExpression(exportTable, tstl.createStringLiteral(identifier.text));
    }

    protected createDefaultExportIdentifier(original: ts.Node): tstl.Identifier {
        return tstl.createIdentifier("default", original);
    }

    protected createDefaultExportStringLiteral(original: ts.Node): tstl.StringLiteral {
        return tstl.createStringLiteral("default", original);
    }

    protected getSymbolExportScope(symbol: ts.Symbol): ts.SourceFile | ts.ModuleDeclaration | undefined {
        const exportedDeclaration = tsHelper.getExportedSymbolDeclaration(symbol);
        if (!exportedDeclaration) {
            return undefined;
        }

        const scope = tsHelper.findFirstNodeAbove(
            exportedDeclaration,
            (n): n is ts.SourceFile | ts.ModuleDeclaration => ts.isSourceFile(n) || ts.isModuleDeclaration(n)
        );
        if (!scope) {
            return undefined;
        }

        if (!this.isSymbolExportedFromScope(symbol, scope)) {
            return undefined;
        }

        return scope;
    }

    protected parseLuaTableExpression(node: ts.LeftHandSideExpression): [tstl.Expression, string] {
        if (ts.isPropertyAccessExpression(node)) {
            return [this.transformExpression(node.expression), node.name.text];
        } else {
            throw TSTLErrors.UnsupportedKind("LuaTable access expression", node.kind, node);
        }
    }

    protected transformLuaLibFunction(
        func: LuaLibFeature,
        tsParent?: ts.Expression,
        ...params: tstl.Expression[]
    ): tstl.CallExpression {
        this.importLuaLibFeature(func);
        const functionIdentifier = tstl.createIdentifier(`__TS__${func}`);
        return tstl.createCallExpression(functionIdentifier, params, tsParent);
    }

    protected checkForLuaLibType(type: ts.Type): void {
        if (type.symbol) {
            const name = this.checker.getFullyQualifiedName(type.symbol);
            switch (name) {
                case "Map":
                    this.importLuaLibFeature(LuaLibFeature.Map);
                    return;
                case "Set":
                    this.importLuaLibFeature(LuaLibFeature.Set);
                    return;
                case "WeakMap":
                    this.importLuaLibFeature(LuaLibFeature.WeakMap);
                    return;
                case "WeakSet":
                    this.importLuaLibFeature(LuaLibFeature.WeakSet);
                    return;
            }

            if (tsHelper.isBuiltinErrorTypeName(name)) {
                this.importLuaLibFeature(LuaLibFeature.Error);
            }
        }
    }

    protected importLuaLibFeature(feature: LuaLibFeature): void {
        this.luaLibFeatureSet.add(feature);
    }

    protected createImmediatelyInvokedFunctionExpression(
        statements: tstl.Statement[],
        result: tstl.Expression | tstl.Expression[],
        tsOriginal?: ts.Node
    ): tstl.CallExpression {
        const body = statements ? statements.slice(0) : [];
        body.push(tstl.createReturnStatement(Array.isArray(result) ? result : [result]));
        const flags = statements.length === 0 ? tstl.FunctionExpressionFlags.Inline : tstl.FunctionExpressionFlags.None;
        const iife = tstl.createFunctionExpression(tstl.createBlock(body), undefined, undefined, undefined, flags);
        return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), [], tsOriginal);
    }

    protected createUnpackCall(expression: tstl.Expression | undefined, tsOriginal?: ts.Node): tstl.Expression {
        switch (this.luaTarget) {
            case LuaTarget.Lua51:
            case LuaTarget.LuaJIT:
                return tstl.createCallExpression(
                    tstl.createIdentifier("unpack"),
                    this.filterUndefined([expression]),
                    tsOriginal
                );
            case LuaTarget.Lua52:
            case LuaTarget.Lua53:
            default:
                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("unpack")),
                    this.filterUndefined([expression]),
                    tsOriginal
                );
        }
    }

    protected createSelfIdentifier(tsOriginal?: ts.Node): tstl.Identifier {
        return tstl.createIdentifier("self", tsOriginal, undefined, "this");
    }

    protected createExportsIdentifier(): tstl.Identifier {
        return tstl.createIdentifier("____exports");
    }

    protected createLocalOrExportedOrGlobalDeclaration(
        lhs: tstl.Identifier | tstl.Identifier[],
        rhs?: tstl.Expression | tstl.Expression[],
        tsOriginal?: ts.Node,
        parent?: tstl.Node,
        overrideExportScope?: ts.SourceFile | ts.ModuleDeclaration
    ): tstl.Statement[] {
        let declaration: tstl.VariableDeclarationStatement | undefined;
        let assignment: tstl.AssignmentStatement | undefined;

        const functionDeclaration = tsOriginal && ts.isFunctionDeclaration(tsOriginal) ? tsOriginal : undefined;

        const identifiers = Array.isArray(lhs) ? lhs : [lhs];
        if (identifiers.length === 0) {
            return [];
        }

        const exportScope = overrideExportScope || this.getIdentifierExportScope(identifiers[0]);
        if (exportScope) {
            // exported
            if (!rhs) {
                return [];
            } else {
                assignment = tstl.createAssignmentStatement(
                    identifiers.map(i => this.createExportedIdentifier(i, exportScope)),
                    rhs,
                    tsOriginal,
                    parent
                );
            }
        } else {
            const insideFunction = this.findScope(ScopeType.Function) !== undefined;
            let isLetOrConst = false;
            let isFirstDeclaration = true; // var can have multiple declarations for the same variable :/
            if (tsOriginal && ts.isVariableDeclaration(tsOriginal) && tsOriginal.parent) {
                isLetOrConst = (tsOriginal.parent.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
                isFirstDeclaration =
                    isLetOrConst || tsHelper.isFirstDeclaration(tsOriginal, this.checker, this.currentSourceFile);
            }
            if ((this.isModule || this.currentNamespace || insideFunction || isLetOrConst) && isFirstDeclaration) {
                // local
                const isPossibleWrappedFunction =
                    !functionDeclaration &&
                    tsOriginal &&
                    ts.isVariableDeclaration(tsOriginal) &&
                    tsOriginal.initializer &&
                    tsHelper.isFunctionTypeAtLocation(tsOriginal.initializer, this.checker);
                if (isPossibleWrappedFunction) {
                    // Split declaration and assignment for wrapped function types to allow recursion
                    declaration = tstl.createVariableDeclarationStatement(lhs, undefined, tsOriginal, parent);
                    assignment = tstl.createAssignmentStatement(lhs, rhs, tsOriginal, parent);
                } else {
                    declaration = tstl.createVariableDeclarationStatement(lhs, rhs, tsOriginal, parent);
                }

                if (!this.options.noHoisting) {
                    // Remember local variable declarations for hoisting later
                    const scope =
                        isLetOrConst || functionDeclaration
                            ? this.peekScope()
                            : this.findScope(ScopeType.Function | ScopeType.File);

                    if (scope === undefined) {
                        throw TSTLErrors.UndefinedScope();
                    }

                    if (!scope.variableDeclarations) {
                        scope.variableDeclarations = [];
                    }
                    scope.variableDeclarations.push(declaration);
                }
            } else if (rhs) {
                // global
                assignment = tstl.createAssignmentStatement(lhs, rhs, tsOriginal, parent);
            } else {
                return [];
            }
        }

        if (!this.options.noHoisting && functionDeclaration) {
            // Remember function definitions for hoisting later
            const functionSymbolId = (lhs as tstl.Identifier).symbolId;
            const scope = this.peekScope();
            if (scope === undefined) {
                throw TSTLErrors.UndefinedScope();
            }
            if (functionSymbolId && scope.functionDefinitions) {
                const definitions = scope.functionDefinitions.get(functionSymbolId);
                if (definitions) {
                    definitions.definition = declaration || assignment;
                }
            }
        }

        if (declaration && assignment) {
            return [declaration, assignment];
        } else if (declaration) {
            return [declaration];
        } else if (assignment) {
            return [assignment];
        } else {
            return [];
        }
    }

    protected validateFunctionAssignment(node: ts.Node, fromType: ts.Type, toType: ts.Type, toName?: string): void {
        if (toType === fromType) {
            return;
        }

        if ((toType.flags & ts.TypeFlags.Any) !== 0) {
            // Assigning to un-typed variable
            return;
        }

        // Use cache to avoid repeating check for same types (protects against infinite loop in recursive types)
        let fromTypeCache = this.typeValidationCache.get(fromType);
        if (fromTypeCache) {
            if (fromTypeCache.has(toType)) {
                return;
            }
        } else {
            fromTypeCache = new Set();
            this.typeValidationCache.set(fromType, fromTypeCache);
        }
        fromTypeCache.add(toType);

        // Check function assignments
        const fromContext = tsHelper.getFunctionContextType(fromType, this.program);
        const toContext = tsHelper.getFunctionContextType(toType, this.program);

        if (fromContext === tsHelper.ContextType.Mixed || toContext === tsHelper.ContextType.Mixed) {
            throw TSTLErrors.UnsupportedOverloadAssignment(node, toName);
        } else if (
            fromContext !== toContext &&
            fromContext !== tsHelper.ContextType.None &&
            toContext !== tsHelper.ContextType.None
        ) {
            if (toContext === tsHelper.ContextType.Void) {
                throw TSTLErrors.UnsupportedNoSelfFunctionConversion(node, toName);
            } else {
                throw TSTLErrors.UnsupportedSelfFunctionConversion(node, toName);
            }
        }

        const fromTypeNode = this.checker.typeToTypeNode(fromType);
        const toTypeNode = this.checker.typeToTypeNode(toType);
        if (!fromTypeNode || !toTypeNode) {
            return;
        }

        if (
            (ts.isArrayTypeNode(toTypeNode) || ts.isTupleTypeNode(toTypeNode)) &&
            (ts.isArrayTypeNode(fromTypeNode) || ts.isTupleTypeNode(fromTypeNode))
        ) {
            // Recurse into arrays/tuples
            const fromTypeArguments = (fromType as ts.TypeReference).typeArguments;
            const toTypeArguments = (toType as ts.TypeReference).typeArguments;

            if (fromTypeArguments === undefined || toTypeArguments === undefined) {
                return;
            }

            const count = Math.min(fromTypeArguments.length, toTypeArguments.length);
            for (let i = 0; i < count; ++i) {
                this.validateFunctionAssignment(node, fromTypeArguments[i], toTypeArguments[i], toName);
            }
        }

        if (
            (toType.flags & ts.TypeFlags.Object) !== 0 &&
            ((toType as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0 &&
            toType.symbol &&
            toType.symbol.members &&
            fromType.symbol &&
            fromType.symbol.members
        ) {
            // Recurse into interfaces
            toType.symbol.members.forEach((toMember, memberName) => {
                if (fromType.symbol.members) {
                    const fromMember = fromType.symbol.members.get(memberName);
                    if (fromMember) {
                        const toMemberType = this.checker.getTypeOfSymbolAtLocation(toMember, node);
                        const fromMemberType = this.checker.getTypeOfSymbolAtLocation(fromMember, node);
                        this.validateFunctionAssignment(
                            node,
                            fromMemberType,
                            toMemberType,
                            toName ? `${toName}.${memberName}` : memberName.toString()
                        );
                    }
                }
            });
        }
    }

    protected validatePropertyAssignment(node: ts.Node): void {
        if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)) {
            const leftType = this.checker.getTypeAtLocation(node.left.expression);
            const decorators = tsHelper.getCustomDecorators(leftType, this.checker);
            if (decorators.has(DecoratorKind.LuaTable)) {
                switch (node.left.name.text) {
                    case "length":
                        throw TSTLErrors.ForbiddenLuaTableUseException(
                            `A LuaTable object's length cannot be re-assigned.`,
                            node
                        );
                }
            }
        }
    }

    protected wrapInFunctionCall(expression: tstl.Expression): tstl.FunctionExpression {
        const returnStatement = tstl.createReturnStatement([expression]);
        return tstl.createFunctionExpression(
            tstl.createBlock([returnStatement]),
            undefined,
            undefined,
            undefined,
            tstl.FunctionExpressionFlags.Inline
        );
    }

    protected wrapInTable(...expressions: tstl.Expression[]): tstl.ParenthesizedExpression {
        const fields = expressions.map(e => tstl.createTableFieldExpression(e));
        return tstl.createParenthesizedExpression(tstl.createTableExpression(fields));
    }

    protected wrapInToStringForConcat(expression: tstl.Expression): tstl.Expression {
        if (
            tstl.isStringLiteral(expression) ||
            tstl.isNumericLiteral(expression) ||
            (tstl.isBinaryExpression(expression) && expression.operator === tstl.SyntaxKind.ConcatOperator)
        ) {
            return expression;
        }
        return tstl.createCallExpression(tstl.createIdentifier("tostring"), [expression]);
    }

    protected expressionPlusOne(expression: tstl.Expression): tstl.Expression {
        if (tstl.isNumericLiteral(expression)) {
            const newNode = tstl.cloneNode(expression);
            newNode.value += 1;
            return newNode;
        }

        if (tstl.isBinaryExpression(expression)) {
            if (
                expression.operator === tstl.SyntaxKind.SubtractionOperator &&
                tstl.isNumericLiteral(expression.right) &&
                expression.right.value === 1
            ) {
                return expression.left;
            }

            expression = tstl.createParenthesizedExpression(expression);
        }

        return tstl.createBinaryExpression(expression, tstl.createNumericLiteral(1), tstl.SyntaxKind.AdditionOperator);
    }

    protected createShorthandIdentifier(
        valueSymbol: ts.Symbol | undefined,
        propertyIdentifier: ts.Identifier
    ): tstl.Expression {
        let name: string;
        if (valueSymbol !== undefined) {
            name = this.hasUnsafeSymbolName(valueSymbol, propertyIdentifier)
                ? this.createSafeName(valueSymbol.name)
                : valueSymbol.name;
        } else {
            const propertyName = propertyIdentifier.text;
            if (luaKeywords.has(propertyName) || !tsHelper.isValidLuaIdentifier(propertyName)) {
                // Catch ambient declarations of identifiers with bad names
                throw TSTLErrors.InvalidAmbientIdentifierName(propertyIdentifier);
            }
            name = this.hasUnsafeIdentifierName(propertyIdentifier) ? this.createSafeName(propertyName) : propertyName;
        }

        let identifier = this.transformIdentifierExpression(ts.createIdentifier(name));
        tstl.setNodeOriginal(identifier, propertyIdentifier);
        if (valueSymbol !== undefined && tstl.isIdentifier(identifier)) {
            identifier.symbolId = this.symbolIds.get(valueSymbol);

            const exportScope = this.getSymbolExportScope(valueSymbol);
            if (exportScope) {
                identifier = this.createExportedIdentifier(identifier, exportScope);
            }
        }
        return identifier;
    }

    protected isUnsafeName(name: string): boolean {
        return luaKeywords.has(name) || luaBuiltins.has(name) || !tsHelper.isValidLuaIdentifier(name);
    }

    protected hasUnsafeSymbolName(symbol: ts.Symbol, tsOriginal?: ts.Identifier): boolean {
        const isLuaKeyword = luaKeywords.has(symbol.name);
        const isInvalidIdentifier = !tsHelper.isValidLuaIdentifier(symbol.name);
        // TODO rework once microsoft/TypeScript#24706 is fixed and remove check for symbol.declarations
        const isAmbient = symbol.declarations && symbol.declarations.some(d => tsHelper.isAmbientNode(d));
        if ((isLuaKeyword || isInvalidIdentifier) && isAmbient) {
            // Catch ambient declarations of identifiers with bad names
            throw TSTLErrors.InvalidAmbientIdentifierName(tsOriginal || ts.createIdentifier(symbol.name));
        }

        if (this.isUnsafeName(symbol.name)) {
            // only unsafe when non-ambient and not exported
            return !isAmbient && !this.isSymbolExported(symbol);
        }
        return false;
    }

    protected hasUnsafeIdentifierName(identifier: ts.Identifier): boolean {
        const symbol = this.checker.getSymbolAtLocation(identifier);
        if (symbol !== undefined) {
            return this.hasUnsafeSymbolName(symbol, identifier);
        } else if (luaKeywords.has(identifier.text) || !tsHelper.isValidLuaIdentifier(identifier.text)) {
            throw TSTLErrors.InvalidAmbientIdentifierName(identifier);
        }
        return false;
    }

    protected createSafeName(name: string): string {
        return "____" + tsHelper.fixInvalidLuaIdentifier(name);
    }

    protected trackSymbolReference(symbol: ts.Symbol, identifier: ts.Identifier): tstl.SymbolId | undefined {
        // Track first time symbols are seen
        let symbolId = this.symbolIds.get(symbol);
        if (!symbolId) {
            symbolId = this.genSymbolIdCounter++;

            const symbolInfo: SymbolInfo = { symbol, firstSeenAtPos: identifier.pos };
            this.symbolIds.set(symbol, symbolId);
            this.symbolInfo.set(symbolId, symbolInfo);
        }

        if (this.options.noHoisting) {
            // Check for reference-before-declaration
            const declaration = tsHelper.getFirstDeclaration(symbol, this.currentSourceFile);
            if (declaration && identifier.pos < declaration.pos) {
                throw TSTLErrors.ReferencedBeforeDeclaration(identifier);
            }
        }

        //Mark symbol as seen in all current scopes
        for (const scope of this.scopeStack) {
            if (!scope.referencedSymbols) {
                scope.referencedSymbols = new Map();
            }
            let references = scope.referencedSymbols.get(symbolId);
            if (!references) {
                references = [];
                scope.referencedSymbols.set(symbolId, references);
            }
            references.push(identifier);
        }

        return symbolId;
    }

    protected getIdentifierSymbolId(identifier: ts.Identifier): tstl.SymbolId | undefined {
        const symbol = this.checker.getSymbolAtLocation(identifier);
        if (symbol) {
            return this.trackSymbolReference(symbol, identifier);
        } else {
            return undefined;
        }
    }

    protected findScope(scopeTypes: ScopeType): Scope | undefined {
        return this.scopeStack
            .slice()
            .reverse()
            .find(s => (scopeTypes & s.type) !== 0);
    }

    protected peekScope(): Scope | undefined {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    protected pushScope(scopeType: ScopeType): void {
        this.scopeStack.push({
            type: scopeType,
            id: this.genVarCounter,
        });
        this.genVarCounter++;
    }

    protected shouldHoist(symbolId: tstl.SymbolId, scope: Scope): boolean {
        const symbolInfo = this.symbolInfo.get(symbolId);
        if (!symbolInfo) {
            return false;
        }

        const declaration = tsHelper.getFirstDeclaration(symbolInfo.symbol, this.currentSourceFile);
        if (!declaration) {
            return false;
        }

        if (symbolInfo.firstSeenAtPos < declaration.pos) {
            return true;
        }

        if (scope.functionDefinitions) {
            for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
                if (functionDefinition.definition === undefined) {
                    throw TSTLErrors.UndefinedFunctionDefinition(functionSymbolId);
                }

                const { line, column } = tstl.getOriginalPos(functionDefinition.definition);
                if (line !== undefined && column !== undefined) {
                    const definitionPos = ts.getPositionOfLineAndCharacter(this.currentSourceFile, line, column);
                    if (
                        functionSymbolId !== symbolId && // Don't recurse into self
                        declaration.pos < definitionPos && // Ignore functions before symbol declaration
                        functionDefinition.referencedSymbols.has(symbolId) &&
                        this.shouldHoist(functionSymbolId, scope)
                    ) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    protected replaceStatementInParent(oldNode: tstl.Statement, newNode?: tstl.Statement): void {
        if (!oldNode.parent) {
            throw new Error("node has not yet been assigned a parent");
        }

        if (tstl.isBlock(oldNode.parent) || tstl.isDoStatement(oldNode.parent)) {
            if (newNode) {
                oldNode.parent.statements.splice(oldNode.parent.statements.indexOf(oldNode), 1, newNode);
            } else {
                oldNode.parent.statements.splice(oldNode.parent.statements.indexOf(oldNode), 1);
            }
        } else {
            throw new Error("unexpected parent type");
        }
    }

    protected hoistImportStatements(scope: Scope, statements: tstl.Statement[]): tstl.Statement[] {
        if (!scope.importStatements) {
            return statements;
        }

        return [...scope.importStatements, ...statements];
    }

    protected hoistFunctionDefinitions(scope: Scope, statements: tstl.Statement[]): tstl.Statement[] {
        if (!scope.functionDefinitions) {
            return statements;
        }

        const result = statements.slice();
        const hoistedFunctions: Array<tstl.VariableDeclarationStatement | tstl.AssignmentStatement> = [];
        for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
            if (functionDefinition.definition === undefined) {
                throw TSTLErrors.UndefinedFunctionDefinition(functionSymbolId);
            }

            if (this.shouldHoist(functionSymbolId, scope)) {
                const i = result.indexOf(functionDefinition.definition);
                result.splice(i, 1);
                hoistedFunctions.push(functionDefinition.definition);
            }
        }
        if (hoistedFunctions.length > 0) {
            result.unshift(...hoistedFunctions);
        }
        return result;
    }

    protected hoistVariableDeclarations(scope: Scope, statements: tstl.Statement[]): tstl.Statement[] {
        if (!scope.variableDeclarations) {
            return statements;
        }

        const result = statements.slice();
        const hoistedLocals: tstl.Identifier[] = [];
        for (const declaration of scope.variableDeclarations) {
            const symbols = this.filterUndefined(declaration.left.map(i => i.symbolId));
            if (symbols.some(s => this.shouldHoist(s, scope))) {
                let assignment: tstl.AssignmentStatement | undefined;
                if (declaration.right) {
                    assignment = tstl.createAssignmentStatement(declaration.left, declaration.right);
                    tstl.setNodePosition(assignment, declaration); // Preserve position info for sourcemap
                }
                const i = result.indexOf(declaration);
                if (i >= 0) {
                    if (assignment) {
                        result.splice(i, 1, assignment);
                    } else {
                        result.splice(i, 1);
                    }
                } else {
                    // Special case for 'var's declared in child scopes
                    this.replaceStatementInParent(declaration, assignment);
                }
                hoistedLocals.push(...declaration.left);
            }
        }
        if (hoistedLocals.length > 0) {
            result.unshift(tstl.createVariableDeclarationStatement(hoistedLocals));
        }
        return result;
    }

    protected performHoisting(statements: tstl.Statement[]): tstl.Statement[] {
        if (this.options.noHoisting) {
            return statements;
        }

        const scope = this.peekScope();
        if (scope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }

        let result = this.hoistFunctionDefinitions(scope, statements);

        result = this.hoistVariableDeclarations(scope, result);

        result = this.hoistImportStatements(scope, result);

        return result;
    }

    protected popScope(): Scope {
        const scope = this.scopeStack.pop();

        if (scope === undefined) {
            throw TSTLErrors.UndefinedScope();
        }

        return scope;
    }

    protected createHoistableVariableDeclarationStatement(
        identifier: tstl.Identifier,
        initializer?: tstl.Expression,
        tsOriginal?: ts.Node,
        parent?: tstl.Node
    ): tstl.AssignmentStatement | tstl.VariableDeclarationStatement {
        const declaration = tstl.createVariableDeclarationStatement(identifier, initializer, tsOriginal, parent);
        if (!this.options.noHoisting && identifier.symbolId) {
            const scope = this.peekScope();
            if (scope === undefined) {
                throw TSTLErrors.UndefinedScope();
            }
            if (!scope.variableDeclarations) {
                scope.variableDeclarations = [];
            }
            scope.variableDeclarations.push(declaration);
        }
        return declaration;
    }

    protected statementVisitResultToArray(visitResult: StatementVisitResult): tstl.Statement[] {
        if (!Array.isArray(visitResult)) {
            if (visitResult) {
                return [visitResult];
            }
            return [];
        }

        return this.filterUndefined(visitResult);
    }

    public castElements<TOriginal, TCast extends TOriginal>(
        items: TOriginal[],
        cast: (item: TOriginal) => item is TCast
    ): TCast[] {
        if (items.every(cast)) {
            return items as TCast[];
        } else {
            throw TSTLErrors.CouldNotCast(cast.name);
        }
    }

    protected filterUndefined<T>(items: Array<T | undefined>): T[] {
        return items.filter(i => i !== undefined) as T[];
    }

    protected filterUndefinedAndCast<TOriginal, TCast extends TOriginal>(
        items: Array<TOriginal | undefined>,
        cast: (item: TOriginal) => item is TCast
    ): TCast[] {
        return this.castElements(this.filterUndefined(items), cast);
    }

    protected createConstructorDecorationStatement(
        declaration: ts.ClassLikeDeclaration
    ): tstl.AssignmentStatement | undefined {
        const className =
            declaration.name !== undefined
                ? this.addExportToIdentifier(this.transformIdentifier(declaration.name))
                : tstl.createAnonymousIdentifier();

        const decorators = declaration.decorators;
        if (!decorators) {
            return undefined;
        }

        const decoratorExpressions = decorators.map(decorator => {
            const expression = decorator.expression;
            const type = this.checker.getTypeAtLocation(expression);
            const context = tsHelper.getFunctionContextType(type, this.program);
            if (context === tsHelper.ContextType.Void) {
                throw TSTLErrors.InvalidDecoratorContext(decorator);
            }
            return this.transformExpression(expression);
        });

        const decoratorArguments: tstl.Expression[] = [];

        const decoratorTable = tstl.createTableExpression(
            decoratorExpressions.map(expression => tstl.createTableFieldExpression(expression))
        );

        decoratorArguments.push(decoratorTable);
        decoratorArguments.push(className);

        return tstl.createAssignmentStatement(
            className,
            this.transformLuaLibFunction(LuaLibFeature.Decorate, undefined, ...decoratorArguments)
        );
    }
}
