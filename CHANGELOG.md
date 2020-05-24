# Changelog

## Unreleased

- Added new `"luaTarget"` option value - `"universal"`. Choosing this target would make TypeScriptToLua generate code compatible with all supported Lua targets.
  - **BREAKING CHANGE:** This is a new default target. If you have been depending on LuaJIT being chosen implicitly, now you have to enable it explicitly with `"luaTarget": "JIT"` in the `tsconfig.json` file.

<!-- TODO: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html doesn't seem to work now -->

- TypeScript has been updated to 3.9. See [release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-3-9/) for details. This update includes some fixes specific to our API usage:

  - Importing a non-module using `import "./file"` produced a TS2307 error [#35973](https://github.com/microsoft/TypeScript/issues/35973)
  - TypeScript now tries to find a call signature even in presence of type errors (#36665)(https://github.com/microsoft/TypeScript/pull/36665):
    ```ts
    function foo(this: void, x: string) {}
    foo(1);
    ```
    ```lua
    -- 3.8
    foo(nil, 1)
    -- 3.9
    foo(1)
    ```

- Reduced memory consumption and optimized performance of generators and iterators

- Fixed generator syntax being ignored on methods (`*foo() {}`) and function expressions (`function*() {}`)

- Fixed iteration over generators stopping at first yielded `nil` value

- Fixed `Array.prototype.join` throwing an error when array contains anything other than strings and numbers

- Fixed extending a class not keeping `toString` implementation from a super class

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
