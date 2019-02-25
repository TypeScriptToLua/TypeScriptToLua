import { Expect, Test, TestCase, IgnoreTest } from "alsatian";
import * as util from "../src/util";

export class MathTests {

    // Dont test all and dont do functional test
    // because math implementations may differ between js and lua
    @TestCase("Math.cos()", "math.cos();")
    @TestCase("Math.sin()", "math.sin();")
    @TestCase("Math.min()", "math.min();")
    @TestCase("Math.atan2(2, 3)", "math.atan(2 / 3);")
    @TestCase("Math.log2(3)", `(math.log(3) / ${Math.LN2});`)
    @TestCase("Math.log10(3)", `(math.log(3) / ${Math.LN10});`)
    @TestCase("Math.log1p(3)", "math.log(1 + 3);")
    @TestCase("Math.round(3.3)", "math.floor(3.3 + 0.5);")
    @TestCase("Math.PI", "math.pi;")
    @Test("Math")
    public math(inp: string, expected: string): void {
        // Transpile
        const lua = util.transpileString(inp);

        // Assert
        Expect(lua).toBe(expected);
    }

    @TestCase("E")
    @TestCase("LN10")
    @TestCase("LN2")
    @TestCase("LOG10E")
    @TestCase("LOG2E")
    @TestCase("SQRT1_2")
    @TestCase("SQRT2")
    @Test("Math constant")
    public mathConstant(constant: string): void {
        const epsilon = 0.000001;
        const code = `return Math.abs(Math.${constant} - ${Math[constant]}) <= ${epsilon}`;
        Expect(util.transpileAndExecute(code)).toBe(true);
    }

