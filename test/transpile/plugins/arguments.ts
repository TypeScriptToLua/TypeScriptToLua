import * as ts from "typescript";
import * as tstl from "../../../src";

interface Options {
    name: string;
    option: boolean;
}

export default function plugin(options: Options): tstl.Plugin {
    return {
        visitors: {
            [ts.SyntaxKind.ReturnStatement]: () =>
                tstl.createReturnStatement([
                    tstl.createTableExpression([
                        tstl.createTableFieldExpression(
                            tstl.createStringLiteral(options.name),
                            tstl.createStringLiteral("name")
                        ),
                        tstl.createTableFieldExpression(
                            tstl.createBooleanLiteral(options.option),
                            tstl.createStringLiteral("option")
                        ),
                    ]),
                ]),
        },
    };
}
