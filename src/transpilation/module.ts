import { SourceNode } from "source-map";
import * as ts from "typescript";
import { escapeString, unescapeLuaString } from "../LuaPrinter";

export interface Module {
    request: string;
    isBuilt: boolean;
    code: string;
    sourceMap?: string;
    sourceMapNode?: SourceNode;
    sourceFiles?: ts.SourceFile[];
}

export type ModuleDependencyResolver = (request: string) => string | { error: string };

export function buildModule(module: Module, dependencyResolver: ModuleDependencyResolver) {
    if (module.isBuilt) return;
    module.isBuilt = true;

    if (module.sourceMapNode) {
        replaceResolveMacroSourceNodes(module.sourceMapNode, dependencyResolver);
        const { code, map } = module.sourceMapNode.toStringWithSourceMap();
        module.code = code;
        module.sourceMap = JSON.stringify(map.toJSON());
    } else {
        module.code = replaceResolveMacroInSource(module.code, dependencyResolver);
    }
}

function replaceResolveMacroSourceNodes(rootNode: SourceNode, replacer: ModuleDependencyResolver) {
    function walkSourceNode(node: SourceNode, parent: SourceNode) {
        for (const child of node.children) {
            if ((child as any) === "__TS__Resolve") {
                parent.children = [replaceResolveMacroInSource(parent.toString(), replacer) as any];
            } else if (typeof child === "object") {
                walkSourceNode(child, node);
            }
        }
    }

    walkSourceNode(rootNode, rootNode);
}

function replaceResolveMacroInSource(source: string, replacer: ModuleDependencyResolver) {
    return source.replace(/__TS__Resolve\((".*?")\)/, (_, match) => {
        const request = unescapeLuaString(match);
        const replacement = replacer(request);
        return typeof replacement === "string"
            ? escapeString(replacement)
            : `--[[ ${request} ]] error(${escapeString(replacement.error)})`;
    });
}
