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
MyClass.varargsFunction = function(self, a, ...)
    local b = ({...});
end;
