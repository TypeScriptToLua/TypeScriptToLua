import { TestOutcome, TestRunner, TestSet } from "alsatian";

import * as fs from "fs";
import * as path from "path";

// create test set
const testSet = TestSet.create();

// add your tests
testSet.addTestsFromFiles("./test/**/*.spec.js");

// create a test runner
const testRunner = new TestRunner();

// Copy lualib to project root
fs.copyFileSync(
    path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"),
    "lualib_bundle.lua"
);

// setup the output
testRunner.outputStream
    // pipe to the console
    .pipe(process.stdout);

let success = 0;
let ignored = 0;
let run = 0;
testRunner.onTestComplete(test => {
    run++;

    if (test.outcome === TestOutcome.Pass) {
        success++;
    } else if (test.outcome === TestOutcome.Skip) {
        ignored++;
    }
});

// run the test set
testRunner.run(testSet)
    // this will be called after all tests have been run
    .then(result => {
        // Remove lualib bundle again
        fs.unlinkSync("lualib_bundle.lua");

        const nonIgnoredTests = run - ignored;
        const failedTests = nonIgnoredTests - success;
        console.log(`Ignored ${ignored}/${run} tests.`);
        console.log(`Failed ${failedTests}/${nonIgnoredTests} tests.`);
        console.log(`Passed ${success}/${nonIgnoredTests} tests.`);

        if (failedTests > 0) {
            process.exit(1);
        }
    })
    // this will be called if there was a problem
    .catch(error => {
        // Remove lualib bundle again
        fs.unlinkSync("lualib_bundle.lua");

        console.error(error);
        process.exit(1);
    });
