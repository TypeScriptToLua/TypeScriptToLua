local exports = exports or {};
exports.TestClass = exports.TestClass or {};
exports.TestClass.__index = exports.TestClass;
exports.TestClass.prototype = exports.TestClass.prototype or {};
exports.TestClass.prototype.__index = exports.TestClass.prototype;
exports.TestClass.prototype.constructor = exports.TestClass;
exports.TestClass.new = function(...)
    local self = setmetatable({}, exports.TestClass.prototype);
    self:____constructor(...);
    return self;
end;
exports.TestClass.prototype.____constructor = function(self)
end;
return exports;
