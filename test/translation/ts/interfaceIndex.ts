declare interface Dictionary<T> {
    [index: string]: T;
}

let a: Dictionary<string> = {};
a["abc"] = "def";
