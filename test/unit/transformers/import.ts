import * as ts from "typescript";
import { visitAndReplace } from "./utils";

export const transformer = (): ts.TransformerFactory<ts.SourceFile> => context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    });
