import { SourceNode } from "source-map";
import * as tstl from "../../../src";

class CustomPrinter extends tstl.LuaPrinter {
    /* Override printFile */
    protected printFile(file: tstl.File): SourceNode {
        const originalResult = super.printFile(file);
        // Add header comment at the top of the file
        return this.createSourceNode(file, [`-- Custom printer plugin: ${this.luaFile}\n`, originalResult]);
    }

    /* Override printBoolean */
    public printBooleanLiteral(expression: tstl.BooleanLiteral): SourceNode {
        // Print any boolean as 'true'
        return this.createSourceNode(expression, "true");
    }
}

const plugin: tstl.Plugin = {
    printer: (program, emitHost, fileName, file) => new CustomPrinter(emitHost, program, fileName).print(file),
};

export default plugin;
