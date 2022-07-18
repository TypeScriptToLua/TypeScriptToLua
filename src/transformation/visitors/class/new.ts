import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import { annotationInvalidArgumentCount } from "../../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { transformArguments, transformCallAndArguments } from "../call";
import { isTableNewCall } from "../language-extensions/table";

export const transformNewExpression: FunctionVisitor<ts.NewExpression> = (node, context) => {
    if (isTableNewCall(context, node)) {
        return lua.createTableExpression(undefined, node);
    }

    const signature = context.checker.getResolvedSignature(node);
    const [name, params] = transformCallAndArguments(
        context,
        node.expression,
        node.arguments ?? [ts.factory.createTrue()],
        signature
    );

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
