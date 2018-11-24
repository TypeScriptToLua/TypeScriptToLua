local exports = exports or {}
local TestSpace = exports.TestSpace or TestSpace or {}
do
    local function innerFunc()
    end
    TestSpace.innerFunc = innerFunc
end
exports.TestSpace = TestSpace
return exports
