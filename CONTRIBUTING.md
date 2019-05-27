# Contributing to TypeScriptToLua

1. [Project Overview](#project-overview)
2. [Running Tests](#running-tests)
3. [Testing Guidelines](#testing-guidelines)
4. [Coding Conventions](#coding-conventions)

## Project Overview

To get familiar with the project structure, here is a short overview of each directory and their function.

- `src/`
  - Source code for the project, has the transpiler core files in its root.
  - `src/lualib/`
    - Contains the TypeScript source for the lualib. This consists of implementations of standard TypeScript functions that are not present in Lua. These files are compiled to Lua using the transpiler. They are included in the Lua result when transpiling.
  - `src/targets/`
    - Version-specific transpiler overrides for the different Lua targets. The main transpiler transpiles Lua 5.0, each target-specific transpiler extends the transpiler of the version before it, so the 5.3 inherits 5.2 which inherits 5.1 which inherits 5.0. LuaJIT is based on 5.2 so inherits from the 5.2 transpiler.
  - _Compiler.ts_ - Main entry point of the transpiler, this is what interfaces with the TypeScript compiler API.
  - _LuaTransformer.ts_ - Main transpiler code, transforms a TypeScript AST to a Lua AST.
  - _LuaPrinter.ts_ - Transforms a Lua AST to a string.
  - _TSHelper.ts_ - Helper methods used during the transpilation process.
- `test/`
  - This directory contains all testing code for the transpiler.
  - `test/unit/`
    - Unit/Functional tests for the transpiler. Tests in here are grouped by functionality they are testing. Generally each of these tests uses the transpiler to transpile some TypeScript to Lua, then executes it using the Fengari Lua VM. Assertion is done on the result of the lua code.
  - `test/translation/`
    - **[Obsolete]** Contains tests that only check the transpiled Lua String. We prefer adding unit/functional tests over translation tests. This directory will probably be removed at some point.

## Running Tests

The tests for this project can be executed using the standard `npm test`. This runs all tests.

Due to the time required to run all tests, it is impractical to run every test while developing part of the transpiler. To speed up the test run you can:

- Use `npm test name` to run tests that match a file name pattern

- Use `npm test -- --watch [name]` to start tests and rerun them on change

- Check out `Watch Usage` in the watching interface to get information about filtering tests without restarting CLI

- Use `.only` and `.skip` to filter executed tests in the file

  ```ts
  // Skipped
  test("test", () => {});

  // Executed
  test.only("test", () => {});
  ```

## Testing Guidelines

When submitting a pull request with new functionality, we require some functional (transpile and execute Lua) to be added, to ensure the new functionality works as expected, and will continue to work that way.

Translation tests are discouraged as in most cases as we do not really care about the exact Lua output, as long as executing it results in the correct result (which is tested by functional tests).

## Coding Conventions

Most coding conventions are enforced by the TSLint and Prettier. You can check your code locally by running `npm run lint`. The CI build will fail if your code does not pass the linter. For better experience, you can install extensions for your code editor for [TSLint](https://palantir.github.io/tslint/usage/third-party-tools/) and [Prettier](https://prettier.io/docs/en/editors.html).

Some extra conventions worth mentioning:

- Do not abbreviate variable names. The exception here are inline lambda arguments, if it is obvious what the argument is you can abbreviate to the first letter, e.g: `statements.filter(s => ts.VariableStatement(s))`
- Readability of code is more important than the amount of space it takes. If extra line breaks make your code more readable, add them.
- Functional style is encouraged!
