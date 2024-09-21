import { LuaLibImportKind } from "../../src";
import * as util from "../util";

const usingTestLib = `
    export const logs: string[] = [];

    function loggedDisposable(id: string): Disposable {
        logs.push(\`Creating \${id}\`);

        return {
            [Symbol.dispose]() {
                logs.push(\`Disposing \${id}\`);
            }
        }
    }`;

test("using disposes object at end of function", () => {
    util.testModule`        
        function func() {
            using a = loggedDisposable("a");
            using b = loggedDisposable("b");

            logs.push("function content");
        }
        
        func();
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({ logs: ["Creating a", "Creating b", "function content", "Disposing b", "Disposing a"] });
});

test("handles multi-variable declarations", () => {
    util.testModule`        
        function func() {
            using a = loggedDisposable("a"), b = loggedDisposable("b");

            logs.push("function content");
        }
        
        func();
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({ logs: ["Creating a", "Creating b", "function content", "Disposing b", "Disposing a"] });
});

test("using disposes object at end of nested block", () => {
    util.testModule`        
        function func() {
            using a = loggedDisposable("a");

            {
                using b = loggedDisposable("b");
                logs.push("nested block");
            }

            logs.push("function content");
        }
        
        func();
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({
            logs: ["Creating a", "Creating b", "nested block", "Disposing b", "function content", "Disposing a"],
        });
});

test("using does not affect function return value", () => {
    util.testModule`        
        function func() {
            using a = loggedDisposable("a");
            using b = loggedDisposable("b");

            logs.push("function content");

            return "success";
        }
        
        export const result = func();
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({
            result: "success",
            logs: ["Creating a", "Creating b", "function content", "Disposing b", "Disposing a"],
        });
});

test("using disposes even when error happens", () => {
    util.testModule` 
        function func() {
            using a = loggedDisposable("a");
            using b = loggedDisposable("b");

            throw "test-induced exception";
        }

        try 
        {
            func();
        }
        catch (e)
        {
            logs.push(\`caught exception: \${e}\`);
        }
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({
            logs: [
                "Creating a",
                "Creating b",
                "Disposing b",
                "Disposing a",
                "caught exception: test-induced exception",
            ],
        });
});

test("await using disposes object with await at end of function", () => {
    util.testModule`
        let disposeAsync;

        function loggedAsyncDisposable(id: string): AsyncDisposable {
            logs.push(\`Creating \${id}\`);

            return {
                [Symbol.asyncDispose]() {
                    logs.push(\`Disposing async \${id}\`);
                    return new Promise(resolve => {
                        disposeAsync = () => {
                            logs.push(\`Disposed \${id}\`);
                            resolve();
                        };
                    });
                }
            }
        }

        async function func() {
            await using a = loggedAsyncDisposable("a");

            logs.push("function content");
            return "function result";
        }
        
        const p = func().then(r => logs.push("promise resolved", r));

        logs.push("function returned");

        disposeAsync();
    `
        .setTsHeader(usingTestLib)
        .setOptions({ luaLibImport: LuaLibImportKind.Inline })
        .expectToEqual({
            logs: [
                "Creating a",
                "function content",
                "Disposing async a",
                "function returned",
                "Disposed a",
                "promise resolved",
                "function result",
            ],
        });
});

test("await using can handle non-async disposables", () => {
    util.testModule`        
        async function func() {
            await using a = loggedDisposable("a");

            logs.push("function content");
        }
        
        func();
    `
        .setTsHeader(usingTestLib)
        .expectToEqual({ logs: ["Creating a", "function content", "Disposing a"] });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1571
test("await using no extra diagnostics (#1571)", () => {
    util.testModule`
        async function getResource(): Promise<AsyncDisposable> {
            return {
                [Symbol.asyncDispose]: async () => {}
            };
        }

        async function someOtherAsync() {}

        async function main() {
            await using resource = await getResource();
            await someOtherAsync();
        }
    `.expectToHaveNoDiagnostics();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1584
test("works with disposable classes (#1584)", () => {
    util.testFunction`
        const log = [];
        
        class Scoped {
            action(): void {
                log.push("action")
            }
            [Symbol.dispose]() {
                log.push("cleanup")
            }
        }

        function TestScoped(): void {
            using s = new Scoped();
            s.action();
        }

        TestScoped();
        return log;
    `.expectToEqual(["action", "cleanup"]);
});
