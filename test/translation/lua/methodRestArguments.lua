MyClass = MyClass or {};
MyClass.__index = MyClass;
MyClass.prototype = MyClass.prototype or {};
MyClass.prototype.__index = MyClass.prototype;
MyClass.prototype.constructor = MyClass;
MyClass.new = function(...)
    local self = setmetatable({}, MyClass.prototype);
    self:____constructor(...);
    return self;
end;
MyClass.prototype.____constructor = function(self)
end;
MyClass.prototype.varargsFunction = function(self, a, ...)
    local b = ({...});
end;
