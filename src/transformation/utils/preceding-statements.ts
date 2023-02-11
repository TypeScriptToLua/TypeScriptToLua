import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";

export interface WithPrecedingStatements<
    T extends lua.Statement | lua.Statement[] | lua.Expression | lua.Expression[]
> {
    precedingStatements: lua.Statement[];
    result: T;
}

export function transformInPrecedingStatementScope<
    TReturn extends lua.Statement | lua.Statement[] | lua.Expression | lua.Expression[]
>(context: TransformationContext, transformer: () => TReturn): WithPrecedingStatements<TReturn> {
    context.pushPrecedingStatements();
    const statementOrStatements = transformer();
    const precedingStatements = context.popPrecedingStatements();
    return { precedingStatements, result: statementOrStatements };
}
