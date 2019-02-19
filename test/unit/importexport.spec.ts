import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
import { TSTLErrors } from "../../src/TSTLErrors";
import { TranspileError } from "../../src/TranspileError";

export class ImportExportTests
{
    @TestCase("export { default } from '...'")
    @TestCase("export { x as default } from '...';")
    @TestCase("export { default as x } from '...';")
    @Test("Export default keyword disallowed")
    public exportDefaultKeywordError(exportStatement: string): void {
        const expectedTest = TSTLErrors.UnsupportedDefaultExport(undefined).message;
        Expect(() => util.transpileString(exportStatement)).toThrowError(TranspileError, expectedTest);
    }
}
