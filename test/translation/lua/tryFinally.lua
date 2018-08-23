xpcall(function()
    local a = 42;

end,
function(e)
end)
local b = "finally";
