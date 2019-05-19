import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test.each([
    "export { default } from '...'",
    "export { x as default } from '...';",
    "export { default as x } from '...';",
])("Export default keyword disallowed (%p)", exportStatement => {
    expect(() => util.transpileString(exportStatement)).toThrowExactError(
        TSTLErrors.UnsupportedDefaultExport(util.nodeStub),
    );
});

test.each(["ke-bab", "dollar$", "singlequote'", "hash#", "s p a c e", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"])(
    "Import module names with invalid lua identifier characters (%p)",
    name => {
        const code = `
            import { foo } from "${name}";`;

        const lua = `
            setmetatable(package.loaded, {__index = function() return {foo = "bar"} end})
            ${util.transpileString(code)}
            return foo;`;

        expect(util.executeLua(lua)).toBe("bar");
    },
);
