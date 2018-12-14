# TypescriptToLua
A generic TypeScript to Lua transpiler. Write your code in TypeScript and publish Lua!

Large projects written in lua can become hard to maintain and make it easy to make mistakes. Writing code in TypeScript instead improves maintainability, readability and robustness, with the added bonus of good IDE support. This project is useful in any environment where Lua code is accepted, with the powerful option of simply declaring any existing API using TypeScript declaration files.

[![Build Status](https://travis-ci.org/Perryvw/TypescriptToLua.svg?branch=master)](https://travis-ci.org/Perryvw/TypescriptToLua)
[![Build status](https://ci.appveyor.com/api/projects/status/github/perryvw/typescripttolua?branch=master&svg=true)](https://ci.appveyor.com/project/Perryvw/typescripttolua)
[![Coverage](https://codecov.io/gh/perryvw/typescripttolua/branch/master/graph/badge.svg)](https://codecov.io/gh/perryvw/typescripttolua)

You can chat with us on Discord: [![Discord](https://img.shields.io/discord/515854149821267971.svg)](https://discord.gg/BWAq58Y)

## Documentation
More detailed documentation and info on writing declarations can be found [on the wiki](https://github.com/Perryvw/TypescriptToLua/wiki).

Changelog can be found in [CHANGELOG.md](https://github.com/Perryvw/TypescriptToLua/blob/master/CHANGELOG.md)

## Usage Guide

**Install**

`npm install -g typescript-to-lua`

**Compile Files**

`tstl path/to/file.ts path/to/other-file.ts`

**Compile Projects**

`tstl -p path/to/tsconfig.json`

**Example tsconfig.json**
```
{
    "compilerOptions": {
        "noImplicitAny" : true,
        "noImplicitThis" : true,
        "alwaysStrict" : true,
        "strictNullChecks": true
    },
    "luaTarget": "JIT"
}
```

## Contributing
All contributions are welcome, but please read our [contribution guidelines](https://github.com/Perryvw/TypescriptToLua/blob/master/CONTRIBUTING.md)!

## Declarations
The real power of this transpiler is usage together with good declarations for the Lua API provided. Some examples of Lua interface declarations can be found here:
- [Dota 2 Modding](https://github.com/ModDota/API/tree/master/declarations/server)
- [Defold Game Engine Scripting](https://github.com/dasannikov/DefoldTypeScript/blob/master/defold.d.ts)

## Building & Tests

`npm run build` to build the project.

`npm run test` to run tests.

`npm run test-threaded` runs test in parallel, faster but less detailed output.

`npm run coverage` or `npm run coverage-html` to generate a coverage report.

## Sublime Text integration
This compiler works great in combination with the [Sublime Text Typescript plugin](https://github.com/Microsoft/TypeScript-Sublime-Plugin) (available through the package manager as `TypeScript`).

You can simply open your typescript project assuming a valid tsconfig.json file is present. The default TypeScript plugin will provide all functionality of a regular TypeScript project.

### Setting up a custom build system
To add the option to build with the Lua transpiler instead of the regular typescript compiler, go to `Tools > Build System >  New Build System...`. In the new sublime-build file that opens, enter the following (adjust path to tstl if not installed globally):

```
{
    "cmd": ["tstl", "-p", "$file"],
    "shell": true
}
```
Save this in your Sublime settings as a `TypeScriptToLua.sublime-build`. You can now select the TypeScriptToLua build system in `Tools > Build System` to build using the normal hotkey (`ctrl+B`), or if you have multiple TypeScript projects open, you can choose your compiler before building by pressing `ctrl+shift+B`.
