local exports = exports or {}
local TestSpace = TestSpace or {}
do
    local function innerFunc()
    end
    exports.TestSpace.innerFunc = innerFunc
    TestSpace.innerFunc = innerFunc
end
exports.TestSpace = TestSpace
return exports