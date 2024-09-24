# Changelog

## 1.27.0

- Upgraded TypeScript to 5.6.2
- Added support for `Math.trunc` (see [Math.trunc()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc))
- Fixed a runtime error when disposing a disposable class
- Fixed the wrong `this` value being passed when using `?.` to call a `super` method
- Fixed a bug causing exported `/** @compileMembersOnly */` enums to break
- Fixed a bug in `Array.from` when calling it with a non-array iterable
- Fixed an incorrect diagnostic being shown for `await using` code
- Fixed a bug causing not all getters/setters to be transpiled

## 1.26.0

- Upgraded TypeScript to 5.5.2
- Added support for the new proposed ECMAScript Set methods in ESNext: `intersection`, `union`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`. For more info see [the TypeScript release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/#support-for-new-ecmascript-set-methods).
- Fixed a bug causing bundled code to be executed twice in some edge cases.
- Fixed a bug causing errors when using lualib in an environment without coroutines.

## 1.25.0

- Upgraded TypeScript to 5.4.2
- Added support for new TypeScript 5.4 features `Map.groupBy` and `Object.groupBy`
- Fixed a bug causing files to not be emitted at the correct output path
- Fixed a bug causing `@customname` to not work together with `@noSelf`
- Fixed a bug causing extended tsconfigs to not be correctly read when using watch mode

## 1.24.0

- Optimized promises and async/await to better handle long chains of promises, like for example using await in a loop
- Fixed a bug causing errors when accessing `super` properties

## 1.23.0

- Upgraded TypeScript to 5.3.3

## 1.22.0

- Added support for `Number.isInteger(n)`
- Added support for `afterEmit` plugin hook that can be used to post-process lua files after (possibly incremental) builds
- Fixed a bug causing `@noSelfInFile` sometimes to be ignored

## 1.21.0

- Added support for `continue` for Lua 5.0, 5.1 and universal targets.
- Added support for the new `/** @customName myCustomName **/` decorator, which allows renaming of variables and identifiers.
  - This is useful to get around names that are reserved keywords in TypeScript, but are used in Lua API
- Fixed a bug that caused super calls in static methods to throw an error

## 1.20.0

- Added support for `Number.parseInt` and `Number.parseFloat` (mapped to same implementation as global `parseInt` and `parseFloat`)
- Added implementation for multiple `Number` constants like `Number.EPSILON`
- Added support for `Array.at`
- Fixed a bug when throwing an error object in a Lua environment without `debug` module
- Fixed a bug causing files not to be found when returning an absolute path from a `moduleResolution` plugin

## 1.19.0

- Added support for the new TypeScript 5.2 `using` keyword for explicit resource management. See the [TypeScript release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/#using-declarations-and-explicit-resource-management) for more information.
- Added support for the newly introduced 'copying array methods' `toReversed`, `toSorted`, `toSpliced` and `with`. These were also introduced in TypeScript 5.2, see [their release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/#copying-array-methods) for more information.

## 1.18.0

- Upgraded TypeScript to 5.2.2
- The `noResolvePaths` option now accepts glob paths (for example, 'mydir/hello\*' to not resolve any files in mydir starting with hello).
  - This also allows disabling module resolution completely by providing a '\*\*' pattern in your tsconfig.json `noResolvePaths`.

## 1.17.0

- Added the `moduleResolution` plugin, allowing you to provide custom module resolution logic. See [the docs](https://typescripttolua.github.io/docs/api/plugins#moduleresolution) for more info.
- Added `isEmpty` to `LuaTable`, `LuaMap` and `LuaSet` (and their read-only counterparts). This simply to `next(tbl) == nil`, allowing for a simple check to see if a table is empty or not.
- Fixed a bug with synthetic nodes (e.g. created by custom TypeScript transformers) throwing an exception.
- Fixed unnecessary extra unpacking of tables
- Fixed some bugs with new decorators

## 1.16.0

- Upgraded TypeScript to 5.1.3.
- Added support for [TypeScript 5.0 decorators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators).
  - Old-style decorators will still work as long as you have `experimentalDecorators` configured, otherwise the new standard is used.
- Added support for [class static initialization blocks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks).
- Fixed a bug causing the `tstl` object in tsconfig.json not to be properly extended when extending a tsconfig from node_modules.

## 1.15.0

- Using `extends` in tsconfig.json now also correctly merges settings in the `tstl` block (shallow merge).
- Now avoiding assigning default parameter values if the default value is `nil` (`null` or `undefined`).
- Fixed a bug where indexing a `LuaMultiReturn` value with [0] would still return everything.
- Fixed a bug with nested namespaces causing unexpected nil indexing errors.

## 1.14.0

- **[Breaking]** Upgraded TypeScript to 5.0.
- Added support for `Number.toFixed`.
- Added support for spread expressions with `LuaPairsIterable` and `LuaPairsKeysIterable`.
- Fixed a bug breaking module resolution when using a custom file extension.
- Fixed various exceptions that could happen when trying to translate invalid TS.

## 1.13.0

- Fixed alternate file extensions (other than .lua, if configured) breaking module resolution and emitted require statements.
- Added experimental support for `"luaLibImport": "require-minimal"` configuration option. This will output a lualib bundle containing only the lualib functions used by your code. This might not work if you are including external tstl-generated Lua, for example from a npm package.
- Added support for the "exports" field in package.json.
- Fixed some exceptions resulting from invalid language-extensions use.
- Fixed an exception when using compound assignment (like `+=`) with array length.

## 1.12.0

- Reworked how tstl detects and rewrites `require` statements during dependency resolution. This should reduce the amount of false-positive matches of require statements: require statements in string literals or comments should no longer be detected by tstl. This means require statements in string literals or comments can survive the transpiler without causing a 'could not resolve lua sources' error or getting rewritten into nonsense.
- Now using `math.mod` for Lua 5.0 modulo operations.

## 1.11.0

- **[Breaking]** Upgraded TypeScript to 4.9.
- `--tstlVerbose` now prints more resolver output when failing to resolve Lua sources.
- Fixed a bug breaking default exported classes with unicode names
- Relaxed conditions for the always-true warning to false positives.

## 1.10.0

- **[Breaking]** Upgraded TypeScript to 4.8.
- **[Breaking]** Changed how language-extensions are distributed, you should now put `"types": ["@typescript-to-lua/language-extensions"]` in your tsconfig.json (instead of "typescript-to-lua/...").
- Added support for **Lua 5.0**, thanks for the effort @YoRyan!
- Added support for TypeScript 4.7 [instantiation expressions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#instantiation-expressions).
- Fixed a bug causing some `require` uses not being recognized my module resolution, leading to missing files in the output.

## 1.9.0

- Added a warning when trying to use a type in a condition that can never be false in Lua, such as numbers or strings. (Only when `strictNullChecks` is enabled.)
- Fixed some missing and misplaced errors when trying to reference LuaTable/LuaMap/LuaSet functions without calling them.
- Fixed a bug in the `get()` type of `ReadOnlyLuaMap`. It is now typed the same as `LuaMap`, i.e. it can return `undefined`.
- Fixed an issue in bundling that could sometimes lead to invalid bundle entry requires.
- Added a warning when using `paths` without specifying `baseUrl`.
- Fixed exception while checking for standard library types.

## 1.8.0

- Added support for the [tsconfig.json paths](https://www.typescriptlang.org/tsconfig#paths) configuration option.
- Fixed spreading lua iterables & iterators translating to incorrect lua.
  - You can now write things like `[...pairs(obj)]`.
- Fixed a bug in module resolution resolving the wrong lua files when having the same file names in nested directories.
- Fixed a bug causing temporary variables for nested destructuring in loop variables to be outside the loop, instead of inside.
- Fixed import expressions not actually requiring their import.
- Fixed `super` calls not being source-mapped correctly.

## 1.7.0

- Added support for `LuaMap` and `LuaSet` language extensions that translate to very low level Lua table operations. See [our docs](https://typescripttolua.github.io/docs/advanced/language-extensions/#luamap-and-luaset) for more information.
- Big performance improvements, speeding up TSTL translation by 2-3x. Thanks @GlassBricks!
- Reduced the use of temorary variables.
- Moved tsconfig-schema into main TypeScriptToLua repository.
- Added support for array options in tstl CLI.
- Fixed bug where promise `then` was not correctly forwarding the result value to chained promises.
- Fixed a bug causing false positive errors from jsdoc documentation comments.
- Fixed various calling context bugs.

## 1.6.0

- **[Breaking]** Upgraded TypeScript to 4.7
- Fixed a bug where EmitOptions plugins were ignored
- Fixed a bug where sometimes function calls (like those to a custom jsx factory) would have a context argument even though `noImplicitSelf` was specified.
- Fixed a bug where sometimes `noImplicitSelf` was ignored because of incorrect file path separators.
- Fixed lualib_bundle files not correctly being included from node_module packages.
- Fixed compound assignment operators (e.g. ??= or ||=) not correctly updating the lhs if used as expression instead of statement.

## 1.5.0

- Added support for `Array.from` and `Array.of`
- Added support for `beforeEmit` hook to plugins that runs after tstl is totally done, but before emitting the result.
  - For more info about plugin hooks, see: https://typescripttolua.github.io/docs/api/plugins
- Added support for import expressions (`import("./module").then(m => m.foo());`)
- Added tsconfig setting `lua51AllowTryCatchInAsyncAwait` to disable restrictions on try/catch in combination with async/await in 5.1 (default: false)
- Added tsconfig setting `noImplicitGlobalVariables` to disable tstl making variables global in non-module files.
- Various lualib optimizations
- JSDoc comments from input TS are now also part of output Lua as LDoc comments.
  - Can be disabled with `removeComments` tsconfig setting.
- Rewrote how try/catch works in async functions, fixing many bugs.
- Fixed a bug where methods with non-null expressions (i.e. `obj.method!()`) would not pass the correct self parameter, causing runtime errors.
- Fixed a bug where symlinked node_modules (for example when using `npm link`) were not recognized as external dependencies by module resolution.
- Fixed a bug with sourcemap traceback leading to invalid lua
- Improved sourcemap traceback interaction with `loadstring`

## 1.4.0

- Upgraded to TypeScript 4.6
- Added two event hooks to TSTL plugins: `beforeTransform` and `afterPrint`
  - These allow you to run plugin code at specific points in the transpilation process.
- Lualib polyfills are now modules required into locals, instead of global functions
  - This change also removes the `"always"` option for the `"lualibImport"` tsconfig key.
- Added support for `Math.sign`
- Switched to `^` instead of `math.pow`, the latter was deprecated in 5.3
- Added an error when using `null` or `undefined` in tuples, as that is undefined behavior in the Lua spec and causes unexpected behavior
- Added tsconfig setting `extension`, allowing to specify a different output file extension
- Fixed multiple issues with optional chaining and lualib/language extensions
- Fixed issue assigning function with properties to variable declarations
- Fixed multiple issues with preceding statements in class constructors
- Fixed external code module resolution exploding into a stack overflow in complicated module hierarchies
- Fixed a `function.apply(context)` breaking the transpiler if called with only one parameter
- Fixed preceding statements in ternary conditionals (`x ? y : z`) leading to incorrect code

## 1.3.0

- Added `LuaPairsIterable` language extension to mark objects as iterable with Lua's `pairs`.
- Added support for properties on functions.
- Unicode is no longer escaped and used as-is for `"luaTarget": "JIT"`.
- Fixed some bugs related to destructuring in loops and function parameters.
- Fixed incorrect global being generated for some `try` statements.
- Fixed some incorrect behavior for `??` and `? :` when generic types were involved.
- Added missing `...` optimization in cases where casts or parentheses are used.
- Fixed a bug for `Promise` when resolving with another Promise. This also fixes some unexpected behavior with `async` which is built with Promises.
- Fixed `async` functions not aborting after returning from a `catch` block.

## 1.2.0

- Upgraded to TypeScript 4.5.x.
- Improved general output formatting.
- Added support for more complicated (nested) destructuring patterns, also fixing an exception they caused before.
- Fixed incorrect interactions between standard library functionality and optional chaining, e.g. `myArray?.forEach()`.
- Fixed rejected promises sometimes not getting the correct rejection reason.
- Fixed some `delete` behavior that was different in Lua compared to JS.
- Fixed a bug causing exported classes to lose their decorators.
- Fixed plugins checking for ts-node from the wrong location (tsconfig directory), plugins will now check for ts-node relative to the tstl directory.

Under the hood:

- We can now transform using preceding statements, allowing all kinds of optimizations and improvements to output Lua.
- Updated various language constructs to use preceding statements instead of inline immediately-invoked functions.

## 1.1.0

- **[Breaking]** We now use TypeScript's JSX transformer instead of maintaining our own. As a result, `React.createElement` now requires a self parameter, so remove `@noSelf`, `this: void` if necessary.
- **[Breaking(-ish)]** Due to limitations in 5.1, try/catch can no longer be used in async or generator functions when targetting Lua 5.1. This was already broken but now tstl will explicitly give an error if you try.
- Added support for the `switch` statement in all versions! (Before they were not supported in 5.1 and universal).
- Added support for `string.prototype.replaceAll` and improved `string.prototype.replace` implementation.
- Added `noResolvePaths` tsconfig option to disable module resolution for environment-provided modules.
- Implemented support for void expressions, i.e `void(0)` or `void(ignoreThisReturnValue())`.
- Upgraded TypeScript to 4.4.4 and made it a peer dependency to hopefully avoid plugin issues due to mismatching TypeScript versions.
- The `$vararg` language extension can be used to access CLI arguments, now also in bundles.
- Fixed a bug regarding `baseUrl` and relative imports.
- Fixed `sourceMapTraceback: true` not working correctly for bundles.
- Fixed an issue regarding hoisting in switch case clauses.
- Added missing function context validation cases for object literals.
- Fixed a problem where awaiting rejected promises in try/catch would give the wrong result.
- Fixed an issue where chained `.then` calls on already-resolved or already-rejected promises would cause some callbacks to not fire while they should.
- Fixed source file paths in source maps being absolute, they are now relative again.

## 1.0.0

- **[Breaking]** `/* @tupleReturn */` has been removed and will no longer have any effect. You will get an error if you try ot use it or if you use declarations that use it.
- Added support for the `Promise` class.
- Added support for `async` and `await` using coroutines.
- Module resolution now also correctly resolves `<directory>/init.lua` files for `require("<directory>")`.
- Fixed an error not being thrown when trying to call a method in an optional chain that does not exist. (If the method itself is not optional)
- Fixed a bug where parentheses could break the context parameter being resolved for a method.
- Fixed a bug where context parameters in object literal methods were not inferred correctly.
- Fixed a bug with sourceMapTraceback.
- Fixed TS emitting empty JSON files if you use JSON source files.

## 0.42.0

- **[Breaking]** The `/** @tupleReturn */` is now deprecated, and will be removed next release. If you are still using it, please upgrade to the [LuaMultiReturn language extension](https://typescripttolua.github.io/docs/advanced/language-extensions#luamultireturn-type).
- Added support for JSX, see [documentation](https://typescripttolua.github.io/docs/jsx) for more information.
- Added support for the `baseUrl` configuration key for module resolution.

A large list of bugfixes:

- Fixed an exception causing tstl to exit when trying to assign to an optional chain.
- Fixed resolved files appearing duplicated in lua bundles.
- Fixed a problem resolving external Lua files in nested directories.
- Fixed `@noResolution` in library packages losing their NoResolution tag, causing attempts to resolve them for package users.
- Fixed a bug in the bundling code causing modules not to be cached if they return nil (which happens if they are not a module)
- Fixed module resolution trying to incorrectly resolve and rewrite things like `myObject.require()` or `my_custom_require()`.
- Fixed lualib bundle not being included in the output if external packages use it, but the client code does not.

## 0.41.0

- Added support for [optional chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html) `a?.b`, `a?.[b]` and `a?.()`.
- Added an error when trying to bundle a library (`"buildmode": "library"`) project.
- Added `--tstlVerbose` CLI flag to help with diagnosing problems.
- Fixed a bug where vararg (`...`) was not correctly optimized.
- Fixed .tsx files not correctly being resolved.
- Fixed a bug where files were emitted to the wrong location if no `outDir` was specified.

## 0.40.0

- Added support for using external Lua code in your project. This means you can create and install node_modules packages containing Lua code. It also lets you include Lua source files as part of your source files. Used Lua will automatically be added to your output. For more information, see the [External Lua Code](https://typescripttolua.github.io/docs/external-lua-code) page in the docs.
- **[Breaking]** Removed support for deprecated annotations that have been replaced with language extensions: `/** @luaIterator */`, `/** @vararg */`, `/** @luatable */` and `/** forRange */`. If you were still using these, see [the docs](https://typescripttolua.github.io/docs/advanced/compiler-annotations) for instructions how to upgrade.
- Added support for `array.entries()`.
- Added support for `LuaTable.has(key)` and `LuaTable.delete(key)` to the language extensions. See [docs](https://typescripttolua.github.io/docs/advanced/language-extensions#lua-table-types) for more info.
- Made language extension types more strict, disallowing `null` and `undefined` in some places where they would cause problems in Lua.

- Fixed an issue where using TypeScript transformer plugins would cause invalid namespace and module code, as well as breaking hoisting.
- Fixed invalid switch statement output when the `default` clause was not the last clause in the switch.
- Fixed missing LuaLib dependency when using `string.split`.
- Fixed **lots** of bundling bugs and issues, also added the TypeScriptToLua header to the top of the bundle unless _noHeader_ is specified.

Under the hood:

- Various improvements to testing infrastructure for testing (virtual) projects with multiple files.

## 0.39.0

- **[Breaking]** Removed support for `@phantom`, `@metaExtension`, `@extension`, `@pureAbstract` compiler annotations. As of this version **these will no longer function!** For help upgrading your code see [the deprecated annotation docs](https://typescripttolua.github.io/docs/advanced/compiler-annotations#deprecated).
- Added official support for **Lua 5.4**.
- Added the `LuaTable<TKey, TValue>` language extension. This allows the use of barebones Lua tables for key-value storage, without suffering from JS's forced string indexes. For more information see [the LuaTable docs](https://typescripttolua.github.io/docs/advanced/language-extensions#lua-table-types).
- Deprecated `@vararg`. Instead, tstl will figure out itself when use of the Lua ellipsis token (`...`) is appropriate. Also language extension `$vararg` was added to force use of the ellipsis token. See [the docs](https://typescripttolua.github.io/docs/advanced/language-extensions#vararg-constant) for more information.
- Added `trailingComments` and `leadingComments` fields to statements in the Lua AST. These can be modified by plugins to emit comments in the output lua. For an example see [the add-comments test plugin](https://github.com/TypeScriptToLua/TypeScriptToLua/blob/master/test/transpile/plugins/add-comments.ts).

Under the hood:

- Tests are now run on a WebAssembly-compiled version of official Lua releases. This means we can now execute test Lua on all Lua versions (except LuaJIT). Shoutout to [Fengari](https://github.com/fengari-lua/fengari) for serving us well for a long time.

## 0.38.0

- **[Breaking]** Renamed `MultiReturn` to `LuaMultiReturn` to be consistent with other language extensions all starting with Lua-.
- Fixed various bugs and issues related to `LuaMultiReturn`, including its value not correctly being wrapped in some cases.
- Added support for indexing `LuaMultiReturn` values without destructing.
- Added language extensions to allow translation directly to (overwritten) Lua operators like `+`,`-`,`..`. For more information see [Operator Map Types](https://typescripttolua.github.io/docs/advanced/language-extensions#operator-map-types).
- Added language extension `$range()`. This function can be used to create numeric lua loops, for example `for (const i of $range(1, 10)) {` translates to `for i=1,10 do`. For more information see [\$range Iterator Function](https://typescripttolua.github.io/docs/advanced/language-extensions#range-iterator-function).
- Added support for `Array.isArray`, formalizing tstl's isArray convention (**note:** Due to `[]` and `{}` being the same in Lua, `{}` - without any keys - is considered an array too.)
- Added support for `string.prototype.includes`.
- Added support for enum merging.
- Fixed missing lualib dependency in `string.prototype.split`.
- Added a not-supported diagnostic for not-yet-implemented optional chaining (`a?.b`).
- Moved remaining legacy tests to modern testing utils, removing the legacy testing code.

## 0.37.0

- **[Important]** Deprecated the @phantom, @extension, @metaExtension and @pureAbstract annotations. This is done because there are good alternatives in regular TypeScript, and this helps us simplify the transpiler. For now, using these annotations will result in a warning but they will still continue to function. A few months from now these annotations will no longer be supported, so upgrade if possible. See [Compiler Annotations](https://typescripttolua.github.io/docs/advanced/compiler-annotations) for more info.
- Added the `MultiReturn<>` type and `$multi()` helper function as the first language extensions. This is to provide a type-safe alternative to the `@tupleReturn` annotation. For more information see [the new Language Extensions page](https://typescripttolua.github.io/docs/advanced/language-extensions) on the docs website.
- Removed some class transformation code from the transpiler that was no longer used.
- Fixed a bug causing object spread to malfunction in some cases ([#898](https://github.com/TypeScriptToLua/TypeScriptToLua/issues/898)).
- Omitted `tostring` for parameters of template literals (`` `${}` ``) that are already known strings.
- Fixed a bug causing incorrect Lua syntax to be generated in some cases ([#944](https://github.com/TypeScriptToLua/TypeScriptToLua/issues/944)).

## 0.36.0

- Upgraded to TypeScript 4.0.
- Added support for `parseInt` and `parseFloat`.
- Added support for `yield*` [for generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*).
- Added support for [method, property and accessor decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).
- Shebangs at the top of a .ts file will now be preserved.
- Fixed an issue causing declarations referencing their own identifier to cause a nil reference error.

## 0.35.0

- In preparation for some new features, some public APIs have been changed:
  - High-level APIs that read input files from the file system (`transpileFiles` and `transpileProject`) now write transpiled files by default. This behavior can be changed by providing a `writeFile` callback, similarly to TypeScript's `program.emit`.
  - `transpile` and `emitTranspiledFiles` functions have been replaced with the `Transpiler` class. See [documentation](https://typescripttolua.github.io/docs/api/overview#low-level-api) for usage examples.
- Fixed `declarationDir` option not being respected.
- `Function.length` is supported now.
- String iteration is now supported.
- Exposed `parseConfigFileWithSystem` to parse _tsconfig.json_ files as part of the tstl API.
- Fixed `string.replace` incorrectly escaping some `replaceValue` characters (`().+-*?[^$`)
- Fixed several other string operations behaving differently from JS (mostly regarding indices out of bounds and NaN arguments).
- Fixed a bug where the length argument of `String.prototype.substr` was evaluated twice.
- Fixed some missing dependencies in LuaLib classes (Map, Set, WeakMap, WeakSet)

## 0.34.0

- Added new `"luaTarget"` option value - `"universal"`. Choosing this target makes TypeScriptToLua generate code compatible with all supported Lua targets.

  - **BREAKING CHANGE:** This is a new default target. If you have been depending on LuaJIT being chosen implicitly, you now have to enable it explicitly with `"luaTarget": "JIT"` in the `tsconfig.json` file.

- TypeScript has been updated to **3.9**. See [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html) for details. This update includes some fixes specific to our API usage:

  - Importing a non-module using `import "./file"` produced a TS2307 error [#35973](https://github.com/microsoft/TypeScript/issues/35973)
  - TypeScript now tries to find a call signature even in presence of type errors [#36665](https://github.com/microsoft/TypeScript/pull/36665):
    ```ts
    function foo(this: void, x: string) {}
    foo(1);
    ```
    ```lua
    -- Before: with 3.8 (this: void ignored due to signature mismatch)
    foo(nil, 1)
    -- Now: with 3.9
    foo(1)
    ```

- Reduced memory consumption and optimized performance of generators and iterators
- Fixed generator syntax being ignored on methods (`*foo() {}`) and function expressions (`function*() {}`)
- Fixed iteration over generators stopping at first yielded `nil` value
- Fixed `Array.prototype.join` throwing an error when array contains anything other than strings and numbers
- Fixed extending a class not keeping `toString` implementation from a super class

- Fixed issue where CLI arguments were incorrectly removed.
- Fixed issue where class accessors threw an error due to a missing dependency.

Under the hood:

- Upgraded to Prettier 2.0

## 0.33.0

- Added support for nullish coalescing `A ?? B`.
- Annotation `/** @noSelf */` now also works directly on function declarations, not only on classes/interfaces.
- Fixed incorrect file paths in source maps.
- Fixed unknown node kind throwing an error instead of diagnostic.
- Fixed string index with side-effects being evaluated twice.
- Added check for node.js version when running tstl.
- Fixed some issues with reflection class names.

- Fixed incorrectly escaped variable names.

Under the hood:

- Switched from TSLint to ESLint.
- Added benchmarking capability for garbage collection.

## 0.32.0

- **Deprecated:** The `noHoisting` option has been removed, hoisting will always be done.

- TypeScript has been updated to 3.8. See [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html) for details.

- Fixed class accessors not working when base class is lacking type information (#725)

- Class extension code has been extracted to lualib

  ```ts
  class A {}
  class B extends A {}
  ```

  ```diff
  A = __TS__Class()
  B = __TS__Class()
  -B.____super = A
  -setmetatable(B, B.____super)
  -setmetatable(B.prototype, B.____super.prototype)
  +__TS__ClassExtends(A, B)
  ```

- Generated code for class accessors is more dynamic now

  ```ts
  class A {
    get a() {
      return true;
    }
  }
  ```

  ```diff
  A = __TS__Class()
  -A.prototype.____getters = {}
  -A.prototype.__index = __TS__Index(A.prototype)
  -function A.prototype.____getters.a(self)
  -  return true
  -end
  +__TS__SetDescriptor(
  +    A.prototype,
  +    "a",
  +    {
  +        get = function(self)
  +            return true
  +        end
  +    }
  +)
  ```

  This change simplifies our codebase and opens a path to object accessors implementation

- Errors reported during transpilation now are created as TypeScript diagnostics instead of being thrown as JavaScript errors. This makes TypeScriptToLua always try to generate valid code (even in presence of errors) and allows multiple errors to be reported in a single file:

  ```ts
  for (var x in []) {
  }
  ```

  ```shell
  $ tstl file.ts
  file.ts:1:1 - error TSTL: Iterating over arrays with 'for ... in' is not allowed.
  file.ts:1:6 - error TSTL: `var` declarations are not supported. Use `let` or `const` instead.

  $ cat file.lua
  for x in pairs({}) do
  end
  ```

- Added `tstl.luaPlugins` option, allowing to specify plugins in a `tsconfig.json` file:

  ```json
  {
    "tstl": {
      "luaPlugins": [{ "name": "./plugin.ts" }]
    }
  }
  ```

- Added support for all valid TS `for ... of` loop variable patterns.

- Fixed a bug where spread expressions in array literals were not correctly translated:

  ```diff
  - [1, ...[2, 3], 4] // --> { 1, 2, 4 }
  + [1, ...[2, 3], 4] // --> { 1, 2, 3, 4 }

  - ((...values) => values)(1, ...[2, 3], 4) // --> { 1, 2, 4 }
  + ((...values) => values)(1, ...[2, 3], 4) // --> { 1, 2, 3, 4 }
  ```

- Fixed Lua error when left hand side of `instanceof` was not a table type.

- Fixed `sourcemapTraceback` function returning a value different from the standard Lua result in 5.1.

- Fixed missing LuaLib dependency for Error LuaLib function.

- Fixed several issues with exported identifiers breaking `for ... in` loops and some default class code.

- Fixed overflowing numbers transforming to undefined Infinity, instead they are now transformed to `math.huge`.

## 0.31.0

- **Breaking:** The old annotation syntax (`/* !varArg */`) **no longer works**, the only currently supported syntax is:

  `/** @varArg */`.

- **Breaking:** Fixed some cases where variables were **incorrectly** not labeled `local`. The only variables that are implicitly put in the global context are _top-level variables in non-module files, without any imports or exports in their file_.

- Moved handling of parentheses out of the transformers and unified this logic in the printer. This might result in some more parentheses in the generated code, but also makes it more correct and fixes some related bugs.

- Added support for `array.includes`.

- Fixed a bug breaking global augmentation.

- Fixed hoisting breaking if there were synthetic nodes in the AST (i.e. when a TS transformer modified the AST).

## 0.30.0

- **Breaking:** We dropped support for `var` variables. If you still have any `var` variable declarations, please use `let` or `const` instead.
- **Breaking:** We now depend on Node.js >= 12.13.0
- Added support for string `trimLeft`, `trimRight`, `trimStart` and `trimEnd`.
- Added support for `console.error`, `console.warn` and `console.info` , they will all be transpiled to Lua's `print`.
- Avoided exporting anonymous identifiers.
- Fixed an issue when assigning to an already-exported variable.
- Math.atan2 will now be transpiled to the correct Lua atan2 (or atan for 5.3) method.
- Fixed various destructuring issues.
- Fixed incorrect error for intersection types containing built-ins (like `number` or `string`)
- Modules containing `import` or `export` will now always be recognized as module to match TypeScript's logic.
- Fixed `true` not being recognized as lua keyword.
- Fixed inaccuracies in switch case variable scoping.
- Fixed various problems with variables being global instead of local.

### Internal:

- Refactored transformation pipeline from one big LuaTransformer class to many small modules.
- Moved class construction methods from transformer to LuaLib.
- Upgraded dependencies.

## 0.29.0

- Added bundling support using options `luaBundle` and `luaBundleEntry` (so **not** TS's outFile). This will bundle all output files into one single bundle file, with _luaBundleEntry_ as entry point. For more information on these options see https://github.com/TypeScriptToLua/TypeScriptToLua/wiki#tstl-specific-options
- Added support for `Number.prototype.toString(radix)`.
- Fixed `array.flat()` not flattening empty arrays.
  **Note:** Due to language restrictions, flat will also flatten _objects_ without keys (or only undefined values) so be careful.
  For more info on this issue see https://github.com/TypeScriptToLua/TypeScriptToLua/pull/737
- Fixed runtime error when throwing non-string errors and `sourceMapTraceback`.

## 0.28.0

- We now have a `noImplicitSelf` option you can add to your tstl tsconfig.json. Default behavior is `false`. Setting this option to `true` will cause no 'self' arguments to be considered/generated in the project. Declarations will behave as if they have a `/** @noSelfInFile */` directive. This option is new and might cause correctness issues, use at your own risk and create an issue if you experience any issues.
- Regular `Error` objects can now be thrown, `throw` is no longer limited to only strings. Take care: printing/toString'ing the LuaLib error class might have different results for different Lua versions.
- Added LuaLib support for `array.reduceRight`.
- Added LuaLib support for `array.find`.

- Fixed an issue in test code causing some inconsistent behavior between JS <-> Lua to go unnoticed. Also fixed `array.splice` and `array.join` whose Lua versions behaved differently from the ECMAScript specification.
- Fixed array.reduce not behaving according to ECMAScript specification.
- Fixed order of operations issue with ternary conditional.

- Updated to TS 3.6.
- Moved from Travis+Appveyor to GitHub Actions!

## 0.27.0

- Added support for [array and object destructuring with rest](https://basarat.gitbooks.io/typescript/content/docs/destructuring.html#object-destructuring-with-rest).
- Changed Map and Set implementations to they preserve insertion order when iterated over, as specified by ECMAScript.

- Fixed an issue with [`/** @luaTable */`](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/Compiler-Directives#luaTable) variable names disappearing.
- Fixed for-in loops throwing an error when using a pre-defined variable.
- Fixed issue with initialization order of class properties.

- Simplified enum transformation code.

## 0.26.0

- Added support for [default exports and export equals statements](https://github.com/Microsoft/TypeScript/issues/7185#issuecomment-421632656).
- Added support for [object spread expressions](https://mariusschulz.com/blog/object-rest-and-spread-in-typescript).
- Added support for most common [destructuring assignments](https://basarat.gitbooks.io/typescript/content/docs/destructuring.html).
- Added support for omitted declarations in destructuring tuples. (i.e. `const [a,,c] = foo();`)

- `@noSelf` now only applies to members of the namespace with the directive, in case of namespace merging.
- Fixed issue with isNumerType causing enum members as array indices not to recieve the `+1`.
- Fixed string.indexOf failing in case the search string was a Lua string pattern.
- Fixed some crashes from recursive type constraints.

- Some simplification to the printing of expression statements.
- Added new testing util methods to improve the testing process.

## 0.25.0

- Added support for named function assignments, i.e. `const myFunc = function x(n) { ...; return x(n - 1); }`

- Made detection of string methods more robust.
- Fixed issue regarding readonly tuple detection.
- Fixed a nasty issue causing exponential complexity on chained properties/method expressions.
- Improved handling of constrained generic types related to string and array detection.

## 0.24.0

- Returns in try/catch statements now properly return from the current function.
- TypeScript's `globalThis` is now translated to lua's `_G`. Lualib functions were updated where relevant.

- Fixed issue where string/table literals were missing parentheses and caused lua syntax errors.
- Various improvements/refactorings across the codebase.
- Fixed syntax error in for...of loops with empty destructuring argument.
- Fixed issue with `do ... while` scope.
- Fixed a bug with [@combileMembersOnly](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/Compiler-Directives#compilemembersonly) where it would ignore anything before the enum name.

## 0.23.0

- Added support for OmittedExpression in array literals and array binding patterns.
- Added support for [tagged template literals](https://basarat.gitbooks.io/typescript/docs/template-strings.html#tagged-templates).
- Changed output lua formatting to be more debugger-friendly.
- Various improvements to source maps.

- Fixed an issue with the interaction of super calls and exported classes.
- Fixed `@noResolution` not working on named modules.
- Fixed namespace merging not working due to an earlier change.

- Some refactoring and plumbing for the website.

## 0.22.0

- Added the [@vararg](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/Compiler-Directives#vararg) directive.
- Added the [@forRange](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/Compiler-Directives#forRange) directive.
- Custom ts transformers can now be loaded from tsconfig.

- Fixed default tstl header incorrectly showing up above lualib functions.
- Some improvements to typeof expressions.

## 0.21.0

- Imports/exports that are ambient (declarations, types, interfaces, etc) or are not used in value positions no longer generate `require` statements.
- For ... of loops are now translated using `ipairs`.
- Added support for `array.reduce`.
- Added support for `import foo = bar.baz;` statements.

- Fixed some issues with binding pattern parameter default values.
- Fixed some issues with variable naming.
- Enabled prettier on the entire codebase.

## 0.20.0

- Added support for `string.repeat`, `string.padStart` and `string.padEnd`.
- Added automatic variable renaming for invalid Lua identifiers.
- Fixed `/** @tupleReturn */` not working for function types (i.e `myFunc: () => [number, number]`)
- Various improvements to source map output format.
- Various small code tweaks and improvements.

## 0.19.0

- **BREAKING CHANGE:** All tstl-specific options should now be inside the "tstl" section in tsconfig.json (see README.md). **Root-level options are no longer supported**.
- Added a compiler API to programmatically invoke TypeScriptToLua, and to modify or extend the default transpiler. More info on the [Compiler API wiki page](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/TypeScriptToLua-API).
- Added support for [class decorators](https://www.typescriptlang.org/docs/handbook/decorators.html#class-decorators).
- Added support for the [@luaTable directive](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki/Compiler-Directives#luatable) which will force a class to be transpiled as vanilla lua table.
- Added support for NaN, Infinity and related number functions.
- Added support for string.startsWith, string.endsWith and improved string.replace implementation.
- Added support for Symbol.hasInstance.

- Hoisting now also considers imports.
- Various improvements to iterators and arrays, they also work with the spread operator now.
- Fixed an issue with parameters that had `false` as default value.

## 0.18.0

- Added support for setting array length. Doing `array.length = x` will set the length of the array to `x` (or shorter, if the starting array was shorter!).
- Added the `.name` property to all transpiled classes, so `class.name` will contain the classname as string.
- Changed `class = class or {}` syntax to just be `class = {}`.
- Cleaned up printer output so it produces more human-readable code.

- Fixed bug with expression statements.
- Fixed incorrect inline sourcemap format.
- Fixed bug when merging an interface and module.
- Fixed a bug with inherited constructor super call ordering.

- Enabled strict tsconfig.

## 0.17.0

- We now support source maps in the [standard JS v3 format](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?hl=en_US&pli=1&pli=1). You can generate source maps with the `--sourceMap` CLI argument, or by adding `sourceMap: true` to your tsconfig. Inline source maps are also supported with `--inlineSourceMap` CLI/tsconfig parameter.
- Also added [tstl option](https://github.com/TypeScriptToLua/TypeScriptToLua/wiki#tstl-specific-options) `--sourceMapTraceback`, which will add an override to Lua's `debug.traceback()` to each file, so source maps will automatically be applied to Lua stacktraces (i.e. in errors).

- Made watch mode incremental.

- Added support for `Object.fromEntries`, `array.flat` and `array.flatMap`.

- **BREAKING CHANGE:** Directive `@tupleReturn` should now be specified **per overload**.

- Fixed a bug where rest parameters would not transpile correctly.
- Fixed an issue with escaped backticks.
- Various small fixes function inference and array detection.

- Changed testing framework to [jest](https://github.com/facebook/jest).

## 0.16.0

- **BREAKING CHANGE:** All functions now take a `self` parameter. This means that without further action calls to declaration functions might be given an extra argument.
  - To remove the self parameter from a single function add `this: void` to its declaration:
    `declare function foo(this: void, ...)`
  - To remove the self parameter from all methods or functions in a class/interface/namespace add `/** @noSelf */`:
    `/** @noSelf */ interface Foo {`
  - To remove the self parameter from all functions in a file, add `/** @noSelfInFile */` at the top.

---

- **BREAKING CHANGE:** Directive `/** @luaIterator */` should now be put on types instead of on the functions returning them.

---

- Fixed a bug breaking named class expressions.
- Fixed inconsistency between the meaning of `>>` and `>>>` in JS vs. Lua.
- Added `/** @noResolution */` directive to prevent path resolution on declared modules.
- It is now possible to put `/** @luaIterator */` on types extending `Array<T>`.
- Fixed issue with the moment static fields were initialized.
- Fixed issue where `undefined` as property name was not transpiled correctly.
- Various improvements to function/method self parameter inference.
- Tstl options can now be defined in their own `tstl` block in tsconfig.json. For example:

```
{
    "compilerOptions" : {}
    "tstl": {
        "luaTarget": "JIT"
    }
}
```

- Fixed issue when redeclaring TypeScript libraries/globals.
- Fixed exception resolving function signatures.
- Added support for automatically transpiling several `console` calls to their Lua equivalent:
  - `console.log(...)` -> `print(...)`
  - `console.assert(...)` -> `assert(...)`
  - `console.trace(...)` -> `print(debug.traceback(...))`
- Added support for `array.findIndex()`.
- Fixed `array.sort()` not working with a compare function.
- Added support for several common `Math.` functions and constants.
- Added support for several common string instance functions such as `upper()`.

## 0.15.2

- Several improvements to module path resolution.
- Removed header comment appearing in lualib.
- Several package config improvements.
- Static get/set accessors.

## 0.15.1

- Fixed array detection for unit and intersection types.
- Support for import without `from`.
- Added support for `WeakMap` and `WeakSet`.
- Added support for `Object.keys` and `Object.assign`.
- Added support for importing JSON files.
- Fixed bug with where loop variables were not properly scoped.
- Added support for ExportDeclarations

## 0.15.0

- Now written for TypeScript 3.3.x!
- Removed external CLI parser dependency and wrote our own `CommandLineParser.ts` to read CLI and tsconfig input.
- Added support for hoisting, can be disabled with the `noHoisting` option in CLI or tsconfig.
- Added support for generator functions.
- Reworked classes into a system more similar to JavaScript with prototype tables.
- Improved support for ObjectBindingPatterns.
- Added support for enums with identifier values.
- Added support for the binary comma operator.
- Added support for `string.concat`, `string.slice` and `string.charCodeAt`.
- Refactored LuaTranspiler.emitLuaLib to its own method so it can be called from external code.
- Improved function type inference.
- Fixed some bugs in for loops with expressions.
- Fixed a bug forwarding luaIterator functions.

## 0.14.0

- Reworked internal transpiler structure to be more suited for future extension.
- Reworked module and exports system.
- Added support for custom iterators.
- Improved formatting consistency.
- Errors are now reported with location `(line, column)` instead of `line: line, column: column`.
- Added back default lua header: `--[[ Generated with https://github.com/Perryvw/TypescriptToLua ]]`.
- Fixed some bugs with switches and breaks.
- Fixed several bugs with functions and context parameters.

## 0.13.0

- Reworked how functions are transpiled, see https://github.com/TypeScriptToLua/TypescriptToLua/wiki/Differences-Between-Functions-and-Methods
- Improved handling of types extending Array.
- Fixed several bugs with classes.
- Fixed issues with inherited accessors.

## 0.12.0

- Added detection of types extending Array.
- Added new JSDoc-style compiler directives, deprecated the old `!` decorators, see https://github.com/TypeScriptToLua/TypescriptToLua/wiki/Compiler-Directives
- Fixed bug with constructor default values.
- The Lualib is no longer included when not used.
- Fixed bug with unpack in LuaJIT.

## 0.11.0

- Fixed bug when throwing anything that was not a string. (@tomblind)
- Added support for object literal method declarations. (@tomblind)
- Fixed several issues with assignment operators (@tomblind)
- `else if` statements are now transpiled to Lua `elseif` instead of nested ifs statements. (@tomblind)
- Occurrences of const enum values are now directly replaced with their value in the Lua output. (@DoctorGester)
- Rethrowing is now possible from try/catch blocks (@tomblind)
- Destructing statements in LuaJit now use `unpack` instead of `table.unpack`
- Removed support for switch statements for versions <= 5.1.
- Refactored `for ... of` translation, it now uses numeric `for` loops instead of `ipairs` for performance reasons.

## 0.10.0

- Added support for NonNullExpression (`abc!` transforming the type from `abc | undefined` to `abc`)
- Added expression position to replacement binary expression to improve error messages.
- Fixed various issues with !TupleReturn (@tomblind)
- Added support for `array.reverse`, `array.shift`, `array.unshift`, `array.sort`. (@andreiradu)
- Added translation for `Object.hasOwnProperty()`. (@andreiradu)
- Added support for class expressions (@andreiradu)
- Fixed bug in detecting array types (@tomblind)
- Added public API functions and better webpack functionality.

## 0.9.0

- Fixed an issue where default parameter values were ignored in function declarations.
- Fixed a bug where `self` was undefined in function properties.
- Fixed a bug where addition of +1 to indices sometimes caused issues with operation order (thanks @brianhang)
- Fixed super calls having issues with their `self` instance. (thanks @hazzard993)
- Methods now also accept custom decorators (thanks @hazzard993)
- Improved support for `toString` calls (thanks @andreiradu)
- Added support for block expressions (thanks @andreiradu)

Thanks @tomblind for the following changes:

- Fixed a bug where recursive use of a function expression caused a nil error.
- Fixed syntax error when compiling variable declaration lists.
- Fixed an issue with assignment order in exported namespaces.
- Various fixes to `!TupleReturn` functions.
- Fixed an issue with declaration merging.

## 0.8.0

- Added experimental watch mode, use it with `tstl --watch`
- Refactored decorators
- Added `...` spread operator
- Added error when a lua keyword is used as variable name
- Added support for shorthand object literals (thanks @gakada)
- Added array.pop (thanks @andreiradu)
- Added `;` after lines to avoid ambiguous syntax (thanks @andreiradu)
- Fixed issue with tsconfig being overriden (thanks @Janne252)

## 0.7.0

- Lualib runtime library is now compiled from TypeScript using the transpiler when building!
  - Split up runtime library definition into individual files.
  - Added multiple inclusion modes using the tsconfig option `lubLibImport`, options are:
    - `require` : Requires the entire library if lualib features are used.
    - `always` : Always require the runtime library.
    - `inline` : Inline the library code for used features in the file.
    - `none` : Do not include the runtime library
- Added support for assigning expressions (`+=`, `&=`, `++`, etc) in other expressions (i.e. `lastIndex = i++` or `return a += b`) by transpiling them as immediately called anonymous functions.
- Unreachable code (after returns) is no longer transpiled, preventing a Lua syntax error.
- Fixed issue with destructing statements in Lua 5.1
- Fixed issue with escaped characters in strings.
- Fixed bug regarding changing an exported variable after its export.

## 0.6.0

- Reworked part of the class system to solve some issues.
- Reworked class tests from translation to functional.
- Fixed issue with Lua splice implementation.
- Added threaded test runner to use for faster testing (use with `npm run test-threaded`).
- Added support for string-valued enums.
- Added tsconfig values to target Lua 5.1 and 5.2.

## 0.5.0

- Added support for `**` operator.
- Added support for `~` operator.
- Improved handling of assignment binary operators (`+=`,`*=`,`&=`, etc).
- Rewrote `Map` and `Set` to implement the ES6 specification for [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) and [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).
- Added support for `baseUrl` in [tsconfig](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html).
- Added `bit32` bit operations for Lua 5.2.
- Fixed various little bugs.
- Added tslint rule to enforce use of `/** @override */` decorator.
- Improved tests.

## 0.4.0

- Added support for `typeof`
- Added support for `instanceof`
- Added support for [TypeScript overloads](https://www.typescriptlang.org/docs/handbook/functions.html#overloads)
