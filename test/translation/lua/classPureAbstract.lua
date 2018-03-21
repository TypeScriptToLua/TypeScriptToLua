ClassB = ClassB or {}
ClassB.__index = ClassB
function ClassB.new(construct, ...)
    local instance = setmetatable({}, ClassB)
    if construct and ClassB.constructor then ClassB.constructor(instance, ...) end
    return instance
end