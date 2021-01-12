import { optionalChainingNotSupported } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

test("Diagnostic optional chaining is not supported yet", () => {
    util.testFunction`
        let func = (value: number) => value != 0 ? {value} : undefined;
        return func(1)?.value;
    `.expectToHaveDiagnostics([optionalChainingNotSupported.code]);
});
