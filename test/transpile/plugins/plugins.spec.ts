import * as path from "path";
import * as util from "../../util";

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
