MergedClass = MergedClass or {};
MergedClass.__index = MergedClass;
MergedClass.prototype = MergedClass.prototype or {};
MergedClass.prototype.__index = MergedClass.prototype;
MergedClass.prototype.constructor = MergedClass;
MergedClass.new = function(...)
    local self = setmetatable({}, MergedClass.prototype);
    self:____constructor(...);
    return self;
end;
MergedClass.prototype.____constructor = function(self)
    self.propertyFunc = function(____)
    end;
end;
MergedClass.staticMethodA = function(self)
end;
MergedClass.staticMethodB = function(self)
    self:staticMethodA();
end;
MergedClass.prototype.methodA = function(self)
end;
MergedClass.prototype.methodB = function(self)
    self:methodA();
    self:propertyFunc();
end;
MergedClass = MergedClass or {};
do
    MergedClass.namespaceFunc = function()
    end;
end
local mergedClass = MergedClass.new();
mergedClass:methodB();
mergedClass:propertyFunc();
MergedClass:staticMethodB();
MergedClass.namespaceFunc();
