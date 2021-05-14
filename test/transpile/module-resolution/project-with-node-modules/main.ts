import "lua-global-with-decls";
import "lua-global-with-decls/baz";

import "lua-global-without-decls";
import "lua-global-without-decls/baz";

import * as moduleWithDeclarations from "lua-module-with-decls";
import * as moduleWithDeclarationsBaz from "lua-module-with-decls/baz";

import * as moduleWithoutDeclarations from "lua-module-without-decls";
import * as moduleWithoutDeclarationsBaz from "lua-module-without-decls/baz";

import * as moduleWithDependency from "lua-module-with-dependency";

export const globalWithDeclarationsResults = {
    foo: fooGlobal(),
    bar: barGlobal("global with declarations!"),
    baz: bazGlobal(),
};

export const globalWithoutDeclarationsResults = {
    foo: fooGlobalWithoutDecls(),
    bar: barGlobalWithoutDecls("global without declarations!"),
    baz: bazGlobalWithoutDecls(),
};

export const moduleWithDeclarationsResults = {
    foo: moduleWithDeclarations.foo(),
    bar: moduleWithDeclarations.bar("module with declarations!"),
    baz: moduleWithDeclarationsBaz.baz(),
};

export const moduleWithoutDeclarationsResults = {
    foo: moduleWithoutDeclarations.foo(),
    bar: moduleWithoutDeclarations.bar("module without declarations!"),
    baz: moduleWithoutDeclarationsBaz.baz(),
};

export const moduleWithDependencyResult = moduleWithDependency.callDependency();
