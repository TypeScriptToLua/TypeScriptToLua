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
