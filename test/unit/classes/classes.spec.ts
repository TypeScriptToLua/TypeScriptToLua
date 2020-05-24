import * as util from "../../util";

test("ClassFieldInitializer", () => {
    util.testFunction`
        class a {
            field: number = 4;
        }
        return new a().field;
    `.expectToMatchJsResult();
});

test("ClassNumericLiteralFieldInitializer", () => {
    util.testFunction`
        class a {
            1: number = 4;
        }
        return new a()[1];
    `.expectToMatchJsResult();
});

test("ClassStringLiteralFieldInitializer", () => {
    util.testFunction`
        class a {
            "field": number = 4;
        }
        return new a()["field"];
    `.expectToMatchJsResult();
});

test("ClassComputedFieldInitializer", () => {
    util.testFunction`
        const field: "field" = "field";
        class a {
            [field]: number = 4;
        }
        return new a()[field];
    `.expectToMatchJsResult();
});

test("ClassConstructor", () => {
    util.testFunction`
        class a {
            field: number = 3;
            constructor(n: number) {
                this.field = n * 2;
            }
        }
        return new a(4).field;
    `.expectToMatchJsResult();
});

test("ClassConstructorAssignment", () => {
    util.testFunction`
        class a { constructor(public field: number) {} }
        return new a(4).field;
    `.expectToMatchJsResult();
});

test("ClassConstructorDefaultParameter", () => {
    util.testFunction`
        class a { public field: number; constructor(f: number = 3) { this.field = f; } }
        return new a().field;
    `.expectToMatchJsResult();
});

test("ClassConstructorAssignmentDefault", () => {
    util.testFunction`
        class a { constructor(public field: number = 3) { } }
        return new a().field;
    `.expectToMatchJsResult();
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
    util.testFunction`
        class a {
            public field: number = 4;
            constructor() {}
        }
        let inst = new a;
        return inst.field;
    `.expectToMatchJsResult();
});

test("ClassStaticFields", () => {
    util.testFunction`
        class a { static field: number = 4; }
        return a.field;
    `.expectToMatchJsResult();
});

test("ClassStaticNumericLiteralFields", () => {
    util.testFunction`
        class a { static 1: number = 4; }
        return a[1];
    `.expectToMatchJsResult();
});

test("ClassStaticStringLiteralFields", () => {
    util.testFunction`
        class a { static "field": number = 4; }
        return a["field"];
    `.expectToMatchJsResult();
});

test("ClassStaticComputedFields", () => {
    util.testFunction`
        const field: "field" = "field";
        class a { static [field]: number = 4; }
        return a[field];
    `.expectToMatchJsResult();
});

test("classExtends", () => {
    util.testFunction`
        class a { field: number = 4; }
        class b extends a {}
        return new b().field;
    `.expectToMatchJsResult();
});

test("SubclassDefaultConstructor", () => {
    util.testFunction`
        class a {
            field: number;
            constructor(field: number) {
                this.field = field;
            }
        }
        class b extends a {}
        return new b(10).field;
    `.expectToMatchJsResult();
});

test("SubsubclassDefaultConstructor", () => {
    util.testFunction`
        class a {
            field: number;
            constructor(field: number) {
                this.field = field;
            }
        }
        class b extends a {}
        class c extends b {}
        return new c(10).field;
    `.expectToMatchJsResult();
});

test("SubclassConstructor", () => {
    util.testFunction`
        class a {
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
        return new b(10).field;
    `.expectToMatchJsResult();
});

