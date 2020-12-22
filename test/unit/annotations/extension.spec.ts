import {
    annotationDeprecated,
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
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code, extensionCannotExtend.code]);
});

test.each(["extension", "metaExtension"])("Class construct extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        const b = new B();
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code, extensionCannotConstruct.code]);
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code, extensionInvalidInstanceOf.code]);
});
