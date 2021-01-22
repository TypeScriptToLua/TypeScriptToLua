import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";
import { assert } from "../../../utils";
import { findFirstNodeAbove } from "../../utils/typescript";

const binaryOperatorMappings = new Map<extensions.ExtensionKind, lua.BinaryOperator>([
    [extensions.ExtensionKind.AddType, lua.SyntaxKind.AdditionOperator],
    [extensions.ExtensionKind.AddMethodType, lua.SyntaxKind.AdditionOperator],
]);

const unaryOperatorMappings = new Map<extensions.ExtensionKind, lua.UnaryOperator>([
    [extensions.ExtensionKind.LenType, lua.SyntaxKind.LengthOperator],
    [extensions.ExtensionKind.LenMethodType, lua.SyntaxKind.LengthOperator],
]);

const operatorMapExtensions = new Map<extensions.ExtensionKind, lua.SyntaxKind>([
    ...binaryOperatorMappings,
    ...unaryOperatorMappings,
]);

function getTypeDeclaration(declaration: ts.Declaration) {
    return ts.isTypeAliasDeclaration(declaration)
        ? declaration
        : findFirstNodeAbove(declaration, ts.isTypeAliasDeclaration);
}

function getOperatorMapExtensionKindForCall(context: TransformationContext, node: ts.CallExpression) {
    const signature = context.checker.getResolvedSignature(node);
    if (!signature || !signature.declaration) {
        return;
    }
    const typeDeclaration = getTypeDeclaration(signature.declaration);
    if (!typeDeclaration) {
        return;
    }
    const mapping = extensions.getExtensionKind(typeDeclaration);
    if (mapping !== undefined && operatorMapExtensions.has(mapping)) {
        return mapping;
    }
}

function isOperatorMapDeclaration(declaration: ts.Declaration) {
    const typeDeclaration = getTypeDeclaration(declaration);
    if (typeDeclaration) {
        const extensionKind = extensions.getExtensionKind(typeDeclaration);
        return extensionKind !== undefined ? operatorMapExtensions.has(extensionKind) : false;
    }
}

function isOperatorMapType(context: TransformationContext, type: ts.Type): boolean {
    if (type.isUnionOrIntersection()) {
        return type.types.some(t => isOperatorMapType(context, t));
    } else {
        return type.symbol?.declarations?.some(isOperatorMapDeclaration);
    }
}

function isOperatorMapIdentifier(context: TransformationContext, node: ts.Identifier) {
    const type = context.checker.getTypeAtLocation(node);
    return isOperatorMapType(context, type);
}

export function isOperatorMapping(context: TransformationContext, node: ts.CallExpression | ts.Identifier) {
    if (ts.isCallExpression(node)) {
        return getOperatorMapExtensionKindForCall(context, node) !== undefined;
    } else {
        return isOperatorMapIdentifier(context, node);
    }
}

export function transformOperatorMappingExpression(
    context: TransformationContext,
    node: ts.CallExpression
): lua.Expression {
    const extensionKind = getOperatorMapExtensionKindForCall(context, node);
    assert(extensionKind);

    const args = node.arguments.slice();
    if (binaryOperatorMappings.has(extensionKind)) {
        if (args.length === 1) {
            assert(ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression));
            args.unshift(node.expression.expression);
        } else {
            assert(args.length === 2);
        }

        const luaOperator = binaryOperatorMappings.get(extensionKind);
        assert(luaOperator);
        return lua.createBinaryExpression(
            context.transformExpression(args[0]),
            context.transformExpression(args[1]),
            luaOperator
        );
    } else {
        let arg: ts.Expression;
        if (args.length === 0) {
            assert(ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression));
            arg = node.expression.expression;
        } else {
            assert(args.length === 1);
            arg = args[0];
        }

        const luaOperator = unaryOperatorMappings.get(extensionKind);
        assert(luaOperator);
        return lua.createUnaryExpression(context.transformExpression(arg), luaOperator);
    }
}
