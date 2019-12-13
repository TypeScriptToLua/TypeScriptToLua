import * as util from "../../util";

test("ClassFieldInitializer", () => {
    const result = util.transpileAndExecute(
        `class a {
            field: number = 4;
        }
        return new a().field;`
    );

    expect(result).toBe(4);
});

test("ClassNumericLiteralFieldInitializer", () => {
    const result = util.transpileAndExecute(
        `class a {
            1: number = 4;
        }
        return new a()[1];`
    );

    expect(result).toBe(4);
});

test("ClassStringLiteralFieldInitializer", () => {
    const result = util.transpileAndExecute(
        `class a {
            "field": number = 4;
        }
        return new a()["field"];`
    );

    expect(result).toBe(4);
});

test("ClassComputedFieldInitializer", () => {
    const result = util.transpileAndExecute(
        `const field: "field" = "field";
        class a {
            [field]: number = 4;
        }
        return new a()[field];`
    );

    expect(result).toBe(4);
});

test("ClassConstructor", () => {
    const result = util.transpileAndExecute(
        `class a {
            field: number = 3;
            constructor(n: number) {
                this.field = n * 2;
            }
        }
        return new a(4).field;`
    );

    expect(result).toBe(8);
});

test("ClassConstructorAssignment", () => {
    const result = util.transpileAndExecute(
        `class a { constructor(public field: number) {} }
        return new a(4).field;`
    );

    expect(result).toBe(4);
});

test("ClassConstructorDefaultParameter", () => {
    const result = util.transpileAndExecute(
        `class a { public field: number; constructor(f: number = 3) { this.field = f; } }
        return new a().field;`
    );

    expect(result).toBe(3);
});

test("ClassConstructorAssignmentDefault", () => {
    const result = util.transpileAndExecute(
        `class a { constructor(public field: number = 3) { } }
        return new a().field;`
    );

    expect(result).toBe(3);
});

test("ClassConstructorPropertyInitiailizationOrder", () => {
    util.testFunction`
        class Test {
            public foo = this.bar;
            constructor(public bar: string) {}
        }
        return (new Test("baz")).foo;
    `.expectToMatchJsResult();
});

test("ClassConstructorPropertyInitiailizationFalsey", () => {
    util.testFunction`
        class Test {
            constructor(public foo = true) {}
        }
        return (new Test(false)).foo;
    `.expectToMatchJsResult();
});

test("ClassNewNoBrackets", () => {
    const result = util.transpileAndExecute(
        `class a {
            public field: number = 4;
            constructor() {}
        }
        let inst = new a;
        return inst.field;`
    );

    expect(result).toBe(4);
});

test("ClassStaticFields", () => {
    const result = util.transpileAndExecute(
        `class a { static field: number = 4; }
        return a.field;`
    );

    expect(result).toBe(4);
});

test("ClassStaticNumericLiteralFields", () => {
    const result = util.transpileAndExecute(
        `class a { static 1: number = 4; }
        return a[1];`
    );

    expect(result).toBe(4);
});

test("ClassStaticStringLiteralFields", () => {
    const result = util.transpileAndExecute(
        `class a { static "field": number = 4; }
        return a["field"];`
    );

    expect(result).toBe(4);
});

test("ClassStaticComputedFields", () => {
    const result = util.transpileAndExecute(
        `const field: "field" = "field";
        class a { static [field]: number = 4; }
        return a[field];`
    );

    expect(result).toBe(4);
});

test("classExtends", () => {
    const result = util.transpileAndExecute(
        `class a { field: number = 4; }
        class b extends a {}
        return new b().field;`
    );

    expect(result).toBe(4);
});

test("SubclassDefaultConstructor", () => {
    const result = util.transpileAndExecute(
        `class a {
            field: number;
            constructor(field: number) {
                this.field = field;
            }
        }
        class b extends a {}
        return new b(10).field;`
    );

    expect(result).toBe(10);
});

test("SubsubclassDefaultConstructor", () => {
    const result = util.transpileAndExecute(
        `class a {
            field: number;
            constructor(field: number) {
                this.field = field;
            }
        }
        class b extends a {}
        class c extends b {}
        return new c(10).field;`
    );

    expect(result).toBe(10);
});

test("SubclassConstructor", () => {
    const result = util.transpileAndExecute(
        `class a {
            field: number;
            constructor(field: number) {
                this.field = field;
            }
        }
        class b extends a {
            constructor(field: number) {
                super(field + 1);
            }
        }
        return new b(10).field;`
    );

    expect(result).toBe(11);
});

test("Subclass constructor across merged namespace", () => {
    const tsHeader = `
        namespace NS {
            export class Super {
                prop: string;
                constructor() {
                    this.prop = "foo";
                }
            }
        }
        namespace NS {
            export class Sub extends Super {
                constructor() {
                    super();
                }
            }
        }`;

    expect(util.transpileAndExecute("return (new NS.Sub()).prop", undefined, undefined, tsHeader)).toBe("foo");
});

