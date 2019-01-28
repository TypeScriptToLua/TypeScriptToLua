local exports = exports or {};
local test;
exports.test = exports.test or {};
test = exports.test;
do
    test.TestEnum = {};
    test.TestEnum.foo = "foo";
    test.TestEnum.bar = "bar";
end
return exports;
