MyClass = MyClass or {}
MyClass.__index = MyClass
function MyClass.new(construct, ...)
    local instance = setmetatable({}, MyClass)
    if construct and MyClass.constructor then MyClass.constructor(instance, ...) end
    return instance
end
MyClass.test = 0
function MyClass.constructor(self)
end
