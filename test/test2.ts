declare function print(msg: any): void;

var globalString = "glob";

let input = [1,2];

let objTest = {a: 3, "B": true}

declare interface unit {
    GetParent(): unit;
    GetAbsOrigin(): number;
}

declare function GetUnit(): unit;

class TestClass {
    static field2: number = 5;
    field: string = "a";
    field3: string = globalString; // Abc
    unit: unit;

    constructor() {
        let localString = "abc";
        globalString = "abc";
        this.field = "";
        this.unit = GetUnit();
    }

    Test(): void {
        print("sup");
        this.Test3(3, "");
        this.unit.GetParent().GetParent().GetAbsOrigin();
    }

    Test3(a: number, b: string): string {
        return "";
    }
}

function Activate() {
    let test = function() { return ""; }
    for (let i = 0; i< 10; i++) {
        print(i);
    }

    for (let i=40; i > 10; i--) {

    }

    for (let i=2; i <= 20;i += 2) {
        
    }

    let i = 0;
    i++;
    i--;
    !true;
    ++i;
    i+=1;
    i-=1;
    let a = 24 & 4;

    let list = [1,2,3];

    for (let i of list) {
        print(i);
    }

    for (let i of [1,2,3]) {
        print(i);
        print(i+1);
    }

    for (let i in [1,2,3]) {

    }
}