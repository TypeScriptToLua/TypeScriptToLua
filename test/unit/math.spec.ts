import * as util from "../util";

test.each([
    { inp: "Math.cos()", expected: "math.cos()" },
    { inp: "Math.sin()", expected: "math.sin()" },
    { inp: "Math.min()", expected: "math.min()" },
    { inp: "Math.atan2(2, 3)", expected: "math.atan(2 / 3)" },
    { inp: "Math.log2(3)", expected: `(function() return math.log(3) / ${Math.LN2} end)()` },
    { inp: "Math.log10(3)", expected: `(function() return math.log(3) / ${Math.LN10} end)()` },
    { inp: "const x = Math.log2(3)", expected: `local x = (math.log(3) / ${Math.LN2})` },
    { inp: "const x = Math.log10(3)", expected: `local x = (math.log(3) / ${Math.LN10})` },
    { inp: "Math.log1p(3)", expected: "math.log(1 + 3)" },
    { inp: "Math.round(3.3)", expected: "math.floor(3.3 + 0.5)" },
    { inp: "Math.PI", expected: "local ____ = math.pi" },
])("Math (%p)", ({ inp, expected }) => {
    const lua = util.transpileString(inp);

    expect(lua).toBe(expected);
});

test.each(["E", "LN10", "LN2", "LOG10E", "LOG2E", "SQRT1_2", "SQRT2"])(
    "Math constant (%p)",
    constant => {
        const epsilon = 0.000001;
        const jsValue: number = (Math as Math & {[key: string]: any})[constant];
        const code = `return Math.abs(Math.${constant} - ${jsValue}) <= ${epsilon}`;
        expect(util.transpileAndExecute(code)).toBe(true);
    },
);

