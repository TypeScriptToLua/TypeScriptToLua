import {MatchError} from "alsatian";
import * as glob from "glob";
import * as os from "os";
import * as path from "path";
import {config, Pool} from "threads";

function fileArrToString(fileArr: string[]): string {
    return fileArr.map(val => path.basename(val).replace(".spec.js", "")).join(", ");
}

function printTestStats(testCount: number, failedTestCount: number, header: string, footer: string): void {
    console.log("-----------------");
    console.log(header);
    console.log(`Total:  ${testCount}`);
    console.log(`Passed: ${testCount - failedTestCount}`);
    console.log(`Failed: ${failedTestCount}`);
    console.log(footer);
    console.log("-----------------");
}

config.set({
  basepath: {
    node: __dirname,
  }
});

let cpuCount = os.cpus().length + 1;
if ("TRAVIS" in process.env && "CI" in process.env) {
    // fixed thread count for CI
    cpuCount = 8;
}
const testFiles: string[] = glob.sync("./test/**/*.spec.js");
const pool = new Pool(cpuCount);
let jobCounter = 0;
const testStartTime = new Date();
const fileCount = testFiles.length;
let exitWithError = false;
let totalTestCount = 0;
let totalFailedTestCount = 0;

console.log(
    `Running tests: ${fileArrToString(testFiles)} with ${cpuCount} threads`);

testFiles.forEach(file => {
    pool.run("./test_thread")
        .send({files: [file]})
        .on("done",
            (testCount, failedTestCount) => {
              if (failedTestCount !== 0) {
                exitWithError = true;
              }
              totalTestCount += testCount;
              totalFailedTestCount += failedTestCount;
              jobCounter++;
              printTestStats(
                testCount,
                failedTestCount,
                `Tests ${file} results:`,
                `Thread: ${jobCounter}/${fileCount} done.`);
            })
        .on("error", error => {
          console.log("Fatal non test related Exception in test file:", file, error);
        });
});

pool.on("finished", () => {
    let footer = "All tests passed!";
    if (exitWithError) {
      footer = "Exiting with Error: One or more tests failed!";
    }
    printTestStats(totalTestCount, totalFailedTestCount, "Final Results:", footer);

    console.log("Everything done, shutting down the thread pool.");
    const timeInMs = (new Date().valueOf() - testStartTime.valueOf());
    console.log(`Tests took: ${Math.floor(timeInMs / 1000 / 60)}:${Math.floor(timeInMs / 1000) % 60}`);

    pool.killAll();

    if (exitWithError) {
      process.exit(1);
    }
});

