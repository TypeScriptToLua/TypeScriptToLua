local exports = exports or {};
exports.TestClass = exports.TestClass or {};
exports.TestClass.__index = exports.TestClass;
exports.TestClass.new = function(construct, ...)
    local self = setmetatable({}, exports.TestClass);
    if construct and exports.TestClass.constructor then
        exports.TestClass.constructor(self, ...);
    end
    return self;
end;
exports.TestClass.constructor = function(self)
end;
exports.TestClass.memberFunc = function(self)
end;
return exports;
