# TypescriptToLua
A generic TypeScript to Lua transpiler. Write your code in TypeScript and publish Lua!

[![Build Status](https://travis-ci.org/Perryvw/TypescriptToLua.svg?branch=master)](https://travis-ci.org/Perryvw/TypescriptToLua) [![Coverage](https://codecov.io/gh/perryvw/typescripttolua/branch/master/graph/badge.svg)](https://codecov.io/gh/perryvw/typescripttolua)

## Documentation
More detailed documentation and info on writing declarations can be found [on the wiki](https://github.com/Perryvw/TypescriptToLua/wiki).

## Usage Guide

**Install**

`npm install -g typescript-to-lua`

**Compile Files**

`tstl path/to-my-file.ts path/to-my-other-file.ts`

**Compile Projects**

`tstl -p path/to-my/tsconfig.json`

**Options**
```
Syntax:  tstl [options] [files...]

In addtion to the options listed below you can also pass options for the
typescript compiler (For a list of options use tsc -h). NOTE: The tsc options
might have no effect.

Options:
  --version        Show version number
  --luaTarget, -l  Specify Lua target version: 'JIT' (Default), '5.1', '5.2',
                   '5.3'
  --project, -p    Compile the project given the path to its configuration file,
                   or to a folder with a 'tsconfig.json'
  --help           Show this message
```

**Optionally:**
Add the lualib files from dist/ to your project. This helper library unlocks additional typescript functions:
- Ternary operator
- Functional-style list operations (forEach/map/filter/every/some)
- Includes lua `Map<S,T>` and `Set<T>` implementations
Add `require("typescript")` in your code code if you want to use the lualib functionality.

## Sublime Text integration
This compiler works great in combination with the [Sublime Text Typescript plugin](https://github.com/Microsoft/TypeScript-Sublime-Plugin) (available through the package manager as `TypeScript`).

You can simply open your typescript project assuming a valid tsconfig.json file is present. The default TypeScript plugin will provide all functionality of a regular TypeScript project.

### Setting up a custom build system
To add the option to build with the Lua transpiler instead of the regular typescript compiler, go to `Tools > Build System >  New Build System...`. In the new sublime-build file that opens, enter the following (adjust path to tstl if not installed globally):

```
{
    "cmd": ["tstl", "-p", "$file"]
}
```
Save this in your Sublime settings as a `TypeScriptToLua.sublime-build`. You can now select the TypeScriptToLua build system in `Tools > Build System` to build using the normal hotkey (`ctrl+B`), or if you have multiple TypeScript projects open, you can choose your compiler before building by pressing `ctrl+shift+B`.
