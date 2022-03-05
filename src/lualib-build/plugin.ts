import { SourceNode } from "source-map";
import * as ts from "typescript";
import * as tstl from "..";
import * as path from "path";
import { createDiagnosticFactoryWithCode } from "../utils";
import { getUsedLuaLibFeatures } from "../transformation/utils/lualib";
import { LuaLibModulesInfo } from "../LuaLib";

const lualibDiagnostic = createDiagnosticFactoryWithCode(200000, (message: string, file?: ts.SourceFile) => ({
    messageText: message,
    file,
    start: file && 0,
    length: file && 0,
}));

class LuaLibPlugin implements tstl.Plugin {
    public visitors = {
        [ts.SyntaxKind.SourceFile]: this.lualibFileVisitor.bind(this),
    };
    public printer: tstl.Printer = (program, emitHost, fileName, file) =>
        new LuaLibPrinter(emitHost, program, fileName).print(file);

    public featureExports: Map<tstl.LuaLibFeature, Set<string>> = new Map();
    public featureDependencies: Map<tstl.LuaLibFeature, Set<tstl.LuaLibFeature>> = new Map();

    public lualibFileVisitor(file: ts.SourceFile, context: tstl.TransformationContext): tstl.File {
        const featureName = path.basename(file.fileName, ".ts") as tstl.LuaLibFeature;
        if (!(featureName in tstl.LuaLibFeature)) {
            context.diagnostics.push(lualibDiagnostic(`File is not a lualib feature: ${featureName}`, file));
        }

        // Transpile file as normal with tstl
        const fileResult = context.superTransformNode(file)[0] as tstl.File;

        const usedFeatures = new Set<tstl.LuaLibFeature>(getUsedLuaLibFeatures(context));

        // Get all imports in file
        const importNames = new Set<string>();
        const imports = file.statements.filter(ts.isImportDeclaration);
        for (const { importClause, moduleSpecifier } of imports) {
            if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                for (const { name } of importClause.namedBindings.elements) {
                    importNames.add(name.text);
                }
            }
            // track lualib imports
            if (ts.isStringLiteral(moduleSpecifier)) {
                const featureName = path.basename(moduleSpecifier.text, ".ts") as tstl.LuaLibFeature;
                if (featureName in tstl.LuaLibFeature) {
                    usedFeatures.add(featureName);
                }
            }
        }

        const filteredStatements = fileResult.statements
            .map(statement => {
                if (
                    isExportTableDeclaration(statement) ||
                    isRequire(statement) ||
                    isImport(statement, importNames) ||
                    isExportsReturn(statement)
                ) {
                    return undefined;
                }
                if (isExportAlias(statement)) {
                    const name = statement.left[0];
                    const exportName = statement.right[0].index.value;
                    if (name.text === exportName) return undefined; // Remove "x = x" statements
                    return tstl.createAssignmentStatement(name, tstl.createIdentifier(exportName));
                }
                return statement;
            })
            .filter(statement => statement !== undefined) as tstl.Statement[];

        const exportNames = filteredStatements.filter(isExportAssignment).map(s => s.left[0].index.value);
        if (!filteredStatements.every(isExportAssignment)) {
            // If there are local statements, wrap them in a do ... end with exports outside
            const exports = tstl.createVariableDeclarationStatement(exportNames.map(k => tstl.createIdentifier(k)));
            // transform export assignments to local assignments
            const bodyStatements = filteredStatements.map(s =>
                isExportAssignment(s)
                    ? tstl.createAssignmentStatement(tstl.createIdentifier(s.left[0].index.value), s.right[0])
                    : s
            );

            fileResult.statements = [exports, tstl.createDoStatement(bodyStatements)];
        } else {
            // transform export assignments to local variable declarations
            fileResult.statements = filteredStatements.map(s =>
                tstl.createVariableDeclarationStatement(tstl.createIdentifier(s.left[0].index.value), s.right[0])
            );
        }

        this.featureExports.set(featureName, new Set(exportNames));
        if (usedFeatures.size > 0) {
            this.featureDependencies.set(featureName, usedFeatures);
        }

        return fileResult;
    }

    public createLuaLibModulesInfo(): { result: LuaLibModulesInfo; diagnostics: ts.Diagnostic[] } {
        const result: Partial<LuaLibModulesInfo> = {};
        const diagnostics: ts.Diagnostic[] = [];
        for (const feature of Object.values(tstl.LuaLibFeature)) {
            const exports = this.featureExports.get(feature);
            if (!exports) {
                diagnostics.push(lualibDiagnostic(`Missing file for lualib feature: ${feature}`));
                console.error(`Missing file for lualib feature: ${feature}`);
                continue;
            }
            const dependencies = this.featureDependencies.get(feature);
            result[feature] = {
                exports: Array.from(exports),
                dependencies: dependencies ? Array.from(dependencies) : undefined,
            };
        }
        return { result: result as LuaLibModulesInfo, diagnostics };
    }
}

class LuaLibPrinter extends tstl.LuaPrinter {
    // Strip all exports during print
    public printTableIndexExpression(expression: tstl.TableIndexExpression): SourceNode {
        if (
            tstl.isIdentifier(expression.table) &&
            expression.table.text === "____exports" &&
            tstl.isStringLiteral(expression.index)
        ) {
            return super.printExpression(tstl.createIdentifier(expression.index.value));
        }
        return super.printTableIndexExpression(expression);
    }
}

const pluginInstance = new LuaLibPlugin();
// eslint-disable-next-line import/no-default-export
export default pluginInstance;

function isExportTableDeclaration(node: tstl.Node): node is tstl.VariableDeclarationStatement & { left: [] } {
    return tstl.isVariableDeclarationStatement(node) && isExportTable(node.left[0]);
}

function isExportTable(node: tstl.Node): node is tstl.Identifier {
    return tstl.isIdentifier(node) && node.text === "____exports";
}

type ExportTableIndex = tstl.TableIndexExpression & { index: tstl.StringLiteral };
function isExportTableIndex(node: tstl.Node): node is ExportTableIndex {
    return tstl.isTableIndexExpression(node) && isExportTable(node.table) && tstl.isStringLiteral(node.index);
}

function isExportAlias(node: tstl.Node): node is tstl.VariableDeclarationStatement & { right: [ExportTableIndex] } {
    return tstl.isVariableDeclarationStatement(node) && node.right !== undefined && isExportTableIndex(node.right[0]);
}

type ExportAssignment = tstl.AssignmentStatement & { left: [ExportTableIndex] };
function isExportAssignment(node: tstl.Node): node is ExportAssignment {
    return tstl.isAssignmentStatement(node) && isExportTableIndex(node.left[0]);
}

function isRequire(node: tstl.Node) {
    return (
        tstl.isVariableDeclarationStatement(node) &&
        node.right &&
        tstl.isCallExpression(node.right[0]) &&
        tstl.isIdentifier(node.right[0].expression) &&
        node.right[0].expression.text === "require"
    );
}

function isImport(node: tstl.Node, importNames: Set<string>) {
    return tstl.isVariableDeclarationStatement(node) && importNames.has(node.left[0].text);
}

function isExportsReturn(node: tstl.Node) {
    return (
        tstl.isReturnStatement(node) &&
        tstl.isIdentifier(node.expressions[0]) &&
        node.expressions[0].text === "____exports"
    );
}