test.each([
    { statement: "++x", expected: "x=4;y=6" },
    { statement: "x++", expected: "x=4;y=6" },
    { statement: "--x", expected: "x=2;y=6" },
    { statement: "x--", expected: "x=2;y=6" },
    { statement: "x += y", expected: "x=9;y=6" },
    { statement: "x -= y", expected: "x=-3;y=6" },
    { statement: "x *= y", expected: "x=18;y=6" },
    { statement: "y /= x", expected: "x=3;y=2.0" },
    { statement: "y %= x", expected: "x=3;y=0" },
    { statement: "y **= x", expected: "x=3;y=216.0" },
    { statement: "x |= y", expected: "x=7;y=6" },
    { statement: "x &= y", expected: "x=2;y=6" },
    { statement: "x ^= y", expected: "x=5;y=6" },
    { statement: "x <<= y", expected: "x=192;y=6" },
    { statement: "x >>>= y", expected: "x=0;y=6" },
])("Operator assignment statements (%p)", ({ statement, expected }) => {
    const result = util.transpileAndExecute(
        `let x = 3;
        let y = 6;
        ${statement};
        return \`x=\${x};y=\${y}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { statement: "++o.p", expected: "o=4;a=6" },
    { statement: "o.p++", expected: "o=4;a=6" },
    { statement: "--o.p", expected: "o=2;a=6" },
    { statement: "o.p--", expected: "o=2;a=6" },
    { statement: "o.p += a[0]", expected: "o=9;a=6" },
    { statement: "o.p -= a[0]", expected: "o=-3;a=6" },
    { statement: "o.p *= a[0]", expected: "o=18;a=6" },
    { statement: "a[0] /= o.p", expected: "o=3;a=2.0" },
    { statement: "a[0] %= o.p", expected: "o=3;a=0" },
    { statement: "a[0] **= o.p", expected: "o=3;a=216.0" },
    { statement: "o.p |= a[0]", expected: "o=7;a=6" },
    { statement: "o.p &= a[0]", expected: "o=2;a=6" },
    { statement: "o.p ^= a[0]", expected: "o=5;a=6" },
    { statement: "o.p <<= a[0]", expected: "o=192;a=6" },
    { statement: "o.p >>>= a[0]", expected: "o=0;a=6" },
])("Operator assignment to simple property statements (%p)", ({ statement, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: 3};
        let a = [6];
        ${statement};
        return \`o=\${o.p};a=\${a[0]}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { statement: "++o.p.d", expected: "o=4;a=[6,11],[7,13]" },
    { statement: "o.p.d++", expected: "o=4;a=[6,11],[7,13]" },
    { statement: "--o.p.d", expected: "o=2;a=[6,11],[7,13]" },
    { statement: "o.p.d--", expected: "o=2;a=[6,11],[7,13]" },
    { statement: "o.p.d += a[0][0]", expected: "o=9;a=[6,11],[7,13]" },
    { statement: "o.p.d -= a[0][0]", expected: "o=-3;a=[6,11],[7,13]" },
    { statement: "o.p.d *= a[0][0]", expected: "o=18;a=[6,11],[7,13]" },
    { statement: "a[0][0] /= o.p.d", expected: "o=3;a=[2.0,11],[7,13]" },
    { statement: "a[0][0] %= o.p.d", expected: "o=3;a=[0,11],[7,13]" },
    { statement: "a[0][0] **= o.p.d", expected: "o=3;a=[216.0,11],[7,13]" },
    { statement: "o.p.d |= a[0][0]", expected: "o=7;a=[6,11],[7,13]" },
    { statement: "o.p.d &= a[0][0]", expected: "o=2;a=[6,11],[7,13]" },
    { statement: "o.p.d ^= a[0][0]", expected: "o=5;a=[6,11],[7,13]" },
    { statement: "o.p.d <<= a[0][0]", expected: "o=192;a=[6,11],[7,13]" },
    { statement: "o.p.d >>>= a[0][0]", expected: "o=0;a=[6,11],[7,13]" },
])("Operator assignment to deep property statements (%p)", ({ statement, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: {d: 3}};
        let a = [[6,11], [7,13]];
        ${statement};
        return \`o=\${o.p.d};a=[\${a[0][0]},\${a[0][1]}],[\${a[1][0]},\${a[1][1]}]\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { statement: "++of().p", expected: "o=4;a=6" },
    { statement: "of().p++", expected: "o=4;a=6" },
    { statement: "--of().p", expected: "o=2;a=6" },
    { statement: "of().p--", expected: "o=2;a=6" },
    { statement: "of().p += af()[i()]", expected: "o=9;a=6" },
    { statement: "of().p -= af()[i()]", expected: "o=-3;a=6" },
    { statement: "of().p *= af()[i()]", expected: "o=18;a=6" },
    { statement: "af()[i()] /= of().p", expected: "o=3;a=2.0" },
    { statement: "af()[i()] %= of().p", expected: "o=3;a=0" },
    { statement: "af()[i()] **= of().p", expected: "o=3;a=216.0" },
    { statement: "of().p |= af()[i()]", expected: "o=7;a=6" },
    { statement: "of().p &= af()[i()]", expected: "o=2;a=6" },
    { statement: "of().p ^= af()[i()]", expected: "o=5;a=6" },
    { statement: "of().p <<= af()[i()]", expected: "o=192;a=6" },
    { statement: "of().p >>>= af()[i()]", expected: "o=0;a=6" },
])("Operator assignment to complex property statements (%p)", ({ statement, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: 3};
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        ${statement};
        return \`o=\${o.p};a=\${a[0]}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { statement: "++of().p.d", expected: "o=4;a=[7,6],[11,13];i=0" },
    { statement: "of().p.d++", expected: "o=4;a=[7,6],[11,13];i=0" },
    { statement: "--of().p.d", expected: "o=2;a=[7,6],[11,13];i=0" },
    { statement: "of().p.d--", expected: "o=2;a=[7,6],[11,13];i=0" },
    { statement: "of().p.d += af()[i()][i()]", expected: "o=9;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d -= af()[i()][i()]", expected: "o=-3;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d *= af()[i()][i()]", expected: "o=18;a=[7,6],[11,13];i=2" },
    { statement: "af()[i()][i()] /= of().p.d", expected: "o=3;a=[7,2.0],[11,13];i=2" },
    { statement: "af()[i()][i()] %= of().p.d", expected: "o=3;a=[7,0],[11,13];i=2" },
    { statement: "af()[i()][i()] **= of().p.d", expected: "o=3;a=[7,216.0],[11,13];i=2" },
    { statement: "of().p.d |= af()[i()][i()]", expected: "o=7;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d &= af()[i()][i()]", expected: "o=2;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d ^= af()[i()][i()]", expected: "o=5;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d <<= af()[i()][i()]", expected: "o=192;a=[7,6],[11,13];i=2" },
    { statement: "of().p.d >>>= af()[i()][i()]", expected: "o=0;a=[7,6],[11,13];i=2" },
])("Operator assignment to complex deep property statements (%p)", ({ statement, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: {d: 3}};
        let a = [[7, 6], [11, 13]];
        function of() { return o; }
        function af() { return a; }
        let _i = 0;
        function i() { return _i++; }
        ${statement};
        return \`o=\${o.p.d};a=[\${a[0][0]},\${a[0][1]}],[\${a[1][0]},\${a[1][1]}];i=\${_i}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { expression: "++x", expected: "4;x=4;y=6" },
    { expression: "x++", expected: "3;x=4;y=6" },
    { expression: "--x", expected: "2;x=2;y=6" },
    { expression: "x--", expected: "3;x=2;y=6" },
    { expression: "x += y", expected: "9;x=9;y=6" },
    { expression: "x -= y", expected: "-3;x=-3;y=6" },
    { expression: "x *= y", expected: "18;x=18;y=6" },
    { expression: "y /= x", expected: "2.0;x=3;y=2.0" },
    { expression: "y %= x", expected: "0;x=3;y=0" },
    { expression: "y **= x", expected: "216.0;x=3;y=216.0" },
    { expression: "x |= y", expected: "7;x=7;y=6" },
    { expression: "x &= y", expected: "2;x=2;y=6" },
    { expression: "x ^= y", expected: "5;x=5;y=6" },
    { expression: "x <<= y", expected: "192;x=192;y=6" },
    { expression: "x >>>= y", expected: "0;x=0;y=6" },
    { expression: "x + (y += 7)", expected: "16;x=3;y=13" },
    { expression: "x + (y += 7)", expected: "16;x=3;y=13" },
    { expression: "x++ + (y += 7)", expected: "16;x=4;y=13" },
])("Operator assignment expressions (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let x = 3;
        let y = 6;
        const r = ${expression};
        return \`\${r};x=\${x};y=\${y}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { expression: "++o.p", expected: "4;o=4;a=6" },
    { expression: "o.p++", expected: "3;o=4;a=6" },
    { expression: "--o.p", expected: "2;o=2;a=6" },
    { expression: "o.p--", expected: "3;o=2;a=6" },
    { expression: "o.p += a[0]", expected: "9;o=9;a=6" },
    { expression: "o.p -= a[0]", expected: "-3;o=-3;a=6" },
    { expression: "o.p *= a[0]", expected: "18;o=18;a=6" },
    { expression: "a[0] /= o.p", expected: "2.0;o=3;a=2.0" },
    { expression: "a[0] %= o.p", expected: "0;o=3;a=0" },
    { expression: "a[0] **= o.p", expected: "216.0;o=3;a=216.0" },
    { expression: "o.p |= a[0]", expected: "7;o=7;a=6" },
    { expression: "o.p &= a[0]", expected: "2;o=2;a=6" },
    { expression: "o.p ^= a[0]", expected: "5;o=5;a=6" },
    { expression: "o.p <<= a[0]", expected: "192;o=192;a=6" },
    { expression: "o.p >>>= a[0]", expected: "0;o=0;a=6" },
    { expression: "o.p + (a[0] += 7)", expected: "16;o=3;a=13" },
    { expression: "o.p += (a[0] += 7)", expected: "16;o=16;a=13" },
    { expression: "o.p++ + (a[0] += 7)", expected: "16;o=4;a=13" },
])("Operator assignment to simple property expressions (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: 3};
        let a = [6];
        const r = ${expression};
        return \`\${r};o=\${o.p};a=\${a[0]}\``,
    );
    expect(result).toBe(expected);
});

