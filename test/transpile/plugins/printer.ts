import { SourceNode } from "source-map";
import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    printer(program, host, fileName, ...args) {
        const result = new tstl.LuaPrinter(host, program, fileName).print(...args);
        return new SourceNode(null, null, null, ["-- Plugin\n", result.source]);
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
