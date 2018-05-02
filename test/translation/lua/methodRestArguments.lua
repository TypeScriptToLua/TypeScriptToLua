MyClass = MyClass or {}
MyClass.__index = MyClass
function MyClass.new(construct, ...)
    local instance = setmetatable({}, MyClass)
    if construct and MyClass.constructor then MyClass.constructor(instance, ...) end
    return instance
end
function MyClass.constructor(self)
end
function MyClass.varargsFunction(self,a,...)
    local b = { ... }
end
