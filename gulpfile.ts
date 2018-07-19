import { TestRunner, TestSet } from "alsatian";
import * as del from "del";
import * as glob from "glob";
import * as gulp from "gulp";
import * as concat from "gulp-concat";
import * as istanbul from "gulp-istanbul";
import tslint from "gulp-tslint";
import * as ts from "gulp-typescript";
import { TapBark } from "tap-bark";

import {parseCommandLine} from "./src/CommandLineParser";
import {compile, compileFilesWithOptions} from "./src/Compiler";

// BUILD

gulp.task("build", () => {
  const tsProject = ts.createProject("tsconfig.json");
  return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

gulp.task("lualib", () => {
  compile([
    "-ah",
    "--dontRequireLuaLib",
    "-lt",
    "5.1",
    "--outDir",
    "./dist/lualib",
    "--rootDir",
    "./src/lualib",
    ...glob.sync("./src/lualib/*.ts"),
  ]);

  return gulp.src("./dist/lualib/*.lua")
      .pipe(concat("typescript_lualib_bundle.lua"))
      .pipe(gulp.dest("./dist/lualib"));
});

gulp.task("default", gulp.series("build", "lualib"));

// TESTS

gulp.task(
    "tslint",
    () => gulp.src("src/**/*.ts").pipe(tslint()).pipe(tslint.report()));

gulp.task("clean-test", () => del("./test/**/*.spec.js"));

gulp.task("build-test", () => {
    const tsProject = ts.createProject("./test/tsconfig.json");
    return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("./test"));
});

gulp.task("pre-test", () =>
    gulp.src(["src/**/*.js"])
      .pipe(istanbul())
      .pipe(istanbul.hookRequire())
);

gulp.task("unit-tests", (done: () => any) => {
    const testSet = TestSet.create();

    testSet.addTestsFromFiles("./test/**/*.spec.js");

    const testRunner = new TestRunner();

    testRunner.outputStream
              .pipe(TapBark.create().getPipeable())
              .pipe(process.stdout);

    testRunner.run(testSet)
              .then(() => {
                  istanbul.writeReports();
                  done();
              });
});

gulp.task("test", gulp.series("tslint", "clean-test", "build-test", "lualib", "pre-test", "unit-tests", "clean-test"));
