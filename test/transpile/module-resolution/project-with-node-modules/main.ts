import "lua-global-with-decls";
import "lua-global-with-decls/baz";

import "lua-global-without-decls";
import "lua-global-without-decls/baz";

import * as moduleWithDeclarations from "lua-module-with-decls";
import * as moduleWithDeclarationsBaz from "lua-module-with-decls/baz";

import * as moduleWithoutDeclarations from "lua-module-without-decls";
import * as moduleWithoutDeclarationsBaz from "lua-module-without-decls/baz";

import * as moduleWithDependency from "lua-module-with-dependency";

export const testResult = [
    fooGlobal(),
    barGlobal("global with declarations!"),
    bazGlobal(),

    fooGlobalWithoutDecls(),
    barGlobalWithoutDecls("global without declarations!"),
    bazGlobalWithoutDecls(),

    moduleWithDeclarations.foo(),
    moduleWithDeclarations.bar("module with declarations!"),
    moduleWithDeclarationsBaz.baz(),

    moduleWithoutDeclarations.foo(),
    moduleWithoutDeclarations.bar("module without declarations!"),
    moduleWithoutDeclarationsBaz.baz(),

    moduleWithDependency.callDependency()
];

export function sup() {
    return 3;
}