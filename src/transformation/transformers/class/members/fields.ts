import * as ts from "typescript";
import * as tstl from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { createSelfIdentifier } from "../../../utils/lua-ast";
import { transformPropertyName } from "../../literal";
import { isGetAccessorOverride } from "./accessors";

export function transformClassInstanceFields(
    context: TransformationContext,
    classDeclaration: ts.ClassLikeDeclaration,
    instanceFields: ts.PropertyDeclaration[]
): tstl.Statement[] {
    const statements: tstl.Statement[] = [];

    for (const f of instanceFields) {
        // Get identifier
        const fieldName = transformPropertyName(context, f.name);

        const value = f.initializer ? context.transformExpression(f.initializer) : undefined;

        // self[fieldName]
        const selfIndex = tstl.createTableIndexExpression(createSelfIdentifier(), fieldName);

        // self[fieldName] = value
        const assignClassField = tstl.createAssignmentStatement(selfIndex, value, f);

        statements.push(assignClassField);
    }

    const getOverrides = classDeclaration.members.filter((m): m is ts.GetAccessorDeclaration =>
        isGetAccessorOverride(context, m, classDeclaration)
    );

    for (const getter of getOverrides) {
        const getterName = transformPropertyName(context, getter.name);

        const resetGetter = tstl.createExpressionStatement(
            tstl.createCallExpression(tstl.createIdentifier("rawset"), [
                createSelfIdentifier(),
                getterName,
                tstl.createNilLiteral(),
            ]),
            classDeclaration.members.find(ts.isConstructorDeclaration) || classDeclaration
        );
        statements.push(resetGetter);
    }

    return statements;
}
