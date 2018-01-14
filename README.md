# TypescriptToLua
Typescript to lua transpiler.

## Usage Guide

#### Prerequisites
- Node.Js
- Typescript (`npm install -g typescript`)

### Required files
To run the transpiler, download all files from [dist](https://github.com/Perryvw/TypescriptToLua/tree/master/dist):
- Compiler.js
- ForHelper.js
- Transpiler.js
- TSHelper.js

After copying these files to a locaton on your machine, run command `npm link typescript` in the directory the javascript files are in.

**Optionally:**
Add the lualib files to your project. This helper library unlocks additional typescript functions:
- Ternary operator
- Functional-style list operations (forEach/map/filter/every/some)
- Includes lua Map<S,T> and Set<T> implementations
Add `require("typescript")` in your code code if you want to use the lualib functionality.

### Transpiling an individual TypeScript file to Lua
To transpile a typescript file to lua, run Compiler.js in node with the path to the file you want to compile, eg:

`node C:\Documents\TypescriptToLua\dist\Compiler.js .\my-file.ts`

### Transpiling a TypeScript project to Lua
The compiler will automatically try to find a typescript configuration file `tsconfig.json` in the files. If found it will transpile all TypeScript files in subdirectories of the project.

**To prevent accidental compilation to Lua, you are required to add a `"target": "lua"` entry in your tsconfig compilerOptions.**

## Sublime Text integration
This compiler works great in combination with the [Sublime Text Typescript plugin](https://github.com/Microsoft/TypeScript-Sublime-Plugin) (available through the package manager as `TypeScript`).

You can simply open your typescript project assuming a valid tsconfig.json file is present. The default TypeScript plugin will provide all functionality of a regular TypeScript project.

### Setting up a custom build system
To add the option to build with the Lua transpiler instead of the regular typescript compiler, go to `Tools > Build System >  New Build System...`. In the new sublime-build file that opens, enter the following text with correct Compiler.js path:

```
{
    "cmd": ["node", "C:/Documents/TypeScriptToLua/dist/Compiler.js", "$file"]
}
```
Save this in your Sublime settings as a `TypeScriptToLua.sublime-build`. You can now select the TypeScriptToLua build system in `Tools > Build System` to build using the normal hotkey (`ctrl+B`), or if you have multiple TypeScript projects open, you can choose your compiler before building by pressing `ctrl+shift+B`.
