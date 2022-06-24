import * as util from "../../util";

const methodHolders = ["class", "interface"];

test("@noSelf on declared function removes context argument", () => {
    util.testModule`
        /** @noSelf */
        declare function myFunction(): void;
        myFunction();
    `.expectLuaToMatchSnapshot();
});

test.each(methodHolders)("@noSelf on method inside %s declaration removes context argument", holderType => {
    util.testModule`
        declare ${holderType} MethodHolder {
            /** @noSelf */
            myMethod(): void;
        }
        declare const holder: MethodHolder;
        holder.myMethod();
    `.expectLuaToMatchSnapshot();
});

test.each(methodHolders)("@noSelf on parent %s declaration removes context argument", holderType => {
    util.testModule`
        /** @noSelf */
        declare ${holderType} MethodHolder {
            myMethod(): void;
        }
        declare const holder: MethodHolder;
        holder.myMethod();
    `.expectLuaToMatchSnapshot();
});

test("@noSelf on method inside namespace declaration removes context argument", () => {
    util.testModule`
        declare namespace MyNamespace {
            /** @noSelf */
            export function myMethod(): void;
        }
        MyNamespace.myMethod();
    `.expectLuaToMatchSnapshot();
});

test("@noSelf on parent namespace declaration removes context argument", () => {
    util.testModule`
        /** @noSelf */
        declare namespace MyNamespace {
            export function myMethod(): void;
        }
        MyNamespace.myMethod();
    `.expectLuaToMatchSnapshot();
});

// additional coverage for https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1292
test("explicit this parameter respected over @noSelf", () => {
    util.testModule`
        /** @noSelfInFile */
        function foo(this: unknown, arg: any) {
            return {self: this, arg};
        }
        export const result = foo(1);
    `.expectToMatchJsResult();
});
