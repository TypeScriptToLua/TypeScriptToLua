import { ChildProcess, fork } from "child_process";
import * as path from "path";

jest.setTimeout(20000);

export const resolveFixture = (name: string) => path.resolve(__dirname, "__fixtures__", name);

const cliPath = path.join(__dirname, "../../src/tstl.ts");
const defaultArgs = ["--skipLibCheck", "--types", "node"];
export function forkCli(args: string[]): ChildProcess {
    return fork(cliPath, [...defaultArgs, ...args], {
        stdio: "pipe",
        execArgv: ["--require", "ts-node/register/transpile-only"],
    });
}

export interface CliOutput {
    exitCode: number;
    output: string;
}

export async function collectCliOutput(child: ChildProcess) {
    let output = "";
    child.stdout!.on("data", (data: Buffer) => (output += data.toString()));
    child.stderr!.on("data", (data: Buffer) => (output += data.toString()));

    return new Promise<CliOutput>(resolve => {
        child.on("close", exitCode => resolve({ exitCode, output }));
    });
}

export async function runCli(args: string[]) {
    return collectCliOutput(forkCli(args));
}
