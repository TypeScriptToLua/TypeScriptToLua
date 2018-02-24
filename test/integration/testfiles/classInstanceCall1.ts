declare class ClassA {
    myFunc();
}
declare class ClassB extends ClassA {}

let x = new ClassB().myFunc();
