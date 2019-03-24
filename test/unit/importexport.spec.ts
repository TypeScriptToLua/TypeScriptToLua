import * as util from "../util";
import { TSTLErrors } from "../../src/TSTLErrors";
import { TranspileError } from "../../src/TranspileError";

test.each([
    "export { default } from '...'",
    "export { x as default } from '...';",
    "export { default as x } from '...';",
])("Export default keyword disallowed (%p)", exportStatement => {
    const expectedTest = TSTLErrors.UnsupportedDefaultExport(undefined).message;
    expect(() => util.transpileString(exportStatement)).toThrowExactError(
        new TranspileError(expectedTest),
    );
});
