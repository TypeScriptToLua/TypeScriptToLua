import { SourceNode } from "source-map";
import * as ts from "typescript";
import { escapeString, unescapeLuaString } from "../LuaPrinter";

export interface Module {
    request: string;
    isBuilt: boolean;
    source: SourceNode;
    sourceFiles?: ts.SourceFile[];
}

export type ModuleDependencyResolver = (request: string) => string | { error: string };

export function buildModule(module: Module, dependencyResolver: ModuleDependencyResolver) {
    if (module.isBuilt) return;
    module.isBuilt = true;
    replaceResolveRequests(module.source, dependencyResolver);
}

function replaceResolveRequests(rootNode: SourceNode, dependencyResolver: ModuleDependencyResolver) {
    function replaceInString(source: string) {
        return source.replace(/__TS__Resolve\((".*?")\)/g, (_, match) => {
            const request = unescapeLuaString(match);
            const replacement = dependencyResolver(request);
            return typeof replacement === "string"
                ? escapeString(replacement)
                : `--[[ ${request} ]] error(${escapeString(replacement.error)})`;
        });
    }

    function walkSourceNode(node: SourceNode, parent: SourceNode) {
        for (const child of node.children as Array<SourceNode | string>) {
            if (typeof child === "object") {
                walkSourceNode(child, node);
            } else if (child.includes("__TS__Resolve")) {
                parent.children = [replaceInString(parent.toString()) as any];
            }
        }
    }

    walkSourceNode(rootNode, rootNode);
}
