declare class ClassA {
    myFunc();
}
declare class ClassC extends ClassA {}
class ClassB extends ClassC {}

let x = new ClassB().myFunc();
