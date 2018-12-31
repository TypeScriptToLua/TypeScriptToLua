import { Expect, Test, TestCase } from "alsatian";

import * as ts from "typescript";
import * as util from "../src/util";

export class ClassTests {

    @Test("ClassFieldInitializer")
    public classFieldInitializer(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                field: number = 4;
            }
            return new a().field;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassNumericLiteralFieldInitializer")
    public classNumericLiteralFieldInitializer(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                1: number = 4;
            }
            return new a()[1];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStringLiteralFieldInitializer")
    public classStringLiteralFieldInitializer(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                "field": number = 4;
            }
            return new a()["field"];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassComputedFieldInitializer")
    public classComputedFieldInitializer(): void {
        // Transpile
        const lua = util.transpileString(
            `const field: "field" = "field";
            class a {
                [field]: number = 4;
            }
            return new a()[field];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassConstructor")
    public classConstructor(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                field: number = 3;
                constructor(n: number) {
                    this.field = n * 2;
                }
            }
            return new a(4).field;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(8);
    }

    @Test("ClassConstructorAssignment")
    public classConstructorAssignment(): void {
        // Transpile
        const lua = util.transpileString(
            `class a { constructor(public field: number) {} }
            return new a(4).field;`
        );

        // Execute
        const result = util.executeLua(lua);

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
        // Transpile
        const lua = util.transpileString(
            `class a {
                public field: number = 4;
                constructor() {}
            }
            let inst = new a;
            return inst.field;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticFields")
    public classStaticFields(): void {
        // Transpile
        const lua = util.transpileString(
            `class a { static field: number = 4; }
            return a.field;`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticNumericLiteralFields")
    public classStaticNumericLiteralFields(): void {
        // Transpile
        const lua = util.transpileString(
            `class a { static 1: number = 4; }
            return a[1];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticStringLiteralFields")
    public classStaticStringLiteralFields(): void {
        // Transpile
        const lua = util.transpileString(
            `class a { static "field": number = 4; }
            return a["field"];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStaticComputedFields")
    public classStaticComputedFields(): void {
        // Transpile
        const lua = util.transpileString(
            `const field: "field" = "field";
            class a { static [field]: number = 4; }
            return a[field];`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("classExtends")
    public classExtends(): void {
        // Transpile
        const lua = util.transpileString(
            `class a { field: number = 4; }
            class b extends a {}
            return new b().field;`
        );

        // Execute
        const result = util.executeLua(lua);

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
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(5);
    }

    @Test("classSuperSuper")
    public classSuperSuper(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(10);
    }

    @Test("ClassMethodCall")
    public classMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public method(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst.method();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassNumericLiteralMethodCall")
    public classNumericLiteralMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public 1(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst[1]();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassStringLiteralMethodCall")
    public classStringLiteralMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public "method"(): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst["method"]();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassComputedMethodCall")
    public classComputedMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
            `const method: "method" = "method";
            class a {
                public [method](): number {
                    return 4;
                }
            }
            let inst = new a();
            return inst[method]();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassToString")
    public classToString(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public toString(): string {
                    return "instance of a";
                }
            }
            let inst = new a();
            return inst.toString();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe("instance of a");
    }
    @Test("HasOwnProperty true")
    public hasOwnProperty1(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public test(): void {
                }
            }
            let inst = new a();
            inst["prop"] = 17;
            return inst.hasOwnProperty("prop");`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(true);
    }
    @Test("HasOwnProperty false")
    public hasOwnProperty2(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public test(): void {
                }
            }
            let inst = new a();
            inst["prop"] = 17;
            return inst.hasOwnProperty("test");`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(false);
    }
    @Test("CastClassMethodCall")
    public extraParenthesisAssignment(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassPropertyFunctionThis")
    public classPropertyFunctionThis(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                constructor(private n: number) {}
                public method: () => number = () => this.n;
            }
            let inst = new a(4);
            return inst.method();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassInheritedMethodCall")
    public classInheritedMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public method(): number {
                    return 4;
                }
            }
            class b extends a {}
            let inst = new b();
            return inst.method();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassDoubleInheritedMethodCall")
    public classDoubleInheritedMethodCall(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassInheritedMethodCall2")
    public classInheritedMethodCall2(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("ClassMethodOverride")
    public classMethodOverride(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(4);
    }

    @Test("methodDefaultParameters")
    public methodInheritedParameters(): void {
        // Transpile
        const lua = util.transpileString(
            `class a {
                public method(b: number, c: number = 5): number {
                    return b + c;
                }
            }
            let inst = new a();
            return inst.method(4);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(9);
    }

    @Test("Class without name error")
    public classWithoutNameError(): void {
        const transpiler = util.makeTestTranspiler();

        Expect(() => transpiler.transpileClass({} as ts.ClassDeclaration))
            .toThrowError(Error, "Class declarations must have a name.");
    }

    @Test("CallSuperMethodNoArgs")
    public callSuperMethodNoArgs(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(6);
    }

    @Test("CallSuperMethodArgs")
    public callSuperMethodArgs(): void {
        // Transpile
        const lua = util.transpileString(
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

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(10);
    }

    @Test("classExpression")
    public classExpression(): void {
        const lua = util.transpileString(
            `class a {
                public method() {
                    return "instance of a";
                }
            }
            b = class extends a {
                public method() {
                    return "instance of b";
                }
            }
            let inst = new b(6);
            return inst.method();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe("instance of b");
    }

    @Test("classExpressionBaseClassMethod")
    public classExpressionBaseClassMethod(): void {
        const lua = util.transpileString(
            `class a {
                public method() {
                    return 42;
                }
            }
            b = class extends a {
            }
            let inst = new b();
            return inst.method();`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(42);
    }

    @Test("Class Method Runtime Override")
    public classMethodRuntimeOverride(): void {
        const result = util.transpileAndExecute(
            `class MyClass {
                method(): void {
                    return 4
              }
            }

            let inst = new MyClass();
            inst.method = () => {
                return 8
            }
            return inst.method();`
        );

        Expect(result).toBe(8);
    }
}
