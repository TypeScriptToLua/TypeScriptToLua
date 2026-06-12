import * as sharedLib from "shared-lib";
import * as consumer from "consumer";

export const directResult = sharedLib.greet("World");
export const indirectResult = consumer.welcome("World");
