ClassB = ClassB or ClassC.new()
ClassB.__index = ClassB
ClassB.__base = ClassC
function ClassB.new(construct, ...)
    local instance = setmetatable({}, ClassB)
    if construct and ClassB.constructor then ClassB.constructor(instance, ...) end
    return instance
end
local x = ClassB.new(true):myFunc()