test.each([
    { expression: "++of().p", expected: "4;o=4;a=6" },
    { expression: "of().p++", expected: "3;o=4;a=6" },
    { expression: "--of().p", expected: "2;o=2;a=6" },
    { expression: "of().p--", expected: "3;o=2;a=6" },
    { expression: "of().p += af()[i()]", expected: "9;o=9;a=6" },
    { expression: "of().p -= af()[i()]", expected: "-3;o=-3;a=6" },
    { expression: "of().p *= af()[i()]", expected: "18;o=18;a=6" },
    { expression: "af()[i()] /= of().p", expected: "2.0;o=3;a=2.0" },
    { expression: "af()[i()] %= of().p", expected: "0;o=3;a=0" },
    { expression: "af()[i()] **= of().p", expected: "216.0;o=3;a=216.0" },
    { expression: "of().p |= af()[i()]", expected: "7;o=7;a=6" },
    { expression: "of().p &= af()[i()]", expected: "2;o=2;a=6" },
    { expression: "of().p ^= af()[i()]", expected: "5;o=5;a=6" },
    { expression: "of().p <<= af()[i()]", expected: "192;o=192;a=6" },
    { expression: "of().p >>>= af()[i()]", expected: "0;o=0;a=6" },
    { expression: "of().p + (af()[i()] += 7)", expected: "16;o=3;a=13" },
    { expression: "of().p += (af()[i()] += 7)", expected: "16;o=16;a=13" },
    { expression: "of().p++ + (af()[i()] += 7)", expected: "16;o=4;a=13" },
])("Operator assignment to complex property expressions (%p)", ({ expression, expected }) => {
    const result = util.transpileAndExecute(
        `let o = {p: 3};
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        const r = ${expression};
        return \`\${r};o=\${o.p};a=\${a[0]}\``,
    );
    expect(result).toBe(expected);
});
