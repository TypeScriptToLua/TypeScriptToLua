import { annotationDeprecated } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test.each(["extension", "metaExtension"])("extension deprecation", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code]);
});

test("phantom deprecation", () => {
    util.testModule`
        /** @phantom **/
        namespace A {
            function nsMember() {}
        }
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code]);
});

test("pureAbstract deprecation", () => {
    util.testModule`
        /** @pureAbstract */
        declare class ClassA {}
        class ClassB extends ClassA {}    
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code]);
});
