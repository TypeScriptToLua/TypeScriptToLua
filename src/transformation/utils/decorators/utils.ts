import * as ts from "typescript";
import { TransformationContext } from "../../context";
import { DecoratorKind, getCustomDecorators, getCustomSignatureDecorators } from "../decorators";
import { findFirstNodeAbove, inferAssignedType } from "../typescript";

export function isTupleReturnCall(context: TransformationContext, node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) {
        return false;
    }

    const signature = context.checker.getResolvedSignature(node);
    if (signature) {
        if (getCustomSignatureDecorators(context, signature).has(DecoratorKind.TupleReturn)) {
            return true;
        }

        // Only check function type for directive if it is declared as an interface or type alias
        const declaration = signature.getDeclaration();
        const isInterfaceOrAlias =
            declaration &&
            declaration.parent &&
            ((ts.isInterfaceDeclaration(declaration.parent) && ts.isCallSignatureDeclaration(declaration)) ||
                ts.isTypeAliasDeclaration(declaration.parent));
        if (!isInterfaceOrAlias) {
            return false;
        }
    }

    const type = context.checker.getTypeAtLocation(node.expression);
    return getCustomDecorators(context, type).has(DecoratorKind.TupleReturn);
}

export function isInTupleReturnFunction(context: TransformationContext, node: ts.Node): boolean {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (!declaration) {
        return false;
    }

    let functionType: ts.Type | undefined;
    if (ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
        functionType = inferAssignedType(context, declaration);
    } else if (ts.isMethodDeclaration(declaration) && ts.isObjectLiteralExpression(declaration.parent)) {
        // Manually lookup type for object literal properties declared with method syntax
        const interfaceType = inferAssignedType(context, declaration.parent);
        const propertySymbol = interfaceType.getProperty(declaration.name.getText());
        if (propertySymbol) {
            functionType = context.checker.getTypeOfSymbolAtLocation(propertySymbol, declaration);
        }
    }

    if (functionType === undefined) {
        functionType = context.checker.getTypeAtLocation(declaration);
    }

    // Check all overloads for directive
    const signatures = functionType.getCallSignatures();
    if (signatures && signatures.some(s => getCustomSignatureDecorators(context, s).has(DecoratorKind.TupleReturn))) {
        return true;
    }

    const decorators = getCustomDecorators(context, functionType);
    return decorators.has(DecoratorKind.TupleReturn);
}

export function isLuaIteratorType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getCustomDecorators(context, type).has(DecoratorKind.LuaIterator);
}

export function isVarArgType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getCustomDecorators(context, type).has(DecoratorKind.Vararg);
}

export function isForRangeType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getCustomDecorators(context, type).has(DecoratorKind.ForRange);
}
