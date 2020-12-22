module.exports = ({ github, context, core }) => {
    const fs = require("fs");

    const benchmarkResultPathLua = core.getInput("benchmark-result-path-lua", { required: true });
    const benchmarkInfoLua = JSON.parse(fs.readFileSync(benchmarkResultPathLua));

    const benchmarkResultPathJIT = core.getInput("benchmark-result-path-jit", { required: true });
    const benchmarkInfoJIT = JSON.parse(fs.readFileSync(benchmarkResultPathJIT));

    // Remove Comparison info to save some bytes
    const benchmarkInfoForVizLua = { old: benchmarkInfoLua.old, new: benchmarkInfoLua.new };
    const buffer = Buffer.from(JSON.stringify(benchmarkInfoForVizLua));

    const zlib = require("zlib");
    const compressed = zlib.deflateSync(buffer);

    const summary =
        `[Open visualizer](https://typescripttolua.github.io/benchviz?d=${compressed.toString("base64")})\n` +
        `### Lua5.3\n${benchmarkInfoLua.comparison.summary}\n### LuaJIT\n${benchmarkInfoJIT.comparison.summary}`;

    return summary;
};
