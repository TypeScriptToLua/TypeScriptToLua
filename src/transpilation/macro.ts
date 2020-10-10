import { SourceNode } from "source-map";
import { escapeString, unescapeLuaString } from "../LuaPrinter";

export type MacroDependencyResolver = (request: string) => string | { error: string };

export function replaceResolveMacroSourceNodes(rootNode: SourceNode, replacer: MacroDependencyResolver) {
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

export function replaceResolveMacroInSource(source: string, replacer: MacroDependencyResolver) {
    return source.replace(/__TS__Resolve\((".*?")\)/, (_, match) => {
        const request = unescapeLuaString(match);
        const replacement = replacer(request);
        return typeof replacement === "string"
            ? escapeString(replacement)
            : `--[[ ${request} ]] error(${escapeString(replacement.error)})`;
    });
}
