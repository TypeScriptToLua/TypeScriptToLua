local exports = exports or {};
exports.TestClass = TestClass or {};
TestClass.__index = TestClass;
TestClass.new = function(construct, ...)
    local self = setmetatable({}, TestClass);
    if construct and TestClass.constructor then
        TestClass.constructor(self, ...);
    end
    return self;
end;
TestClass.constructor = function(self)
end;
return exports;
