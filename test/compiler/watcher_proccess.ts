import { compile } from "../../src/Compiler";

process.on("message", args => {
    compile(args);
});
