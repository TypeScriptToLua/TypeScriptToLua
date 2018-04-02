declare interface Dictionary<T> {
    [index: number]: T;
}

let a: Dictionary<string> = {};
a["abc"] = "def";
