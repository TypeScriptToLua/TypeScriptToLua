import * as ts from "typescript";
import * as tstl from "../../../src";
import { visitAndReplace } from "./utils";

export const program = (program: ts.Program, options: { value: any }): ts.TransformerFactory<ts.SourceFile> =>
    checker(program.getTypeChecker(), options);

export const config = ({ value }: { value: any }): ts.TransformerFactory<ts.SourceFile> => context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(value));
    });

export const checker = (
    checker: ts.TypeChecker,
    { value }: { value: any }
): ts.TransformerFactory<ts.SourceFile> => context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || !node.expression) return;
        const type = checker.getTypeAtLocation(node.expression);
        if ((type.flags & ts.TypeFlags.BooleanLiteral) === 0) return;
        return ts.updateReturn(node, ts.createLiteral(value));
    });

export const raw: ts.TransformerFactory<ts.SourceFile> = context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    });

export const compilerOptions = ({
    luaTarget,
}: tstl.CompilerOptions): ts.TransformerFactory<ts.SourceFile> => context => file => {
    if (luaTarget !== tstl.LuaTarget.LuaJIT) {
        throw new Error("Transformer supports only LuaJIT target");
    }

    return visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node) || node.expression) return;
        return ts.updateReturn(node, ts.createLiteral(true));
    });
};
