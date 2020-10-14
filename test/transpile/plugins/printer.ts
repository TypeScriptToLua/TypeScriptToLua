import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    printer(program, host, fileName, ...args) {
        const result = new tstl.LuaPrinter(host, program, fileName).print(...args);
        result.code = `-- Plugin\n${result.code}`;
        return result;
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
