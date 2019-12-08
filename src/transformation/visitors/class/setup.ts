import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { UndefinedTypeNode } from "../../utils/errors";
import {
    createDefaultExportStringLiteral,
    createExportedIdentifier,
    getIdentifierExportScope,
    hasDefaultExportModifier,
} from "../../utils/export";
import { createExportsIdentifier, createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { hasMemberInClassOrAncestor } from "./members/accessors";
import { getExtendedTypeNode, isStaticNode } from "./utils";

export function createClassSetup(
    context: TransformationContext,
    statement: ts.ClassLikeDeclarationBase,
    className: lua.Identifier,
    localClassName: lua.Identifier,
    classNameText: string,
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
            lua.createStringLiteral(classNameText),
            statement
        )
    );

    // localClassName.____getters = {}
    if (statement.members.some(m => ts.isGetAccessor(m) && isStaticNode(m))) {
        const classGetters = lua.createTableIndexExpression(
            lua.cloneIdentifier(localClassName),
            lua.createStringLiteral("____getters")
        );
        const assignClassGetters = lua.createAssignmentStatement(classGetters, lua.createTableExpression(), statement);
        result.push(assignClassGetters);

        importLuaLibFeature(context, LuaLibFeature.ClassIndex);
    }

    // localClassName.____setters = {}
    if (statement.members.some(m => ts.isSetAccessor(m) && isStaticNode(m))) {
        const classSetters = lua.createTableIndexExpression(
            lua.cloneIdentifier(localClassName),
            lua.createStringLiteral("____setters")
        );
        const assignClassSetters = lua.createAssignmentStatement(classSetters, lua.createTableExpression(), statement);
        result.push(assignClassSetters);

        importLuaLibFeature(context, LuaLibFeature.ClassNewIndex);
    }

    // localClassName.prototype
    const createClassPrototype = () =>
        lua.createTableIndexExpression(lua.cloneIdentifier(localClassName), lua.createStringLiteral("prototype"));

    // localClassName.prototype.____getters = {}
    if (statement.members.some(m => ts.isGetAccessor(m) && !isStaticNode(m))) {
        const classPrototypeGetters = lua.createTableIndexExpression(
            createClassPrototype(),
            lua.createStringLiteral("____getters")
        );
        const assignClassPrototypeGetters = lua.createAssignmentStatement(
            classPrototypeGetters,
            lua.createTableExpression(),
            statement
        );
        result.push(assignClassPrototypeGetters);
    }

    if (hasMemberInClassOrAncestor(context, statement, m => ts.isGetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.__index = __TS__Index(localClassName.prototype)
        const classPrototypeIndex = lua.createTableIndexExpression(
            createClassPrototype(),
            lua.createStringLiteral("__index")
        );
        const assignClassPrototypeIndex = lua.createAssignmentStatement(
            classPrototypeIndex,
            transformLuaLibFunction(context, LuaLibFeature.Index, undefined, createClassPrototype()),
            statement
        );
        result.push(assignClassPrototypeIndex);
    }

    if (statement.members.some(m => ts.isSetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.____setters = {}
        const classPrototypeSetters = lua.createTableIndexExpression(
            createClassPrototype(),
            lua.createStringLiteral("____setters")
        );
        const assignClassPrototypeSetters = lua.createAssignmentStatement(
            classPrototypeSetters,
            lua.createTableExpression(),
            statement
        );
        result.push(assignClassPrototypeSetters);
    }

    if (hasMemberInClassOrAncestor(context, statement, m => ts.isSetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.__newindex = __TS__NewIndex(localClassName.prototype)
        const classPrototypeNewIndex = lua.createTableIndexExpression(
            createClassPrototype(),
            lua.createStringLiteral("__newindex")
        );
        const assignClassPrototypeIndex = lua.createAssignmentStatement(
            classPrototypeNewIndex,
            transformLuaLibFunction(context, LuaLibFeature.NewIndex, undefined, createClassPrototype()),
            statement
        );
        result.push(assignClassPrototypeIndex);
    }

    const hasStaticGetters = hasMemberInClassOrAncestor(
        context,
        statement,
        m => ts.isGetAccessor(m) && isStaticNode(m)
    );
    const hasStaticSetters = hasMemberInClassOrAncestor(
        context,
        statement,
        m => ts.isSetAccessor(m) && isStaticNode(m)
    );

    if (extendsType) {
        const extendedTypeNode = getExtendedTypeNode(context, statement);
        if (extendedTypeNode === undefined) {
            throw UndefinedTypeNode(statement);
        }

        // localClassName.____super = extendsExpression
        const createClassBase = () =>
            lua.createTableIndexExpression(lua.cloneIdentifier(localClassName), lua.createStringLiteral("____super"));
        const assignClassBase = lua.createAssignmentStatement(
            createClassBase(),
            context.transformExpression(extendedTypeNode.expression),
            extendedTypeNode.expression
        );
        result.push(assignClassBase);

        if (hasStaticGetters || hasStaticSetters) {
            const metatableFields: lua.TableFieldExpression[] = [];
            if (hasStaticGetters) {
                // __index = __TS__ClassIndex
                metatableFields.push(
                    lua.createTableFieldExpression(
                        lua.createIdentifier("__TS__ClassIndex"),
                        lua.createStringLiteral("__index"),
                        extendedTypeNode.expression
                    )
                );
            } else {
                // __index = localClassName.____super
                metatableFields.push(
                    lua.createTableFieldExpression(
                        createClassBase(),
                        lua.createStringLiteral("__index"),
                        extendedTypeNode.expression
                    )
                );
            }

            if (hasStaticSetters) {
                // __newindex = __TS__ClassNewIndex
                metatableFields.push(
                    lua.createTableFieldExpression(
                        lua.createIdentifier("__TS__ClassNewIndex"),
                        lua.createStringLiteral("__newindex"),
                        extendedTypeNode.expression
                    )
                );
            }

            const setClassMetatable = lua.createExpressionStatement(
                lua.createCallExpression(
                    lua.createIdentifier("setmetatable"),
                    [lua.cloneIdentifier(localClassName), lua.createTableExpression(metatableFields)],
                    extendedTypeNode.expression
                )
            );
            result.push(setClassMetatable);
        } else {
            // setmetatable(localClassName, localClassName.____super)
            const setClassMetatable = lua.createExpressionStatement(
                lua.createCallExpression(
                    lua.createIdentifier("setmetatable"),
                    [lua.cloneIdentifier(localClassName), createClassBase()],
                    extendedTypeNode.expression
                )
            );
            result.push(setClassMetatable);
        }

        // setmetatable(localClassName.prototype, localClassName.____super.prototype)
        const basePrototype = lua.createTableIndexExpression(createClassBase(), lua.createStringLiteral("prototype"));
        const setClassPrototypeMetatable = lua.createExpressionStatement(
            lua.createCallExpression(lua.createIdentifier("setmetatable"), [createClassPrototype(), basePrototype]),
            extendedTypeNode.expression
        );
        result.push(setClassPrototypeMetatable);
    } else if (hasStaticGetters || hasStaticSetters) {
        const metatableFields: lua.TableFieldExpression[] = [];
        if (hasStaticGetters) {
            // __index = __TS__ClassIndex
            metatableFields.push(
                lua.createTableFieldExpression(
                    lua.createIdentifier("__TS__ClassIndex"),
                    lua.createStringLiteral("__index"),
                    statement
                )
            );
        }

        if (hasStaticSetters) {
            // __newindex = __TS__ClassNewIndex
            metatableFields.push(
                lua.createTableFieldExpression(
                    lua.createIdentifier("__TS__ClassNewIndex"),
                    lua.createStringLiteral("__newindex"),
                    statement
                )
            );
        }

        const setClassMetatable = lua.createExpressionStatement(
            lua.createCallExpression(lua.createIdentifier("setmetatable"), [
                lua.cloneIdentifier(localClassName),
                lua.createTableExpression(metatableFields),
            ]),
            statement
        );
        result.push(setClassMetatable);
    }

    return result;
}
