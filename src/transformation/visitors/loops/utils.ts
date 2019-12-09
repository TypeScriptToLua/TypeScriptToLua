import * as ts from "typescript";
import { checkVariableDeclarationList } from "../variable-declaration";

export function getVariableDeclarationBinding(node: ts.VariableDeclarationList): ts.BindingName {
    checkVariableDeclarationList(node);

    if (node.declarations.length === 0) {
        return ts.createIdentifier("____");
    }

    return node.declarations[0].name;
}
