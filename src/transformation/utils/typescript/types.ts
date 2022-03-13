import * as ts from "typescript";
import { TransformationContext } from "../../context";

export function isTypeWithFlags(context: TransformationContext, type: ts.Type, flags: ts.TypeFlags): boolean {
    const predicate = (type: ts.Type) => (type.flags & flags) !== 0;

    return typeAlwaysSatisfies(context, type, predicate);
}

export function typeAlwaysSatisfies(
    context: TransformationContext,
    type: ts.Type,
    predicate: (type: ts.Type) => boolean
): boolean {
    const baseConstraint = context.checker.getBaseConstraintOfType(type);
    if (baseConstraint) {
        type = baseConstraint;
    }

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
    const baseConstraint = context.checker.getBaseConstraintOfType(type);
    if (!baseConstraint) {
        // type parameter with no constraint can be anything, assume it might satisfy predicate
        if (type.isTypeParameter()) return true;
    } else {
        type = baseConstraint;
    }

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

export function isNullishType(context: TransformationContext, type: ts.Type): boolean {
    return isTypeWithFlags(context, type, ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.VoidLike);
}

export function isStringType(context: TransformationContext, type: ts.Type): boolean {
    return isTypeWithFlags(context, type, ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral);
}

export function isNumberType(context: TransformationContext, type: ts.Type): boolean {
    return isTypeWithFlags(context, type, ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral);
}

export function isNullableType(
    context: TransformationContext,
    type: ts.Type,
    isType: (c: TransformationContext, t: ts.Type) => boolean
): boolean {
    return (
        typeCanSatisfy(context, type, t => isType(context, t)) &&
        typeAlwaysSatisfies(context, type, t => isType(context, t) || isNullishType(context, t))
    );
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

export function isFunctionType(type: ts.Type): boolean {
    return type.getCallSignatures().length > 0;
}

export function canBeFalsy(context: TransformationContext, type: ts.Type): boolean {
    const strictNullChecks = context.options.strict === true || context.options.strictNullChecks === true;
    const falsyFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null;
    return typeCanSatisfy(
        context,
        type,
        type => (type.flags & falsyFlags) !== 0 || (!strictNullChecks && !type.isLiteral())
    );
}

export function canBeFalsyWhenNotNull(context: TransformationContext, type: ts.Type): boolean {
    const falsyFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any;
    return typeCanSatisfy(context, type, type => (type.flags & falsyFlags) !== 0);
}
