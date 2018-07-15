import {MatchError} from "alsatian";
import * as glob from "glob";
import * as os from "os";
import * as path from "path";
import {config, Pool} from "threads";

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
const testFiles: string[] = glob.sync("./test/**/*.spec.ts");
const pool = new Pool(cpuCount);
let jobCounter = 0;

const fileArrToString = (fileArr: string[]) =>
    fileArr.map(val => path.basename(val).replace(".spec.ts", "")).join(", ");

console.log(
    `Running tests: ${fileArrToString(testFiles)} with ${cpuCount} threads`);

const filesPerThread = Math.floor(testFiles.length / cpuCount);
const threadsWithMoreWork = testFiles.length % cpuCount;

for (let i = 1; i <= cpuCount; i++) {
  let files: string[] = [];
  if (i <= threadsWithMoreWork) {
    files = testFiles.splice(0, filesPerThread + 1);
  } else {
    files = testFiles.splice(0, filesPerThread);
  }
  console.log(`Running tests: ${fileArrToString(files)} in thread ${i}`);

  pool.run("./test_thread")
      .send({files: files})
      .on("done",
          (results, input) => {
            jobCounter++;
            console.log(`Tests ${fileArrToString(files)} ${jobCounter}/${
                cpuCount} done.`);
          })
      .on("error", error => {
        console.log("Exception in test:", files, error);
      });
}

pool.on("finished", () => {
  console.log("Everything done, shutting down the thread pool.");
  pool.killAll();
});
