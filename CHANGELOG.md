# Changelog

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
