import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { UnsupportedProperty } from "../utils/errors";

export function transformMathProperty(node: ts.PropertyAccessExpression): tstl.Expression {
    const name = node.name.text;
    switch (name) {
        case "PI":
            const property = tstl.createStringLiteral("pi", node.name);
            const math = tstl.createIdentifier("math", node.expression);
            return tstl.createTableIndexExpression(math, property, node);

        case "E":
        case "LN10":
        case "LN2":
        case "LOG10E":
        case "LOG2E":
        case "SQRT1_2":
        case "SQRT2":
            return tstl.createNumericLiteral(Math[name], node);

        default:
            throw UnsupportedProperty("Math", name, node);
    }
}

export function transformMathCall(context: TransformationContext, node: PropertyCallExpression): tstl.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        // math.tan(x / y)
        case "atan2": {
            const math = tstl.createIdentifier("math");
            const atan = tstl.createStringLiteral("atan");
            const div = tstl.createBinaryExpression(params[0], params[1], tstl.SyntaxKind.DivisionOperator);
            return tstl.createCallExpression(tstl.createTableIndexExpression(math, atan), [div], node);
        }

        // (math.log(x) / Math.LNe)
        case "log10":
        case "log2": {
            const math = tstl.createIdentifier("math");
            const log1 = tstl.createTableIndexExpression(math, tstl.createStringLiteral("log"));
            const logCall1 = tstl.createCallExpression(log1, params);
            const e = tstl.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
            const div = tstl.createBinaryExpression(logCall1, e, tstl.SyntaxKind.DivisionOperator);
            return tstl.createParenthesizedExpression(div, node);
        }

        // math.log(1 + x)
        case "log1p": {
            const math = tstl.createIdentifier("math");
            const log = tstl.createStringLiteral("log");
            const one = tstl.createNumericLiteral(1);
            const add = tstl.createBinaryExpression(one, params[0], tstl.SyntaxKind.AdditionOperator);
            return tstl.createCallExpression(tstl.createTableIndexExpression(math, log), [add], node);
        }

        // math.floor(x + 0.5)
        case "round": {
            const math = tstl.createIdentifier("math");
            const floor = tstl.createStringLiteral("floor");
            const half = tstl.createNumericLiteral(0.5);
            const add = tstl.createBinaryExpression(params[0], half, tstl.SyntaxKind.AdditionOperator);
            return tstl.createCallExpression(tstl.createTableIndexExpression(math, floor), [add], node);
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
            const math = tstl.createIdentifier("math");
            const method = tstl.createStringLiteral(expressionName);
            return tstl.createCallExpression(tstl.createTableIndexExpression(math, method), params, node);
        }

        default:
            throw UnsupportedProperty("Math", expressionName, expression);
    }
}
