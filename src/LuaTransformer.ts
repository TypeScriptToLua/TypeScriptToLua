import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions, LuaLibImportKind, LuaTarget} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import * as tstl from "./LuaAST";
import {LuaLib, LuaLibFeature} from "./LuaLib";
import {ContextType, TSHelper as tsHelper} from "./TSHelper";
import {TSTLErrors} from "./TSTLErrors";

export type StatementVisitResult = tstl.Statement | tstl.Statement[] | undefined;
export type ExpressionVisitResult = tstl.Expression | undefined;
export enum ScopeType {
    File = 0x1,
    Function = 0x2,
    Switch = 0x4,
    Loop = 0x8,
    Conditional = 0x10,
    Block = 0x20,
}

interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}

interface FunctionDefinitionInfo {
    referencedSymbols: Set<tstl.SymbolId>;
    assignment?: tstl.AssignmentStatement;
}

interface Scope {
    type: ScopeType;
    id: number;
    referencedSymbols?: Set<tstl.SymbolId>;
    variableDeclarations?: tstl.VariableDeclarationStatement[];
    functionDefinitions?: Map<tstl.SymbolId, FunctionDefinitionInfo>;
}

export class LuaTransformer {
    public luaKeywords: Set<string> = new Set([
        "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in", "local", "new", "nil",
        "not", "or", "repeat", "return", "self", "then", "until", "while",
    ]);

    private isStrict = true;

    private checker: ts.TypeChecker;
    protected options: CompilerOptions;
    private isModule: boolean;

    private currentSourceFile?: ts.SourceFile;

    private currentNamespace: ts.ModuleDeclaration;
    private classStack: ts.ClassLikeDeclaration[];

    private scopeStack: Scope[];
    private genVarCounter: number;

    private luaLibFeatureSet: Set<LuaLibFeature>;

    private symbolInfo: Map<tstl.SymbolId, SymbolInfo>;
    private symbolIds: Map<ts.Symbol, tstl.SymbolId>;
    private genSymbolIdCounter: number;

    private readonly typeValidationCache: Map<ts.Type, Set<ts.Type>> = new Map<ts.Type, Set<ts.Type>>();

    public constructor(program: ts.Program, options: CompilerOptions) {
        this.checker = program.getTypeChecker();
        this.options = options;
        this.isStrict = this.options.alwaysStrict || (this.options.strict && this.options.alwaysStrict !== false) ||
                        (this.isModule && this.options.target && this.options.target >= ts.ScriptTarget.ES2015);

        if (!this.options.luaTarget) {
            this.options.luaTarget = LuaTarget.LuaJIT;
        }

        this.setupState();
    }

    public setupState(): void {
        this.genVarCounter = 0;
        this.currentSourceFile = undefined;
        this.isModule = false;
        this.scopeStack = [];
        this.classStack = [];
        this.luaLibFeatureSet = new Set<LuaLibFeature>();
        this.symbolIds = new Map();
        this.symbolInfo = new Map();
        this.genSymbolIdCounter = 1;
    }

