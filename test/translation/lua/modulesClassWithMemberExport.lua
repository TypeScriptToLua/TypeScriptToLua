local exports = exports or {}
local TestClass = TestClass or {}
TestClass.__index = TestClass
function TestClass.new(construct, ...)
    local self = setmetatable({}, TestClass)
    if construct and TestClass.constructor then TestClass.constructor(self, ...) end
    return self
end
function TestClass.constructor(self)
end
function TestClass.memberFunc(self)
end
exports.TestClass = TestClass
return exports
