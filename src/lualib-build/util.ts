import * as tstl from "..";

export function isExportTableDeclaration(node: tstl.Node): node is tstl.VariableDeclarationStatement & { left: [] } {
    return tstl.isVariableDeclarationStatement(node) && isExportTable(node.left[0]);
}

export function isExportTable(node: tstl.Node): node is tstl.Identifier {
    return tstl.isIdentifier(node) && node.text === "____exports";
}

export type ExportTableIndex = tstl.TableIndexExpression & { index: tstl.StringLiteral };
export function isExportTableIndex(node: tstl.Node): node is ExportTableIndex {
    return tstl.isTableIndexExpression(node) && isExportTable(node.table) && tstl.isStringLiteral(node.index);
}

export function isExportAlias(
    node: tstl.Node,
): node is tstl.VariableDeclarationStatement & { right: [ExportTableIndex] } {
    return tstl.isVariableDeclarationStatement(node) && node.right !== undefined && isExportTableIndex(node.right[0]);
}

export type ExportAssignment = tstl.AssignmentStatement & { left: [ExportTableIndex] };
export function isExportAssignment(node: tstl.Node): node is ExportAssignment {
    return tstl.isAssignmentStatement(node) && isExportTableIndex(node.left[0]);
}

export function isRequire(node: tstl.Node) {
    return (
        tstl.isVariableDeclarationStatement(node) &&
        node.right &&
        tstl.isCallExpression(node.right[0]) &&
        tstl.isIdentifier(node.right[0].expression) &&
        node.right[0].expression.text === "require"
    );
}

export function isImport(node: tstl.Node, importNames: Set<string>) {
    return tstl.isVariableDeclarationStatement(node) && importNames.has(node.left[0].text);
}

export function isExportsReturn(node: tstl.Node) {
    return (
        tstl.isReturnStatement(node) &&
        tstl.isIdentifier(node.expressions[0]) &&
        node.expressions[0].text === "____exports"
    );
}
