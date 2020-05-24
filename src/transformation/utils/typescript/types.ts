import * as ts from "typescript";
import { TransformationContext } from "../../context";

export function isTypeWithFlags(context: TransformationContext, type: ts.Type, flags: ts.TypeFlags): boolean {
    const predicate = (type: ts.Type) => {
        if (type.symbol) {
            const baseConstraint = context.checker.getBaseConstraintOfType(type);
            if (baseConstraint && baseConstraint !== type) {
                return isTypeWithFlags(context, baseConstraint, flags);
            }
        }
        return (type.flags & flags) !== 0;
    };

    return typeAlwaysSatisfies(context, type, predicate);
}

export function typeAlwaysSatisfies(
    context: TransformationContext,
    type: ts.Type,
    predicate: (type: ts.Type) => boolean
): boolean {
    if (predicate(type)) {
        return true;
    }

    if (type.isUnion()) {
        return type.types.every(t => typeAlwaysSatisfies(context, t, predicate));
    }

    if (type.isIntersection()) {
        return type.types.some(t => typeAlwaysSatisfies(context, t, predicate));
    }

    return false;
}

export function typeCanSatisfy(
    context: TransformationContext,
    type: ts.Type,
    predicate: (type: ts.Type) => boolean
): boolean {
    if (predicate(type)) {
        return true;
    }

    if (type.isUnion()) {
        return type.types.some(t => typeCanSatisfy(context, t, predicate));
    }

    if (type.isIntersection()) {
        return type.types.some(t => typeCanSatisfy(context, t, predicate));
    }

    return false;
}

export function isStringType(context: TransformationContext, type: ts.Type): boolean {
    return isTypeWithFlags(context, type, ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral);
}

export function isNumberType(context: TransformationContext, type: ts.Type): boolean {
    return isTypeWithFlags(context, type, ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral);
}

function isExplicitArrayType(context: TransformationContext, type: ts.Type): boolean {
    if (type.symbol) {
        const baseConstraint = context.checker.getBaseConstraintOfType(type);
        if (baseConstraint && baseConstraint !== type) {
            return isExplicitArrayType(context, baseConstraint);
        }
    }

    if (type.isUnionOrIntersection()) {
        return type.types.some(t => isExplicitArrayType(context, t));
    }

    const flags = ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.AllowEmptyTuple;
    let typeNode = context.checker.typeToTypeNode(type, undefined, flags);
    if (typeNode && ts.isTypeOperatorNode(typeNode) && typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
        typeNode = typeNode.type;
    }

    return typeNode !== undefined && (ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode));
}

/**
 * Iterate over a type and its bases until the callback returns true.
 */
export function forTypeOrAnySupertype(
    context: TransformationContext,
    type: ts.Type,
    predicate: (type: ts.Type) => boolean
): boolean {
    if (predicate(type)) {
        return true;
    }

    if (!type.isClassOrInterface() && type.symbol) {
        type = context.checker.getDeclaredTypeOfSymbol(type.symbol);
    }

    return (type.getBaseTypes() ?? []).some(superType => forTypeOrAnySupertype(context, superType, predicate));
}

export function isArrayType(context: TransformationContext, type: ts.Type): boolean {
    return forTypeOrAnySupertype(context, type, t => isExplicitArrayType(context, t));
}

export function isFunctionType(context: TransformationContext, type: ts.Type): boolean {
    const typeNode = context.checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
    return typeNode !== undefined && ts.isFunctionTypeNode(typeNode);
}
