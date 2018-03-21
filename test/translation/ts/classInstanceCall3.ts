declare class ClassC {}
declare class ClassA extends ClassC {
    myFunc();
}
declare class ClassB extends ClassA {}

let x = new ClassB().myFunc();
