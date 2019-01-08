ClassB = ClassB or {};
ClassB.__index = ClassB;
ClassB.new = function (construct, ...)
    local self = setmetatable({}, ClassB);
    if construct and ClassB.constructor then
        ClassB.constructor(self, ...);
    end
    return self;
end;
ClassB.constructor = function (self)
end;
