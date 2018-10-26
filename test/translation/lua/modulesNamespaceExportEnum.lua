local exports = exports or {}
local test = exports.test or test or {}
do
    local TestEnum={}
    TestEnum.foo="foo"
    TestEnum.bar="bar"
    test.TestEnum = TestEnum
end
exports.test = test
return exports
