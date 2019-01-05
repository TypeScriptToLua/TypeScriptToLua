import * as path from "path";
import * as ts from "typescript";

import {CompilerOptions, LuaLibImportKind, LuaTarget} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import * as tstl from "./LuaAST";
import {LuaLib, LuaLibFeature} from "./LuaLib";
import {ContextType, TSHelper as tsHelper} from "./TSHelper";
import {TSTLErrors} from "./TSTLErrors";

type StatementVisitResult = tstl.Statement | tstl.Statement[] | undefined;
type ExpressionVisitResult = tstl.Expression | undefined;

export enum ScopeType {
    Function,
    Switch,
    Loop,
}

interface Scope {
    type: ScopeType;
    id: number;
}

export class LuaTransformer {
    public luaKeywords: Set<string> = new Set([
        "and", "break", "do",  "else", "elseif", "end",    "false",  "for",  "function", "if",
        "in",  "local", "nil", "not",  "or",     "repeat", "return", "then", "until",    "while",
    ]);

    private selfIdentifier = tstl.createIdentifier("self");

    private isStrict = true;

    private checker: ts.TypeChecker;
    private options: CompilerOptions;
    private isModule: boolean;

    private currentSourceFile?: ts.SourceFile;

    private currentNamespace: ts.ModuleDeclaration;
    private classStack: tstl.Identifier[];

    private scopeStack: Scope[];
    private genVarCounter: number;

    private luaLibFeatureSet: Set<LuaLibFeature>;

    private readonly typeValidationCache: Map<ts.Type, Set<ts.Type>> = new Map<ts.Type, Set<ts.Type>>();

    public constructor(program: ts.Program) {
        this.checker = program.getTypeChecker();
        this.options = program.getCompilerOptions();
        this.isStrict = this.options.alwaysStrict || (this.options.strict && this.options.alwaysStrict !== false) ||
                        (this.isModule && this.options.target && this.options.target >= ts.ScriptTarget.ES2015);

        if (!this.options.luaTarget) {
            this.options.luaTarget = LuaTarget.LuaJIT;
        }

        this.setupState();
    }

    public setupState(): void {
        this.scopeStack = [];
        this.genVarCounter = 0;
        this.currentSourceFile = undefined;
        this.isModule = false;
        this.scopeStack = [];
        this.classStack = [];
        this.luaLibFeatureSet = new Set<LuaLibFeature>();
    }

    // TODO make all other methods private???
    public transformSourceFile(node: ts.SourceFile): tstl.Block {
        this.setupState();

        this.currentSourceFile = node;
        this.isModule = tsHelper.isFileModule(node);

        const statements = this.transformStatements(node.statements);

        const luaLibStatements = [];
        if ((this.options.luaLibImport === LuaLibImportKind.Require && this.luaLibFeatureSet.size > 0)
            || this.options.luaLibImport === LuaLibImportKind.Always) {
            // require helper functions
            const requireStatement = tstl.createExpressionStatement((tstl.createCallExpression(
                tstl.createIdentifier("require"),
                [tstl.createStringLiteral("lualib_bundle")]
            )));
            luaLibStatements.push(requireStatement);
        }

        // Inline lualib features
        if (this.options.luaLibImport === LuaLibImportKind.Inline && this.luaLibFeatureSet.size > 0) {
            //result += "\n" + "-- Lua Library Imports\n";
            luaLibStatements.push(tstl.createIdentifier(LuaLib.loadFeatures(this.luaLibFeatureSet)));
        }

        return tstl.createBlock(luaLibStatements.concat(statements), undefined, node);
    }

    public transformStatement(node: ts.Statement): StatementVisitResult {
        switch (node.kind) {
            // Block
            case ts.SyntaxKind.Block:
                return this.transformScopeBlock(node as ts.Block);
            // Declaration Statements
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
            default:
                throw TSTLErrors.UnsupportedKind("Statement", node.kind, node);
        }
    }

    /** Convers an array of ts.Statements into an array of tstl.Statements */
    public transformStatements(statements: ts.Statement[] | ReadonlyArray<ts.Statement>): tstl.Statement[] {
        const tstlStatements: tstl.Statement[] = [];
        (statements as ts.Statement[]).forEach(statement => {
            tstlStatements.push(...this.statementVisitResultToStatementArray(this.transformStatement(statement)));
        });
        return tstlStatements;
    }

    public transformBlock(block: ts.Block): tstl.Block {
        return tstl.createBlock(this.transformStatements(block.statements), undefined, block);
    }

    public transformScopeBlock(block: ts.Block): tstl.DoStatement {
        return tstl.createDoStatement(this.transformStatements(block.statements), undefined, block);
    }

