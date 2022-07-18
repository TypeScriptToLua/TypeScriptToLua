import * as ts from "typescript";
import { TransformationContext } from "../../context";

export function typeAlwaysHasSomeOfFlags(context: TransformationContext, type: ts.Type, flags: ts.TypeFlags): boolean {
    const baseConstraint = context.checker.getBaseConstraintOfType(type);
    if (baseConstraint) {
        type = baseConstraint;
    }

    if (type.flags & flags) {
        return true;
    }

    if (type.isUnion()) {
        return type.types.every(t => typeAlwaysHasSomeOfFlags(context, t, flags));
    }

    if (type.isIntersection()) {
        return type.types.some(t => typeAlwaysHasSomeOfFlags(context, t, flags));
    }

    return false;
}

export function typeCanHaveSomeOfFlags(context: TransformationContext, type: ts.Type, flags: ts.TypeFlags): boolean {
    const baseConstraint = context.checker.getBaseConstraintOfType(type);
    if (!baseConstraint) {
        // type parameter with no constraint can be anything, assume it might satisfy predicate
        if (type.isTypeParameter()) return true;
    } else {
        type = baseConstraint;
    }

    if (type.flags & flags) {
        return true;
    }

    if (type.isUnion()) {
        return type.types.some(t => typeCanHaveSomeOfFlags(context, t, flags));
    }

    if (type.isIntersection()) {
        return type.types.some(t => typeCanHaveSomeOfFlags(context, t, flags));
    }

    return false;
}

export function isStringType(context: TransformationContext, type: ts.Type): boolean {
    return typeAlwaysHasSomeOfFlags(context, type, ts.TypeFlags.StringLike);
}

export function isNumberType(context: TransformationContext, type: ts.Type): boolean {
    return typeAlwaysHasSomeOfFlags(context, type, ts.TypeFlags.NumberLike);
}

function isExplicitArrayType(context: TransformationContext, type: ts.Type): boolean {
    if (context.checker.isArrayType(type) || context.checker.isTupleType(type)) return true;
    if (type.symbol) {
        const baseConstraint = context.checker.getBaseConstraintOfType(type);
        if (baseConstraint && baseConstraint !== type) {
            return isExplicitArrayType(context, baseConstraint);
        }
    }

    if (type.isUnionOrIntersection()) {
        return type.types.some(t => isExplicitArrayType(context, t));
    }

    return false;
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

    const baseTypes = type.getBaseTypes();
    if (!baseTypes) return false;
    return baseTypes.some(superType => forTypeOrAnySupertype(context, superType, predicate));
}

export function isArrayType(context: TransformationContext, type: ts.Type): boolean {
    return forTypeOrAnySupertype(context, type, t => isExplicitArrayType(context, t));
}

export function isFunctionType(type: ts.Type): boolean {
    return type.getCallSignatures().length > 0;
}

export function canBeFalsy(context: TransformationContext, type: ts.Type): boolean {
    const strictNullChecks = context.options.strict === true || context.options.strictNullChecks === true;
    if (!strictNullChecks && !type.isLiteral()) return true;
    const falsyFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null;
    return typeCanHaveSomeOfFlags(context, type, falsyFlags);
}

export function canBeFalsyWhenNotNull(context: TransformationContext, type: ts.Type): boolean {
    const strictNullChecks = context.options.strict === true || context.options.strictNullChecks === true;
    if (!strictNullChecks && !type.isLiteral()) return true;
    const falsyFlags =
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any;
    return typeCanHaveSomeOfFlags(context, type, falsyFlags);
}
