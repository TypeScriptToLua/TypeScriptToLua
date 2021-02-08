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

test("forRange deprecation", () => {
    util.testModule`
        /** @forRange */
        declare function forRange(start: number, limit: number, step?: number): number[];
        for (const i of forRange(1, 10)) {}
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code]);
});
