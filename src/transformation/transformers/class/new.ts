import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { DecoratorKind, getCustomDecorators } from "../../utils/decorators";
import { InvalidDecoratorArgumentNumber, InvalidNewExpressionOnExtension } from "../../utils/errors";
import { importLuaLibFeature, LuaLibFeature } from "../../utils/lualib";
import { transformArguments } from "../call";

// TODO: Do it in identifier?
function checkForLuaLibType(context: TransformationContext, type: ts.Type): void {
    if (type.symbol) {
        switch (context.checker.getFullyQualifiedName(type.symbol)) {
            case "Map":
                importLuaLibFeature(context, LuaLibFeature.Map);
                return;
            case "Set":
                importLuaLibFeature(context, LuaLibFeature.Set);
                return;
            case "WeakMap":
                importLuaLibFeature(context, LuaLibFeature.WeakMap);
                return;
            case "WeakSet":
                importLuaLibFeature(context, LuaLibFeature.WeakSet);
                return;
        }
    }
}

export const transformNewExpression: FunctionVisitor<ts.NewExpression> = (node, context) => {
    const name = context.transformExpression(node.expression);
    const signature = context.checker.getResolvedSignature(node);
    const params = node.arguments
        ? transformArguments(context, node.arguments, signature)
        : [tstl.createBooleanLiteral(true)];

    const type = context.checker.getTypeAtLocation(node);

    checkForLuaLibType(context, type);

    const classDecorators = getCustomDecorators(context, type);

    if (classDecorators.has(DecoratorKind.Extension) || classDecorators.has(DecoratorKind.MetaExtension)) {
        throw InvalidNewExpressionOnExtension(node);
    }

    if (classDecorators.has(DecoratorKind.CustomConstructor)) {
        const customDecorator = classDecorators.get(DecoratorKind.CustomConstructor);
        if (customDecorator === undefined || customDecorator.args[0] === undefined) {
            throw InvalidDecoratorArgumentNumber("@customConstructor", 0, 1, node);
        }

        return tstl.createCallExpression(
            tstl.createIdentifier(customDecorator.args[0]),
            transformArguments(context, node.arguments || []),
            node
        );
    }

    return tstl.createCallExpression(
        tstl.createTableIndexExpression(name, tstl.createStringLiteral("new")),
        params,
        node
    );
};
