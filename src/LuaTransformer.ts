
import * as path from "path";
import * as ts from "typescript";

import * as tstl from "./LuaAST";

import {CompilerOptions} from "./CompilerOptions";
import {DecoratorKind} from "./Decorator";
import {TSTLErrors} from "./Errors";
import {TSHelper as tsHelper} from "./TSHelper";

type StatementVisitResult = tstl.Statement | tstl.Statement[] | undefined;
type ExpressionVisitResult = tstl.Expression | undefined;

export class LuaTransformer {
    public luaKeywords: Set<string> = new Set(
        ["and", "break", "do", "else", "elseif",
         "end", "false", "for", "function", "if",
         "in", "local", "nil", "not", "or",
         "repeat", "return", "then", "until", "while"]);

    private selfIdentifier = tstl.createIdentifier("self");

    private checker: ts.TypeChecker;
    private options: CompilerOptions;
    private sourceFile: ts.SourceFile;
    private isModule: boolean;

    private currentNamespace: ts.ModuleDeclaration;
    private classStack: tstl.Identifier[];

    public transformSourceFile(node: ts.SourceFile): tstl.Block {
        return tstl.createBlock(this.transformStatements(node.statements), undefined, node);
    }

    public transformStatement(node: ts.Statement): StatementVisitResult {
        switch (node.kind) {
            // Blocm
            case ts.SyntaxKind.Block:
                return this.transformBlock(node as ts.Block);
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

    /** Convers an array of ts.Statements into an array of ts.Statements */
    public transformStatements(
        statements: ts.Statement[] | ReadonlyArray<ts.Statement>): tstl.Statement[] {

        function flat<T>(arr: T[] | ReadonlyArray<T>): T[] {
            const flatArr = [].concat(...arr);
            return flatArr.some(Array.isArray) ? flat(flatArr) : flatArr;
        }
        return flat(statements).map(statement => this.transformStatement(statement)) as tstl.Statement[];
    }

    public transformBlock(block: ts.Block): tstl.DoStatement {
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
            const requireStatement =
                tstl.createVariableDeclarationStatement(
                    tstl.createIdentifier(path.basename(importPath)),
                    requireCall,
                    undefined,
                    statement);
            result.push(requireStatement);

            filteredElements.forEach(importSpecifier => {
                if (importSpecifier.propertyName) {
                    const propertyName = this.transformIdentifier(importSpecifier.propertyName);
                    const renamedImport = tstl.createVariableDeclarationStatement(
                        this.transformIdentifier(importSpecifier.name),
                        tstl.createTableIndexExpression(importUniqueName, propertyName), undefined, importSpecifier);
                    result.push(renamedImport);
                } else {
                    const name = this.transformIdentifier(importSpecifier.name);
                    const namedImport = tstl.createVariableDeclarationStatement(
                        name,
                        tstl.createTableIndexExpression(importUniqueName, name), undefined, importSpecifier);
                    result.push(namedImport);
                }
            });
            return result;
        } else if (ts.isNamespaceImport(imports)) {
            const requireStatement =
                tstl.createVariableDeclarationStatement(
                    this.transformIdentifier(imports.name),
                    requireCall,
                    undefined,
                    statement);
            result.push(requireStatement);
            return result;
        } else {
            throw TSTLErrors.UnsupportedImportType(imports);
        }
    }

    public transformClassDeclaration(
        statement: ts.ClassDeclaration, nameOverride?: tstl.Identifier): StatementVisitResult {

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
        const properties = statement.members.filter(ts.isPropertyDeclaration)
            .filter(member => member.initializer);

        // Divide properties into static and non-static
        const isStatic = prop => prop.modifiers && prop.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
        const staticFields = properties.filter(isStatic);
        const instanceFields = properties.filter(prop => !isStatic(prop));

        let result: tstl.Statement[] = [];

        // Overwrite the original className with the class we are overriding for extensions
        if (isMetaExtension) {
            if (!extendsType) {
                throw TSTLErrors.MissingMetaExtension(statement);
            }

            const extendsName = tstl.createIdentifier(extendsType.symbol.escapedName as string);
            className = tstl.createIdentifier("__meta__" + extendsName.text);

            // local className = debug.getregistry()["extendsName"]
            const assignDebugCallIndex =
                tstl.createVariableDeclarationStatement(
                    className,
                    tstl.createTableIndexExpression(
                        tstl.createCallExpression(
                            tstl.createTableIndexExpression(
                                tstl.createIdentifier("debug"),
                                tstl.createIdentifier("getregistry")
                            ),
                            []
                        ),
                        extendsName
                    ),
                    undefined,
                    statement
                );

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
            const classCreationMethods =
                this.createClassCreationMethods(statement, className, instanceFields, extendsType);
            result.concat(classCreationMethods);
        } else {
            for (const f of instanceFields) {
                // Get identifier
                const fieldIdentifier = f.name as ts.Identifier;
                const fieldName = this.transformIdentifier(fieldIdentifier);

                const value = this.transformExpression(f.initializer);

                // className["fieldName"]
                const classField = tstl.createTableIndexExpression(className, fieldName);

                // className["fieldName"] = value;
                const assignClassField = tstl.createVariableAssignmentStatement(classField, value);

                result.push(assignClassField);
            }
        }

        // Add static declarations
        for (const field of staticFields) {
            const fieldName = this.transformIdentifier(field.name as ts.Identifier);
            const value = this.transformExpression(field.initializer);

            const fieldAssign = tstl.createVariableAssignmentStatement(
                tstl.createTableIndexExpression(className, fieldName),
                value
            );

            result.push(fieldAssign);
        }

        // Find first constructor with body
        const constructor =
            statement.members.filter(n => ts.isConstructorDeclaration(n) && n.body)[0] as ts.ConstructorDeclaration;
        if (constructor) {
            // Add constructor plus initialization of instance fields
            result += this.transpileConstructor(constructor, className);
        } else if (!isExtension && !extendsType) {
            // Generate a constructor if none was defined
            result += this.transpileConstructor(ts.createConstructor([], [], [], ts.createBlock([], true)),
                                                className);
        }

        // Transpile get accessors
        statement.members.filter(ts.isGetAccessor).forEach(getAccessor => {
            result += this.transpileGetAccessorDeclaration(getAccessor, className);
        });

        // Transpile set accessors
        statement.members.filter(ts.isSetAccessor).forEach(setAccessor => {
            result += this.transpileSetAccessorDeclaration(setAccessor, className);
        });

        // Transpile methods
        statement.members.filter(ts.isMethodDeclaration).forEach(method => {
            result += this.transpileMethodDeclaration(method, `${className}.`);
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
            const newIndex =
                tstl.createTableIndexExpression(baseName, tstl.createIdentifier("new"));

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
            const classVar = this.createLocalOrGlobalDeclaration(className, rhs, undefined,  statement);

            result.push(classVar);
        }

        // className.__index
        const classIndex = tstl.createTableIndexExpression(className, tstl.createIdentifier("__index"));
        // className.__index = className
        const assignClassIndex = tstl.createVariableAssignmentStatement(classIndex, className, undefined, statement);

        result.push(assignClassIndex);

        if (extendsType) {
            const baseName = tstl.createIdentifier(extendsType.symbol.escapedName as string);
            // className.__base = baseName
            const classBase =
                tstl.createTableIndexExpression(className, tstl.createIdentifier("__base"));

            const assignClassBase = tstl.createVariableAssignmentStatement(classBase, baseName, undefined, statement);

            result.push(assignClassBase);
        }

        const newFuncStatements: tstl.Statement[] = [];

        // local self = setmetatable({}, className)
        const assignSelf = tstl.createVariableDeclarationStatement(
            this.selfIdentifier,
            tstl.createCallExpression(
                tstl.createIdentifier("setmetatable"),
                [tstl.createTableExpression(), className]
            )
        );

        newFuncStatements.push(assignSelf);

        for (const f of instanceFields) {
            // Get identifier
            const fieldIdentifier = f.name as ts.Identifier;
            const fieldName = this.transformIdentifier(fieldIdentifier);

            const value = this.transformExpression(f.initializer);

            // self[fieldName]
            const selfIndex = tstl.createTableIndexExpression(this.selfIdentifier, fieldName);

            // self[fieldName] = value
            const assignClassField = tstl.createVariableAssignmentStatement(selfIndex, value);

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
                tstl.createTableIndexExpression(className, tstl.createIdentifier("constructor")),
                tstl.SyntaxKind.AndOperator
            ),
            tstl.createBlock([
                tstl.createExpressionStatement(
                    tstl.createCallExpression(
                        tstl.createTableIndexExpression(className, tstl.createIdentifier("constructor")),
                        [this.selfIdentifier, tstl.createDotsLiteral()]
                    )
                ),
            ])
        );

        newFuncStatements.push(ifConstructor);

        // return self
        const returnSelf = tstl.createReturnStatement([this.selfIdentifier]);

        newFuncStatements.push(returnSelf);

        // function className.new(construct, ...) ... end
        const newFunc = tstl.createVariableAssignmentStatement(
            tstl.createTableIndexExpression(className, tstl.createIdentifier("new")),
            tstl.createFunctionExpression(
                tstl.createBlock(newFuncStatements),
                [tstl.createIdentifier("construct")],
                tstl.createDotsLiteral(),
                undefined,
                undefined,
                statement
            )
        );

        result.push(newFunc);

        return result;
    }

    public transformConstructor(
        statement: ts.ConstructorDeclaration, className: tstl.Identifier): StatementVisitResult {

        // Don't transpile methods without body (overload declarations)
        if (!statement.body) {
            return undefined;
        }

        // Check for field declarations in constructor
        const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);

        // Transpile constructor body
        this.classStack.push(className);

        const bodyStatements: tstl.Statement[] = [];
        const body: tstl.Block = tstl.createBlock(bodyStatements);

        // Add in instance field declarations
        for (const declaration of constructorFieldsDeclarations) {
            const declarationName = this.transformIdentifier(declaration.name as ts.Identifier);
            if (declaration.initializer) {
                // self.declarationName = declarationName or initializer
                const assignement =
                    tstl.createVariableAssignmentStatement(
                        tstl.createTableIndexExpression(
                            this.selfIdentifier,
                            declarationName
                        ),
                        tstl.createBinaryExpression(
                            declarationName,
                            this.transformExpression(declaration.initializer),
                            tstl.SyntaxKind.OrOperator
                        )
                    );
                bodyStatements.push(assignement);
            } else {
                // self.declarationName = declarationName
                const assignement =
                tstl.createVariableAssignmentStatement(
                    tstl.createTableIndexExpression(
                        this.selfIdentifier,
                        declarationName
                    ),
                    declarationName
                );
                bodyStatements.push(assignement);
            }
        }

        // function className.constructor(params) ... end

        const [params, dotsLiteral, restParamName] =
            this.transformParameters(statement.parameters, this.selfIdentifier);

        bodyStatements.concat(this.transformFunctionBody(statement.parameters, statement.body, restParamName));

        const result =
            tstl.createVariableAssignmentStatement(
                tstl.createTableIndexExpression(
                    this.selfIdentifier,
                    className
                ),
                tstl.createFunctionExpression(
                    body,
                    params,
                    dotsLiteral,
                    restParamName,
                    undefined,
                    undefined
                ),
                undefined,
                statement
            );

        this.classStack.pop();

        return result;
    }

