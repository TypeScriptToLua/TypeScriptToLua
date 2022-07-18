import { SourceNode } from "source-map";
import * as ts from "typescript";
import * as tstl from "..";
import * as path from "path";
import { LuaLibFeature, LuaLibModulesInfo, luaLibModulesInfoFileName, resolveRecursiveLualibFeatures } from "../LuaLib";
import { EmitHost, ProcessedFile } from "../transpilation/utils";
import {
    isExportAlias,
    isExportAssignment,
    isExportsReturn,
    isExportTableDeclaration,
    isImport,
    isRequire,
} from "./util";
import { createDiagnosticFactoryWithCode } from "../utils";

export const lualibDiagnostic = createDiagnosticFactoryWithCode(200000, (message: string, file?: ts.SourceFile) => ({
    messageText: message,
    file,
    start: file && 0,
    length: file && 0,
}));

class LuaLibPlugin implements tstl.Plugin {
    // Plugin members
    public visitors = {
        [ts.SyntaxKind.SourceFile]: this.lualibFileVisitor.bind(this),
    };

    public printer: tstl.Printer = (program, emitHost, fileName, file) =>
        new LuaLibPrinter(emitHost, program, fileName).print(file);

    public afterPrint(program: ts.Program, options: tstl.CompilerOptions, emitHost: EmitHost, result: ProcessedFile[]) {
        void options;

        // Write lualib dependency json
        const { result: luaLibModuleInfo, diagnostics } = this.createLuaLibModulesInfo();
        const emitBOM = options.emitBOM ?? false;
        emitHost.writeFile(
            path.join(tstl.getEmitOutDir(program), luaLibModulesInfoFileName),
            JSON.stringify(luaLibModuleInfo, null, 2),
            emitBOM
        );

        // Create map of result files keyed by their 'lualib name'
        const exportedLualibFeatures = new Map(result.map(f => [path.basename(f.fileName).split(".")[0], f.code]));

        // Figure out the order required in the bundle by recursively resolving all dependency features
        const allFeatures = Object.values(LuaLibFeature) as LuaLibFeature[];
        const orderedFeatures = resolveRecursiveLualibFeatures(allFeatures, emitHost, luaLibModuleInfo);

        // Concatenate lualib files into bundle with exports table and add lualib_bundle.lua to results
        let lualibBundle = orderedFeatures.map(f => exportedLualibFeatures.get(LuaLibFeature[f])).join("\n");
        const exports = allFeatures.flatMap(feature => luaLibModuleInfo[feature].exports);
        lualibBundle += `\nreturn {\n${exports.map(exportName => `  ${exportName} = ${exportName}`).join(",\n")}\n}\n`;
        result.push({ fileName: "lualib_bundle.lua", code: lualibBundle });

        return diagnostics;
    }

    // Internals
    protected featureExports: Map<tstl.LuaLibFeature, Set<string>> = new Map();
    protected featureDependencies: Map<tstl.LuaLibFeature, Set<tstl.LuaLibFeature>> = new Map();

    protected lualibFileVisitor(file: ts.SourceFile, context: tstl.TransformationContext): tstl.File {
        const featureName = path.basename(file.fileName, ".ts") as tstl.LuaLibFeature;
        if (!(featureName in tstl.LuaLibFeature)) {
            context.diagnostics.push(lualibDiagnostic(`File is not a lualib feature: ${featureName}`, file));
        }

        // Transpile file as normal with tstl
        const fileResult = context.superTransformNode(file)[0] as tstl.File;

        const usedFeatures = new Set<tstl.LuaLibFeature>(context.usedLuaLibFeatures);

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
            .filter(
                s => !isExportTableDeclaration(s) && !isRequire(s) && !isImport(s, importNames) && !isExportsReturn(s)
            )
            .map(statement => {
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

        // Save dependency information
        this.featureExports.set(featureName, new Set(exportNames));
        if (usedFeatures.size > 0) {
            this.featureDependencies.set(featureName, usedFeatures);
        }

        return fileResult;
    }

    protected createLuaLibModulesInfo(): { result: LuaLibModulesInfo; diagnostics: ts.Diagnostic[] } {
        const result: Partial<LuaLibModulesInfo> = {};
        const diagnostics: ts.Diagnostic[] = [];
        for (const feature of Object.values(tstl.LuaLibFeature)) {
            const exports = this.featureExports.get(feature);
            if (!exports) {
                diagnostics.push(lualibDiagnostic(`Missing file for lualib feature: ${feature}`));
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
