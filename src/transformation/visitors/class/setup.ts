import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assert } from "../../../utils";
import { TransformationContext } from "../../context";
import {
    createDefaultExportStringLiteral,
    createExportedIdentifier,
    getIdentifierExportScope,
    hasDefaultExportModifier,
} from "../../utils/export";
import { createExportsIdentifier, createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { getExtendedNode, getExtendsClause } from "./utils";

export function createClassSetup(
    context: TransformationContext,
    statement: ts.ClassLikeDeclarationBase,
    className: lua.Identifier,
    localClassName: lua.Identifier,
    extendsType?: ts.Type
): lua.Statement[] {
    const result: lua.Statement[] = [];

    // __TS__Class()
    const classInitializer = transformLuaLibFunction(context, LuaLibFeature.Class, statement);

    const defaultExportLeftHandSide = hasDefaultExportModifier(statement)
        ? lua.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral(statement))
        : undefined;

    // [____exports.]className = __TS__Class()
    if (defaultExportLeftHandSide) {
        result.push(lua.createAssignmentStatement(defaultExportLeftHandSide, classInitializer, statement));
    } else {
        result.push(...createLocalOrExportedOrGlobalDeclaration(context, className, classInitializer, statement));
    }

    if (defaultExportLeftHandSide) {
        // local localClassName = ____exports.default
        result.push(lua.createVariableDeclarationStatement(localClassName, defaultExportLeftHandSide));
    } else {
        const exportScope = getIdentifierExportScope(context, className);
        if (exportScope) {
            // local localClassName = ____exports.className
            result.push(
                lua.createVariableDeclarationStatement(
                    localClassName,
                    createExportedIdentifier(context, lua.cloneIdentifier(className), exportScope)
                )
            );
        }
    }

    // localClassName.name = className
    result.push(
        lua.createAssignmentStatement(
            lua.createTableIndexExpression(lua.cloneIdentifier(localClassName), lua.createStringLiteral("name")),
            getReflectionClassName(statement, className),
            statement
        )
    );

    if (extendsType) {
        const extendedNode = getExtendedNode(statement);
        assert(extendedNode);
        result.push(
            lua.createExpressionStatement(
                transformLuaLibFunction(
                    context,
                    LuaLibFeature.ClassExtends,
                    getExtendsClause(statement),
                    lua.cloneIdentifier(localClassName),
                    context.transformExpression(extendedNode.expression)
                )
            )
        );
    }

    return result;
}

export function getReflectionClassName(
    declaration: ts.ClassLikeDeclarationBase,
    className: lua.Identifier
): lua.Expression {
    if (declaration.name) {
        return lua.createStringLiteral(declaration.name.text);
    } else if (ts.isVariableDeclaration(declaration.parent) && ts.isIdentifier(declaration.parent.name)) {
        return lua.createStringLiteral(declaration.parent.name.text);
    } else if (hasDefaultExportModifier(declaration)) {
        return lua.createStringLiteral("default");
    }

    if (getExtendedNode(declaration)) {
        return lua.createTableIndexExpression(className, lua.createStringLiteral("name"));
    }

    return lua.createStringLiteral("");
}
