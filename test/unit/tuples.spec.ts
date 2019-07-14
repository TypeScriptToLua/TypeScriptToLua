import * as util from "../util";

test("Tuple loop", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        for (const value of tuple) { count += value; }
        return count;
    `.expectToMatchJsResult();
});

test("Tuple foreach", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        tuple.forEach(v => count += v);
        return count;
    `.expectToMatchJsResult();
});

test("Tuple access", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple union access", () => {
    util.testFunction`
        function makeTuple(): [number, number, number] | [string, string, string] { return [3,5,1]; }
        const tuple = makeTuple();
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple intersection access", () => {
    util.testFunction`
        type I = [number, number, number] & {foo: string};
        function makeTuple(): I {
            let t = [3,5,1];
            (t as I).foo = "bar";
            return (t as I);
        }
        const tuple = makeTuple();
        return tuple[1];
    `.expectToMatchJsResult();
});

test("Tuple length", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3, 5, 1];
        return tuple.length;
    `.expectToMatchJsResult();
});
