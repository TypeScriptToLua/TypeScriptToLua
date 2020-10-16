import * as path from "path";
import { Mapping, SourceMapGenerator, SourceNode, StartOfSourceMap } from "source-map";
import { CompilerOptions } from "../CompilerOptions";
import { Chunk } from "./chunk";

export function printChunk(chunk: Chunk, options: CompilerOptions) {
    const sourceRoot = options.sourceRoot
        ? // According to spec, sourceRoot is simply prepended to the source name, so the slash should be included
          options.sourceRoot.replace(/[\\/]+$/, "") + "/"
        : "";

    const map = buildSourceMap(chunk.source, { file: path.basename(chunk.outputPath), sourceRoot });
    const sourceMap = options.sourceMap ? map.toString() : undefined;

    let code = chunk.source.toString();

    if (options.inlineSourceMap) {
        code += printInlineSourceMap(map);
    }

    if (options.sourceMapTraceback) {
        code = code.replace("{#SourceMapTraceback}", printStackTraceOverride(chunk.source));
    }

    return { code, sourceMap };
}

function printInlineSourceMap(sourceMap: SourceMapGenerator): string {
    const base64Map = Buffer.from(sourceMap.toString()).toString("base64");
    return `--# sourceMappingURL=data:application/json;base64,${base64Map}\n`;
}

function printStackTraceOverride(rootNode: SourceNode): string {
    let currentLine = 1;
    const lineMap: Record<number, number> = {};
    rootNode.walk((chunk, mappedPosition) => {
        if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
            if (lineMap[currentLine] === undefined) {
                lineMap[currentLine] = mappedPosition.line;
            } else {
                lineMap[currentLine] = Math.min(lineMap[currentLine], mappedPosition.line);
            }
        }

        currentLine += chunk.split("\n").length - 1;
    });

    const mappings = Object.entries(lineMap).map(([line, original]) => `["${line}"] = ${original}`);
    return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, {${mappings.join(",")}});`;
}

// The key difference between this and SourceNode.toStringWithSourceMap() is that SourceNodes with null line/column
// will not generate 'empty' mappings in the source map that point to nothing in the original TS.
function buildSourceMap(sourceNode: SourceNode, startOfSourceMap: StartOfSourceMap): SourceMapGenerator {
    const map = new SourceMapGenerator(startOfSourceMap);

    let generatedLine = 1;
    let generatedColumn = 0;
    let currentMapping: Mapping | undefined;

    const isNewMapping = (sourceNode: SourceNode) => {
        if (sourceNode.line === null) {
            return false;
        }
        if (currentMapping === undefined) {
            return true;
        }
        if (
            currentMapping.generated.line === generatedLine &&
            currentMapping.generated.column === generatedColumn &&
            currentMapping.name === sourceNode.name
        ) {
            return false;
        }
        return (
            currentMapping.original.line !== sourceNode.line ||
            currentMapping.original.column !== sourceNode.column ||
            currentMapping.name !== sourceNode.name
        );
    };

    const build = (sourceNode: SourceNode) => {
        if (isNewMapping(sourceNode)) {
            currentMapping = {
                source: sourceNode.source,
                original: { line: sourceNode.line, column: sourceNode.column },
                generated: { line: generatedLine, column: generatedColumn },
                name: sourceNode.name,
            };
            map.addMapping(currentMapping);
        }

        for (const chunk of sourceNode.children) {
            if (typeof chunk === "string") {
                const lines = (chunk as string).split("\n");
                if (lines.length > 1) {
                    generatedLine += lines.length - 1;
                    generatedColumn = 0;
                    currentMapping = undefined; // Mappings end at newlines
                }
                generatedColumn += lines[lines.length - 1].length;
            } else {
                build(chunk);
            }
        }
    };
    build(sourceNode);

    return map;
}
