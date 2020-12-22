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

    const fromTypeNode = context.checker.typeToTypeNode(fromType, undefined, undefined);
    const toTypeNode = context.checker.typeToTypeNode(toType, undefined, undefined);
    if (!fromTypeNode || !toTypeNode) {
        return;
    }

    if (
        (ts.isArrayTypeNode(toTypeNode) || ts.isTupleTypeNode(toTypeNode)) &&
        (ts.isArrayTypeNode(fromTypeNode) || ts.isTupleTypeNode(fromTypeNode))
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

    if (
        (toType.flags & ts.TypeFlags.Object) !== 0 &&
        ((toType as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0 &&
        toType.symbol &&
        toType.symbol.members &&
        fromType.symbol &&
        fromType.symbol.members
    ) {
        // Recurse into interfaces
        toType.symbol.members.forEach((toMember, escapedMemberName) => {
            if (fromType.symbol.members) {
                const fromMember = fromType.symbol.members.get(escapedMemberName);
                if (fromMember) {
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
        });
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
