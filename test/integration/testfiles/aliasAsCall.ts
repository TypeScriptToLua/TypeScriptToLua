declare class ClassA {
    myFunc();
}
declare type MyAlias = ClassA;
declare var x: ClassA;

x.myFunc();
(x as MyAlias).myFunc();