import * as ts from "typescript";

declare module "typescript" {
    interface Statement {
        jsDoc?: ts.JSDoc[];
    }
}