    public transformParameters(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        context: tstl.Identifier): [tstl.Identifier[], tstl.DotsLiteral, tstl.Identifier | undefined] {

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

    public transformFunctionBody(
        parameters: ts.NodeArray<ts.ParameterDeclaration>,
        body: ts.Block,
        spreadIdentifier?: tstl.Identifier
    ): tstl.Statement[] {
        this.pushSpecialScope(ScopeType.Function);
        let result = "";

        // Add default parameters
        const defaultValueParams = parameters.filter(declaration => declaration.initializer !== undefined);
        result += this.transpileParameterDefaultValues(defaultValueParams);

        // Push spread operator here
        if (spreadIdentifier !== "") {
            result += this.indent + `local ${spreadIdentifier} = { ... }\n`;
        }

        result += this.transpileBlock(body);
        this.popSpecialScope();

        return result;
    }

    public transformModuleDeclaration(arg0: ts.ModuleDeclaration, parent: tstl.Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformEnumDeclaration(arg0: ts.EnumDeclaration, parent: tstl.Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformFunctionDeclaration(arg0: FunctionDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformTypeAliasDeclaration(arg0: TypeAliasDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformInterfaceDeclaration(arg0: InterfaceDeclaration, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformVariableStatement(arg0: VariableStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformExpressionStatement(arg0: ExpressionStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformReturn(arg0: ReturnStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformIfStatement(arg0: IfStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformWhileStatement(arg0: WhileStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformDoStatement(arg0: DoStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForStatement(arg0: ForStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForOfStatement(arg0: ForOfStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformForInStatement(arg0: ForInStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformSwitchStatement(arg0: SwitchStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformBreakStatement(arg0: BreakStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformTryStatement(arg0: TryStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformThrowStatement(arg0: ThrowStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformContinueStatement(arg0: ContinueStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }
    public transformEmptyStatement(arg0: EmptyStatement, parent: Node): StatementVisitResult {
        throw new Error("Method not implemented.");
    }

    // Expressions
    public transformExpression(expression: ts.Expression, parent?: tstl.Node): ExpressionVisitResult {
        // TODO
        return undefined;
    }

    public transformIdentifier(epxression: ts.Identifier, parent?: tstl.Node): tstl.Identifier {
        let escapedText = epxression.escapedText as string;
        const underScoreCharCode = "_".charCodeAt(0);
        if (escapedText.length >= 3
            && escapedText.charCodeAt(0) === underScoreCharCode
            && escapedText.charCodeAt(1) === underScoreCharCode
            && escapedText.charCodeAt(2) === underScoreCharCode) {
            escapedText = escapedText.substr(1);
        }

        if (this.luaKeywords.has(escapedText)) {
            throw TSTLErrors.KeywordIdentifier(epxression);
        }
        return tstl.createIdentifier(escapedText, parent, epxression);
    }

    private getAbsoluteImportPath(relativePath: string): string {
        if (relativePath.charAt(0) !== "." && this.options.baseUrl) {
            return path.resolve(this.options.baseUrl, relativePath);
        }
        return path.resolve(path.dirname(this.sourceFile.fileName), relativePath);
    }

    private getImportPath(relativePath: string): string {
        // Calculate absolute path to import
        const absolutePathToImport = this.getAbsoluteImportPath(relativePath);
        if (this.options.rootDir) {
            // Calculate path relative to project root
            // and replace path.sep with dots (lua doesn't know paths)
            const relativePathToRoot =
                this.pathToLuaRequirePath(absolutePathToImport.replace(this.options.rootDir, "").slice(1));
            return relativePathToRoot;
        }

        return this.pathToLuaRequirePath(relativePath);
    }

    private pathToLuaRequirePath(filePath: string): string {
        return filePath.replace(new RegExp("\\\\|\/", "g"), ".");
    }

    private createLocalOrGlobalDeclaration(
        lhs: tstl.Identifier, rhs: tstl.Expression, parent?: tstl.Node, tsOriginal?: ts.Node): tstl.Statement {

        if (this.isModule || this.currentNamespace) {
            return tstl.createVariableDeclarationStatement(lhs, rhs, parent, tsOriginal);
        } else {
            return tstl.createVariableAssignmentStatement(lhs, rhs, parent, tsOriginal);
        }
    }
}
