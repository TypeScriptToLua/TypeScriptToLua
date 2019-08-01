import * as fs from "fs";
import * as path from "path";
import * as tstl from "../../src";
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
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});
