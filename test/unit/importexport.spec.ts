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
