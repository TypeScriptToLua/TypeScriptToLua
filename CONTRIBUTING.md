# Contributing to TypeScriptToLua

1) [Project Overview](#project-overview)
2) [Running Tests](#running-tests)
3) [Testing Guidelines](#testing-guidelines)
4) [Coding Conventions](#coding-conventions)

## Project Overview
To get familiar with the project structure, here is a short overview of each directory and their function.
- `src/`
  * Source code for the project, has the transpiler core files in its root.
  * `src/lualib/`
    - Contains the TypeScript source for the lualib. This consists of implementations of standard TypeScript functions that are not present in Lua. These files are compiled to Lua using the transpiler. They are included in the Lua result when transpiling.
  * `src/targets/`
    - Version-specific transpiler overrides for the different Lua targets. The main transpiler transpiles Lua 5.0, each target-specific transpiler extends the transpiler of the version before it, so the 5.3 inherits 5.2 which inherits 5.1 which inherits 5.0. LuaJIT is based on 5.2 so inherits from the 5.2 transpiler.
  * *Compiler.ts* - Main entry point of the transpiler, this is what interfaces with the TypeScript compiler API.
  * *Transpiler.ts* - Main transpiler code, transforms a TypeScript AST to a Lua string.
  * *TSHelper.ts* - Helper methods used during the transpilation process.
- `test/`
  * This directory contains all testing code for the transpiler.
  * `test/src/`
    - Contains all extra source and utility used to run tests.
  * `test/unit/`
    - Unit/Functional tests for the transpiler. Tests in here are grouped by functionality they are testing. Generally each of these tests uses the transpiler to transpile some TypeScript to Lua, then executes it using the Fengari Lua VM. Assertion is done on the result of the lua code.
  * `test/translation/`
    - **[Obsolete]** Contains tests that only check the transpiled Lua String. We prefer adding unit/functional tests over translation tests. This directory will probably be removed at some point.

## Running Tests
The tests for this project can be executed using the standard `npm test`. This runs all tests (can take a while!).

### Testing while developing
Due to the time required to run all tests, it is impractical to run every test while developing part of the transpiler. To speed up the test run you can import `FocusTest` or `FocusTests` from Alsatian. If a class is decorated with `@FocusTests`, all other test classes will be ignored. Similarly, if any test method is decorated with `@FocusTest`, only `@FocusTest` methods will be run during `npm test`.

For example:
```ts
import { Expect, FocusTests, Test, TestCase } from "alsatian";

@FocusTests
export class FunctionTests {
    // All tests in here will be executed.
}

// All other tests will be ignored.
```

Or

```ts
import { Expect, FocusTest, Test, TestCase } from "alsatian";

export class FunctionTests {
    @FocusTest
    @Test("Example test 1")
    public test1(): void { // Will be executed
    }
    
    @FocusTest
    @Test("Example test 2")
    public test2(): void { // Will also be executed
    }
    
    @Test("Example test 3")
    public test3(): void { // Will be ignored
    }
}

// All other tests will be ignored.
```


## Testing Guidelines
When submitting a pull request with new functionality, we require some functional (transpile and execute Lua) to be added, to ensure the new functionality works as expected, and will continue to work that way.

Translation tests are discouraged as in most cases as we do not really care about the exact Lua output, as long as executing it results in the correct result (which is tested by functional tests).

## Coding Conventions
Most coding conventions are enforced by the ts-lint configuration. The test process will fail if code does not pass the linter. Some extra conventions worth mentioning:
* Do not abbreviate variable names. The exception here are inline lambda arguments, if it is obvious what the argument is you can abbreviate to the first letter, e.g: `statements.filter(s => ts.VariableStatement(s))`
* Readability of code is more important than the amount of space it takes. If extra line breaks make your code more readable, add them.
* Functional style is encouraged!
