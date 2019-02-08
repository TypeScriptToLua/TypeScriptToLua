import { Expect, Test, TestCase } from "alsatian";

import * as ts from "typescript";
import * as util from "../src/util";
import { TranspileError } from "../../src/TranspileError";

export class ClassTests {

    @Test("ClassFieldInitializer")
    public classFieldInitializer(): void {
        const result = util.transpileAndExecute(
            `class a {
                field: number = 4;
            }
            return new a().field;`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassNumericLiteralFieldInitializer")
    public classNumericLiteralFieldInitializer(): void {
        const result = util.transpileAndExecute(
            `class a {
                1: number = 4;
            }
            return new a()[1];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStringLiteralFieldInitializer")
    public classStringLiteralFieldInitializer(): void {
        const result = util.transpileAndExecute(
            `class a {
                "field": number = 4;
            }
            return new a()["field"];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassComputedFieldInitializer")
    public classComputedFieldInitializer(): void {
        const result = util.transpileAndExecute(
            `const field: "field" = "field";
            class a {
                [field]: number = 4;
            }
            return new a()[field];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassConstructor")
    public classConstructor(): void {
        const result = util.transpileAndExecute(
            `class a {
                field: number = 3;
                constructor(n: number) {
                    this.field = n * 2;
                }
            }
            return new a(4).field;`
        );

        // Assert
        Expect(result).toBe(8);
    }

    @Test("ClassConstructorAssignment")
    public classConstructorAssignment(): void {
        const result = util.transpileAndExecute(
            `class a { constructor(public field: number) {} }
            return new a(4).field;`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassConstructorDefaultParameter")
    public classConstructorDefaultParameter(): void {
        const result = util.transpileAndExecute(
            `class a { public field: number; constructor(f: number = 3) { this.field = f; } }
            return new a().field;`
        );

        Expect(result).toBe(3);
    }

    @Test("ClassConstructorAssignmentDefault")
    public classConstructorAssignmentParameterDefault(): void {
        const result = util.transpileAndExecute(
            `class a { constructor(public field: number = 3) { } }
            return new a().field;`
        );

        Expect(result).toBe(3);
    }

    @Test("ClassNewNoBrackets")
    public classNewNoBrackets(): void {
        const result = util.transpileAndExecute(
            `class a {
                public field: number = 4;
                constructor() {}
            }
            let inst = new a;
            return inst.field;`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticFields")
    public classStaticFields(): void {
        const result = util.transpileAndExecute(
            `class a { static field: number = 4; }
            return a.field;`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticNumericLiteralFields")
    public classStaticNumericLiteralFields(): void {
        const result = util.transpileAndExecute(
            `class a { static 1: number = 4; }
            return a[1];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticStringLiteralFields")
    public classStaticStringLiteralFields(): void {
        const result = util.transpileAndExecute(
            `class a { static "field": number = 4; }
            return a["field"];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticComputedFields")
    public classStaticComputedFields(): void {
        const result = util.transpileAndExecute(
            `const field: "field" = "field";
            class a { static [field]: number = 4; }
            return a[field];`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("classExtends")
    public classExtends(): void {
        const result = util.transpileAndExecute(
            `class a { field: number = 4; }
            class b extends a {}
            return new b().field;`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("SubclassDefaultConstructor")
    public subclassDefaultConstructor(): void {
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

        Expect(result).toBe(10);
    }

    @Test("SubsubclassDefaultConstructor")
    public subsubclassDefaultConstructor(): void {
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

        Expect(result).toBe(10);
    }

    @Test("SubclassConstructor")
    public subclassConstructor(): void {
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

        Expect(result).toBe(11);
    }

    @Test("classSuper")
    public classSuper(): void {
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

        // Assert
        Expect(result).toBe(5);
    }

    @Test("classSuperSuper")
    public classSuperSuper(): void {
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

        // Assert
        Expect(result).toBe(10);
    }

    @Test("classSuperSkip")
    public classSuperSkip(): void {
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

        // Assert
        Expect(result).toBe(5);
    }

    @Test("renamedClassExtends")
    public renamedClassExtends(): void
    {
        const result = util.transpileAndExecute(
            `const b = new B();
            return b.value;`,
            undefined, undefined,
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

        // Assert
        Expect(result).toBe(3);
    }

    @Test("ClassMethodCall")
    public classMethodCall(): void {
        const result = util.transpileAndExecute(
            `class a {
                public method(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst.method();`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassNumericLiteralMethodCall")
    public classNumericLiteralMethodCall(): void {
        const result = util.transpileAndExecute(
            `class a {
                public 1(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst[1]();`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStringLiteralMethodCall")
    public classStringLiteralMethodCall(): void {
        const result = util.transpileAndExecute(
            `class a {
                public "method"(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst["method"]();`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassComputedMethodCall")
    public classComputedMethodCall(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassToString")
    public classToString(): void {
        const result = util.transpileAndExecute(
            `class a {
                public toString(): string {
                    return "instance of a";
                }
            }
            let inst = new a();
            return inst.toString();`
        );

        // Assert
        Expect(result).toBe("instance of a");
    }
    @Test("HasOwnProperty true")
    public hasOwnProperty1(): void {
        const result = util.transpileAndExecute(
            `class a {
                public test(): void {
                }
            }
            let inst = new a();
            inst["prop"] = 17;
            return inst.hasOwnProperty("prop");`
        );

        // Assert
        Expect(result).toBe(true);
    }
    @Test("HasOwnProperty false")
    public hasOwnProperty2(): void {
        const result = util.transpileAndExecute(
            `class a {
                public test(): void {
                }
            }
            let inst = new a();
            inst["prop"] = 17;
            return inst.hasOwnProperty("test");`
        );

        // Assert
        Expect(result).toBe(false);
    }
    @Test("CastClassMethodCall")
    public extraParenthesisAssignment(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassPropertyFunctionThis")
    public classPropertyFunctionThis(): void {
        const result = util.transpileAndExecute(
            `class a {
                constructor(private n: number) {}
                public method: () => number = () => this.n;
            }
            let inst = new a(4);
            return inst.method();`
        );

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassInheritedMethodCall")
    public classInheritedMethodCall(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassDoubleInheritedMethodCall")
    public classDoubleInheritedMethodCall(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassInheritedMethodCall2")
    public classInheritedMethodCall2(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassMethodOverride")
    public classMethodOverride(): void {
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

        // Assert
        Expect(result).toBe(4);
    }

    @Test("methodDefaultParameters")
    public methodInheritedParameters(): void {
        const result = util.transpileAndExecute(
            `class a {
                public method(b: number, c: number = 5): number {
                    return b + c;
                }
            }
            let inst = new a();
            return inst.method(4);`
        );

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Class without name error")
    public classWithoutNameError(): void {
        const transformer = util.makeTestTransformer();

        Expect(() => transformer.transformClassDeclaration({} as ts.ClassDeclaration))
            .toThrowError(Error, "Class declarations must have a name.");
    }

    @Test("CallSuperMethodNoArgs")
    public callSuperMethodNoArgs(): void {
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

        // Assert
        Expect(result).toBe(6);
    }

    @Test("CallSuperMethodArgs")
    public callSuperMethodArgs(): void {
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

        // Assert
        Expect(result).toBe(10);
    }

    @Test("CallSuperExpressionMethod")
    public callSuperExpressionMethod(): void {
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

        // Assert
        Expect(result).toBe(1);
    }

    @Test("CallSuperSuperMethod")
    public callSuperSuperMethod(): void {
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

        // Assert
        Expect(result).toBe(6);
    }

    @Test("classExpression")
    public classExpression(): void {
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

        // Assert
        Expect(result).toBe("instance of b");
    }

    @Test("classExpressionBaseClassMethod")
    public classExpressionBaseClassMethod(): void {
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

        // Assert
        Expect(result).toBe(42);
    }

    @Test("Class Method Runtime Override")
    public classMethodRuntimeOverride(): void {
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

        Expect(result).toBe(8);
    }

    @Test("Exported class super call")
    public exportedClassSuperCall(): void {
        const code =
            `export class Foo {
                prop: string;
                constructor(prop: string) { this.prop = prop; }
            }
            export class Bar extends Foo {
                constructor() {
                    super("bar");
                }
            }
            export const baz = (new Bar()).prop;`;
        Expect(util.transpileExecuteAndReturnExport(code, "baz")).toBe("bar");
    }

    @TestCase("(new Foo())", "foo")
    @TestCase("Foo", "bar")
    @Test("Class method name collision")
    public classMethodNameCollisiom(input: string, expectResult: string): void {
        const code =
            `class Foo {
                public method() { return "foo"; }
                public static method() { return "bar"; }
            }
            return ${input}.method();`;
        Expect(util.transpileAndExecute(code)).toBe(expectResult);
    }

    @TestCase("extension")
    @TestCase("metaExtension")
    @Test("Class extends extension")
    public classExtendsExtension(extensionType: string): void {
        const code =
            `declare class A {}
            /** @${extensionType} **/
            class B extends A {}
            class C extends B {}`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Cannot extend classes with decorator '@extension' or '@metaExtension'."
        );
    }

    @TestCase("extension")
    @TestCase("metaExtension")
    @Test("Class construct extension")
    public classConstructExtension(extensionType: string): void {
        const code =
            `declare class A {}
            /** @${extensionType} **/
            class B extends A {}
            const b = new B();`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Cannot construct classes with decorator '@extension' or '@metaExtension'."
        );
    }
}
