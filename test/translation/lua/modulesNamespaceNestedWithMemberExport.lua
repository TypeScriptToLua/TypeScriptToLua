local exports = exports or {};
local TestSpace;
exports.TestSpace = exports.TestSpace or {};
TestSpace = exports.TestSpace;
do
    local TestNestedSpace;
    TestSpace.TestNestedSpace = TestSpace.TestNestedSpace or {};
    TestNestedSpace = TestSpace.TestNestedSpace;
    do
        TestNestedSpace.innerFunc = function()
        end;
    end
end
return exports;
