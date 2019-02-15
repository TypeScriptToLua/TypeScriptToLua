import { Expect, Test } from "alsatian";
import * as util from "../src/util";

export class AccessorTests {
    @Test("get accessor")
    public getAccessor(): void {
        const code =
            `class Foo {
                get foo() { return "foo"; }
            }
            const f = new Foo();
            return f.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("get accessor in base class")
    public getAccessorInBaseClass(): void {
        const code =
            `class Foo {
                get foo() { return "foo"; }
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
                foo = "foo";
            }
            class Bar extends Foo {
                get foo() { return "bar"; }
            }
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("get accessor overridden")
    public getAccessorOverridden(): void {
        const code =
            `class Foo {
                get foo() { return "foo"; }
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
                get foo() { return "foo"; }
            }
            class Bar extends Foo {
                get foo() { return "bar"; }
            }
            const b = new Bar();
            return b.foo;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("get accessor from interface")
    public getAccessorFromINterface(): void {
        const code =
            `class Foo {
                get foo() { return "foo"; }
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
                prop = "prop";
                set foo(val: string) { this.prop = val; }
            }
            const f = new Foo();
            f.foo = "bar"
            return f.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor in base class")
    public setAccessorInBaseClass(): void {
        const code =
            `class Foo {
                prop = "prop";
                set foo(val: string) { this.prop = val; }
            }
            class Bar extends Foo {}
            const b = new Bar();
            b.foo = "bar"
            return b.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor override")
    public setAccessorOverride(): void {
        const code =
            `class Foo {
                prop = "prop";
                foo = "foo";
            }
            class Bar extends Foo {
                set foo(val: string) { this.prop = val; }
            }
            const b = new Bar();
            b.foo = "bar"
            return b.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor overridden")
    public setAccessorOverridden(): void {
        const code =
            `class Foo {
                prop = "prop";
                set foo(val: string) { this.prop = val; }
            }
            class Bar extends Foo {
                foo = "foo"; // triggers base class setter
            }
            const b = new Bar();
            const propOriginal = b.prop;
            b.foo = "bar"
            return propOriginal + b.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("set accessor override accessor")
    public setAccessorOverrideAccessor(): void {
        const code =
            `class Foo {
                prop = "prop";
                set foo(val: string) { this.prop = "foo"; }
            }
            class Bar extends Foo {
                set foo(val: string) { this.prop = val; }
            }
            const b = new Bar();
            b.foo = "bar"
            return b.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }

    @Test("set accessor from interface")
    public setAccessorFromInterface(): void {
        const code =
            `class Foo {
                prop = "prop";
                set foo(val: string) { this.prop = val; }
            }
            interface Bar {
                prop: string;
                foo: string;
            }
            const b: Bar = new Foo();
            b.foo = "bar"
            return b.prop;`;
        Expect(util.transpileAndExecute(code)).toBe("bar");
    }
}
