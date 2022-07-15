import * as ts from "typescript";
import { CompilerOptions } from "../../CompilerOptions";
import { TransformationContext } from "../context";
import { AnnotationKind, getFileAnnotations, getNodeAnnotations } from "./annotations";
import { findFirstNodeAbove, getAllCallSignatures, inferAssignedType } from "./typescript";

export enum ContextType {
    None = 0,
    Void = 0b01,
    NonVoid = 0b10,
    Mixed = 0b11,
}

function hasNoSelfAncestor(declaration: ts.Declaration): boolean {
    const scopeDeclaration = findFirstNodeAbove(
        declaration,
        (node): node is ts.SourceFile | ts.ModuleDeclaration => ts.isSourceFile(node) || ts.isModuleDeclaration(node)
    );

    if (!scopeDeclaration) {
        return false;
    } else if (ts.isSourceFile(scopeDeclaration)) {
        return getFileAnnotations(scopeDeclaration).has(AnnotationKind.NoSelfInFile);
    } else if (getNodeAnnotations(scopeDeclaration).has(AnnotationKind.NoSelf)) {
        return true;
    } else {
        return hasNoSelfAncestor(scopeDeclaration);
    }
}

function getExplicitThisParameter(signatureDeclaration: ts.SignatureDeclaration): ts.ParameterDeclaration | undefined {
    const param = signatureDeclaration.parameters[0];
    if (param && ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
        return param;
    }
}

interface SignatureDeclarationWithContextType extends ts.SignatureDeclarationBase {
    tstlFunctionContextType?: ContextType;
}

export function getDeclarationContextType(
    context: TransformationContext,
    signatureDeclaration: ts.SignatureDeclaration
): ContextType {
    const withContextType = signatureDeclaration as SignatureDeclarationWithContextType;
    if (withContextType.tstlFunctionContextType !== undefined) {
        return withContextType.tstlFunctionContextType;
    }
    return (withContextType.tstlFunctionContextType = computeDeclarationContextType(context, signatureDeclaration));
}

function computeDeclarationContextType(context: TransformationContext, signatureDeclaration: ts.SignatureDeclaration) {
    const thisParameter = getExplicitThisParameter(signatureDeclaration);
    if (thisParameter) {
        // Explicit 'this'
        return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
            ? ContextType.Void
            : ContextType.NonVoid;
    }

    // noSelf declaration on function signature
    if (getNodeAnnotations(signatureDeclaration).has(AnnotationKind.NoSelf)) {
        return ContextType.Void;
    }

    if (
        ts.isMethodSignature(signatureDeclaration) ||
        ts.isMethodDeclaration(signatureDeclaration) ||
        ts.isConstructSignatureDeclaration(signatureDeclaration) ||
        ts.isConstructorDeclaration(signatureDeclaration) ||
        (signatureDeclaration.parent && ts.isPropertyDeclaration(signatureDeclaration.parent)) ||
        (signatureDeclaration.parent && ts.isPropertySignature(signatureDeclaration.parent))
    ) {
        // Class/interface methods only respect @noSelf on their parent
        const scopeDeclaration = findFirstNodeAbove(
            signatureDeclaration,
            (n): n is ts.ClassLikeDeclaration | ts.InterfaceDeclaration =>
                ts.isClassDeclaration(n) || ts.isClassExpression(n) || ts.isInterfaceDeclaration(n)
        );

        if (scopeDeclaration !== undefined && getNodeAnnotations(scopeDeclaration).has(AnnotationKind.NoSelf)) {
            return ContextType.Void;
        }

        return ContextType.NonVoid;
    }

    // When using --noImplicitSelf and the signature is defined in a file targeted by the program apply the @noSelf rule.
    const program = context.program;
    const options = program.getCompilerOptions() as CompilerOptions;
    if (options.noImplicitSelf) {
        const sourceFile = program.getSourceFile(signatureDeclaration.getSourceFile().fileName);
        if (
            sourceFile !== undefined &&
            !program.isSourceFileDefaultLibrary(sourceFile) &&
            !program.isSourceFileFromExternalLibrary(sourceFile)
        ) {
            return ContextType.Void;
        }
    }

    // Walk up to find @noSelf or @noSelfInFile
    if (hasNoSelfAncestor(signatureDeclaration)) {
        return ContextType.Void;
    }

    return ContextType.NonVoid;
}

function reduceContextTypes(contexts: ContextType[]): ContextType {
    let type = ContextType.None;
    for (const context of contexts) {
        type |= context;
        if (type === ContextType.Mixed) break;
    }
    return type;
}

function getSignatureDeclarations(context: TransformationContext, signature: ts.Signature): ts.SignatureDeclaration[] {
    const signatureDeclaration = signature.getDeclaration();
    let inferredType: ts.Type | undefined;
    if (
        ts.isMethodDeclaration(signatureDeclaration) &&
        ts.isObjectLiteralExpression(signatureDeclaration.parent) &&
        !getExplicitThisParameter(signatureDeclaration)
    ) {
        inferredType = context.checker.getContextualTypeForObjectLiteralElement(signatureDeclaration);
    } else if (
        (ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration)) &&
        !getExplicitThisParameter(signatureDeclaration)
    ) {
        // Infer type of function expressions/arrow functions
        inferredType = inferAssignedType(context, signatureDeclaration);
    }

    if (inferredType) {
        const inferredSignatures = getAllCallSignatures(inferredType);
        if (inferredSignatures.length > 0) {
            return inferredSignatures.map(s => s.getDeclaration());
        }
    }

    return [signatureDeclaration];
}

interface TypeWithFunctionContext extends ts.Type {
    tstlFunctionContextType?: ContextType;
}

export function getFunctionContextType(context: TransformationContext, type: ts.Type): ContextType {
    const asCached = type as TypeWithFunctionContext;
    if (asCached.tstlFunctionContextType !== undefined) return asCached.tstlFunctionContextType;
    return (asCached.tstlFunctionContextType = computeFunctionContextType(context, type));
}

function computeFunctionContextType(context: TransformationContext, type: ts.Type): ContextType {
    if (type.isTypeParameter()) {
        const constraint = type.getConstraint();
        if (constraint) return getFunctionContextType(context, constraint);
    }

    const signatures = context.checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length === 0) {
        return ContextType.None;
    }

    return reduceContextTypes(
        signatures.flatMap(s => getSignatureDeclarations(context, s)).map(s => getDeclarationContextType(context, s))
    );
}
