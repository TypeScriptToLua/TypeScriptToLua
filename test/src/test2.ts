declare function print(msg: any): void;

var globalString = "glob";

let input = [1,2];

let objTest = {a: 3, "B": true, [input[0]]: 5}

declare interface unit {
    GetParent(): unit;
    GetAbsOrigin(): number;
}

declare function GetUnit(): unit;

export class TestClass {
    static field2: number;
    field: string;
    field3: string = globalString; // Abc
    unit: unit;

    constructor(tf: number) {
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

    let i = false == false ? 0 : 4;
    i++;
    i--;
    !true;
    ++i;
    i+=1;
    i-=1;
    let a = 24 & 4;

    let list = [1,2,3];
    let obj = {a: 3};
    for (let i = 0; i < list.length; i++) {
        print(list[i]);
    }

    for (var b of [1,2,3]) {

    }

    for (var c of list) {

    }

    for (var d in obj) {

    }

    if (i == 3 && i < 3) {
        print(4);
    } else {
        print(5);
    }

    if (true || false) {
        while (true) {
            break;
        }
    } 

    switch (a) {
        case 1:
            2+2
        case 3:
            return 5;
        case 4:
            1+1
            break;
        default:
            let b = 3
    }

    switch (a) {
        case 1:
            2+2
        case 3:
            return 5;
        case 4:
            1+1
            break;
        default:
            let b = 3
    }
}

const a = new TestClass(3);