import * as util from "../util";
import { resolveFixture } from "./run";

test("printer", () => {
    util.testModule``
        .setOptions({ luaPlugins: [{ name: resolveFixture("plugins/printer.ts") }] })
        .expectLuaToMatchSnapshot();
});

test("visitor", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ luaPlugins: [{ name: resolveFixture("plugins/visitor.ts") }] })
        .expectToEqual(true);
});

test("visitor using super", () => {
    util.testFunction`
        return "foo";
    `
        .setOptions({ luaPlugins: [{ name: resolveFixture("plugins/visitor-super.ts") }] })
        .expectToEqual("bar");
});

test("getModuleId", () => {
    util.testBundle`
        export { value } from "./foo";
    `
        .addExtraFile("foo.ts", "export const value = true;")
        .setOptions({ luaPlugins: [{ name: resolveFixture("plugins/getModuleId.ts") }] })
        .expectToEqual({ value: true })
        .expectLuaToMatchSnapshot();
});

test("getResolvePlugins", () => {
    util.testBundle`
        export { value } from "foo";
    `
        .addExtraFile("bar.ts", "export const value = true;")
        .setOptions({
            luaPlugins: [{ name: resolveFixture("plugins/getResolvePlugins.ts") }],
            baseUrl: ".",
            paths: { foo: ["bar"] },
        })
        .expectToEqual({ value: true });
});

test("passing arguments", () => {
    util.testFunction`
        return {};
    `
        .setOptions({ luaPlugins: [{ name: resolveFixture("plugins/arguments.ts"), option: true }] })
        .expectToEqual({ name: resolveFixture("plugins/arguments.ts"), option: true });
});
