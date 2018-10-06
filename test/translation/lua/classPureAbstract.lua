ClassB = ClassB or {}
ClassB.__index = ClassB
function ClassB.new(construct, ...)
    local self = setmetatable({}, ClassB)
    if construct and ClassB.constructor then ClassB.constructor(self, ...) end
    return self
end
function ClassB.constructor(self)
end