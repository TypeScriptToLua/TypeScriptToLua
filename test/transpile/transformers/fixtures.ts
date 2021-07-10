import * as assert from "assert";
import * as ts from "typescript";
import * as tstl from "../../../src";
import { visitAndReplace } from "./utils";

export const program = (program: ts.Program, options: { value: any }): ts.TransformerFactory<ts.SourceFile> =>
    checker(program.getTypeChecker(), options);

export const config =
    ({ value }: { value: any }): ts.TransformerFactory<ts.SourceFile> =>
    context =>
    file =>
        visitAndReplace(context, file, node => {
            if (!ts.isReturnStatement(node)) return;
            return ts.factory.updateReturnStatement(node, value ? ts.factory.createTrue() : ts.factory.createFalse());
        });

export const checker =
    (checker: ts.TypeChecker, { value }: { value: any }): ts.TransformerFactory<ts.SourceFile> =>
    context =>
    file =>
        visitAndReplace(context, file, node => {
            if (!ts.isReturnStatement(node) || !node.expression) return;
            const type = checker.getTypeAtLocation(node.expression);
            if ((type.flags & ts.TypeFlags.BooleanLiteral) === 0) return;
            return ts.factory.updateReturnStatement(node, value ? ts.factory.createTrue() : ts.factory.createFalse());
        });

export const raw: ts.TransformerFactory<ts.SourceFile> = context => file =>
    visitAndReplace(context, file, node => {
        if (!ts.isReturnStatement(node)) return;
        return ts.factory.updateReturnStatement(node, ts.factory.createTrue());
    });

export const compilerOptions =
    (options: tstl.CompilerOptions): ts.TransformerFactory<ts.SourceFile> =>
    context =>
    file => {
        assert(options.plugins?.length === 1);
        return visitAndReplace(context, file, node => {
            if (!ts.isReturnStatement(node)) return;
            return ts.factory.updateReturnStatement(node, ts.factory.createTrue());
        });
    };
