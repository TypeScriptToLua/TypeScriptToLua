import { Expect, Test } from "alsatian";
import * as util from "../src/util";

export class AccessorTests {
    @Test("get accessor")
    public getAccessor(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
            }
            const f = new Foo();
            return f.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("get accessor in base class")
    public getAccessorInBaseClass(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
            }
            class Bar extends Foo {}
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("get accessor override")
    public getAccessorOverride(): void {
        const code =
            `class Foo {
                _foo = "foo";
                foo = "foo";
            }
            class Bar extends Foo {
                get foo() { return this._foo + "bar"; }
            }
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("get accessor overridden")
    public getAccessorOverridden(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
            }
            class Bar extends Foo {
                foo = "bar";
            }
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("get accessor override accessor")
    public getAccessorOverrideAccessor(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
            }
            class Bar extends Foo {
                _bar = "bar";
                get foo() { return this._bar; }
            }
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("get accessor from interface")
    public getAccessorFromINterface(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
            }
            interface Bar {
                readonly foo: string;
            }
            const b: Bar = new Foo();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("set accessor")
    public setAccessor(): void {
        const code =
            `class Foo {
                _foo = "foo";
                set foo(val: string) { this._foo = val; }
            }
            const f = new Foo();
            f.foo = "bar"
            return f._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor in base class")
    public setAccessorInBaseClass(): void {
        const code =
            `class Foo {
                _foo = "foo";
                set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {}
            const b = new Bar();
            b.foo = "bar"
            return b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor override")
    public setAccessorOverride(): void {
        const code =
            `class Foo {
                _foo = "foo";
                foo = "foo";
            }
            class Bar extends Foo {
                set foo(val: string) { this._foo = val; }
            }
            const b = new Bar();
            b.foo = "bar"
            return b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor overridden")
    public setAccessorOverridden(): void {
        const code =
            `class Foo {
                _foo = "baz";
                set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {
                foo = "foo"; // triggers base class setter
            }
            const b = new Bar();
            const fooOriginal = b._foo;
            b.foo = "bar"
            return fooOriginal + b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("set accessor override accessor")
    public setAccessorOverrideAccessor(): void {
        const code =
            `class Foo {
                _foo = "foo";
                set foo(val: string) { this._foo = "foo"; }
            }
            class Bar extends Foo {
                set foo(val: string) { this._foo = val; }
            }
            const b = new Bar();
            b.foo = "bar"
            return b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor from interface")
    public setAccessorFromInterface(): void {
        const code =
            `class Foo {
                _foo = "foo";
                set foo(val: string) { this._foo = val; }
            }
            interface Bar {
                _foo: string;
                foo: string;
            }
            const b: Bar = new Foo();
            b.foo = "bar"
            return b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("get/set accessors")
    public getSetAccessor(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
                set foo(val: string) { this._foo = val; }
            }
            const f = new Foo();
            const fooOriginal = f.foo;
            f.foo = "bar";
            return fooOriginal + f.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("get/set accessors in base class")
    public getSetAccessorInBaseClass(): void {
        const code =
            `class Foo {
                _foo = "foo";
                get foo() { return this._foo; }
                set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {}
            const b = new Bar();
            const fooOriginal = b.foo;
            b.foo = "bar"
            return fooOriginal + b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("static get accessor")
    public staticGetAccessor(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
            }
            return Foo.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("static get accessor in base class")
    public staticGetAccessorInBaseClass(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
            }
            class Bar extends Foo {}
            return Bar.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("static get accessor override")
    public staticGetAccessorOverride(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static foo = "foo";
            }
            class Bar extends Foo {
                static get foo() { return this._foo + "bar"; }
            }
            return Bar.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("static get accessor overridden")
    public staticGetAccessorOverridden(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
            }
            class Bar extends Foo {
                static foo = "bar";
            }
            return Bar.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static get accessor override accessor")
    public staticGetAccessorOverrideAccessor(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
            }
            class Bar extends Foo {
                static _bar = "bar";
                static get foo() { return this._bar; }
            }
            return Bar.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static get accessor from interface")
    public staticGetAccessorFromINterface(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
            }
            interface Bar {
                readonly foo: string;
            }
            const b: Bar = Foo;
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("static set accessor")
    public staticSetAccessor(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static set foo(val: string) { this._foo = val; }
            }
            Foo.foo = "bar"
            return Foo._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static set accessor in base class")
    public staticSetAccessorInBaseClass(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {}
            Bar.foo = "bar"
            return Bar._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static set accessor override")
    public staticSetAccessorOverride(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static foo = "foo";
            }
            class Bar extends Foo {
                static set foo(val: string) { this._foo = val; }
            }
            Bar.foo = "bar"
            return Bar._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static set accessor overridden")
    public staticSetAccessorOverridden(): void {
        const code =
            `class Foo {
                static _foo = "baz";
                static set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {
                static foo = "foo"; // triggers base class setter
            }
            const fooOriginal = Bar._foo;
            Bar.foo = "bar"
            return fooOriginal + Bar._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("static set accessor override accessor")
    public staticSetAccessorOverrideAccessor(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static set foo(val: string) { this._foo = "foo"; }
            }
            class Bar extends Foo {
                static set foo(val: string) { this._foo = val; }
            }
            Bar.foo = "bar"
            return Bar._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static set accessor from interface")
    public staticSetAccessorFromInterface(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static set foo(val: string) { this._foo = val; }
            }
            interface Bar {
                _foo: string;
                foo: string;
            }
            const b: Bar = Foo;
            b.foo = "bar"
            return b._foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("static get/set accessors")
    public staticGetSetAccessor(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
                static set foo(val: string) { this._foo = val; }
            }
            const fooOriginal = Foo.foo;
            Foo.foo = "bar";
            return fooOriginal + Foo.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("static get/set accessors in base class")
    public staticGetSetAccessorInBaseClass(): void {
        const code =
            `class Foo {
                static _foo = "foo";
                static get foo() { return this._foo; }
                static set foo(val: string) { this._foo = val; }
            }
            class Bar extends Foo {}
            const fooOriginal = Bar.foo;
            Bar.foo = "bar"
            return fooOriginal + Bar.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }
}
