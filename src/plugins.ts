import { Printer } from "./LuaPrinter";
import { Visitors } from "./transformation/context";

export interface Plugin {
    printer?: Printer;
    visitors?: Visitors;
}
