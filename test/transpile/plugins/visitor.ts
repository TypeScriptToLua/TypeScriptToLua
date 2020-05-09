import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    visitors: {
        [ts.SyntaxKind.ReturnStatement]: () => tstl.createReturnStatement([tstl.createBooleanLiteral(true)]),
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