test("classSuper", () => {
    const result = util.transpileAndExecute(
        `class a {
            public field: number = 4;
            constructor(n: number) {
                this.field = n;
            }
        }
        class b extends a {
            constructor() {
                super(5);
            }
        }
        return new b().field;`
    );

    expect(result).toBe(5);
});

test("classSuperSuper", () => {
    const result = util.transpileAndExecute(
        `class a {
            public field: number = 4;
            constructor(n: number) {
                this.field = n;
            }
        }
        class b extends a {
            constructor(n: number) {
                super(n * 2);
            }
        }
        class c extends b {
            constructor() {
                super(5);
            }
        }
        return new c().field;`
    );

    expect(result).toBe(10);
});

test("classSuperSkip", () => {
    const result = util.transpileAndExecute(
        `class a {
            public field: number = 4;
            constructor(n: number) {
                this.field = n;
            }
        }
        class b extends a {
        }
        class c extends b {
            constructor() {
                super(5);
            }
        }
        return new c().field;`
    );

    expect(result).toBe(5);
});

test("renamedClassExtends", () => {
    const result = util.transpileAndExecute(
        `const b = new B();
        return b.value;`,
        undefined,
        undefined,
        `namespace Classes {
            export class Base {
                public value: number;
                constructor(){ this.value = 3; }
            }
        }

        const A = Classes.Base;
        class B extends A {
            constructor(){ super(); }
        };`
    );

    expect(result).toBe(3);
});

