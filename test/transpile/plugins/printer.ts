import * as tstl from "../../../src";

const plugin: tstl.Plugin = {
    printer: (program, emitHost, fileName, ...args) => {
        const result = new tstl.LuaPrinter(emitHost, program, fileName).print(...args);
        result.code = `-- Plugin\n${result.code}`;
        return result;
    },
};

// tslint:disable-next-line: no-default-export
export default plugin;
