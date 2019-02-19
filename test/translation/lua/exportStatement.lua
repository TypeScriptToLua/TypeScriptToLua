local exports = exports or {};
local xyz = 4;
exports.xyz = xyz;
exports.uwv = xyz;
do
    local __TSTL_export = require("xyz");
    for ____exportKey, ____exportValue in pairs(__TSTL_export) do
        exports[____exportKey] = ____exportValue;
    end
end
do
    local __TSTL_xyz = require("xyz");
    local abc = __TSTL_xyz.abc;
    local def = __TSTL_xyz.def;
    exports.abc = abc;
    exports.def = def;
end
do
    local __TSTL_xyz = require("xyz");
    local def = __TSTL_xyz.abc;
    exports.def = def;
end
return exports;