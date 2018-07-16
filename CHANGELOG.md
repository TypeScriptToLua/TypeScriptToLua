# Changelog

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
