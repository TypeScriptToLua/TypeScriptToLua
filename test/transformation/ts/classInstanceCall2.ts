declare class ClassA {
    myFunc();
}
declare class ClassC extends ClassA {}
declare class ClassB extends ClassC {}

let x = new ClassB().myFunc();