test("ClassMethodCall", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("ClassNumericLiteralMethodCall", () => {
    const result = util.transpileAndExecute(
        `class a {
            public 1(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst[1]();`
    );

    expect(result).toBe(4);
});

test("ClassStringLiteralMethodCall", () => {
    const result = util.transpileAndExecute(
        `class a {
            public "method"(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst["method"]();`
    );

    expect(result).toBe(4);
});

test("ClassComputedMethodCall", () => {
    const result = util.transpileAndExecute(
        `const method: "method" = "method";
        class a {
            public [method](): number {
                return 4;
            }
        }
        let inst = new a();
        return inst[method]();`
    );

    expect(result).toBe(4);
});

test("ClassToString", () => {
    const result = util.transpileAndExecute(
        `class a {
            public toString(): string {
                return "instance of a";
            }
        }
        let inst = new a();
        return inst.toString();`
    );

    expect(result).toBe("instance of a");
});

test("HasOwnProperty true", () => {
    const result = util.transpileAndExecute(
        `class a {
            public test(): void {
            }
        }
        let inst = new a();
        inst["prop"] = 17;
        return inst.hasOwnProperty("prop");`
    );

    expect(result).toBe(true);
});

test("HasOwnProperty false", () => {
    const result = util.transpileAndExecute(
        `class a {
            public test(): void {
            }
        }
        let inst = new a();
        inst["prop"] = 17;
        return inst.hasOwnProperty("test");`
    );

    expect(result).toBe(false);
});

test("CastClassMethodCall", () => {
    const result = util.transpileAndExecute(
        `interface result
        {
            val : number;
        }
        class a {
            public method(out: result) {
                out.val += 2;
            }
        }
        let inst:any = new a();
        let result = {val : 0};
        (inst as a).method(result);
        (inst as a).method(result);
        return result.val;`
    );

    expect(result).toBe(4);
});

test("ClassPropertyFunctionThis", () => {
    const result = util.transpileAndExecute(
        `class a {
            constructor(private n: number) {}
            public method: () => number = () => this.n;
        }
        let inst = new a(4);
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("ClassInheritedMethodCall", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method(): number {
                return 4;
            }
        }
        class b extends a {}
        let inst = new b();
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("ClassDoubleInheritedMethodCall", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method(): number {
                return 4;
            }
        }
        class b extends a {}
        class c extends b {}
        let inst = new c();
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("ClassInheritedMethodCall2", () => {
    const result = util.transpileAndExecute(
        `class a {}
        class b extends a {
            public method(): number {
                return 4;
            }
        }
        class c extends b {}
        let inst = new c();
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("ClassMethodOverride", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method(): number {
                return 2;
            }
        }
        class b extends a {
            public method(): number {
                return 4;
            }
        }
        let inst = new b();
        return inst.method();`
    );

    expect(result).toBe(4);
});

test("methodDefaultParameters", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method(b: number, c: number = 5): number {
                return b + c;
            }
        }
        let inst = new a();
        return inst.method(4);`
    );

    expect(result).toBe(9);
});

test("CallSuperMethodNoArgs", () => {
    const result = util.transpileAndExecute(
        `class a {
            a: number
            constructor(n: number) {
                this.a = n;
            }
            public method() {
                return this.a;
            }
        }
        class b extends a {
            constructor(n: number) {
                super(n);
            }
            public method() {
                return super.method();
            }
        }
        let inst = new b(6);
        return inst.method();`
    );

    expect(result).toBe(6);
});

test("CallSuperMethodArgs", () => {
    const result = util.transpileAndExecute(
        `class a {
            a: number
            constructor(n: number) {
                this.a = n;
            }
            public method(n: number) {
                return this.a + n;
            }
        }
        class b extends a {
            constructor(n: number) {
                super(n);
            }
            public method(n: number) {
                return super.method(n);
            }
        }
        let inst = new b(6);
        return inst.method(4);`
    );

    expect(result).toBe(10);
});

test("CallSuperExpressionMethod", () => {
    const result = util.transpileAndExecute(
        `let i = 0;
        function make() {
            const j = i++;
            return class {
                constructor() {}
                method() {}
            };
        }
        class B extends make() {
            constructor() { super(); }
            method() { super.method(); }
        }
        const inst = new B();
        inst.method();
        inst.method();
        inst.method();
        return i;`
    );

    expect(result).toBe(1);
});

test("CallSuperSuperMethod", () => {
    const result = util.transpileAndExecute(
        `class a {
            a: number
            constructor(n: number) {
                this.a = n;
            }
            public method() {
                return this.a;
            }
        }
        class b extends a {
            constructor(n: number) {
                super(n);
            }
            public method() {
                return super.method();
            }
        }
        class c extends b {
            constructor(n: number) {
                super(n);
            }
            public method() {
                return super.method();
            }
        }
        let inst = new c(6);
        return inst.method();`
    );

    expect(result).toBe(6);
});

test("classExpression", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method() {
                return "instance of a";
            }
        }
        const b = class extends a {
            public method() {
                return "instance of b";
            }
        }
        let inst = new b();
        return inst.method();`
    );

    expect(result).toBe("instance of b");
});

test("Named Class Expression", () => {
    const result = util.transpileAndExecute(
        `const a = class MyClass {
            public method() {
                return "foo";
            }
        }
        let inst = new a();
        return inst.method();`
    );

    expect(result).toBe("foo");
});

test("classExpressionBaseClassMethod", () => {
    const result = util.transpileAndExecute(
        `class a {
            public method() {
                return 42;
            }
        }
        const b = class extends a {
        }
        let inst = new b();
        return inst.method();`
    );

    expect(result).toBe(42);
});

test("Class Method Runtime Override", () => {
    const result = util.transpileAndExecute(
        `class MyClass {
            method(): number {
                return 4;
          }
        }

        let inst = new MyClass();
        inst.method = () => {
            return 8;
        }
        return inst.method();`
    );

    expect(result).toBe(8);
});

test("Exported class super call", () => {
    const code = `
        export class Foo {
            prop: string;
            constructor(prop: string) { this.prop = prop; }
        }
        export class Bar extends Foo {
            constructor() {
                super("bar");
            }
        }
        export const baz = (new Bar()).prop;
    `;
    expect(util.transpileExecuteAndReturnExport(code, "baz")).toBe("bar");
});

test.each([
    { input: "(new Foo())", expectResult: "foo" },
    { input: "Foo", expectResult: "bar" },
])("Class method name collision (%p)", ({ input, expectResult }) => {
    const code = `
        class Foo {
            public method() { return "foo"; }
            public static method() { return "bar"; }
        }
        return ${input}.method();
    `;
    expect(util.transpileAndExecute(code)).toBe(expectResult);
});

test("Class static instance of self", () => {
    const code = `
        class Foo {
            bar = "foobar";
            static instance = new Foo();
        }
        return Foo.instance.bar;
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Class name", () => {
    const code = `
        class Foo {}
        return Foo.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("Foo");
});

test("Class name via constructor", () => {
    const code = `
        class Foo {}
        const foo = new Foo();
        return foo.constructor.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("Foo");
});

test("Class expression name", () => {
    const code = `
        const foo = class Foo {};
        return foo.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("Foo");
});

test("Class expression name via constructor", () => {
    const code = `
        const foo = class Foo {};
        const bar = new foo();
        return bar.constructor.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("Foo");
});

test("Class annonymous expression name", () => {
    const code = `
        const foo = class {};
        return foo.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("____");
});

test("Class annonymous expression name via constructor", () => {
    const code = `
        const foo = class {};
        const bar = new foo();
        return bar.constructor.name;
    `;
    expect(util.transpileAndExecute(code)).toBe("____");
});

test("Class field override in subclass", () => {
    const code = `
        class Foo {
            field = "foo";
        }
        class Bar extends Foo {
            field = "bar";
        }
        return (new Foo()).field + (new Bar()).field;`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Class field override in subclass with constructors", () => {
    const code = `
        class Foo {
            field = "foo";
            constructor() {}
        }
        class Bar extends Foo {
            field = "bar";
            constructor() { super(); }
        }
        return (new Foo()).field + (new Bar()).field;`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});
