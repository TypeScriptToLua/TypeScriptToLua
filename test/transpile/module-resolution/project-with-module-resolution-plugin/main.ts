import { foo } from "./lua_sources/foo";
import { absolutefoo } from "./lua_sources/absolutefoo";
export const result = [foo(), absolutefoo()];
