import * as ts from "typescript";
import { getOrUpdate } from "../../utils";
import { TransformationContext } from "../context";
import {
    unsupportedNoSelfFunctionConversion,
    unsupportedOverloadAssignment,
    unsupportedSelfFunctionConversion,
} from "./diagnostics";
import { ContextType, getFunctionContextType } from "./function-context";

// TODO: Clear if types are reused between compilations
const typeValidationCache = new WeakMap<ts.Type, Set<ts.Type>>();

export function validateAssignment(
    context: TransformationContext,
    node: ts.Node,
    fromType: ts.Type,
    toType: ts.Type,
    toName?: string
): void {
    if (toType === fromType) {
        return;
    }

    if ((toType.flags & ts.TypeFlags.Any) !== 0) {
        // Assigning to un-typed variable
        return;
    }

    // Use cache to avoid repeating check for same types (protects against infinite loop in recursive types)
    const fromTypeCache = getOrUpdate(typeValidationCache, fromType, () => new Set());
    if (fromTypeCache.has(toType)) return;
    fromTypeCache.add(toType);

    validateFunctionAssignment(context, node, fromType, toType, toName);

    const checker = context.checker;
    if (
        (checker.isTupleType(toType) || checker.isArrayType(toType)) &&
        (checker.isTupleType(fromType) || checker.isArrayType(fromType))
    ) {
        // Recurse into arrays/tuples
        const fromTypeArguments = (fromType as ts.TypeReference).typeArguments;
        const toTypeArguments = (toType as ts.TypeReference).typeArguments;

        if (fromTypeArguments === undefined || toTypeArguments === undefined) {
            return;
        }

        const count = Math.min(fromTypeArguments.length, toTypeArguments.length);
        for (let i = 0; i < count; ++i) {
            validateAssignment(context, node, fromTypeArguments[i], toTypeArguments[i], toName);
        }
    }

    const fromMembers = fromType.symbol?.members;
    const toMembers = toType.symbol?.members;

    if (fromMembers && toMembers) {
        // Recurse into interfaces
        if (toMembers.size < fromMembers.size) {
            toMembers.forEach((toMember, escapedMemberName) => {
                const fromMember = fromMembers.get(escapedMemberName);
                if (fromMember) {
                    validateMember(toMember, fromMember, escapedMemberName);
                }
            });
        } else {
            fromMembers.forEach((fromMember, escapedMemberName) => {
                const toMember = toMembers.get(escapedMemberName);
                if (toMember) {
                    validateMember(toMember, fromMember, escapedMemberName);
                }
            });
        }
    }

    function validateMember(toMember: ts.Symbol, fromMember: ts.Symbol, escapedMemberName: ts.__String): void {
        const toMemberType = context.checker.getTypeOfSymbolAtLocation(toMember, node);
        const fromMemberType = context.checker.getTypeOfSymbolAtLocation(fromMember, node);
        const memberName = ts.unescapeLeadingUnderscores(escapedMemberName);
        validateAssignment(
            context,
            node,
            fromMemberType,
            toMemberType,
            toName ? `${toName}.${memberName}` : memberName
        );
    }
}

function validateFunctionAssignment(
    context: TransformationContext,
    node: ts.Node,
    fromType: ts.Type,
    toType: ts.Type,
    toName?: string
): void {
    const fromContext = getFunctionContextType(context, fromType);
    const toContext = getFunctionContextType(context, toType);

    if (fromContext === ContextType.Mixed || toContext === ContextType.Mixed) {
        context.diagnostics.push(unsupportedOverloadAssignment(node, toName));
    } else if (fromContext !== toContext && fromContext !== ContextType.None && toContext !== ContextType.None) {
        context.diagnostics.push(
            toContext === ContextType.Void
                ? unsupportedNoSelfFunctionConversion(node, toName)
                : unsupportedSelfFunctionConversion(node, toName)
        );
    }
}
