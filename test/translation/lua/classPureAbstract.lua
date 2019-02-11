ClassB = ClassB or {};
ClassB.__index = ClassB;
ClassB.prototype = ClassB.prototype or {};
ClassB.prototype.__index = ClassB.prototype;
ClassB.prototype.constructor = ClassB;
ClassB.new = function(...)
    local self = setmetatable({}, ClassB.prototype);
    self:____constructor(...);
    return self;
end;
ClassB.prototype.____constructor = function(self)
end;
