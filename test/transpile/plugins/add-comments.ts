import * as ts from "typescript";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    visitors: {
        [ts.SyntaxKind.VariableStatement](node, context) {
            const result = context.superTransformStatements(node);

            const firstLuaStatement = result[0];
            const lastLuaStatement = result[result.length - 1];

            firstLuaStatement.leadingComments = [
                "This comment on variable declaration was added by a plugin!",
                "- This one too!",
            ];

            lastLuaStatement.trailingComments = [" This trailing comment was also added by a plugin!"];

            return result;
        },
        [ts.SyntaxKind.ExpressionStatement](node, context) {
            const result = context.superTransformStatements(node);

            const firstLuaStatement = result[0];
            const lastLuaStatement = result[result.length - 1];

            firstLuaStatement.leadingComments = ["- Example luadoc comment", "-@param paramName ParamClass"];

            lastLuaStatement.trailingComments = [
                "[[ This plugin can also (kinda) create multiline comments.",
                " Line 2",
                "]]",
            ];

            return result;
        },
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
