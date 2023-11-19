import * as path from "path";
import * as util from "../../util";
import * as ts from "typescript";

test("printer", () => {
    util.testModule``
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "printer.ts") }] })
        .tap(builder => expect(builder.getMainLuaCodeChunk()).toMatch("-- Custom printer plugin:"));
});

test("printer in bundle", () => {
    const { transpiledFiles } = util.testBundle`
        import "./otherfile";

        const foo = "foo";
    `
        .addExtraFile(
            "otherfile.ts",
            `
                const bar = "bar";
            `
        )
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "printer.ts") }] })
        .expectToHaveNoDiagnostics()
        .getLuaResult();

    expect(transpiledFiles).toHaveLength(1);
    const lua = transpiledFiles[0].lua!;

    expect(lua).toContain("-- Custom printer plugin: main.lua");
    expect(lua).toContain("-- Custom printer plugin: otherfile.lua");
});

test("visitor", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "visitor.ts") }] })
        .expectToEqual(true);
});

test("visitor using super", () => {
    util.testFunction`
        return "foo";
    `
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "visitor-super.ts") }] })
        .expectToEqual("bar");
});

test("passing arguments", () => {
    util.testFunction`
        return {};
    `
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "arguments.ts"), option: true }] })
        .expectToEqual({ name: path.join(__dirname, "arguments.ts"), option: true });
});

test("statement comments", () => {
    util.testFunction`
        let foo = "bar";
        foo = "baz";
        while (true) {}
    `
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "add-comments.ts") }] })
        .expectLuaToMatchSnapshot();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1013
test.each(["namespace", "module"])("%s with TS transformer plugin", moduleOrNamespace => {
    util.testModule`
        import { ns } from "module";
        export const result = ns.returnsBool();
    `
        .addExtraFile(
            "module.ts",
            `
            export ${moduleOrNamespace} ns {
                export function returnsBool() {
                    return false;
                }
            }
            `
        )
        .setOptions({ plugins: [{ transform: path.join(__dirname, "transformer-plugin.ts") }] })
        .expectNoExecutionError();
});

test("beforeTransform plugin", () => {
    const { transpiledFiles } = util.testModule`
        console.log("Hello, World!");
    `
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "beforeTransform.ts") }] })
        .getLuaResult();

    expect(transpiledFiles).toHaveLength(1);
    // Expect emitted to output path set by the plugin
    expect(transpiledFiles[0].outPath).toContain(path.join("plugin", "beforeTransform", "outdir"));
});

test("afterPrint plugin", () => {
    const { transpiledFiles } = util.testModule`
        console.log("Hello, World!");
    `
        .addExtraFile(
            "extrafile.ts",
            `
                console.log("Hello, Mars!");
            `
        )
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "afterPrint.ts") }] })
        .getLuaResult();

    expect(transpiledFiles).toHaveLength(2);
    for (const f of transpiledFiles) {
        // Expect plugin inserted extra lua at start of file
        expect(f.lua).toContain("-- Comment added by afterPrint plugin");
    }
});

test("beforeEmit plugin", () => {
    const { transpiledFiles } = util.testModule`
        console.log("Hello, World!");
        [].push(1,2,3); // Use lualib code
    `
        .addExtraFile(
            "extrafile.ts",
            `
            console.log("Hello, Mars!");
        `
        )
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "beforeEmit.ts") }] })
        .getLuaResult();

    // 2 input files + 1 lualib_bundle
    expect(transpiledFiles).toHaveLength(3);
    expect(transpiledFiles.find(f => f.outPath.endsWith("lualib_bundle.lua"))).toBeDefined();
    for (const f of transpiledFiles) {
        // Expect plugin inserted extra lua at start of all files including lualib bundle
        expect(f.lua).toContain("-- Comment added by beforeEmit plugin");
    }
});

test("beforeEmit plugin bundle", () => {
    const { transpiledFiles } = util.testBundle`
        console.log("Hello, World!");
        [].push(1,2,3); // Use lualib code
    `
        .addExtraFile(
            "extrafile.ts",
            `
            console.log("Hello, Mars!");
        `
        )
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "beforeEmit.ts") }] })
        .getLuaResult();

    // 1 lua bundle output
    expect(transpiledFiles).toHaveLength(1);
    for (const f of transpiledFiles) {
        // Expect bundle to be affected by plugin
        expect(f.lua).toContain("-- Comment added by beforeEmit plugin");
    }
});

test("afterEmit plugin", () => {
    const { diagnostics } = util.testModule`
        console.log("Hello, World!");
        [].push(1,2,3); // Use lualib code
    `
        .addExtraFile(
            "extrafile.ts",
            `
                console.log("Hello, Mars!");
            `
        )
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "afterEmit.ts") }] })
        .getLuaResult();

    // Expect to see the diagnostic returned by the plugin in the output
    const diagnostic = diagnostics.find(d => d.code === 1234);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.category).toBe(ts.DiagnosticCategory.Message);
    expect(diagnostic?.messageText).toContain("After emit");
});