    // TODO make all other methods private???
    public transformSourceFile(node: ts.SourceFile): [tstl.Block, Set<LuaLibFeature>] {
        this.setupState();

        this.currentSourceFile = node;

        let statements: tstl.Statement[] = [];
        if (node.flags & ts.NodeFlags.JsonFile) {
            this.isModule = false;

            const statement = node.statements[0];
            if (!statement || !ts.isExpressionStatement(statement)) {
                throw TSTLErrors.InvalidJsonFileContent(node);
            }

            statements.push(tstl.createReturnStatement([this.transformExpression(statement.expression)]));
        } else {
            this.pushScope(ScopeType.File, node);

            this.isModule = tsHelper.isFileModule(node);
            statements = this.performHoisting(this.transformStatements(node.statements));

            this.popScope();

            if (this.isModule) {
                statements.unshift(
                    tstl.createVariableDeclarationStatement(
                        tstl.createIdentifier("exports"),
                        tstl.createBinaryExpression(
                            tstl.createIdentifier("exports"),
                            tstl.createTableExpression(),
                            tstl.SyntaxKind.OrOperator
                        )));
                statements.push(
                    tstl.createReturnStatement(
                        [tstl.createIdentifier("exports")]
                    ));
            }
        }

        return [tstl.createBlock(statements, node), this.luaLibFeatureSet];
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
            case ts.SyntaxKind.ExportDeclaration:
                return this.transformExportDeclaration(node as ts.ExportDeclaration);
            case ts.SyntaxKind.ImportDeclaration:
                return this.transformImportDeclaration(node as ts.ImportDeclaration);
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
                return this.transformReturn(node as ts.ReturnStatement);
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
    public transformStatements(statements: ts.Statement[] | ReadonlyArray<ts.Statement>): tstl.Statement[] {
        const tstlStatements: tstl.Statement[] = [];
        (statements as ts.Statement[]).forEach(statement => {
            tstlStatements.push(...this.statementVisitResultToStatementArray(this.transformStatement(statement)));
        });
        return tstlStatements;
    }

    public transformBlock(block: ts.Block): tstl.Block {
        this.pushScope(ScopeType.Block, block);
        const statements = this.performHoisting(this.transformStatements(block.statements));
        this.popScope();
        return tstl.createBlock(statements, block);
    }

    public transformBlockAsDoStatement(block: ts.Block): tstl.DoStatement {
        this.pushScope(ScopeType.Block, block);
        const statements = this.performHoisting(this.transformStatements(block.statements));
        this.popScope();
        return tstl.createDoStatement(statements, block);
    }

    public transformExportDeclaration(statement: ts.ExportDeclaration): StatementVisitResult {
        if (statement.moduleSpecifier === undefined) {
            const result = [];
            for (const exportElement of statement.exportClause.elements) {
                result.push(
                    tstl.createAssignmentStatement(
                        this.createExportedIdentifier(this.transformIdentifier(exportElement.name)),
                        this.transformIdentifier(exportElement.propertyName || exportElement.name)
                    )
                );
            }
            return result;
        }

        if (statement.exportClause) {
            if (statement.exportClause.elements.some(e =>
                (e.name && e.name.originalKeywordKind === ts.SyntaxKind.DefaultKeyword)
                || (e.propertyName && e.propertyName.originalKeywordKind === ts.SyntaxKind.DefaultKeyword))
            ) {
                throw TSTLErrors.UnsupportedDefaultExport(statement);
            }

            // First transpile as import clause
            const importClause = ts.createImportClause(
                undefined,
                ts.createNamedImports(statement.exportClause.elements
                    .map(e => ts.createImportSpecifier(e.propertyName, e.name))
                )
            );

            const importDeclaration = ts.createImportDeclaration(
                statement.decorators,
                statement.modifiers,
                importClause,
                statement.moduleSpecifier
            );

            const importResult = this.transformImportDeclaration(importDeclaration);

            const result = Array.isArray(importResult) ? importResult : [importResult];

            // Now the module is imported, add the imports to the export table
            for (const exportVariable of statement.exportClause.elements) {
                result.push(
                    tstl.createAssignmentStatement(
                        this.createExportedIdentifier(this.transformIdentifier(exportVariable.name)),
                        this.transformIdentifier(exportVariable.name)
                    )
                );
            }

            // Wrap this in a DoStatement to prevent polluting the scope.
            return tstl.createDoStatement(result, statement);
        } else {
            const moduleRequire = this.createModuleRequire(statement.moduleSpecifier as ts.StringLiteral);
            const tempModuleIdentifier = tstl.createIdentifier("__TSTL_export");

            const declaration = tstl.createVariableDeclarationStatement(tempModuleIdentifier, moduleRequire);

            const forKey = tstl.createIdentifier("____exportKey");
            const forValue = tstl.createIdentifier("____exportValue");

            const body = tstl.createBlock(
                [tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("exports"),
                        forKey
                    ),
                    forValue
                )]
            );

            const pairsIdentifier = tstl.createIdentifier("pairs");
            const forIn = tstl.createForInStatement(
                body,
                [tstl.cloneIdentifier(forKey), tstl.cloneIdentifier(forValue)],
                [tstl.createCallExpression(pairsIdentifier, [tstl.cloneIdentifier(tempModuleIdentifier)])]
            );

            // Wrap this in a DoStatement to prevent polluting the scope.
            return tstl.createDoStatement([declaration, forIn], statement);
        }
    }

    public transformImportDeclaration(statement: ts.ImportDeclaration): StatementVisitResult {
        if (statement.importClause && !statement.importClause.namedBindings) {
            throw TSTLErrors.DefaultImportsNotSupported(statement);
        }

        const result: tstl.Statement[] = [];

        const moduleSpecifier = statement.moduleSpecifier as ts.StringLiteral;
        const importPath = moduleSpecifier.text.replace(new RegExp("\"", "g"), "");

        const requireCall = this.createModuleRequire(statement.moduleSpecifier as ts.StringLiteral);

        if (!statement.importClause) {
            result.push(tstl.createExpressionStatement(requireCall));
            return result;
        }

        const imports = statement.importClause.namedBindings;
        if (ts.isNamedImports(imports)) {
            const filteredElements = imports.elements.filter(e => {
                const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(e), this.checker);
                return !decorators.has(DecoratorKind.Extension) && !decorators.has(DecoratorKind.MetaExtension);
            });

            // Elide import if all imported types are extension classes
            if (filteredElements.length === 0) {
                return undefined;
            }

            const tstlIdentifier = (name: string) => "__TSTL_" + name.replace(new RegExp("-|\\$| |#|'", "g"), "_");
            const importUniqueName = tstl.createIdentifier(tstlIdentifier(path.basename((importPath))));
            const requireStatement = tstl.createVariableDeclarationStatement(
                tstl.createIdentifier(tstlIdentifier(path.basename((importPath)))),
                requireCall,
                statement
            );
            result.push(requireStatement);

            filteredElements.forEach(importSpecifier => {
                if (importSpecifier.propertyName) {
                    const propertyIdentifier = this.transformIdentifier(importSpecifier.propertyName);
                    const propertyName = tstl.createStringLiteral(propertyIdentifier.text);
                    const renamedImport = this.createHoistableVariableDeclarationStatement(
                        importSpecifier.name,
                        tstl.createTableIndexExpression(importUniqueName, propertyName),
                        importSpecifier);
                    result.push(renamedImport);
                } else {
                    const name = tstl.createStringLiteral(importSpecifier.name.text);
                    const namedImport = this.createHoistableVariableDeclarationStatement(
                        importSpecifier.name,
                        tstl.createTableIndexExpression(importUniqueName, name),
                        importSpecifier
                    );
                    result.push(namedImport);
                }
            });
            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const requireStatement = this.createHoistableVariableDeclarationStatement(
                imports.name,
                requireCall,
                statement
            );
            result.push(requireStatement);
            return result;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }

    private createModuleRequire(moduleSpecifier: ts.StringLiteral): tstl.CallExpression {
        const importPath = moduleSpecifier.text.replace(new RegExp("\"", "g"), "");
        const resolvedModuleSpecifier = tstl.createStringLiteral(this.getImportPath(importPath));

        return tstl.createCallExpression(tstl.createIdentifier("require"), [resolvedModuleSpecifier]);
    }

    public transformClassDeclaration(
        statement: ts.ClassLikeDeclaration,
        nameOverride?: tstl.Identifier
    ): tstl.Statement[]
    {
        this.classStack.push(statement);

        let className = statement.name ? this.transformIdentifier(statement.name) : nameOverride;
        if (!className) {
            throw TSTLErrors.MissingClassName(statement);
        }

        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(statement), this.checker);

        // Find out if this class is extension of existing class
        const isExtension = decorators.has(DecoratorKind.Extension);

        const isMetaExtension = decorators.has(DecoratorKind.MetaExtension);

        if (isExtension && isMetaExtension) {
            throw TSTLErrors.InvalidExtensionMetaExtension(statement);
        }

        if ((isExtension || isMetaExtension) && this.isIdentifierExported(className)) {
            // Cannot export extension classes
            throw TSTLErrors.InvalidExportsExtension(statement);
        }

        // Get type that is extended
        const extendsType = tsHelper.getExtendedType(statement, this.checker);

        if (!(isExtension || isMetaExtension) && extendsType) {
            // Non-extensions cannot extend extension classes
            const extendsDecorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            if (extendsDecorators.has(DecoratorKind.Extension) || extendsDecorators.has(DecoratorKind.MetaExtension)) {
                throw TSTLErrors.InvalidExtendsExtension(statement);
            }
        }

        // Get all properties with value
        const properties = statement.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

        // Divide properties into static and non-static
        const staticFields = properties.filter(tsHelper.isStatic);
        const instanceFields = properties.filter(prop => !tsHelper.isStatic(prop));

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
                    extendsName),
                statement);

            result.push(assignDebugCallIndex);
        }

        if (isExtension) {
            const extensionNameArg = decorators.get(DecoratorKind.Extension).args[0];
            if (extensionNameArg) {
                className = tstl.createIdentifier(extensionNameArg);
            } else if (extendsType) {
                className = tstl.createIdentifier(extendsType.symbol.escapedName as string);
            }
        }

        if (!isExtension && !isMetaExtension) {
            const classCreationMethods = this.createClassCreationMethods(
                statement,
                className,
                extendsType
            );
            result.push(...classCreationMethods);
        } else {
            for (const f of instanceFields) {
                const fieldName = this.transformPropertyName(f.name);

                const value = this.transformExpression(f.initializer);

                // className["fieldName"]
                const classField = tstl.createTableIndexExpression(
                    tstl.cloneIdentifier(className),
                    fieldName);

                // className["fieldName"] = value;
                const assignClassField = tstl.createAssignmentStatement(classField, value);

                result.push(assignClassField);
            }
        }

        // Add static declarations
        for (const field of staticFields) {
            const fieldName = this.transformPropertyName(field.name);
            const value = this.transformExpression(field.initializer);

            const classField = tstl.createTableIndexExpression(
                    this.addExportToIdentifier(tstl.cloneIdentifier(className)),
                    fieldName
                );

            const fieldAssign = tstl.createAssignmentStatement(
                classField,
                value
            );

            result.push(fieldAssign);
        }

        // Find first constructor with body
        if (!isExtension && !isMetaExtension) {
            const constructor = statement.members
                .filter(n => ts.isConstructorDeclaration(n) && n.body)[0] as ts.ConstructorDeclaration;
            if (constructor) {
                // Add constructor plus initialization of instance fields
                result.push(this.transformConstructor(constructor, className, instanceFields, statement));
            } else if (!extendsType) {
                // Generate a constructor if none was defined in a base class
                result.push(this.transformConstructor(
                    ts.createConstructor([], [], [], ts.createBlock([], true)),
                    className,
                    instanceFields,
                    statement
                ));
            } else if (instanceFields.length > 0
                || statement.members.some(m => tsHelper.isGetAccessorOverride(m, statement, this.checker)))
            {
                // Generate a constructor if none was defined in a class with instance fields that need initialization
                // className.prototype.____constructor = function(self, ...)
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
                    tstl.createDotsLiteral()
                );
                result.push(tstl.createAssignmentStatement(
                    this.createConstructorName(className),
                    constructorFunction,
                    statement
                ));
            }
        }

        // Transform get accessors
        statement.members.filter(ts.isGetAccessor).forEach(getAccessor => {
            result.push(this.transformGetAccessorDeclaration(getAccessor, className, statement));
        });

        // Transform set accessors
        statement.members.filter(ts.isSetAccessor).forEach(setAccessor => {
            result.push(this.transformSetAccessorDeclaration(setAccessor, className, statement));
        });

        // Transform methods
        statement.members.filter(ts.isMethodDeclaration).forEach(method => {
            result.push(this.transformMethodDeclaration(method, className, isExtension || isMetaExtension));
        });

        this.classStack.pop();

        return result;
    }

    public createClassCreationMethods(
        statement: ts.ClassLikeDeclarationBase,
        className: tstl.Identifier,
        extendsType: ts.Type
    ): tstl.Statement[]
    {
        let noClassOr = false;
        if (extendsType) {
            const decorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            noClassOr = decorators.has(DecoratorKind.NoClassOr);
        }

        const result: tstl.Statement[] = [];

        // className = className or {}
        let classTable: tstl.Expression = tstl.createTableExpression();
        if (!noClassOr) {
            classTable = tstl.createBinaryExpression(
                this.addExportToIdentifier(className), // Use original identifier node in declaration
                classTable,
                tstl.SyntaxKind.OrOperator
            );
        }

        const classVar = this.createLocalOrExportedOrGlobalDeclaration(className, classTable, statement);
        result.push(...classVar);

        const createClassNameWithExport = () => this.addExportToIdentifier(tstl.cloneIdentifier(className));

        // className.____getters = {}
        if (statement.members.some(m => ts.isGetAccessor(m) && tsHelper.isStatic(m))) {
            const classGetters = tstl.createTableIndexExpression(
                createClassNameWithExport(),
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

        // className.__index = className
        const classIndex = tstl.createTableIndexExpression(
            createClassNameWithExport(),
            tstl.createStringLiteral("__index")
        );
        const assignClassIndex = tstl.createAssignmentStatement(classIndex, createClassNameWithExport(), statement);
        result.push(assignClassIndex);

        // className.____setters = {}
        if (statement.members.some(m => ts.isSetAccessor(m) && tsHelper.isStatic(m))) {
            const classSetters = tstl.createTableIndexExpression(
                createClassNameWithExport(),
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

        // className.prototype = className.prototype or {}
        const createClassPrototype = () => tstl.createTableIndexExpression(
            createClassNameWithExport(),
            tstl.createStringLiteral("prototype")
        );
        const classPrototypeTable = noClassOr
            ? tstl.createTableExpression()
            : tstl.createBinaryExpression(
                createClassPrototype(),
                tstl.createTableExpression(),
                tstl.SyntaxKind.OrOperator
            );
        const assignClassPrototype = tstl.createAssignmentStatement(createClassPrototype(), classPrototypeTable);
        result.push(assignClassPrototype);

        // className.prototype.____getters = {}
        if (statement.members.some(m => ts.isGetAccessor(m) && !tsHelper.isStatic(m))) {
            const classPrototypeGetters = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("____getters")
            );
            const assignClassPrototypeGetters = tstl.createAssignmentStatement(
                classPrototypeGetters,
                tstl.createTableExpression()
            );
            result.push(assignClassPrototypeGetters);
        }

        const classPrototypeIndex = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("__index")
        );
        if (tsHelper.hasGetAccessorInClassOrAncestor(statement, false, this.checker)) {
            // className.prototype.__index = __TS_Index(className.prototype)
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeIndex,
                this.transformLuaLibFunction(LuaLibFeature.Index, undefined, createClassPrototype())
            );
            result.push(assignClassPrototypeIndex);

        } else {
            // className.prototype.__index = className.prototype
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeIndex,
                createClassPrototype()
            );
            result.push(assignClassPrototypeIndex);
        }

        if (statement.members.some(m => ts.isSetAccessor(m) && !tsHelper.isStatic(m))) {
            // className.prototype.____setters = {}
            const classPrototypeSetters = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("____setters")
            );
            const assignClassPrototypeSetters = tstl.createAssignmentStatement(
                classPrototypeSetters,
                tstl.createTableExpression()
            );
            result.push(assignClassPrototypeSetters);
        }

        if (tsHelper.hasSetAccessorInClassOrAncestor(statement, false, this.checker)) {
            // className.prototype.__newindex = __TS_NewIndex(className.prototype)
            const classPrototypeNewIndex = tstl.createTableIndexExpression(
                createClassPrototype(),
                tstl.createStringLiteral("__newindex")
            );
            const assignClassPrototypeIndex = tstl.createAssignmentStatement(
                classPrototypeNewIndex,
                this.transformLuaLibFunction(LuaLibFeature.NewIndex, undefined, createClassPrototype())
            );
            result.push(assignClassPrototypeIndex);
        }

        // className.prototype.constructor = className
        const classPrototypeConstructor = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("constructor")
        );
        const assignClassPrototypeConstructor = tstl.createAssignmentStatement(
            classPrototypeConstructor,
            createClassNameWithExport(),
            statement
        );
        result.push(assignClassPrototypeConstructor);

        const hasStaticGetters = tsHelper.hasGetAccessorInClassOrAncestor(statement, true, this.checker);
        const hasStaticSetters = tsHelper.hasSetAccessorInClassOrAncestor(statement, true, this.checker);

        if (extendsType) {
            const extendedTypeNode = tsHelper.getExtendedTypeNode(statement, this.checker);
            const baseName = this.transformExpression(extendedTypeNode.expression);

            // className.____super = baseName
            const createClassBase = () => tstl.createTableIndexExpression(
                createClassNameWithExport(),
                tstl.createStringLiteral("____super")
            );
            const assignClassBase = tstl.createAssignmentStatement(createClassBase(), baseName, statement);
            result.push(assignClassBase);

            if (hasStaticGetters || hasStaticSetters) {
                const metatableFields: tstl.TableFieldExpression[] = [];
                if (hasStaticGetters) {
                    // __index = __TS__ClassIndex
                    metatableFields.push(
                        tstl.createTableFieldExpression(
                            tstl.createIdentifier("__TS__ClassIndex"),
                            tstl.createStringLiteral("__index")
                        )
                    );
                } else {
                    // __index = className.____super
                    metatableFields.push(
                        tstl.createTableFieldExpression(createClassBase(), tstl.createStringLiteral("__index"))
                    );
                }

                if (hasStaticSetters) {
                    // __newindex = __TS__ClassNewIndex
                    metatableFields.push(
                        tstl.createTableFieldExpression(
                            tstl.createIdentifier("__TS__ClassNewIndex"),
                            tstl.createStringLiteral("__newindex")
                        )
                    );
                }

                const setClassMetatable = tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createIdentifier("setmetatable"),
                        [createClassNameWithExport(), tstl.createTableExpression(metatableFields)]
                    )
                );
                result.push(setClassMetatable);

            } else {
                // setmetatable(className, className.____super)
                const setClassMetatable = tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createIdentifier("setmetatable"),
                        [createClassNameWithExport(), createClassBase()]
                    )
                );
                result.push(setClassMetatable);
            }

            // setmetatable(className.prototype, className.____super.prototype)
            const basePrototype = tstl.createTableIndexExpression(
                createClassBase(),
                tstl.createStringLiteral("prototype")
            );
            const setClassPrototypeMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createIdentifier("setmetatable"),
                    [createClassPrototype(), basePrototype]
                )
            );
            result.push(setClassPrototypeMetatable);

        } else if (hasStaticGetters || hasStaticSetters) {
            const metatableFields: tstl.TableFieldExpression[] = [];
            if (hasStaticGetters) {
                // __index = __TS__ClassIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassIndex"),
                        tstl.createStringLiteral("__index")
                    )
                );
            }

            if (hasStaticSetters) {
                // __newindex = __TS__ClassNewIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassNewIndex"),
                        tstl.createStringLiteral("__newindex")
                    )
                );
            }

            const setClassMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createIdentifier("setmetatable"),
                    [createClassNameWithExport(), tstl.createTableExpression(metatableFields)]
                )
            );
            result.push(setClassMetatable);
        }

        const newFuncStatements: tstl.Statement[] = [];

        // local self = setmetatable({}, className.prototype)
        const assignSelf = tstl.createVariableDeclarationStatement(
            this.createSelfIdentifier(),
            tstl.createCallExpression(
                tstl.createIdentifier("setmetatable"),
                [tstl.createTableExpression(), createClassPrototype()]
            )
        );
        newFuncStatements.push(assignSelf);

        // self:____constructor(...)
        const callConstructor = tstl.createExpressionStatement(
            tstl.createMethodCallExpression(
                this.createSelfIdentifier(),
                tstl.createIdentifier("____constructor"),
                [tstl.createDotsLiteral()]
            )
        );
        newFuncStatements.push(callConstructor);

        // return self
        const returnSelf = tstl.createReturnStatement([this.createSelfIdentifier()]);
        newFuncStatements.push(returnSelf);

        // function className.new(construct, ...) ... end
        // or function export.className.new(construct, ...) ... end
        const newFunc = tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(
                createClassNameWithExport(),
                tstl.createStringLiteral("new")),
            tstl.createFunctionExpression(
                tstl.createBlock(newFuncStatements),
                undefined,
                tstl.createDotsLiteral(),
                undefined,
                statement
            )
        );
        result.push(newFunc);

        return result;
    }

    public transformClassInstanceFields(
        classDeclarataion: ts.ClassLikeDeclaration,
        instanceFields: ts.PropertyDeclaration[]
    ): tstl.Statement[]
    {
        const statements: tstl.Statement[] = [];

        for (const f of instanceFields) {
            // Get identifier
            const fieldName = this.transformPropertyName(f.name);

            const value = this.transformExpression(f.initializer);

            // self[fieldName]
            const selfIndex = tstl.createTableIndexExpression(this.createSelfIdentifier(), fieldName);

            // self[fieldName] = value
            const assignClassField = tstl.createAssignmentStatement(selfIndex, value);

            statements.push(assignClassField);
        }

        const getOverrides = classDeclarataion.members.filter(
            m => tsHelper.isGetAccessorOverride(m, classDeclarataion, this.checker)
        );
        for (const getter of getOverrides) {
            const resetGetter = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createIdentifier("rawset"),
                    [this.createSelfIdentifier(), this.transformPropertyName(getter.name), tstl.createNilLiteral()]
                )
            );
            statements.push(resetGetter);
        }

        return statements;
    }

    public createConstructorName(className: tstl.Identifier): tstl.TableIndexExpression {
        return tstl.createTableIndexExpression(
            tstl.createTableIndexExpression(
                this.addExportToIdentifier(tstl.cloneIdentifier(className)),
                tstl.createStringLiteral("prototype")
            ),
            tstl.createStringLiteral("____constructor")
        );
    }

    public transformConstructor(
        statement: ts.ConstructorDeclaration,
        className: tstl.Identifier,
        instanceFields: ts.PropertyDeclaration[],
        classDeclaration: ts.ClassLikeDeclaration
    ): tstl.AssignmentStatement
    {
        // Don't transform methods without body (overload declarations)
        if (!statement.body) {
            return undefined;
        }

        const bodyStatements: tstl.Statement[] = this.transformClassInstanceFields(classDeclaration, instanceFields);

        // Check for field declarations in constructor
        const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);

        // Add in instance field declarations
        for (const declaration of constructorFieldsDeclarations) {
            const declarationName = this.transformIdentifier(declaration.name as ts.Identifier);
            if (declaration.initializer) {
                // self.declarationName = declarationName or initializer
                const assignement = tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(
                        this.createSelfIdentifier(), tstl.createStringLiteral(declarationName.text)
                    ),
                    tstl.createBinaryExpression(
                        declarationName,
                        this.transformExpression(declaration.initializer), tstl.SyntaxKind.OrOperator
                    )
                );
                bodyStatements.push(assignement);
            } else {
                // self.declarationName = declarationName
                const assignement = tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(
                        this.createSelfIdentifier(),
                        tstl.createStringLiteral(declarationName.text)
                    ),
                    declarationName
                );
                bodyStatements.push(assignement);
            }
        }

        // function className.constructor(self, params) ... end

        const [params, dotsLiteral, restParamName] = this.transformParameters(
            statement.parameters,
            this.createSelfIdentifier()
        );

        const [body] = this.transformFunctionBody(statement.parameters, statement.body, restParamName);
        bodyStatements.push(...body);

        const block: tstl.Block = tstl.createBlock(bodyStatements);

        const result = tstl.createAssignmentStatement(
            this.createConstructorName(className),
            tstl.createFunctionExpression(block, params, dotsLiteral, restParamName, undefined, undefined),
            statement
        );

        return result;
    }

    public transformGetAccessorDeclaration(
        getAccessor: ts.GetAccessorDeclaration,
        className: tstl.Identifier,
        classDeclaration: ts.ClassLikeDeclaration
    ): tstl.AssignmentStatement
    {
        const name = this.transformIdentifier(getAccessor.name as ts.Identifier);

        const [body] = this.transformFunctionBody(getAccessor.parameters, getAccessor.body);
        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(body),
            [this.createSelfIdentifier()]
        );

        const classNameWithExport = this.addExportToIdentifier(tstl.cloneIdentifier(className));
        const methodTable = tsHelper.isStatic(getAccessor)
            ? classNameWithExport
            : tstl.createTableIndexExpression(classNameWithExport, tstl.createStringLiteral("prototype"));

        const classGetters = tstl.createTableIndexExpression(
            methodTable,
            tstl.createStringLiteral("____getters")
        );
        const getter = tstl.createTableIndexExpression(
            classGetters,
            tstl.createStringLiteral(name.text)
        );
        const assignGetter = tstl.createAssignmentStatement(getter, accessorFunction);
        return assignGetter;
    }

    public transformSetAccessorDeclaration(
        setAccessor: ts.SetAccessorDeclaration,
        className: tstl.Identifier,
        classDeclaration: ts.ClassLikeDeclaration
    ): tstl.AssignmentStatement
    {
        const name = this.transformIdentifier(setAccessor.name as ts.Identifier);

        const [params, dot, restParam] = this.transformParameters(setAccessor.parameters, this.createSelfIdentifier());

        const [body] = this.transformFunctionBody(setAccessor.parameters, setAccessor.body, restParam);
        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(body),
            params,
            dot,
            restParam
        );

        const classNameWithExport = this.addExportToIdentifier(tstl.cloneIdentifier(className));
        const methodTable = tsHelper.isStatic(setAccessor)
            ? classNameWithExport
            : tstl.createTableIndexExpression(classNameWithExport, tstl.createStringLiteral("prototype"));

        const classSetters = tstl.createTableIndexExpression(
            methodTable,
            tstl.createStringLiteral("____setters")
        );
        const setter = tstl.createTableIndexExpression(
            classSetters,
            tstl.createStringLiteral(name.text)
        );
        const assignSetter = tstl.createAssignmentStatement(setter, accessorFunction);
        return assignSetter;
    }

    public transformMethodDeclaration(
        node: ts.MethodDeclaration,
        className: tstl.Identifier,
        noPrototype: boolean
    ): tstl.AssignmentStatement
    {
        // Don't transform methods without body (overload declarations)
        if (!node.body) {
            return undefined;
        }

        let methodName = this.transformPropertyName(node.name);
        if (tstl.isStringLiteral(methodName) && methodName.value === "toString") {
            methodName = tstl.createStringLiteral("__tostring", node.name);
        }

        const type = this.checker.getTypeAtLocation(node);
        const context = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void
            ? this.createSelfIdentifier()
            : undefined;
        const [paramNames, dots, restParamName] = this.transformParameters(node.parameters, context);

        const [body] = this.transformFunctionBody(node.parameters, node.body, restParamName);
        const functionExpression = tstl.createFunctionExpression(
            tstl.createBlock(body),
            paramNames,
            dots,
            restParamName
        );

        const classNameWithExport = this.addExportToIdentifier(tstl.cloneIdentifier(className));
        const methodTable = tsHelper.isStatic(node) || noPrototype
            ? classNameWithExport
            : tstl.createTableIndexExpression(classNameWithExport, tstl.createStringLiteral("prototype"));

        return tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(
                methodTable,
                methodName),
            functionExpression,
            node
        );
    }

    public transformParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>, context?: tstl.Identifier):
        [tstl.Identifier[], tstl.DotsLiteral, tstl.Identifier | undefined] {
        // Build parameter string
        const paramNames: tstl.Identifier[] = [];
        if (context) {
            paramNames.push(context);
        }

        let restParamName: tstl.Identifier;
        let dotsLiteral: tstl.DotsLiteral;
        let identifierIndex = 0;

        // Only push parameter name to paramName array if it isn't a spread parameter
        for (const param of parameters) {
            if (ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
                continue;
            }

            // Binding patterns become ____TS_bindingPattern0, ____TS_bindingPattern1, etc as function parameters
            // See transformFunctionBody for how these values are destructured
            const paramName = ts.isObjectBindingPattern(param.name) || ts.isArrayBindingPattern(param.name)
                ? tstl.createIdentifier(`____TS_bindingPattern${identifierIndex++}`)
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

    public transformFunctionBody(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        body: ts.Block,
        spreadIdentifier?: tstl.Identifier
    ): [tstl.Statement[], Scope]
    {
        this.pushScope(ScopeType.Function, body);

        const headerStatements = [];

        // Add default parameters
        const defaultValueDeclarations = parameters
            .filter(declaration => declaration.initializer !== undefined)
            .map(declaration => this.transformParameterDefaultValueDeclaration(declaration));

        headerStatements.push(...defaultValueDeclarations);

        // Add object binding patterns
        let identifierIndex = 0;
        const bindingPatternDeclarations: tstl.Statement[] = [];
        parameters.forEach(binding => {
            if (ts.isObjectBindingPattern(binding.name) || ts.isArrayBindingPattern(binding.name)) {
                const identifier = tstl.createIdentifier(`____TS_bindingPattern${identifierIndex++}`);
                bindingPatternDeclarations.push(...this.transformBindingPattern(binding.name, identifier));
            }
        });

        headerStatements.push(...bindingPatternDeclarations);

        // Push spread operator here
        if (spreadIdentifier) {
            const spreadTable = this.wrapInTable(tstl.createDotsLiteral());
            headerStatements.push(tstl.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
        }

        const bodyStatements = this.performHoisting(this.transformStatements(body.statements));

        const scope = this.popScope();

        return [headerStatements.concat(bodyStatements), scope];
    }

    public transformParameterDefaultValueDeclaration(declaration: ts.ParameterDeclaration): tstl.Statement {
        const parameterName = this.transformIdentifier(declaration.name as ts.Identifier);
        const parameterValue = this.transformExpression(declaration.initializer);
        const assignment = tstl.createAssignmentStatement(parameterName, parameterValue);

        const nilCondition = tstl.createBinaryExpression(
            parameterName,
            tstl.createNilLiteral(),
            tstl.SyntaxKind.EqualityOperator
        );

        const ifBlock = tstl.createBlock([assignment]);

        return tstl.createIfStatement(nilCondition, ifBlock, undefined, declaration);
    }

    public * transformBindingPattern(
        pattern: ts.BindingPattern,
        table: tstl.Identifier,
        propertyAccessStack: ts.PropertyName[] = []
    ): IterableIterator<tstl.Statement>
    {
        const isObjectBindingPattern = ts.isObjectBindingPattern(pattern);
        for (let index = 0; index < pattern.elements.length; index++) {
            const element = pattern.elements[index];
            if (ts.isBindingElement(element)) {
                if (ts.isArrayBindingPattern(element.name) || ts.isObjectBindingPattern(element.name)) {
                    // nested binding pattern
                    const propertyName = isObjectBindingPattern
                        ? element.propertyName
                        : ts.createNumericLiteral(String(index + 1));
                    propertyAccessStack.push(propertyName);
                    yield* this.transformBindingPattern(element.name, table, propertyAccessStack);
                } else {
                    // Disallow ellipsis destructure
                    if (element.dotDotDotToken) {
                        throw TSTLErrors.ForbiddenEllipsisDestruction(element);
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
                    const propertyName = this.transformIdentifier(
                        (element.propertyName || element.name) as ts.Identifier);
                    const expression = isObjectBindingPattern
                        ? tstl.createTableIndexExpression(tableExpression, tstl.createStringLiteral(propertyName.text))
                        : tstl.createTableIndexExpression(tableExpression, tstl.createNumericLiteral(index + 1));
                    if (element.initializer) {
                        const defaultExpression = tstl.createBinaryExpression(expression,
                            this.transformExpression(element.initializer), tstl.SyntaxKind.OrOperator);
                        yield* this.createLocalOrExportedOrGlobalDeclaration(variableName, defaultExpression);
                    } else {
                        yield* this.createLocalOrExportedOrGlobalDeclaration(variableName, expression);
                    }
                }
            }
        }
        propertyAccessStack.pop();
    }

    public transformModuleDeclaration(statement: ts.ModuleDeclaration): tstl.Statement[] {
        const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(statement), this.checker);
        // If phantom namespace elide the declaration and return the body
        if (decorators.has(DecoratorKind.Phantom) && statement.body && ts.isModuleBlock(statement.body)) {
            return this.transformStatements(statement.body.statements);
        }

        const result: tstl.Statement[] = [];

        if (this.currentNamespace) {
            // outerNS.innerNS = outerNS.innerNS or {}
            const namespaceDeclaration = tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(
                    this.transformIdentifier(this.currentNamespace.name as ts.Identifier),
                    tstl.createStringLiteral(this.transformIdentifier(statement.name as ts.Identifier).text)),
                tstl.createBinaryExpression(
                    tstl.createTableIndexExpression(
                        this.transformIdentifier(this.currentNamespace.name as ts.Identifier),
                        tstl.createStringLiteral(this.transformIdentifier(statement.name as ts.Identifier).text)),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator));

            result.push(namespaceDeclaration);

            // local innerNS = outerNS.innerNS
            const localDeclaration = this.createHoistableVariableDeclarationStatement(
                statement.name as ts.Identifier,
                tstl.createTableIndexExpression(
                    this.transformIdentifier(this.currentNamespace.name as ts.Identifier),
                    tstl.createStringLiteral(this.transformIdentifier(statement.name as ts.Identifier).text)));

            result.push(localDeclaration);

        } else if (this.isModule && (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export)) {
            // exports.NS = exports.NS or {}
            const namespaceDeclaration = tstl.createAssignmentStatement(
                this.createExportedIdentifier(this.transformIdentifier(statement.name as ts.Identifier)),
                tstl.createBinaryExpression(
                    this.createExportedIdentifier(this.transformIdentifier(statement.name as ts.Identifier)),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator));

            result.push(namespaceDeclaration);

            // local NS = exports.NS
            const localDeclaration = this.createHoistableVariableDeclarationStatement(
                statement.name as ts.Identifier,
                this.createExportedIdentifier(this.transformIdentifier(statement.name as ts.Identifier)));

            result.push(localDeclaration);

        } else {
            // local NS = NS or {}
            const localDeclaration = this.createLocalOrExportedOrGlobalDeclaration(
                this.transformIdentifier(statement.name as ts.Identifier),
                tstl.createBinaryExpression(
                    this.transformIdentifier(statement.name as ts.Identifier),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator
                )
            );

            result.push(...localDeclaration);
        }

        // Set current namespace for nested NS
        // Keep previous currentNS to reset after block transpilation
        const previousNamespace = this.currentNamespace;
        this.currentNamespace = statement;

        // Transform moduleblock to block and visit it
        if (statement.body && (ts.isModuleBlock(statement.body) || ts.isModuleDeclaration(statement.body))) {
            this.pushScope(ScopeType.Block, statement);
            let statements = ts.isModuleBlock(statement.body)
                ? this.transformStatements(statement.body.statements)
                : this.transformModuleDeclaration(statement.body);
            statements = this.performHoisting(statements);
            this.popScope();
            result.push(tstl.createDoStatement(statements));
        }

        this.currentNamespace = previousNamespace;

        return result;
    }

    public transformEnumDeclaration(enumDeclaration: ts.EnumDeclaration): StatementVisitResult {
        const type = this.checker.getTypeAtLocation(enumDeclaration);

        // Const enums should never appear in the resulting code
        if (type.symbol.getFlags() & ts.SymbolFlags.ConstEnum) {
            return undefined;
        }

        const membersOnly = tsHelper.getCustomDecorators(type, this.checker).has(DecoratorKind.CompileMembersOnly);

        const result: tstl.Statement[] = [];

        if (!membersOnly) {
            const name = this.transformIdentifier(enumDeclaration.name);
            const table = tstl.createTableExpression();
            result.push(...this.createLocalOrExportedOrGlobalDeclaration(name, table, enumDeclaration));
        }

        for (const enumMember of this.computeEnumMembers(enumDeclaration)) {
            const memberName = this.transformPropertyName(enumMember.name);
            if (membersOnly) {
                if (tstl.isIdentifier(memberName)) {
                    result.push(...this.createLocalOrExportedOrGlobalDeclaration(
                        memberName,
                        enumMember.value,
                        enumDeclaration
                    ));
                } else {
                    result.push(...this.createLocalOrExportedOrGlobalDeclaration(
                        tstl.createIdentifier(enumMember.name.getText(), enumMember.name),
                        enumMember.value,
                        enumDeclaration
                    ));
                }
            } else {
                const enumTable = this.transformIdentifierExpression(enumDeclaration.name);
                const property = tstl.createTableIndexExpression(enumTable, memberName);
                result.push(tstl.createAssignmentStatement(property, enumMember.value, enumMember.original));

                const valueIndex = tstl.createTableIndexExpression(enumTable, enumMember.value);
                result.push(tstl.createAssignmentStatement(valueIndex, memberName, enumMember.original));
            }
        }

        return result;
    }

    public computeEnumMembers(node: ts.EnumDeclaration):
        Array<{name: ts.PropertyName, value: tstl.Expression, original: ts.Node}> {
        let numericValue = 0;
        let hasStringInitializers = false;

        const valueMap = new Map<ts.PropertyName, tstl.Expression>();

        return node.members.map(member => {
            let valueExpression: tstl.Expression;
            if (member.initializer) {
                if (ts.isNumericLiteral(member.initializer))
                {
                    numericValue = Number(member.initializer.text);
                    valueExpression = this.transformNumericLiteral(member.initializer);
                    numericValue++;
                }
                else if (ts.isStringLiteral(member.initializer))
                {
                    hasStringInitializers = true;
                    valueExpression = this.transformStringLiteral(member.initializer);
                }
                else
                {
                    if (ts.isIdentifier(member.initializer)) {
                        const [isEnumMember, originalName] = tsHelper.isEnumMember(node, member.initializer);
                        if (isEnumMember) {
                            valueExpression = valueMap.get(originalName);
                        } else {
                            valueExpression = this.transformExpression(member.initializer);
                        }
                    } else {
                        valueExpression = this.transformExpression(member.initializer);
                    }
                }
            }
            else if (hasStringInitializers)
            {
                throw TSTLErrors.HeterogeneousEnum(node);
            }
            else
            {
                valueExpression = tstl.createNumericLiteral(numericValue);
                numericValue++;
            }

            valueMap.set(member.name, valueExpression);

            const enumMember = {
                name: member.name,
                original: member,
                value: valueExpression,
            };

            return enumMember;
        });
    }

    private transformGeneratorFunction(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        body: ts.Block,
        transformedParameters: tstl.Identifier[],
        dotsLiteral: tstl.DotsLiteral,
        spreadIdentifier?: tstl.Identifier
    ): [tstl.Statement[], Scope]
    {
        this.importLuaLibFeature(LuaLibFeature.Symbol);
        const [functionBody, functionScope] = this.transformFunctionBody(
            parameters,
            body,
            spreadIdentifier
        );

        const coroutineIdentifier = tstl.createIdentifier("____co");
        const valueIdentifier =  tstl.createIdentifier("____value");
        const errIdentifier =  tstl.createIdentifier("____err");
        const itIdentifier = tstl.createIdentifier("____it");

        //local ____co = coroutine.create(originalFunction)
        const coroutine =
            tstl.createVariableDeclarationStatement(coroutineIdentifier,
                tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"),
                        tstl.createStringLiteral("create")
                    ),
                    [tstl.createFunctionExpression(
                            tstl.createBlock(functionBody),
                            transformedParameters,
                            dotsLiteral,
                            spreadIdentifier),
                    ]
                )
            );

        const nextBody = [];
        // coroutine.resume(__co, ...)
        const resumeCall = tstl.createCallExpression(
            tstl.createTableIndexExpression(
                tstl.createIdentifier("coroutine"),
                tstl.createStringLiteral("resume")
            ),
            [coroutineIdentifier, tstl.createDotsLiteral()]
        );

        // ____err, ____value = coroutine.resume(____co, ...)
        nextBody.push(tstl.createVariableDeclarationStatement(
            [errIdentifier, valueIdentifier],
            resumeCall)
        );

        //coroutine.status(____co) ~= "dead";
        const coStatus = tstl.createCallExpression(
            tstl.createTableIndexExpression(
                tstl.createIdentifier("coroutine"),
                tstl.createStringLiteral("status")
            ),
            [coroutineIdentifier]
        );
        const status = tstl.createBinaryExpression(
            coStatus,
            tstl.createStringLiteral("dead"),
            tstl.SyntaxKind.EqualityOperator
        );
        nextBody.push(status);
        //if(not ____err){error(____value)}
        const errorCheck = tstl.createIfStatement(
            tstl.createUnaryExpression(
                errIdentifier,
                tstl.SyntaxKind.NotOperator
            ),
            tstl.createBlock([
                tstl.createExpressionStatement(
                        tstl.createCallExpression(
                        tstl.createIdentifier("error"),
                        [valueIdentifier]
                    )
                ),
            ])
        );
        nextBody.push(errorCheck);
        //{done = coroutine.status(____co) ~= "dead"; value = ____value}
        const iteratorResult = tstl.createTableExpression([
            tstl.createTableFieldExpression(
                status,
                tstl.createStringLiteral("done")
            ),
            tstl.createTableFieldExpression(
                valueIdentifier,
                tstl.createStringLiteral("value")
            ),
        ]);
        nextBody.push(tstl.createReturnStatement([iteratorResult]));

        //function(____, ...)
        const nextFunctionDeclaration = tstl.createFunctionExpression(
            tstl.createBlock(nextBody),
            [tstl.createAnnonymousIdentifier()],
            tstl.createDotsLiteral());

        //____it = {next = function(____, ...)}
        const iterator = tstl.createVariableDeclarationStatement(
            itIdentifier,
            tstl.createTableExpression([
                tstl.createTableFieldExpression(
                    nextFunctionDeclaration,
                    tstl.createStringLiteral("next")
                ),
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
                tstl.createTableIndexExpression(
                    itIdentifier,
                    symbolIterator
                ),
                tstl.createFunctionExpression(
                    tstl.createBlock(
                        [tstl.createReturnStatement([itIdentifier])]
                    )
                )
            ),
            //return ____it
            tstl.createReturnStatement([itIdentifier]),
        ];
        return [block, functionScope];
    }

    public transformFunctionDeclaration(functionDeclaration: ts.FunctionDeclaration): StatementVisitResult {
        // Don't transform functions without body (overload declarations)
        if (!functionDeclaration.body) {
            return undefined;
        }

        const type = this.checker.getTypeAtLocation(functionDeclaration);
        const context = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void
            ? this.createSelfIdentifier()
            : undefined;
        const [params, dotsLiteral, restParamName] = this.transformParameters(functionDeclaration.parameters, context);

        const name = this.transformIdentifier(functionDeclaration.name);
        const [body, functionScope] = functionDeclaration.asteriskToken
            ? this.transformGeneratorFunction(
                functionDeclaration.parameters,
                functionDeclaration.body,
                params,
                dotsLiteral,
                restParamName
            )
            : this.transformFunctionBody(
                functionDeclaration.parameters,
                functionDeclaration.body,
                restParamName
            );
        const block = tstl.createBlock(body);
        const functionExpression = tstl.createFunctionExpression(block, params, dotsLiteral, restParamName);
        // Remember symbols referenced in this function for hoisting later
        if (!this.options.noHoisting && name.symbolId !== undefined) {
            const scope = this.peekScope();
            if (!scope.functionDefinitions) { scope.functionDefinitions = new Map(); }
            const functionInfo = {referencedSymbols: functionScope.referencedSymbols || new Set()};
            scope.functionDefinitions.set(name.symbolId, functionInfo);
        }
        return this.createLocalOrExportedOrGlobalDeclaration(name, functionExpression, functionDeclaration);
    }

    public transformTypeAliasDeclaration(statement: ts.TypeAliasDeclaration): undefined {
        return undefined;
    }

    public transformInterfaceDeclaration(statement: ts.InterfaceDeclaration): undefined {
        return undefined;
    }

    public transformVariableDeclaration(statement: ts.VariableDeclaration)
        : tstl.Statement[]
    {
        if (statement.initializer) {
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
                return this.createLocalOrExportedOrGlobalDeclaration(
                    identifierName,
                    undefined,
                    statement
                );
            }
        } else if (ts.isArrayBindingPattern(statement.name) || ts.isObjectBindingPattern(statement.name)) {
            // Destructuring types

            // For nested bindings and object bindings, fall back to transformBindingPattern
            if (ts.isObjectBindingPattern(statement.name)
                || statement.name.elements.some(elem => !ts.isBindingElement(elem) || !ts.isIdentifier(elem.name))) {
                const statements = [];
                let table: tstl.Identifier;
                if (ts.isIdentifier(statement.initializer)) {
                    table = this.transformIdentifier(statement.initializer);
                } else {
                    // Contain the expression in a temporary variable
                    table = tstl.createIdentifier("____");
                    statements.push(tstl.createVariableDeclarationStatement(
                        table, this.transformExpression(statement.initializer)));
                }
                statements.push(...this.transformBindingPattern(statement.name, table));
                return statements;
            }

            // Disallow ellipsis destruction
            if (statement.name.elements.some(elem => !ts.isBindingElement(elem) || elem.dotDotDotToken !== undefined)) {
                throw TSTLErrors.ForbiddenEllipsisDestruction(statement);
            }

            const vars = statement.name.elements.length > 0
                ? statement.name.elements.map(e => this.transformArrayBindingElement(e))
                : tstl.createAnnonymousIdentifier(statement.name);

            // Don't unpack TupleReturn decorated functions
            if (statement.initializer) {
                if (tsHelper.isTupleReturnCall(statement.initializer, this.checker)) {
                    return this.createLocalOrExportedOrGlobalDeclaration(
                        vars,
                        this.transformExpression(statement.initializer),
                        statement
                    );
                } else {
                    // local vars = this.transpileDestructingAssignmentValue(node.initializer);
                    const initializer = this.createUnpackCall(
                        this.transformExpression(statement.initializer),
                        statement.initializer
                    );
                    return this.createLocalOrExportedOrGlobalDeclaration(vars, initializer, statement);
                }
            } else {
                return this.createLocalOrExportedOrGlobalDeclaration(
                    vars,
                    tstl.createNilLiteral(),
                    statement
                );
            }
        }
    }

    public transformVariableStatement(statement: ts.VariableStatement): tstl.Statement[] {
        const result: tstl.Statement[] = [];
        statement.declarationList.declarations
            .forEach(declaration => result.push(...this.transformVariableDeclaration(declaration)));
        return result;
    }

    public transformExpressionStatement(statement: ts.ExpressionStatement | ts.Expression): tstl.Statement {
        const expression = ts.isExpressionStatement(statement) ? statement.expression : statement;
        if (ts.isBinaryExpression(expression)) {
            const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(expression.operatorToken.kind);
            if (isCompound) {
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
                const lhs = this.transformExpressionStatement(expression.left);
                const rhs = this.transformExpressionStatement(expression.right);
                return tstl.createDoStatement([lhs, rhs], expression);
            }

        } else if (
            ts.isPrefixUnaryExpression(expression) &&
                (expression.operator === ts.SyntaxKind.PlusPlusToken
                || expression.operator === ts.SyntaxKind.MinusMinusToken)) {
            // ++i, --i
            const replacementOperator = expression.operator === ts.SyntaxKind.PlusPlusToken
                ? tstl.SyntaxKind.AdditionOperator
                : tstl.SyntaxKind.SubractionOperator;

            return this.transformCompoundAssignmentStatement(
                expression,
                expression.operand,
                ts.createLiteral(1),
                replacementOperator
            );
        }

        else if (ts.isPostfixUnaryExpression(expression)) {
            // i++, i--
            const replacementOperator = expression.operator === ts.SyntaxKind.PlusPlusToken
                ? tstl.SyntaxKind.AdditionOperator
                : tstl.SyntaxKind.SubractionOperator;

            return this.transformCompoundAssignmentStatement(
                expression,
                expression.operand,
                ts.createLiteral(1),
                replacementOperator
            );
        }

        else if (ts.isDeleteExpression(expression)) {
            return tstl.createAssignmentStatement(
                this.transformExpression(expression.expression) as tstl.IdentifierOrTableIndexExpression,
                tstl.createNilLiteral(),
                expression
            );
        }

        return tstl.createExpressionStatement(this.transformExpression(expression));
    }

    public transformYield(expression: ts.YieldExpression): tstl.Expression {
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("coroutine"), tstl.createStringLiteral("yield")),
                expression.expression?[this.transformExpression(expression.expression)]:[], expression);
    }

    public transformReturn(statement: ts.ReturnStatement): tstl.Statement {
        if (statement.expression) {
            const returnType = tsHelper.getContainingFunctionReturnType(statement, this.checker);
            if (returnType) {
                const expressionType = this.checker.getTypeAtLocation(statement.expression);
                this.validateFunctionAssignment(statement, expressionType, returnType);
            }
            if (tsHelper.isInTupleReturnFunction(statement, this.checker)) {
                // Parent function is a TupleReturn function
                if (ts.isArrayLiteralExpression(statement.expression)) {
                    // If return expression is an array literal, leave out brackets.
                    return tstl.createReturnStatement(statement.expression.elements
                        .map(elem => this.transformExpression(elem)));
                } else if (!tsHelper.isTupleReturnCall(statement.expression, this.checker)) {
                    // If return expression is not another TupleReturn call, unpack it
                    const expression = this.createUnpackCall(
                        this.transformExpression(statement.expression),
                        statement.expression
                    );
                    return tstl.createReturnStatement([expression]);
                }
            }
            return tstl.createReturnStatement([this.transformExpression(statement.expression)]);
        } else {
            // Empty return
            return tstl.createReturnStatement();
        }
    }

    public transformIfStatement(statement: ts.IfStatement): tstl.IfStatement {
        this.pushScope(ScopeType.Conditional, statement.thenStatement);
        const condition = this.transformExpression(statement.expression);
        const statements = this.performHoisting(this.transformBlockOrStatement(statement.thenStatement));
        this.popScope();
        const ifBlock = tstl.createBlock(statements);
        if (statement.elseStatement) {
            if (ts.isIfStatement(statement.elseStatement)) {
                return tstl.createIfStatement(condition, ifBlock, this.transformIfStatement(statement.elseStatement));
            } else {
                this.pushScope(ScopeType.Conditional, statement.elseStatement);
                const elseStatements = this.performHoisting(this.transformBlockOrStatement(statement.elseStatement));
                this.popScope();
                const elseBlock = tstl.createBlock(elseStatements);
                return tstl.createIfStatement(condition, ifBlock, elseBlock);
            }
        }
        return tstl.createIfStatement(condition, ifBlock);
    }

    public transformWhileStatement(statement: ts.WhileStatement): tstl.WhileStatement {
        return tstl.createWhileStatement(
            tstl.createBlock(this.transformLoopBody(statement)),
            this.transformExpression(statement.expression),
            statement
        );
    }

    public transformDoStatement(statement: ts.DoStatement): tstl.RepeatStatement {
        return tstl.createRepeatStatement(
            tstl.createBlock(this.transformLoopBody(statement)),
            tstl.createUnaryExpression(this.transformExpression(statement.expression), tstl.SyntaxKind.NotOperator),
            statement
        );
    }

    public transformForStatement(statement: ts.ForStatement): tstl.DoStatement {
        const result: tstl.Statement[] = [];

        if (statement.initializer) {
            if (ts.isVariableDeclarationList(statement.initializer)) {
                for (const variableDeclaration of statement.initializer.declarations) {
                    // local initializer = value
                    result.push(...this.transformVariableDeclaration(variableDeclaration));
                }
            } else {
                result.push(this.transformExpressionStatement(statement.initializer));
            }
        }

        const condition = statement.condition
            ? this.transformExpression(statement.condition)
            : tstl.createBooleanLiteral(true);

        // Add body
        const body: tstl.Statement[] = this.transformLoopBody(statement);

        if (statement.incrementor) {
            body.push(this.transformExpressionStatement(statement.incrementor));
        }

        // while (condition) do ... end
        result.push(tstl.createWhileStatement(tstl.createBlock(body), condition));

        return tstl.createDoStatement(result, statement);
    }

    public transformForOfInitializer(initializer: ts.ForInitializer, expression: tstl.Expression): tstl.Statement {
        if (ts.isVariableDeclarationList(initializer)) {
            // Declaration of new variable
            const variableDeclarations = this.transformVariableDeclaration(initializer.declarations[0]);
            if (ts.isArrayBindingPattern(initializer.declarations[0].name)) {
                expression = this.createUnpackCall(expression, initializer);
            }
            // we can safely assume that for vars are not exported and therefore declarationstatenents
            return tstl.createVariableDeclarationStatement(
                (variableDeclarations[0] as tstl.VariableDeclarationStatement).left, expression);

        } else {
            // Assignment to existing variable
            let variables: tstl.IdentifierOrTableIndexExpression | tstl.IdentifierOrTableIndexExpression[];
            if (ts.isArrayLiteralExpression(initializer)) {
                expression = this.createUnpackCall(expression, initializer);
                variables = initializer.elements
                    .map(e => this.transformExpression(e)) as tstl.IdentifierOrTableIndexExpression[];
            } else {
                variables = this.transformExpression(initializer) as tstl.IdentifierOrTableIndexExpression;
            }
            return tstl.createAssignmentStatement(variables, expression);
        }
    }

    public transformLoopBody(
        loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
    ): tstl.Statement[]
    {
        this.pushScope(ScopeType.Loop, loop.statement);
        const body = this.performHoisting(this.transformBlockOrStatement(loop.statement));
        const scope = this.popScope();
        const scopeId = scope.id;

        if (this.options.luaTarget === LuaTarget.Lua51) {
            return body;
        }

        const baseResult: tstl.Statement[] = [tstl.createDoStatement(body)];
        const continueLabel = tstl.createLabelStatement(`__continue${scopeId}`);
        baseResult.push(continueLabel);

        return baseResult;
    }

    public transformBlockOrStatement(statement: ts.Statement): tstl.Statement[] {
        return ts.isBlock(statement)
            ? this.transformStatements(statement.statements)
            : this.statementVisitResultToStatementArray(this.transformStatement(statement));
    }

    public transformForOfArrayStatement(statement: ts.ForOfStatement, block: tstl.Block): StatementVisitResult {
        const arrayExpression = this.transformExpression(statement.expression);

        // Arrays use numeric for loop (performs better than ipairs)
        const indexVariable = tstl.createIdentifier("____TS_index");
        if (!ts.isIdentifier(statement.expression)) {
            // Cache iterable expression if it's not a simple identifier
            // local ____TS_array = ${iterable};
            // for ____TS_index = 1, #____TS_array do
            //     local ${initializer} = ____TS_array[____TS_index]
            const arrayVariable = tstl.createIdentifier("____TS_array");
            const arrayAccess = tstl.createTableIndexExpression(arrayVariable, indexVariable);
            const initializer = this.transformForOfInitializer(statement.initializer, arrayAccess);
            block.statements.splice(0, 0, initializer);
            return [
                tstl.createVariableDeclarationStatement(arrayVariable, arrayExpression),
                tstl.createForStatement(
                    block,
                    indexVariable,
                    tstl.createNumericLiteral(1),
                    tstl.createUnaryExpression(arrayVariable, tstl.SyntaxKind.LengthOperator)
                ),
            ];

        } else {
            // Simple identifier version
            // for ____TS_index = 1, #${iterable} do
            //     local ${initializer} = ${iterable}[____TS_index]
            const iterableAccess = tstl.createTableIndexExpression(arrayExpression, indexVariable);
            const initializer = this.transformForOfInitializer(statement.initializer, iterableAccess);
            block.statements.splice(0, 0, initializer);
            return tstl.createForStatement(
                block,
                indexVariable,
                tstl.createNumericLiteral(1),
                tstl.createUnaryExpression(arrayExpression, tstl.SyntaxKind.LengthOperator)
            );
        }
    }

    public transformForOfLuaIteratorStatement(statement: ts.ForOfStatement, block: tstl.Block): StatementVisitResult {
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
                    return tstl.createForInStatement(
                        block,
                        initializerVariable.elements.map(e => this.transformArrayBindingElement(e)),
                        [luaIterator]
                    );

                } else {
                    // Single variable is not allowed
                    throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(statement.initializer);
                }

            } else {
                // Variables NOT declared in for loop - catch iterator values in temps and assign
                // for ____TS_value0 in ${iterable} do
                //     ${initializer} = ____TS_value0
                if (ts.isArrayLiteralExpression(statement.initializer)) {
                    const tmps = statement.initializer.elements
                        .map((_, i) => tstl.createIdentifier(`____TS_value${i}`));
                    const assign = tstl.createAssignmentStatement(
                        statement.initializer.elements
                            .map(e => this.transformExpression(e)) as tstl.IdentifierOrTableIndexExpression[],
                        tmps
                    );
                    block.statements.splice(0, 0, assign);
                    return tstl.createForInStatement(block, tmps, [luaIterator]);

                } else {
                    // Single variable is not allowed
                    throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(statement.initializer);
                }
            }

        } else {
            // LuaIterator (no TupleReturn)
            if (ts.isVariableDeclarationList(statement.initializer)
                && ts.isIdentifier(statement.initializer.declarations[0].name)) {
                // Single variable declared in for loop
                // for ${initializer} in ${iterator} do
                return tstl.createForInStatement(
                    block,
                    [this.transformIdentifier(statement.initializer.declarations[0].name as ts.Identifier)],
                    [luaIterator]
                );

            } else {
                // Destructuring or variable NOT declared in for loop
                // for ____TS_value in ${iterator} do
                //     local ${initializer} = unpack(____TS_value)
                const valueVariable = tstl.createIdentifier("____TS_value");
                const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
                block.statements.splice(0, 0, initializer);
                return tstl.createForInStatement(
                    block,
                    [valueVariable],
                    [luaIterator]
                );
            }
        }
    }

    public transformForOfIteratorStatement(statement: ts.ForOfStatement, block: tstl.Block): StatementVisitResult {
        const iterable = this.transformExpression(statement.expression);
        if (ts.isVariableDeclarationList(statement.initializer)
            && ts.isIdentifier(statement.initializer.declarations[0].name)) {
            // Single variable declared in for loop
            // for ${initializer} in __TS__iterator(${iterator}) do
            return tstl.createForInStatement(
                block,
                [this.transformIdentifier(statement.initializer.declarations[0].name as ts.Identifier)],
                [this.transformLuaLibFunction(LuaLibFeature.Iterator, statement.expression, iterable)]
            );

        } else {
            // Destructuring or variable NOT declared in for loop
            // for ____TS_value in __TS__iterator(${iterator}) do
            //     local ${initializer} = ____TS_value
            const valueVariable = tstl.createIdentifier("____TS_value");
            const initializer = this.transformForOfInitializer(statement.initializer, valueVariable);
            block.statements.splice(0, 0, initializer);
            return tstl.createForInStatement(
                block,
                [valueVariable],
                [this.transformLuaLibFunction(LuaLibFeature.Iterator, statement.expression, iterable)]
            );
        }
    }

    public transformForOfStatement(statement: ts.ForOfStatement): StatementVisitResult {
        // Transpile body
        const body = tstl.createBlock(this.transformLoopBody(statement));

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker)) {
            // Arrays
            return this.transformForOfArrayStatement(statement, body);

        } else if (tsHelper.isLuaIteratorType(statement.expression, this.checker)) {
            // LuaIterators
            return this.transformForOfLuaIteratorStatement(statement, body);

        } else {
            // TS Iterables
            return this.transformForOfIteratorStatement(statement, body);
        }
    }

    public transformForInStatement(statement: ts.ForInStatement): StatementVisitResult {
        // Get variable identifier
        const variable = (statement.initializer as ts.VariableDeclarationList).declarations[0];
        const identifier = variable.name as ts.Identifier;

        // Transpile expression
        const pairsIdentifier = tstl.createIdentifier("pairs");
        const expression = tstl.createCallExpression(pairsIdentifier, [this.transformExpression(statement.expression)]);

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker)) {
            throw TSTLErrors.ForbiddenForIn(statement);
        }

        const body = tstl.createBlock(this.transformLoopBody(statement));

        return tstl.createForInStatement(
            body,
            [this.transformIdentifier(identifier)],
            [expression],
            statement
        );
    }

    public transformSwitchStatement(statement: ts.SwitchStatement): StatementVisitResult {
        if (this.options.luaTarget === LuaTarget.Lua51) {
            throw TSTLErrors.UnsupportedForTarget("Switch statements", this.options.luaTarget, statement);
        }

        this.pushScope(ScopeType.Switch, statement);

        // Give the switch a unique name to prevent nested switches from acting up.
        const switchName = `____TS_switch${this.peekScope().id}`;

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
        if (breakableScope.type === ScopeType.Switch) {
            return tstl.createGotoStatement(`____TS_switch${breakableScope.id}_end`);
        } else {
            return tstl.createBreakStatement(breakStatement);
        }
    }

    public transformTryStatement(statement: ts.TryStatement): StatementVisitResult {
        const pCall = tstl.createIdentifier("pcall");
        const tryBlock = this.transformBlock(statement.tryBlock);
        const tryCall = tstl.createCallExpression(pCall, [tstl.createFunctionExpression(tryBlock)]);

        const result: tstl.Statement[] = [];

        if (statement.catchClause) {
            const tryResult = tstl.createIdentifier("____TS_try");

            const returnVariables = statement.catchClause && statement.catchClause.variableDeclaration
                ? [tryResult, this.transformIdentifier(statement.catchClause.variableDeclaration.name as ts.Identifier)]
                : [tryResult];

            const catchAssignment = tstl.createVariableDeclarationStatement(returnVariables, tryCall);

            result.push(catchAssignment);

            const notTryResult = tstl.createUnaryExpression(tryResult, tstl.SyntaxKind.NotOperator);
            result.push(tstl.createIfStatement(notTryResult, this.transformBlock(statement.catchClause.block)));

        } else {
            result.push(tstl.createExpressionStatement(tryCall));
        }

        if (statement.finallyBlock) {
            result.push(tstl.createDoStatement(this.transformBlock(statement.finallyBlock).statements));
        }

        return tstl.createDoStatement(
            result,
            statement
        );
    }

    public transformThrowStatement(statement: ts.ThrowStatement): StatementVisitResult {
        const type = this.checker.getTypeAtLocation(statement.expression);
        if (tsHelper.isStringType(type)) {
            const error = tstl.createIdentifier("error");
            return tstl.createExpressionStatement(
                tstl.createCallExpression(error, [this.transformExpression(statement.expression)]),
                statement
            );
        } else {
            throw TSTLErrors.InvalidThrowExpression(statement.expression);
        }
    }

    public transformContinueStatement(statement: ts.ContinueStatement): StatementVisitResult {
        if (this.options.luaTarget === LuaTarget.Lua51) {
            throw TSTLErrors.UnsupportedForTarget("Continue statement", this.options.luaTarget, statement);
        }

        return tstl.createGotoStatement(
            `__continue${this.findScope(ScopeType.Loop).id}`,
            statement
        );
    }

    public transformEmptyStatement(arg0: ts.EmptyStatement): StatementVisitResult {
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
            case ts.SyntaxKind.DeleteExpression:
                return this.transformDeleteExpression(expression as ts.DeleteExpression);
            case ts.SyntaxKind.FunctionExpression:
                return this.transformFunctionExpression(expression as ts.ArrowFunction, this.createSelfIdentifier());
            case ts.SyntaxKind.ArrowFunction:
                return this.transformFunctionExpression(expression as ts.ArrowFunction, tstl.createIdentifier("____"));
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
                return this.transformYield(expression as ts.YieldExpression);
            case ts.SyntaxKind.EmptyStatement:
                return undefined;
            case ts.SyntaxKind.NotEmittedStatement:
                return undefined;
            case ts.SyntaxKind.ClassExpression:
                const className = tstl.createIdentifier("____");
                const classDeclaration =  this.transformClassDeclaration(expression as ts.ClassExpression, className);
                return this.createImmediatelyInvokedFunctionExpression(classDeclaration, className, expression);
            case ts.SyntaxKind.PartiallyEmittedExpression:
                return this.transformExpression((expression as ts.PartiallyEmittedExpression).expression);
            default:
                throw TSTLErrors.UnsupportedKind("expression", expression.kind, expression);
        }
    }

    public transformBinaryOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: tstl.BinaryOperator
    ): tstl.Expression
    {
        switch (operator) {
            case tstl.SyntaxKind.BitwiseAndOperator:
            case tstl.SyntaxKind.BitwiseOrOperator:
            case tstl.SyntaxKind.BitwiseExclusiveOrOperator:
            case tstl.SyntaxKind.BitwiseLeftShiftOperator:
            case tstl.SyntaxKind.BitwiseRightShiftOperator:
            case tstl.SyntaxKind.BitwiseArithmeticRightShift:
                return this.transformBinaryBitOperation(node, left, right, operator);

            default:
                return tstl.createBinaryExpression(left, right, operator, node);
        }
    }

    public transformBinaryExpression(expression: ts.BinaryExpression): tstl.Expression {
        // Check if this is an assignment token, then handle accordingly

        const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(expression.operatorToken.kind);
        if (isCompound) {
            return this.transformCompoundAssignmentExpression(
                expression,
                expression.left,
                expression.right,
                replacementOperator,
                false
            );
        }

        const lhs = this.transformExpression(expression.left);
        const rhs = this.transformExpression(expression.right);

        // Transpile operators
        switch (expression.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseAndOperator);
            case ts.SyntaxKind.BarToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseOrOperator);
            case ts.SyntaxKind.CaretToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseExclusiveOrOperator);
            case ts.SyntaxKind.LessThanLessThanToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseLeftShiftOperator);
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseRightShiftOperator);
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.BitwiseArithmeticRightShift);
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.AndOperator);
            case ts.SyntaxKind.BarBarToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.OrOperator);
            case ts.SyntaxKind.PlusToken:
                // Replace string + with ..
                const typeLeft = this.checker.getTypeAtLocation(expression.left);
                const typeRight = this.checker.getTypeAtLocation(expression.right);
                if (tsHelper.isStringType(typeLeft) || tsHelper.isStringType(typeRight)) {
                    return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.ConcatOperator);
                }
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.AdditionOperator);
            case ts.SyntaxKind.MinusToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.SubractionOperator);
            case ts.SyntaxKind.AsteriskToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.MultiplicationOperator);
            case ts.SyntaxKind.AsteriskAsteriskToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.PowerOperator);
            case ts.SyntaxKind.SlashToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.DivisionOperator);
            case ts.SyntaxKind.PercentToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.ModuloOperator);
            case ts.SyntaxKind.GreaterThanToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.GreaterThanOperator);
            case ts.SyntaxKind.GreaterThanEqualsToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.GreaterEqualOperator);
            case ts.SyntaxKind.LessThanToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.LessThanOperator);
            case ts.SyntaxKind.LessThanEqualsToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.LessEqualOperator);
            case ts.SyntaxKind.EqualsToken:
                return this.transformAssignmentExpression(expression);
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.EqualityOperator);
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return this.transformBinaryOperation(expression, lhs, rhs, tstl.SyntaxKind.InequalityOperator);
            case ts.SyntaxKind.InKeyword:
                const indexExpression = tstl.createTableIndexExpression(rhs, lhs);
                return tstl.createBinaryExpression(
                    indexExpression,
                    tstl.createNilLiteral(),
                    tstl.SyntaxKind.InequalityOperator,
                    expression
                );

            case ts.SyntaxKind.InstanceOfKeyword:
                const decorators = tsHelper.getCustomDecorators(
                    this.checker.getTypeAtLocation(expression.right),
                    this.checker
                );
                if (decorators.has(DecoratorKind.Extension) || decorators.has(DecoratorKind.MetaExtension)) {
                    // Cannot use instanceof on extension classes
                    throw TSTLErrors.InvalidInstanceOfExtension(expression);
                }
                return this.transformLuaLibFunction(LuaLibFeature.InstanceOf, expression, lhs, rhs);

            case ts.SyntaxKind.CommaToken:
                return this.createImmediatelyInvokedFunctionExpression(
                    [this.transformExpressionStatement(expression.left)],
                    rhs,
                    expression
                );

            default:
                throw TSTLErrors.UnsupportedKind("binary operator", expression.operatorToken.kind, expression);
        }
    }

    public transformAssignment(lhs: ts.Expression, right: tstl.Expression): tstl.Statement {
        return tstl.createAssignmentStatement(
            this.transformExpression(lhs) as tstl.IdentifierOrTableIndexExpression,
            right,
            lhs.parent
        );
    }

    public transformAssignmentStatement(expression: ts.BinaryExpression): tstl.Statement {
        // Validate assignment
        const rightType = this.checker.getTypeAtLocation(expression.right);
        const leftType = this.checker.getTypeAtLocation(expression.left);
        this.validateFunctionAssignment(expression.right, rightType, leftType);

        if (ts.isArrayLiteralExpression(expression.left)) {
            // Destructuring assignment
            const left = expression.left.elements.length > 0
                ? expression.left.elements.map(e => this.transformExpression(e))
                : [tstl.createAnnonymousIdentifier(expression.left)];
            let right: tstl.Expression[];
            if (ts.isArrayLiteralExpression(expression.right)) {
                right = expression.right.elements.length > 0
                    ? expression.right.elements.map(e => this.transformExpression(e))
                    : [tstl.createNilLiteral()];
            } else if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = [this.transformExpression(expression.right)];
            } else {
                right = [this.createUnpackCall(this.transformExpression(expression.right), expression.right)];
            }
            return tstl.createAssignmentStatement(
                left as tstl.IdentifierOrTableIndexExpression[],
                right,
                expression
            );
        } else {
            // Simple assignment
            return this.transformAssignment(expression.left, this.transformExpression(expression.right));
        }
    }

    public transformAssignmentExpression(expression: ts.BinaryExpression)
        : tstl.CallExpression | tstl.MethodCallExpression
    {
        // Validate assignment
        const rightType = this.checker.getTypeAtLocation(expression.right);
        const leftType = this.checker.getTypeAtLocation(expression.left);
        this.validateFunctionAssignment(expression.right, rightType, leftType);

        if (ts.isArrayLiteralExpression(expression.left)) {
            // Destructuring assignment
            // (function() local ${tmps} = ${right}; ${left} = ${tmps}; return {${tmps}} end)()
            const left = expression.left.elements.length > 0
                ? expression.left.elements.map(e => this.transformExpression(e))
                : [tstl.createAnnonymousIdentifier(expression.left)];
            let right: tstl.Expression[];
            if (ts.isArrayLiteralExpression(expression.right)) {
                right = expression.right.elements.length > 0
                    ? expression.right.elements.map(e => this.transformExpression(e))
                    : [tstl.createNilLiteral()];
            } else if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = [this.transformExpression(expression.right)];
            } else {
                right = [this.createUnpackCall(this.transformExpression(expression.right), expression.right)];
            }
            const tmps = left.map((_, i) => tstl.createIdentifier(`____TS_tmp${i}`));
            const statements: tstl.Statement[] = [
                tstl.createVariableDeclarationStatement(tmps, right),
                tstl.createAssignmentStatement(left as tstl.IdentifierOrTableIndexExpression[], tmps),
            ];
            return this.createImmediatelyInvokedFunctionExpression(
                statements,
                tstl.createTableExpression(tmps.map(t => tstl.createTableFieldExpression(t))),
                expression
            );
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
            const iife = tstl.createFunctionExpression(
                tstl.createBlock(statements),
                [objParameter, indexParameter, valueParameter]
            );
            const objExpression = this.transformExpression(expression.left.expression);
            let indexExpression: tstl.Expression;
            if (ts.isPropertyAccessExpression(expression.left)) {
                // Property access
                indexExpression = tstl.createStringLiteral(expression.left.name.text);
            } else {
                // Element access
                indexExpression = this.transformExpression(expression.left.argumentExpression);
                const argType = this.checker.getTypeAtLocation(expression.left.expression);
                if (tsHelper.isArrayType(argType, this.checker)) {
                    // Array access needs a +1
                    indexExpression = this.expressionPlusOne(indexExpression);
                }
            }
            const args = [objExpression, indexExpression, this.transformExpression(expression.right)];
            return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), args);

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

    public transformCompoundAssignmentExpression(
        expression: ts.Expression,
        lhs: ts.Expression,
        rhs: ts.Expression,
        replacementOperator: tstl.BinaryOperator,
        isPostfix: boolean
    ): tstl.CallExpression
    {
        if (replacementOperator === tstl.SyntaxKind.AdditionOperator) {
            // Check is we need to use string concat operator
            const typeLeft = this.checker.getTypeAtLocation(lhs);
            const typeRight = this.checker.getTypeAtLocation(rhs);
            if (tsHelper.isStringType(typeLeft) || tsHelper.isStringType(typeRight)) {
                replacementOperator = tstl.SyntaxKind.ConcatOperator;
            }
        }

        const left = this.transformExpression(lhs) as tstl.IdentifierOrTableIndexExpression;
        let right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            lhs,
            this.checker
        );
        if (hasEffects) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __TS_obj, __TS_index = ${objExpression}, ${indexExpression};
            const obj = tstl.createIdentifier("____TS_obj");
            const index = tstl.createIdentifier("____TS_index");
            const objAndIndexDeclaration = tstl.createVariableDeclarationStatement(
                [obj, index], [this.transformExpression(objExpression), this.transformExpression(indexExpression)]);
            const accessExpression = tstl.createTableIndexExpression(obj, index);

            const tmp = tstl.createIdentifier("____TS_tmp");
            right = tstl.createParenthesizedExpression(right);
            let tmpDeclaration: tstl.VariableDeclarationStatement;
            let assignStatement: tstl.AssignmentStatement;
            if (isPostfix) {
                // local ____TS_tmp = ____TS_obj[____TS_index];
                // ____TS_obj[____TS_index] = ____TS_tmp ${replacementOperator} ${right};
                tmpDeclaration = tstl.createVariableDeclarationStatement(tmp, accessExpression);
                const operatorExpression = this.transformBinaryOperation(expression, tmp, right, replacementOperator);
                assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            } else {
                // local ____TS_tmp = ____TS_obj[____TS_index] ${replacementOperator} ${right};
                // ____TS_obj[____TS_index] = ____TS_tmp;
                const operatorExpression = this.transformBinaryOperation(
                    expression,
                    accessExpression,
                    right,
                    replacementOperator
                );
                tmpDeclaration = tstl.createVariableDeclarationStatement(tmp, operatorExpression);
                assignStatement = tstl.createAssignmentStatement(accessExpression, tmp);
            }
            // return ____TS_tmp
            return this.createImmediatelyInvokedFunctionExpression(
                [objAndIndexDeclaration, tmpDeclaration, assignStatement],
                tmp,
                lhs.parent
            );

        } else if (isPostfix) {
            // Postfix expressions need to cache original value in temp
            // local ____TS_tmp = ${left};
            // ${left} = ____TS_tmp ${replacementOperator} ${right};
            // return ____TS_tmp
            const tmpIdentifier = tstl.createIdentifier("____TS_tmp");
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, left);
            const operatorExpression = this.transformBinaryOperation(
                expression,
                tmpIdentifier,
                right,
                replacementOperator
            );
            const assignStatement = this.transformAssignment(lhs, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression(
                [tmpDeclaration, assignStatement],
                tmpIdentifier,
                lhs.parent
            );

        } else if (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs)) {
            // Simple property/element access expressions need to cache in temp to avoid double-evaluation
            // local ____TS_tmp = ${left} ${replacementOperator} ${right};
            // ${left} = ____TS_tmp;
            // return ____TS_tmp
            const tmpIdentifier = tstl.createIdentifier("____TS_tmp");
            const operatorExpression = this.transformBinaryOperation(lhs.parent, left, right, replacementOperator);
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, operatorExpression);
            const assignStatement = this.transformAssignment(lhs, tmpIdentifier);
            return this.createImmediatelyInvokedFunctionExpression(
                [tmpDeclaration, assignStatement],
                tmpIdentifier,
                lhs.parent
            );

        } else {
            // Simple expressions
            // ${left} = ${right}; return ${right}
            const operatorExpression = this.transformBinaryOperation(lhs.parent, left, right, replacementOperator);
            const assignStatement = this.transformAssignment(lhs, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression([assignStatement], left, lhs.parent);
        }
    }

    public transformCompoundAssignmentStatement(
        node: ts.Node,
        lhs: ts.Expression,
        rhs: ts.Expression,
        replacementOperator: tstl.BinaryOperator
    ): tstl.Statement
    {
        if (replacementOperator === tstl.SyntaxKind.AdditionOperator) {
            // Check is we need to use string concat operator
            const typeLeft = this.checker.getTypeAtLocation(lhs);
            const typeRight = this.checker.getTypeAtLocation(rhs);
            if (tsHelper.isStringType(typeLeft) || tsHelper.isStringType(typeRight)) {
                replacementOperator = tstl.SyntaxKind.ConcatOperator;
            }
        }

        const left = this.transformExpression(lhs) as tstl.IdentifierOrTableIndexExpression;
        const right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(
            lhs,
            this.checker
        );
        if (hasEffects) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __TS_obj, __TS_index = ${objExpression}, ${indexExpression};
            // ____TS_obj[____TS_index] = ____TS_obj[____TS_index] ${replacementOperator} ${right};
            const obj = tstl.createIdentifier("____TS_obj");
            const index = tstl.createIdentifier("____TS_index");
            const objAndIndexDeclaration = tstl.createVariableDeclarationStatement(
                [obj, index], [this.transformExpression(objExpression), this.transformExpression(indexExpression)]);
            const accessExpression = tstl.createTableIndexExpression(obj, index);
            const operatorExpression = this.transformBinaryOperation(
                node,
                accessExpression,
                tstl.createParenthesizedExpression(right),
                replacementOperator
            );
            const assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            return tstl.createDoStatement([objAndIndexDeclaration, assignStatement]);

        } else {
            // Simple statements
            // ${left} = ${left} ${replacementOperator} ${right}
            const operatorExpression = this.transformBinaryOperation(node, left, right, replacementOperator);
            return this.transformAssignment(lhs, operatorExpression);
        }
    }

    public transformUnaryBitLibOperation(
        node: ts.Node,
        expression: tstl.Expression,
        operator: tstl.UnaryBitwiseOperator,
        lib: string
    ): ExpressionVisitResult
    {
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

    public transformUnaryBitOperation(
        node: ts.Node,
        expression: tstl.Expression,
        operator: tstl.UnaryBitwiseOperator
    ): ExpressionVisitResult
    {
        switch (this.options.luaTarget) {
            case LuaTarget.Lua51:
                throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.options.luaTarget, node);

            case LuaTarget.Lua52:
                return this.transformUnaryBitLibOperation(node, expression, operator, "bit32");

            case LuaTarget.LuaJIT:
                return this.transformUnaryBitLibOperation(node, expression, operator, "bit");

            default:
                return tstl.createUnaryExpression(expression, operator, node);
        }
    }

    public transformBinaryBitLibOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: tstl.BinaryBitwiseOperator,
        lib: string
    ): ExpressionVisitResult
    {
        let bitFunction: string;
        switch (operator) {
            case tstl.SyntaxKind.BitwiseAndOperator:
                bitFunction = "band";
                break;
            case tstl.SyntaxKind.BitwiseOrOperator:
                bitFunction = "bor";
                break;
            case tstl.SyntaxKind.BitwiseExclusiveOrOperator:
                bitFunction = "bxor";
                break;
            case tstl.SyntaxKind.BitwiseLeftShiftOperator:
                bitFunction = "lshift";
                break;
            case tstl.SyntaxKind.BitwiseRightShiftOperator:
                bitFunction = "rshift";
                break;
            case tstl.SyntaxKind.BitwiseArithmeticRightShift:
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

    public transformBinaryBitOperation(
        node: ts.Node,
        left: tstl.Expression,
        right: tstl.Expression,
        operator: tstl.BinaryBitwiseOperator
    ): ExpressionVisitResult
    {
        switch (this.options.luaTarget) {
            case LuaTarget.Lua51:
                throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.options.luaTarget, node);

            case LuaTarget.Lua52:
                return this.transformBinaryBitLibOperation(node, left, right, operator, "bit32");

            case LuaTarget.LuaJIT:
                return this.transformBinaryBitLibOperation(node, left, right, operator, "bit");

            default:
                if (operator === tstl.SyntaxKind.BitwiseArithmeticRightShift) {
                    throw TSTLErrors.UnsupportedForTarget("Bitwise >>> operator", this.options.luaTarget, node);
                }
                return tstl.createBinaryExpression(left, right, operator, node);
        }
    }

    public transformProtectedConditionalExpression(expression: ts.ConditionalExpression): tstl.CallExpression {
        const condition = this.transformExpression(expression.condition);
        const val1 = this.transformExpression(expression.whenTrue);
        const val2 = this.transformExpression(expression.whenFalse);

        const val1Function = this.wrapInFunctionCall(val1);
        const val2Function = this.wrapInFunctionCall(val2);

        // ((condition and (() => v1)) or (() => v2))()
        const conditionAnd = tstl.createBinaryExpression(condition, val1Function, tstl.SyntaxKind.AndOperator);
        const orExpression = tstl.createBinaryExpression(conditionAnd, val2Function, tstl.SyntaxKind.OrOperator);
        return tstl.createCallExpression(orExpression, [], expression);
    }

    public transformConditionalExpression(expression: ts.ConditionalExpression): tstl.Expression {
        const isStrict = this.options.strict || this.options.strictNullChecks;
        if (tsHelper.isFalsible(this.checker.getTypeAtLocation(expression.whenTrue), isStrict)) {
          return this.transformProtectedConditionalExpression(expression);
        }
        const condition = this.transformExpression(expression.condition);
        const val1 = this.transformExpression(expression.whenTrue);
        const val2 = this.transformExpression(expression.whenFalse);

        // (condition and v1) or v2
        const conditionAnd = tstl.createBinaryExpression(condition, val1, tstl.SyntaxKind.AndOperator);
        return tstl.createBinaryExpression(
            conditionAnd,
            val2,
            tstl.SyntaxKind.OrOperator,
            expression
        );
    }

    public transformPostfixUnaryExpression(expression: ts.PostfixUnaryExpression): tstl.Expression {
        switch (expression.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    tstl.SyntaxKind.AdditionOperator,
                    true
                );

            case ts.SyntaxKind.MinusMinusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    tstl.SyntaxKind.SubractionOperator,
                    true
                );

            default:
                throw TSTLErrors.UnsupportedKind("unary postfix operator", expression.operator, expression);
        }
    }

    public transformPrefixUnaryExpression(expression: ts.PrefixUnaryExpression): tstl.Expression {
        switch (expression.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    tstl.SyntaxKind.AdditionOperator,
                    false
                );

            case ts.SyntaxKind.MinusMinusToken:
                return this.transformCompoundAssignmentExpression(
                    expression,
                    expression.operand,
                    ts.createLiteral(1),
                    tstl.SyntaxKind.SubractionOperator,
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

    public transformArrayLiteral(node: ts.ArrayLiteralExpression): tstl.TableExpression {
        const values: tstl.TableFieldExpression[] = [];

        node.elements.forEach(child => {
            values.push(tstl.createTableFieldExpression(this.transformExpression(child), undefined, child));
        });

        return tstl.createTableExpression(values, node);
    }

    public transformObjectLiteral(node: ts.ObjectLiteralExpression): tstl.TableExpression {
        const properties: tstl.TableFieldExpression[] = [];
        // Add all property assignments
        node.properties.forEach(element => {
            const name = this.transformPropertyName(element.name);
            if (ts.isPropertyAssignment(element)) {
                const expression = this.transformExpression(element.initializer);
                properties.push(tstl.createTableFieldExpression(expression, name, element));
            } else if (ts.isShorthandPropertyAssignment(element)) {
                const identifier = this.transformIdentifier(element.name);
                properties.push(tstl.createTableFieldExpression(identifier, name, element));
            } else if (ts.isMethodDeclaration(element)) {
                const expression = this.transformFunctionExpression(element, this.createSelfIdentifier());
                properties.push(tstl.createTableFieldExpression(expression, name, element));
            } else {
                throw TSTLErrors.UnsupportedKind("object literal element", element.kind, node);
            }
        });

        return tstl.createTableExpression(properties, node);
    }

    public transformDeleteExpression(expression: ts.DeleteExpression): tstl.CallExpression {
        const lhs = this.transformExpression(expression.expression) as tstl.IdentifierOrTableIndexExpression;
        const assignment = tstl.createAssignmentStatement(
            lhs,
            tstl.createNilLiteral(),
            expression
        );

        return this.createImmediatelyInvokedFunctionExpression(
            [assignment],
            [tstl.createBooleanLiteral(true)],
            expression
        );
    }

    public transformFunctionExpression(
        node: ts.FunctionLikeDeclaration,
        context: tstl.Identifier | undefined
    ): ExpressionVisitResult
    {
        const type = this.checker.getTypeAtLocation(node);
        const hasContext = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void;
        // Build parameter string
        const [paramNames, dotsLiteral, spreadIdentifier] = this.transformParameters(
            node.parameters,
            hasContext ? context : undefined
        );

        let body: ts.Block;
        if (ts.isBlock(node.body)) {
            body = node.body;
        } else {
            const returnExpression = ts.createReturn(node.body);
            body = ts.createBlock([returnExpression]);
            returnExpression.parent = body;
            body.parent = node.body.parent;
        }
        const [transformedBody] = this.transformFunctionBody(node.parameters, body, spreadIdentifier);

        return tstl.createFunctionExpression(
            tstl.createBlock(transformedBody),
            paramNames,
            dotsLiteral,
            spreadIdentifier,
            node
        );
    }

    public transformNewExpression(node: ts.NewExpression): tstl.CallExpression {
        const name = this.transformExpression(node.expression);
        const sig = this.checker.getResolvedSignature(node);
        const params = node.arguments
            ? this.transformArguments(node.arguments, sig)
            : [tstl.createBooleanLiteral(true)];

        const type = this.checker.getTypeAtLocation(node);
        const classDecorators = tsHelper.getCustomDecorators(type, this.checker);

        this.checkForLuaLibType(type);

        if (classDecorators.has(DecoratorKind.Extension) || classDecorators.has(DecoratorKind.MetaExtension)) {
            throw TSTLErrors.InvalidNewExpressionOnExtension(node);
        }

        if (classDecorators.has(DecoratorKind.CustomConstructor)) {
            const customDecorator = classDecorators.get(DecoratorKind.CustomConstructor);
            if (!customDecorator.args[0]) {
                throw TSTLErrors.InvalidDecoratorArgumentNumber("!CustomConstructor", 0, 1, node);
            }
            return tstl.createCallExpression(
                tstl.createIdentifier(customDecorator.args[0]),
                this.transformArguments(node.arguments),
                node
            );
        }

        return tstl.createCallExpression(
            tstl.createTableIndexExpression(name, tstl.createStringLiteral("new")),
            params,
            node
        );
    }

    public transformParenthesizedExpression(expression: ts.ParenthesizedExpression): tstl.Expression {
        return tstl.createParenthesizedExpression(
            this.transformExpression(expression.expression),
            expression
        );
    }

    public transformSuperKeyword(expression: ts.SuperExpression): tstl.Expression {
        const classDeclaration = this.classStack[this.classStack.length - 1];
        const extendsExpression = tsHelper.getExtendedTypeNode(classDeclaration, this.checker).expression;
        let baseClassName: tstl.IdentifierOrTableIndexExpression;
        if (ts.isIdentifier(extendsExpression)) {
            // Use "baseClassName" if base is a simple identifier
            baseClassName = this.addExportToIdentifier(this.transformIdentifier(extendsExpression));
        } else {
            // Use "className.____super" if the base is not a simple identifier
            baseClassName = tstl.createTableIndexExpression(
                this.addExportToIdentifier(this.transformIdentifier(classDeclaration.name)),
                tstl.createStringLiteral("____super"),
                expression
            );
        }
        return tstl.createTableIndexExpression(baseClassName, tstl.createStringLiteral("prototype"));
    }

    public transformCallExpression(node: ts.CallExpression): tstl.Expression {
        // Check for calls on primitives to override
        let parameters: tstl.Expression[] = [];

        const isTupleReturn = tsHelper.isTupleReturnCall(node, this.checker);
        const isTupleReturnForward =
            node.parent && ts.isReturnStatement(node.parent) && tsHelper.isInTupleReturnFunction(node, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(node);
        const isInSpread = node.parent && ts.isSpreadElement(node.parent);
        const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);
        const wrapResult = isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment
            && !isInSpread && returnValueIsUsed;

        if (ts.isPropertyAccessExpression(node.expression)) {
            const result = this.transformPropertyCall(node);
            return wrapResult ? this.wrapInTable(result) : result;
        }

        if (ts.isElementAccessExpression(node.expression)) {
            const result = this.transformElementCall(node);
            return wrapResult ? this.wrapInTable(result) : result;
        }

        const signature = this.checker.getResolvedSignature(node);

        // Handle super calls properly
        if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
            parameters = this.transformArguments(node.arguments, signature, ts.createThis());

            return tstl.createCallExpression(
                tstl.createTableIndexExpression(
                    this.transformSuperKeyword(ts.createSuper()),
                    tstl.createStringLiteral("____constructor")
                ),
                parameters
            );
        }

        const callPath = this.transformExpression(node.expression);
        const signatureDeclaration = signature.getDeclaration();
        if (signatureDeclaration
            && !ts.isPropertyAccessExpression(node.expression)
            && tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) === ContextType.NonVoid
            && !ts.isElementAccessExpression(node.expression))
        {
            const context = this.isStrict ? ts.createNull() : ts.createIdentifier("_G");
            parameters = this.transformArguments(node.arguments, signature, context);
        } else {
            parameters = this.transformArguments(node.arguments, signature);
        }

        const expressionType = this.checker.getTypeAtLocation(node.expression);
        if (expressionType.symbol && expressionType.symbol.escapedName === "SymbolConstructor") {
            return this.transformLuaLibFunction(LuaLibFeature.Symbol, node, ...parameters);
        }

        const callExpression = tstl.createCallExpression(callPath, parameters);
        return wrapResult ? this.wrapInTable(callExpression) : callExpression;
    }

    public transformPropertyCall(node: ts.CallExpression): tstl.Expression {
        let parameters: tstl.Expression[] = [];

        // Check if call is actually on a property access expression
        if (!ts.isPropertyAccessExpression(node.expression)) {
            throw TSTLErrors.InvalidPropertyCall(node);
        }

        // If the function being called is of type owner.func, get the type of owner
        const ownerType = this.checker.getTypeAtLocation(node.expression.expression);

        if (ownerType.symbol && ownerType.symbol.escapedName === "Math") {
            return this.transformMathCallExpression(node);
        }

        if (ownerType.symbol && ownerType.symbol.escapedName === "StringConstructor") {
            return tstl.createCallExpression(
                this.transformStringExpression(node.expression.name),
                this.transformArguments(node.arguments),
                node
            );
        }

        if (ownerType.symbol && ownerType.symbol.escapedName === "ObjectConstructor") {
            return this.transformObjectCallExpression(node);
        }

        if (ownerType.symbol && ownerType.symbol.escapedName === "SymbolConstructor") {
            return this.transformSymbolCallExpression(node);
        }

        switch (ownerType.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transformStringCallExpression(node);
        }

        // if ownerType is a array, use only supported functions
        if (tsHelper.isExplicitArrayType(ownerType, this.checker)) {
            return this.transformArrayCallExpression(node);
        }

        // if ownerType inherits from an array, use array calls where appropriate
        if (tsHelper.isArrayType(ownerType, this.checker) &&
            tsHelper.isDefaultArrayCallMethodName(node.expression.name.escapedText as string)) {
            return this.transformArrayCallExpression(node);
        }

        if (tsHelper.isFunctionType(ownerType, this.checker)) {
            return this.transformFunctionCallExpression(node);
        }

        const signature = this.checker.getResolvedSignature(node);

        // Get the type of the function
        if (node.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
            // Super calls take the format of super.call(self,...)
            parameters = this.transformArguments(node.arguments, signature, ts.createThis());
            return tstl.createCallExpression(this.transformExpression(node.expression), parameters);
        } else {
            // Replace last . with : here
            const name = node.expression.name.escapedText;
            if (name === "toString") {
                const toStringIdentifier = tstl.createIdentifier("tostring");
                return tstl.createCallExpression(
                    toStringIdentifier, [this.transformExpression(node.expression.expression)], node);
            } else if (name === "hasOwnProperty") {
                const expr = this.transformExpression(node.expression.expression);
                parameters = this.transformArguments(node.arguments, signature);
                const rawGetIdentifier = tstl.createIdentifier("rawget");
                const rawGetCall = tstl.createCallExpression(rawGetIdentifier, [expr, ...parameters]);
                return tstl.createBinaryExpression(
                    rawGetCall, tstl.createNilLiteral(), tstl.SyntaxKind.InequalityOperator, node);
            } else {
                const parameters = this.transformArguments(node.arguments, signature);
                const table = this.transformExpression(node.expression.expression);
                const signatureDeclaration = signature.getDeclaration();
                if (!signatureDeclaration
                    || tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) !== ContextType.Void)
                {
                    // table:name()
                    return tstl.createMethodCallExpression(
                        table,
                        tstl.createIdentifier(name),
                        parameters,
                        node
                    );
                } else {
                    // table.name()
                    const callPath = tstl.createTableIndexExpression(table, tstl.createStringLiteral(name));
                    return tstl.createCallExpression(callPath, parameters, node);
                }
            }
        }
    }

    public transformElementCall(node: ts.CallExpression): tstl.CallExpression {
        if (!ts.isElementAccessExpression(node.expression)) {
            throw TSTLErrors.InvalidElementCall(node);
        }

        const signature = this.checker.getResolvedSignature(node);
        let parameters = this.transformArguments(node.arguments, signature);

        const signatureDeclaration = signature.getDeclaration();
        if (!signatureDeclaration
            || tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) !== ContextType.Void) {
            // Pass left-side as context

            const context = this.transformExpression(node.expression.expression);
            if (tsHelper.isExpressionWithEvaluationEffect(node.expression.expression)) {
                // Inject context parameter
                if (node.arguments.length > 0) {
                    parameters.unshift(tstl.createIdentifier("____TS_self"));
                } else {
                    parameters = [tstl.createIdentifier("____TS_self")];
                }

                // Cache left-side if it has effects
                //(function() local ____TS_self = context; return ____TS_self[argument](parameters); end)()
                const argument = this.transformExpression(node.expression.argumentExpression);
                const selfIdentifier = tstl.createIdentifier("____TS_self");
                const selfAssignment = tstl.createVariableDeclarationStatement(selfIdentifier, context);
                const index = tstl.createTableIndexExpression(selfIdentifier, argument);
                const callExpression = tstl.createCallExpression(index, parameters);
                return this.createImmediatelyInvokedFunctionExpression([selfAssignment], callExpression, node);
            } else {
                return tstl.createCallExpression(this.transformExpression(node.expression), [context, ...parameters]);
            }
        } else {
            // No context
            return tstl.createCallExpression(this.transformExpression(node.expression), parameters);
        }
    }

    public transformArguments<T extends ts.Expression>(
        params: ts.NodeArray<ts.Expression>,
        sig?: ts.Signature, context?: T
    ): tstl.Expression[]
    {
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
            params.forEach(param => {
                parameters.push(this.transformExpression(param));
            });
        }

        return parameters;
    }

    public transformPropertyAccessExpression(node: ts.PropertyAccessExpression): tstl.Expression {
        const property = node.name.text;

        // Check for primitive types to override
        const type = this.checker.getTypeAtLocation(node.expression);
        if (tsHelper.isStringType(type)) {
            return this.transformStringProperty(node);

        } else if (tsHelper.isArrayType(type, this.checker)) {
            const arrayPropertyAccess = this.transformArrayProperty(node);
            if (arrayPropertyAccess) {
                return arrayPropertyAccess;
            }

        } else if (type.symbol && (type.symbol.flags & ts.SymbolFlags.ConstEnum)) {
            return this.transformConstEnumValue(type, property, node);
        }

        this.checkForLuaLibType(type);

        const decorators = tsHelper.getCustomDecorators(type, this.checker);
        // Do not output path for member only enums
        if (decorators.has(DecoratorKind.CompileMembersOnly)) {
            return tstl.createIdentifier(property, node);
        }

        // Catch math expressions
        if (ts.isIdentifier(node.expression)) {
            if (node.expression.escapedText === "Math") {
                return this.transformMathExpression(node.name);
            } else if (node.expression.escapedText === "Symbol") {
                // Pull in Symbol lib
                this.importLuaLibFeature(LuaLibFeature.Symbol);
            }
        }

        const callPath = this.transformExpression(node.expression);
        return tstl.createTableIndexExpression(callPath, tstl.createStringLiteral(property), node);
    }

    // Transpile a Math._ property
    public transformMathExpression(identifier: ts.Identifier): tstl.Expression {
        const name = identifier.escapedText as string;
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
                throw TSTLErrors.UnsupportedProperty("math", name, identifier);
        }
    }

    // Transpile a Math._ property
    public transformMathCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transformArguments(node.arguments);
        const expressionName = expression.name.escapedText as string;
        switch (expressionName) {
            // math.tan(x / y)
            case "atan2":
            {
                const math = tstl.createIdentifier("math");
                const atan = tstl.createStringLiteral("atan");
                const div = tstl.createBinaryExpression(params[0], params[1], tstl.SyntaxKind.DivisionOperator);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, atan), [div], node);
            }

            // (math.log(x) / Math.LNe)
            case "log10":
            case "log2":
            {
                const math = tstl.createIdentifier("math");
                const log1 = tstl.createTableIndexExpression(math, tstl.createStringLiteral("log"));
                const logCall1 = tstl.createCallExpression(log1, params);
                const e = tstl.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
                const div = tstl.createBinaryExpression(logCall1, e, tstl.SyntaxKind.DivisionOperator);
                return tstl.createParenthesizedExpression(div, node);
            }

            // math.log(1 + x)
            case "log1p":
            {
                const math = tstl.createIdentifier("math");
                const log = tstl.createStringLiteral("log");
                const one = tstl.createNumericLiteral(1);
                const add = tstl.createBinaryExpression(one, params[0], tstl.SyntaxKind.AdditionOperator);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, log), [add], node);
            }

            // math.floor(x + 0.5)
            case "round":
            {
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
            case "tan":
            {
                const math = tstl.createIdentifier("math");
                const method = tstl.createStringLiteral(expressionName);
                return tstl.createCallExpression(tstl.createTableIndexExpression(math, method), params, node);
            }

            default:
                throw TSTLErrors.UnsupportedProperty("math", name, expression);
        }
    }

    // Transpile access of string properties, only supported properties are allowed
    public transformStringProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression {
        switch (node.name.escapedText) {
            case "length":
                return tstl.createUnaryExpression(
                    this.transformExpression(node.expression), tstl.SyntaxKind.LengthOperator, node);
            default:
                throw TSTLErrors.UnsupportedProperty("string", node.name.escapedText as string, node);
        }
    }

    // Transpile access of array properties, only supported properties are allowed
    public transformArrayProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression | undefined {
        switch (node.name.escapedText) {
            case "length":
                return tstl.createUnaryExpression(
                    this.transformExpression(node.expression), tstl.SyntaxKind.LengthOperator, node);
            default:
                return undefined;
        }
    }

    public transformElementAccessExpression(node: ts.ElementAccessExpression): tstl.Expression {
        const table = this.transformExpression(node.expression);
        const index = this.transformExpression(node.argumentExpression);

        const type = this.checker.getTypeAtLocation(node.expression);

        if (type.symbol && (type.symbol.flags & ts.SymbolFlags.ConstEnum)
            && ts.isStringLiteral(node.argumentExpression))
        {
            return this.transformConstEnumValue(type, node.argumentExpression.text, node);
        }

        if (tsHelper.isArrayType(type, this.checker)) {
            return tstl.createTableIndexExpression(table, this.expressionPlusOne(index), node);
        } else if (tsHelper.isStringType(type)) {
            return tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("sub")),
                [table, this.expressionPlusOne(index), this.expressionPlusOne(index)],
                node
            );
        } else {
            return tstl.createTableIndexExpression(table, index, node);
        }
    }

    private transformConstEnumValue(enumType: ts.EnumType, memberName: string, tsOriginal: ts.Node): tstl.Expression {
        // Assumption: the enum only has one declaration
        const enumDeclaration = enumType.symbol.declarations.find(d => ts.isEnumDeclaration(d)) as ts.EnumDeclaration;
        const enumMember = enumDeclaration.members
            .find(m => ts.isIdentifier(m.name) && m.name.text === memberName);

        if (enumMember) {
            if (enumMember.initializer) {
                if (ts.isIdentifier(enumMember.initializer)) {
                    const [isEnumMember, valueName] = tsHelper.isEnumMember(enumDeclaration, enumMember.initializer);
                    if (isEnumMember) {
                        if (ts.isIdentifier(valueName)) {
                            return this.transformConstEnumValue(enumType, valueName.text, tsOriginal);
                        }
                    } else {
                        return tstl.setNodeOriginal(this.transformExpression(enumMember.initializer), tsOriginal);
                    }
                } else {
                    return tstl.setNodeOriginal(this.transformExpression(enumMember.initializer), tsOriginal);
                }
            } else {
                let enumValue = 0;
                for (const member of enumDeclaration.members) {
                    if (member === enumMember) {
                        return tstl.createNumericLiteral(enumValue, tsOriginal);
                    }
                    if (member.initializer === undefined) {
                        enumValue++;
                    } else if (ts.isNumericLiteral(member.initializer)) {
                        enumValue = Number(member.initializer.text) + 1;
                    }
                }

                throw TSTLErrors.CouldNotFindEnumMember(enumDeclaration, memberName, tsOriginal);
            }
        }
        throw TSTLErrors.CouldNotFindEnumMember(enumDeclaration, memberName, tsOriginal);
    }

    public transformStringCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transformArguments(node.arguments);
        const caller = this.transformExpression(expression.expression);

        const expressionName = expression.name.escapedText as string;
        switch (expressionName) {
            case "replace":
                return this.transformLuaLibFunction(LuaLibFeature.StringReplace, node, caller, ...params);
            case "concat":
                return this.transformLuaLibFunction(LuaLibFeature.StringConcat, node, caller, ...params);
            case "indexOf":
                const stringExpression =
                    node.arguments.length === 1
                        ? this.createStringCall("find", node, caller, params[0])
                        : this.createStringCall(
                              "find", node, caller, params[0],
                              this.expressionPlusOne(params[1]),
                              tstl.createBooleanLiteral(true)
                            );

                return tstl.createBinaryExpression(
                    tstl.createBinaryExpression(
                        stringExpression,
                        tstl.createNumericLiteral(0),
                        tstl.SyntaxKind.OrOperator
                    ),
                    tstl.createNumericLiteral(1),
                    tstl.SyntaxKind.SubractionOperator,
                    node
                );
            case "substr":
                if (node.arguments.length === 1) {
                    const arg1 = this.expressionPlusOne(this.transformExpression(node.arguments[0]));
                    return this.createStringCall("sub", node, caller, arg1);
                } else {
                    const arg1 = params[0];
                    const arg2 = params[1];
                    const sumArg = tstl.createBinaryExpression(arg1, arg2, tstl.SyntaxKind.AdditionOperator);
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
                }
                else if (node.arguments.length === 1) {
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
            case "charCodeAt":
            {
                const firstParamPlusOne = this.expressionPlusOne(params[0]);
                return this.createStringCall("byte", node, caller, firstParamPlusOne);
            }
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
                if (ts.isStringLiteral(expression.expression)) {
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

    public createStringCall(
        methodName: string,
        tsOriginal: ts.Node,
        ...params: tstl.Expression[]
    ): tstl.CallExpression
    {
        const stringIdentifier = tstl.createIdentifier("string");
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(stringIdentifier, tstl.createStringLiteral(methodName)),
            params,
            tsOriginal
        );
    }

    // Transpile a String._ property
    public transformStringExpression(identifier: ts.Identifier): ExpressionVisitResult {
        const identifierString = identifier.escapedText as string;

        switch (identifierString) {
            case "fromCharCode":
                return tstl.createTableIndexExpression(
                    tstl.createIdentifier("string"),
                    tstl.createStringLiteral("char")
                );
            default:
                throw TSTLErrors.UnsupportedForTarget(
                    `string property ${identifierString}`,
                    this.options.luaTarget,
                    identifier
                );
        }
    }

    // Transpile an Object._ property
    public transformObjectCallExpression(expression: ts.CallExpression): ExpressionVisitResult {
        const method = expression.expression as ts.PropertyAccessExpression;
        const parameters = this.transformArguments(expression.arguments);
        const caller = this.transformExpression(expression.expression);
        const methodName = method.name.escapedText;

        switch (methodName) {
            case "assign":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectAssign, expression, ...parameters);
            case "entries":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectEntries, expression, ...parameters);
            case "keys":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectKeys, expression, ...parameters);
            case "values":
                return this.transformLuaLibFunction(LuaLibFeature.ObjectValues, expression, ...parameters);
            default:
                throw TSTLErrors.UnsupportedForTarget(
                    `object property ${methodName}`,
                    this.options.luaTarget,
                    expression
                );
        }
    }

    // Transpile a Symbol._ property
    public transformSymbolCallExpression(expression: ts.CallExpression): tstl.CallExpression {
        const method = expression.expression as ts.PropertyAccessExpression;
        const parameters = this.transformArguments(expression.arguments);
        const methodName = method.name.escapedText;

        switch (methodName) {
            case "for":
            case "keyFor":
                this.importLuaLibFeature(LuaLibFeature.SymbolRegistry);
                const upperMethodName = methodName[0].toUpperCase() + methodName.slice(1);
                const functionIdentifier = tstl.createIdentifier(`__TS__SymbolRegistry${upperMethodName}`);
                return tstl.createCallExpression(functionIdentifier, parameters, expression);
            default:
                throw TSTLErrors.UnsupportedForTarget(
                    `symbol property ${methodName}`,
                    this.options.luaTarget,
                    expression
                );
        }
    }

    public transformArrayCallExpression(node: ts.CallExpression): tstl.CallExpression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transformArguments(node.arguments);
        const caller = this.transformExpression(expression.expression);
        const expressionName = expression.name.escapedText;
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
            case "findIndex":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFindIndex, node, caller, ...params);
            case "indexOf":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayIndexOf, node, caller, ...params);
            case "map":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayMap, node, caller, ...params);
            case "filter":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFilter, node, caller, ...params);
            case "some":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySome, node, caller, ...params);
            case "every":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayEvery, node, caller, ...params);
            case "slice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySlice, node, caller, ...params);
            case "splice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySplice, node, caller, ...params);
            case "join":
                const parameters = node.arguments.length === 0
                    ? [caller, tstl.createStringLiteral(",")]
                    : [caller].concat(params);

                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("concat")),
                    parameters,
                    node
                );
            default:
                throw TSTLErrors.UnsupportedProperty("array", expressionName as string, node);
        }
    }

    public transformFunctionCallExpression(node: ts.CallExpression): tstl.CallExpression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const callerType = this.checker.getTypeAtLocation(expression.expression);
        if (tsHelper.getFunctionContextType(callerType, this.checker) === ContextType.Void) {
            throw TSTLErrors.UnsupportedMethodConversion(node);
        }
        const params = this.transformArguments(node.arguments);
        const caller = this.transformExpression(expression.expression);
        const expressionName = expression.name.escapedText;
        switch (expressionName) {
            case "apply":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionApply, node, caller, ...params);
            case "bind":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionBind, node, caller, ...params);
            case "call":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionCall, node, caller, ...params);
            default:
                throw TSTLErrors.UnsupportedProperty("function", expressionName as string, node);
        }
    }

    public transformArrayBindingElement(name: ts.ArrayBindingElement): tstl.Identifier {
        if (ts.isOmittedExpression(name)) {
            return tstl.createIdentifier("__", name);
        } else if (ts.isIdentifier(name)) {
            return this.transformIdentifier(name);
        } else if (ts.isBindingElement(name) && ts.isIdentifier(name.name)) {
            return this.transformIdentifier(name.name);
        } else {
            throw TSTLErrors.UnsupportedKind("array binding element", name.kind, name);
        }
    }

    public transformAssertionExpression(node: ts.AssertionExpression): tstl.Expression {
        this.validateFunctionAssignment(
            node,
            this.checker.getTypeAtLocation(node.expression),
            this.checker.getTypeAtLocation(node.type)
        );
        return this.transformExpression(node.expression);
    }

    public transformTypeOfExpression(node: ts.TypeOfExpression): ExpressionVisitResult {
        const expression = this.transformExpression(node.expression);
        const typeFunctionIdentifier = tstl.createIdentifier("type");
        const typeCall = tstl.createCallExpression(typeFunctionIdentifier, [expression]);
        const tableString = tstl.createStringLiteral("table");
        const objectString = tstl.createStringLiteral("object");
        const condition = tstl.createBinaryExpression(typeCall, tableString, tstl.SyntaxKind.EqualityOperator);
        const andClause = tstl.createBinaryExpression(condition, objectString, tstl.SyntaxKind.AndOperator);

        return tstl.createBinaryExpression(
            andClause,
            tstl.cloneNode(typeCall),
            tstl.SyntaxKind.OrOperator,
            node
        );
    }

    public transformSpreadElement(expression: ts.SpreadElement): ExpressionVisitResult {
        const innerExpression = this.transformExpression(expression.expression);
        if (tsHelper.isTupleReturnCall(expression.expression, this.checker)) {
            return innerExpression;
        } else {
            return this.createUnpackCall(innerExpression, expression);
        }
    }

    public transformStringLiteral(literal: ts.StringLiteralLike): tstl.StringLiteral {
        const text = tsHelper.escapeString(literal.text);
        return tstl.createStringLiteral(text);
    }

    public transformNumericLiteral(literal: ts.NumericLiteral): tstl.NumericLiteral {
        const value = Number(literal.text);
        return tstl.createNumericLiteral(value, literal);
    }

    public transformTrueKeyword(trueKeyword: ts.BooleanLiteral): tstl.BooleanLiteral {
        return tstl.createBooleanLiteral(true, trueKeyword);
    }

    public transformFalseKeyword(falseKeyword: ts.BooleanLiteral): tstl.BooleanLiteral {
        return tstl.createBooleanLiteral(false, falseKeyword);
    }

    public transformNullOrUndefinedKeyword(originalNode: ts.Node): tstl.NilLiteral {
        return tstl.createNilLiteral(originalNode);
    }

    public transformThisKeyword(thisKeyword: ts.ThisExpression): tstl.Expression {
        return this.createSelfIdentifier(thisKeyword);
    }

    public transformTemplateExpression(expression: ts.TemplateExpression): tstl.BinaryExpression {
        const parts: tstl.Expression[] = [tstl.createStringLiteral(tsHelper.escapeString(expression.head.text))];
        expression.templateSpans.forEach(span => {
            const expr = this.transformExpression(span.expression);
            const text = tstl.createStringLiteral(tsHelper.escapeString(span.literal.text));

            // tostring(expr).."text"
            parts.push(tstl.createBinaryExpression(
                tstl.createCallExpression(tstl.createIdentifier("tostring"), [expr]),
                text,
                tstl.SyntaxKind.ConcatOperator)
            );
        });
        return parts.reduce((prev, current) => tstl.createBinaryExpression(
            prev,
            current,
            tstl.SyntaxKind.ConcatOperator)
        ) as tstl.BinaryExpression;
    }

    public transformPropertyName(propertyName: ts.PropertyName): tstl.Expression {
        if (ts.isComputedPropertyName(propertyName)) {
            return this.transformExpression(propertyName.expression);
        } else if (ts.isStringLiteral(propertyName)) {
            return this.transformStringLiteral(propertyName);
        } else if (ts.isNumericLiteral(propertyName)) {
            const value = Number(propertyName.text);
            return tstl.createNumericLiteral(value, propertyName);
        } else {
            return tstl.createStringLiteral(this.transformIdentifier(propertyName).text);
        }
    }

    public transformIdentifier(expression: ts.Identifier): tstl.Identifier {
        if (expression.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
            return tstl.createIdentifier("nil");  // TODO this is a hack that allows use to keep Identifier
                                                  // as return time as changing that would break a lot of stuff.
                                                  // But this should be changed to retun tstl.createNilLiteral()
                                                  // at some point.
        }

        let escapedText = expression.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3 && escapedText.charCodeAt(0) === underScoreCharCode &&
            escapedText.charCodeAt(1) === underScoreCharCode && escapedText.charCodeAt(2) === underScoreCharCode) {
            escapedText = escapedText.substr(1);
        }

        if (this.luaKeywords.has(escapedText)) {
            throw TSTLErrors.KeywordIdentifier(expression);
        }

        const symbolId = this.getIdentifierSymbolId(expression);
        return tstl.createIdentifier(escapedText, expression, symbolId);
    }

    public transformIdentifierExpression(expression: ts.Identifier): tstl.IdentifierOrTableIndexExpression {
        const identifier = this.transformIdentifier(expression);
        if (this.isIdentifierExported(identifier)) {
            return this.createExportedIdentifier(identifier);
        }
        return identifier;
    }

    public isIdentifierExported(identifier: tstl.Identifier): boolean {
        if (!this.isModule && !this.currentNamespace) {
            return false;
        }

        const symbolInfo = identifier.symbolId && this.symbolInfo.get(identifier.symbolId);
        if (!symbolInfo) {
            return false;
        }

        const currentScope = this.currentNamespace ? this.currentNamespace : this.currentSourceFile;
        const scopeSymbol = this.checker.getSymbolAtLocation(currentScope)
            ? this.checker.getSymbolAtLocation(currentScope)
            : this.checker.getTypeAtLocation(currentScope).getSymbol();

        const it: Iterable<ts.Symbol> = {
            [Symbol.iterator]: () => scopeSymbol.exports.values(), // Why isn't ts.SymbolTable.values() iterable?
        };
        for (const symbol of it) {
            if (symbol === symbolInfo.symbol) {
                return true;
            }
        }
        return false;
    }

    public addExportToIdentifier(identifier: tstl.Identifier): tstl.IdentifierOrTableIndexExpression {
        if (this.isIdentifierExported(identifier)) {
            return this.createExportedIdentifier(identifier);
        }
        return identifier;
    }

    public createExportedIdentifier(identifier: tstl.Identifier): tstl.TableIndexExpression {
        const exportTable = this.currentNamespace
            ? this.transformIdentifier(this.currentNamespace.name as ts.Identifier)
            : tstl.createIdentifier("exports");

        return tstl.createTableIndexExpression(
            exportTable,
            tstl.createStringLiteral(identifier.text));
    }

    public transformLuaLibFunction(
        func: LuaLibFeature,
        tsParent: ts.Expression,
        ...params: tstl.Expression[]
    ): tstl.CallExpression
    {
        this.importLuaLibFeature(func);
        const functionIdentifier = tstl.createIdentifier(`__TS__${func}`);
        return tstl.createCallExpression(functionIdentifier, params, tsParent);
    }

    public checkForLuaLibType(type: ts.Type): void {
        if (type.symbol) {
            switch (this.checker.getFullyQualifiedName(type.symbol)) {
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
        }
    }

    public importLuaLibFeature(feature: LuaLibFeature): void {
        // Add additional lib requirements
        if (feature === LuaLibFeature.Map || feature === LuaLibFeature.Set) {
            this.luaLibFeatureSet.add(LuaLibFeature.InstanceOf);
        }

        this.luaLibFeatureSet.add(feature);
    }

    public createImmediatelyInvokedFunctionExpression(
        statements: tstl.Statement[],
        result: tstl.Expression | tstl.Expression[],
        tsOriginal: ts.Node
    ): tstl.CallExpression
    {
        const body = statements ? statements.slice(0) : [];
        body.push(tstl.createReturnStatement(Array.isArray(result) ? result : [result]));
        const iife = tstl.createFunctionExpression(tstl.createBlock(body));
        return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), [], tsOriginal);
    }

    public createUnpackCall(expression: tstl.Expression, tsOriginal: ts.Node): tstl.Expression {
        switch (this.options.luaTarget) {
            case LuaTarget.Lua51:
            case LuaTarget.LuaJIT:
                return tstl.createCallExpression(tstl.createIdentifier("unpack"), [expression], tsOriginal);

            case LuaTarget.Lua52:
            case LuaTarget.Lua53:
            default:
                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("unpack")),
                    [expression],
                    tsOriginal
                );
        }
    }

    private getAbsoluteImportPath(relativePath: string): string {
        if (relativePath.charAt(0) !== "." && this.options.baseUrl) {
            return path.resolve(this.options.baseUrl, relativePath);
        }
        return path.resolve(path.dirname(this.currentSourceFile.fileName), relativePath);
    }

    private getImportPath(relativePath: string): string {
        const rootDir = this.options.rootDir ? path.resolve(this.options.rootDir) : path.resolve(".");
        const absoluteImportPath = path.format(path.parse(this.getAbsoluteImportPath(relativePath)));
        const absoluteRootDirPath = path.format(path.parse(rootDir));
        if (absoluteImportPath.includes(absoluteRootDirPath)) {
            return this.formatPathToLuaPath(
                absoluteImportPath.replace(absoluteRootDirPath, "").slice(1));
        } else {
            throw TSTLErrors.UnresolvableRequirePath(undefined,
                `Cannot create require path. Module does not exist within --rootDir`,
                relativePath);
        }
    }

    private formatPathToLuaPath(filePath: string): string {
        filePath = filePath.replace(/\.json$/, "");
        if (process.platform === "win32") {
            // Windows can use backslashes
            filePath = filePath
                .replace(/\.\\/g, "")
                .replace(/\\/g, ".");
        }
        return filePath
            .replace(/\.\//g, "")
            .replace(/\//g, ".");
    }

    private shouldExportIdentifier(identifier: tstl.Identifier | tstl.Identifier[]): boolean {
        if (!this.isModule && !this.currentNamespace) {
            return false;
        }
        if (Array.isArray(identifier)) {
            return identifier.some(i => this.isIdentifierExported(i));
        } else {
            return this.isIdentifierExported(identifier);
        }
    }

    private createSelfIdentifier(tsOriginal?: ts.Node): tstl.Identifier {
        return tstl.createIdentifier("self", tsOriginal);
    }

    private createLocalOrExportedOrGlobalDeclaration(
        lhs: tstl.Identifier | tstl.Identifier[],
        rhs?: tstl.Expression,
        tsOriginal?: ts.Node,
        parent?: tstl.Node
    ): tstl.Statement[]
    {
        let declaration: tstl.VariableDeclarationStatement | undefined;
        let assignment: tstl.AssignmentStatement | undefined;

        const functionDeclaration = tsOriginal && ts.isFunctionDeclaration(tsOriginal) ? tsOriginal : undefined;

        if (this.shouldExportIdentifier(lhs)) {
            // exported
            if (!rhs) {
                return [];

            } else if (Array.isArray(lhs)) {
                assignment = tstl.createAssignmentStatement(
                    lhs.map(i => this.createExportedIdentifier(i)),
                    rhs,
                    tsOriginal,
                    parent
                );

            } else {
                assignment = tstl.createAssignmentStatement(
                    this.createExportedIdentifier(lhs),
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
                isFirstDeclaration = isLetOrConst || tsHelper.isFirstDeclaration(tsOriginal, this.checker);
            }
            if ((this.isModule || this.currentNamespace || insideFunction || isLetOrConst) && isFirstDeclaration) {
                // local
                const isFunctionType = functionDeclaration
                    || (tsOriginal && ts.isVariableDeclaration(tsOriginal) && tsOriginal.initializer
                        && tsHelper.isFunctionTypeAtLocation(tsOriginal.initializer, this.checker));
                if (isFunctionType) {
                    // Split declaration and assignment for cuntions to allow recursion
                    declaration = tstl.createVariableDeclarationStatement(lhs, undefined, tsOriginal, parent);
                    assignment = tstl.createAssignmentStatement(lhs, rhs, tsOriginal, parent);

                } else {
                    declaration = tstl.createVariableDeclarationStatement(lhs, rhs, tsOriginal, parent);
                }

                if (!this.options.noHoisting) {
                    // Remember local variable declarations for hoisting later
                    const scope = isLetOrConst || functionDeclaration
                        ? this.peekScope()
                        : this.findScope(ScopeType.Function | ScopeType.File);

                    if (!scope.variableDeclarations) { scope.variableDeclarations = []; }
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
            if (functionSymbolId !== undefined) {
                this.peekScope().functionDefinitions.get(functionSymbolId).assignment = assignment;
            }
        }

        if (declaration && assignment) {
            return [declaration, assignment];
        } else if (declaration) {
            return [declaration];
        } else {
            return [assignment];
        }
    }

    private validateFunctionAssignment(node: ts.Node, fromType: ts.Type, toType: ts.Type, toName?: string): void {
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
        const fromContext = tsHelper.getFunctionContextType(fromType, this.checker);
        const toContext = tsHelper.getFunctionContextType(toType, this.checker);

        if (fromContext === ContextType.Mixed || toContext === ContextType.Mixed) {
            throw TSTLErrors.UnsupportedOverloadAssignment(node, toName);
        } else if (fromContext !== toContext && fromContext !== ContextType.None && toContext !== ContextType.None) {
            if (toContext === ContextType.Void) {
                throw TSTLErrors.UnsupportedFunctionConversion(node, toName);
            } else {
                throw TSTLErrors.UnsupportedMethodConversion(node, toName);
            }
        }

        const fromTypeNode = this.checker.typeToTypeNode(fromType);
        const toTypeNode = this.checker.typeToTypeNode(toType);
        if (!fromTypeNode || !toTypeNode) {
            return;
        }

        if ((ts.isArrayTypeNode(toTypeNode) || ts.isTupleTypeNode(toTypeNode))
            && (ts.isArrayTypeNode(fromTypeNode) || ts.isTupleTypeNode(fromTypeNode))) {
            // Recurse into arrays/tuples
            const fromTypeReference = fromType as ts.TypeReference;
            const toTypeReference = toType as ts.TypeReference;
            const count = Math.min(fromTypeReference.typeArguments.length, toTypeReference.typeArguments.length);
            for (let i = 0; i < count; ++i) {
                this.validateFunctionAssignment(
                    node,
                    fromTypeReference.typeArguments[i],
                    toTypeReference.typeArguments[i],
                    toName
                );
            }
        }

        if ((toType.flags & ts.TypeFlags.Object) !== 0
            && ((toType as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0
            && toType.symbol && toType.symbol.members && fromType.symbol && fromType.symbol.members)
        {
            // Recurse into interfaces
            toType.symbol.members.forEach((toMember, memberName) => {
                const fromMember = fromType.symbol.members.get(memberName);
                if (fromMember) {
                    const toMemberType = this.checker.getTypeOfSymbolAtLocation(toMember, node);
                    const fromMemberType = this.checker.getTypeOfSymbolAtLocation(fromMember, node);
                    this.validateFunctionAssignment(
                        node, fromMemberType, toMemberType, toName ? `${toName}.${memberName}` : memberName.toString());
                }
            });
        }
    }

    private wrapInFunctionCall(expression: tstl.Expression): tstl.FunctionExpression {
        const returnStatement = tstl.createReturnStatement([expression]);
        return tstl.createFunctionExpression(tstl.createBlock([returnStatement]));
    }

    private wrapInTable(...expressions: tstl.Expression[]): tstl.ParenthesizedExpression {
        const fields = expressions.map(e => tstl.createTableFieldExpression(e));
        return tstl.createParenthesizedExpression(tstl.createTableExpression(fields));
    }

    private expressionPlusOne(expression: tstl.Expression): tstl.BinaryExpression {
        return tstl.createBinaryExpression(expression, tstl.createNumericLiteral(1), tstl.SyntaxKind.AdditionOperator);
    }

    private getIdentifierSymbolId(identifier: ts.Identifier): tstl.SymbolId {
        const symbol = this.checker.getSymbolAtLocation(identifier);
        let symbolId: number | undefined;
        if (symbol) {
            // Track first time symbols are seen
            if (!this.symbolIds.has(symbol)) {
                symbolId = this.genSymbolIdCounter++;
                const symbolInfo: SymbolInfo = {symbol, firstSeenAtPos: identifier.pos};
                this.symbolIds.set(symbol, symbolId);
                this.symbolInfo.set(symbolId, symbolInfo);
            } else {
                symbolId = this.symbolIds.get(symbol);
            }

            if (this.options.noHoisting) {
                // Check for reference-before-declaration
                const declaration = tsHelper.getFirstDeclaration(symbol, this.currentSourceFile);
                if (declaration && identifier.pos < declaration.pos) {
                    throw TSTLErrors.ReferencedBeforeDeclaration(identifier);
                }

            } else {
                //Mark symbol as seen in all current scopes
                this.scopeStack.forEach(s => {
                    if (!s.referencedSymbols) { s.referencedSymbols = new Set(); }
                    s.referencedSymbols.add(symbolId);
                });
            }
        }
        return symbolId;
    }

    protected findScope(scopeTypes: ScopeType): Scope | undefined {
        return this.scopeStack.slice().reverse().find(s => (scopeTypes & s.type) !== 0);
    }

    protected peekScope(): Scope {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    protected pushScope(scopeType: ScopeType, node: ts.Node): void {
        this.scopeStack.push({
            type: scopeType,
            id: this.genVarCounter,
        });
        this.genVarCounter++;
    }

    private shouldHoist(symbolId: tstl.SymbolId, scope: Scope): boolean {
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
                if (functionSymbolId !== symbolId // Don't recurse into self
                    && declaration.pos < functionDefinition.assignment.pos // Ignore functions before symbol declaration
                    && functionDefinition.referencedSymbols.has(symbolId)
                    && this.shouldHoist(functionSymbolId, scope))
                {
                    return true;
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

    protected hoistFunctionDefinitions(scope: Scope, statements: tstl.Statement[]): tstl.Statement[] {
        if (!scope.functionDefinitions) {
            return statements;
        }

        const result = statements.slice();
        const hoistedFunctions: tstl.AssignmentStatement[] = [];
        for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
            if (this.shouldHoist(functionSymbolId, scope)) {
                const i = result.indexOf(functionDefinition.assignment);
                result.splice(i, 1);
                hoistedFunctions.push(functionDefinition.assignment);
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
            const symbols = declaration.left.map(i => i.symbolId).filter(s => s !== undefined);
            if (symbols.some(s => this.shouldHoist(s, scope))) {
                let assignment: tstl.AssignmentStatement | undefined;
                if (declaration.right) {
                    assignment = tstl.createAssignmentStatement(
                        declaration.left,
                        declaration.right
                    );
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

        let result = this.hoistFunctionDefinitions(scope, statements);

        result = this.hoistVariableDeclarations(scope, result);

        return result;
    }

    protected popScope(): Scope {
        const scope = this.scopeStack.pop();
        return scope;
    }

    protected createHoistableVariableDeclarationStatement(
        identifier: ts.Identifier,
        initializer?: tstl.Expression,
        tsOriginal?: ts.Node,
        parent?: tstl.Node
    ): tstl.AssignmentStatement | tstl.VariableDeclarationStatement
    {
        const variable = this.transformIdentifier(identifier);
        const declaration = tstl.createVariableDeclarationStatement(variable, initializer, tsOriginal, parent);
        if (!this.options.noHoisting && variable.symbolId) {
            const scope = this.peekScope();
            if (!scope.variableDeclarations) { scope.variableDeclarations = []; }
            scope.variableDeclarations.push(declaration);
        }
        return declaration;
    }

    private statementVisitResultToStatementArray(visitResult: StatementVisitResult): tstl.Statement[] {
        if (!Array.isArray(visitResult)) {
            if (visitResult) {
                return [visitResult];
            }
            return [];
        }
        const flatten = (arr, result = []) => {
            for (let i = 0, length = arr.length; i < length; i++) {
                const value = arr[i];
                if (Array.isArray(value)) {
                    flatten(value, result);
                } else if (value) {
                    // ignore value if undefined
                    result.push(value);
                }
            }
            return result;
        };
        return flatten(visitResult);
    }
}
