local instance, b, c;
MyClass = MyClass or {};
MyClass.__index = MyClass;
MyClass.new = function(construct, ...)
    local self = setmetatable({}, MyClass);
    if construct and MyClass.constructor then
        MyClass.constructor(self, ...);
    end
    return self;
end;
MyClass.constructor = function(self)
end;
MyClass.get__field = function(self)
    return self._field + 4;
end;
MyClass.set__field = function(self, v)
    self._field = v * 2;
end;
instance = MyClass.new(true);
instance:set__field(4);
b = instance:get__field();
c = (4 + instance:get__field()) * 3;
