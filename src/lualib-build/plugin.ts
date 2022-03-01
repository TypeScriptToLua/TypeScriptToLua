import { SourceNode } from "source-map";
import * as ts from "typescript";
import * as tstl from "..";

function lualibFileVisitor(file: ts.SourceFile, context: tstl.TransformationContext): tstl.File {
    // Get all imports in file
    const imports = file.statements.filter(ts.isImportDeclaration);

    const importNames = new Set<string>();
    for (const { importClause } of imports) {
        if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
            for (const { name } of importClause.namedBindings.elements) {
                importNames.add(name.text);
            }
        }
    }

    // Transpile file as normal with tstl
    const fileResult = context.superTransformNode(file)[0] as tstl.File;

    // Find all exports assignments
    const exportInitializers = new Map<string, tstl.Expression>();
    for (const s of fileResult.statements) {
        if (tstl.isAssignmentStatement(s) && isExportTableIndex(s.left[0])) {
            exportInitializers.set(s.left[0].index.value, s.right[0]);
        }
    }

    // Replace export aliases with initializers
    for (let i = 0; i < fileResult.statements.length; i++) {
        const statement = fileResult.statements[i];
        if (isExportAlias(statement)) {
            const name = statement.left[0];
            fileResult.statements[i] = tstl.createAssignmentStatement(name, exportInitializers.get(name.text));
        }
    }

    // Filter out import/export statements
    const shouldIgnoreImportsExports = (node: tstl.Node) =>
        !isExportTableDeclaration(node) &&
        !isRequire(node) &&
        !isImport(node, importNames) &&
        !isExportAssignment(node) &&
        !isExportsReturn(node);
    const filteredStatements = fileResult.statements.filter(shouldIgnoreImportsExports);

    if (filteredStatements.length > 0) {
        // If there are local statements, wrap them in a do ... end with exports outside
        const exports = tstl.createVariableDeclarationStatement([...exportInitializers.keys()].map(k => tstl.createIdentifier(k)));

        fileResult.statements = [exports, tstl.createDoStatement(filteredStatements)];
    } else {
        const newStatements = [];
        for (const [exportName, initializer] of exportInitializers) {
            newStatements.push(tstl.createVariableDeclarationStatement(tstl.createIdentifier(exportName), initializer));
        }
        fileResult.statements = newStatements;
    }

    return fileResult;
}

class LuaLibPrinter extends tstl.LuaPrinter {
    // Strip all exports during print
    public printTableIndexExpression(expression: tstl.TableIndexExpression): SourceNode {
        if (tstl.isIdentifier(expression.table) && expression.table.text === "____exports" && tstl.isStringLiteral(expression.index)) {
            return super.printExpression(tstl.createIdentifier(expression.index.value));
        }
        return super.printTableIndexExpression(expression);
    }
}

const plugin: tstl.Plugin = {
    visitors: {
        [ts.SyntaxKind.SourceFile]: lualibFileVisitor,
    },
    printer: (program, emitHost, fileName, file) => new LuaLibPrinter(emitHost, program, fileName).print(file),
};

// eslint-disable-next-line import/no-default-export
export default plugin;

function isExportTableDeclaration(node: tstl.Node): node is tstl.VariableDeclarationStatement & { left: [] } {
    return tstl.isVariableDeclarationStatement(node) && isExportTable(node.left[0]);
}

function isExportTable(node: tstl.Node): node is tstl.Identifier {
    return tstl.isIdentifier(node) && node.text === "____exports";
}

function isExportTableIndex(node: tstl.Node): node is tstl.TableIndexExpression & { index: tstl.StringLiteral } {
    return tstl.isTableIndexExpression(node) && isExportTable(node.table) && tstl.isStringLiteral(node.index);
}

function isExportAlias(node: tstl.Node): node is tstl.VariableDeclarationStatement {
    return tstl.isVariableDeclarationStatement(node) && node.right !== undefined && isExportTableIndex(node.right[0]);
}

function isExportAssignment(node: tstl.Node) {
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
