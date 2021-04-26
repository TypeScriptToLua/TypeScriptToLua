import * as path from "path";
import * as util from "../../util";

test("printer", () => {
    util.testModule``
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "printer.ts") }] })
        .tap(builder => expect(builder.getMainLuaCodeChunk()).toMatch("Plugin"));
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

test("namespace with TS transformer plugin", () => {
    util.testModule`
        export namespace ns {
            export function returnsBool() {
                return false;
            }
        }
    `
        .setOptions({ plugins: [{ transform: path.join(__dirname, "transformer-plugin.js") }] })
        .expectNoExecutionError()
        .expectLuaToMatchSnapshot();
});
