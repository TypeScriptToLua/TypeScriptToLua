import * as ts from "typescript";
import { visitAndReplace } from "./utils";

// eslint-disable-next-line import/no-default-export
export default (): ts.TransformerFactory<ts.SourceFile> => context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    });
