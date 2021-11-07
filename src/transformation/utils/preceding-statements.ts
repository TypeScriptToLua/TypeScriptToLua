import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";

export function transformInPrecedingStatementScope<
    TReturn extends lua.Statement | lua.Statement[] | lua.Expression | lua.Expression[]
>(context: TransformationContext, transformer: () => TReturn): [lua.Statement[], TReturn] {
    context.pushPrecedingStatements();
    const statementOrStatements = transformer();
    const precedingStatements = context.popPrecedingStatements();
    return [precedingStatements, statementOrStatements];
}
