import * as concat from "gulp-concat";
import * as glob from "glob";
import * as gulp from "gulp";
import * as ts from "gulp-typescript";

import {parseCommandLine} from "./src/CommandLineParser";
import {compile, compileFilesWithOptions} from "./src/Compiler";

gulp.task("default", () => {
    const tsProject = ts.createProject("tsconfig.json");
    return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

gulp.task("lualib", done => {
    compile(["-ah", "--dontRequireLuaLib", "-lt", "5.1", "--outDir", "./dist/lualib", "--rootDir", "./src/lualib", ...glob.sync("./src/lualib/*.ts")]);

    return gulp.src("./dist/lualib/*.lua").pipe(concat("typescript_lualib_bundle.lua")).pipe(gulp.dest("./dist/lualib"));
});