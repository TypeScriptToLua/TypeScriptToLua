import { TransformationContext } from "../../context";
import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { transformOperatorMappingExpression } from "./operators";
import { transformTableExtensionCall } from "./table";

export function transformLanguageExtensionCallExpression(
    context: TransformationContext,
    node: ts.CallExpression,
    isOptionalCall: boolean
): lua.Expression | undefined {
    const operatorMapping = transformOperatorMappingExpression(context, node, isOptionalCall);
    if (operatorMapping) {
        return operatorMapping;
    }
    const tableCall = transformTableExtensionCall(context, node, isOptionalCall);
    if (tableCall) {
        return tableCall;
    }
}
