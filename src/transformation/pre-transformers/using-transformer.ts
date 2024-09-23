import * as ts from "typescript";
import { TransformationContext } from "../context";
import { LuaLibFeature, importLuaLibFeature } from "../utils/lualib";

export function usingTransformer(context: TransformationContext): ts.TransformerFactory<ts.SourceFile> {
    return ctx => sourceFile => {
        function visit(node: ts.Node): ts.Node {
            if (ts.isBlock(node)) {
                const [hasUsings, newStatements] = transformBlockWithUsing(context, node.statements, node);
                if (hasUsings) {
                    // Recurse visitor into updated block to find further usings
                    const updatedBlock = ts.factory.updateBlock(node, newStatements);
                    const result = ts.visitEachChild(updatedBlock, visit, ctx);

                    // Set all the synthetic node parents to something that makes sense
                    const parent: ts.Node[] = [updatedBlock];
                    function setParent(node2: ts.Node): ts.Node {
                        ts.setParent(node2, parent[parent.length - 1]);
                        parent.push(node2);
                        ts.visitEachChild(node2, setParent, ctx);
                        parent.pop();
                        return node2;
                    }
                    ts.visitEachChild(updatedBlock, setParent, ctx);
                    ts.setParent(updatedBlock, node.parent);

                    return result;
                }
            }
            return ts.visitEachChild(node, visit, ctx);
        }
        return ts.visitEachChild(sourceFile, visit, ctx);
    };
}

function isUsingDeclarationList(node: ts.Node): node is ts.VariableStatement {
    return ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Using) !== 0;
}

function transformBlockWithUsing(
    context: TransformationContext,
    statements: ts.NodeArray<ts.Statement> | ts.Statement[],
    block: ts.Block
): [true, ts.Statement[]] | [false] {
    const newStatements: ts.Statement[] = [];

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (isUsingDeclarationList(statement)) {
            const isAwaitUsing = (statement.declarationList.flags & ts.NodeFlags.AwaitContext) !== 0;

            if (isAwaitUsing) {
                importLuaLibFeature(context, LuaLibFeature.UsingAsync);
            } else {
                importLuaLibFeature(context, LuaLibFeature.Using);
            }

            // Make declared using variables callback function parameters
            const variableNames = statement.declarationList.declarations.map(d =>
                ts.factory.createParameterDeclaration(undefined, undefined, d.name)
            );
            // Add this: void as first parameter
            variableNames.unshift(createThisVoidParameter(context.checker));

            // Put all following statements in the callback body
            const followingStatements = statements.slice(i + 1);
            const [followingHasUsings, replacedFollowingStatements] = transformBlockWithUsing(
                context,
                followingStatements,
                block
            );
            const callbackBody = ts.factory.createBlock(
                followingHasUsings ? replacedFollowingStatements : followingStatements
            );

            const callback = ts.factory.createFunctionExpression(
                // Put async keyword in front of callback when we are in an async using
                isAwaitUsing ? [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)] : undefined,
                undefined,
                undefined,
                undefined,
                variableNames,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), // Required for TS to not freak out trying to infer the type of synthetic nodes
                callbackBody
            );

            // Replace using variable list with call to lualib function with callback and followed by all variable initializers
            const functionIdentifier = ts.factory.createIdentifier(isAwaitUsing ? "__TS__UsingAsync" : "__TS__Using");
            let call: ts.Expression = ts.factory.createCallExpression(
                functionIdentifier,
                [],
                [
                    callback,
                    ...statement.declarationList.declarations.map(
                        d => d.initializer ?? ts.factory.createIdentifier("unidentified")
                    ),
                ]
            );

            // If this is an 'await using ...', add an await statement here
            if (isAwaitUsing) {
                call = ts.factory.createAwaitExpression(call);
            }

            if (ts.isBlock(block.parent) && block.parent.statements[block.parent.statements.length - 1] !== block) {
                // If this is a free-standing block in a function (not the last statement), dont return the value
                newStatements.push(ts.factory.createExpressionStatement(call));
            } else {
                newStatements.push(ts.factory.createReturnStatement(call));
            }

            return [true, newStatements];
        } else {
            newStatements.push(statement);
        }
    }
    return [false];
}

function createThisVoidParameter(checker: ts.TypeChecker) {
    const voidType = checker.typeToTypeNode(checker.getVoidType(), undefined, undefined);
    return ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier("this"),
        undefined,
        voidType
    );
}
