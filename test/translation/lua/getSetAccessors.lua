MyClass = MyClass or {};
MyClass.__index = MyClass;
MyClass.new = function (construct, ...)
    local self = setmetatable({}, MyClass);
    if construct and MyClass.constructor then
        MyClass.constructor(self, ...);
    end
    return self;
end;
MyClass.constructor = function (self)
end;
MyClass.get__field = function (self)
    return self._field + 4;
end;
MyClass.set__field = function (self, v)
    self._field = v * 2;
end;
local instance = MyClass.new(true);
instance:get__field()) = 4;
local b = instance:get__field());
local c = (4 + instance:get__field())) * 3;
