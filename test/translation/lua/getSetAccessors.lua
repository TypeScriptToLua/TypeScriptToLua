MyClass = MyClass or {}
MyClass.__index = MyClass
function MyClass.new(construct, ...)
    local instance = setmetatable({}, MyClass)
    if construct and MyClass.constructor then MyClass.constructor(instance, ...) end
    return instance
end
function MyClass.constructor(self)
end
function MyClass.get__field(self)
    return self._field+4
end
function MyClass.set__field(self,v)
    self._field = (v*2);
end
local instance = MyClass.new(true);
instance:set__field(4);
local b = instance:get__field();
local c = (4+instance:get__field())*3;
