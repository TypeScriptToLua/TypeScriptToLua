MyClass = MyClass or {}
MyClass.__index = MyClass
function MyClass.new(construct, ...)
    local self = setmetatable({}, MyClass)
    if construct and MyClass.constructor then MyClass.constructor(self, ...) end
    return self
end
function MyClass.constructor(self)
end
function MyClass.varargsFunction(self,a,...)
    local b = { ... }
end
