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
        [ts.SyntaxKind.WhileStatement](node, context) {
            const result = context.superTransformStatements(node);

            const firstLuaStatement = result[0];
            const lastLuaStatement = result[result.length - 1];

            firstLuaStatement.leadingComments = [
                ["Multiline comments are supported as arrays", "This is the second line!"],
            ];

            lastLuaStatement.trailingComments = [
                "Single line comments and multiline comments can also be mixed",
                ["Like this", "Pretty cool!"],
                "Empty multiline comment below:",
                [],
                "Single line multiline comment:",
                ["Single line"],
            ];

            return result;
        },
    },
};

export default plugin;
