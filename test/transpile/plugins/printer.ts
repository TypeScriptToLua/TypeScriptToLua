import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    printer(program, emitHost, fileName, ...args) {
        const result = new tstl.LuaPrinter(emitHost, program, fileName).print(...args);
        result.code = `-- Plugin\n${result.code}`;
        return result;
    },
};

// eslint-disable-next-line import/no-default-export
export default plugin;
