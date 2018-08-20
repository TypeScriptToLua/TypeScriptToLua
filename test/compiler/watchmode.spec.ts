import { AsyncTest, Expect, Setup, Timeout } from "alsatian";
import { fork } from "child_process";
import * as fs from "fs";
import * as path from "path";

export class CompilerWatchModeTest {

    private singleFilePath: string;
    private singleFilePathOut: string;

    @AsyncTest("Watch single File")
    @Timeout(10000)
    public async testSingle(): Promise<void> {
        // spawn watcher in different thread, that way we can just terminate it after test are completed
        const child = fork(path.join(__dirname, "watcher_proccess.ts"));
        child.send(["-w", this.singleFilePath]);

        await this.waitForFileExists(this.singleFilePathOut, 4000)
                  .catch(err => console.error(err));

        Expect(fs.existsSync(this.singleFilePathOut)).toBe(true);

        const initialResultLua = fs.readFileSync(this.singleFilePathOut);
        const originalTS = fs.readFileSync(this.singleFilePath);

        fs.unlinkSync(this.singleFilePathOut);

        fs.writeFileSync(this.singleFilePath, "class MyTest2 {}");

        await this.waitForFileExists(this.singleFilePathOut)
                  .catch(err => console.error(err));

        const updatedResultLua = fs.readFileSync(this.singleFilePathOut).toString();

        Expect(initialResultLua).not.toEqual(updatedResultLua);

        fs.writeFileSync(this.singleFilePath, originalTS);

        fs.unlinkSync(this.singleFilePathOut);

        child.kill();
    }

    @Setup
    private setup(): void {
      this.singleFilePath =  path.join(__dirname, "./testfiles/watch_single.ts");
      this.singleFilePathOut =  path.join(__dirname, "./testfiles/watch_single.lua");
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
