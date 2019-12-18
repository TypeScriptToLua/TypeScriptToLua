import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    visitors: {
        [ts.SyntaxKind.StringLiteral]: (node, context) => {
            const result = context.superTransformExpression(node);

            if (tstl.isStringLiteral(result)) {
                result.value = "bar";
            }

            return result;
        },
    },
};

// tslint:disable-next-line: no-default-export
export default plugin;
