import * as fs from "fs-extra";
import { promisify } from "util";
import { collectCliOutput, forkCli, resolveFixture } from "./run";

const delay = promisify(setTimeout);

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

function forkWatchProcess(args: string[]) {
    const child = forkCli(["--watch", ...args]);
    testsCleanup.push(() => child.kill());
    return child;
}

const changedTestFiles = new Set<string>();
function changeTestFile(fileName: string, content: string) {
    if (!changedTestFiles.has(fileName)) {
        changedTestFiles.add(fileName);
        const originalContent = fs.readFileSync(fileName);
        testsCleanup.push(() => {
            changedTestFiles.delete(fileName);
            fs.writeFileSync(fileName, originalContent);
        });
    }

    fs.writeFileSync(fileName, content);
}

const watchedFile = resolveFixture("watch/basic/watch.ts");
const watchedFileOut = resolveFixture("watch/basic/watch.lua");

async function compileChangeAndCompare(filePath: string, content: string): Promise<void> {
    testsCleanup.push(() => fs.removeSync(watchedFileOut));
    await waitForFileExists(watchedFileOut);
    const initialResultLua = fs.readFileSync(watchedFileOut, "utf8");

    fs.unlinkSync(watchedFileOut);
    changeTestFile(filePath, content);

    await waitForFileExists(watchedFileOut);
    const updatedResultLua = fs.readFileSync(watchedFileOut, "utf8");

    expect(initialResultLua).not.toEqual(updatedResultLua);
}

test("should watch single file", async () => {
    forkWatchProcess([watchedFile]);
    await compileChangeAndCompare(watchedFile, "const value = 1;");
});

test("should watch project", async () => {
    forkWatchProcess(["--project", resolveFixture("watch/basic")]);
    await compileChangeAndCompare(watchedFile, "const value = 1;");
});

test("should watch config file", async () => {
    const configFilePath = resolveFixture("watch/basic/tsconfig.json");
    forkWatchProcess(["--project", configFilePath]);
    await compileChangeAndCompare(configFilePath, '{ "tstl": { "luaTarget": "5.3" } }');
});

test("should watch multiple files", async () => {
    const mtimeSnapshots: Array<{ a: number; b: number }> = [];
    const takeMtimeSnapshot = () => {
        mtimeSnapshots.push({
            a: fs.statSync(resolveFixture("watch/multiple-files/a.lua")).mtimeMs,
            b: fs.statSync(resolveFixture("watch/multiple-files/b.lua")).mtimeMs,
        });
    };

    testsCleanup.push(() => fs.unlinkSync(resolveFixture("watch/multiple-files/b.lua")));
    testsCleanup.push(() => fs.unlinkSync(resolveFixture("watch/multiple-files/a.lua")));

    const child = forkWatchProcess(["--project", resolveFixture("watch/multiple-files")]);
    const childOutputPromise = collectCliOutput(child);

    await waitForFileExists(resolveFixture("watch/multiple-files/a.lua"));
    await waitForFileExists(resolveFixture("watch/multiple-files/b.lua"));
    await delay(300);
    takeMtimeSnapshot();

    for (let index = 0; index < 3; index++) {
        fs.unlinkSync(resolveFixture("watch/multiple-files/a.lua"));
        changeTestFile(resolveFixture("watch/multiple-files/a.ts"), `import "./b"; // ${index}`);

        await waitForFileExists(resolveFixture("watch/multiple-files/a.lua"));
        await delay(300);
        takeMtimeSnapshot();
    }

    child.kill();
    const { output } = await childOutputPromise;
    expect(output.match(/Found 0 errors\. Watching for file changes\./g)).toHaveLength(4);

    // TODO: First watch event re-writes all files
    expect(mtimeSnapshots[0].b).not.toEqual(mtimeSnapshots[1].b);
    expect(mtimeSnapshots[1].b).toEqual(mtimeSnapshots[2].b);
    expect(mtimeSnapshots[1].b).toEqual(mtimeSnapshots[3].b);

    expect(mtimeSnapshots[0].a).not.toEqual(mtimeSnapshots[1].a);
    expect(mtimeSnapshots[1].a).not.toEqual(mtimeSnapshots[2].a);
    expect(mtimeSnapshots[2].a).not.toEqual(mtimeSnapshots[3].a);
});
