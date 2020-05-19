import * as util from "../../util";

test("generator parameters", () => {
    util.testFunction`
        function* generator(value: number) {
            yield value;
        }

        return generator(5).next();
    `.expectToMatchJsResult();
});

test(".next()", () => {
    util.testFunction`
        function* generator() {
            yield 1;
            yield 2;
            return 3;
        }

        const it = generator();
        return [it.next(), it.next(), it.next(), it.next()];
    `.expectToMatchJsResult();
});

test(".next() with parameters", () => {
    util.testFunction`
        function* generator() {
            return yield 0;
        }

        const it = generator();
        return [it.next(1), it.next(2), it.next(3)];
    `
        .debug()
        .expectToMatchJsResult();
});

test("for..of", () => {
    util.testFunction`
        function* generator() {
            yield 1;
            yield 2;
            yield undefined;
            return 3;
        }

        const results = [];
        for (const value of generator()) {
            results.push({ value });
        }
        return results;
    `.expectToMatchJsResult();
});

test("function expression", () => {
    util.testFunction`
        const generator = function*() {
            return true;
        }

        return generator().next();
    `.expectToMatchJsResult();
});

test("class method", () => {
    util.testFunction`
        class A {
            *generator() {
                return true;
            }
        }

        return new A().generator().next();
    `.expectToMatchJsResult();
});

test("object member", () => {
    util.testFunction`
        const a = {
            *generator() {
                return true;
            }
        }

        return a.generator().next();
    `.expectToMatchJsResult();
});

test("hoisting", () => {
    util.testFunction`
        return generator().next();

        function* generator() {
            return true;
        }
    `.expectToMatchJsResult();
});
