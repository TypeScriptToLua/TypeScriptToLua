import * as util from "../../util";

test("get accessor", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        const f = new Foo();
        return f.foo;
    `.expectToMatchJsResult();
});

test("get accessor in base class", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        class Bar extends Foo {}
        const b = new Bar();
        return b.foo;
    `.expectToMatchJsResult();
});

test("get accessor override accessor", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("get accessor override accessor (multiple)", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        class Bar extends Foo {
            _bar = "bar";
            get foo() { return this._bar; }
        }
        class Baz extends Foo {
            _baz = "baz";
            get foo() { return this._baz; }
        }
        const bar = new Bar();
        const baz = new Baz();
        return bar.foo + baz.foo;
    `.expectToMatchJsResult();
});

test("get accessor from interface", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
        }
        interface Bar {
            readonly foo: string;
        }
        const b: Bar = new Foo();
        return b.foo;
    `.expectToMatchJsResult();
});

test("set accessor", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = val; }
        }
        const f = new Foo();
        f.foo = "bar"
        return f._foo;
    `.expectToMatchJsResult();
});

test("set accessor in base class", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        const b = new Bar();
        b.foo = "bar"
        return b._foo;
    `.expectToMatchJsResult();
});

test("set accessor override accessor", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("set accessor from interface", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("get/set accessors", () => {
    util.testFunction`
        class Foo {
            _foo = "foo";
            get foo() { return this._foo; }
            set foo(val: string) { this._foo = val; }
        }
        const f = new Foo();
        const fooOriginal = f.foo;
        f.foo = "bar";
        return fooOriginal + f.foo;
    `.expectToMatchJsResult();
});

test("get/set accessors in base class", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("static get accessor", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        return Foo.foo;
    `.expectToMatchJsResult();
});

test("static get accessor in base class", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        class Bar extends Foo {}
        return Bar.foo;
    `.expectToMatchJsResult();
});

test("static get accessor override", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static foo = "foo";
        }
        class Bar extends Foo {
            static get foo() { return this._foo + "bar"; }
        }
        return Bar.foo;
    `.expectToMatchJsResult();
});

test("static get accessor override accessor", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        class Bar extends Foo {
            static _bar = "bar";
            static get foo() { return this._bar; }
        }
        return Bar.foo;
    `.expectToMatchJsResult();
});

test("static get accessor from interface", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
        }
        interface Bar {
            readonly foo: string;
        }
        const b: Bar = Foo;
        return b.foo;
    `.expectToMatchJsResult();
});

test("static set accessor", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = val; }
        }
        Foo.foo = "bar"
        return Foo._foo;
    `.expectToMatchJsResult();
});

test("static set accessor in base class", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        Bar.foo = "bar"
        return Bar._foo;
    `.expectToMatchJsResult();
});

test("static set accessor override", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static foo = "foo";
        }
        class Bar extends Foo {
            static set foo(val: string) { this._foo = val; }
        }
        Bar.foo = "bar"
        return Bar._foo;
    `.expectToMatchJsResult();
});

test("static set accessor overridden", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("static set accessor override accessor", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static set foo(val: string) { this._foo = "foo"; }
        }
        class Bar extends Foo {
            static set foo(val: string) { this._foo = val; }
        }
        Bar.foo = "bar"
        return Bar._foo;
    `.expectToMatchJsResult();
});

test("static set accessor from interface", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("static get/set accessors", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
            static set foo(val: string) { this._foo = val; }
        }
        const fooOriginal = Foo.foo;
        Foo.foo = "bar";
        return fooOriginal + Foo.foo;
    `.expectToMatchJsResult();
});

test("static get/set accessors in base class", () => {
    util.testFunction`
        class Foo {
            static _foo = "foo";
            static get foo() { return this._foo; }
            static set foo(val: string) { this._foo = val; }
        }
        class Bar extends Foo {}
        const fooOriginal = Bar.foo;
        Bar.foo = "bar"
        return fooOriginal + Bar.foo;
    `.expectToMatchJsResult();
});
