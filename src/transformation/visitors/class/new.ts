import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import { annotationInvalidArgumentCount, unsupportedArrayWithLengthConstructor } from "../../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { transformArguments, transformCallAndArguments } from "../call";
import { isTableNewCall } from "../language-extensions/table";
import { tryGetStandardLibrarySymbolOfType } from "../../builtins";

export const transformNewExpression: FunctionVisitor<ts.NewExpression> = (node, context) => {
    if (isTableNewCall(context, node)) {
        return lua.createTableExpression(undefined, node);
    }

    const constructorType = context.checker.getTypeAtLocation(node.expression);
    if (tryGetStandardLibrarySymbolOfType(context, constructorType)?.name === "ArrayConstructor") {
        if (node.arguments === undefined || node.arguments.length === 0) {
            // turn new Array<>() into a simple {}
            return lua.createTableExpression([], node);
        } else {
            // More than one argument, check if items constructor
            const signature = context.checker.getResolvedSignature(node);
            const signatureDeclaration = signature?.getDeclaration();
            if (
                signatureDeclaration?.parameters.length === 1 &&
                signatureDeclaration.parameters[0].dotDotDotToken === undefined
            ) {
                context.diagnostics.push(unsupportedArrayWithLengthConstructor(node));
                return lua.createTableExpression([], node);
            } else {
                const callArguments = transformArguments(context, node.arguments, signature);
                return lua.createTableExpression(
                    callArguments.map(e => lua.createTableFieldExpression(e)),
                    node
                );
            }
        }
    }

    const signature = context.checker.getResolvedSignature(node);
    const [name, params] = transformCallAndArguments(context, node.expression, node.arguments ?? [], signature);

    const type = context.checker.getTypeAtLocation(node);
    const annotations = getTypeAnnotations(type);
    const customConstructorAnnotation = annotations.get(AnnotationKind.CustomConstructor);
    if (customConstructorAnnotation) {
        if (customConstructorAnnotation.args.length === 1) {
            return lua.createCallExpression(
                lua.createIdentifier(customConstructorAnnotation.args[0]),
                transformArguments(context, node.arguments ?? []),
                node
            );
        } else {
            context.diagnostics.push(
                annotationInvalidArgumentCount(
                    node,
                    AnnotationKind.CustomConstructor,
                    customConstructorAnnotation.args.length,
                    1
                )
            );
        }
    }

    return transformLuaLibFunction(context, LuaLibFeature.New, node, name, ...params);
};
