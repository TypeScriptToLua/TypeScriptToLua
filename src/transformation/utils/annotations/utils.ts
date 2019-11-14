import * as ts from "typescript";
import { AnnotationKind, getSignatureAnnotations, getTypeAnnotations } from ".";
import { TransformationContext } from "../../context";
import { findFirstNodeAbove, inferAssignedType } from "../typescript";

export function isTupleReturnCall(context: TransformationContext, node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) {
        return false;
    }

    const signature = context.checker.getResolvedSignature(node);
    if (signature) {
        if (getSignatureAnnotations(context, signature).has(AnnotationKind.TupleReturn)) {
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
    return getTypeAnnotations(context, type).has(AnnotationKind.TupleReturn);
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
    if (signatures && signatures.some(s => getSignatureAnnotations(context, s).has(AnnotationKind.TupleReturn))) {
        return true;
    }

    return getTypeAnnotations(context, functionType).has(AnnotationKind.TupleReturn);
}

export function isLuaIteratorType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.LuaIterator);
}

export function isVarArgType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.VarArg);
}

export function isForRangeType(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return getTypeAnnotations(context, type).has(AnnotationKind.ForRange);
}
