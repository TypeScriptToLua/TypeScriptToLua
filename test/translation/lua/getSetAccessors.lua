MyClass = MyClass or {};
MyClass.__index = MyClass;
MyClass.prototype = MyClass.prototype or {};
MyClass.prototype.__index = MyClass.prototype;
MyClass.prototype.constructor = MyClass;
MyClass.____new = function(...)
    local self = setmetatable({}, MyClass.prototype);
    self:____constructor(...);
    return self;
end;
MyClass.prototype.____constructor = function(self)
end;
MyClass.prototype.get__field = function(self)
    return self._field + 4;
end;
MyClass.prototype.set__field = function(self, v)
    self._field = v * 2;
end;
local instance = MyClass.____new();
instance:set__field(4);
local b = instance:get__field();
local c = (4 + instance:get__field()) * 3;
