import {
    extensionCannotConstruct,
    extensionCannotExtend,
    extensionInvalidInstanceOf,
} from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test.each(["extension", "metaExtension"])("Class extends extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        class C extends B {}
    `.expectDiagnosticsToMatchSnapshot([extensionCannotExtend.code]);
});

test.each(["extension", "metaExtension"])("Class construct extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        const b = new B();
    `.expectDiagnosticsToMatchSnapshot([extensionCannotConstruct.code]);
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;
    `.expectDiagnosticsToMatchSnapshot([extensionInvalidInstanceOf.code]);
});
