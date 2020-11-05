module.exports = ({ github, context }) => {
    const benchmarkInfoLua = JSON.parse(core.getInput("benchmark-info-lua", { required: true }));
    const benchmarkInfoJIT = JSON.parse(core.getInput("benchmark-info-jit", { required: true }));

    const zlib = require("zlib");
    const buffer = Buffer.from(core.getInput("benchmark-info-lua", { required: true }));
    const compressed = zlib.deflateSync(buffer);

    const summary =
        `[Open visualizer](https://typescripttolua.github.io/benchviz?d=${compressed.toString("base64")})\n` +
        `### Lua5.3\n${benchmarkInfoLua.comparison.summary}\n### LuaJIT\n${benchmarkInfoJIT.comparison.summary}`;

    const text = `### Lua5.3\n${benchmarkInfoLua.comparison.text}\n### LuaJIT\n${benchmarkInfoJIT.comparison.text}`;

    github.checks.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: "Benchmark results",
        head_sha: context.sha,
        status: "completed",
        conclusion: "neutral",
        output: {
            title: "Benchmark results",
            summary: summary,
            text: text,
        },
    });
    console.log(summary);
    console.log(text);
};
