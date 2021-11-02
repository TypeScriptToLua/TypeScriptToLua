import * as util from "../util";

test.each(["0", "1", '"a"'])("void evaluates to undefined (%p)", value => {
    util.testExpression`void (${value})`.expectToMatchJsResult();
});

test("void applies to function declarations", () => {
    util.testFunction`
        let result = 0;
        void function setResult() {
            result = 1;
        }();
        return result;
    `.expectToMatchJsResult();
});

test("void used to ignore function return values", () => {
    util.testFunction`
        let result = 0;
        function setResult() {
            result = 1;
            return 3
        };

        void(setResult());

        return result;
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1102
test("void works with lambdas", () => {
    util.testExpression`void (() => {})()`.expectToMatchJsResult();
});

test("void with side effects", () => {
    util.testFunction`
        let result = [];
        
        function setResult(){
            result.push(1);
            return 2;
        }
        
        function someFunc(...args: any[]){
            result.push(3);
        }
        
        someFunc(void setResult());
        
        return result;
    `.expectToMatchJsResult();
});