    @TestCase("++x", "x=4;y=6")
    @TestCase("x++", "x=4;y=6")
    @TestCase("--x", "x=2;y=6")
    @TestCase("x--", "x=2;y=6")
    @TestCase("x += y", "x=9;y=6")
    @TestCase("x -= y", "x=-3;y=6")
    @TestCase("x *= y", "x=18;y=6")
    @TestCase("y /= x", "x=3;y=2.0")
    @TestCase("y %= x", "x=3;y=0")
    @TestCase("y **= x", "x=3;y=216.0")
    @TestCase("x |= y", "x=7;y=6")
    @TestCase("x &= y", "x=2;y=6")
    @TestCase("x ^= y", "x=5;y=6")
    @TestCase("x <<= y", "x=192;y=6")
    @TestCase("x >>= y", "x=0;y=6")
    @Test("Operator assignment statements")
    public opAssignmentStatement(statement: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let x = 3;
            let y = 6;
            ${statement};
            return \`x=\${x};y=\${y}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++o.p", "o=4;a=6")
    @TestCase("o.p++", "o=4;a=6")
    @TestCase("--o.p", "o=2;a=6")
    @TestCase("o.p--", "o=2;a=6")
    @TestCase("o.p += a[0]", "o=9;a=6")
    @TestCase("o.p -= a[0]", "o=-3;a=6")
    @TestCase("o.p *= a[0]", "o=18;a=6")
    @TestCase("a[0] /= o.p", "o=3;a=2.0")
    @TestCase("a[0] %= o.p", "o=3;a=0")
    @TestCase("a[0] **= o.p", "o=3;a=216.0")
    @TestCase("o.p |= a[0]", "o=7;a=6")
    @TestCase("o.p &= a[0]", "o=2;a=6")
    @TestCase("o.p ^= a[0]", "o=5;a=6")
    @TestCase("o.p <<= a[0]", "o=192;a=6")
    @TestCase("o.p >>= a[0]", "o=0;a=6")
    @Test("Operator assignment to simple property statements")
    public opSimplePropAssignmentStatement(statement: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: 3};
            let a = [6];
            ${statement};
            return \`o=\${o.p};a=\${a[0]}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++o.p.d", "o=4;a=[6,11],[7,13]")
    @TestCase("o.p.d++", "o=4;a=[6,11],[7,13]")
    @TestCase("--o.p.d", "o=2;a=[6,11],[7,13]")
    @TestCase("o.p.d--", "o=2;a=[6,11],[7,13]")
    @TestCase("o.p.d += a[0][0]", "o=9;a=[6,11],[7,13]")
    @TestCase("o.p.d -= a[0][0]", "o=-3;a=[6,11],[7,13]")
    @TestCase("o.p.d *= a[0][0]", "o=18;a=[6,11],[7,13]")
    @TestCase("a[0][0] /= o.p.d", "o=3;a=[2.0,11],[7,13]")
    @TestCase("a[0][0] %= o.p.d", "o=3;a=[0,11],[7,13]")
    @TestCase("a[0][0] **= o.p.d", "o=3;a=[216.0,11],[7,13]")
    @TestCase("o.p.d |= a[0][0]", "o=7;a=[6,11],[7,13]")
    @TestCase("o.p.d &= a[0][0]", "o=2;a=[6,11],[7,13]")
    @TestCase("o.p.d ^= a[0][0]", "o=5;a=[6,11],[7,13]")
    @TestCase("o.p.d <<= a[0][0]", "o=192;a=[6,11],[7,13]")
    @TestCase("o.p.d >>= a[0][0]", "o=0;a=[6,11],[7,13]")
    @Test("Operator assignment to deep property statements")
    public opDeepPropAssignmentStatement(statement: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: {d: 3}};
            let a = [[6,11], [7,13]];
            ${statement};
            return \`o=\${o.p.d};a=[\${a[0][0]},\${a[0][1]}],[\${a[1][0]},\${a[1][1]}]\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++of().p", "o=4;a=6")
    @TestCase("of().p++", "o=4;a=6")
    @TestCase("--of().p", "o=2;a=6")
    @TestCase("of().p--", "o=2;a=6")
    @TestCase("of().p += af()[i()]", "o=9;a=6")
    @TestCase("of().p -= af()[i()]", "o=-3;a=6")
    @TestCase("of().p *= af()[i()]", "o=18;a=6")
    @TestCase("af()[i()] /= of().p", "o=3;a=2.0")
    @TestCase("af()[i()] %= of().p", "o=3;a=0")
    @TestCase("af()[i()] **= of().p", "o=3;a=216.0")
    @TestCase("of().p |= af()[i()]", "o=7;a=6")
    @TestCase("of().p &= af()[i()]", "o=2;a=6")
    @TestCase("of().p ^= af()[i()]", "o=5;a=6")
    @TestCase("of().p <<= af()[i()]", "o=192;a=6")
    @TestCase("of().p >>= af()[i()]", "o=0;a=6")
    @Test("Operator assignment to complex property statements")
    public opComplexPropAssignmentStatement(statement: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: 3};
            let a = [6];
            function of() { return o; }
            function af() { return a; }
            function i() { return 0; }
            ${statement};
            return \`o=\${o.p};a=\${a[0]}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++of().p.d", "o=4;a=[7,6],[11,13];i=0")
    @TestCase("of().p.d++", "o=4;a=[7,6],[11,13];i=0")
    @TestCase("--of().p.d", "o=2;a=[7,6],[11,13];i=0")
    @TestCase("of().p.d--", "o=2;a=[7,6],[11,13];i=0")
    @TestCase("of().p.d += af()[i()][i()]", "o=9;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d -= af()[i()][i()]", "o=-3;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d *= af()[i()][i()]", "o=18;a=[7,6],[11,13];i=2")
    @TestCase("af()[i()][i()] /= of().p.d", "o=3;a=[7,2.0],[11,13];i=2")
    @TestCase("af()[i()][i()] %= of().p.d", "o=3;a=[7,0],[11,13];i=2")
    @TestCase("af()[i()][i()] **= of().p.d", "o=3;a=[7,216.0],[11,13];i=2")
    @TestCase("of().p.d |= af()[i()][i()]", "o=7;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d &= af()[i()][i()]", "o=2;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d ^= af()[i()][i()]", "o=5;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d <<= af()[i()][i()]", "o=192;a=[7,6],[11,13];i=2")
    @TestCase("of().p.d >>= af()[i()][i()]", "o=0;a=[7,6],[11,13];i=2")
    @Test("Operator assignment to complex deep property statements")
    public opComplexDeepPropAssignmentStatement(statement: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: {d: 3}};
            let a = [[7, 6], [11, 13]];
            function of() { return o; }
            function af() { return a; }
            let _i = 0;
            function i() { return _i++; }
            ${statement};
            return \`o=\${o.p.d};a=[\${a[0][0]},\${a[0][1]}],[\${a[1][0]},\${a[1][1]}];i=\${_i}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++x", "4;x=4;y=6")
    @TestCase("x++", "3;x=4;y=6")
    @TestCase("--x", "2;x=2;y=6")
    @TestCase("x--", "3;x=2;y=6")
    @TestCase("x += y", "9;x=9;y=6")
    @TestCase("x -= y", "-3;x=-3;y=6")
    @TestCase("x *= y", "18;x=18;y=6")
    @TestCase("y /= x", "2.0;x=3;y=2.0")
    @TestCase("y %= x", "0;x=3;y=0")
    @TestCase("y **= x", "216.0;x=3;y=216.0")
    @TestCase("x |= y", "7;x=7;y=6")
    @TestCase("x &= y", "2;x=2;y=6")
    @TestCase("x ^= y", "5;x=5;y=6")
    @TestCase("x <<= y", "192;x=192;y=6")
    @TestCase("x >>= y", "0;x=0;y=6")
    @TestCase("x + (y += 7)", "16;x=3;y=13")
    @TestCase("x + (y += 7)", "16;x=3;y=13")
    @TestCase("x++ + (y += 7)", "16;x=4;y=13")
    @Test("Operator assignment expressions")
    public opAssignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let x = 3;
            let y = 6;
            const r = ${expression};
            return \`\${r};x=\${x};y=\${y}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++o.p", "4;o=4;a=6")
    @TestCase("o.p++", "3;o=4;a=6")
    @TestCase("--o.p", "2;o=2;a=6")
    @TestCase("o.p--", "3;o=2;a=6")
    @TestCase("o.p += a[0]", "9;o=9;a=6")
    @TestCase("o.p -= a[0]", "-3;o=-3;a=6")
    @TestCase("o.p *= a[0]", "18;o=18;a=6")
    @TestCase("a[0] /= o.p", "2.0;o=3;a=2.0")
    @TestCase("a[0] %= o.p", "0;o=3;a=0")
    @TestCase("a[0] **= o.p", "216.0;o=3;a=216.0")
    @TestCase("o.p |= a[0]", "7;o=7;a=6")
    @TestCase("o.p &= a[0]", "2;o=2;a=6")
    @TestCase("o.p ^= a[0]", "5;o=5;a=6")
    @TestCase("o.p <<= a[0]", "192;o=192;a=6")
    @TestCase("o.p >>= a[0]", "0;o=0;a=6")
    @TestCase("o.p + (a[0] += 7)", "16;o=3;a=13")
    @TestCase("o.p += (a[0] += 7)", "16;o=16;a=13")
    @TestCase("o.p++ + (a[0] += 7)", "16;o=4;a=13")
    @Test("Operator assignment to simple property expressions")
    public opSimplePropAssignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: 3};
            let a = [6];
            const r = ${expression};
            return \`\${r};o=\${o.p};a=\${a[0]}\``);
        Expect(result).toBe(expected);
    }

    @TestCase("++of().p", "4;o=4;a=6")
    @TestCase("of().p++", "3;o=4;a=6")
    @TestCase("--of().p", "2;o=2;a=6")
    @TestCase("of().p--", "3;o=2;a=6")
    @TestCase("of().p += af()[i()]", "9;o=9;a=6")
    @TestCase("of().p -= af()[i()]", "-3;o=-3;a=6")
    @TestCase("of().p *= af()[i()]", "18;o=18;a=6")
    @TestCase("af()[i()] /= of().p", "2.0;o=3;a=2.0")
    @TestCase("af()[i()] %= of().p", "0;o=3;a=0")
    @TestCase("af()[i()] **= of().p", "216.0;o=3;a=216.0")
    @TestCase("of().p |= af()[i()]", "7;o=7;a=6")
    @TestCase("of().p &= af()[i()]", "2;o=2;a=6")
    @TestCase("of().p ^= af()[i()]", "5;o=5;a=6")
    @TestCase("of().p <<= af()[i()]", "192;o=192;a=6")
    @TestCase("of().p >>= af()[i()]", "0;o=0;a=6")
    @TestCase("of().p + (af()[i()] += 7)", "16;o=3;a=13")
    @TestCase("of().p += (af()[i()] += 7)", "16;o=16;a=13")
    @TestCase("of().p++ + (af()[i()] += 7)", "16;o=4;a=13")
    @Test("Operator assignment to complex property expressions")
    public opComplexPropAssignmentExpression(expression: string, expected: string): void {
        const result = util.transpileAndExecute(
            `let o = {p: 3};
            let a = [6];
            function of() { return o; }
            function af() { return a; }
            function i() { return 0; }
            const r = ${expression};
            return \`\${r};o=\${o.p};a=\${a[0]}\``);
        Expect(result).toBe(expected);
    }
}
