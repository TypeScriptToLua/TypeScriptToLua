import { SourceNode } from "source-map";
import * as ts from "typescript";
import { escapeString, unescapeLuaString } from "../LuaPrinter";

/**
 * Source code of a single input Lua file.
 * May be constructed from transpiled `.ts` source files, or from real `.lua` files.
 */
export interface Module {
    fileName: string;
    isBuilt: boolean;
    source: SourceNode;
    sourceFiles?: ts.SourceFile[];
}

export type ModuleDependencyResolver = (request: string, position: ts.ReadonlyTextRange) => string | { error: string };

export function buildModule(module: Module, dependencyResolver: ModuleDependencyResolver) {
    if (module.isBuilt) return;
    module.isBuilt = true;
    replaceResolveRequests(module.source, dependencyResolver);
}

function replaceResolveRequests(rootNode: SourceNode, dependencyResolver: ModuleDependencyResolver) {
    let currentPosition = 0;

    function replaceInString(source: string) {
        const matches = source.matchAll(/__TS__Resolve\((".*?")\)/g);
        for (const match of [...matches].reverse()) {
            const request = unescapeLuaString(match[1]);
            const pos = currentPosition + match.index!;
            const end = pos + match[0].length;
            const result = dependencyResolver(request, { pos, end });
            const replacement =
                typeof result === "string"
                    ? escapeString(result)
                    : `--[[ ${request} ]] error(${escapeString(result.error)})`;

            source = source.slice(0, match.index) + replacement + source.slice(end);
        }

        return source;
    }

    function walkSourceNode(node: SourceNode, parent: SourceNode) {
        for (const child of node.children as Array<SourceNode | string>) {
            if (typeof child === "object") {
                walkSourceNode(child, node);
            } else {
                if (child.includes("__TS__Resolve")) {
                    parent.children = [replaceInString(parent.toString()) as any];
                }

                currentPosition += child.length;
            }
        }
    }

    walkSourceNode(rootNode, rootNode);
}
