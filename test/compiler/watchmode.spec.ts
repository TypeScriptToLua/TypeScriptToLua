import { fork } from "child_process";
import * as fs from "fs";
import * as path from "path";

let testsCleanup: Array<() => void> = [];
afterEach(() => {
    testsCleanup.forEach(x => x());
    testsCleanup = [];
});

function waitForFileExists(filePath: string): Promise<void> {
    return new Promise<void>(resolve => {
        const intervalTimerId = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(intervalTimerId);
                resolve();
            }
        }, 100);

        testsCleanup.push(() => clearInterval(intervalTimerId));
    });
}

test.each([
    {
        args: ["-w", "--types", "node", path.join(__dirname, "./testfiles/watch.ts")],
        fileToChange: path.join(__dirname, "./testfiles/watch.ts"),
    },
    {
        args: ["-w", "-p", path.join(__dirname, "./projects/watchmode/")],
        fileToChange: path.join(__dirname, "./projects/watchmode/watch.ts"),
    },
])(
    "Watch single File (%p)",
    async ({ args, fileToChange }) => {
        const fileToChangeOut = fileToChange.replace(".ts", ".lua");
        const originalTS = fs.readFileSync(fileToChange);

        const child = fork(path.join(__dirname, "watcher_proccess.ts"), [], {
            silent: true,
            execArgv: ["--require", "ts-node/register/transpile-only"],
        });

        testsCleanup.push(() => {
            try {
                fs.unlinkSync(fileToChangeOut);
            } catch (err) {
                if (err.code !== "ENOENT") throw err;
            }
            fs.writeFileSync(fileToChange, originalTS);
            child.kill();
        });

        child.send(args);

        await waitForFileExists(fileToChangeOut);
        const initialResultLua = fs.readFileSync(fileToChangeOut, "utf8");

        fs.unlinkSync(fileToChangeOut);
        fs.writeFileSync(fileToChange, "class MyTest2 {}");

        await waitForFileExists(fileToChangeOut);
        const updatedResultLua = fs.readFileSync(fileToChangeOut, "utf8");

        expect(initialResultLua).not.toEqual(updatedResultLua);
    },
    10000,
);
