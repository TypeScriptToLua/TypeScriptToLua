import * as fs from "fs-extra";
import * as path from "path";
import { forkCli } from "./run";

let testsCleanup: Array<() => void> = [];
afterEach(() => {
    testsCleanup.forEach(x => x());
    testsCleanup = [];
});

async function waitForFileExists(filePath: string): Promise<void> {
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

function forkWatchProcess(args: string[]): void {
    const child = forkCli(["--watch", ...args]);
    testsCleanup.push(() => child.kill());
}

const watchedFile = path.join(__dirname, "./watch/watch.ts");
const watchedFileOut = watchedFile.replace(".ts", ".lua");

afterEach(() => fs.removeSync(watchedFileOut));

async function compileChangeAndCompare(filePath: string, content: string): Promise<void> {
    await waitForFileExists(watchedFileOut);
    const initialResultLua = fs.readFileSync(watchedFileOut, "utf8");

    fs.unlinkSync(watchedFileOut);

    const originalContent = fs.readFileSync(filePath, "utf8");
    fs.writeFileSync(filePath, content);
    testsCleanup.push(() => fs.writeFileSync(filePath, originalContent));

    await waitForFileExists(watchedFileOut);
    const updatedResultLua = fs.readFileSync(watchedFileOut, "utf8");

    expect(initialResultLua).not.toEqual(updatedResultLua);
}

test("should watch single file", async () => {
    forkWatchProcess([path.join(__dirname, "./watch/watch.ts")]);
    await compileChangeAndCompare(watchedFile, "const value = 1;");
});

test("should watch project", async () => {
    forkWatchProcess(["--project", path.join(__dirname, "./watch")]);
    await compileChangeAndCompare(watchedFile, "const value = 1;");
});

test("should watch config file", async () => {
    const configFilePath = path.join(__dirname, "./watch/tsconfig.json");
    forkWatchProcess(["--project", configFilePath]);
    await compileChangeAndCompare(configFilePath, '{ "tstl": { "luaTarget": "5.3" } }');
});
