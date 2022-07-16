import * as ts from "typescript";
import * as lua from "../LuaAST";
import { getOrUpdate } from "../utils";
import { ObjectVisitor, TransformationContext, VisitorMap, Visitors } from "./context";
import { standardVisitors } from "./visitors";

export function createVisitorMap(customVisitors: Visitors[]): VisitorMap {
    const objectVisitorMap: Map<ts.SyntaxKind, Array<ObjectVisitor<ts.Node>>> = new Map();
    for (const visitors of [standardVisitors, ...customVisitors]) {
        const priority = visitors === standardVisitors ? -Infinity : 0;
        for (const [syntaxKindKey, visitor] of Object.entries(visitors)) {
            if (!visitor) continue;

            const syntaxKind = Number(syntaxKindKey) as ts.SyntaxKind;
            const nodeVisitors = getOrUpdate(objectVisitorMap, syntaxKind, () => []);

            const objectVisitor: ObjectVisitor<any> =
                typeof visitor === "function" ? { transform: visitor, priority } : visitor;
            nodeVisitors.push(objectVisitor);
        }
    }

    const result: VisitorMap = new Map();
    for (const [kind, nodeVisitors] of objectVisitorMap) {
        result.set(
            kind,
            nodeVisitors.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map(visitor => visitor.transform)
        );
    }
    return result;
}

export function transformSourceFile(program: ts.Program, sourceFile: ts.SourceFile, visitorMap: VisitorMap) {
    const context = new TransformationContext(program, sourceFile, visitorMap);
    const [file] = context.transformNode(sourceFile) as [lua.File];

    return { file, diagnostics: context.diagnostics };
}
