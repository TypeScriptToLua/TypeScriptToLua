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

function Activate(a) {
    let test = function() { return ""; }
    for (let i = 0; i< 10; i++) {
        print(i);
    }
}