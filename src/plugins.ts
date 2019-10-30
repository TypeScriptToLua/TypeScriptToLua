import { PrinterFactory } from "./LuaPrinter";
import { Visitors } from "./transformation/context";

export interface Plugin {
    createPrinter?: PrinterFactory;
    visitors?: Visitors;
}