test("Subclass constructor across merged namespace", () => {
    util.testModule`
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
        }
        export const result = (new NS.Sub()).prop;
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test("super without class", () => {
    util.testExpression`super()`.expectDiagnosticsToMatchSnapshot([2337]);
});

test("super in unnamed class", () => {
    util.testFunction`
        class Foo {
            public x = true;
        }

        const Bar = (class extends (Foo) {
            constructor() {
                super();
            }
        });

        return new Bar().x;
    `.expectToMatchJsResult();
});

test("classSuper", () => {
    util.testFunction`
        class a {
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
        return new b().field;
    `.expectToMatchJsResult();
});

test("classSuperSuper", () => {
    util.testFunction`
        class a {
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
        return new c().field;
    `.expectToMatchJsResult();
});

test("classSuperSkip", () => {
    util.testFunction`
        class a {
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
        return new c().field;
    `.expectToMatchJsResult();
});

test("renamedClassExtends", () => {
    util.testModule`
        namespace Classes {
            export class Base {
                public value: number;
                constructor(){ this.value = 3; }
            }
        }

        const A = Classes.Base;
        class B extends A {
            constructor(){ super(); }
        }

        const b = new B();
        export const result = b.value;
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test("ClassMethodCall", () => {
    util.testFunction`
        class a {
            public method(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst.method();
    `.expectToMatchJsResult();
});

test("ClassNumericLiteralMethodCall", () => {
    util.testFunction`
        class a {
            public 1(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst[1]();
    `.expectToMatchJsResult();
});

test("ClassStringLiteralMethodCall", () => {
    util.testFunction`
        class a {
            public "method"(): number {
                return 4;
            }
        }
        let inst = new a();
        return inst["method"]();
    `.expectToMatchJsResult();
});

test("ClassComputedMethodCall", () => {
    util.testFunction`
        const method: "method" = "method";
        class a {
            public [method](): number {
                return 4;
            }
        }
        let inst = new a();
        return inst[method]();
    `.expectToMatchJsResult();
});

test("CastClassMethodCall", () => {
    util.testFunction`
        interface result
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
        return result.val;
    `.expectToMatchJsResult();
});

test("ClassPropertyFunctionThis", () => {
    util.testFunction`
        class a {
            constructor(private n: number) {}
            public method: () => number = () => this.n;
        }
        let inst = new a(4);
        return inst.method();
    `.expectToMatchJsResult();
});

test("ClassInheritedMethodCall", () => {
    util.testFunction`
        class a {
            public method(): number {
                return 4;
            }
        }
        class b extends a {}
        let inst = new b();
        return inst.method();
    `.expectToMatchJsResult();
});

test("ClassDoubleInheritedMethodCall", () => {
    util.testFunction`
        class a {
            public method(): number {
                return 4;
            }
        }
        class b extends a {}
        class c extends b {}
        let inst = new c();
        return inst.method();
    `.expectToMatchJsResult();
});

test("ClassInheritedMethodCall2", () => {
    util.testFunction`
        class a {}
        class b extends a {
            public method(): number {
                return 4;
            }
        }
        class c extends b {}
        let inst = new c();
        return inst.method();
    `.expectToMatchJsResult();
});

test("ClassMethodOverride", () => {
    util.testFunction`
        class a {
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
        return inst.method();
    `.expectToMatchJsResult();
});

test("methodDefaultParameters", () => {
    util.testFunction`
        class a {
            public method(b: number, c: number = 5): number {
                return b + c;
            }
        }
        let inst = new a();
        return inst.method(4);
    `.expectToMatchJsResult();
});

test("CallSuperMethodNoArgs", () => {
    util.testFunction`
        class a {
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
        return inst.method();
    `.expectToMatchJsResult();
});

test("CallSuperMethodArgs", () => {
    util.testFunction`
        class a {
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
        return inst.method(4);
    `.expectToMatchJsResult();
});

test("CallSuperExpressionMethod", () => {
    util.testFunction`
        let i = 0;
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
        return i;
    `.expectToMatchJsResult();
});

test("CallSuperSuperMethod", () => {
    util.testFunction`
        class a {
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
        return inst.method();
    `.expectToMatchJsResult();
});

test("classExpression", () => {
    util.testFunction`
        class a {
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
        return inst.method();
    `.expectToMatchJsResult();
});

test("Named Class Expression", () => {
    util.testFunction`
        const a = class MyClass {
            public method() {
                return "foo";
            }
        }
        let inst = new a();
        return inst.method();
    `.expectToMatchJsResult();
});

test("classExpressionBaseClassMethod", () => {
    util.testFunction`
        class a {
            public method() {
                return 42;
            }
        }
        const b = class extends a {
        }
        let inst = new b();
        return inst.method();
    `.expectToMatchJsResult();
});

test("Class Method Runtime Override", () => {
    util.testFunction`
        class MyClass {
            method(): number {
                return 4;
          }
        }

        let inst = new MyClass();
        inst.method = () => {
            return 8;
        }
        return inst.method();
    `.expectToMatchJsResult();
});

test("Exported class super call", () => {
    util.testModule`
        export class Foo {
            prop: string;
            constructor(prop: string) { this.prop = prop; }
        }
        export class Bar extends Foo {
            constructor() {
                super("bar");
            }
        }
        export const result = (new Bar()).prop;
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test.each(["(new Foo())", "Foo"])("Class method name collision (%p)", input => {
    util.testFunction`
        class Foo {
            public method() { return "foo"; }
            public static method() { return "bar"; }
        }
        return ${input}.method();
    `.expectToMatchJsResult();
});

test("Class static instance of self", () => {
    util.testFunction`
        class Foo {
            bar = "foobar";
            static instance = new Foo();
        }
        return Foo.instance.bar;
    `.expectToMatchJsResult();
});

test("Class name", () => {
    util.testFunction`
        class Foo {}
        return Foo.name;
    `.expectToMatchJsResult();
});

test("Class name via constructor", () => {
    util.testFunction`
        class Foo {}
        const foo = new Foo();
        return foo.constructor.name;
    `.expectToMatchJsResult();
});

test("Class expression name", () => {
    util.testFunction`
        const foo = class Foo {};
        return foo.name;
    `.expectToMatchJsResult();
});

test("Class expression name via constructor", () => {
    util.testFunction`
        const foo = class Foo {};
        const bar = new foo();
        return bar.constructor.name;
    `.expectToMatchJsResult();
});

test("Anonymous class in variable declaration has name", () => {
    util.testFunction`
        const foo = class {};
        const bar = foo;
        return { a: foo.name, b: bar.name };
    `.expectToMatchJsResult();
});

test("Anonymous class expression outside variable assignment", () => {
    util.testExpression`(class {}).name`.expectToMatchJsResult();
});

test("Class anonymous expression name via constructor", () => {
    util.testFunction`
        const foo = class {};
        const bar = new foo();
        return bar.constructor.name;
    `.expectToMatchJsResult();
});

test("Class field override in subclass", () => {
    util.testFunction`
        class Foo {
            field = "foo";
        }
        class Bar extends Foo {
            field = "bar";
        }
        return (new Foo()).field + (new Bar()).field;
    `.expectToMatchJsResult();
});

test("Class field override in subclass with constructors", () => {
    util.testFunction`
        class Foo {
            field = "foo";
            constructor() {}
        }
        class Bar extends Foo {
            field = "bar";
            constructor() { super(); }
        }
        return (new Foo()).field + (new Bar()).field;
    `.expectToMatchJsResult();
});

test("missing declaration name", () => {
    util.testModule`
        class {}
    `.expectDiagnosticsToMatchSnapshot([1211]);
});

test("default exported name class has correct name property", () => {
    util.testModule`
        export default class Test { static method() { return true; } }
    `
        .setReturnExport("default", "name")
        .expectToMatchJsResult();
});

test("default exported anonymous class has 'default' name property", () => {
    util.testModule`
        export default class { static method() { return true; } }
    `
        .setReturnExport("default", "name")
        .expectToEqual("default");
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/584
test("constructor class name available with constructor", () => {
    util.testModule`
        const decorator = <T extends new (...args: any[]) => any>(constructor: T) => class extends constructor {};

        @decorator
        class MyClass {}

        export const className = new MyClass().constructor.name;
    `
        .setReturnExport("className")
        .expectToEqual("MyClass");
});
