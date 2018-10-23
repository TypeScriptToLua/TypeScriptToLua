import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class TupleTests {
    @Test("Tuple loop")
    public tupleLoop(): void {
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
    public tupleForEach(): void {
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
    public tupleAccess(): void {
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

    @Test("Tuple union access")
    public tupleUnionAccess(): void {
        const lua = util.transpileString(
            `function makeTuple(): [number, number, number] | [string, string, string] { return [3,5,1]; }
            const tuple = makeTuple();
            return tuple[1];`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(5);
    }

    @Test("Tuple intersection access")
    public tupleIntersectionAccess(): void {
        const lua = util.transpileString(
            `type I = [number, number, number] & {foo: string};
            function makeTuple(): I {
                let t = [3,5,1];
                (t as I).foo = "bar";
                return (t as I);
            }
            const tuple = makeTuple();
            return tuple[1];`
        );
        const result = util.executeLua(lua);
        Expect(result).toBe(5);
    }

    @Test("Tuple Destruct")
    public tupleDestruct(): void {
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
    public tupleLength(): void {
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
    public tupleReturnAccess(): void {
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

    @Test("Tuple Return Destruct Declaration")
    public tupleReturnDestructDeclaration(): void {
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

    @Test("Tuple Return Destruct Assignment")
    public tupleReturnDestructAssignment(): void {
        // Transpile
        const lua = util.transpileString(
            `/** !TupleReturn */\n
            function tuple(): [number, number] { return [3,6]; }\n
            const [a,b] = [1,2];
            [b,a] = tuple();
            return a - b;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Tuple Static Method Return Destruct")
    public tupleStaticMethodReturnDestruct(): void {
        // Transpile
        const lua = util.transpileString(
            `class Test {\n
                /** !TupleReturn */\n
                static tuple(): [number, number, number] { return [3,5,1]; }\n
            }\n
            const [a,b,c] = Test.tuple();
            return b;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }

    @Test("Tuple Non-Static Method Return Destruct")
    public tupleMethodNonStaticReturnDestruct(): void {
        // Transpile
        const lua = util.transpileString(
            `class Test {\n
                /** !TupleReturn */\n
                tuple(): [number, number, number] { return [3,5,1]; }\n
            }\n
            const t = new Test();
            const [a,b,c] = t.tuple();
            return b;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }
}
