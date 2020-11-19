#!/usr/bin/env node
import * as ts from "typescript";
import { executeCommandLine } from "./cli/execute";

function checkNodeVersion(): void {
    const [major, minor] = process.version.slice(1).split(".").map(Number);
    const isValid = major > 12 || (major === 12 && minor >= 13);
    if (!isValid) {
        console.error(`TypeScriptToLua requires Node.js >=12.13.0, the current version is ${process.version}`);
        process.exit(1);
    }
}

checkNodeVersion();

if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}

executeCommandLine(ts.sys.args);
