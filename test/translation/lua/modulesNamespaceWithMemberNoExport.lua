local exports = exports or {}
local TestSpace = TestSpace or {}
exports.TestSpace = TestSpace
do
    local function innerFunc()
    end
    TestSpace.innerFunc = innerFunc
end
return exports
