Test = Test or {}
Test.__index = Test
function Test.new(construct, ...)
    local instance = setmetatable({}, Test)
    if construct and Test.constructor then Test.constructor(instance, ...) end
    return instance
end
function Test.constructor(self)
end
local t = Test.new(true)
