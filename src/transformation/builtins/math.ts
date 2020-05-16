import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformMathProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const name = node.name.text;
    switch (name) {
        case "PI":
            const property = lua.createStringLiteral("pi", node.name);
            const math = lua.createIdentifier("math", node.expression);
            return lua.createTableIndexExpression(math, property, node);

        case "E":
        case "LN10":
        case "LN2":
        case "LOG10E":
        case "LOG2E":
        case "SQRT1_2":
        case "SQRT2":
            return lua.createNumericLiteral(Math[name], node);

        default:
            context.diagnostics.push(unsupportedProperty(node.name, "Math", name));
    }
}

export function transformMathCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const math = lua.createIdentifier("math");

    const expressionName = expression.name.text;
    switch (expressionName) {
        // Lua 5.3: math.atan(y, x)
        // Otherwise: math.atan2(y, x)
        case "atan2": {
            if (context.luaTarget === LuaTarget.Universal) {
                return transformLuaLibFunction(context, LuaLibFeature.MathAtan2, node, ...params);
            }

            const method = lua.createStringLiteral(context.luaTarget === LuaTarget.Lua53 ? "atan" : "atan2");
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }

        // (math.log(x) / Math.LNe)
        case "log10":
        case "log2": {
            const log1 = lua.createTableIndexExpression(math, lua.createStringLiteral("log"));
            const logCall1 = lua.createCallExpression(log1, params);
            const e = lua.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
            return lua.createBinaryExpression(logCall1, e, lua.SyntaxKind.DivisionOperator, node);
        }

        // math.log(1 + x)
        case "log1p": {
            const log = lua.createStringLiteral("log");
            const one = lua.createNumericLiteral(1);
            const add = lua.createBinaryExpression(one, params[0], lua.SyntaxKind.AdditionOperator);
            return lua.createCallExpression(lua.createTableIndexExpression(math, log), [add], node);
        }

        // math.floor(x + 0.5)
        case "round": {
            const floor = lua.createStringLiteral("floor");
            const half = lua.createNumericLiteral(0.5);
            const add = lua.createBinaryExpression(params[0], half, lua.SyntaxKind.AdditionOperator);
            return lua.createCallExpression(lua.createTableIndexExpression(math, floor), [add], node);
        }

        case "abs":
        case "acos":
        case "asin":
        case "atan":
        case "ceil":
        case "cos":
        case "exp":
        case "floor":
        case "log":
        case "max":
        case "min":
        case "pow":
        case "random":
        case "sin":
        case "sqrt":
        case "tan": {
            const method = lua.createStringLiteral(expressionName);
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }

        default:
            context.diagnostics.push(unsupportedProperty(expression.name, "Math", expressionName));
    }
}
