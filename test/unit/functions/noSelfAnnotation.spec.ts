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
