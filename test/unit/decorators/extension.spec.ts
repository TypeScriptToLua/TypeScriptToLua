import * as TSTLErrors from "../../../src/TSTLErrors";
import * as util from "../../util";

test.each(["extension", "metaExtension"])("Class extends extension (%p)", extensionType => {
    const code = `
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        class C extends B {}
    `;
    expect(() => util.transpileString(code)).toThrowExactError(TSTLErrors.InvalidExtendsExtension(util.nodeStub));
});

test.each(["extension", "metaExtension"])("Class construct extension (%p)", extensionType => {
    const code = `
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        const b = new B();
    `;
    expect(() => util.transpileString(code)).toThrowExactError(
        TSTLErrors.InvalidNewExpressionOnExtension(util.nodeStub)
    );
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;
    `.expectToHaveDiagnosticOfError(TSTLErrors.InvalidInstanceOfExtension(util.nodeStub));
});
