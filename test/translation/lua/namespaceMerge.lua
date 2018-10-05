MergedClass = MergedClass or {}
MergedClass.__index = MergedClass
function MergedClass.new(construct, ...)
    local instance = setmetatable({}, MergedClass)
    instance.propertyFunc = function()
end

    if construct and MergedClass.constructor then MergedClass.constructor(instance, ...) end
    return instance
end
function MergedClass.constructor(self)
end
function MergedClass.staticMethodA(self)
end
function MergedClass.staticMethodB(self)
    self:staticMethodA();
end
function MergedClass.methodA(self)
end
function MergedClass.methodB(self)
    self:methodA();
    self.propertyFunc();
end
MergedClass = MergedClass or {}
do
    local function namespaceFunc()
    end
    MergedClass.namespaceFunc = namespaceFunc
end
local mergedClass = MergedClass.new(true);
mergedClass:methodB();
mergedClass.propertyFunc();
MergedClass:staticMethodB();
MergedClass.namespaceFunc();
