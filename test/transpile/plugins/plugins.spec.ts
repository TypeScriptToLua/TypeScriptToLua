import * as path from "path";
import * as util from "../../util";

test("printer", () => {
    util.testModule``
        .setOptions({ luaPlugins: [{ plugin: path.join(__dirname, "printer.ts") }] })
        .tap(builder => expect(builder.getMainLuaCodeChunk()).toMatch("Plugin"));
});

test("visitor", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ luaPlugins: [{ plugin: path.join(__dirname, "visitor.ts") }] })
        .expectToEqual(true);
});

test("visitor using super", () => {
    util.testFunction`
        return "foo";
    `
        .setOptions({ luaPlugins: [{ plugin: path.join(__dirname, "visitor-super.ts") }] })
        .expectToEqual("bar");
});
