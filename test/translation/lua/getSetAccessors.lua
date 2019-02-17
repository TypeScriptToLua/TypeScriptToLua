require("lualib_bundle");
MyClass = MyClass or {};
MyClass.__index = MyClass;
MyClass.prototype = MyClass.prototype or {};
MyClass.prototype.____getters = {};
MyClass.prototype.__index = __TS__Index(MyClass.prototype);
MyClass.prototype.____setters = {};
MyClass.prototype.__newindex = __TS__NewIndex(MyClass.prototype);
MyClass.prototype.constructor = MyClass;
MyClass.new = function(...)
    local self = setmetatable({}, MyClass.prototype);
    self:____constructor(...);
    return self;
end;
MyClass.prototype.____constructor = function(self)
end;
MyClass.prototype.____getters.field = function(self)
    return self._field + 4;
end;
MyClass.prototype.____setters.field = function(self, v)
    self._field = v * 2;
end;
local instance = MyClass.new();
instance.field = 4;
local b = instance.field;
local c = (4 + instance.field) * 3;
