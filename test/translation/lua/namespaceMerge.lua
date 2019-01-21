MergedClass = MergedClass or {};
MergedClass.__index = MergedClass;
MergedClass.new = function(construct, ...)
    local self = setmetatable({}, MergedClass);
    self.propertyFunc = function(____)
    end;
    if construct and MergedClass.constructor then
        MergedClass.constructor(self, ...);
    end
    return self;
end;
MergedClass.constructor = function(self)
end;
MergedClass.staticMethodA = function(self)
end;
MergedClass.staticMethodB = function(self)
    self:staticMethodA();
end;
MergedClass.methodA = function(self)
end;
MergedClass.methodB = function(self)
    self:methodA();
    self:propertyFunc();
end;
MergedClass = MergedClass or {};
do
    MergedClass.namespaceFunc = function()
    end;
end
local mergedClass = MergedClass.new(true);
mergedClass:methodB();
mergedClass:propertyFunc();
MergedClass:staticMethodB();
MergedClass.namespaceFunc();
