import * as util from "../../util";

test.each(["extension", "metaExtension"])("Class extends extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        class C extends B {}
    `.expectDiagnosticsToMatchSnapshot();
});

test.each(["extension", "metaExtension"])("Class construct extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        const b = new B();
    `.expectDiagnosticsToMatchSnapshot();
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;
    `.expectDiagnosticsToMatchSnapshot();
});
