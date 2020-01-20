import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformParameters, transformFunctionBodyStatements, transformFunctionBodyHeader } from "../../function";
import { TransformationContext } from "../../../context";
import { transformIdentifier } from "../../identifier";
import { transformClassInstanceFields } from "./fields";
import { pushScope, ScopeType, popScope } from "../../../utils/scope";

export function createConstructorName(className: lua.Identifier): lua.TableIndexExpression {
    return lua.createTableIndexExpression(
        lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype")),
        lua.createStringLiteral("____constructor")
    );
}

export function transformConstructorDeclaration(
    context: TransformationContext,
    statement: ts.ConstructorDeclaration,
    className: lua.Identifier,
    instanceFields: ts.PropertyDeclaration[],
    classDeclaration: ts.ClassLikeDeclaration
): lua.Statement | undefined {
    // Don't transform methods without body (overload declarations)
    if (!statement.body) {
        return undefined;
    }

    // Transform body
    const scope = pushScope(context, ScopeType.Function);
    const body = transformFunctionBodyStatements(context, statement.body);

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
        const assignment = lua.createAssignmentStatement(
            lua.createTableIndexExpression(createSelfIdentifier(), lua.createStringLiteral(declarationName.text)),
            declarationName
        );
        bodyWithFieldInitializers.push(assignment);
    }

    bodyWithFieldInitializers.push(...classInstanceFields);

    bodyWithFieldInitializers.push(...body);

    const block = lua.createBlock(bodyWithFieldInitializers);

    const constructorWasGenerated = statement.pos === -1;

    popScope(context);

    return lua.createAssignmentStatement(
        createConstructorName(className),
        lua.createFunctionExpression(
            block,
            params,
            dotsLiteral,
            restParamName,
            lua.FunctionExpressionFlags.Declaration
        ),
        constructorWasGenerated ? classDeclaration : statement
    );
}
