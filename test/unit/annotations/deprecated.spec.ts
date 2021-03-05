import { annotationDeprecated, annotationRemoved } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test.each(["extension", "metaExtension"])("extension removed", extensionType => {
    util.testModule`
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("phantom removed", () => {
    util.testModule`
        /** @phantom **/
        namespace A {
            function nsMember() {}
        }
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("pureAbstract removed", () => {
    util.testModule`
        /** @pureAbstract */
        declare class ClassA {}
        class ClassB extends ClassA {}
    `.expectDiagnosticsToMatchSnapshot([annotationRemoved.code]);
});

test("forRange deprecation", () => {
    util.testModule`
        /** @forRange */
        declare function forRange(start: number, limit: number, step?: number): number[];
        for (const i of forRange(1, 10)) {}
    `.expectDiagnosticsToMatchSnapshot([annotationDeprecated.code]);
});
