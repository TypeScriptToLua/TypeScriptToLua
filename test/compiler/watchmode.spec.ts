import { AsyncTest, Expect, Setup, TestCase, Timeout } from "alsatian";
import { fork } from "child_process";
import * as fs from "fs";
import * as path from "path";

export class CompilerWatchModeTest {

    @TestCase(["-w", path.join(__dirname, "./testfiles/watch.ts")],
              path.join(__dirname, "./testfiles/watch.ts"))
    @TestCase(["-w", "-p", path.join(__dirname, "./projects/watchmode/")],
              path.join(__dirname, "./projects/watchmode/watch.ts"))
    @AsyncTest("Watch single File")
    @Timeout(16000)
    public async testSingle(args: string[], fileToChange: string): Promise<void> {
        fileToChange = fileToChange;
        const fileToChangeOut = fileToChange.replace(".ts", ".lua");

        const child = fork(path.join(__dirname, "watcher_proccess.js"));
        child.send(args);

        await this.waitForFileExists(fileToChangeOut, 9000)
                  .catch(err => console.error(err));

        Expect(fs.existsSync(fileToChangeOut)).toBe(true);

        const initialResultLua = fs.readFileSync(fileToChangeOut);
        const originalTS = fs.readFileSync(fileToChange);

        fs.unlinkSync(fileToChangeOut);

        fs.writeFileSync(fileToChange, "class MyTest2 {}");

        await this.waitForFileExists(fileToChangeOut, 5000)
                  .catch(err => console.error(err));

        const updatedResultLua = fs.readFileSync(fileToChangeOut).toString();

        Expect(initialResultLua).not.toEqual(updatedResultLua);

        fs.writeFileSync(fileToChange, originalTS);

        fs.unlinkSync(fileToChangeOut);

        child.kill();
    }

    private waitForFileExists(filepath: string, timeout: number = 3000): Promise<void> {
        const interval = 200;
        return new Promise((resolve, reject) => {
            const intervalTimerId = setInterval(
            () => {
                if (fs.existsSync(filepath)) {
                    clearTimeout(timeoutId);
                    clearInterval(intervalTimerId);
                    resolve();
                }
            },
            interval);

            const timeoutId = setTimeout(
            () => {
                clearInterval(intervalTimerId);
                reject(new Error("Wating for file timed out!"));
            },
            timeout);
        });
    }
}
