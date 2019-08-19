import * as ts from "typescript";
import * as tstl from "../../../../LuaAST";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformParameters, transformFunctionBodyStatements, transformFunctionBodyHeader } from "../../function";
import { TransformationContext } from "../../../context";
import { transformIdentifier } from "../../identifier";
import { transformClassInstanceFields } from "./fields";

export function createConstructorName(className: tstl.Identifier): tstl.TableIndexExpression {
    return tstl.createTableIndexExpression(
        tstl.createTableIndexExpression(tstl.cloneIdentifier(className), tstl.createStringLiteral("prototype")),
        tstl.createStringLiteral("____constructor")
    );
}

export function transformConstructorDeclaration(
    context: TransformationContext,
    statement: ts.ConstructorDeclaration,
    className: tstl.Identifier,
    instanceFields: ts.PropertyDeclaration[],
    classDeclaration: ts.ClassLikeDeclaration
): tstl.Statement | undefined {
    // Don't transform methods without body (overload declarations)
    if (!statement.body) {
        return undefined;
    }

    // Transform body
    const [body, scope] = transformFunctionBodyStatements(context, statement.body);

    const [params, dotsLiteral, restParamName] = transformParameters(
        context,
        statement.parameters,
        createSelfIdentifier()
    );

    // Make sure default parameters are assigned before fields are initialized
    const bodyWithFieldInitializers = transformFunctionBodyHeader(context, scope, statement.parameters, restParamName);

    // Check for field declarations in constructor
    const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);

    const classInstanceFields = transformClassInstanceFields(context, classDeclaration, instanceFields);

    // If there are field initializers and the first statement is a super call,
    // move super call between default assignments and initializers
    if (
        (constructorFieldsDeclarations.length > 0 || classInstanceFields.length > 0) &&
        statement.body &&
        statement.body.statements.length > 0
    ) {
        const firstStatement = statement.body.statements[0];
        if (
            ts.isExpressionStatement(firstStatement) &&
            ts.isCallExpression(firstStatement.expression) &&
            firstStatement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
        ) {
            const superCall = body.shift();
            if (superCall) {
                bodyWithFieldInitializers.push(superCall);
            }
        }
    }

    // Add in instance field declarations
    for (const declaration of constructorFieldsDeclarations) {
        const declarationName = transformIdentifier(context, declaration.name as ts.Identifier);
        // self.declarationName = declarationName
        const assignment = tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(createSelfIdentifier(), tstl.createStringLiteral(declarationName.text)),
            declarationName
        );
        bodyWithFieldInitializers.push(assignment);
    }

    bodyWithFieldInitializers.push(...classInstanceFields);

    bodyWithFieldInitializers.push(...body);

    const block = tstl.createBlock(bodyWithFieldInitializers);

    const constructorWasGenerated = statement.pos === -1;

    return tstl.createAssignmentStatement(
        createConstructorName(className),
        tstl.createFunctionExpression(
            block,
            params,
            dotsLiteral,
            restParamName,
            tstl.FunctionExpressionFlags.Declaration
        ),
        constructorWasGenerated ? classDeclaration : statement
    );
}
