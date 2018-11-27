import { TestRunner, TestSet } from "alsatian";
import { TapBark } from "tap-bark";

import * as fs from "fs";
import * as path from "path";

// create test set
const testSet = TestSet.create();

// add your tests
testSet.addTestsFromFiles("./test/**/*.spec.ts");

// create a test runner
const testRunner = new TestRunner();

// Copy lualib to project root
fs.copyFileSync(
    path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
    "lualib_bundle.lua"
);

// setup the output
testRunner.outputStream
          // this will use alsatian's default output if you remove this
          // you'll get TAP or you can add your favourite TAP reporter in it's place
          // .pipe(TapBark.create().getPipeable())
          // pipe to the console
          .pipe(process.stdout);

// run the test set
testRunner.run(testSet)
          // this will be called after all tests have been run
          .then(result => {
              // Remove lualib bundle again
              fs.unlinkSync("lualib_bundle.lua");
          })
          // this will be called if there was a problem
          .catch(error => {
              // Remove lualib bundle again
              fs.unlinkSync("lualib_bundle.lua");
          });
