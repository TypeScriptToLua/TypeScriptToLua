local exports = exports or {}
local TestSpace = exports.TestSpace or TestSpace or {}
do
    local TestNestedSpace = TestNestedSpace or {}
    do
        local function innerFunc()
        end
        TestNestedSpace.innerFunc = innerFunc
    end
    TestSpace.TestNestedSpace = TestNestedSpace
end
exports.TestSpace = TestSpace
return exports