    public transformImportDeclaration(statement: ts.ImportDeclaration): StatementVisitResult {
        if (!statement.importClause || !statement.importClause.namedBindings) {
            throw TSTLErrors.DefaultImportsNotSupported(statement);
        }

        const imports = statement.importClause.namedBindings;

        const result: tstl.Statement[] = [];

        const moduleSpecifier = statement.moduleSpecifier as ts.StringLiteral;
        const importPath = moduleSpecifier.text.replace(new RegExp("\"", "g"), "");
        const resolvedModuleSpecifier = tstl.createStringLiteral(this.getImportPath(importPath));

        const requireCall = tstl.createCallExpression(tstl.createIdentifier("require"), [resolvedModuleSpecifier]);

        if (ts.isNamedImports(imports)) {
            const filteredElements = imports.elements.filter(e => {
                const decorators = tsHelper.getCustomDecorators(this.checker.getTypeAtLocation(e), this.checker);
                return !decorators.has(DecoratorKind.Extension) && !decorators.has(DecoratorKind.MetaExtension);
            });

            // Elide import if all imported types are extension classes
            if (filteredElements.length === 0) {
                return undefined;
            }

            const importUniqueName = tstl.createIdentifier(path.basename((importPath)));
            const requireStatement = tstl.createVariableDeclarationStatement(
                tstl.createIdentifier(path.basename(importPath)), requireCall, undefined, statement);
            result.push(requireStatement);

            filteredElements.forEach(importSpecifier => {
                if (importSpecifier.propertyName) {
                    const propertyIdentifier = this.transformIdentifier(importSpecifier.propertyName);
                    const propertyName = tstl.createStringLiteral(propertyIdentifier.text);
                    const renamedImport = tstl.createVariableDeclarationStatement(
                        this.transformIdentifier(importSpecifier.name),
                        tstl.createTableIndexExpression(importUniqueName, propertyName),
                        undefined,
                        importSpecifier);
                    result.push(renamedImport);
                } else {
                    const nameIdentifier = this.transformIdentifier(importSpecifier.name);
                    const name = tstl.createStringLiteral(nameIdentifier.text);
                    const namedImport = tstl.createVariableDeclarationStatement(
                        nameIdentifier, tstl.createTableIndexExpression(importUniqueName, name), undefined, importSpecifier);
                    result.push(namedImport);
                }
            });
            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const requireStatement =
                tstl.createVariableDeclarationStatement(this.transformIdentifier(imports.name), requireCall, undefined, statement);
            result.push(requireStatement);
            return result;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }

    public transformClassDeclaration(statement: ts.ClassDeclaration, nameOverride?: tstl.Identifier): tstl.Statement[] {
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

        // Get type that is extended
        const extendsType = tsHelper.getExtendedType(statement, this.checker);

        // Get all properties with value
        const properties = statement.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);

        // Divide properties into static and non-static
        const isStatic = prop => prop.modifiers && prop.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
        const staticFields = properties.filter(isStatic);
        const instanceFields = properties.filter(prop => !isStatic(prop));

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
                        tstl.createTableIndexExpression(tstl.createIdentifier("debug"), tstl.createStringLiteral("getregistry")), []),
                    extendsName),
                undefined,
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
            const classCreationMethods = this.createClassCreationMethods(statement, className, instanceFields, extendsType);
            result.push(...classCreationMethods);
        } else {
            for (const f of instanceFields) {
                const fieldName = this.transformPropertyName(f.name);

                const value = this.transformExpression(f.initializer);

                // className["fieldName"]
                const classField = tstl.createTableIndexExpression(className, fieldName);

                // className["fieldName"] = value;
                const assignClassField = tstl.createAssignmentStatement(classField, value);

                result.push(assignClassField);
            }
        }

        // Add static declarations
        for (const field of staticFields) {
            const fieldName = this.transformPropertyName(field.name);
            const value = this.transformExpression(field.initializer);

            const fieldAssign = tstl.createAssignmentStatement(tstl.createTableIndexExpression(className, fieldName), value);

            result.push(fieldAssign);
        }

        // Find first constructor with body
        const constructor = statement.members.filter(n => ts.isConstructorDeclaration(n) && n.body)[0] as ts.ConstructorDeclaration;
        if (constructor) {
            // Add constructor plus initialization of instance fields
            result.push(this.transformConstructor(constructor, className));
        } else if (!isExtension && !extendsType) {
            // Generate a constructor if none was defined
            result.push(this.transformConstructor(ts.createConstructor([], [], [], ts.createBlock([], true)), className));
        }

        // Transform get accessors
        statement.members.filter(ts.isGetAccessor).forEach(getAccessor => {
            result.push(this.transformGetAccessorDeclaration(getAccessor, className));
        });

        // Transform set accessors
        statement.members.filter(ts.isSetAccessor).forEach(setAccessor => {
            result.push(this.transformSetAccessorDeclaration(setAccessor, className));
        });

        // Transform methods
        statement.members.filter(ts.isMethodDeclaration).forEach(method => {
            result.push(this.transformMethodDeclaration(method, className));
        });

        return result;
    }

    public createClassCreationMethods(
        statement: ts.ClassLikeDeclarationBase,
        className: tstl.Identifier,
        instanceFields: ts.PropertyDeclaration[],
        extendsType: ts.Type): tstl.Statement[] {
        let noClassOr = false;
        if (extendsType) {
            const decorators = tsHelper.getCustomDecorators(extendsType, this.checker);
            noClassOr = decorators.has(DecoratorKind.NoClassOr);
        }

        const result: tstl.Statement[] = [];

        // Write class declaration
        if (extendsType) {
            const baseName = tstl.createIdentifier(extendsType.symbol.escapedName as string);

            // baseName.new
            const newIndex = tstl.createTableIndexExpression(baseName, tstl.createStringLiteral("new"));

            // baseName.new()
            let rhs: tstl.Expression = tstl.createCallExpression(newIndex, []);

            if (!noClassOr) {
                // className or baseName.new()
                rhs = tstl.createBinaryExpression(className, rhs, tstl.SyntaxKind.OrOperator);
            }

            // (local) className = className or baseName.new()
            // (local) className = baseName.new()
            // exports.className = baseName.new()
            const classVar = this.createLocalOrGlobalDeclaration(className, rhs, undefined, statement);

            result.push(classVar);
        } else {
            // {}
            let rhs: tstl.Expression = tstl.createTableExpression();

            if (!noClassOr) {
                // className or {}
                rhs = tstl.createBinaryExpression(className, rhs, tstl.SyntaxKind.OrOperator);
            }

            // (local) className = className or {}
            // (local) className = {}
            // exports.className = {}
            const classVar = this.createLocalOrGlobalDeclaration(className, rhs, undefined, statement);

            result.push(classVar);
        }

        // className.__index
        const classIndex = tstl.createTableIndexExpression(className, tstl.createStringLiteral("__index"));
        // className.__index = className
        const assignClassIndex = tstl.createAssignmentStatement(classIndex, className, undefined, statement);

        result.push(assignClassIndex);

        if (extendsType) {
            const baseName = tstl.createIdentifier(extendsType.symbol.escapedName as string);
            // className.__base = baseName
            const classBase = tstl.createTableIndexExpression(className, tstl.createStringLiteral("__base"));

            const assignClassBase = tstl.createAssignmentStatement(classBase, baseName, undefined, statement);

            result.push(assignClassBase);
        }

        const newFuncStatements: tstl.Statement[] = [];

        // local self = setmetatable({}, className)
        const assignSelf = tstl.createVariableDeclarationStatement(
            this.selfIdentifier,
            tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [tstl.createTableExpression(), className]));

        newFuncStatements.push(assignSelf);

        for (const f of instanceFields) {
            // Get identifier
            const fieldName = this.transformPropertyName(f.name);

            const value = this.transformExpression(f.initializer);

            // self[fieldName]
            const selfIndex = tstl.createTableIndexExpression(this.selfIdentifier, fieldName);

            // self[fieldName] = value
            const assignClassField = tstl.createAssignmentStatement(selfIndex, value);

            newFuncStatements.push(assignClassField);
        }

        /*
        if construct and className.constructor then
            className.constructor(self, ...)
        end
        */
        const ifConstructor = tstl.createIfStatement(
            tstl.createBinaryExpression(
                tstl.createIdentifier("construct"),
                tstl.createTableIndexExpression(className, tstl.createStringLiteral("constructor")),
                tstl.SyntaxKind.AndOperator),
            tstl.createBlock([
                tstl.createExpressionStatement(tstl.createCallExpression(
                    tstl.createTableIndexExpression(className, tstl.createStringLiteral("constructor")),
                    [this.selfIdentifier, tstl.createDotsLiteral()])),
            ]));

        newFuncStatements.push(ifConstructor);

        // return self
        const returnSelf = tstl.createReturnStatement([this.selfIdentifier]);

        newFuncStatements.push(returnSelf);

        // function className.new(construct, ...) ... end
        const newFunc = tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(className, tstl.createStringLiteral("new")),
            tstl.createFunctionExpression(
                tstl.createBlock(newFuncStatements),
                [tstl.createIdentifier("construct")],
                tstl.createDotsLiteral(),
                undefined,
                undefined,
                statement));

        result.push(newFunc);

        return result;
    }

    public transformConstructor(statement: ts.ConstructorDeclaration, className: tstl.Identifier): tstl.AssignmentStatement {
        // Don't transform methods without body (overload declarations)
        if (!statement.body) {
            return undefined;
        }

        // Check for field declarations in constructor
        const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);

        // Transform constructor body
        this.classStack.push(className);

        const bodyStatements: tstl.Statement[] = [];

        // Add in instance field declarations
        for (const declaration of constructorFieldsDeclarations) {
            const declarationName = this.transformIdentifier(declaration.name as ts.Identifier);
            if (declaration.initializer) {
                // self.declarationName = declarationName or initializer
                const assignement = tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(this.selfIdentifier, tstl.createStringLiteral(declarationName.text)),
                    tstl.createBinaryExpression(
                        declarationName, this.transformExpression(declaration.initializer), tstl.SyntaxKind.OrOperator));
                bodyStatements.push(assignement);
            } else {
                // self.declarationName = declarationName
                const assignement = tstl.createAssignmentStatement(
                    tstl.createTableIndexExpression(this.selfIdentifier, tstl.createStringLiteral(declarationName.text)), declarationName);
                bodyStatements.push(assignement);
            }
        }

        // function className.constructor(params) ... end

        const [params, dotsLiteral, restParamName] = this.transformParameters(statement.parameters, this.selfIdentifier);

        bodyStatements.push(...this.transformFunctionBody(statement.parameters, statement.body, restParamName));

        const body: tstl.Block = tstl.createBlock(bodyStatements);

        const result = tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(className, tstl.createStringLiteral("constructor")),
            tstl.createFunctionExpression(body, params, dotsLiteral, restParamName, undefined, undefined),
            undefined,
            statement);

        this.classStack.pop();

        return result;
    }

    public transformGetAccessorDeclaration(getAccessor: ts.GetAccessorDeclaration, className: tstl.Identifier): tstl.AssignmentStatement {
        const name = this.transformIdentifier(getAccessor.name as ts.Identifier);

        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(this.transformFunctionBody(getAccessor.parameters, getAccessor.body)), [this.selfIdentifier]);

        return tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(className, tstl.createStringLiteral("get__" + name.text)), accessorFunction);
    }

    public transformSetAccessorDeclaration(setAccessor: ts.SetAccessorDeclaration, className: tstl.Identifier): tstl.AssignmentStatement {
        const name = this.transformIdentifier(setAccessor.name as ts.Identifier);

        const [params, dot, restParam] = this.transformParameters(setAccessor.parameters, this.selfIdentifier);

        const accessorFunction = tstl.createFunctionExpression(
            tstl.createBlock(this.transformFunctionBody(setAccessor.parameters, setAccessor.body, restParam)), params, dot, restParam);

        return tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(className, tstl.createStringLiteral("set__" + name.text)), accessorFunction);
    }

    public transformMethodDeclaration(node: ts.MethodDeclaration, className: tstl.Identifier): tstl.AssignmentStatement {
        // Don't transform methods without body (overload declarations)
        if (!node.body) {
            return undefined;
        }

        let methodName = this.transformPropertyName(node.name);
        if (tstl.isStringLiteral(methodName) && methodName.value === "toString") {
            methodName = tstl.createStringLiteral("__tostring", undefined, node.name);
        }

        const type = this.checker.getTypeAtLocation(node);
        const context = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void ? this.selfIdentifier : undefined;
        const [paramNames, dots, restParamName] = this.transformParameters(node.parameters, context);

        const functionExpression = tstl.createFunctionExpression(
            tstl.createBlock(this.transformFunctionBody(node.parameters, node.body, restParamName)), paramNames, dots, restParamName);

        return tstl.createAssignmentStatement(tstl.createTableIndexExpression(className, methodName), functionExpression);
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

        // Only push parameter name to paramName array if it isn't a spread parameter
        for (const param of parameters) {
            if (ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
                continue;
            }
            const paramName = this.transformIdentifier(param.name as ts.Identifier);

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

    public transformFunctionBody(parameters: ts.NodeArray<ts.ParameterDeclaration>, body: ts.Block, spreadIdentifier?: tstl.Identifier):
        tstl.Statement[] {
        this.pushScope(ScopeType.Function);

        const headerStatements = [];

        // Add default parameters
        const defaultValueDeclarations =
            parameters.filter(declaration => declaration.initializer !== undefined).map(this.transformParameterDefaultValueDeclaration);

        headerStatements.push(...defaultValueDeclarations);

        // Push spread operator here
        if (spreadIdentifier) {
            const spreadTable = this.wrapInTable(tstl.createDotsLiteral());
            headerStatements.push(this.createLocalOrGlobalDeclaration(spreadIdentifier, spreadTable));
        }

        const bodyStatements = this.transformStatements(body.statements);

        this.popScope();

        return headerStatements.concat(bodyStatements);
    }

    public transformParameterDefaultValueDeclaration(declaration: ts.ParameterDeclaration): tstl.Statement {
        const parameterName = this.transformIdentifier(declaration.name as ts.Identifier);
        const parameterValue = this.transformExpression(declaration.initializer);
        const assignment = tstl.createAssignmentStatement(parameterName, parameterValue);

        const nilCondition = tstl.createBinaryExpression(parameterName, tstl.createNilLiteral(), tstl.SyntaxKind.EqualityOperator);

        const ifBlock = tstl.createBlock([assignment]);

        return tstl.createIfStatement(nilCondition, ifBlock, undefined, undefined, declaration);
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
                    this.transformIdentifier(statement.name as ts.Identifier)),
                tstl.createBinaryExpression(
                    tstl.createTableIndexExpression(
                        this.transformIdentifier(this.currentNamespace.name as ts.Identifier),
                        this.transformIdentifier(statement.name as ts.Identifier)),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator));

            result.push(namespaceDeclaration);

            // local innerNS = outerNS.innerNS
            const localDeclaration = tstl.createVariableDeclarationStatement(
                this.transformIdentifier(statement.name as ts.Identifier),
                tstl.createTableIndexExpression(
                    this.transformIdentifier(this.currentNamespace.name as ts.Identifier),
                    this.transformIdentifier(statement.name as ts.Identifier)));

            result.push(localDeclaration);
        } else if (this.isModule && (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export)) {
            // exports.NS = exports.NS or {}
            const namespaceDeclaration = tstl.createAssignmentStatement(
                tstl.createTableIndexExpression(
                    this.transformIdentifier(ts.createIdentifier("exports")), this.transformIdentifier(statement.name as ts.Identifier)),
                tstl.createBinaryExpression(
                    tstl.createTableIndexExpression(
                        this.transformIdentifier(ts.createIdentifier("exports")),
                        this.transformIdentifier(statement.name as ts.Identifier)),
                    tstl.createTableExpression(),
                    tstl.SyntaxKind.OrOperator));

            result.push(namespaceDeclaration);

            // local NS = exports.NS
            const localDeclaration = tstl.createVariableDeclarationStatement(
                this.transformIdentifier(statement.name as ts.Identifier),
                tstl.createTableIndexExpression(
                    this.transformIdentifier(ts.createIdentifier("exports") as ts.Identifier),
                    this.transformIdentifier(statement.name as ts.Identifier)));

            result.push(localDeclaration);
        } else {
            // local NS = NS or {}
            const localDeclaration = tstl.createVariableDeclarationStatement(
                this.transformIdentifier(statement.name as ts.Identifier),
                tstl.createBinaryExpression(tstl.createIdentifier("NS"), tstl.createTableExpression(), tstl.SyntaxKind.OrOperator));

            result.push(localDeclaration);
        }

        // Set current namespace for nested NS
        // Keep previous currentNS to reset after block transpilation
        const previousNamespace = this.currentNamespace;
        this.currentNamespace = statement;

        // Transform moduleblock to block and visit it
        if (statement.body && ts.isModuleBlock(statement.body)) {
            result.push(...this.transformStatements(statement.body.statements));
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

        const result = [];

        if (!membersOnly) {
            const name = this.transformIdentifier(enumDeclaration.name);
            const table = tstl.createTableExpression();
            result.push(this.createLocalOrGlobalDeclaration(name, table, undefined, enumDeclaration));
        }

        for (const enumMember of this.computeEnumMembers(enumDeclaration)) {
            const memberName = this.transformPropertyName(enumMember.name);
            if (membersOnly) {
                if (tstl.isIdentifier(memberName)) {
                    result.push(this.createLocalOrGlobalDeclaration(memberName, enumMember.value, undefined, enumDeclaration));
                } else {
                    result.push(this.createLocalOrGlobalDeclaration(
                        tstl.createIdentifier(enumMember.name.getText(), undefined, enumMember.name),
                        enumMember.value,
                        undefined,
                        enumDeclaration));
                }
            } else {
                const table = this.transformIdentifier(enumDeclaration.name);
                const property = tstl.createTableIndexExpression(table, memberName, undefined);
                result.push(tstl.createAssignmentStatement(property, enumMember.value, undefined, enumMember.original));
            }
        }

        return result;
    }

    public computeEnumMembers(node: ts.EnumDeclaration):
        Array<{name: ts.PropertyName, value: tstl.NumericLiteral | tstl.StringLiteral, original: ts.Node}> {
        let val: tstl.NumericLiteral | tstl.StringLiteral;
        let hasStringInitializers = false;

        return node.members.map(member => {
            if (member.initializer) {
                if (ts.isNumericLiteral(member.initializer)) {
                    val = tstl.createNumericLiteral(Number(member.initializer.text));
                } else if (ts.isStringLiteral(member.initializer)) {
                    hasStringInitializers = true;
                    val = tstl.createStringLiteral(member.initializer.text);
                } else {
                    throw TSTLErrors.InvalidEnumMember(member.initializer);
                }
            } else if (hasStringInitializers) {
                throw TSTLErrors.HeterogeneousEnum(node);
            }

            const enumMember = {
                name: member.name,
                original: member,
                value: val,
            };

            if (typeof val === "number") {
                val++;
            }

            return enumMember;
        });
    }

    public transformFunctionDeclaration(functionDeclaration: ts.FunctionDeclaration): tstl.Statement {
        // Don't transform functions without body (overload declarations)
        if (!functionDeclaration.body) {
            return undefined;
        }

        const type = this.checker.getTypeAtLocation(functionDeclaration);
        const context = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void ? this.selfIdentifier : undefined;
        const [params, dotsLiteral, restParamName] = this.transformParameters(functionDeclaration.parameters, context);

        const name = this.transformIdentifier(functionDeclaration.name);
        const body = tstl.createBlock(this.transformFunctionBody(functionDeclaration.parameters, functionDeclaration.body, restParamName));
        const functionExpression = tstl.createFunctionExpression(body, params, dotsLiteral, restParamName);

        return this.createLocalOrGlobalDeclaration(name, functionExpression, undefined, functionDeclaration);
    }

    public transformTypeAliasDeclaration(statement: ts.TypeAliasDeclaration): undefined {
        return undefined;
    }

    public transformInterfaceDeclaration(statement: ts.InterfaceDeclaration): undefined {
        return undefined;
    }

    public transformVariableDeclaration(statement: ts.VariableDeclaration): tstl.Statement[] {
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
                if (ts.isFunctionExpression(statement.initializer) || ts.isArrowFunction(statement.initializer)) {
                    // Separate declaration and assignment for functions to allow recursion

                    // local identifierName; identifierName = value;
                    return [tstl.createVariableDeclarationStatement(identifierName), tstl.createAssignmentStatement(identifierName, value)];
                } else {
                    // local identifierName = value;
                    return [tstl.createVariableDeclarationStatement(identifierName, value)];
                }
            } else {
                // local identifierName = nil;
                return [tstl.createVariableDeclarationStatement(identifierName, tstl.createNilLiteral())];
            }
        } else if (ts.isArrayBindingPattern(statement.name)) {
            // Destructuring type

            // Disallow ellipsis destruction
            if (statement.name.elements.some(elem => !ts.isBindingElement(elem) || elem.dotDotDotToken !== undefined)) {
                throw TSTLErrors.ForbiddenEllipsisDestruction(statement);
            }

            const vars = statement.name.elements.map(e => this.transformArrayBindingElement(e));

            // Don't unpack TupleReturn decorated functions
            if (tsHelper.isTupleReturnCall(statement.initializer, this.checker)) {
                // local vars = initializer;
                return [tstl.createVariableDeclarationStatement(vars, this.transformExpression(statement.initializer))];
            } else {
                // local vars = this.transpileDestructingAssignmentValue(node.initializer);
                return [tstl.createVariableDeclarationStatement(vars, this.createUnpackCall(statement.initializer))];
            }
        } else {
            throw TSTLErrors.UnsupportedKind("variable declaration", statement.name.kind, statement);
        }
    }

    public transformVariableStatement(statement: ts.VariableStatement): tstl.Statement[] {
        const result: tstl.Statement[] = [];
        statement.declarationList.declarations.forEach(declaration => result.push(...this.transformVariableDeclaration(declaration)));
        return result;
    }

    public transformExpressionStatement(statement: ts.ExpressionStatement | ts.Expression): tstl.Statement {
        const expression = ts.isExpressionStatement(statement) ? statement.expression : statement;
        if (ts.isBinaryExpression(expression)) {
            const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(expression.operatorToken.kind);
            if (isCompound) {
                // +=, -=, etc...
                return this.transformCompoundAssignmentStatement(expression.left, expression.right, replacementOperator);

            } else if (expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                // = assignment
                return this.transformAssignmentStatement(expression);
            }

        } else if (
            ts.isPrefixUnaryExpression(expression) &&
            (expression.operator === ts.SyntaxKind.PlusPlusToken || expression.operator === ts.SyntaxKind.MinusMinusToken)) {
            // ++i, --i
            const replacementOperator =
                expression.operator === ts.SyntaxKind.PlusPlusToken ? tstl.SyntaxKind.AdditionOperator : tstl.SyntaxKind.SubractionOperator;
            return this.transformCompoundAssignmentStatement(expression.operand, ts.createLiteral(1), replacementOperator);
        }

        else if (ts.isPostfixUnaryExpression(expression)) {
            // i++, i--
            const replacementOperator =
                expression.operator === ts.SyntaxKind.PlusPlusToken ? tstl.SyntaxKind.AdditionOperator : tstl.SyntaxKind.SubractionOperator;
            return this.transformCompoundAssignmentStatement(expression.operand, ts.createLiteral(1), replacementOperator);
        }

        return tstl.createExpressionStatement(this.transformExpression(expression));
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
                    return tstl.createReturnStatement(statement.expression.elements.map(elem => this.transformExpression(elem)));
                } else if (!tsHelper.isTupleReturnCall(statement.expression, this.checker)) {
                    // If return expression is not another TupleReturn call, unpack it
                    return tstl.createReturnStatement([this.createUnpackCall(statement.expression)]);
                }
            }
            return tstl.createReturnStatement([this.transformExpression(statement.expression)]);
        } else {
            // Empty return
            return tstl.createReturnStatement();
        }
    }

    public transformIfStatement(statement: ts.IfStatement): tstl.IfStatement {
        const condition = this.transformExpression(statement.expression);
        const ifBlock = tstl.createBlock(this.statementVisitResultToStatementArray(this.transformStatement(statement.thenStatement)));
        if (statement.elseStatement) {
            if (ts.isIfStatement(statement.elseStatement)) {
                return tstl.createIfStatement(condition, ifBlock, this.transformIfStatement(statement.elseStatement));
            } else {
                const elseBlock =
                    tstl.createBlock(this.statementVisitResultToStatementArray(this.transformStatement(statement.elseStatement)));
                return tstl.createIfStatement(condition, ifBlock, elseBlock);
            }
        }
        return tstl.createIfStatement(condition, ifBlock);
    }

    public transformWhileStatement(statement: ts.WhileStatement): tstl.WhileStatement {
        return tstl.createWhileStatement(
            tstl.createBlock(this.statementVisitResultToStatementArray(this.transformStatement(statement.statement))),
            this.transformExpression(statement.expression));
    }

    public transformDoStatement(statement: ts.DoStatement): tstl.RepeatStatement {
        return tstl.createRepeatStatement(
            tstl.createBlock(this.statementVisitResultToStatementArray(this.transformStatement(statement.statement))),
            tstl.createUnaryExpression(this.transformExpression(statement.expression), tstl.SyntaxKind.NotOperator));
    }

    public transformForStatement(statement: ts.ForStatement): tstl.Statement[] {
        const result: tstl.Statement[] = [];

        if (statement.initializer) {
            for (const variableDeclaration of (statement.initializer as ts.VariableDeclarationList).declarations) {
                // local initializer = value
                result.push(...this.transformVariableDeclaration(variableDeclaration));
            }
        }

        const condition = statement.condition ? this.transformExpression(statement.condition) : tstl.createBooleanLiteral(true);

        // Add body
        const body: tstl.Statement[] = [];
        body.push(...this.statementVisitResultToStatementArray(this.transformStatement(statement.statement)));

        if (statement.incrementor) {
            body.push(this.transformExpressionStatement(statement.incrementor));
        }

        // while (condition) do ... end
        result.push(tstl.createWhileStatement(tstl.createBlock(body), condition));

        return result;
    }

    public transformForOfStatement(statement: ts.ForOfStatement): StatementVisitResult {
        // Transpile expression
        const iterable = this.transformExpression(statement.expression);

        /*if (tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker)) {
           // Implemented below
        } else {
            // TODO
            // Custom iterators
            let variableName: string;
            const isLuaIterator = tsHelper.isLuaIteratorCall(node.expression, this.checker);
            if (isLuaIterator && tsHelper.isTupleReturnCall(node.expression, this.checker)) {
                if (ts.isVariableDeclarationList(node.initializer)) {
                    // Variables declared in for loop
                    if (!ts.isIdentifier(node.initializer.declarations[0].name)) {
                        variableName = (node.initializer.declarations[0].name as ts.ArrayBindingPattern).elements
                            .map(e => this.transpileArrayBindingElement(e)).join(", ");
                    } else {
                        // Single variable is not allowed
                        throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(node.initializer);
                    }
                } else {
                    // Variables NOT declared in for loop - catch iterator values in temps and assign
                    if (ts.isArrayLiteralExpression(node.initializer)) {
                        const tmps = node.initializer.elements.map((_, i) => `____TS_value${i}`);
                        itemVariable = ts.createArrayLiteral(tmps.map(tmp => ts.createIdentifier(tmp)));
                        variableName = tmps.join(", ");
                    } else {
                        // Single variable is not allowed
                        throw TSTLErrors.UnsupportedNonDestructuringLuaIterator(node.initializer);
                    }
                }
            } else {
                if (ts.isVariableDeclarationList(node.initializer)
                    && ts.isIdentifier(node.initializer.declarations[0].name)) {
                    // Single variable declared in for loop
                    variableName = this.transpileExpression(node.initializer.declarations[0].name);
                } else {
                    // Destructuring or variable NOT declared in for loop
                    variableName = "____TS_value";
                    itemVariable =  ts.createIdentifier(variableName);
                }
            }

            const iterator = isLuaIterator ? iterable : this.transpileLuaLibFunction(LuaLibFeature.Iterator, iterable);
            result = this.indent + `for ${variableName} in ${iterator} do\n`;
        }*/
        
        const indexVariable = tstl.createIdentifier("____TS_index");
        let arrayVariable = iterable;
        const bodyStatements = [];

        if (!ts.isIdentifier) {
            // Cache expression
            arrayVariable = tstl.createIdentifier("____TS_array");
            const arrayVariableInitialize = this.createLocalOrGlobalDeclaration(
                tstl.createIdentifier("____TS_array"),
                iterable
            );
            bodyStatements.push(arrayVariableInitialize);
        }

        if (!ts.isVariableDeclarationList(statement.initializer)) {
            throw new Error("Anything other than a variable declaration list as loop initializer is not supported.");
        }

        const valueVariable = this.transformIdentifier(statement.initializer.declarations[0].name as ts.Identifier);

        const valueAssignment = this.createLocalOrGlobalDeclaration(
            valueVariable,
            tstl.createTableIndexExpression(arrayVariable, indexVariable)
        );
        bodyStatements.push(valueAssignment);

        const statements = ts.isBlock(statement.statement)
            ? [...bodyStatements, ...this.transformStatements(statement.statement.statements)]
            : this.transformStatements([statement.statement]);

        return tstl.createForStatement(
            tstl.createBlock(statements),
            indexVariable,
            tstl.createNumericLiteral(1),
            tstl.createUnaryExpression(iterable, tstl.SyntaxKind.LengthOperator),
            tstl.createNumericLiteral(1),
            undefined,
            statement
        );
    }

    public transformForInStatement(statement: ts.ForInStatement): StatementVisitResult {
        // Get variable identifier
        const variable = (statement.initializer as ts.VariableDeclarationList).declarations[0] as ts.VariableDeclaration;
        const identifier = variable.name as ts.Identifier;

        // Transpile expression
        const expression = this.transformExpression(statement.expression);

        if (tsHelper.isArrayType(this.checker.getTypeAtLocation(statement.expression), this.checker)) {
            throw TSTLErrors.ForbiddenForIn(statement);
        }

        const body = ts.isBlock(statement.statement)
            ? this.transformBlock(statement.statement)
            : tstl.createBlock(this.transformStatements([statement.statement]));

        return tstl.createForInStatement(
            body,
            [this.transformIdentifier(identifier)],
            [expression],
            undefined,
            statement
        );
    }

    public transformSwitchStatement(arg0: ts.SwitchStatement): StatementVisitResult {
        throw new Error("Method not implemented.");
    }

    public transformBreakStatement(breakStatement: ts.BreakStatement): StatementVisitResult {
        return tstl.createBreakStatement(undefined, breakStatement);
    }

    public transformTryStatement(arg0: ts.TryStatement): StatementVisitResult {
        throw new Error("Method not implemented.");
    }

    public transformThrowStatement(arg0: ts.ThrowStatement): StatementVisitResult {
        throw new Error("Method not implemented.");
    }

    public transformContinueStatement(arg0: ts.ContinueStatement): StatementVisitResult {
        throw new Error("Method not implemented.");
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
                return this.transformIdentifier(expression as ts.Identifier);
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return this.transformStringLiteral(expression as ts.StringLiteral);
            case ts.SyntaxKind.TemplateExpression:
                return this.transformTemplateExpression(expression as ts.TemplateExpression);
            case ts.SyntaxKind.NumericLiteral:
                // TODO move to extra function (consistency)
                return tstl.createNumericLiteral(Number((expression as ts.NumericLiteral).text), undefined, expression);
            case ts.SyntaxKind.TrueKeyword:
                // TODO move to extra function (consistency)
                return tstl.createBooleanLiteral(true, undefined, expression);
            case ts.SyntaxKind.FalseKeyword:
                // TODO move to extra function (consistency)
                return tstl.createBooleanLiteral(false, undefined, expression);
            case ts.SyntaxKind.NullKeyword:
            case ts.SyntaxKind.UndefinedKeyword:
                // TODO move to extra function (consistency)
                return tstl.createNilLiteral(undefined, expression);
            case ts.SyntaxKind.ThisKeyword:
                // TODO move to extra function (consistency)
                return this.selfIdentifier;
            case ts.SyntaxKind.PostfixUnaryExpression:
                return this.transformPostfixUnaryExpression(expression as ts.PostfixUnaryExpression);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return this.transformPrefixUnaryExpression(expression as ts.PrefixUnaryExpression);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.transformArrayLiteral(expression as ts.ArrayLiteralExpression);
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.transformObjectLiteral(expression as ts.ObjectLiteralExpression);
            case ts.SyntaxKind.FunctionExpression:
                return this.transformFunctionExpression(expression as ts.ArrowFunction, this.selfIdentifier);
            case ts.SyntaxKind.ArrowFunction:
                return this.transformFunctionExpression(expression as ts.ArrowFunction, tstl.createIdentifier("____"));
            case ts.SyntaxKind.NewExpression:
                return this.transformNewExpression(expression as ts.NewExpression);
            case ts.SyntaxKind.ComputedPropertyName:
                // return "[" + this.transpileExpression((node as ts.ComputedPropertyName).expression) + "]";
            case ts.SyntaxKind.ParenthesizedExpression:
                // TODO move to extra function (consistency)
                return tstl.createParenthesizedExpression(
                    this.transformExpression((expression as ts.ParenthesizedExpression).expression), undefined, expression);
            case ts.SyntaxKind.SuperKeyword:
                // TODO move to extra function (consistency)
                return tstl.createTableIndexExpression(this.selfIdentifier, tstl.createStringLiteral("__base"), undefined, expression);
            case ts.SyntaxKind.TypeAssertionExpression:
            case ts.SyntaxKind.AsExpression:
                return this.transformAssertionExpression(expression as ts.AssertionExpression);
            case ts.SyntaxKind.TypeOfExpression:
                return this.transformTypeOfExpression(expression as ts.TypeOfExpression);
            case ts.SyntaxKind.EmptyStatement:
                // TODO move to extra function (consistency)
                return undefined;
            case ts.SyntaxKind.ClassExpression:
                /*this.namespace.push("");
                const classDeclaration =  this.transformClassDeclaration(node as ts.ClassExpression, "_");
                this.namespace.pop();
                return `(function() ${classDeclaration}; return _ end)()`;*/
                throw new Error("Not yet implemented");
            default:
                throw TSTLErrors.UnsupportedKind("expression", expression.kind, expression);
        }
    }

    public transformBinaryExpression(expression: ts.BinaryExpression): tstl.Expression {
        // Check if this is an assignment token, then handle accordingly

        const [isCompound, replacementOperator] = tsHelper.isBinaryAssignmentToken(expression.operatorToken.kind);
        if (isCompound) {
            return this.transformCompoundAssignmentExpression(expression.left, expression.right, replacementOperator, false);
        }

        const lhs = this.transformExpression(expression.left);
        const rhs = this.transformExpression(expression.right);

        // Transpile Bitops
        switch (expression.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return this.transformBitOperation(expression, lhs, rhs);
        }

        // Transpile operators
        switch (expression.operatorToken.kind) {
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.AndOperator);
            case ts.SyntaxKind.BarBarToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.OrOperator);
            case ts.SyntaxKind.PlusToken:
                // Replace string + with ..
                const typeLeft = this.checker.getTypeAtLocation(expression.left);
                const typeRight = this.checker.getTypeAtLocation(expression.right);
                if ((typeLeft.flags & ts.TypeFlags.String) ||
                    ts.isStringLiteral(expression.left) ||  (typeRight.flags & ts.TypeFlags.String) ||
                    ts.isStringLiteral(expression.right)) {
                    return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.ConcatOperator);
                }
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.AdditionOperator);
            case ts.SyntaxKind.MinusToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.SubractionOperator);
            case ts.SyntaxKind.AsteriskToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.MultiplicationOperator);
            case ts.SyntaxKind.AsteriskAsteriskToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.PowerOperator);
            case ts.SyntaxKind.SlashToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.DivisionOperator);
            case ts.SyntaxKind.PercentToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.ModuloOperator);
            case ts.SyntaxKind.GreaterThanToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.GreaterThanOperator);
            case ts.SyntaxKind.GreaterThanEqualsToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.GreaterEqualOperator);
            case ts.SyntaxKind.LessThanToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.LessThanOperator);
            case ts.SyntaxKind.LessThanEqualsToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.LessEqualOperator);
            case ts.SyntaxKind.EqualsToken:
                return this.transformAssignmentExpression(expression);
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.EqualityOperator);
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return tstl.createBinaryExpression(lhs, rhs, tstl.SyntaxKind.InequalityOperator);
            case ts.SyntaxKind.InKeyword:
                const indexExpression = tstl.createTableIndexExpression(rhs, lhs);
                return tstl.createBinaryExpression(indexExpression, tstl.createNilLiteral(), tstl.SyntaxKind.InequalityOperator);
            case ts.SyntaxKind.InstanceOfKeyword:
                return this.transformLuaLibFunction(LuaLibFeature.InstanceOf, lhs, rhs);
            default:
                throw TSTLErrors.UnsupportedKind("binary operator", expression.operatorToken.kind, expression);
        }
    }

    public transformAssignmentStatement(expression: ts.BinaryExpression): tstl.Statement {
        if (ts.isArrayLiteralExpression(expression.left)) {
            // Destructuring assignment
            const left = expression.left.elements.map(e => this.transformExpression(e));
            let right: tstl.Expression[];
            if (ts.isArrayLiteralExpression(expression.right)) {
                right = expression.right.elements.map(e => this.transformExpression(e));
            } else if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = [this.transformExpression(expression.right)];
            } else {
                right = [this.createUnpackCall(expression.right)];
            }
            return tstl.createAssignmentStatement(left as tstl.IdentifierOrTableIndexExpression[], right);
        } else {
            // Simple assignment
            return tstl.createAssignmentStatement(
                this.transformExpression(expression.left) as tstl.IdentifierOrTableIndexExpression,
                this.transformExpression(expression.right));
        }
    }

    public transformAssignmentExpression(expression: ts.BinaryExpression): tstl.CallExpression {
        if (ts.isArrayLiteralExpression(expression.left)) {
            // Destructuring assignment
            // (function() local ${tmps} = ${right}; ${left} = ${tmps}; return {${tmps}} end)()
            const left = expression.left.elements.map(e => this.transformExpression(e));
            let right: tstl.Expression[];
            if (ts.isArrayLiteralExpression(expression.right)) {
                right = expression.right.elements.map(e => this.transformExpression(e));
            } else if (tsHelper.isTupleReturnCall(expression.right, this.checker)) {
                right = [this.transformExpression(expression.right)];
            } else {
                right = [this.createUnpackCall(expression.right)];
            }
            const tmps = expression.left.elements.map((_, i) => tstl.createIdentifier(`____TS_tmp${i}`));
            const statements: tstl.Statement[] = [
                tstl.createVariableDeclarationStatement(tmps, right),
                tstl.createAssignmentStatement(left as tstl.IdentifierOrTableIndexExpression[], tmps),
            ];
            return this.createImmediatelyInvokedFunctionExpression(
                statements, tstl.createTableExpression(tmps.map(t => tstl.createTableFieldExpression(t))));
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
            const iife = tstl.createFunctionExpression(tstl.createBlock(statements), [objParameter, indexParameter, valueParameter]);
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
                [tstl.createAssignmentStatement(left as tstl.IdentifierOrTableIndexExpression, right)], left);
        }
    }

    public transformCompoundAssignmentExpression(
        lhs: ts.Expression,
        rhs: ts.Expression,
        replacementOperator: tstl.BinaryOperator,
        isPostfix: boolean): tstl.CallExpression {
        const left = this.transformExpression(lhs) as tstl.IdentifierOrTableIndexExpression;
        let right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(lhs, this.checker);
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
                const operatorExpression = tstl.createBinaryExpression(tmp, right, replacementOperator);
                assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            } else {
                // local ____TS_tmp = ____TS_obj[____TS_index] ${replacementOperator} ${right};
                // ____TS_obj[____TS_index] = ____TS_tmp;
                const operatorExpression = tstl.createBinaryExpression(accessExpression, right, replacementOperator);
                tmpDeclaration = tstl.createVariableDeclarationStatement(tmp, operatorExpression);
                assignStatement = tstl.createAssignmentStatement(accessExpression, tmp);
            }
            // return ____TS_tmp
            return this.createImmediatelyInvokedFunctionExpression([objAndIndexDeclaration, tmpDeclaration, assignStatement], tmp);

        } else if (isPostfix) {
            // Postfix expressions need to cache original value in temp
            // local ____TS_tmp = ${left};
            // ${left} = ____TS_tmp ${replacementOperator} ${right};
            // return ____TS_tmp
            const tmpIdentifier = tstl.createIdentifier("____TS_tmp");
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, left);
            const operatorExpression = tstl.createBinaryExpression(tmpIdentifier, right, replacementOperator);
            const assignStatement = tstl.createAssignmentStatement(left, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression([tmpDeclaration, assignStatement], tmpIdentifier);

        } else if (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs)) {
            // Simple property/element access expressions need to cache in temp to avoid double-evaluation
            // local ____TS_tmp = ${left} ${replacementOperator} ${right};
            // ${left} = ____TS_tmp;
            // return ____TS_tmp
            const tmpIdentifier = tstl.createIdentifier("____TS_tmp");
            const operatorExpression = tstl.createBinaryExpression(left, right, replacementOperator);
            const tmpDeclaration = tstl.createVariableDeclarationStatement(tmpIdentifier, operatorExpression);
            const assignStatement = tstl.createAssignmentStatement(left, tmpIdentifier);
            return this.createImmediatelyInvokedFunctionExpression([tmpDeclaration, assignStatement], tmpIdentifier);

        } else {
            // Simple expressions
            // ${left} = ${right}; return ${right}
            const operatorExpression = tstl.createBinaryExpression(left, right, replacementOperator);
            const assignStatement = tstl.createAssignmentStatement(left, operatorExpression);
            return this.createImmediatelyInvokedFunctionExpression([assignStatement], left);
        }
    }

    public transformCompoundAssignmentStatement(lhs: ts.Expression, rhs: ts.Expression, replacementOperator: tstl.BinaryOperator):
        tstl.Statement {
        const left = this.transformExpression(lhs) as tstl.IdentifierOrTableIndexExpression;
        const right = this.transformExpression(rhs);

        const [hasEffects, objExpression, indexExpression] = tsHelper.isAccessExpressionWithEvaluationEffects(lhs, this.checker);
        if (hasEffects) {
            // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
            // local __TS_obj, __TS_index = ${objExpression}, ${indexExpression};
            // ____TS_obj[____TS_index] = ____TS_obj[____TS_index] ${replacementOperator} ${right};
            const obj = tstl.createIdentifier("____TS_obj");
            const index = tstl.createIdentifier("____TS_index");
            const objAndIndexDeclaration = tstl.createVariableDeclarationStatement(
                [obj, index], [this.transformExpression(objExpression), this.transformExpression(indexExpression)]);
            const accessExpression = tstl.createTableIndexExpression(obj, index);
            const operatorExpression =
                tstl.createBinaryExpression(accessExpression, tstl.createParenthesizedExpression(right), replacementOperator);
            const assignStatement = tstl.createAssignmentStatement(accessExpression, operatorExpression);
            return tstl.createDoStatement([objAndIndexDeclaration, assignStatement]);

        } else {
            // Simple statements
            // ${left} = ${left} ${replacementOperator} ${right}
            const operatorExpression = tstl.createBinaryExpression(left, right, replacementOperator);
            return tstl.createAssignmentStatement(left, operatorExpression);
        }
    }

    public transformBitOperation(node: ts.BinaryExpression, lhs: tstl.Expression, rhs: tstl.Expression): ExpressionVisitResult {
        throw TSTLErrors.UnsupportedForTarget("Bitwise operations", this.options.luaTarget, node);
    }

    public transformConditionalExpression(node: ts.ConditionalExpression, brackets?: boolean): tstl.CallExpression {
        const condition = this.transformExpression(node.condition);
        const val1 = this.transformExpression(node.whenTrue);
        const val2 = this.transformExpression(node.whenFalse);

        return this.transformLuaLibFunction(LuaLibFeature.Ternary, condition, this.wrapInFunctionCall(val1), this.wrapInFunctionCall(val2));
    }

    public transformPostfixUnaryExpression(expression: ts.PostfixUnaryExpression): tstl.Expression {
        const replacementOperator =
            expression.operator === ts.SyntaxKind.PlusPlusToken ? tstl.SyntaxKind.AdditionOperator : tstl.SyntaxKind.SubractionOperator;
        return this.transformCompoundAssignmentExpression(expression.operand, ts.createLiteral(1), replacementOperator, true);
    }

    public transformPrefixUnaryExpression(expression: ts.PrefixUnaryExpression): tstl.Expression {
        switch (expression.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                return this.transformCompoundAssignmentExpression(
                    expression.operand, ts.createLiteral(1), tstl.SyntaxKind.AdditionOperator, false);

            case ts.SyntaxKind.MinusMinusToken:
                return this.transformCompoundAssignmentExpression(
                    expression.operand, ts.createLiteral(1), tstl.SyntaxKind.SubractionOperator, false);

            case ts.SyntaxKind.PlusToken:
                return this.transformExpression(expression.operand);

            case ts.SyntaxKind.MinusToken:
                return tstl.createUnaryExpression(this.transformExpression(expression.operand), tstl.SyntaxKind.NegationOperator);

            case ts.SyntaxKind.ExclamationToken:
                return tstl.createUnaryExpression(this.transformExpression(expression.operand), tstl.SyntaxKind.NotOperator);

            case ts.SyntaxKind.TildeToken:
                return tstl.createUnaryExpression(this.transformExpression(expression.operand), tstl.SyntaxKind.BitwiseNotOperator);
        }
    }

    public transformArrayLiteral(node: ts.ArrayLiteralExpression): tstl.TableExpression {
        const values: tstl.TableFieldExpression[] = [];

        node.elements.forEach(child => {
            values.push(tstl.createTableFieldExpression(this.transformExpression(child), undefined, undefined, child));
        });

        return tstl.createTableExpression(values, undefined, node);
    }

    public transformObjectLiteral(node: ts.ObjectLiteralExpression): tstl.TableExpression {
        const properties: tstl.TableFieldExpression[] = [];
        // Add all property assignments
        node.properties.forEach(element => {
            let name: tstl.Expression;
            if (ts.isIdentifier(element.name)) {
                name = this.transformIdentifier(element.name);
            } else if (ts.isComputedPropertyName(element.name)) {
                name = this.transformPropertyName(element.name);
             } else {
                // Numeric or string literal
                name = tstl.createTableFieldExpression(this.transformExpression(element.name));
            }

            if (ts.isPropertyAssignment(element)) {
                const expression = this.transformExpression(element.initializer);
                properties.push(tstl.createTableFieldExpression(expression, name, undefined, element));
            } else if (ts.isShorthandPropertyAssignment(element)) {
                properties.push(tstl.createTableFieldExpression(name, name, undefined, element));
            } else if (ts.isMethodDeclaration(element)) {
                const expression = this.transformFunctionExpression(element, this.selfIdentifier);
                properties.push(tstl.createTableFieldExpression(expression, name, undefined, element));
            } else {
                throw TSTLErrors.UnsupportedKind("object literal element", element.kind, node);
            }
        });

        return tstl.createTableExpression(properties, undefined, node);
    }

    public transformFunctionExpression(node: ts.FunctionLikeDeclaration, context: tstl.Identifier | undefined): ExpressionVisitResult {
        const type = this.checker.getTypeAtLocation(node);
        const hasContext = tsHelper.getFunctionContextType(type, this.checker) !== ContextType.Void;
        // Build parameter string
        const [paramNames, dotsLiteral, spreadIdentifier] = this.transformParameters(node.parameters, hasContext ? context : undefined);

        const body = ts.isBlock(node.body) ? node.body : ts.createBlock([ts.createReturn(node.body)]);
        const transformedBody = this.transformFunctionBody(node.parameters, body, spreadIdentifier);

        return tstl.createFunctionExpression(tstl.createBlock(transformedBody), paramNames, dotsLiteral, spreadIdentifier, undefined, node);
    }

    public transformNewExpression(node: ts.NewExpression): tstl.CallExpression {
        const name = this.transformExpression(node.expression);
        const sig = this.checker.getResolvedSignature(node);
        const params = node.arguments ? this.transformArguments(node.arguments, sig, ts.createTrue()) : [tstl.createBooleanLiteral(true)];

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
                tstl.createIdentifier(customDecorator.args[0]), this.transformArguments(node.arguments), undefined, node);
        }

        return tstl.createCallExpression(tstl.createTableIndexExpression(name, tstl.createStringLiteral("new")), params, undefined, node);
    }

    public transformCallExpression(node: ts.CallExpression): tstl.Expression {
        // Check for calls on primitives to override
        let parameters: tstl.Expression[] = [];

        const isLuaIterator = tsHelper.isLuaIteratorCall(node, this.checker);
        const isTupleReturn = tsHelper.isTupleReturnCall(node, this.checker);
        const isTupleReturnForward =
            node.parent && ts.isReturnStatement(node.parent) && tsHelper.isInTupleReturnFunction(node, this.checker);
        const isInDestructingAssignment = tsHelper.isInDestructingAssignment(node);
        const returnValueIsUsed = node.parent && !ts.isExpressionStatement(node.parent);
        const wrapResult = isTupleReturn && !isTupleReturnForward && !isInDestructingAssignment && returnValueIsUsed && !isLuaIterator;

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
            const classIdentifier = this.classStack[this.classStack.length - 1];
            const baseIdentifier = tstl.createStringLiteral("__base");
            const constructorIdentifier = tstl.createStringLiteral("constructor");

            return tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createTableIndexExpression(classIdentifier, baseIdentifier), constructorIdentifier),
                parameters);
        }

        const callPath = this.transformExpression(node.expression);
        const signatureDeclaration = signature.getDeclaration();
        if (signatureDeclaration && tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) === ContextType.NonVoid &&
            !ts.isPropertyAccessExpression(node.expression) && !ts.isElementAccessExpression(node.expression)) {
            const context = this.isStrict ? ts.createNull() : ts.createIdentifier("_G");
            parameters = this.transformArguments(node.arguments, signature, context);
        } else {
            parameters = this.transformArguments(node.arguments, signature);
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
            parameters = this.transformArguments(node.arguments);
            return tstl.createCallExpression(this.transformMathExpression(node.expression.name), parameters, undefined, node);
        }

        if (ownerType.symbol && ownerType.symbol.escapedName === "String") {
            parameters = this.transformArguments(node.arguments);
            return tstl.createCallExpression(this.transformStringExpression(node.expression.name), parameters, undefined, node);
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
            // TODO - Is this even right?
            // return this.transformFunctionCallExpression(node);
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
                const toStringIdentifier = tstl.createIdentifier("toString");
                return tstl.createCallExpression(
                    toStringIdentifier, [this.transformExpression(node.expression.expression)], undefined, node);
            } else if (name === "hasOwnProperty") {
                const expr = this.transformExpression(node.expression.expression);
                parameters = this.transformArguments(node.arguments, signature);
                const rawGetIdentifier = tstl.createIdentifier("rawget");
                const rawGetCall = tstl.createCallExpression(rawGetIdentifier, [expr, ...parameters]);
                return tstl.createBinaryExpression(
                    rawGetCall, tstl.createNilLiteral(), tstl.SyntaxKind.InequalityOperator, undefined, node);
            } else {
                const signatureDeclaration = signature.getDeclaration();
                const addContextParameter = !signatureDeclaration
                    || tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) !== ContextType.Void;

                const parameters = this.transformArguments(node.arguments, signature);

                const table = this.transformExpression(node.expression.expression);
                const callPath = tstl.createTableIndexExpression(table, tstl.createStringLiteral(name));
                
                return tstl.createCallExpression(
                    callPath,
                    addContextParameter ? [callPath, ...parameters] : parameters,
                    undefined,
                    node
                );
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
        if (!signatureDeclaration || tsHelper.getDeclarationContextType(signatureDeclaration, this.checker) !== ContextType.Void) {
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
                const selfAssignment = this.createLocalOrGlobalDeclaration(selfIdentifier, context);
                const index = tstl.createTableIndexExpression(selfIdentifier, argument);
                const callExpression = tstl.createCallExpression(index, parameters);
                return this.createImmediatelyInvokedFunctionExpression([selfAssignment], callExpression);
            } else {
                return tstl.createCallExpression(this.transformExpression(node.expression), [context, ...parameters]);
            }
        } else {
            // No context
            return tstl.createCallExpression(this.transformExpression(node.expression), parameters);
        }
    }

    public transformArguments<T extends ts.Expression>(params: ts.NodeArray<ts.Expression>, sig?: ts.Signature, context?: T):
        tstl.Expression[] {
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

        if (tsHelper.hasGetAccessor(node, this.checker)) {
            return this.transformGetAccessor(node);
        }

        // Check for primitive types to override
        const type = this.checker.getTypeAtLocation(node.expression);
        switch (type.flags) {
            case ts.TypeFlags.String:
            case ts.TypeFlags.StringLiteral:
                return this.transformStringProperty(node);
            case ts.TypeFlags.Object:
                if (tsHelper.isExplicitArrayType(type, this.checker)) {
                    return this.transformArrayProperty(node);
                }
                if (tsHelper.isArrayType(type, this.checker) && tsHelper.isDefaultArrayPropertyName(node.name.escapedText as string)) {
                    return this.transformArrayProperty(node);
                }
        }

        if (type.symbol && (type.symbol.flags & ts.SymbolFlags.ConstEnum)) {
            const propertyValueDeclaration = this.checker.getTypeAtLocation(node).symbol.valueDeclaration;

            if (propertyValueDeclaration && propertyValueDeclaration.kind === ts.SyntaxKind.EnumMember) {
                const enumMember = propertyValueDeclaration as ts.EnumMember;

                if (enumMember.initializer) {
                    return this.transformExpression(enumMember.initializer);
                } else {
                    const enumMembers = this.computeEnumMembers(enumMember.parent);
                    const memberPosition = enumMember.parent.members.indexOf(enumMember);

                    if (memberPosition === -1) {
                        throw TSTLErrors.UnsupportedProperty(type.symbol.name, property, node);
                    }

                    const value = enumMembers[memberPosition].value;

                    if (typeof value === "string") {
                        return tstl.createStringLiteral(value, undefined, node);
                    }

                    return tstl.createIdentifier(value.toString(), undefined, node);
                }
            }
        }

        this.checkForLuaLibType(type);

        const decorators = tsHelper.getCustomDecorators(type, this.checker);
        // Do not output path for member only enums
        if (decorators.has(DecoratorKind.CompileMembersOnly)) {
            return tstl.createIdentifier(property, undefined, node);
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
        return tstl.createTableIndexExpression(callPath, tstl.createStringLiteral(property), undefined, node);
    }

    public transformGetAccessor(node: ts.PropertyAccessExpression): tstl.MethodCallExpression {
        const name = tstl.createIdentifier(`get__${node.name.escapedText}`);
        const expression = this.transformExpression(node.expression);
        return tstl.createMethodCallExpression(expression, name, [], undefined, node);
    }

    public transformSetAccessor(node: ts.PropertyAccessExpression, value: tstl.Expression): tstl.MethodCallExpression {
        const name = tstl.createIdentifier(`set__${node.name.escapedText}`);
        const expression = this.transformExpression(node.expression);
        return tstl.createMethodCallExpression(expression, name, [value], undefined, node);
    }

    // Transpile a Math._ property
    public transformMathExpression(identifier: ts.Identifier): tstl.TableIndexExpression {
        const translation = {
            PI: "pi",
            abs: "abs",
            acos: "acos",
            asin: "asin",
            atan: "atan",
            ceil: "ceil",
            cos: "cos",
            exp: "exp",
            floor: "floor",
            log: "log",
            max: "max",
            min: "min",
            pow: "pow",
            random: "random",
            round: "round",
            sin: "sin",
            sqrt: "sqrt",
            tan: "tan",
        };

        if (translation[identifier.escapedText as string]) {
            const property = tstl.createStringLiteral(translation[identifier.escapedText as string]);
            const math = tstl.createIdentifier("math");
            return tstl.createTableIndexExpression(math, property, undefined, identifier);
        } else {
            throw TSTLErrors.UnsupportedProperty("math", identifier.escapedText as string, identifier);
        }
    }

    // Transpile access of string properties, only supported properties are allowed
    public transformStringProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression {
        switch (node.name.escapedText) {
            case "length":
                return tstl.createUnaryExpression(
                    this.transformExpression(node.expression), tstl.SyntaxKind.LengthOperator, undefined, node);
            default:
                throw TSTLErrors.UnsupportedProperty("string", node.name.escapedText as string, node);
        }
    }

    // Transpile access of array properties, only supported properties are allowed
    public transformArrayProperty(node: ts.PropertyAccessExpression): tstl.UnaryExpression {
        switch (node.name.escapedText) {
            case "length":
                return tstl.createUnaryExpression(
                    this.transformExpression(node.expression), tstl.SyntaxKind.LengthOperator, undefined, node);
            default:
                throw TSTLErrors.UnsupportedProperty("array", node.name.escapedText as string, node);
        }
    }

    public transformElementAccessExpression(node: ts.ElementAccessExpression): tstl.Expression {
        const table = this.transformExpression(node.expression);
        const index = this.transformExpression(node.argumentExpression);

        const type = this.checker.getTypeAtLocation(node.expression);
        if (tsHelper.isArrayType(type, this.checker)) {
            return tstl.createTableIndexExpression(table, this.expressionPlusOne(index), undefined, node);
        } else if (tsHelper.isStringType(type)) {
            return tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("sub")),
                [table, this.expressionPlusOne(index), this.expressionPlusOne(index)],
                undefined,
                node);
        } else {
            return tstl.createTableIndexExpression(table, index, undefined, node);
        }
    }

    public transformStringCallExpression(node: ts.CallExpression): tstl.Expression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transformArguments(node.arguments);
        const caller = this.transformExpression(expression.expression);

        const expressionName = expression.name.escapedText as string;
        switch (expressionName) {
            case "replace":
                return this.transformLuaLibFunction(LuaLibFeature.StringReplace, caller, ...params);
            case "indexOf":
                const stringExpression =
                    node.arguments.length === 1
                        ? this.createStringCall("find", node, caller, params[0])
                        : this.createStringCall(
                              "find", node, caller, params[0], this.expressionPlusOne(params[1]), tstl.createBooleanLiteral(true));

                return tstl.createBinaryExpression(
                    tstl.createBinaryExpression(stringExpression, tstl.createNumericLiteral(0), tstl.SyntaxKind.OrOperator),
                    tstl.createNumericLiteral(1),
                    tstl.SyntaxKind.SubractionOperator,
                    undefined,
                    node);
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
            case "toLowerCase":
                return this.createStringCall("lower", node, caller);
            case "toUpperCase":
                return this.createStringCall("upper", node, caller);
            case "split":
                return this.transformLuaLibFunction(LuaLibFeature.StringSplit, caller, ...params);
            case "charAt":
                const firstParamPlusOne = this.expressionPlusOne(params[0]);
                return this.createStringCall("sub", node, caller, firstParamPlusOne, firstParamPlusOne);
            default:
                throw TSTLErrors.UnsupportedProperty("string", expressionName, node);
        }
    }

    public createStringCall(methodName: string, tsOriginal: ts.Node, ...params: tstl.Expression[]): tstl.CallExpression {
        const stringIdentifier = tstl.createIdentifier("string");
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(stringIdentifier, tstl.createStringLiteral(methodName)), params, undefined, tsOriginal);
    }

    // Transpile a String._ property
    public transformStringExpression(identifier: ts.Identifier): tstl.TableIndexExpression {
        const identifierString = identifier.escapedText as string;

        switch (identifierString) {
            case "fromCharCode":
                return tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("char"));
            default:
                throw TSTLErrors.UnsupportedForTarget(`string property ${identifierString}`, this.options.luaTarget, identifier);
        }
    }

    public transformArrayCallExpression(node: ts.CallExpression): tstl.CallExpression {
        const expression = node.expression as ts.PropertyAccessExpression;
        const params = this.transformArguments(node.arguments);
        const caller = this.transformExpression(expression.expression);
        const expressionName = expression.name.escapedText;
        switch (expressionName) {
            case "concat":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayConcat, caller, ...params);
            case "push":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayPush, caller, ...params);
            case "reverse":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayReverse, caller);
            case "shift":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayShift, caller);
            case "unshift":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayUnshift, caller, ...params);
            case "sort":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySort, caller);
            case "pop":
                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("remove")),
                    [caller],
                    undefined,
                    node);
            case "forEach":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayForEach, caller, ...params);
            case "indexOf":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayIndexOf, caller, ...params);
            case "map":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayMap, caller, ...params);
            case "filter":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayFilter, caller, ...params);
            case "some":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySome, caller, ...params);
            case "every":
                return this.transformLuaLibFunction(LuaLibFeature.ArrayEvery, caller, ...params);
            case "slice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySlice, caller, ...params);
            case "splice":
                return this.transformLuaLibFunction(LuaLibFeature.ArraySplice, caller, ...params);
            case "join":
                const parameters = node.arguments.length === 0 ? [caller, tstl.createStringLiteral(",")] : [caller].concat(params);

                return tstl.createCallExpression(
                    tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("concat")),
                    parameters,
                    undefined,
                    node);
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
                return this.transformLuaLibFunction(LuaLibFeature.FunctionApply, caller, ...params);
            case "bind":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionBind, caller, ...params);
            case "call":
                return this.transformLuaLibFunction(LuaLibFeature.FunctionCall, caller, ...params);
            default:
                throw TSTLErrors.UnsupportedProperty("function", expressionName as string, node);
        }
    }

    public transformArrayBindingElement(name: ts.ArrayBindingElement): tstl.Identifier {
        if (ts.isOmittedExpression(name)) {
            return tstl.createIdentifier("__", undefined, name);
        } else if (ts.isIdentifier(name)) {
            return this.transformIdentifier(name);
        } else if (ts.isBindingElement(name) && ts.isIdentifier(name.name)) {
            return this.transformIdentifier(name.name);
        } else {
            throw TSTLErrors.UnsupportedKind("array binding element", name.kind, name);
        }
    }

    public transformAssertionExpression(node: ts.AssertionExpression): tstl.Expression {
        this.validateFunctionAssignment(node, this.checker.getTypeAtLocation(node.expression), this.checker.getTypeAtLocation(node.type));
        return this.transformExpression(node.expression);
    }

    public transformTypeOfExpression(node: ts.TypeOfExpression): ExpressionVisitResult {
        const expression = this.transformExpression(node.expression);
        // TODO - Is this even right?
        // return `(type(${expression}) == "table" and "object" or type(${expression}))`;
        throw new Error("Not yet implemented");
    }

    public transformStringLiteral(literal: ts.StringLiteralLike): tstl.StringLiteral {
        const text = this.escapeString(literal.text);
        return tstl.createStringLiteral(text);
    }

    public transformTemplateExpression(expression: ts.TemplateExpression): tstl.BinaryExpression {
        const parts: tstl.Expression[] = [tstl.createStringLiteral(this.escapeString(expression.head.text))];
        expression.templateSpans.forEach(span => {
            const expr = this.transformExpression(span.expression);
            const text = tstl.createStringLiteral(this.escapeString(span.literal.text));

            // tostring(expr).."text"
            parts.push(tstl.createBinaryExpression(
                tstl.createCallExpression(tstl.createIdentifier("tostring"), [expr]), text, tstl.SyntaxKind.ConcatOperator));
        });
        return parts.reduce((prev, current) => tstl.createBinaryExpression(prev, current, tstl.SyntaxKind.ConcatOperator)) as
               tstl.BinaryExpression;
    }

    public transformPropertyName(propertyName: ts.PropertyName): tstl.Expression {
        if (ts.isComputedPropertyName(propertyName)) {
            return this.transformExpression(propertyName.expression);
        } else if (ts.isStringLiteral(propertyName)) {
            return this.transformStringLiteral(propertyName);
        } else if (ts.isNumericLiteral(propertyName)) {
            const value = +propertyName.text;
            return tstl.createNumericLiteral(value, undefined, propertyName);
        } else {
            return tstl.createStringLiteral(this.transformIdentifier(propertyName).text);
        }
    }

    public transformIdentifier(epxression: ts.Identifier, parent?: tstl.Node): tstl.Identifier {
        if (epxression.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
            return tstl.createIdentifier("nil");  // TODO this is a hack that allows use to keep Identifier as return time
                                                  // as changing that would break a lot of stuff.
                                                  // But this should be changed to retunr tstl.createNilLiteral() at somepoint
        }
        let escapedText = epxression.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3 && escapedText.charCodeAt(0) === underScoreCharCode &&
            escapedText.charCodeAt(1) === underScoreCharCode && escapedText.charCodeAt(2) === underScoreCharCode) {
            escapedText = escapedText.substr(1);
        }

        if (this.luaKeywords.has(escapedText)) {
            throw TSTLErrors.KeywordIdentifier(epxression);
        }
        return tstl.createIdentifier(escapedText, parent, epxression);
    }

    public escapeString(text: string): string {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
        const escapeSequences: Array<[RegExp, string]> = [
            [/[\\]/g, "\\\\"],
            [/[\']/g, "\\\'"],
            [/[\`]/g, "\\\`"],
            [/[\"]/g, "\\\""],
            [/[\n]/g, "\\n"],
            [/[\r]/g, "\\r"],
            [/[\v]/g, "\\v"],
            [/[\t]/g, "\\t"],
            [/[\b]/g, "\\b"],
            [/[\f]/g, "\\f"],
            [/[\0]/g, "\\0"],
        ];

        if (text.length > 0) {
            for (const [regex, replacement] of escapeSequences) {
                text = text.replace(regex, replacement);
            }
        }
        return text;
    }

    public transformLuaLibFunction(func: LuaLibFeature, ...params: tstl.Expression[]): tstl.CallExpression {
        this.importLuaLibFeature(func);
        const functionIdentifier = tstl.createIdentifier(`__TS__${func}`);
        return tstl.createCallExpression(functionIdentifier, params);
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
            }
        }
    }

    public importLuaLibFeature(feature: LuaLibFeature): void {
        // Add additional lib requirements
        if (feature === LuaLibFeature.Map || feature === LuaLibFeature.Set) {
            this.luaLibFeatureSet.add(LuaLibFeature.InstanceOf);
        }

        // TODO inline imported features in output i option set
        this.luaLibFeatureSet.add(feature);
    }

    public createImmediatelyInvokedFunctionExpression(statements: tstl.Statement[], result: tstl.Expression | tstl.Expression[]):
        tstl.CallExpression {
        const body = statements ? statements.slice(0) : [];
        body.push(tstl.createReturnStatement(Array.isArray(result) ? result : [result]));
        const iife = tstl.createFunctionExpression(tstl.createBlock(body));
        return tstl.createCallExpression(tstl.createParenthesizedExpression(iife));
    }

    public createUnpackCall(expression: ts.Expression): tstl.Expression {
        return tstl.createCallExpression(
            tstl.createTableIndexExpression(tstl.createIdentifier("table"), tstl.createStringLiteral("unpack")),
            [this.transformExpression(expression)]);
    }

    private getAbsoluteImportPath(relativePath: string): string {
        if (relativePath.charAt(0) !== "." && this.options.baseUrl) {
            return path.resolve(this.options.baseUrl, relativePath);
        }
        return path.resolve(path.dirname(this.currentSourceFile.fileName), relativePath);
    }

    private getImportPath(relativePath: string): string {
        // Calculate absolute path to import
        const absolutePathToImport = this.getAbsoluteImportPath(relativePath);
        if (this.options.rootDir) {
            // Calculate path relative to project root
            // and replace path.sep with dots (lua doesn't know paths)
            const relativePathToRoot = this.pathToLuaRequirePath(absolutePathToImport.replace(this.options.rootDir, "").slice(1));
            return relativePathToRoot;
        }

        return this.pathToLuaRequirePath(relativePath);
    }

    private pathToLuaRequirePath(filePath: string): string {
        return filePath.replace(new RegExp("\\\\|\/", "g"), ".");
    }

    private createLocalOrGlobalDeclaration(lhs: tstl.Identifier, rhs: tstl.Expression, parent?: tstl.Node, tsOriginal?: ts.Node):
        tstl.Statement {
        if (this.isModule || this.currentNamespace) {
            return tstl.createVariableDeclarationStatement(lhs, rhs, parent, tsOriginal);
        } else {
            return tstl.createAssignmentStatement(lhs, rhs, parent, tsOriginal);
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

        const fromTypeReference = fromType as ts.TypeReference;
        const toTypeReference = toType as ts.TypeReference;
        if (fromTypeReference.typeArguments && toTypeReference.typeArguments) {
            // Recurse into tuples/arrays
            toTypeReference.typeArguments.forEach((t, i) => {
                this.validateFunctionAssignment(node, fromTypeReference.typeArguments[i], t, toName);
            });
        }

        if ((toType.flags & ts.TypeFlags.Object) !== 0 && ((toType as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0 &&
            toType.symbol && toType.symbol.members && fromType.symbol && fromType.symbol.members) {
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

    private peekScope(): Scope {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    private pushScope(scopeType: ScopeType): void {
        this.scopeStack.push({type: scopeType, id: this.genVarCounter});
        this.genVarCounter++;
    }

    private popScope(): Scope {
        return this.scopeStack.pop();
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
