import { TestRunner, TestSet } from "alsatian";
import * as del from "del";
import * as glob from "glob";
import * as gulp from "gulp";
import * as concat from "gulp-concat";
import * as istanbul from "gulp-istanbul";
import * as shell from "gulp-shell";
import tslint from "gulp-tslint";
import * as ts from "gulp-typescript";
import { TapBark } from "tap-bark";

import * as remapIstanbul from "remap-istanbul/lib/gulpRemapIstanbul";

import {parseCommandLine} from "./src/CommandLineParser";
import {compile, compileFilesWithOptions} from "./src/Compiler";

// BUILD

gulp.task("build", () => {
  const tsProject = ts.createProject("tsconfig.json");
  return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

gulp.task("clean-lualib", () => del("./dist/lualib/*.lua"));

gulp.task("build-lualib", () => {
    compile([
      "-ah",
      "--dontRequireLuaLib",
      "--luaTarget",
      "5.1",
      "--outDir",
      "./dist/lualib",
      "--rootDir",
      "./src/lualib",
      ...glob.sync("./src/lualib/*.ts"),
    ]);

    return gulp.src("./dist/lualib/*.lua")
        .pipe(concat("lualib_bundle.lua"))
        .pipe(gulp.dest("./dist/lualib"));
  });

gulp.task("lualib", gulp.series("clean-lualib", "build-lualib"));

gulp.task("default", gulp.series("build", "lualib"));

// TESTS

gulp.task(
    "tslint",
    () => gulp.src("src/**/*.ts").pipe(tslint()).pipe(tslint.report()));

gulp.task("clean-test", () => del("./test/**/*.spec.js"));

gulp.task("build-test", shell.task("tsc -p ./test", {cwd: __dirname}));

gulp.task("pre-test", () =>
    gulp.src(["./src/**/*.js"])
      .pipe(istanbul())
      .pipe(istanbul.hookRequire())
);

gulp.task("unit-tests", done => {
    const testSet = TestSet.create();

    testSet.addTestsFromFiles("./test/**/*.spec.js");

    const testRunner = new TestRunner();

    // testRunner.outputStream
      //          .pipe(TapBark.create().getPipeable())
        //        .pipe(process.stdout);

    testRunner.run(testSet)
              .then(() => {
                  console.log("sdasddsadasdas");
                  gulp.src("./coverage/coverage-final.json")
                    .pipe(istanbul.writeReports({reporters: ["lcov", "json", "text"]}))
                    .pipe(remapIstanbul())
                    .pipe(gulp.dest("coverage-remapped")).on("end", done);
            }).catch(error => console.log(error));
});

gulp.task("test", gulp.series(/*"tslint",*/ "clean-test", "build-test", "lualib", "pre-test", "unit-tests", "clean-test"));
