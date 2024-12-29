import * as fs from "fs";
import * as path from "path";
import * as tstl from "../../src";
import { annotationDeprecated } from "../../src/transformation/utils/diagnostics";
import { couldNotResolveRequire } from "../../src/transpilation/diagnostics";
import * as util from "../util";

const fixturesPath = path.join(__dirname, "./transformation");
const fixtures = fs
    .readdirSync(fixturesPath)
    .filter(f => path.extname(f) === ".ts")
    .sort()
    .map(f => [path.parse(f).name, fs.readFileSync(path.join(fixturesPath, f), "utf8")]);

test.each(fixtures)("Transformation (%s)", (_name, content) => {
    util.testModule(content)
        .setOptions({ luaLibImport: tstl.LuaLibImportKind.Require })
        .ignoreDiagnostics([annotationDeprecated.code, couldNotResolveRequire.code])
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

const luauFixturesPath = path.join(fixturesPath, "luau");
const luauFixtures = fs
    .readdirSync(luauFixturesPath)
    .filter(f => path.extname(f) === ".ts")
    .sort()
    .map(f => [path.parse(f).name, fs.readFileSync(path.join(luauFixturesPath, f), "utf8")]);

test.each(luauFixtures)("Luau-specific Transformation (%s)", (_name, content) => {
    util.testModule(content)
        .setOptions({ luaLibImport: tstl.LuaLibImportKind.Require, luaTarget: tstl.LuaTarget.Luau })
        .ignoreDiagnostics([annotationDeprecated.code, couldNotResolveRequire.code])
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});
