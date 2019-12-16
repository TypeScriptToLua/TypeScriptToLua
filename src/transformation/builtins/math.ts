import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { LuaTarget } from "../../CompilerOptions";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformMathProperty(node: ts.PropertyAccessExpression): lua.Expression {
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
            throw UnsupportedProperty("Math", name, node);
    }
}

export function transformMathCall(context: TransformationContext, node: PropertyCallExpression): lua.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        // Lua 5.3: math.atan(y, x)
        // Otherwise: math.atan2(y, x)
        case "atan2": {
            const math = lua.createIdentifier("math");
            const methodName = context.options.luaTarget === LuaTarget.Lua53 ? "atan" : expressionName;
            const method = lua.createStringLiteral(methodName);
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }

        // (math.log(x) / Math.LNe)
        case "log10":
        case "log2": {
            const math = lua.createIdentifier("math");
            const log1 = lua.createTableIndexExpression(math, lua.createStringLiteral("log"));
            const logCall1 = lua.createCallExpression(log1, params);
            const e = lua.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
            const div = lua.createBinaryExpression(logCall1, e, lua.SyntaxKind.DivisionOperator);
            return lua.createParenthesizedExpression(div, node);
        }

        // math.log(1 + x)
        case "log1p": {
            const math = lua.createIdentifier("math");
            const log = lua.createStringLiteral("log");
            const one = lua.createNumericLiteral(1);
            const add = lua.createBinaryExpression(one, params[0], lua.SyntaxKind.AdditionOperator);
            return lua.createCallExpression(lua.createTableIndexExpression(math, log), [add], node);
        }

        // math.floor(x + 0.5)
        case "round": {
            const math = lua.createIdentifier("math");
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
            const math = lua.createIdentifier("math");
            const method = lua.createStringLiteral(expressionName);
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }

        default:
            throw UnsupportedProperty("Math", expressionName, expression);
    }
}
