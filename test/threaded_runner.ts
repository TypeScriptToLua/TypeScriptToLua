import { MatchError } from "alsatian";

import * as glob from "glob";
import * as os from "os";

import { Pool, config } from "threads";

config.set({
    basepath : {
        node : __dirname,
    }
});

console.log (`Running tests with ${os.cpus().length + 1} threads`);
const pool = new Pool(os.cpus().length + 1);

const testFiles = glob.sync("./test/**/*.spec.ts");

let jobCounter = 0;

testFiles.forEach(file => {
    console.log("Running Tests from:", file);
    pool.run("./test_thread").send({file: file})
    .on('done', (results, input) => {
        jobCounter++;
        console.log(`Job ${input.file} ${jobCounter}/${testFiles.length} done.`);
    })
    .on('error', (error) => {
        console.log('Exception in test:', file, error);
    });
});

pool.on('finished', function() {
        console.log('Everything done, shutting down the thread pool.');
        pool.killAll();
    });
