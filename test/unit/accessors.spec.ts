import * as util from "../util";

test("get accessor", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        const f = new Foo();
        return f.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("get accessor in base class", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        class Bar extends Foo {}
        const b = new Bar();
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("get accessor override", () => {
    const code = `
        class Foo {
            _foo = "foo";
            foo = "foo";
        }
        class Bar extends Foo {
            get foo() { return this._foo + "bar"; }
        }
        const b = new Bar();
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("get accessor overridden", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        class Bar extends Foo {
            foo = "bar";
        }
        const b = new Bar();
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("get accessor override accessor", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        class Bar extends Foo {
            _bar = "bar";
            get foo() { return this._bar; }
        }
        const b = new Bar();
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("get accessor from interface", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        interface Bar {
            readonly foo: string;
        }
        const b: Bar = new Foo();
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("set accessor", () => {
    const code = `
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = val; }
        }
        const f = new Foo();
        f.foo = "bar"
        return f._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("set accessor in base class", () => {
    const code = `
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        const b = new Bar();
        b.foo = "bar"
        return b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("set accessor override", () => {
    const code = `
        class Foo {
            _foo = "foo";
            foo = "foo";
        }
        class Bar extends Foo {
            set foo(val: string) { this._foo = val; }
        }
        const b = new Bar();
        b.foo = "bar"
        return b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("set accessor overridden", () => {
    const code = `
        class Foo {
            _foo = "baz";
            set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {
            foo = "foo"; // triggers base class setter
        }
        const b = new Bar();
        const fooOriginal = b._foo;
        b.foo = "bar"
        return fooOriginal + b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("set accessor override accessor", () => {
    const code = `
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = "foo"; }
        }
        class Bar extends Foo {
            set foo(val: string) { this._foo = val; }
        }
        const b = new Bar();
        b.foo = "bar"
        return b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("set accessor from interface", () => {
    const code = `
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = val; }
        }
        interface Bar {
            _foo: string;
            foo: string;
        }
        const b: Bar = new Foo();
        b.foo = "bar"
        return b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("get/set accessors", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
            set foo(val: string) { this._foo = val; }
        }
        const f = new Foo();
        const fooOriginal = f.foo;
        f.foo = "bar";
        return fooOriginal + f.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("get/set accessors in base class", () => {
    const code = `
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
            set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        const b = new Bar();
        const fooOriginal = b.foo;
        b.foo = "bar"
        return fooOriginal + b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("static get accessor", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        return Foo.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("static get accessor in base class", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        class Bar extends Foo {}
        return Bar.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("static get accessor override", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static foo = "foo";
        }
        class Bar extends Foo {
            static get foo() { return this._foo + "bar"; }
        }
        return Bar.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("static get accessor overridden", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        class Bar extends Foo {
            static foo = "bar";
        }
        return Bar.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static get accessor override accessor", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        class Bar extends Foo {
            static _bar = "bar";
            static get foo() { return this._bar; }
        }
        return Bar.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static get accessor from interface", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        interface Bar {
            readonly foo: string;
        }
        const b: Bar = Foo;
        return b.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("static set accessor", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = val; }
        }
        Foo.foo = "bar"
        return Foo._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static set accessor in base class", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        Bar.foo = "bar"
        return Bar._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static set accessor override", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static foo = "foo";
        }
        class Bar extends Foo {
            static set foo(val: string) { this._foo = val; }
        }
        Bar.foo = "bar"
        return Bar._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static set accessor overridden", () => {
    const code = `
        class Foo {
            static _foo = "baz";
            static set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {
            static foo = "foo"; // triggers base class setter
        }
        const fooOriginal = Bar._foo;
        Bar.foo = "bar"
        return fooOriginal + Bar._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("static set accessor override accessor", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = "foo"; }
        }
        class Bar extends Foo {
            static set foo(val: string) { this._foo = val; }
        }
        Bar.foo = "bar"
        return Bar._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static set accessor from interface", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = val; }
        }
        interface Bar {
            _foo: string;
            foo: string;
        }
        const b: Bar = Foo;
        b.foo = "bar"
        return b._foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("bar");
});

test("static get/set accessors", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
            static set foo(val: string) { this._foo = val; }
        }
        const fooOriginal = Foo.foo;
        Foo.foo = "bar";
        return fooOriginal + Foo.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("static get/set accessors in base class", () => {
    const code = `
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
            static set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        const fooOriginal = Bar.foo;
        Bar.foo = "bar"
        return fooOriginal + Bar.foo;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});
