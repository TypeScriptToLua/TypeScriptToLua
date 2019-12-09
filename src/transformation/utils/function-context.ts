import * as ts from "typescript";
import { CompilerOptions } from "../../CompilerOptions";
import { TransformationContext } from "../context";
import { AnnotationKind, getFileAnnotations, getNodeAnnotations } from "./annotations";
import { findFirstNodeAbove, getAllCallSignatures, inferAssignedType } from "./typescript";

export enum ContextType {
    None,
    Void,
    NonVoid,
    Mixed,
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
    return signatureDeclaration.parameters.find(
        param => ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword
    );
}

export function getDeclarationContextType(
    { program }: TransformationContext,
    signatureDeclaration: ts.SignatureDeclaration
): ContextType {
    const thisParameter = getExplicitThisParameter(signatureDeclaration);
    if (thisParameter) {
        // Explicit 'this'
        return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
            ? ContextType.Void
            : ContextType.NonVoid;
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

        if (scopeDeclaration === undefined) {
            return ContextType.NonVoid;
        }

        if (getNodeAnnotations(scopeDeclaration).has(AnnotationKind.NoSelf)) {
            return ContextType.Void;
        }

        return ContextType.NonVoid;
    }

    // When using --noImplicitSelf and the signature is defined in a file targeted by the program apply the @noSelf rule.
    const options = program.getCompilerOptions() as CompilerOptions;
    if (options.noImplicitSelf && program.getRootFileNames().includes(signatureDeclaration.getSourceFile().fileName)) {
        return ContextType.Void;
    }

    // Walk up to find @noSelf or @noSelfInFile
    if (hasNoSelfAncestor(signatureDeclaration)) {
        return ContextType.Void;
    }

    return ContextType.NonVoid;
}

function reduceContextTypes(contexts: ContextType[]): ContextType {
    const reducer = (a: ContextType, b: ContextType) => {
        if (a === ContextType.None) {
            return b;
        } else if (b === ContextType.None) {
            return a;
        } else if (a !== b) {
            return ContextType.Mixed;
        } else {
            return a;
        }
    };

    return contexts.reduce(reducer, ContextType.None);
}

function getSignatureDeclarations(
    context: TransformationContext,
    signatures: readonly ts.Signature[]
): ts.SignatureDeclaration[] {
    return signatures.flatMap(signature => {
        const signatureDeclaration = signature.getDeclaration();
        if (
            (ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration)) &&
            !getExplicitThisParameter(signatureDeclaration)
        ) {
            // Infer type of function expressions/arrow functions
            const inferredType = inferAssignedType(context, signatureDeclaration);
            if (inferredType) {
                const inferredSignatures = getAllCallSignatures(inferredType);
                if (inferredSignatures.length > 0) {
                    return inferredSignatures.map(s => s.getDeclaration());
                }
            }
        }

        return signatureDeclaration;
    });
}

export function getFunctionContextType(context: TransformationContext, type: ts.Type): ContextType {
    if (type.isTypeParameter()) {
        type = type.getConstraint() ?? type;
    }

    if (type.isUnion()) {
        return reduceContextTypes(type.types.map(t => getFunctionContextType(context, t)));
    }

    const signatures = context.checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length === 0) {
        return ContextType.None;
    }

    const signatureDeclarations = getSignatureDeclarations(context, signatures);
    return reduceContextTypes(signatureDeclarations.map(s => getDeclarationContextType(context, s)));
}
