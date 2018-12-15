MergedClass = MergedClass or {}
MergedClass.__index = MergedClass
function MergedClass.new(construct, ...)
    local self = setmetatable({}, MergedClass)
    self.propertyFunc = function(____)
end
    if construct and MergedClass.constructor then MergedClass.constructor(self, ...) end
    return self
end
function MergedClass.constructor(self)
end
function MergedClass.staticMethodA()
end
function MergedClass.staticMethodB()
    self.staticMethodA();
end
function MergedClass.methodA(self)
end
function MergedClass.methodB(self)
    self:methodA();
    self:propertyFunc();
end
MergedClass = MergedClass or {}
do
    local function namespaceFunc()
    end
    MergedClass.namespaceFunc = namespaceFunc
end
local mergedClass = MergedClass.new(true);
mergedClass:methodB();
mergedClass:propertyFunc();
MergedClass.staticMethodB();
MergedClass.namespaceFunc();
