import * as util from "../util";

test.each([
    "Math.cos()",
    "Math.sin()",
    "Math.min()",
    "Math.atan2(2, 3)",
    "Math.log2(3)",
    "Math.log10(3)",
    "const x = Math.log2(3)",
    "const x = Math.log10(3)",
    "Math.log1p(3)",
    "Math.round(3.3)",
    "Math.PI",
])("Math (%p)", code => {
    // TODO: Remove?
    util.testFunction(code)
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(["E", "LN10", "LN2", "LOG10E", "LOG2E", "SQRT1_2", "SQRT2"])("Math constant (%p)", constant => {
    util.testExpression`Math.${constant}`.tap(builder => {
        expect(builder.getLuaExecutionResult()).toBeCloseTo(builder.getJsExecutionResult());
    });
});

test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
])("Operator assignment statements (%p)", statement => {
    util.testFunction`
        let x = 3;
        let y = 6;
        ${statement};
        return { x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
])("Operator assignment to simple property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p.d",
    "o.p.d++",
    "--o.p.d",
    "o.p.d--",
    "o.p.d += a[0][0]",
    "o.p.d -= a[0][0]",
    "o.p.d *= a[0][0]",
    "a[0][0] /= o.p.d",
    "a[0][0] %= o.p.d",
    "a[0][0] **= o.p.d",
    "o.p.d |= a[0][0]",
    "o.p.d &= a[0][0]",
    "o.p.d ^= a[0][0]",
    "o.p.d <<= a[0][0]",
    "o.p.d >>>= a[0][0]",
])("Operator assignment to deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[6,11], [7,13]];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
])("Operator assignment to complex property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p.d",
    "of().p.d++",
    "--of().p.d",
    "of().p.d--",
    "of().p.d += af()[i()][i()]",
    "of().p.d -= af()[i()][i()]",
    "of().p.d *= af()[i()][i()]",
    "af()[i()][i()] /= of().p.d",
    "af()[i()][i()] %= of().p.d",
    "af()[i()][i()] **= of().p.d",
    "of().p.d |= af()[i()][i()]",
    "of().p.d &= af()[i()][i()]",
    "of().p.d ^= af()[i()][i()]",
    "of().p.d <<= af()[i()][i()]",
    "of().p.d >>>= af()[i()][i()]",
])("Operator assignment to complex deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[7, 6], [11, 13]];
        function of() { return o; }
        function af() { return a; }
        let _i = 0;
        function i() { return _i++; }
        ${statement};
        return { o, a, _i };
    `.expectToMatchJsResult();
});

test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
    "x + (y += 7)",
    "x + (y += 7)",
    "x++ + (y += 7)",
])("Operator assignment expressions (%p)", expression => {
    util.testFunction`
        let x = 3;
        let y = 6;
        const r = ${expression};
        return { r, x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
    "o.p + (a[0] += 7)",
    "o.p += (a[0] += 7)",
    "o.p++ + (a[0] += 7)",
])("Operator assignment to simple property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
    "of().p + (af()[i()] += 7)",
    "of().p += (af()[i()] += 7)",
    "of().p++ + (af()[i()] += 7)",
])("Operator assignment to complex property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});
