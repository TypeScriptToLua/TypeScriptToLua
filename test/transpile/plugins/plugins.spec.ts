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

test("getModuleId", () => {
    util.testBundle`
        export { value } from "./foo";
    `
        .addExtraFile("foo.ts", "export const value = true;")
        .setOptions({ luaPlugins: [{ name: path.join(__dirname, "getModuleId.ts") }] })
        .expectToEqual({ value: true })
        .expectLuaToMatchSnapshot();
});

test("getResolvePlugins", () => {
    util.testBundle`
        export { value } from "foo";
    `
        .addExtraFile("bar.ts", "export const value = true;")
        .setOptions({
            luaPlugins: [{ name: path.join(__dirname, "getResolvePlugins.ts") }],
            baseUrl: ".",
            paths: { foo: ["bar"] },
        })
        .expectToEqual({ value: true });
});
