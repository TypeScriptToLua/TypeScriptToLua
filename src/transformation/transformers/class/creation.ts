import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { UndefinedTypeNode } from "../../utils/errors";
import {
    createDefaultExportStringLiteral,
    createExportedIdentifier,
    getIdentifierExportScope,
    hasDefaultExportModifier,
} from "../../utils/export";
import {
    createExportsIdentifier,
    createLocalOrExportedOrGlobalDeclaration,
    createSelfIdentifier,
} from "../../utils/lua-ast";
import { importLuaLibFeature, LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { hasMemberInClassOrAncestor } from "./members/accessors";
import { getExtendedTypeNode, isStaticNode } from "./utils";

export function createClassCreationMethods(
    context: TransformationContext,
    statement: ts.ClassLikeDeclarationBase,
    className: tstl.Identifier,
    localClassName: tstl.Identifier,
    classNameText: string,
    extendsType?: ts.Type
): tstl.Statement[] {
    const result: tstl.Statement[] = [];

    // [____exports.]className = {}
    const classTable: tstl.Expression = tstl.createTableExpression();

    const isDefaultExport = hasDefaultExportModifier(statement);

    const defaultExportLeftHandSide = isDefaultExport
        ? tstl.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral(statement))
        : undefined;

    const classVar = defaultExportLeftHandSide
        ? [tstl.createAssignmentStatement(defaultExportLeftHandSide, classTable, statement)]
        : createLocalOrExportedOrGlobalDeclaration(context, className, classTable, statement);

    result.push(...classVar);

    if (defaultExportLeftHandSide) {
        // local localClassName = ____exports.default
        result.push(tstl.createVariableDeclarationStatement(localClassName, defaultExportLeftHandSide));
    } else {
        const exportScope = getIdentifierExportScope(context, className);
        if (exportScope) {
            // local localClassName = ____exports.className
            result.push(
                tstl.createVariableDeclarationStatement(
                    localClassName,
                    createExportedIdentifier(context, tstl.cloneIdentifier(className), exportScope)
                )
            );
        }
    }

    // localClassName.name = className
    result.push(
        tstl.createAssignmentStatement(
            tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), tstl.createStringLiteral("name")),
            tstl.createStringLiteral(classNameText),
            statement
        )
    );

    // localClassName.____getters = {}
    if (statement.members.some(m => ts.isGetAccessor(m) && isStaticNode(m))) {
        const classGetters = tstl.createTableIndexExpression(
            tstl.cloneIdentifier(localClassName),
            tstl.createStringLiteral("____getters")
        );
        const assignClassGetters = tstl.createAssignmentStatement(
            classGetters,
            tstl.createTableExpression(),
            statement
        );
        result.push(assignClassGetters);

        importLuaLibFeature(context, LuaLibFeature.ClassIndex);
    }

    // localClassName.__index = localClassName
    const classIndex = tstl.createTableIndexExpression(
        tstl.cloneIdentifier(localClassName),
        tstl.createStringLiteral("__index")
    );
    const assignClassIndex = tstl.createAssignmentStatement(
        classIndex,
        tstl.cloneIdentifier(localClassName),
        statement
    );
    result.push(assignClassIndex);

    // localClassName.____setters = {}
    if (statement.members.some(m => ts.isSetAccessor(m) && isStaticNode(m))) {
        const classSetters = tstl.createTableIndexExpression(
            tstl.cloneIdentifier(localClassName),
            tstl.createStringLiteral("____setters")
        );
        const assignClassSetters = tstl.createAssignmentStatement(
            classSetters,
            tstl.createTableExpression(),
            statement
        );
        result.push(assignClassSetters);

        importLuaLibFeature(context, LuaLibFeature.ClassNewIndex);
    }

    // localClassName.prototype = {}
    const createClassPrototype = () =>
        tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), tstl.createStringLiteral("prototype"));
    const classPrototypeTable = tstl.createTableExpression();
    const assignClassPrototype = tstl.createAssignmentStatement(createClassPrototype(), classPrototypeTable, statement);
    result.push(assignClassPrototype);

    // localClassName.prototype.____getters = {}
    if (statement.members.some(m => ts.isGetAccessor(m) && !isStaticNode(m))) {
        const classPrototypeGetters = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("____getters")
        );
        const assignClassPrototypeGetters = tstl.createAssignmentStatement(
            classPrototypeGetters,
            tstl.createTableExpression(),
            statement
        );
        result.push(assignClassPrototypeGetters);
    }

    const classPrototypeIndex = tstl.createTableIndexExpression(
        createClassPrototype(),
        tstl.createStringLiteral("__index")
    );
    if (hasMemberInClassOrAncestor(context, statement, m => ts.isGetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.__index = __TS__Index(localClassName.prototype)
        const assignClassPrototypeIndex = tstl.createAssignmentStatement(
            classPrototypeIndex,
            transformLuaLibFunction(context, LuaLibFeature.Index, undefined, createClassPrototype()),
            statement
        );
        result.push(assignClassPrototypeIndex);
    } else {
        // localClassName.prototype.__index = localClassName.prototype
        const assignClassPrototypeIndex = tstl.createAssignmentStatement(
            classPrototypeIndex,
            createClassPrototype(),
            statement
        );
        result.push(assignClassPrototypeIndex);
    }

    if (statement.members.some(m => ts.isSetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.____setters = {}
        const classPrototypeSetters = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("____setters")
        );
        const assignClassPrototypeSetters = tstl.createAssignmentStatement(
            classPrototypeSetters,
            tstl.createTableExpression(),
            statement
        );
        result.push(assignClassPrototypeSetters);
    }

    if (hasMemberInClassOrAncestor(context, statement, m => ts.isSetAccessor(m) && !isStaticNode(m))) {
        // localClassName.prototype.__newindex = __TS__NewIndex(localClassName.prototype)
        const classPrototypeNewIndex = tstl.createTableIndexExpression(
            createClassPrototype(),
            tstl.createStringLiteral("__newindex")
        );
        const assignClassPrototypeIndex = tstl.createAssignmentStatement(
            classPrototypeNewIndex,
            transformLuaLibFunction(context, LuaLibFeature.NewIndex, undefined, createClassPrototype()),
            statement
        );
        result.push(assignClassPrototypeIndex);
    }

    // localClassName.prototype.constructor = localClassName
    const classPrototypeConstructor = tstl.createTableIndexExpression(
        createClassPrototype(),
        tstl.createStringLiteral("constructor")
    );
    const assignClassPrototypeConstructor = tstl.createAssignmentStatement(
        classPrototypeConstructor,
        tstl.cloneIdentifier(localClassName),
        statement
    );
    result.push(assignClassPrototypeConstructor);

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
            tstl.createTableIndexExpression(
                tstl.cloneIdentifier(localClassName),
                tstl.createStringLiteral("____super")
            );
        const assignClassBase = tstl.createAssignmentStatement(
            createClassBase(),
            context.transformExpression(extendedTypeNode.expression),
            extendedTypeNode.expression
        );
        result.push(assignClassBase);

        if (hasStaticGetters || hasStaticSetters) {
            const metatableFields: tstl.TableFieldExpression[] = [];
            if (hasStaticGetters) {
                // __index = __TS__ClassIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassIndex"),
                        tstl.createStringLiteral("__index"),
                        extendedTypeNode.expression
                    )
                );
            } else {
                // __index = localClassName.____super
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        createClassBase(),
                        tstl.createStringLiteral("__index"),
                        extendedTypeNode.expression
                    )
                );
            }

            if (hasStaticSetters) {
                // __newindex = __TS__ClassNewIndex
                metatableFields.push(
                    tstl.createTableFieldExpression(
                        tstl.createIdentifier("__TS__ClassNewIndex"),
                        tstl.createStringLiteral("__newindex"),
                        extendedTypeNode.expression
                    )
                );
            }

            const setClassMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createIdentifier("setmetatable"),
                    [tstl.cloneIdentifier(localClassName), tstl.createTableExpression(metatableFields)],
                    extendedTypeNode.expression
                )
            );
            result.push(setClassMetatable);
        } else {
            // setmetatable(localClassName, localClassName.____super)
            const setClassMetatable = tstl.createExpressionStatement(
                tstl.createCallExpression(
                    tstl.createIdentifier("setmetatable"),
                    [tstl.cloneIdentifier(localClassName), createClassBase()],
                    extendedTypeNode.expression
                )
            );
            result.push(setClassMetatable);
        }

        // setmetatable(localClassName.prototype, localClassName.____super.prototype)
        const basePrototype = tstl.createTableIndexExpression(createClassBase(), tstl.createStringLiteral("prototype"));
        const setClassPrototypeMetatable = tstl.createExpressionStatement(
            tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [createClassPrototype(), basePrototype]),
            extendedTypeNode.expression
        );
        result.push(setClassPrototypeMetatable);
    } else if (hasStaticGetters || hasStaticSetters) {
        const metatableFields: tstl.TableFieldExpression[] = [];
        if (hasStaticGetters) {
            // __index = __TS__ClassIndex
            metatableFields.push(
                tstl.createTableFieldExpression(
                    tstl.createIdentifier("__TS__ClassIndex"),
                    tstl.createStringLiteral("__index"),
                    statement
                )
            );
        }

        if (hasStaticSetters) {
            // __newindex = __TS__ClassNewIndex
            metatableFields.push(
                tstl.createTableFieldExpression(
                    tstl.createIdentifier("__TS__ClassNewIndex"),
                    tstl.createStringLiteral("__newindex"),
                    statement
                )
            );
        }

        const setClassMetatable = tstl.createExpressionStatement(
            tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [
                tstl.cloneIdentifier(localClassName),
                tstl.createTableExpression(metatableFields),
            ]),
            statement
        );
        result.push(setClassMetatable);
    }

    const newFuncStatements: tstl.Statement[] = [];

    // local self = setmetatable({}, localClassName.prototype)
    const assignSelf = tstl.createVariableDeclarationStatement(
        createSelfIdentifier(),
        tstl.createCallExpression(tstl.createIdentifier("setmetatable"), [
            tstl.createTableExpression(),
            createClassPrototype(),
        ]),
        statement
    );
    newFuncStatements.push(assignSelf);

    // self:____constructor(...)
    const callConstructor = tstl.createExpressionStatement(
        tstl.createMethodCallExpression(createSelfIdentifier(), tstl.createIdentifier("____constructor"), [
            tstl.createDotsLiteral(),
        ]),
        statement
    );
    newFuncStatements.push(callConstructor);

    // return self
    const returnSelf = tstl.createReturnStatement([createSelfIdentifier()], statement);
    newFuncStatements.push(returnSelf);

    // function localClassName.new(construct, ...) ... end
    // or function export.localClassName.new(construct, ...) ... end
    const newFunc = tstl.createAssignmentStatement(
        tstl.createTableIndexExpression(tstl.cloneIdentifier(localClassName), tstl.createStringLiteral("new")),
        tstl.createFunctionExpression(
            tstl.createBlock(newFuncStatements),
            undefined,
            tstl.createDotsLiteral(),
            undefined,
            tstl.FunctionExpressionFlags.Declaration
        ),
        statement
    );
    result.push(newFunc);

    return result;
}
