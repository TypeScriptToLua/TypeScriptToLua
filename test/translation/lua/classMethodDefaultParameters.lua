MyClass = MyClass or {}
MyClass.__index = MyClass
function MyClass.new(construct, ...)
    local instance = setmetatable({}, MyClass)
    if construct and MyClass.constructor then MyClass.constructor(instance, ...) end
    return instance
end
function MyClass.constructor(self)
end
function MyClass.MyMethod(self,a,b)
    if a==nil then a=3 end
    if b==nil then b=5 end
    return a+b
end
