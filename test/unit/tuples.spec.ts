import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class TupleTests {
    @Test("Tuple loop")
    public tupleLoop() {
        // Transpile
        const lua = util.transpileString(
            `const tuple: [number, number, number] = [3,5,1];
            let count = 0;
            for (const value of tuple) { count += value; }
            return count;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Tuple foreach")
    public tupleForEach() {
        // Transpile
        const lua = util.transpileString(
            `const tuple: [number, number, number] = [3,5,1];
            let count = 0;
            tuple.forEach(v => count += v);
            return count;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Tuple access")
    public tupleAccess() {
        // Transpile
        const lua = util.transpileString(
            `const tuple: [number, number, number] = [3,5,1];
            return tuple[1];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple Destruct")
    public tupleDestruct() {
        // Transpile
        const lua = util.transpileString(
            `function tuple(): [number, number, number] { return [3,5,1]; }\n
            const [a,b,c] = tuple();
            return b;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple length")
    public tupleLength() {
        // Transpile
        const lua = util.transpileString(
            `const tuple: [number, number, number] = [3,5,1];
            return tuple.length;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Tuple Return Access")
    public tupleReturnAccess() {
        // Transpile
        const lua = util.transpileString(
            `/** !TupleReturn */\n
            function tuple(): [number, number, number] { return [3,5,1]; }\n
            return tuple()[2];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(1);
    }

    @Test("Tuple Return Destruct")
    public tupleReturnDestruct() {
        // Transpile
        const lua = util.transpileString(
            `/** !TupleReturn */\n
            function tuple(): [number, number, number] { return [3,5,1]; }\n
            const [a,b,c] = tuple();
            return b;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }
}
