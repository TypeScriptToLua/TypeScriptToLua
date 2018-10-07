# Changelog

## 0.9.0
* Fixed an issue where default parameter values were ignored in function declarations.
* Fixed a bug where `self` was undefined in function properties.
* Fixed a bug where addition of +1 to indices sometimes caused issues with operation order (thanks @brianhang)
* Fixed super calls having issues with their `self` instance. (thanks @hazzard993)
* Methods now also accept custom decorators (thanks @hazzard993)
* Improved support for `toString` calls (thanks @andreiradu)
* Added support for block expressions (thanks @andreiradu)

Thanks @tomblind for the following changes:
* Fixed a bug where recursive use of a function expression caused a nil error.
* Fixed syntax error when compiling variable declaration lists.
* Fixed an issue with assignment order in exported namespaces.
* Various fixes to `!TupleReturn` functions.
* Fixed an issue with declaration merging.

## 0.8.0
* Added experimental watch mode, use it with `tstl --watch`
* Refactored decorators
* Added `...` spread operator
* Added error when a lua keyword is used as variable name
* Added support for shorthand object literals (thanks @gakada)
* Added array.pop (thanks @andreiradu)
* Added `;` after lines to avoid ambiguous syntax (thanks @andreiradu)
* Fixed issue with tsconfig being overriden (thanks @Janne252)

## 0.7.0
* Lualib runtime library is now compiled from TypeScript using the transpiler when building!
    * Split up runtime library definition into individual files.
    * Added multiple inclusion modes using the tsconfig option `lubLibImport`, options are:
        * `require` : Requires the entire library if lualib features are used.
        * `always` : Always require the runtime library.
        * `inline` : Inline the library code for used features in the file.
        * `none` : Do not include the runtime library
* Added support for assigning expressions (`+=`, `&=`, `++`, etc) in other expressions (i.e. `lastIndex = i++` or `return a += b`) by transpiling them as immediately called anonymous functions.
* Unreachable code (after returns) is no longer transpiled, preventing a Lua syntax error.
* Fixed issue with destructing statements in Lua 5.1
* Fixed issue with escaped characters in strings.
* Fixed bug regarding changing an exported variable after its export.


## 0.6.0
* Reworked part of the class system to solve some issues.
* Reworked class tests from translation to functional.
* Fixed issue with Lua splice implementation.
* Added threaded test runner to use for faster testing (use with `npm run test-threaded`).
* Added support for string-valued enums.
* Added tsconfig values to target Lua 5.1 and 5.2.

## 0.5.0
* Added support for `**` operator.
* Added support for `~` operator.
* Improved handling of assignment binary operators (`+=`,`*=`,`&=`, etc).
* Rewrote `Map` and `Set` to implement the ES6 specification for [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) and [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).
* Added support for `baseUrl` in [tsconfig](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html).
* Added `bit32` bit operations for Lua 5.2.
* Fixed various little bugs.
* Added tslint rule to enforce use of `/** @override */` decorator.
* Improved tests.

## 0.4.0
* Added support for `typeof`
* Added support for `instanceof`
* Added support for [TypeScript overloads](https://www.typescriptlang.org/docs/handbook/functions.html#overloads)
