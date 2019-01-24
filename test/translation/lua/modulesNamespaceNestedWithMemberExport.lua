local exports = exports or {};
exports.TestSpace = exports.TestSpace or {};
local TestSpace = exports.TestSpace;
do
    TestSpace.TestNestedSpace = TestSpace.TestNestedSpace or {};
    local TestNestedSpace = TestSpace.TestNestedSpace;
    do
        TestNestedSpace.innerFunc = function()
        end;
    end
end
return exports;
